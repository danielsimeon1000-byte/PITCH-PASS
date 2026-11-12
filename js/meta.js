// Levels, badges, the daily goal, the share card and challenge links.
import { S, save, dayKey, streakNow, minutesToday } from './store.js';

// --- levels ---------------------------------------------------------------
// Ranks are the seat you would be given in a choir, which is a thing singers
// actually want, rather than a made-up tier name.
const RANKS = ['Beginner', 'Chorister', 'Second voice', 'First voice', 'Section lead', 'Understudy', 'Soloist', 'Headliner', 'Virtuoso'];
export const xpFor = lvl => Math.round(220 * (lvl - 1) + 38 * Math.pow(lvl - 1, 2));
export function level(xp = S.xp){
  let l = 1; while (l < 45 && xp >= xpFor(l + 1)) l++;
  const base = xpFor(l), next = xpFor(l + 1);
  return { level: l, rank: RANKS[Math.min(RANKS.length - 1, Math.floor((l - 1) / 5))], into: xp - base, need: next - base, pct: (xp - base) / (next - base) };
}

// --- badges ---------------------------------------------------------------
export const BADGES = {
  first:    { title: 'First one through',  hint: 'Pass your first wall' },
  combo10:  { title: 'Ten in a row',       hint: 'Ten walls in a row, first try' },
  dead:     { title: 'Dead on',            hint: 'Five perfects in one lesson' },
  flawless: { title: 'Flawless',           hint: 'A lesson at 100% first try' },
  cleanrun: { title: 'Clean run',          hint: 'Every note of a run' },
  week:     { title: 'Seven days',         hint: 'A seven day streak' },
  month:    { title: 'Thirty days',        hint: 'A thirty day streak' },
  wider:    { title: 'Wider',              hint: 'Grow your range by two semitones' },
  warm:     { title: 'Warmed up',          hint: 'Finish ten warm-ups' },
  spin:     { title: 'It spins',           hint: 'Pass five vibrato holds' },
  twelve:   { title: 'All twelve',         hint: 'Finish the sharps and flats unit' },
  hair:     { title: "Hair's breadth",     hint: 'Pass a lesson on Perfect mode' },
  session:  { title: 'Full session',       hint: 'All four stages in one day' },
};
export function award(id){
  if (S.badges[id]) return null;
  S.badges[id] = dayKey(); save();
  return { id, ...BADGES[id] };
}
// Called after a lesson. Returns the badges earned just now.
export function checkBadges(ctx = {}){
  const got = [];
  const add = id => { const b = award(id); if (b) got.push(b); };
  if (ctx.passedAny) add('first');
  if (ctx.bestCombo >= 10) add('combo10');
  if (ctx.perfects >= 5) add('dead');
  if (ctx.acc === 100 && ctx.tries >= 6) add('flawless');
  if (ctx.cleanRun) add('cleanrun');
  if (ctx.acc >= 60 && S.tol <= 15) add('hair');
  const st = streakNow();
  if (st >= 7) add('week');
  if (st >= 30) add('month');
  const warmups = Object.values(S.history || []).filter(h => String(h.id).startsWith('w')).length;
  if (warmups >= 10) add('warm');
  if (ctx.vibratoPasses >= 5) add('spin');
  if (S.done.u3l1 && S.done.u3l2) add('twelve');
  const stage = S.stage[dayKey()] || {};
  if (stage.warmup && stage.ear && stage.agility && stage.control) add('session');
  if (S.rangeLog.length >= 2) {
    const a = S.rangeLog[0], b = S.rangeLog[S.rangeLog.length - 1];
    if ((b.high - b.low) - (a.high - a.low) >= 2) add('wider');
  }
  return got;
}

// --- daily goal -----------------------------------------------------------
export function goalState(){
  const mins = minutesToday(), goal = S.goalMin;
  return { mins, goal, pct: Math.min(1, mins / goal), met: mins >= goal };
}

// --- challenge links ------------------------------------------------------
// A link carries a seed, so two people sing the exact same set of notes and can
// compare scores. This is the one thing that spreads without a server.
export function makeChallenge(score, lessonTitle){
  const seed = Math.floor(Math.random() * 1e9).toString(36);
  const payload = `${seed}.${Math.min(99999, Math.round(score))}.${encodeURIComponent(lessonTitle).slice(0, 40)}`;
  return { seed, hash: `#c=${payload}`, url: location.origin + location.pathname + `#c=${payload}` };
}
export function readChallenge(){
  const m = /^#c=([a-z0-9]+)\.(\d+)\.(.*)$/i.exec(location.hash || '');
  if (!m) return null;
  return { seed: m[1], score: +m[2], title: decodeURIComponent(m[3]) };
}
export function seededNotes(seed, n, scale){
  let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const out = []; let last = -1;
  while (out.length < n) { const v = scale[Math.floor(rnd() * scale.length)]; if (v !== last) { out.push(v); last = v; } }
  return out;
}

// --- share card -----------------------------------------------------------
// Drawn with the same wood and ball as the game so a screenshot is recognisable
// as this app rather than a generic stat card.
export function shareCard({ title, score, acc, stars, streak, rank }){
  const W = 1080, H = 1350, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#140f1f'; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W / 2, 120, 50, W / 2, 400, 900);
  g.addColorStop(0, 'rgba(52,34,82,.85)'); g.addColorStop(1, 'rgba(20,15,31,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);

  // wall and ball
  const wx = 700, half = 120, cy = 560;
  const wood = c.createLinearGradient(wx, 0, wx + 150, 0);
  wood.addColorStop(0, '#b9854f'); wood.addColorStop(.5, '#d6a870'); wood.addColorStop(1, '#a87443');
  c.fillStyle = wood;
  c.fillRect(wx, 230, 150, cy - half - 230); c.fillRect(wx, cy + half, 150, 300);
  c.fillStyle = 'rgba(94,227,155,.25)'; c.fillRect(wx, cy - half, 150, half * 2);
  const bx = 430, br = 54;
  const bg = c.createRadialGradient(bx - 18, cy - 18, 6, bx, cy, br);
  bg.addColorStop(0, '#ffd2a3'); bg.addColorStop(.35, '#ff9a3c'); bg.addColorStop(1, '#e2620f');
  c.fillStyle = 'rgba(94,227,155,.18)'; c.beginPath(); c.arc(bx, cy, br * 1.8, 0, 7); c.fill();
  c.fillStyle = bg; c.beginPath(); c.arc(bx, cy, br, 0, 7); c.fill();

  const F = (w, s) => `${w} ${s}px "Bricolage Grotesque", system-ui, sans-serif`;
  c.textAlign = 'left';
  c.fillStyle = '#a99fb8'; c.font = F(700, 30); c.fillText('PITCH PASS', 90, 140);
  c.fillStyle = '#f6efe4'; c.font = F(800, 72); c.fillText(title.slice(0, 22), 90, 232);

  c.font = F(800, 210); c.fillStyle = '#ff8a2a'; c.fillText(score.toLocaleString(), 90, 920);
  c.font = F(600, 34); c.fillStyle = '#a99fb8'; c.fillText('points', 90, 968);

  // stars
  for (let i = 0; i < 3; i++) {
    const x = 92 + i * 86, y = 1050, on = i < stars;
    c.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 14 : 34; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; k ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.closePath(); c.fillStyle = on ? '#ffd166' : 'rgba(255,255,255,.1)'; c.fill();
  }
  const stat = (x, big, small) => { c.textAlign = 'center'; c.fillStyle = '#f6efe4'; c.font = F(800, 58); c.fillText(big, x, 1192); c.fillStyle = '#a99fb8'; c.font = F(500, 28); c.fillText(small, x, 1236); };
  stat(540, acc + '%', 'first try'); stat(760, streak + '', 'day streak'); stat(960, rank, 'rank');
  c.textAlign = 'left'; c.fillStyle = '#6f6683'; c.font = F(500, 26);
  c.fillText('Train your ear. Sing the note, pass the wall.', 90, 1300);
  return cv;
}

export async function shareScore(card, text){
  const blob = await new Promise(r => card.toBlob(r, 'image/png'));
  const file = new File([blob], 'pitch-pass.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return 'shared'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'pitch-pass.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'saved';
  } catch (e) { return 'failed'; }
}

// --- practice reminder ----------------------------------------------------
// Uses the native scheduler inside the store apps; in a browser it is just a
// stored preference, and the app says so rather than pretending.
export async function setReminder(hhmm){
  S.reminder = hhmm; save();
  const LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  if (!LN) return 'stored';
  try {
    await LN.requestPermissions();
    await LN.cancel({ notifications: [{ id: 41 }] });
    if (!hhmm) return 'cleared';
    const [h, m] = hhmm.split(':').map(Number);
    await LN.schedule({ notifications: [{
      id: 41, title: 'Time to sing',
      body: streakNow() > 0 ? `Keep your ${streakNow()} day streak. Ten minutes is enough.` : 'Ten minutes of ear training.',
      schedule: { on: { hour: h, minute: m }, repeats: true, allowWhileIdle: true },
    }] });
    return 'scheduled';
  } catch (e) { return 'stored'; }
}

// --- inviting testers -----------------------------------------------------
// Share the link, not a score card. Falls back to the clipboard on desktop and
// on any browser without the share sheet.
export async function shareApp(){
  const url = location.origin + location.pathname;
  const text = 'Pitch Pass: the app sings a note, you sing it back, and your voice moves the ball through the hole in the wall. Have a go and tell me what breaks.';
  try {
    if (navigator.share) { await navigator.share({ title: 'Pitch Pass', text, url }); return 'shared'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); return 'copied'; } catch (e) {}
  return 'failed';
}

// --- pace -----------------------------------------------------------------
// A singer who nails Do-Mi-Sol at walking speed has not finished learning it;
// they still have to find the note faster. Pace is the dial that keeps the
// exercises honest after accuracy tops out.
//
// It climbs slowly and drops at once on purpose. Two clean sessions in a row
// are needed to move up, because one good run is luck as often as skill. One
// bad session drops it immediately, because a drill that outruns you stops
// teaching and starts punishing, and nobody comes back to that.
export const PACE_MIN = 0.8, PACE_MAX = 1.75, PACE_STEP = 0.12;
const UP = 0.85, DOWN = 0.55, MIN_WALLS = 8, WINS_NEEDED = 2;

export const paceLabel = (p = S.pace) =>
  p < 0.95 ? 'Gentle' : p < 1.1 ? 'Steady' : p < 1.35 ? 'Brisk' : p < 1.6 ? 'Quick' : 'Sharp';

// Runs and melodies feel the change less than single notes. At pace 1.75 a run
// written at 96bpm would land at 168, which is a different exercise rather than
// a harder one, so they move on the square root.
export const wallPace = (p = S.pace) => p;
export const runPace  = (p = S.pace) => Math.sqrt(p);

export function paceAfter(results){
  if (!Array.isArray(results) || results.length < MIN_WALLS) return null;
  const clean = results.filter(w => w.hit).length / results.length;
  const before = S.pace;
  if (clean < DOWN) {
    S.paceWins = 0;
    S.pace = Math.max(PACE_MIN, +(S.pace - PACE_STEP).toFixed(2));
  } else if (clean >= UP) {
    S.paceWins = (S.paceWins || 0) + 1;
    if (S.paceWins >= WINS_NEEDED) { S.paceWins = 0; S.pace = Math.min(PACE_MAX, +(S.pace + PACE_STEP).toFixed(2)); }
  } else S.paceWins = 0;
  save();
  if (S.pace === before) return null;
  return { from: before, to: S.pace, up: S.pace > before, label: paceLabel(S.pace) };
}
