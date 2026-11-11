// Audio: reference tones, microphone, pitch detection.
import { VoiceTracker, hzToMidi as _h2m } from './pitch.js';
export { holdStats } from './pitch.js';
export const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const midiToHz = m => 440 * Math.pow(2, (m - 69) / 12);
export const hzToMidi = f => 69 + 12 * Math.log2(f / 440);
export const noteName = m => { const r = Math.round(m); return NAMES[((r % 12) + 12) % 12] + (Math.floor(r / 12) - 1); };

let ac = null, analyser = null, buf = null, stream = null;
let toneUntil = 0;
export const state = { micOn: false, touchMode: false };

export function ctx(){
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function voice(midi, start, len, vol){
  const a = ctx();
  const o1 = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain(), g2 = a.createGain();
  o1.type = 'triangle'; o2.type = 'sine';
  o1.frequency.value = midiToHz(midi); o2.frequency.value = midiToHz(midi) * 2;
  g2.gain.value = 0.18;
  o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(a.destination);
  const rel = Math.min(0.25, len * 0.4);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.02);
  g.gain.setValueAtTime(vol, start + Math.max(0.03, len - rel));
  g.gain.exponentialRampToValueAtTime(0.0001, start + len);
  o1.start(start); o2.start(start); o1.stop(start + len + 0.05); o2.stop(start + len + 0.05);
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

// A quiet sustained pad to sing against. It deliberately does NOT block the mic,
// because the point is to hear your voice over it, so it is kept low and dull:
// a lowpass takes the harmonics off, and the chord is voiced below the target note
// so the detector locks to your voice rather than the pad.
export function startPad(midis, vol = 0.085){
  const a = ctx();
  const master = a.createGain(); master.gain.value = 0;
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 620; lp.Q.value = 0.4;
  master.connect(lp); lp.connect(a.destination);
  let live = [];
  function setNotes(ms){
    const old = live;
    old.forEach(n => n.g.gain.setTargetAtTime(0, a.currentTime, 0.08));
    setTimeout(() => old.forEach(n => { try { n.o1.stop(); n.o2.stop(); } catch (e) {} }), 600);
    live = ms.map(m => {
      const o1 = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain(), g2 = a.createGain();
      o1.type = 'sine'; o2.type = 'triangle';
      o1.frequency.value = midiToHz(m); o2.frequency.value = midiToHz(m);
      g2.gain.value = 0.22; o2.connect(g2); g2.connect(g); o1.connect(g); g.connect(master);
      g.gain.value = 0; g.gain.setTargetAtTime(1 / Math.max(2, ms.length), a.currentTime, 0.09);
      o1.start(); o2.start();
      return { o1, o2, g };
    });
  }
  setNotes(midis);
  master.gain.setTargetAtTime(vol, a.currentTime, 0.12);
  return {
    setNotes,
    stop(){
      master.gain.setTargetAtTime(0, a.currentTime, 0.1);
      setTimeout(() => { live.forEach(n => { try { n.o1.stop(); n.o2.stop(); } catch (e) {} }); try { master.disconnect(); lp.disconnect(); } catch (e) {} }, 600);
    },
  };
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
  constructor(){ this.v = new VoiceTracker(); }
  update(now, dt, fold, fast = false){
    if (!state.micOn) { return this.v.live(now) ? this.v.smooth : null; }
    const f = frame();
    if (!f) { this.v.silentFor += dt; return this.v.live(now) ? this.v.smooth : null; }
    return this.v.push(f, sampleRate(), now, dt, fold, fast);
  }
  setTouch(m, now){ this.v.setManual(m, now); }
  live(now){ return this.v.live(now); }
  reset(){ this.v.reset(); }
  get raw(){ return this.v.midi; }
  get clarity(){ return this.v.clarity; }
  get at(){ return this.v.at; }
}
