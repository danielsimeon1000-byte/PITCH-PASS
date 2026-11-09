// Hold drills: vibrato (rate, width, centre) and steady sustain (wobble, drift, centre).
import * as A from './audio.js';
import { SOLF } from './content.js';

const HOLD = 4.0, REF = 1.2;

export function analyse(samples, mode, tol){
  const s = samples.filter(x => x.t >= 0.6);
  const heardFrac = s.length / Math.max(1, (HOLD - 0.6) * 30);
  if (s.length < 20 || heardFrac < 0.35) return { heard: false, pass: false };
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const cs = s.map(x => x.c), centre = Math.round(mean(cs));
  if (mode === 'sustain') {
    const sd = Math.sqrt(mean(cs.map(c => (c - centre) ** 2)));
    const first = s.filter(x => x.t < 1.6).map(x => x.c), lastp = s.filter(x => x.t > HOLD - 1).map(x => x.c);
    const drift = first.length && lastp.length ? Math.round(mean(lastp) - mean(first)) : 0;
    const pass = Math.abs(centre) <= tol && sd <= 15 && Math.abs(drift) <= 25;
    return { heard: true, pass, centre, wobble: Math.round(sd), drift };
  }
  // vibrato: remove the slow trend, then count oscillations
  const trend = s.map((x, i) => { const w = s.filter(y => Math.abs(y.t - x.t) <= 0.13); return mean(w.map(y => y.c)); });
  const osc = s.map((x, i) => x.c - trend[i]);
  let crossings = 0, sign = 0;
  osc.forEach(o => { const sg = o > 3 ? 1 : o < -3 ? -1 : 0; if (sg && sign && sg !== sign) crossings++; if (sg) sign = sg; });
  const dur = s[s.length - 1].t - s[0].t;
  const rate = Math.round(crossings / 2 / Math.max(0.5, dur) * 10) / 10;
  const width = Math.round(mean(osc.map(Math.abs)) * Math.PI / 2);
  const pass = Math.abs(centre) <= tol && rate >= 4.5 && rate <= 7.5 && width >= 20 && width <= 80;
  return { heard: true, pass, centre, rate, width };
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
