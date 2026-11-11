// Audio: reference tones, microphone, pitch detection.
import { VoiceTracker, hzToMidi as _h2m } from './pitch.js';
export { holdStats } from './pitch.js';
export const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const midiToHz = m => 440 * Math.pow(2, (m - 69) / 12);
export const hzToMidi = f => 69 + 12 * Math.log2(f / 440);
export const noteName = m => { const r = Math.round(m); return NAMES[((r % 12) + 12) % 12] + (Math.floor(r / 12) - 1); };

let ac = null, analyser = null, buf = null, stream = null, micTrack = null;
let toneUntil = 0;
export const state = { micOn: false, touchMode: false, echo: false, instrument: 'voice' };

// Frequencies the app is deliberately sounding right now. The detector refuses to
// report these, so a sustained chord cannot be mistaken for the singer.
let sounding = [];
export const soundingHz = () => sounding;

export function ctx(){
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

// Rehearsal instruments. partials are [harmonic, gain, wave]; sustain below 0.5 means
// the note dies away, which is what makes the pad comp a chord instead of holding it.
export const INSTRUMENTS = {
  voice:   { name:'Voice',     sub:'Warm and plain',        partials:[[1,1,'triangle'],[2,0.18,'sine']],                       a:0.02,  d:0.10, s:0.85, r:0.25, lp:0,    pro:false },
  piano:   { name:'Piano',     sub:'Rehearsal room upright', partials:[[1,1,'triangle'],[2,0.38,'sine'],[3,0.14,'sine'],[5,0.05,'sine']], a:0.004, d:1.10, s:0.06, r:0.35, lp:4200, pro:true },
  guitar:  { name:'Guitar',    sub:'Plucked nylon',          partials:[[1,1,'sawtooth'],[2,0.22,'sine'],[3,0.09,'triangle']],   a:0.006, d:0.75, s:0.10, r:0.35, lp:2600, pro:true },
  strings: { name:'Strings',   sub:'Slow bow, sits under you', partials:[[1,1,'sawtooth'],[2,0.30,'sawtooth']],                 a:0.20,  d:0.20, s:0.90, r:0.45, lp:2100, pro:true, detune:7 },
  organ:   { name:'Organ',     sub:'Drawbars, dead steady',  partials:[[1,1,'sine'],[2,0.5,'sine'],[3,0.28,'sine'],[4,0.18,'sine']], a:0.02, d:0.05, s:1, r:0.12, lp:0, pro:true },
  tuner:   { name:'Pure tone', sub:'Nothing to hide behind', partials:[[1,1,'sine']],                                           a:0.01,  d:0.05, s:1,    r:0.15, lp:0,    pro:true },
};
export const inst = () => INSTRUMENTS[state.instrument] || INSTRUMENTS.voice;
export const sustains = () => inst().s >= 0.5;

function voice(midi, start, len, vol, ins){
  const a = ctx(), I = ins || inst();
  const out = a.createGain(); out.gain.value = 1;
  let tail = out;
  if (I.lp) { const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = I.lp; lp.Q.value = 0.5; out.connect(lp); tail = lp; }
  tail.connect(a.destination);
  const g = a.createGain(); g.connect(out);
  const f0 = midiToHz(midi);
  const oscs = [];
  I.partials.forEach(([h, amp, wave]) => {
    const o = a.createOscillator(); o.type = wave; o.frequency.value = f0 * h;
    const pg = a.createGain(); pg.gain.value = amp; o.connect(pg); pg.connect(g); o.start(start); oscs.push(o);
    if (I.detune) { const o2 = a.createOscillator(); o2.type = wave; o2.frequency.value = f0 * h; o2.detune.value = I.detune;
      const pg2 = a.createGain(); pg2.gain.value = amp * 0.6; o2.connect(pg2); pg2.connect(g); o2.start(start); oscs.push(o2); }
  });
  const peak = vol, sus = vol * I.s;
  const rel = Math.min(I.r, Math.max(0.06, len * 0.4));
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(peak, start + I.a);
  g.gain.setTargetAtTime(Math.max(0.0002, sus), start + I.a, Math.max(0.03, I.d));
  g.gain.setTargetAtTime(0.0001, start + Math.max(I.a + 0.05, len - rel), rel / 3);
  const stop = start + len + rel + 0.1;
  oscs.forEach(o => o.stop(stop));
  setTimeout(() => { try { out.disconnect(); if (tail !== out) tail.disconnect(); } catch (e) {} }, (stop - a.currentTime + 0.3) * 1000);
}

// Play notes back to back. Returns duration in seconds. The mic is ignored while it plays.
export function playPhrase(notes, each, vol = 0.35){
  const a = ctx();
  const t = a.currentTime + 0.03;
  notes.forEach((m, i) => voice(m, t + i * each, each * (notes.length > 1 ? 0.95 : 1), vol));
  const dur = notes.length * each;
  toneUntil = performance.now() + dur * 1000 + 150;
  return dur;
}
export const isPlaying = () => performance.now() < toneUntil;

// A chord sounded as a block, for arpeggio and chord-tone work.
export function playChord(midis, len = 1.5, vol = 0.22){
  const a = ctx(), t = a.currentTime + 0.03;
  midis.forEach((m, i) => voice(m, t + i * 0.012, len, vol));
  toneUntil = performance.now() + len * 1000 + 160;
  return len;
}

// A chord to sing against. Three things stop it being heard as the singer:
//   1. the browser's echo canceller is switched on for as long as it plays, which
//      removes most of what the speaker puts back into the mic
//   2. every frequency it sounds is registered, and the detector refuses to report
//      a pitch sitting on one of them
//   3. it ducks whenever a voice is detected, and it is voiced below the target
// Headphones are still better, but they are no longer required.
export function startPad(midis, vol = 0.085){
  const a = ctx();
  const master = a.createGain(); master.gain.value = 0;
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = inst().lp || 900; lp.Q.value = 0.4;
  master.connect(lp); lp.connect(a.destination);
  const I = inst();
  let notes = midis.slice(), live = [], comp = null, duck = 1, base = vol, stopped = false;

  const register = () => { sounding = notes.map(midiToHz); };
  const held = () => {
    live.forEach(n => { n.g.gain.setTargetAtTime(0, a.currentTime, 0.08); });
    const old = live;
    setTimeout(() => old.forEach(n => { try { n.o.forEach(o => o.stop()); } catch (e) {} }), 700);
    live = notes.map(m => {
      const g = a.createGain(); g.connect(master);
      const f0 = midiToHz(m), o = [];
      I.partials.forEach(([h, amp, wave]) => { const osc = a.createOscillator(); osc.type = wave; osc.frequency.value = f0 * h;
        const pg = a.createGain(); pg.gain.value = amp; osc.connect(pg); pg.connect(g); osc.start(); o.push(osc); });
      g.gain.value = 0; g.gain.setTargetAtTime(1 / Math.max(2, notes.length), a.currentTime, 0.09);
      return { g, o };
    });
  };
  // a piano or a guitar cannot hold a chord, so it comps it, the way a rehearsal
  // pianist actually plays underneath a singer
  const strike = () => {
    if (stopped) return;
    const t = a.currentTime + 0.02;
    notes.forEach((m, i) => voice(m, t + i * 0.018, 1.5, (vol * 2.4) / Math.max(2, notes.length), I));
  };
  const startComp = () => { strike(); comp = setInterval(strike, 1400); };

  register();
  if (sustains()) { held(); master.gain.setTargetAtTime(vol, a.currentTime, 0.12); }
  else { master.gain.value = 0; startComp(); }
  setEcho(true);

  return {
    setNotes(ms){ notes = ms.slice(); register(); if (sustains()) held(); else strike(); },
    // drop under the singer the moment a voice is heard
    duck(on){ const want = on ? 0.45 : 1; if (want === duck) return; duck = want;
      if (sustains()) master.gain.setTargetAtTime(base * duck, a.currentTime, 0.12); },
    stop(){
      stopped = true; sounding = [];
      if (comp) clearInterval(comp);
      master.gain.setTargetAtTime(0, a.currentTime, 0.1);
      setTimeout(() => { live.forEach(n => { try { n.o.forEach(o => o.stop()); } catch (e) {} });
        try { master.disconnect(); lp.disconnect(); } catch (e) {} }, 700);
      setEcho(false);
    },
  };
}

// Echo cancellation is off for ordinary lessons because it colours the voice, and
// nothing is playing while you sing anyway. It goes on only while a pad is running.
export async function setEcho(on){
  state.echo = on;
  if (!micTrack) return false;
  try { await micTrack.applyConstraints({ echoCancellation: on, noiseSuppression: false, autoGainControl: false }); return true; }
  catch (e) { return false; }
}

export function blip(kind){
  const a = ctx(); const t = a.currentTime;
  const seq = kind === 'ok' ? [[84,0],[91,0.08]] : kind === 'big' ? [[79,0],[84,0.08],[91,0.16]] : [[40,0]];
  seq.forEach(([m, d]) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = kind === 'bad' ? 'square' : 'sine';
    o.frequency.value = midiToHz(m);
    g.gain.setValueAtTime(0, t + d);
    g.gain.linearRampToValueAtTime(kind === 'bad' ? 0.06 : 0.12, t + d + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18);
    o.connect(g); g.connect(a.destination); o.start(t + d); o.stop(t + d + 0.3);
  });
}

// Reward chime on the note just sung, an octave up. Perfect adds a little arpeggio.
export function chime(midi, grade){
  const a = ctx(), t = a.currentTime;
  const notes = grade === 'perfect' ? [0, 4, 7, 12] : grade === 'great' ? [0, 7] : [0];
  notes.forEach((iv, i) => {
    const o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o2.type = 'triangle';
    const f = midiToHz(midi + 12 + iv); o.frequency.value = f; o2.frequency.value = f * 2;
    const g2 = a.createGain(); g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(a.destination);
    const st = t + i * 0.07;
    g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.16, st + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.45);
    o.start(st); o2.start(st); o.stop(st + 0.5); o2.stop(st + 0.5);
  });
}
export function thud(){
  const a = ctx(), t = a.currentTime;
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
  g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.25);
}
export function haptic(kind){
  try {
    const H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
    if (H) { kind === 'miss' ? H.notification({ type: 'ERROR' }) : H.impact({ style: kind === 'perfect' ? 'HEAVY' : 'LIGHT' }); return; }
    if (navigator.vibrate) navigator.vibrate(kind === 'miss' ? [40, 40, 60] : kind === 'perfect' ? [25, 30, 25] : 15);
  } catch (e) {}
}

export async function startMic(){
  if (state.micOn) return true;
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no-api');
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    micTrack = stream.getAudioTracks()[0] || null;
    const a = ctx();
    const src = a.createMediaStreamSource(stream);
    analyser = a.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0;
    buf = new Float32Array(analyser.fftSize);
    src.connect(analyser);
    state.micOn = true; state.touchMode = false;
    return true;
  } catch (e) {
    console.warn('mic failed', e);
    state.micOn = false;
    return false;
  }
}

// Pitch detection lives in pitch.js. This wraps it so screens just ask for a note.
export const sampleRate = () => (ac ? ac.sampleRate : 48000);
export function frame(){
  if (!analyser || isPlaying()) return null;
  analyser.getFloatTimeDomainData(buf);
  return buf;
}

// Drop-in tracker used by the game and the drills.
export class PitchTracker {
  constructor(){ this.v = new VoiceTracker(); this.range = null; }
  // Tell the detector roughly where the note should be. Used by the hold drills,
  // where a chord is sounding and an unconstrained search would find its root.
  expect(midi, semis = 7){ this.range = midi == null ? null : { lo: midiToHz(midi - semis), hi: midiToHz(midi + semis) }; }
  update(now, dt, fold, fast = false){
    if (!state.micOn) { return this.v.live(now) ? this.v.smooth : null; }
    const f = frame();
    if (!f) { this.v.silentFor += dt; return this.v.live(now) ? this.v.smooth : null; }
    return this.v.push(f, sampleRate(), now, dt, fold, fast, sounding, this.range);
  }
  setTouch(m, now){ this.v.setManual(m, now); }
  live(now){ return this.v.live(now); }
  reset(){ this.v.reset(); }
  get raw(){ return this.v.midi; }
  get clarity(){ return this.v.clarity; }
  get at(){ return this.v.at; }
}
