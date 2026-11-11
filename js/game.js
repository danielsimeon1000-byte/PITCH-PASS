// The wall-and-ball game. Your pitch moves the ball; each wall has a hole at the target note.
// You must HOLD the note in tune (the ring around the ball fills) to open the wall.
// Miss on a single note and the wall stops at the ball: hold the note to get a second chance.
import * as A from './audio.js';
import { SOLF, SCALE, solf } from './content.js';

const TONE_LEN = 1.1, TRAVEL = 3.6, LEAD = 0.75, LOCK = 0.25, GATE_WAIT = 4.2;
const GRADES = {
  perfect: { label: 'PERFECT', color: '#ffd166', pts: 300 },
  great:   { label: 'GREAT',   color: '#5ee39b', pts: 200 },
  good:    { label: 'GOOD',    color: '#9fd8ff', pts: 100 },
  second:  { label: 'SECOND TRY', color: '#ffb070', pts: 50 },
};
export const gradeOf = (absCents, firstTry) => !firstTry ? 'second' : absCents <= 8 ? 'perfect' : absCents <= 20 ? 'great' : 'good';
export const multOf = combo => combo >= 10 ? 4 : combo >= 6 ? 3 : combo >= 3 ? 2 : 1;

export class Game {
  constructor(canvas, o){
    this.cv = canvas; this.c = canvas.getContext('2d');
    this.o = o;              // { base, tol, phrases, blind, tunerEl, phaseEl, toastEl, onWall, onScore, onEnd }
    this.tracker = new A.PitchTracker();
    this.queue = o.phrases.slice();
    this.results = []; this.phrase = null; this.leaving = [];
    this.combo = 0; this.bestCombo = 0; this.score = 0;
    this.particles = []; this.popups = []; this.flash = 0; this.flashColor = ''; this.shake = 0; this.kick = 0; this.assist = null;
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
  get minM(){ return this.o.base - 1.5; } get maxM(){ return this.o.base + 13.5; }
  get pps(){ return (this.H - 40 - 24) / (this.maxM - this.minM); }
  y(m){ return 40 + (this.maxM - m) * this.pps; }
  m(y){ return this.maxM - (y - 40) / this.pps; }
  get bx(){ return Math.max(76, this.W * 0.28); }
  get br(){ return Math.min(16, Math.max(10, this.pps * 0.42)); }
  holeHalf(){ return (this.o.tol / 100) * this.pps + this.br + 2; }
  touch(e){ const r = this.cv.getBoundingClientRect(); this.tracker.setTouch(this.m(e.clientY - r.top), performance.now()); }

  spawn(){
    const p = this.queue.shift(); if (!p) return null;
    const base = this.o.base;
    const lab = i => (p.labels && p.labels[i]) || solf(p.notes[i], this.o.syl === 'flat' ? 'down' : 'up');
    // one wall, blocked on a miss: a plain note, or one note picked out of a chord
    if (p.kind === 'single' || p.kind === 'chordtone') {
      const speed = (this.W + 50 - this.bx) / TRAVEL;
      this.phrase = { kind: 'single', speed, ww: Math.min(78, this.W * 0.2), need: LOCK,
        chord: p.chord ? p.chord.map(n => base + n) : null, chordName: p.chordName, ask: p.ask, hideHole: p.hideHole,
        walls: [this.wall(base + p.notes[0], p.notes[0], this.W + 50, lab(0))] };
      if (p.chord) A.playChord(this.phrase.chord, 1.6);
      else A.playPhrase([base + p.notes[0]], TONE_LEN);
    } else {
      const g = p.gap, speed = p.kind === 'run' ? Math.max(150, 64 / g) : 120;
      const ww = p.kind === 'run' ? Math.min(30, speed * g - 16) : Math.min(46, speed * g - 20);
      const chord = p.chord ? p.chord.map(n => base + n) : null;
      const ref = chord ? A.playChord(chord, 1.5) : A.playPhrase(p.notes.map(n => base + n), g);
      const x0 = this.bx + speed * (ref + 1.3);
      this.phrase = { kind: p.kind, speed, ww, gap: g, need: Math.min(0.15, g * 0.4), chord, chordName: p.chordName,
        walls: p.notes.map((n, i) => this.wall(base + n, n, x0 + i * speed * g, lab(i))) };
    }
    if (this.o.onPhrase) this.o.onPhrase(this.phrase);
    return this.phrase;
  }
  wall(midi, semi, x, label){ return { midi, semi, label: label || SOLF[semi] || '', x, done: false, hit: false, firstTry: true, lock: 0, samples: [], best: null, heard: false, state: 'approach', gateT: 0, fade: 0 }; }
  active(){ return this.phrase && this.phrase.walls.find(w => !w.done); }

  hearAgain(){
    if (!this.phrase) return;
    const left = this.phrase.walls.filter(w => !w.done);
    if (!left.length) return;
    if (this.phrase.kind === 'single') {
      if (this.phrase.chord) A.playChord(this.phrase.chord, 1.6); else A.playPhrase([left[0].midi], TONE_LEN);
      if (left[0].state === 'gate') left[0].gateT = Math.max(0, left[0].gateT - TONE_LEN);
      return;
    }
    const ref = this.phrase.chord ? A.playChord(this.phrase.chord, 1.5) : A.playPhrase(this.phrase.walls.map(w => w.midi), this.phrase.gap);
    const first = left[0], want = this.bx + this.phrase.speed * (ref + 1.0);
    if (first.x < want) { const push = want - first.x; left.forEach(w => { w.x += push; }); }
  }
  pause(v){ this.paused = v; }

  toast(html, color){
    const t = this.o.toastEl; if (!t) return;
    t.innerHTML = html; t.style.color = color; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('show'), 1150);
  }

  pass(w){
    w.done = true; w.hit = true; w.state = 'pass';
    const mean = w.samples.length ? w.samples.reduce((a, b) => a + b, 0) / w.samples.length : (w.best || 0);
    w.cents = Math.round(mean);
    const grade = gradeOf(Math.abs(mean), w.firstTry);
    w.grade = grade;
    if (w.firstTry) { this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); } else this.combo = 0;
    const mult = multOf(this.combo), pts = GRADES[grade].pts * mult;
    this.score += pts;
    const holeY = this.y(w.midi);
    this.assist = { y: holeY, t: 0.35 };
    A.chime(w.midi, grade); A.haptic(grade === 'perfect' ? 'perfect' : 'hit');
    const n = this.phrase.kind === 'single' ? (grade === 'perfect' ? 46 : 28) : (grade === 'perfect' ? 16 : 9);
    const col = grade === 'perfect' ? '255,209,102' : '94,227,155';
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 90 + Math.random() * 260; this.particles.push({ x: this.bx, y: holeY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 1, col, r: grade === 'perfect' ? 3.5 : 2.6 }); }
    this.popups.push({ x: this.bx + 34, y: holeY - 18, text: `+${pts}`, color: GRADES[grade].color, life: 1 });
    this.flash = grade === 'perfect' ? 1 : 0.6; this.flashColor = col;
    this.record(w);
    if (this.phrase.kind === 'single' || grade === 'perfect') {
      const sub = `${w.cents === 0 ? 'dead on' : (w.cents > 0 ? '+' : '') + w.cents + ' cents'}${mult > 1 ? ` · combo ×${mult}` : ''}`;
      if (this.phrase.kind === 'single') this.toast(`${GRADES[grade].label}<small>${sub}</small>`, GRADES[grade].color);
    }
    this.phraseCheck();
  }
  block(w){
    w.state = 'gate'; w.gateT = 0; w.firstTry = false; this.combo = 0;
    this.kick = 1; A.thud(); A.haptic('miss');
    this.flash = 0.7; this.flashColor = '255,107,120';
    const c = w.best;
    const what = this.phrase.ask ? 'the ' + this.phrase.ask : this.o.blind ? 'the note' : w.label;
    this.toast(!w.heard ? `Blocked<small>sing ${what} and hold it to open the wall</small>`
      : this.phrase.hideHole ? `Blocked<small>that was not ${what}. Listen again and try the chord in your head first</small>`
      : `Blocked<small>${Math.abs(c)} cents ${c > 0 ? 'sharp' : 'flat'}. Hold ${this.o.blind ? 'it' : w.label} to open the wall</small>`, 'var(--bad)');
    A.playPhrase([w.midi], TONE_LEN);
    w.lock = 0; w.samples = [];
    this.o.onScore && this.o.onScore(this.score, this.combo);
  }
  fail(w){
    w.done = true; w.hit = false; w.state = 'fail'; this.combo = 0;
    w.cents = w.best;
    A.thud(); A.haptic('miss'); this.shake = 1;
    this.flash = 0.8; this.flashColor = '255,107,120';
    if (this.phrase.kind === 'single') this.toast(!w.heard ? `Missed<small>didn't hear you this time</small>`
      : `Missed<small>${this.phrase.ask ? `the ${this.phrase.ask} was ${w.label === this.phrase.ask ? A.noteName(w.midi) : w.label}` : `you sang ${A.noteName(w.midi + (w.best || 0) / 100)}, target ${A.noteName(w.midi)}`}</small>`, 'var(--bad)');
    else this.kick = 0.6;
    this.record(w);
    this.phraseCheck();
  }
  record(w){
    const idx = this.results.length;
    this.results.push({ semi: w.semi, hit: w.hit && w.firstTry, passed: w.hit, firstTry: w.firstTry, cents: w.cents != null ? w.cents : w.best, heard: w.heard, grade: w.grade || 'miss' });
    this.o.onWall && this.o.onWall(idx, { hit: w.hit, firstTry: w.firstTry, grade: w.grade || 'miss' });
    this.o.onScore && this.o.onScore(this.score, this.combo);
  }
  phraseCheck(){
    const p = this.phrase;
    if (p.kind !== 'single' && p.walls.every(x => x.done)) {
      const n = p.walls.length, k = p.walls.filter(x => x.hit).length;
      if (k === n) {
        const bonus = Math.min(600, 120 * n); this.score += bonus; A.blip('big'); A.haptic('perfect');
        this.toast(`CLEAN RUN<small>${n} of ${n} notes · +${bonus} bonus</small>`, '#ffd166');
      } else this.toast(`${k} of ${n}<small>${k >= n - 1 ? 'so close' : 'tap Hear again before the next one'}</small>`, 'var(--warn)');
      this.o.onScore && this.o.onScore(this.score, this.combo);
    }
  }

  frame(now){
    if (this.ended) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (!this.paused) {
      if (!this.phrase && !this.spawn()) {
        if (!this.endAt) this.endAt = now + 800;
        if (now > this.endAt) { this.ended = true; this.o.onEnd && this.o.onEnd(this.results, { bestCombo: this.bestCombo, score: Math.round(this.score) }); return; }
      }
      const tgt = this.active();
      const fast = this.phrase && this.phrase.kind !== 'single';
      const v = this.tracker.update(now, dt, tgt ? tgt.midi : null, fast);
      if (this.phrase) this.step(dt, v, now);
      this.leaving.forEach(p => p.walls.forEach(w => { if (w.state !== 'fail') w.x -= p.speed * dt; else w.fade = Math.min(1, w.fade + dt * 2.2); }));
      this.leaving = this.leaving.filter(p => p.walls.some(w => (w.state === 'fail' ? w.fade < 1 : w.x > -80)));
      if (this.o.phaseEl) {
        const t = this.active();
        this.o.phaseEl.textContent = A.isPlaying() ? (fast ? 'Listen to the phrase' : 'Listen') : t && t.state === 'gate' ? `Hold it · ${Math.max(0, GATE_WAIT - t.gateT).toFixed(1)}s` : t ? 'Sing' : '';
        this.o.phaseEl.style.color = t && t.state === 'gate' ? 'var(--bad)' : 'var(--good)';
      }
      if (this.o.tunerEl) {
        const t = this.active();
        if (v != null) {
          const r = Math.round(v), c = Math.round((v - r) * 100);
          const hide = this.phrase && this.phrase.hideHole && t && !t.done;
          const off = t && !hide ? Math.round((v - t.midi) * 100) : null;
          const col = off == null ? 'var(--ink)' : Math.abs(off) <= this.o.tol ? 'var(--good)' : Math.abs(off) <= this.o.tol * 2 ? 'var(--warn)' : 'var(--bad)';
          this.o.tunerEl.innerHTML = `You: <b>${A.noteName(v)}</b> ${c >= 0 ? '+' : ''}${c}c` + (off != null ? ` · <b style="color:${col}">${off > 0 ? '+' : ''}${off}c</b> from ${this.o.blind ? '?' : `<b>${t.label}</b>`}` : '');
        } else this.o.tunerEl.innerHTML = A.state.touchMode ? 'Touch mode: drag up and down' : 'Waiting for your voice';
      }
      this.shake = Math.max(0, this.shake - dt * 2.5);
      this.kick = Math.max(0, this.kick - dt * 3);
      this.flash = Math.max(0, this.flash - dt * 3);
      if (this.assist) { this.assist.t -= dt; if (this.assist.t <= 0) this.assist = null; }
      this.draw(dt, v);
    }
    this.raf = requestAnimationFrame(t => this.frame(t));
  }

  step(dt, v, now){
    const p = this.phrase, bx = this.bx, r = this.br;
    const contact = bx + p.ww / 2 + r + 2;
    const act = this.active();
    p.walls.forEach(w => {
      if (w.done) { if (w.state === 'fail') w.fade = Math.min(1, w.fade + dt * 2.2); else w.x -= p.speed * dt; return; }
      if (w.state !== 'gate') w.x -= p.speed * dt;
      if (w !== act) return;
      // listening window: opens LEAD seconds before the wall reaches the ball (single) or one beat before (runs)
      const lead = p.kind === 'single' ? (w.x - contact) <= p.speed * LEAD : (w.x - bx) <= p.speed * p.gap * 0.9;
      const near = w.state === 'gate' || lead;
      if (near && v != null && !A.isPlaying()) {
        w.heard = true;
        const c = (v - w.midi) * 100;
        if (w.best == null || Math.abs(c) < Math.abs(w.best)) w.best = Math.round(c);
        if (Math.abs(c) <= this.o.tol) { w.lock += dt; w.samples.push(c); }
        else { w.lock = Math.max(0, w.lock - dt * 2); if (w.lock === 0) w.samples = []; }
      } else if (near && v == null) w.lock = Math.max(0, w.lock - dt * 3);
      if (w.lock >= p.need) { this.pass(w); return; }
      if (p.kind === 'single') {
        if (w.state === 'approach' && w.x <= contact) { w.x = contact; this.block(w); }
        else if (w.state === 'gate') { if (!A.isPlaying()) w.gateT += dt; if (w.gateT >= GATE_WAIT) this.fail(w); }
      } else if (w.x < bx - p.ww / 2 - r) this.fail(w);
    });
    if (p.walls.every(w => w.done)) {
      if (!p.doneAt) p.doneAt = now;
      if (now - p.doneAt > (p.kind === 'single' ? 500 : 900)) { this.leaving.push(p); this.phrase = null; }
    }
  }

  rr(x, y, w, h, r){
    const c = this.c; if (h <= 0) return; r = Math.min(r, h / 2, w / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  wood(x, y, w, h, seed, tint){
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
    if (tint) { c.fillStyle = tint; c.fillRect(x, y, w, h); }
    c.restore(); c.strokeStyle = 'rgba(0,0,0,.25)'; this.rr(x + .5, y + .5, w - 1, h - 1, rad); c.stroke();
  }

  draw(dt, v){
    const c = this.c, W = this.W, H = this.H, blind = this.o.blind;
    c.clearRect(0, 0, W, H);
    c.textBaseline = 'middle';
    const lanes = this.chromatic ? [0,1,2,3,4,5,6,7,8,9,10,11,12] : SCALE;
    const tgt = this.active();
    lanes.forEach(s => {
      const hidden = this.phrase && this.phrase.hideHole && tgt && !tgt.done;
      const y = this.y(this.o.base + s), main = SCALE.includes(s), isT = tgt && tgt.semi === s && !blind && !hidden;
      c.strokeStyle = isT ? 'rgba(255,138,42,.35)' : main ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.035)'; c.lineWidth = 1;
      c.setLineDash([4, 6]); c.beginPath(); c.moveTo(38, y); c.lineTo(W, y); c.stroke(); c.setLineDash([]);
      if (main || !blind) {
        const t = blind ? '•' : solf(s, this.o.syl === 'flat' ? 'down' : 'up');
        c.fillStyle = isT ? '#ffb070' : blind ? 'rgba(255,255,255,.2)' : main ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.25)';
        c.font = main ? `${isT ? 800 : 600} 12px "Bricolage Grotesque", sans-serif` : '500 10px "Bricolage Grotesque", sans-serif';
        c.fillText(t, 34 - c.measureText(t).width, y);
      }
    });
    [...this.leaving, this.phrase].filter(Boolean).forEach(ph => this.drawPhrase(ph));

    // closeness meter
    const mh = H - 64;
    c.fillStyle = 'rgba(255,255,255,.06)'; this.rr(8, 40, 6, mh, 3); c.fill();
    if (tgt && v != null) {
      const off = Math.abs(v - tgt.midi) * 100, pct = Math.max(0.05, 1 - off / 200);
      c.fillStyle = off <= this.o.tol ? '#5ee39b' : off <= this.o.tol * 2 ? '#ffd166' : '#ff6b78';
      this.rr(8, 40 + mh * (1 - pct), 6, mh * pct, 3); c.fill();
    }

    // ball
    let ty = v != null ? this.y(Math.max(this.minM, Math.min(this.maxM, v))) : H - 24 - this.br;
    let k = v != null ? 22 : 3;
    if (this.assist) { ty = this.assist.y; k = 30; }
    this.ballY += (ty - this.ballY) * Math.min(1, dt * k);
    const r = this.br;
    const bx = this.bx - this.kick * 16 + (this.shake > 0 ? Math.sin(performance.now() / 18) * 6 * this.shake : 0);
    const inTune = tgt && v != null && Math.abs(v - tgt.midi) * 100 <= this.o.tol;
    if (inTune) { c.fillStyle = 'rgba(94,227,155,.2)'; c.beginPath(); c.arc(bx, this.ballY, r * 1.9, 0, 7); c.fill(); }
    // lock ring: fills while you hold the note in tune near the wall
    if (tgt && this.phrase && tgt.lock > 0) {
      const prog = Math.min(1, tgt.lock / this.phrase.need);
      c.strokeStyle = 'rgba(255,255,255,.15)'; c.lineWidth = 3; c.beginPath(); c.arc(bx, this.ballY, r + 7, 0, 7); c.stroke();
      c.strokeStyle = '#5ee39b'; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.arc(bx, this.ballY, r + 7, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); c.stroke(); c.lineCap = 'butt';
    }
    const bg = c.createRadialGradient(bx - r * .35, this.ballY - r * .35, r * .1, bx, this.ballY, r);
    bg.addColorStop(0, '#ffd2a3'); bg.addColorStop(.35, '#ff9a3c'); bg.addColorStop(1, '#e2620f');
    c.fillStyle = bg; c.beginPath(); c.arc(bx, this.ballY, r, 0, 7); c.fill();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.vx *= 0.99; p.life -= dt * 1.3;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      c.fillStyle = `rgba(${p.col},${p.life})`; c.beginPath(); c.arc(p.x, p.y, p.r * p.life + 1, 0, 7); c.fill();
    }
    c.textAlign = 'left';
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i]; p.y -= 40 * dt; p.life -= dt * 1.1;
      if (p.life <= 0) { this.popups.splice(i, 1); continue; }
      c.globalAlpha = Math.min(1, p.life * 1.5); c.fillStyle = p.color; c.font = '800 18px "Bricolage Grotesque", sans-serif'; c.fillText(p.text, p.x, p.y); c.globalAlpha = 1;
    }
    if (this.flash > 0) { c.fillStyle = `rgba(${this.flashColor},${this.flash * 0.12})`; c.fillRect(0, 0, W, H); }
  }

  drawPhrase(ph){
    const c = this.c, H = this.H, W = this.W, blind = this.o.blind;
    const ww = ph.ww, multi = ph.kind !== 'single';
    if (multi) {
      c.strokeStyle = 'rgba(255,138,42,.28)'; c.lineWidth = 2; c.setLineDash([2, 6]);
      c.beginPath(); ph.walls.forEach((w, i) => { const y = this.y(w.midi); i ? c.lineTo(w.x, y) : c.moveTo(w.x, y); }); c.stroke(); c.setLineDash([]);
    }
    ph.walls.forEach((w, i) => {
      if (w.x < -80 || w.x > W + 100) return;
      const x = w.x - ww / 2, cy = this.y(w.midi), half = this.holeHalf();
      if (ph.hideHole && !w.done) {
        this.wood(x, -10, ww, H + 20, i + 1, null);
        c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '800 20px "Bricolage Grotesque", sans-serif';
        c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 6;
        c.fillText(w.label, w.x, H * 0.42); c.shadowBlur = 0; c.textAlign = 'left';
        return;
      }
      // a failed wall lifts away; a passed wall dims as it moves on
      const lift = w.state === 'fail' ? w.fade * 60 : 0;
      c.globalAlpha = w.state === 'fail' ? 1 - w.fade : w.done ? 0.6 : 1;
      const tint = w.state === 'gate' ? 'rgba(255,80,90,.18)' : w.state === 'fail' ? 'rgba(255,80,90,.3)' : null;
      this.wood(x, -10 - lift, ww, cy - half + 10, i + 1, tint);
      this.wood(x, cy + half + lift, ww, H - (cy + half) + 10, i + 7, tint);
      // hole: highlight while you are locking in
      const lockP = w.done ? 0 : Math.min(1, w.lock / (this.phrase === ph ? ph.need : 1));
      c.fillStyle = w.state === 'pass' ? 'rgba(94,227,155,.35)' : w.state === 'fail' ? 'rgba(255,107,120,.25)' : `rgba(94,227,155,${0.05 + lockP * 0.3})`;
      c.fillRect(x, cy - half - lift * 0, ww, half * 2);
      if (w.state === 'gate' && w === this.active()) {
        // countdown bar on the wall
        const left = Math.max(0, 1 - w.gateT / GATE_WAIT);
        c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + 6, cy - 3, ww - 12, 6);
        c.fillStyle = '#ff6b78'; c.fillRect(x + 6, cy - 3, (ww - 12) * left, 6);
      }
      const label = blind && !w.done ? '?' : w.label;
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = multi ? '800 13px "Bricolage Grotesque", sans-serif' : '800 22px "Bricolage Grotesque", sans-serif';
      c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 6;
      c.fillText(label, w.x, Math.max(18, cy - half - lift - (multi ? 14 : 26)));
      c.shadowBlur = 0; c.textAlign = 'left'; c.globalAlpha = 1;
    });
  }
}
