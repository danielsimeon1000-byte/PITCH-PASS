// The wall-and-ball game. Your pitch moves the ball; each wall has a hole at the target note.
import * as A from './audio.js';
import { SOLF, SCALE } from './content.js';

const TONE_LEN = 1.1, TRAVEL = 3.8;

export class Game {
  constructor(canvas, o){
    this.cv = canvas; this.c = canvas.getContext('2d');
    this.o = o;              // { base, tol, phrases, blind, tunerEl, phaseEl, toastEl, onWall, onEnd }
    this.tracker = new A.PitchTracker();
    this.queue = o.phrases.slice();
    this.total = this.queue.reduce((s, p) => s + p.notes.length, 0);
    this.results = []; this.phrase = null; this.leaving = []; this.streak = 0; this.bestStreak = 0; this.score = 0;
    this.particles = []; this.flash = 0; this.flashColor = ''; this.shake = 0;
    this.paused = false; this.ended = false; this.ballY = 0; this.last = performance.now();
    this.chromatic = o.phrases.some(p => p.notes.some(n => !SCALE.includes(n)));
    this.pointer = false;
    this._resize = () => this.resize(); window.addEventListener('resize', this._resize);
    this._down = e => { if (!A.state.touchMode) return; this.pointer = true; this.touch(e); };
    this._move = e => { if (A.state.touchMode && this.pointer) this.touch(e); };
    this._up = () => { this.pointer = false; };
    canvas.addEventListener('pointerdown', this._down); canvas.addEventListener('pointermove', this._move); window.addEventListener('pointerup', this._up);
    this.resize();
    this.raf = requestAnimationFrame(t => this.frame(t));
  }
  destroy(){
    cancelAnimationFrame(this.raf); this.ended = true;
    window.removeEventListener('resize', this._resize); window.removeEventListener('pointerup', this._up);
    this.cv.removeEventListener('pointerdown', this._down); this.cv.removeEventListener('pointermove', this._move);
  }
  resize(){
    const r = this.cv.getBoundingClientRect(); this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = r.width; this.H = r.height; this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
    this.c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!this.ballY) this.ballY = this.H - 30;
  }
  // geometry
  get minM(){ return this.o.base - 1.5; } get maxM(){ return this.o.base + 13.5; }
  get pps(){ return (this.H - 40 - 24) / (this.maxM - this.minM); }
  y(m){ return 40 + (this.maxM - m) * this.pps; }
  m(y){ return this.maxM - (y - 40) / this.pps; }
  get bx(){ return Math.max(76, this.W * 0.28); }
  get br(){ return Math.min(16, Math.max(10, this.pps * 0.42)); }
  touch(e){ const r = this.cv.getBoundingClientRect(); this.tracker.setTouch(this.m(e.clientY - r.top), performance.now()); }

  spawn(){
    const p = this.queue.shift(); if (!p) return null;
    const base = this.o.base;
    if (p.kind === 'single') {
      const speed = (this.W + 50 - this.bx) / TRAVEL;
      this.phrase = { kind: 'single', speed, ww: Math.min(78, this.W * 0.2), walls: [this.wall(base + p.notes[0], p.notes[0], this.W + 50)] };
      A.playPhrase([base + p.notes[0]], TONE_LEN);
    } else {
      const g = p.gap, speed = p.kind === 'run' ? Math.max(150, 64 / g) : 120;
      const ww = p.kind === 'run' ? Math.min(30, speed * g - 16) : Math.min(46, speed * g - 20);
      const ref = A.playPhrase(p.notes.map(n => base + n), g);
      const x0 = this.bx + speed * (ref + 1.3);
      this.phrase = { kind: p.kind, speed, ww, gap: g, walls: p.notes.map((n, i) => this.wall(base + n, n, x0 + i * speed * g)) };
    }
    return this.phrase;
  }
  wall(midi, semi, x){ return { midi, semi, label: SOLF[semi] || '', x, done: false, hit: false, best: null, heard: false }; }
  active(){ return this.phrase && this.phrase.walls.find(w => !w.done); }

  hearAgain(){
    if (!this.phrase) return;
    const left = this.phrase.walls.filter(w => !w.done);
    if (!left.length) return;
    if (this.phrase.kind === 'single') { A.playPhrase([left[0].midi], TONE_LEN); return; }
    const ref = A.playPhrase(this.phrase.walls.map(w => w.midi), this.phrase.gap);
    const first = left[0], want = this.bx + this.phrase.speed * (ref + 1.0);
    if (first.x < want) { const push = want - first.x; left.forEach(w => { w.x += push; }); }
  }
  pause(v){ this.paused = v; }

  toast(html, color){
    const t = this.o.toastEl; if (!t) return;
    t.innerHTML = html; t.style.color = color; t.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('show'), 1100);
  }

  judge(w){
    w.done = true;
    const idx = this.results.length;
    this.results.push({ semi: w.semi, hit: w.hit, cents: w.best, heard: w.heard });
    const kind = this.phrase.kind;
    if (w.hit) {
      this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.score += 10 + Math.max(0, this.o.tol - Math.abs(w.best || 0)) / 5;
      A.blip('ok');
      for (let i = 0; i < (kind === 'single' ? 24 : 8); i++) this.particles.push({ x: this.bx, y: this.ballY, vx: (Math.random() * 2 - .4) * 220, vy: (Math.random() * 2 - 1) * 220, life: 1 });
    } else { this.streak = 0; A.blip('bad'); this.shake = kind === 'single' ? 1 : 0.4; }
    this.o.onWall && this.o.onWall(idx, w.hit);
    if (kind === 'single') {
      this.flash = 1; this.flashColor = w.hit ? '94,227,155' : '255,107,120';
      if (w.hit) this.toast(`${w.label} ✓<small>${w.best === 0 ? 'dead on' : (w.best > 0 ? '+' : '') + w.best} cents</small>`, 'var(--good)');
      else if (!w.heard) this.toast("Didn't hear you<small>sing as the wall reaches the ball</small>", 'var(--bad)');
      else this.toast(`${Math.abs(w.best)} cents ${w.best > 0 ? 'sharp' : 'flat'}<small>you sang ${A.noteName(w.midi + w.best / 100)}, target ${A.noteName(w.midi)}</small>`, 'var(--bad)');
    } else if (this.phrase.walls.every(x => x.done)) {
      const n = this.phrase.walls.length, k = this.phrase.walls.filter(x => x.hit).length;
      this.flash = 1; this.flashColor = k === n ? '94,227,155' : '255,209,102';
      if (k === n) { this.score += 30; A.blip('big'); }
      this.toast(k === n ? `Clean run ✓<small>${n} of ${n} notes</small>` : `${k} of ${n}<small>${k >= n - 1 ? 'so close' : 'tap Hear again before the next one'}</small>`, k === n ? 'var(--good)' : 'var(--warn)');
    }
  }

  frame(now){
    if (this.ended) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (!this.paused) {
      if (!this.phrase && !this.spawn()) {
        if (!this.endAt) this.endAt = now + 700;
        if (now > this.endAt) { this.ended = true; this.o.onEnd && this.o.onEnd(this.results, { bestStreak: this.bestStreak, score: Math.round(this.score) }); return; }
      }
      const tgt = this.active();
      const fast = this.phrase && this.phrase.kind !== 'single';
      const v = this.tracker.update(now, dt, tgt ? tgt.midi : null, fast);
      if (this.phrase) {
        const half = this.phrase.ww / 2 + this.br * 0.5;
        this.phrase.walls.forEach(w => {
          w.x -= this.phrase.speed * dt;
          if (w.done) return;
          if (Math.abs(w.x - this.bx) <= half && v != null) {
            w.heard = true;
            const c = Math.round((v - w.midi) * 100);
            if (w.best == null || Math.abs(c) < Math.abs(w.best)) w.best = c;
            if (Math.abs(c) <= this.o.tol) w.hit = true;
          }
          if (w.x < this.bx - half) this.judge(w);
        });
        if (this.phrase.walls.every(w => w.done)) {
          if (!this.phrase.doneAt) this.phrase.doneAt = now;
          if (now - this.phrase.doneAt > (this.phrase.kind === 'single' ? 450 : 900)) { this.leaving.push(this.phrase); this.phrase = null; }
        }
      }
      this.leaving.forEach(p => p.walls.forEach(w => { w.x -= p.speed * dt; }));
      this.leaving = this.leaving.filter(p => p.walls[p.walls.length - 1].x > -80);
      if (this.o.phaseEl) this.o.phaseEl.textContent = A.isPlaying() ? (fast ? 'Listen to the phrase' : 'Listen') : (this.active() ? 'Sing' : '');
      if (this.o.tunerEl) {
        const t = this.active();
        if (v != null) {
          const r = Math.round(v), c = Math.round((v - r) * 100);
          this.o.tunerEl.innerHTML = `You: <b>${A.noteName(v)}</b> ${c >= 0 ? '+' : ''}${c}c` + (t ? ` · Target: <b>${this.o.blind ? '?' : A.noteName(t.midi)}</b>` : '');
        } else this.o.tunerEl.innerHTML = A.state.touchMode ? 'Touch mode: drag up and down' : 'Waiting for your voice';
      }
      this.shake = Math.max(0, this.shake - dt * 2.5);
      this.flash = Math.max(0, this.flash - dt * 3);
      this.draw(dt, v);
    }
    this.raf = requestAnimationFrame(t => this.frame(t));
  }

  rr(x, y, w, h, r){
    const c = this.c; if (h <= 0) return; r = Math.min(r, h / 2, w / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  wood(x, y, w, h, seed){
    const c = this.c; if (h <= 2) return;
    const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#b9854f'); g.addColorStop(.5, '#d6a870'); g.addColorStop(1, '#a87443');
    const rad = Math.min(8, w / 3);
    c.save(); this.rr(x, y, w, h, rad); c.fillStyle = g; c.fill(); c.clip();
    c.strokeStyle = 'rgba(90,50,20,.22)'; c.lineWidth = 1;
    const lines = Math.max(2, Math.floor(w / 13));
    for (let i = 0; i < lines; i++) {
      const gx = x + 4 + ((seed * 37 + i * 13) % Math.max(1, w - 8));
      c.beginPath(); c.moveTo(gx, y);
      for (let yy = y; yy < y + h; yy += 20) c.lineTo(gx + Math.sin((yy + seed * 50) / 40) * 2.5, yy);
      c.stroke();
    }
    c.restore(); c.strokeStyle = 'rgba(0,0,0,.25)'; this.rr(x + .5, y + .5, w - 1, h - 1, rad); c.stroke();
  }

  draw(dt, v){
    const c = this.c, W = this.W, H = this.H, blind = this.o.blind;
    c.clearRect(0, 0, W, H);
    c.font = '600 12px "Bricolage Grotesque", sans-serif'; c.textBaseline = 'middle';
    const lanes = this.chromatic ? [0,1,2,3,4,5,6,7,8,9,10,11,12] : SCALE;
    lanes.forEach(s => {
      const y = this.y(this.o.base + s), main = SCALE.includes(s);
      c.strokeStyle = main ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.035)'; c.lineWidth = 1;
      c.setLineDash([4, 6]); c.beginPath(); c.moveTo(38, y); c.lineTo(W, y); c.stroke(); c.setLineDash([]);
      if (main || !blind) {
        const t = blind ? '•' : SOLF[s];
        c.fillStyle = blind ? 'rgba(255,255,255,.2)' : main ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.25)';
        c.font = main ? '600 12px "Bricolage Grotesque", sans-serif' : '500 10px "Bricolage Grotesque", sans-serif';
        c.fillText(t, 34 - c.measureText(t).width, y);
      }
    });
    const tgt = this.active();
    [...this.leaving, this.phrase].filter(Boolean).forEach(ph => this.drawPhrase(ph));
    this.drawRest(dt, v, tgt);
  }
  drawPhrase(ph){
    const c = this.c, H = this.H, W = this.W, blind = this.o.blind;
    {
      const ww = ph.ww, multi = ph.kind !== 'single';
      if (multi) {
        c.strokeStyle = 'rgba(255,138,42,.28)'; c.lineWidth = 2; c.setLineDash([2, 6]);
        c.beginPath(); ph.walls.forEach((w, i) => { const y = this.y(w.midi); i ? c.lineTo(w.x, y) : c.moveTo(w.x, y); }); c.stroke(); c.setLineDash([]);
      }
      ph.walls.forEach((w, i) => {
        if (w.x < -80 || w.x > W + 100) return;
        const x = w.x - ww / 2, cy = this.y(w.midi), half = (this.o.tol / 100) * this.pps + this.br + 2;
        c.globalAlpha = w.done ? 0.55 : 1;
        this.wood(x, -10, ww, cy - half + 10, i + 1);
        this.wood(x, cy + half, ww, H - (cy + half) + 10, i + 7);
        c.fillStyle = w.done ? (w.hit ? 'rgba(94,227,155,.35)' : 'rgba(255,107,120,.3)') : 'rgba(255,255,255,.05)';
        c.fillRect(x, cy - half, ww, half * 2);
        const label = blind && !w.done ? '?' : w.label;
        c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = multi ? '800 13px "Bricolage Grotesque", sans-serif' : '800 22px "Bricolage Grotesque", sans-serif';
        c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 6;
        c.fillText(label, w.x, Math.max(18, cy - half - (multi ? 14 : 26)));
        c.shadowBlur = 0; c.textAlign = 'left'; c.globalAlpha = 1;
      });
    }
  }
  drawRest(dt, v, tgt){
    const c = this.c, W = this.W, H = this.H;
    // closeness meter
    const mh = H - 64;
    c.fillStyle = 'rgba(255,255,255,.06)'; this.rr(8, 40, 6, mh, 3); c.fill();
    if (tgt && v != null) {
      const off = Math.abs(v - tgt.midi) * 100, pct = Math.max(0.05, 1 - off / 200);
      c.fillStyle = off <= this.o.tol ? '#5ee39b' : off <= this.o.tol * 2 ? '#ffd166' : '#ff6b78';
      this.rr(8, 40 + mh * (1 - pct), 6, mh * pct, 3); c.fill();
    }
    // ball
    const ty = v != null ? this.y(Math.max(this.minM, Math.min(this.maxM, v))) : H - 24 - this.br;
    this.ballY += (ty - this.ballY) * Math.min(1, dt * (v != null ? 22 : 3));
    const r = this.br; let bx = this.bx + (this.shake > 0 ? Math.sin(performance.now() / 18) * 6 * this.shake : 0);
    const lastSingle = [this.phrase, ...this.leaving.slice().reverse()].find(p => p && p.kind === 'single');
    if (lastSingle) { const w = lastSingle.walls[0]; if (w.done && !w.hit && w.x - lastSingle.ww / 2 > this.bx - r * 2) bx = Math.max(r + 4, Math.min(bx, w.x - lastSingle.ww / 2 - r - 2)); }
    if (tgt && v != null && Math.abs(v - tgt.midi) * 100 <= this.o.tol) { c.fillStyle = 'rgba(94,227,155,.22)'; c.beginPath(); c.arc(bx, this.ballY, r * 1.9, 0, 7); c.fill(); }
    const bg = c.createRadialGradient(bx - r * .35, this.ballY - r * .35, r * .1, bx, this.ballY, r);
    bg.addColorStop(0, '#ffd2a3'); bg.addColorStop(.35, '#ff9a3c'); bg.addColorStop(1, '#e2620f');
    c.fillStyle = bg; c.beginPath(); c.arc(bx, this.ballY, r, 0, 7); c.fill();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 1.4;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      c.fillStyle = `rgba(94,227,155,${p.life})`; c.beginPath(); c.arc(p.x, p.y, 3 * p.life + 1, 0, 7); c.fill();
    }
    if (this.flash > 0) { c.fillStyle = `rgba(${this.flashColor},${this.flash * 0.12})`; c.fillRect(0, 0, W, H); }
  }
}
