// The coach: what to practise, in what order, and what to say while it happens.
// Every line here is the kind of thing a teacher says in a lesson: short, physical,
// and about one fix at a time. No praise that was not earned.

export const WARMUPS = [
  { id: 'w1', title: 'Lip trill siren', sub: 'Brrr up and down, 3 slides', type: 'slide', vowel: 'a lip trill (brrr)',
    cue: 'Loose lips, steady air. The sound should ride the air, not push it.',
    slides: [[0, 7], [0, 12], [-5, 7]], secs: 5 },
  { id: 'w2', title: 'Hum slide', sub: 'Mmm, jaw loose', type: 'slide', vowel: 'a hum (mmm)',
    cue: 'Teeth apart, lips together. Feel the buzz on your lips, not your throat.',
    slides: [[0, 5], [0, 9], [2, 12]], secs: 5 },
  { id: 'w3', title: 'Five-tone scale', sub: 'Do Re Mi Fa Sol and back, on "ee"', type: 'run', bpm: 76,
    cue: 'Same weight on every note. Do not get louder as you go up.',
    phrases: [[0, 2, 4, 5, 7, 5, 4, 2, 0], [2, 4, 5, 7, 9, 7, 5, 4, 2], [4, 5, 7, 9, 11, 9, 7, 5, 4]] },
  { id: 'w4', title: 'Octave release', sub: 'Low to high on "ah", let it go', type: 'slide',
    cue: 'Do not reach up with your chin. Let the top note arrive on the air you already have.',
    slides: [[0, 12], [2, 14], [-3, 9]], secs: 4.5 },
];

// A real lesson has an order. Agility before the voice is warm is how people strain.
export const STAGES = [
  { key: 'warmup',  title: 'Warm up',       sub: 'Wake the voice up',        mins: 3 },
  { key: 'ear',     title: 'Ear training',  sub: 'Hear it, sing it',         mins: 4 },
  { key: 'agility', title: 'Agility',       sub: 'Runs and fast patterns',   mins: 4 },
  { key: 'control', title: 'Control',       sub: 'Vibrato and steady holds', mins: 3 },
];

export const WARM_WINDOW_MIN = 45;   // a warm-up counts as current for this long

// --- live cues -------------------------------------------------------------
// Fed the last few walls of a lesson; returns at most one line, and only when
// the same mistake has happened enough times to be a pattern rather than a slip.
export function liveCue(recent, state){
  if (recent.length < 3) return null;
  const last3 = recent.slice(-3);
  const heard = last3.filter(w => w.heard);
  if (heard.length === 0) return { id: 'silent', text: 'Sing as soon as the note stops. Hold it until the ring fills.' };
  const cents = heard.filter(w => w.cents != null).map(w => w.cents);
  if (cents.length >= 3) {
    if (cents.every(c => c > 18)) return { id: 'sharp', text: 'You are landing over the note. Take the pressure off and aim just under it.' };
    if (cents.every(c => c < -18)) return { id: 'flat', text: 'You are sitting under the note. More air, and start the note from above it.' };
  }
  if (last3.every(w => !w.hit) && state.rising) return { id: 'reach', text: 'Do not reach with your chin on the way up. Keep your head level and let the air do it.' };
  if (last3.every(w => w.hit && w.grade === 'good')) return { id: 'tighten', text: 'All passing, none perfect. Aim for the middle of the note, not the edge of the hole.' };
  return null;
}

// --- end of session diagnosis ---------------------------------------------
// One finding, the most useful one, in the order a teacher would raise it.
export function diagnose(results, stats, lesson){
  const heard = results.filter(w => w.heard && w.cents != null);
  const unheard = results.filter(w => !w.heard).length;
  const semis = {};
  results.forEach(w => { const b = semis[w.semi] || (semis[w.semi] = { n: 0, hit: 0, c: [] }); b.n++; if (w.hit) b.hit++; if (w.cents != null && w.heard) b.c.push(w.cents); });
  const worst = Object.entries(semis).map(([s, b]) => ({ s: +s, rate: b.hit / b.n, avg: b.c.length ? b.c.reduce((x, y) => x + y, 0) / b.c.length : null }))
    .filter(x => x.rate < 0.5 && x.avg != null).sort((a, b) => a.rate - b.rate)[0];

  if (unheard > results.length / 3) return { title: 'The app is not hearing you', text: 'Most walls passed with no note. Hold each note until the ring around the ball fills, and move somewhere quieter if you can.' };

  // drifting over the lesson is a breath problem, not an ear problem
  if (heard.length >= 6) {
    const half = Math.floor(heard.length / 2);
    const early = heard.slice(0, half).reduce((s, w) => s + w.cents, 0) / half;
    const late = heard.slice(half).reduce((s, w) => s + w.cents, 0) / (heard.length - half);
    if (late - early > 22) return { title: 'You went sharper as you went on', text: 'That is usually pushing. Keep the same breath pressure on the last note as the first.' };
    if (early - late > 22) return { title: 'You sagged as you went on', text: 'Your support dropped near the end. Take a fuller breath between phrases and keep the ribs open.' };
  }
  const high = heard.filter(w => w.semi >= 9), low = heard.filter(w => w.semi <= 4);
  if (high.length >= 2 && low.length >= 2) {
    const hc = high.reduce((s, w) => s + w.cents, 0) / high.length;
    const lc = low.reduce((s, w) => s + w.cents, 0) / low.length;
    if (lc - hc > 25) return { title: 'Your top notes go flat', text: 'The higher notes are landing under. That is the break. Start those notes lighter and let them spin instead of pushing.' };
    if (hc - lc > 25) return { title: 'Your top notes go sharp', text: 'You are squeezing the high notes. Same volume as the low ones, and keep your jaw loose.' };
  }
  if (worst) return { title: `${lesson.blind ? 'One note' : 'Watch that note'}`, text: `You missed it most often, by about ${Math.abs(Math.round(worst.avg))} cents ${worst.avg > 0 ? 'sharp' : 'flat'}. Play it once before you sing and match it in your head first.` };
  if (stats.acc >= 95) return { title: 'Nothing to fix here', text: 'That was clean. Shrink the hole in Settings, or take this tempo up in the Studio.' };
  if (Math.abs(stats.cents) >= 12) return { title: `You sing ${stats.cents > 0 ? 'a touch sharp' : 'a touch flat'}`, text: stats.cents > 0 ? 'About a tenth of a semitone over. Relax the push and think of the note sitting down into place.' : 'About a tenth of a semitone under. More air underneath, and aim at the top of the note.' };
  return { title: 'Steady work', text: 'Nothing stood out. Keep the streak going and the next tempo up will feel easier.' };
}

// --- vocal health ----------------------------------------------------------
export function healthNote(minutesToday, warmedUp){
  if (!warmedUp) return { kind: 'warm', text: 'Warm up first. Two minutes of trills saves you a week of a tired voice.' };
  if (minutesToday >= 45) return { kind: 'rest', text: 'You have sung for 45 minutes today. Stop here and come back tomorrow. Voices improve on the rest day, not the long day.' };
  if (minutesToday >= 25) return { kind: 'water', text: '25 minutes in. Take water and a minute of quiet before the next set.' };
  return null;
}

export const isWarm = (lastWarmup) => lastWarmup != null && (Date.now() - lastWarmup) < WARM_WINDOW_MIN * 60000;
