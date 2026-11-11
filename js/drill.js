// Hold drills: vibrato (rate, width, centre) and steady sustain (wobble, drift, centre).
import * as A from './audio.js';
import { SOLF } from './content.js';

const HOLD = 4.0, REF = 1.2;

export function analyse(samples, mode, tol){
  const s = samples.filter(x => x.t >= 0.6);
  if (s.length < 20 || s.length / Math.max(1, (HOLD - 0.6) * 30) < 0.35) return { heard: false, pass: false };
  const st = A.holdStats(s);
  if (!st) return { heard: false, pass: false };
  if (mode === 'sustain') {
    const pass = Math.abs(st.centre) <= tol && st.sd <= 15 && Math.abs(st.drift) <= 25;
    return { heard: true, pass, centre: st.centre, wobble: st.sd, drift: st.drift };
  }
  const pass = Math.abs(st.centre) <= tol && st.rate >= 4.5 && st.rate <= 7.5 && st.width >= 20 && st.width <= 80;
  return { heard: true, pass, centre: st.centre, rate: st.rate, width: st.width };
}

export class HoldDrill {
  constructor(canvas, o){
    this.cv = canvas; this.c = canvas.getContext('2d'); this.o = o; // { base, tol, mode, notes, statusEl, onHold, onEnd }
    this.tracker = new A.PitchTracker();
    this.i = 0; this.results = []; this.phase = 'idle'; this.ended = false; this.samples = [];
    this.last = performance.now(); this.pointer = false;
    this._resize = () => this.resize(); window.addEventListener('resize', this._resize);
    this._down = e => { if (!A.state.touchMode) return; this.pointer = true; this.touch(e); };
    this._move = e => { if (A.state.touchMode && this.pointer) this.touch(e); };
    this._up = () => { this.pointer = false; };
    canvas.addEventListener('pointerdown', this._down); canvas.addEventListener('pointermove', this._move); window.addEventListener('pointerup', this._up);
    this.resize(); this.begin();
    this.raf = requestAnimationFrame(t => this.frame(t));
  }
  destroy(){ this.ended = true; cancelAnimationFrame(this.raf); window.removeEventListener('resize', this._resize); window.removeEventListener('pointerup', this._up); this.cv.removeEventListener('pointerdown', this._down); this.cv.removeEventListener('pointermove', this._move); }
  resize(){ const r = this.cv.getBoundingClientRect(); this.dpr = Math.min(2, window.devicePixelRatio || 1); this.W = r.width; this.H = r.height; this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr; this.c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); }
  get target(){ return this.o.base + this.o.notes[this.i]; }
  get label(){ return SOLF[this.o.notes[this.i]]; }
  cy(cents){ return this.H / 2 - cents * (this.H * 0.35 / 100); }
  touch(e){ const r = this.cv.getBoundingClientRect(); const cents = (this.H / 2 - (e.clientY - r.top)) / (this.H * 0.35 / 100); this.tracker.setTouch(this.target + cents / 100, performance.now()); }
  begin(){
    this.samples = []; this.phase = 'listen'; this.tracker.reset();
    A.playPhrase([this.target], REF, 0.3);
    this.phaseEnd = performance.now() + REF * 1000 + 250;
    this.status(`Listen to ${this.label}`);
  }
  replay(){ if (this.phase === 'done' || this.ended) return; this.begin(); }
  status(t){ if (this.o.statusEl) this.o.statusEl.textContent = t; }
  frame(now){
    if (this.ended) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.tracker.update(now, dt, this.target, true);
    const raw = this.tracker.live(now) ? this.tracker.raw : null;
    if (this.phase === 'listen' && now > this.phaseEnd) { this.phase = 'wait'; this.status(`Sing ${this.label} and hold it`); }
    if (this.phase === 'wait' && raw != null) { this.phase = 'hold'; this.holdStart = now; }
    if (this.phase === 'hold') {
      const t = (now - this.holdStart) / 1000;
      if (raw != null) this.samples.push({ t, c: (raw - this.target) * 100 });
      this.status(`Holding · ${Math.max(0, HOLD - t).toFixed(1)}s`);
      if (t >= HOLD) {
        const r = analyse(this.samples, this.o.mode, this.o.tol);
        this.results.push(r); this.phase = 'result';
        A.blip(r.pass ? 'ok' : 'bad');
        this.o.onHold && this.o.onHold(r, this.i);
        this.phaseEnd = now + 2600;
      }
    }
    if (this.phase === 'result' && now > this.phaseEnd) {
      this.i++;
      if (this.i >= this.o.notes.length) { this.phase = 'done'; this.ended = true; this.o.onEnd && this.o.onEnd(this.results); return; }
      this.begin();
    }
    this.draw(raw);
    this.raf = requestAnimationFrame(t => this.frame(t));
  }
  draw(raw){
    const c = this.c, W = this.W, H = this.H, tol = this.o.tol;
    c.clearRect(0, 0, W, H);
    const top = this.cy(tol), bot = this.cy(-tol);
    c.fillStyle = 'rgba(255,138,42,.08)'; c.fillRect(0, top, W, bot - top);
    c.strokeStyle = 'rgba(255,138,42,.5)'; c.setLineDash([4, 5]); c.beginPath(); c.moveTo(0, top); c.lineTo(W, top); c.moveTo(0, bot); c.lineTo(W, bot); c.stroke(); c.setLineDash([]);
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke();
    c.fillStyle = '#f6efe4'; c.font = '800 14px "Bricolage Grotesque", sans-serif'; c.textBaseline = 'middle'; c.fillText(this.label, 12, H / 2 - 12);
    c.fillStyle = '#ffb070'; c.font = '500 11px "Bricolage Grotesque", sans-serif'; c.fillText(`±${tol}c`, W - 44, top - 10);
    const x0 = 44, xw = W - x0 - 24;
    if (this.samples.length > 1) {
      c.strokeStyle = '#ff8a2a'; c.lineWidth = 3; c.lineJoin = 'round'; c.beginPath();
      this.samples.forEach((s, i) => { const x = x0 + (s.t / HOLD) * xw, y = this.cy(Math.max(-140, Math.min(140, s.c))); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.stroke();
    }
    let bx = x0, by = H / 2;
    if (this.phase === 'hold') { bx = x0 + Math.min(1, (performance.now() - this.holdStart) / 1000 / HOLD) * xw; }
    else if (this.phase === 'result' && this.samples.length) bx = x0 + xw;
    if (raw != null) by = this.cy(Math.max(-140, Math.min(140, (raw - this.target) * 100)));
    else if (this.samples.length && this.phase === 'result') by = this.cy(this.samples[this.samples.length - 1].c);
    const r = 14, g = c.createRadialGradient(bx - 5, by - 5, 2, bx, by, r);
    g.addColorStop(0, '#ffd2a3'); g.addColorStop(.35, '#ff9a3c'); g.addColorStop(1, '#e2620f');
    c.fillStyle = g; c.beginPath(); c.arc(bx, by, r, 0, 7); c.fill();
    c.fillStyle = 'rgba(94,227,155,.9)'; c.fillRect(x0, H - 8, xw * (this.phase === 'hold' ? Math.min(1, (performance.now() - this.holdStart) / 1000 / HOLD) : this.phase === 'result' ? 1 : 0), 4);
  }
}

// Sirens and glides: a target line sweeps up and down, you follow it with your voice.
// Scored on how much of the glide you stayed on the line, so it rewards a smooth
// connected sound instead of a stepped one.
const SLIDE_TOL = 90;   // cents: a glide is judged looser than a held note

export class SlideDrill {
  constructor(canvas, o){
    this.cv = canvas; this.c = canvas.getContext('2d'); this.o = o;  // { base, slides, secs, statusEl, onSlide, onEnd }
    this.tracker = new A.PitchTracker();
    this.i = 0; this.results = []; this.phase = 'listen'; this.ended = false; this.samples = []; this.hitT = 0;
    this.last = performance.now(); this.pointer = false;
    this._resize = () => this.resize(); window.addEventListener('resize', this._resize);
    this._down = e => { if (!A.state.touchMode) return; this.pointer = true; this.touch(e); };
    this._move = e => { if (A.state.touchMode && this.pointer) this.touch(e); };
    this._up = () => { this.pointer = false; };
    canvas.addEventListener('pointerdown', this._down); canvas.addEventListener('pointermove', this._move); window.addEventListener('pointerup', this._up);
    this.resize(); this.begin();
    this.raf = requestAnimationFrame(t => this.frame(t));
  }
  destroy(){ this.ended = true; cancelAnimationFrame(this.raf); window.removeEventListener('resize', this._resize); window.removeEventListener('pointerup', this._up); this.cv.removeEventListener('pointerdown', this._down); this.cv.removeEventListener('pointermove', this._move); }
  resize(){ const r = this.cv.getBoundingClientRect(); this.dpr = Math.min(2, window.devicePixelRatio || 1); this.W = r.width; this.H = r.height; this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr; this.c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); }
  get pair(){ return this.o.slides[this.i]; }
  get lo(){ return this.o.base + Math.min(...this.pair); }
  get hi(){ return this.o.base + Math.max(...this.pair); }
  get span(){ return Math.max(4, this.hi - this.lo); }
  // target note at progress p (0..1): up then back down
  target(p){ const tri = p < 0.5 ? p * 2 : (1 - p) * 2; return this.o.base + this.pair[0] + (this.pair[1] - this.pair[0]) * tri; }
  y(m){ const pad = 2.5; const top = this.hi + pad, bot = this.lo - pad; return 16 + (top - m) / (top - bot) * (this.H - 32); }
  touch(e){ const r = this.cv.getBoundingClientRect(); const pad = 2.5, top = this.hi + pad, bot = this.lo - pad; const m = top - ((e.clientY - r.top) - 16) / (this.H - 32) * (top - bot); this.tracker.setTouch(m, performance.now()); }
  begin(){
    this.samples = []; this.hitT = 0; this.phase = 'listen'; this.tracker.reset();
    const d = A.playPhrase([this.o.base + this.pair[0], this.o.base + this.pair[1]], 0.42, 0.28);
    this.phaseEnd = performance.now() + d * 1000 + 200;
    this.status('Listen to the sweep');
  }
  replay(){ if (!this.ended && this.phase !== 'result') this.begin(); }
  status(t){ if (this.o.statusEl) this.o.statusEl.textContent = t; }
  frame(now){
    if (this.ended) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    const secs = this.o.secs || 5;
    const v = this.tracker.update(now, dt, null, true);
    if (this.phase === 'listen' && now > this.phaseEnd) { this.phase = 'wait'; this.status('Slide up and back down'); }
    if (this.phase === 'wait' && v != null) { this.phase = 'go'; this.startT = now; }
    if (this.phase === 'go') {
      const t = (now - this.startT) / 1000, p = Math.min(1, t / secs);
      const tgt = this.target(p);
      if (v != null) {
        const c = (v - tgt) * 100;
        this.samples.push({ p, c, m: v });
        if (Math.abs(c) <= SLIDE_TOL) this.hitT += dt;
      }
      this.status(`Sliding · ${Math.max(0, secs - t).toFixed(1)}s`);
      if (t >= secs) {
        const pct = Math.round(this.hitT / secs * 100);
        const r = { pct, pass: pct >= 65, heard: this.samples.length > 10 };
        this.results.push(r); this.phase = 'result'; this.phaseEnd = now + 2100;
        A.blip(r.pass ? 'ok' : 'bad'); if (r.pass) A.haptic('hit');
        this.o.onSlide && this.o.onSlide(r, this.i);
      }
    }
    if (this.phase === 'result' && now > this.phaseEnd) {
      this.i++;
      if (this.i >= this.o.slides.length) { this.phase = 'done'; this.ended = true; this.o.onEnd && this.o.onEnd(this.results); return; }
      this.begin();
    }
    this.draw(v);
    this.raf = requestAnimationFrame(t => this.frame(t));
  }
  draw(v){
    const c = this.c, W = this.W, H = this.H, secs = this.o.secs || 5;
    c.clearRect(0, 0, W, H);
    const x0 = 34, xw = W - x0 - 18;
    // the line to follow, drawn as a thick soft band
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,138,42,.16)'; c.lineWidth = (SLIDE_TOL / 100) * ((H - 32) / (this.span + 5)) * 2;
    c.beginPath();
    for (let i = 0; i <= 60; i++) { const p = i / 60, x = x0 + p * xw, y = this.y(this.target(p)); i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
    c.strokeStyle = 'rgba(255,138,42,.75)'; c.lineWidth = 2.5; c.setLineDash([5, 6]);
    c.beginPath();
    for (let i = 0; i <= 60; i++) { const p = i / 60, x = x0 + p * xw, y = this.y(this.target(p)); i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke(); c.setLineDash([]);
    // your trace
    if (this.samples.length > 1) {
      c.strokeStyle = '#5ee39b'; c.lineWidth = 3.5; c.beginPath();
      this.samples.forEach((s, i) => { const x = x0 + s.p * xw, y = this.y(s.m); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.stroke();
    }
    c.font = '700 11px "Bricolage Grotesque", sans-serif'; c.textBaseline = 'middle'; c.fillStyle = '#a99fb8';
    c.fillText(A.noteName(this.hi), 6, this.y(this.hi));
    c.fillText(A.noteName(this.lo), 6, this.y(this.lo));
    let bx = x0, by = H / 2;
    if (this.phase === 'go') bx = x0 + Math.min(1, (performance.now() - this.startT) / 1000 / secs) * xw;
    else if (this.phase === 'result') bx = x0 + xw;
    if (v != null) by = this.y(v); else if (this.samples.length) by = this.y(this.samples[this.samples.length - 1].m);
    by = Math.max(10, Math.min(H - 10, by));
    const r = 13, g = c.createRadialGradient(bx - 4, by - 4, 2, bx, by, r);
    g.addColorStop(0, '#ffd2a3'); g.addColorStop(.35, '#ff9a3c'); g.addColorStop(1, '#e2620f');
    c.fillStyle = g; c.beginPath(); c.arc(bx, by, r, 0, 7); c.fill();
  }
}
