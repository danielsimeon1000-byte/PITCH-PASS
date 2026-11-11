// Pitch detection for singing voice.
//
// McLeod Pitch Method (normalised square difference function) computed with an FFT.
// Chosen over plain autocorrelation because it does not drift flat on vowels with
// strong harmonics, and because the NSDF peak height gives a usable clarity score,
// which is what lets the app tell "sang nothing" apart from "sang the wrong note".
//
// Window 2048 samples (43 ms at 48 kHz): about 3 periods of a low male C2 and
// short enough to follow a vibrato at 7 Hz.

const SIZE = 2048, FFT = 4096;
const MIN_HZ = 60, MAX_HZ = 1400;

// --- radix-2 FFT, in place ---
const rev = new Uint16Array(FFT);
for (let i = 0, j = 0; i < FFT; i++) {
  rev[i] = j;
  let bit = FFT >> 1;
  for (; j & bit; bit >>= 1) j ^= bit;
  j |= bit;
}
const cosT = new Float32Array(FFT / 2), sinT = new Float32Array(FFT / 2);
for (let i = 0; i < FFT / 2; i++) { cosT[i] = Math.cos(-2 * Math.PI * i / FFT); sinT[i] = Math.sin(-2 * Math.PI * i / FFT); }

function fft(re, im, inverse){
  for (let i = 0; i < FFT; i++) if (i < rev[i]) { let t = re[i]; re[i] = re[rev[i]]; re[rev[i]] = t; t = im[i]; im[i] = im[rev[i]]; im[rev[i]] = t; }
  for (let len = 2; len <= FFT; len <<= 1) {
    const step = FFT / len, half = len >> 1;
    for (let i = 0; i < FFT; i += len) {
      for (let k = 0; k < half; k++) {
        const t = k * step, c = cosT[t], s = inverse ? -sinT[t] : sinT[t];
        const a = i + k, b = a + half;
        const xr = re[b] * c - im[b] * s, xi = re[b] * s + im[b] * c;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
      }
    }
  }
  if (inverse) for (let i = 0; i < FFT; i++) { re[i] /= FFT; im[i] /= FFT; }
}

const re = new Float32Array(FFT), im = new Float32Array(FFT);
const cre = new Float32Array(FFT), cim = new Float32Array(FFT);
const clean = new Float32Array(SIZE);
const nsdf = new Float32Array(SIZE), cum = new Float32Array(SIZE + 1);

// avoid: frequencies the app is sounding right now (a chord held under the singer).
// A candidate landing on one of those is skipped rather than reported, so the pad
// cannot be mistaken for the voice.
const nearAny = (hz, list, cents) => list.some(f => Math.abs(1200 * Math.log2(hz / f)) < cents);

// The app knows the exact frequencies it is playing, so it can take them out of the
// spectrum before the autocorrelation ever sees them. A chord and a voice together
// are periodic at their common root, which is why blocking the answer afterwards is
// not enough: the accompaniment has to leave the signal first.
// Only ever notch BELOW the window the singer is expected to be in. An
// accompaniment is musically related to the voice, so its harmonics land on the
// singer's own partials: a wider notch removes the note it is trying to measure.
// Measured on a C4 over an E2/G2 pad, notching eight harmonics cost 4 cents of
// accuracy because E2's third harmonic sits a semitone off the singer's fundamental.
function removeTones(re, im, freqs, sr, guardHz){
  const binHz = sr / FFT, nyq = FFT / 2;
  for (const f of freqs) {
    for (let h = 1; h <= 8; h++) {
      const fh = f * h;
      if (guardHz && fh > guardHz) break;     // from here up it is the singer's air
      const k = Math.round(fh / binHz);
      if (k >= nyq - 2) break;
      for (let d = -2; d <= 2; d++) {
        const i = k + d;
        if (i <= 0 || i >= nyq) continue;
        if (guardHz && (i + 2) * binHz > guardHz) continue;
        re[i] = 0; im[i] = 0; re[FFT - i] = 0; im[FFT - i] = 0;
      }
    }
  }
}

// Returns { hz, clarity, rms } or null when nothing usable is there.
// range: {lo, hi} in Hz. A chord plus a voice is periodic at their common root, so
// an unconstrained search happily reports a note nobody is singing. When the app
// knows roughly which note is expected it says so, and the search stays there.
export function analyseFrame(buf, sampleRate, noiseFloor, avoid, range){
  const n = Math.min(SIZE, buf.length);
  let rms = 0, dc = 0;
  for (let i = 0; i < n; i++) dc += buf[i];
  dc /= n;
  for (let i = 0; i < n; i++) { const v = buf[i] - dc; rms += v * v; }
  rms = Math.sqrt(rms / n);
  // adaptive gate: a quiet room still needs a real signal, a loud one needs more
  if (rms < Math.max(0.006, noiseFloor * 3.2)) return { hz: 0, clarity: 0, rms };

  re.fill(0); im.fill(0);
  for (let i = 0; i < n; i++) re[i] = buf[i] - dc;
  fft(re, im, false);
  const filtered = !!(avoid && avoid.length);
  if (filtered) {
    // take the accompaniment out, come back to the time domain, and start again from
    // the cleaned window so every term below describes the same signal
    removeTones(re, im, avoid, sampleRate, range ? range.lo * 0.97 : 0);
    fft(re, im, true);
    for (let i = 0; i < n; i++) clean[i] = re[i];
    re.fill(0); im.fill(0);
    for (let i = 0; i < n; i++) re[i] = clean[i];
    fft(re, im, false);
  }
  for (let i = 0; i < FFT; i++) { const a2 = re[i], b2 = im[i]; re[i] = a2 * a2 + b2 * b2; im[i] = 0; }
  fft(re, im, true);                       // re[tau] is now the autocorrelation

  cum[0] = 0;
  for (let i = 0; i < n; i++) { const v = filtered ? clean[i] : buf[i] - dc; cum[i + 1] = cum[i] + v * v; }
  const total = cum[n];
  const loHz = range ? Math.max(MIN_HZ, range.lo) : MIN_HZ;
  const hiHz = range ? Math.min(MAX_HZ, range.hi) : MAX_HZ;
  const maxLag = Math.min(n - 2, Math.floor(sampleRate / loHz));
  const minLag = Math.max(2, Math.floor(sampleRate / hiHz));
  if (maxLag <= minLag + 2) return { hz: 0, clarity: 0, rms };
  for (let tau = 0; tau <= maxLag; tau++) {
    const m = cum[n - tau] + (total - cum[tau]);
    nsdf[tau] = m > 1e-9 ? 2 * re[tau] / m : 0;
  }

  // key maxima: the highest point between each rising and falling zero crossing
  let best = -1, bestTau = -1;
  const peaks = [];
  // Always walk the lobes from lag 1, never from minLag: starting inside a lobe
  // throws that whole lobe away, and when the search is narrowed that lobe is
  // usually the one the singer is in.
  let tau = 1;
  while (tau < maxLag && nsdf[tau] > 0) tau++;          // step past the lobe at lag 0
  while (tau < maxLag) {
    if (nsdf[tau] > 0 && nsdf[tau - 1] <= 0) {           // rising crossing
      let top = tau, v = nsdf[tau];
      while (tau < maxLag && nsdf[tau] > 0) { if (nsdf[tau] > v) { v = nsdf[tau]; top = tau; } tau++; }
      if (top >= minLag) { peaks.push([top, v]); if (v > best) { best = v; bestTau = top; } }
    } else tau++;
  }
  if (bestTau < 0 || best < 0.45) return { hz: 0, clarity: Math.max(0, best), rms };

  // take the EARLIEST peak that is nearly as tall as the tallest: this is the
  // step that stops the detector reporting an octave below what was sung
  const cut = best * 0.88;
  const refine = tau => {
    const y1 = nsdf[tau - 1], y2 = nsdf[tau], y3 = nsdf[tau + 1];
    const d = 2 * (2 * y2 - y1 - y3);
    return sampleRate / (tau + (d !== 0 ? (y3 - y1) / d : 0));
  };
  const block = avoid && avoid.length ? avoid : null;
  let pick = -1, clarity = best, hz = 0;
  for (const [t, v] of peaks) {
    if (v < cut) continue;
    const f = refine(t);
    if (block && nearAny(f, block, 45)) continue;   // that is the accompaniment, not you
    pick = t; clarity = v; hz = f; break;
  }
  if (pick < 0) {
    const f = refine(bestTau);
    if (block && nearAny(f, block, 45)) return { hz: 0, clarity: 0, rms };
    pick = bestTau; hz = f;
  }
  if (!(hz > MIN_HZ && hz < MAX_HZ)) return { hz: 0, clarity, rms };
  return { hz, clarity, rms };
}

export const hzToMidi = f => 69 + 12 * Math.log2(f / 440);

// Turns a stream of frames into a steady note reading.
//   - holds a rolling noise floor so a noisy room raises the gate instead of
//     filling the screen with ghost notes
//   - rejects a reading that jumps more than an octave in one frame unless it
//     sticks around, which kills the remaining octave flips
//   - keeps raw cent samples so a drill can measure vibrato rate and width
export class VoiceTracker {
  constructor(){ this.reset(); this.floor = 0.004; }
  reset(){
    this.hz = 0; this.midi = null; this.smooth = null; this.clarity = 0;
    this.at = 0; this.hist = []; this.pending = null; this.trail = [];
    this.voicedFor = 0; this.silentFor = 0;
  }
  // frame: Float32Array of samples. fold: midi to fold octaves toward (or null).
  push(frame, sampleRate, now, dt, fold, fast, avoid, range){
    const r = analyseFrame(frame, sampleRate, this.floor, avoid, range);
    if (r.rms < this.floor || r.hz === 0) this.floor += (Math.min(r.rms, 0.05) - this.floor) * 0.02;
    // A voice over an accompaniment is never as clean as a voice alone, so the bar
    // drops when the app has told us where to look.
    const good = r.hz > 0 && r.clarity >= (range ? 0.75 : fast ? 0.72 : 0.80);
    if (good) {
      let m = hzToMidi(r.hz);
      // octave continuity: a sudden jump of ~12 semitones has to repeat to count
      if (this.midi != null && now - this.at < 220) {
        const jump = m - this.midi;
        if (Math.abs(Math.abs(jump) - 12) < 1.6) {
          if (this.pending && Math.abs(this.pending - m) < 1) { this.pending = null; }
          else { this.pending = m; m = this.midi; }
        } else this.pending = null;
      }
      if (fold != null) { while (m - fold > 6.5) m -= 12; while (fold - m > 6.5) m += 12; }
      this.hist.push(m); if (this.hist.length > (fast ? 3 : 5)) this.hist.shift();
      const sorted = [...this.hist].sort((a, b) => a - b);
      this.midi = sorted[sorted.length >> 1];
      this.hz = r.hz; this.clarity = r.clarity; this.at = now;
      this.voicedFor += dt; this.silentFor = 0;
      this.trail.push({ t: now, m: this.midi }); if (this.trail.length > 300) this.trail.shift();
    } else {
      this.silentFor += dt;
      if (this.silentFor > 0.2) { this.hist = []; this.voicedFor = 0; this.pending = null; }
    }
    if (this.live(now)) {
      const k = Math.min(1, dt * (fast ? 26 : 16));
      this.smooth = this.smooth == null ? this.midi : this.smooth + (this.midi - this.smooth) * k;
    }
    return this.live(now) ? this.smooth : null;
  }
  // touch input: follow the finger, with just enough smoothing to stop jitter
  setManual(m, now){
    this.midi = m; this.at = now; this.clarity = 1; this.silentFor = 0; this.voicedFor += 0.03;
    this.smooth = this.smooth == null ? m : this.smooth + (m - this.smooth) * 0.55;
  }
  live(now){ return this.midi != null && now - this.at < 260; }
}

// Vibrato and steadiness, from a list of { t, c } cent samples.
export function holdStats(samples){
  if (samples.length < 20) return null;
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const cs = samples.map(s => s.c), centre = mean(cs);
  const sd = Math.sqrt(mean(cs.map(c => (c - centre) ** 2)));
  // slow trend removed so the wobble is measured on its own
  const trend = samples.map(s => { const w = samples.filter(y => Math.abs(y.t - s.t) <= 0.13); return mean(w.map(y => y.c)); });
  const osc = samples.map((s, i) => s.c - trend[i]);
  let cross = 0, sign = 0;
  osc.forEach(o => { const sg = o > 3 ? 1 : o < -3 ? -1 : 0; if (sg && sign && sg !== sign) cross++; if (sg) sign = sg; });
  const dur = samples[samples.length - 1].t - samples[0].t;
  const rate = Math.round(cross / 2 / Math.max(0.5, dur) * 10) / 10;
  const width = Math.round(mean(osc.map(Math.abs)) * Math.PI / 2);
  const first = samples.filter(s => s.t < dur * 0.35).map(s => s.c);
  const last = samples.filter(s => s.t > dur * 0.65).map(s => s.c);
  const drift = first.length && last.length ? Math.round(mean(last) - mean(first)) : 0;
  return { centre: Math.round(centre), sd: Math.round(sd), rate, width, drift, dur };
}
