// Saved progress, kept on the device.
const KEY = 'pitchpass:v1';
const fresh = () => ({
  onboarded: false,
  base: 60,               // Do of the voice range, as midi
  range: null,            // { low, high } measured in onboarding
  rangeLog: [],           // { day, low, high } so growth is visible over months
  tol: 50,                // hole size in cents
  pro: false,
  inputMode: 'mic',
  streak: { count: 0, last: null, rest: 0 },
  goalMin: 10,            // daily practice goal in minutes
  mins: {},               // day -> minutes sung
  lastWarmup: null,       // timestamp of the last finished warm-up
  xp: 0,
  history: [],            // { day, id, acc, hits, tries, cents }
  notes: {},              // semitone -> { hits, tries, cents, heard }
  best: {},               // lesson id -> best accuracy
  done: {},               // lesson id -> true
  daily: null,            // day key of last completed daily
  badges: {},             // achievement id -> day earned
  stage: {},              // day -> { warmup:true, ear:true, ... }
  reminder: null,         // "HH:MM" or null
});

let data = fresh();
try { const raw = localStorage.getItem(KEY); if (raw) data = { ...fresh(), ...JSON.parse(raw) }; } catch (e) {}
if (!data.streak.rest) data.streak.rest = 0;

export const S = data;
export function save(){ try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
export function reset(){ const f = fresh(); Object.keys(data).forEach(k => delete data[k]); Object.assign(data, f); save(); }

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

// A streak survives one missed day if a rest day is banked. One is earned every
// seven days, up to two, so a real life does not wipe out two months of work.
export function streakNow(){
  if (!data.streak.last) return 0;
  const gap = dayDiff(data.streak.last, dayKey());
  if (gap <= 1) return data.streak.count;
  if (gap === 2 && data.streak.rest > 0) return data.streak.count;
  return 0;
}
function bumpStreak(today){
  if (data.streak.last === today) return;
  const gap = data.streak.last ? dayDiff(data.streak.last, today) : 99;
  if (gap === 1) data.streak.count++;
  else if (gap === 2 && data.streak.rest > 0) { data.streak.rest--; data.streak.count++; }
  else data.streak.count = 1;
  data.streak.last = today;
  if (data.streak.count % 7 === 0 && data.streak.rest < 2) data.streak.rest++;
}

export function addMinutes(secs){
  const k = dayKey();
  data.mins[k] = (data.mins[k] || 0) + secs / 60;
  const days = Object.keys(data.mins).sort();
  while (days.length > 400) delete data.mins[days.shift()];
  save();
}
export const minutesToday = () => Math.round(data.mins[dayKey()] || 0);
export const goalPct = () => Math.min(1, (data.mins[dayKey()] || 0) / Math.max(1, data.goalMin));

export function markStage(key){
  const k = dayKey();
  (data.stage[k] || (data.stage[k] = {}))[key] = true;
  if (key === 'warmup') data.lastWarmup = Date.now();
  save();
}
export const stagesToday = () => data.stage[dayKey()] || {};

export function logRange(low, high){
  const k = dayKey();
  data.rangeLog = data.rangeLog.filter(r => r.day !== k);
  data.rangeLog.push({ day: k, low: Math.round(low), high: Math.round(high) });
  if (data.rangeLog.length > 60) data.rangeLog.shift();
  save();
}

// Record a finished lesson. walls: [{ semi, hit, cents, heard }]
export function recordSession(lessonId, walls, xp){
  const today = dayKey();
  const hits = walls.filter(w => w.hit).length, tries = walls.length;
  const heard = walls.filter(w => w.heard && w.cents != null);
  const cents = heard.length ? Math.round(heard.reduce((s, w) => s + w.cents, 0) / heard.length) : 0;
  const acc = tries ? Math.round(hits / tries * 100) : 0;
  data.history.push({ day: today, id: lessonId, acc, hits, tries, cents, ts: Date.now() });
  if (data.history.length > 2000) data.history.splice(0, data.history.length - 2000);
  walls.forEach(w => {
    const k = ((w.semi % 12) + 12) % 12;
    const n = data.notes[k] || (data.notes[k] = { hits: 0, tries: 0, cents: 0, heard: 0 });
    n.tries++; if (w.hit) n.hits++;
    if (w.heard && w.cents != null) { n.cents += w.cents; n.heard++; }
  });
  data.best[lessonId] = Math.max(data.best[lessonId] || 0, acc);
  if (acc >= 60) data.done[lessonId] = true;
  if (lessonId === 'daily') data.daily = today;
  bumpStreak(today);
  data.xp += xp;
  save();
  return { acc, hits, tries, cents };
}

export function recordHold(lessonId, passed, total, xp){
  const today = dayKey();
  const acc = total ? Math.round(passed / total * 100) : 0;
  data.history.push({ day: today, id: lessonId, acc, hits: passed, tries: total, cents: 0, ts: Date.now(), hold: true });
  data.best[lessonId] = Math.max(data.best[lessonId] || 0, acc);
  if (acc >= 60) data.done[lessonId] = true;
  bumpStreak(today);
  data.xp += xp; save();
  return acc;
}

// Stats over the last n days (null = all time).
export function stats(days){
  const cutoff = days ? Date.now() - days * 86400000 : 0;
  const h = data.history.filter(x => x.ts >= cutoff && !x.hold);
  const hits = h.reduce((s, x) => s + x.hits, 0), tries = h.reduce((s, x) => s + x.tries, 0);
  const cents = tries ? Math.round(h.reduce((s, x) => s + x.cents * x.tries, 0) / tries) : 0;
  return { acc: tries ? Math.round(hits / tries * 100) : null, notes: tries, cents, sessions: h.length };
}

export function weekBars(){
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const h = data.history.filter(x => x.day === k && !x.hold);
    const hits = h.reduce((s, x) => s + x.hits, 0), tries = h.reduce((s, x) => s + x.tries, 0);
    out.push({ label: 'SMTWTFS'[d.getDay()], acc: tries ? Math.round(hits / tries * 100) : null, today: i === 0 });
  }
  return out;
}
