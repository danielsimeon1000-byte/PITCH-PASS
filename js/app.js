// Pitch Pass app shell: screens, navigation and flow.
import * as A from './audio.js';
import { S, save, reset, dayKey, streakNow, recordSession, recordHold, stats, weekBars,
         addMinutes, minutesToday, markStage, stagesToday, logRange } from './store.js';
import { UNITS, STUDIO, GOSPEL, TECHNIQUE, CHORD_LAB, SOLF, SCALE, solf, findLesson, dailyLesson, buildPhrases } from './content.js';
import { Game } from './game.js';
import { HoldDrill, SlideDrill, HarmonyDrill } from './drill.js';
import { WARMUPS, STAGES, liveCue, diagnose, healthNote, isWarm } from './coach.js';
import * as M from './meta.js';
import { ALLOW_PRO_PREVIEW, PRIVACY_URL, VERSION, FEEDBACK_URL } from './config.js';
import * as PRICE from './pricing.js';

// Both lines below the plan list change with the plan, so they live together.
const buyLabel = p => p.trial ? `Start ${p.trial}-day free trial` : `Get Pro · ${PRICE.money(p.amount)}`;
const finePrint = p => p.trial
  ? `Then ${PRICE.money(p.amount)} ${p.per}. Cancel anytime before the trial ends.`
  : `${PRICE.money(p.amount)} ${p.per}. Cancel anytime.`;

const app = document.getElementById('app');
let cleanup = null;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

// ---------- icons ----------
const I = {
  back:'<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  x:'<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  play:'<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z"/></svg>',
  check:'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5ee39b" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  chev:'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a99fb8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  flame:'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff8a2a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2-5 1 1.5 2 2 3 2-1-3 0-5 0-7z"/></svg>',
  mic:'<svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ff8a2a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>',
  shield:'<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5ee39b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>',
  clock:'<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5ee39b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  phones:'<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5ee39b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><rect x="3" y="15" width="4" height="6" rx="1.5"/><rect x="17" y="15" width="4" height="6" rx="1.5"/></svg>',
  music:'<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff8a2a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  speaker:'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
  pause:'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 5v14M15 5v14"/></svg>',
  up:'<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff8a2a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>',
  down:'<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff8a2a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12l7 7 7-7"/></svg>',
  info:'<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff8a2a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>',
  lock:'<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  gear:'<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  runs:'<svg aria-hidden="true" width="36" height="24" viewBox="0 0 36 24" fill="none" stroke="#ff8a2a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6l6 4 6-6 6 10 6-4 8 10"/></svg>',
  wave:'<svg aria-hidden="true" width="40" height="16" viewBox="0 0 40 16" fill="none" stroke="#ff8a2a" stroke-width="2.2" stroke-linecap="round"><path d="M1 8c3-7 5-7 8 0s5 7 8 0 5-7 8 0 5 7 8 0 4-6 6-3"/></svg>',
  flat:'<svg aria-hidden="true" width="40" height="16" viewBox="0 0 40 16" fill="none" stroke="#ff8a2a" stroke-width="2.2" stroke-linecap="round"><path d="M1 8h38"/></svg>',
  slide:'<svg aria-hidden="true" width="40" height="16" viewBox="0 0 40 16" fill="none" stroke="#ff8a2a" stroke-width="2.2" stroke-linecap="round"><path d="M1 14h8C20 14 20 2 31 2h8"/></svg>',
  share:'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/></svg>',
  badge:'<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/></svg>',
  lungs:'<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff8a2a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v9"/><path d="M12 12c0-3-2-4-4-3S4 13 4 17a3 3 0 0 0 4 2.8V12"/><path d="M12 12c0-3 2-4 4-3s4 4 4 8a3 3 0 0 1-4 2.8V12"/></svg>',
  leap:'<svg aria-hidden="true" width="40" height="16" viewBox="0 0 40 16" fill="none" stroke="#ff8a2a" stroke-width="2.2" stroke-linecap="round"><path d="M1 14h12M27 2h12M13 14l14-12"/></svg>',
};
const tabIcons = {
  home:'<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  lessons:'<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7"/></svg>',
  progress:'<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>',
  studio:'<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
};
const tabbar = on => `<nav class="tabbar" aria-label="Main">
  ${[['home','Home'],['lessons','Lessons'],['progress','Progress'],['studio', S.pro ? 'Studio' : 'Pro']].map(([k, l]) => `<button data-go="${k}" class="${on === k ? 'on' : ''}">${tabIcons[k]}${l}</button>`).join('')}
</nav>`;

// ---------- router ----------
const screens = {};
export function go(name, params = {}){
  if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
  if (name === 'studio' && !S.pro) name = 'paywall';
  const r = screens[name](params) || {};
  app.innerHTML = r.html;
  app.scrollTop = 0;
  if (r.mount) cleanup = r.mount(app) || null;
}
app.addEventListener('click', e => {
  const el = e.target.closest('[data-go]');
  if (el) { A.ctx(); const p = el.dataset.p ? JSON.parse(el.dataset.p) : {}; go(el.dataset.go, p); }
});

function sheet(html, bind){
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  bind && bind(bg, close);
  return close;
}

// ---------- helpers ----------
const lessonOpen = l => !l.unit.pro || S.pro;
function nextUnit1(){ const ls = UNITS[0].lessons; return ls.find(l => !S.done[l.id]) || ls[ls.length - 1]; }
function nextAfter(id){
  const seqs = [...UNITS.map(u => u.lessons.map(l => l.id)), STUDIO.map(l => l.id), GOSPEL.map(l => l.id)];
  for (const s of seqs) { const i = s.indexOf(id); if (i >= 0 && i < s.length - 1) return findLesson(s[i + 1]); }
  return null;
}
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

async function ensureInput(){
  if (A.state.micOn) return true;
  if (S.inputMode === 'touch') { A.state.touchMode = true; return false; }
  const ok = await A.startMic();
  if (!ok) A.state.touchMode = true;
  return ok;
}

const screenFor = l => l.type === 'hold' ? 'drill' : l.type === 'slide' ? 'slide' : l.type === 'harmony' ? 'harmony' : 'game';

function startLesson(lesson, opts = {}){
  if (!lessonOpen(lesson)) return go('paywall');
  A.ctx();
  // a coach does not let you run scales on a cold voice
  const needsWarm = ['studio', 'tech', 'chords', 'gospel'].includes(lesson.unit.id);
  // "Skip it this once" used to mean this one tap, so browsing four runs meant
  // the same modal four times, which reads as the screen being broken rather
  // than as advice. Skipping now stands for twenty minutes.
  const skipped = S.warmSkip && Date.now() - S.warmSkip < 20 * 60 * 1000;
  if (needsWarm && !isWarm(S.lastWarmup) && !opts.skipWarm && !skipped) {
    return sheet(`<h1 style="font-size:24px">Warm up first</h1><p class="muted" style="line-height:1.45">Runs and held notes on a cold voice is how people end up hoarse. Two minutes of trills and you will hit more of them anyway.</p>
      <button class="btn primary" id="warm">Two minute warm-up</button><button class="btn ghost" id="skip">Skip it this once</button>`,
      (bg, close) => {
        bg.querySelector('#warm').onclick = () => { close(); go('session'); };
        bg.querySelector('#skip').onclick = () => { close(); S.warmSkip = Date.now(); save(); startLesson(lesson, { skipWarm: true }); };
      });
  }
  ensureInput().then(() => go(screenFor(lesson), { lesson }));
}

// Minutes practised drive the daily goal and the vocal-health nudges.
function timeSpent(startedAt){ const secs = (performance.now() - startedAt) / 1000; if (secs > 4) addMinutes(Math.min(secs, 900)); }
function stageOf(lesson){
  if (lesson.warmup) return 'warmup';
  if (lesson.type === 'run') return 'agility';
  if (lesson.type === 'hold' || lesson.type === 'harmony') return 'control';
  return 'ear';
}

// ---------- onboarding ----------
screens.welcome = () => ({ html: `<div class="screen">
  <div class="hero">
    <div class="lane" style="top:90px"></div><div class="lane" style="top:160px"></div><div class="lane" style="top:230px"></div><div class="lane" style="top:300px"></div>
    <div class="wt">Mi</div><div class="wb"></div><div class="ball"></div>
    <div class="pill">You: <b style="color:var(--ink)">E4</b> +6c</div>
  </div>
  <div class="grow"></div>
  <div class="col" style="gap:14px">
    <div class="brand">Pitch<span>Pass</span></div>
    <h1 class="xl">Hear it. Sing it. Pass through.</h1>
    <p class="lead">Train your ear one note at a time. Your voice moves the ball, and only the right pitch fits the hole.</p>
  </div>
  <div class="col" style="margin-top:12px">
    <button class="btn primary" data-go="mic">Get started</button>
  </div>
</div>` });

screens.mic = () => ({ html: `<div class="screen">
  <div class="dots"><i class="on"></i><i class="on"></i><i></i></div>
  <div class="grow col" style="justify-content:center;gap:28px">
    <div class="mic-ring">${I.mic}</div>
    <div class="col" style="gap:12px"><h1>Your voice is the controller</h1><p class="lead">Pitch Pass listens to the note you sing and turns it into the ball's height.</p></div>
    <div class="col" style="gap:14px">
      <div class="check">${I.shield}<div><b>Nothing is recorded.</b> <span class="muted">Pitch is read on your phone and thrown away.</span></div></div>
      <div class="check">${I.clock}<div><b>Only while you play.</b> <span class="muted">The mic is used during lessons and the range check.</span></div></div>
      <div class="check">${I.phones}<div><b>Quiet room works best.</b> <span class="muted">Headphones keep the reference note out of the mic.</span></div></div>
    </div>
    <p class="small no" id="micErr" hidden>The microphone was blocked. Allow it in your browser or phone settings and try again, or continue with touch mode.</p>
  </div>
  <div class="col">
    <button class="btn primary" id="allow">Allow microphone</button>
    <button class="btn ghost" id="touch">Not now, use touch mode</button>
  </div>
</div>`, mount(root){
  root.querySelector('#allow').onclick = async () => {
    A.ctx();
    const ok = await A.startMic();
    if (ok) { S.inputMode = 'mic'; save(); go('range', { manual: true }); }
    else root.querySelector('#micErr').hidden = false;
  };
  root.querySelector('#touch').onclick = () => { A.ctx(); A.state.touchMode = true; S.inputMode = 'touch'; save(); go('range', { manual: true }); };
}});

const RANGE_OPTS = [{ base: 48, label: 'Low', sub: 'Do = C3' }, { base: 55, label: 'Mid', sub: 'Do = G3' }, { base: 60, label: 'High', sub: 'Do = C4' }];
function baseFromRange(low, high){
  const mid = (low + high) / 2;
  let base = Math.round(mid - 6);
  if (high - low >= 12) base = Math.max(Math.ceil(low), Math.min(Math.floor(high) - 12, base));
  base = Math.max(40, Math.min(67, base));
  // prefer a natural key (white key) for friendlier note names
  const white = [0,2,4,5,7,9,11];
  if (!white.includes(((base % 12) + 12) % 12)) base += (high - (base + 12) >= 1 ? 1 : -1);
  return base;
}
screens.range = (p = {}) => {
  const manual = p.manual || !A.state.micOn;
  const fromSettings = !!p.fromSettings;
  if (manual) return { html: `<div class="screen">
    ${fromSettings ? `<div class="row"><button class="icon-btn" data-go="settings" aria-label="Back">${I.back}</button></div>` : '<div class="dots"><i class="on"></i><i class="on"></i><i class="on"></i></div>'}
    <div class="col" style="gap:10px"><h1>Where does your voice sit?</h1><p class="lead">A rough answer is fine. You can tune it exactly in a moment by singing.</p></div>
    <div class="col" style="gap:10px">
      ${RANGE_OPTS.map(o => `<button class="plan ${S.base === o.base ? 'on' : ''}" data-base="${o.base}"><span class="radio"></span><div class="col" style="gap:2px"><b>${o.label}</b><span class="small muted">${o.sub}${o.base === 48 ? ', most men' : o.base === 60 ? ', most women and kids' : ''}</span></div></button>`).join('')}
    </div>
    <div class="grow"></div>
    <button class="btn primary" id="done">Continue</button>
  </div>`, mount(root){
    root.querySelectorAll('[data-base]').forEach(b => b.onclick = () => { S.base = +b.dataset.base; save(); root.querySelectorAll('[data-base]').forEach(x => x.classList.toggle('on', x === b)); });
    root.querySelector('#done').onclick = () => { save(); go(fromSettings ? 'settings' : 'first'); };
  }};

  return { html: `<div class="screen">
    ${fromSettings ? `<div class="row"><button class="icon-btn" data-go="settings" aria-label="Back">${I.back}</button></div>` : '<div class="dots"><i class="on"></i><i class="on"></i><i class="on"></i></div>'}
    <div class="col" style="gap:10px"><h1>Find your range</h1><p class="lead" id="ask">Sing "ah" as low as feels easy and hold it.</p></div>
    <div class="card row" style="flex:1;min-height:260px;align-items:stretch;gap:20px;border-radius:24px">
      <div class="meter" id="meter"><div class="band" id="band" style="display:none"></div><div class="ball" id="mball" style="top:85%"></div></div>
      <div class="col grow" style="justify-content:space-between">
        <div class="col" style="gap:4px"><span class="eyebrow">Highest</span><span class="bigNote" id="hi" style="font-size:34px">–</span></div>
        <div class="col" style="gap:4px;align-items:flex-start"><span class="eyebrow">Now</span><span class="bigNote" id="now">–</span><span class="small muted" id="hint">Waiting for your voice</span></div>
        <div class="col" style="gap:4px"><span class="eyebrow">Lowest</span><span class="bigNote" id="lo" style="font-size:34px">–</span></div>
      </div>
    </div>
    <div class="note" id="result" hidden>${I.music}<div id="resultText"></div></div>
    <div class="row" id="actions">
      <button class="btn secondary" id="again" hidden>Sing again</button>
      <button class="btn primary" id="ok" hidden>Looks right</button>
    </div>
    <button class="btn ghost" id="pick">Pick a range instead</button>
    <button class="btn ghost" id="skipRange" style="margin-top:-8px">Not now</button>
  </div>`, mount(root){
    const $ = s => root.querySelector(s);
    const tr = new A.PitchTracker();
    // A range check that concludes inside a second is not measuring a voice, it is
    // measuring whichever note happened to be sounding when the prompt appeared.
    // The old one took the first 45 voiced frames, about three quarters of a
    // second, so it settled your top note before you had drawn breath: a test
    // voice singing C3 up to C5 was recorded as C3-F3, and Do was set to G2,
    // below anything the singer had sung. Every lesson is pitched off this value.
    // So: give the singer room to travel, count only pitches they actually hold,
    // and conclude once they have stopped climbing.
    const MIN_SING = 2.4, SETTLE = 1500, HOLD = 300, QUIET = 9000;
    let step = 'low', lo = null, hi = null, raf, last = performance.now(), stepAt = performance.now();
    let sung = 0, best = null, bestAt = performance.now(), run = null, tries = 0, quietFrom = performance.now();
    const LOW_M = 36, HIGH_M = 84;
    const yOf = m => Math.max(2, Math.min(92, (HIGH_M - m) / (HIGH_M - LOW_M) * 100));
    const finish = () => {
      step = 'done';
      const base = baseFromRange(lo, hi);
      S.range = { low: Math.round(lo), high: Math.round(hi) }; S.base = base; save(); logRange(lo, hi);
      $('#result').hidden = false;
      $('#resultText').innerHTML = `Your range: <b>${A.noteName(lo)}</b> to <b>${A.noteName(hi)}</b>. Lessons will start with Do on <b>${A.noteName(base)}</b>.`;
      $('#again').hidden = false; $('#ok').hidden = false;
      $('#ask').textContent = 'Got it. You can redo this any time in Settings.';
      $('#hint').textContent = '';
      const band = $('#band'); band.style.display = 'block'; band.style.top = yOf(hi) + '%'; band.style.bottom = (100 - yOf(lo)) + '%';
    };
    const startStep = (which, now) => { step = which; sung = 0; best = null; bestAt = now; run = null; quietFrom = now; };
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const v = tr.update(now, dt, null, false);
      const hunting = step === 'low' || step === 'high';
      if (v != null) {
        $('#now').textContent = A.noteName(v);
        $('#mball').style.top = `calc(${yOf(v)}% - 15px)`;
        if (hunting) {
          quietFrom = now; sung += dt;
          // A pitch counts only once it has sat within a semitone for HOLD ms.
          // A voice sweeping past a note on the way somewhere is not singing it.
          if (!run || Math.abs(v - run.v) > 1) run = { v, at: now };
          else run.v += (v - run.v) * 0.2;
          if (now - run.at >= HOLD) {
            const better = best == null || (step === 'low' ? run.v < best - 0.4 : run.v > best + 0.4);
            if (better) { best = run.v; bestAt = now; $(step === 'low' ? '#lo' : '#hi').textContent = A.noteName(best); }
          }
          $('#hint').textContent = best == null ? 'Hold it…'
            : (step === 'low' ? 'Lower if you can, or keep holding' : 'Higher if you can, or keep holding');
          if (sung >= MIN_SING && best != null && now - bestAt >= SETTLE) {
            if (step === 'low') {
              lo = best; step = 'gap'; stepAt = now;
              $('#ask').textContent = 'Nice. Now slide up to your highest comfortable note and hold it.';
              $('#hint').textContent = 'Breathe, then sing high';
            } else {
              hi = best;
              // Two honest attempts. Past that, take what the voice gave: a narrow
              // range is a real answer, and trapping someone in a retry is not.
              if (hi - lo < 5 && tries++ < 1) {
                startStep('high', now);
                $('#hi').textContent = '–';
                $('#ask').textContent = 'That was close to your low note. Try going higher.';
              } else finish();
            }
          }
        }
      } else if (hunting) {
        if (run && now - run.at < HOLD) run = null;
        if (now - quietFrom > QUIET) {
          $('#hint').textContent = 'Not hearing anything yet';
          $('#ask').textContent = 'Sing out loud on "ah". If the mic is not picking you up, pick a range instead.';
        }
      }
      if (step === 'gap' && now - stepAt > 900) startStep('high', now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    $('#again').onclick = () => { lo = hi = null; tries = 0; startStep('low', performance.now()); ['#lo','#hi'].forEach(s => $(s).textContent = '–'); $('#result').hidden = true; $('#again').hidden = true; $('#ok').hidden = true; $('#band').style.display = 'none'; $('#ask').textContent = 'Sing "ah" as low as feels easy and hold it.'; };
    $('#ok').onclick = () => { S.onboarded = true; save(); go(fromSettings ? 'settings' : 'home'); };
    $('#skipRange').onclick = () => { S.onboarded = true; save(); go('home'); };
    $('#pick').onclick = () => go('range', { manual: true, fromSettings });
    return () => cancelAnimationFrame(raf);
  }};
};

// ---------- home ----------
const ring = (pct, size, stroke, col) => {
  const r = (size - stroke) / 2, cflen = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="transform:rotate(-90deg)">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${cflen}" stroke-dashoffset="${cflen * (1 - pct)}"/></svg>`;
};

screens.home = () => {
  const today = dayKey(), dailyDone = S.daily === today, nx = nextUnit1(), st = streakNow();
  const week = weekBars(), ws = stats(7), lv = M.level(), goal = M.goalState();
  const done = stagesToday(), stageDone = STAGES.filter(x => done[x.key]).length;
  const health = healthNote(minutesToday(), isWarm(S.lastWarmup));
  const ch = M.readChallenge();
  const unitDone = UNITS[0].lessons.filter(l => S.done[l.id]).length;
  return { html: `<div class="screen tabbed">
    <div class="row between">
      <div class="col" style="gap:2px"><span class="muted small">${greet()}</span><span style="font-weight:800;font-size:26px;letter-spacing:-.02em">${st > 0 ? `Day ${st}` : 'Ready to sing?'}</span></div>
      <div class="row" style="gap:8px">
        <span class="chip" title="${st} day streak">${I.flame}${st}${S.streak.rest ? `<span class="rest" title="${S.streak.rest} rest day banked">+${S.streak.rest}</span>` : ''}</span>
        <button class="icon-btn" data-go="badges" aria-label="Badges">${I.badge}</button>
      </div>
    </div>

    <button class="card row lvl" data-go="progress">
      <div class="goal">${ring(goal.pct, 54, 6, goal.met ? 'var(--good)' : 'var(--accent)')}<span>${goal.met ? I.check : goal.mins}</span></div>
      <div class="col grow" style="gap:5px">
        <div class="row between"><b style="font-size:15px">Lv ${lv.level} · ${lv.rank}</b><span class="small muted">${goal.met ? 'Goal done' : `${goal.mins}/${goal.goal} min`}</span></div>
        <span class="xpbar"><i style="width:${Math.round(lv.pct * 100)}%"></i></span>
        <span class="small muted">${lv.need - lv.into} XP to level ${lv.level + 1}</span>
      </div>
    </button>

    ${ch ? `<button class="card row challenge" id="chal"><div class="col grow" style="gap:2px"><b>A friend challenged you</b><span class="small muted">${esc(ch.title)} · beat ${ch.score.toLocaleString()}</span></div>${I.chev}</button>` : ''}

    <button class="daily" id="session">
      <span class="w1"></span><span class="w2"></span><span class="wb"></span>
      <span class="eyebrow" style="color:var(--accent-ink)">Today's session</span>
      <span class="col" style="gap:4px;max-width:220px"><span style="font-weight:800;font-size:26px;line-height:1.05;letter-spacing:-.02em">${stageDone === 4 ? 'Session done' : stageDone ? `${4 - stageDone} stage${4 - stageDone > 1 ? 's' : ''} left` : 'Warm up, then sing'}</span><span style="font-size:14px;opacity:.82">${stageDone === 4 ? 'Come back tomorrow, or play a lesson for fun.' : 'Warm up, ear, agility, control. About 14 minutes.'}</span></span>
      <span class="stagedots">${STAGES.map(x => `<i class="${done[x.key] ? 'on' : ''}"></i>`).join('')}</span>
      <span class="play">${I.play} ${stageDone ? 'Continue' : 'Start session'}</span>
    </button>

    ${!S.range ? `<button class="note" id="tune" style="text-align:left;width:100%">${I.music}<div>Lessons are pitched on a rough guess right now. <b>Sing your range</b> and they will sit where your voice actually lives.</div></button>` : ''}
    ${health ? `<div class="note ${health.kind === 'rest' ? 'warn' : ''}">${health.kind === 'warm' ? I.lungs : I.info}<div>${health.text}</div></div>` : ''}

    <div class="grid2">
      <button class="tile" id="daily"><span class="eyebrow">Daily challenge</span><b>${dailyDone ? 'Played today' : '10 mixed notes'}</b><span>${dailyDone ? 'New set tomorrow' : 'About 3 minutes'}</span></button>
      <button class="tile" id="cont"><span class="eyebrow">Continue</span><b>${esc(nx.title)}</b><span>Unit 1 · ${unitDone} of ${UNITS[0].lessons.length} done</span></button>
    </div>

    <div class="card col" style="gap:10px">
      <div class="row between"><b style="font-size:16px">This week</b><span class="small muted">avg accuracy <b style="color:var(--ink)">${ws.acc == null ? '–' : ws.acc + '%'}</b></span></div>
      <div class="bars">${week.map(d => {
        const col = d.acc == null ? '' : d.acc >= 85 ? 'background:var(--good)' : d.acc >= 70 ? 'background:#6f8ad8' : 'background:#4b3f70';
        const empty = d.acc == null ? (d.today ? 'background:var(--s2);border:1px dashed var(--accent)' : 'background:var(--s2)') : '';
        return `<div><b class="val">${d.acc == null ? '' : d.acc}</b><i style="height:${d.acc == null ? 6 : Math.max(12, d.acc * 0.62)}px;${col}${empty}"></i><span style="${d.today ? 'color:var(--ink);font-weight:700' : ''}">${d.label}</span></div>`;
      }).join('')}</div>
    </div>
  </div>${tabbar('home')}`, mount(root){
    root.querySelector('#session').onclick = () => go('session');
    root.querySelector('#daily').onclick = () => startLesson(dailyLesson(today));
    const tune = root.querySelector('#tune'); if (tune) tune.onclick = () => go('range');
    root.querySelector('#cont').onclick = () => startLesson(findLesson(nx.id));
    const c = root.querySelector('#chal');
    if (c) c.onclick = () => startLesson({ id: 'challenge', title: 'Challenge', sub: '10 notes', type: 'challenge',
      notes: M.seededNotes(ch.seed, 10, SCALE), rival: ch, unit: { id: 'challenge', pro: false } });
  }};
};

// ---------- today's session ----------
screens.session = () => {
  const done = stagesToday();
  const warm = WARMUPS[new Date().getDate() % WARMUPS.length];
  const pick = {
    warmup: warm,
    ear: findLesson(nextUnit1().id),
    agility: S.pro ? (STUDIO.find(l => !S.done[l.id]) || STUDIO[0]) : findLesson('u1l5'),
    control: S.pro ? (TECHNIQUE.find(t => !t.soon && !S.done[t.id]) || findLesson('tv')) : findLesson('u1l4'),
  };
  const next = STAGES.find(x => !done[x.key]);
  return { html: `<div class="screen">
    <div class="row"><button class="icon-btn" data-go="home" aria-label="Back">${I.back}</button><div class="col grow" style="gap:0"><b style="font-size:17px">Today's session</b><span class="small muted">${minutesToday()} min sung today</span></div></div>
    <p class="lead" style="font-size:15px">Four stages, in this order. The order is the point: a warm voice learns faster and stays healthy.</p>
    <div class="list">
      ${STAGES.map((x, i) => {
        const l = pick[x.key], isDone = !!done[x.key], isNext = next && next.key === x.key;
        return `<button class="item ${isNext ? 'next' : ''}" data-stage="${x.key}">
          <span class="badge ${isDone && !isNext ? 'done' : ''}">${isDone && !isNext ? I.check : isNext ? I.play : i + 1}</span>
          <span class="col grow" style="gap:1px"><b>${x.title}</b><span class="sub">${esc(l ? l.title : x.sub)} · about ${x.mins} min</span></span>
          ${isDone ? '<span class="end">done</span>' : ''}
        </button>`;
      }).join('')}
    </div>
    <div class="note">${I.lungs}<div>${esc(warm.cue)}</div></div>
    <div class="grow"></div>
    ${next ? `<button class="btn primary" id="go">Start ${next.title.toLowerCase()}</button>` : `<div class="card col" style="align-items:center;gap:6px"><b style="font-size:17px">Session complete</b><span class="small muted" style="text-align:center">That is the whole thing. Rest the voice now; it improves between sessions, not during them.</span></div><button class="btn secondary" data-go="home">Back home</button>`}
  </div>`, mount(root){
    const run = k => startLesson({ ...pick[k], unit: pick[k].unit || { id: 'warmup', pro: false } }, { skipWarm: k === 'warmup' });
    root.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => run(b.dataset.stage));
    const g = root.querySelector('#go'); if (g) g.onclick = () => run(next.key);
  }};
};

// ---------- lessons ----------
function lessonRows(unit){
  const ls = unit.lessons; const firstOpen = ls.find(l => !S.done[l.id]);
  return ls.map((l, i) => {
    const done = S.done[l.id], next = l === firstOpen;
    return `<button class="item ${next ? 'next' : ''}" data-lesson="${l.id}">
      <span class="badge ${done && !next ? 'done' : ''}">${done && !next ? I.check : next ? I.play : i + 1}</span>
      <span class="col" style="gap:1px"><b>${esc(l.title)}</b><span class="sub">${done ? `Best ${S.best[l.id]}%` : next ? `Up next · ${esc(l.sub)}` : esc(l.sub)}</span></span>
    </button>`;
  }).join('');
}
screens.lessons = () => {
  const u1 = UNITS[0], d1 = u1.lessons.filter(l => S.done[l.id]).length;
  const proUnits = UNITS.slice(1);
  return { html: `<div class="screen tabbed">
    <h1>Lessons</h1>
    <div class="row between"><b style="font-size:17px">Unit 1 · ${u1.title}</b><span class="small muted">${d1} of ${u1.lessons.length}</span></div>
    <div class="list">${lessonRows(u1)}</div>
    <div class="row" style="gap:8px;margin-top:6px"><b style="font-size:17px">Pro Vocal Studio</b>${S.pro ? '' : '<span class="pro">PRO</span>'}</div>
    <button class="item" data-go="studio" style="background:var(--s2);border:1px solid rgba(255,138,42,.6)">
      ${I.runs}<span class="col grow" style="gap:2px"><b>Riffs, runs and technique</b><span class="sub">Fast note patterns, vibrato, steady holds</span></span>${I.chev}
    </button>
    ${S.pro ? proUnits.map((u, i) => `<div class="row between" style="margin-top:6px"><b style="font-size:17px">Unit ${i + 2} · ${u.title}</b></div><div class="list">${lessonRows(u)}</div>`).join('')
      : `<div class="grid2">${proUnits.map(u => `<button class="tile locked" data-go="paywall"><b>${u.title}</b><span>${u.sub}</span><span class="row" style="gap:4px;color:var(--accent-soft)">${I.lock} Pro</span></button>`).join('')}</div>`}
  </div>${tabbar('lessons')}`, mount(root){
    root.querySelectorAll('[data-lesson]').forEach(b => b.onclick = () => startLesson(findLesson(b.dataset.lesson)));
  }};
};

// ---------- studio ----------
screens.studio = () => {
  const firstOpen = STUDIO.find(l => !S.done[l.id]);
  return { html: `<div class="screen tabbed">
    <div class="col" style="gap:6px"><h1>Vocal Studio</h1><p class="muted" style="font-size:14.5px;line-height:1.4">Agility and control drills. Beat 80% to move up to a faster tempo.</p></div>
    <div class="row between"><b style="font-size:17px">Riffs and runs</b><span class="small muted">${STUDIO.filter(l => S.done[l.id]).length} of ${STUDIO.length}</span></div>
    <div class="list">${STUDIO.map((l, i) => { const done = S.done[l.id], next = l === firstOpen; return `<button class="item ${next ? 'next' : ''}" data-lesson="${l.id}">
      <span class="badge ${done && !next ? 'done' : ''}">${done && !next ? I.check : next ? I.play : i + 1}</span>
      <span class="col grow" style="gap:1px"><b>${esc(l.title)}</b><span class="sub">${done ? `Best ${S.best[l.id]}%` : esc(l.sub)}</span></span><span class="end" style="color:var(--accent-soft)">${l.bpm} bpm</span></button>`; }).join('')}</div>
    <div class="row between" style="margin-top:6px"><b style="font-size:17px">Gospel</b><span class="small muted">${GOSPEL.filter(l => S.done[l.id]).length} of ${GOSPEL.length}</span></div>
    <div class="list">${GOSPEL.map((l, i) => { const done = S.done[l.id]; return `<button class="item" data-lesson="${l.id}">
      <span class="badge ${done ? 'done' : ''}">${done ? I.check : i + 1}</span>
      <span class="col grow" style="gap:1px"><b>${esc(l.title)}</b><span class="sub">${done ? `Best ${S.best[l.id]}%` : esc(l.sub)}</span></span>
      <span class="end" style="color:var(--accent-soft)">${l.bpm ? l.bpm + ' bpm' : 'ear'}</span></button>`; }).join('')}</div>
    <div class="row between" style="margin-top:6px"><b style="font-size:17px">Chord lab</b><span class="small muted">${CHORD_LAB.filter(l => S.done[l.id]).length} of ${CHORD_LAB.length}</span></div>
    <div class="list">${CHORD_LAB.map((l, i) => { const done = S.done[l.id]; return `<button class="item" data-lesson="${l.id}">
      <span class="badge ${done ? 'done' : ''}">${done ? I.check : i + 1}</span>
      <span class="col grow" style="gap:1px"><b>${esc(l.title)}</b><span class="sub">${done ? `Best ${S.best[l.id]}%` : esc(l.sub)}</span></span>
      <span class="end">${l.type === 'harmony' ? 'hold' : l.type === 'tone' ? 'ear' : 'arp'}</span></button>`; }).join('')}</div>
    <b style="font-size:17px;margin-top:6px">Vocal technique</b>
    <div class="grid2">${TECHNIQUE.map(t => `<button class="tile ${t.soon ? 'soon' : ''}" ${t.soon ? 'disabled' : `data-lesson="${t.id}"`}>${{ tv: I.wave, ts: I.flat, tsl: I.slide, tl: I.leap }[t.id]}<b>${t.title}</b><span>${t.soon ? 'Coming soon' : S.best[t.id] != null ? `Best ${S.best[t.id]}%` : t.sub}</span></button>`).join('')}</div>
  </div>${tabbar('studio')}`, mount(root){
    root.querySelectorAll('[data-lesson]').forEach(b => b.onclick = () => startLesson(findLesson(b.dataset.lesson)));
  }};
};

// ---------- game ----------
screens.game = ({ lesson }) => {
  const phrases = buildPhrases(lesson);
  const total = phrases.reduce((s, p) => s + p.notes.length, 0);
  const segs = Math.min(total, 24);
  return { html: `<div class="game-top">
      <button class="icon-btn" id="quit" aria-label="Quit lesson">${I.x}</button>
      <div class="progress" id="prog">${Array.from({ length: segs }, (_, i) => `<i class="${i === 0 ? 'now' : ''}"></i>`).join('')}</div>
    </div>
    <div class="hud"><span class="score" id="score">0</span><span class="combo" id="combo" hidden>×2</span><span class="grow"></span><span class="row" style="gap:4px;font-weight:700">${I.flame}<span id="streak">0</span></span></div>
    ${A.state.touchMode ? `<div class="banner">${S.inputMode === 'touch' ? 'Touch mode: drag up and down to move the ball. Switch to the mic in Settings.' : "Mic isn't available, so drag up and down to move the ball. Allow the microphone in your browser or phone settings to sing."}</div>` : ''}
    <div class="stage">
      <canvas id="cv"></canvas>
      <div class="tuner" id="tuner">Get ready</div>
      <div class="phase" id="phase"></div>
      <div class="toast" id="toast"></div>
      <div class="cue" id="cue" hidden></div>
      <div class="chordbadge" id="chordBadge" hidden></div>
    </div>
    <div class="game-bottom">
      <button class="btn secondary" id="hear">${I.speaker} Hear again</button>
      <button class="btn secondary" id="pause">${I.pause} Pause</button>
    </div>`, mount(root){
    const $ = s => root.querySelector(s);
    const segOf = i => Math.floor(i * segs / total);
    const startedAt = performance.now();
    let lastCue = null, cueT = 0;
    const showCue = text => {
      const el = $('#cue'), badge = $('#chordBadge');
      el.textContent = text; el.hidden = false;
      const hadBadge = !badge.hidden; badge.hidden = true;
      clearTimeout(cueT); cueT = setTimeout(() => { el.hidden = true; if (hadBadge) badge.hidden = false; }, 4200);
    };
    let shown = 0;
    const countUp = target => { const el = $('#score'); const step = () => { shown = Math.min(target, shown + Math.max(5, Math.ceil((target - shown) / 6))); el.textContent = shown.toLocaleString(); if (shown < target) requestAnimationFrame(step); }; step(); };
    const g = new Game($('#cv'), {
      base: S.base, tol: S.tol, phrases, blind: !!lesson.blind, syl: lesson.syl,
      pace: M.wallPace(), runPace: M.runPace(),
      tunerEl: $('#tuner'), phaseEl: $('#phase'), toastEl: $('#toast'),
      onWall(i, info){
        // the coach only speaks when the same mistake has become a pattern
        const cue = liveCue(g.results, { rising: lesson.notes && lesson.notes[i] > (lesson.notes[i - 1] ?? -1) });
        if (cue && cue.id !== lastCue) { lastCue = cue.id; showCue(cue.text); }
        const bars = $('#prog').children, k = segOf(i), kn = segOf(i + 1);
        if (bars[k]) bars[k].className = !info.hit ? 'miss' : !info.firstTry ? 'second' : info.grade === 'perfect' ? 'perfect' : 'hit';
        if (kn !== k && bars[kn]) bars[kn].className = 'now';
      },
      onScore(score, combo){
        countUp(score);
        $('#streak').textContent = combo;
        const m = combo >= 10 ? 4 : combo >= 6 ? 3 : combo >= 3 ? 2 : 1, el = $('#combo');
        el.hidden = m < 2; if (m >= 2 && el.textContent !== `×${m} combo`) { el.textContent = `×${m} combo`; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
      },
      onPhrase(ph){
        const el = $('#chordBadge');
        if (!ph.chordName) { el.hidden = true; return; }
        el.hidden = false;
        el.innerHTML = ph.ask ? `<b>${esc(ph.chordName)}</b><span>sing the ${esc(ph.ask)}</span>` : `<b>${esc(ph.chordName)}</b><span>sing it up and back down</span>`;
      },
      onEnd(results, extra){ timeSpent(startedAt); markStage(stageOf(lesson)); go('results', { lesson, results, extra }); },
    });
    window.__pp.game = g;
    $('#hear').onclick = () => g.hearAgain();
    $('#pause').onclick = e => { g.pause(!g.paused); e.currentTarget.innerHTML = g.paused ? `${I.play} Resume` : `${I.pause} Pause`; $('#phase').textContent = g.paused ? 'Paused' : ''; };
    $('#quit').onclick = () => { timeSpent(startedAt); go(lesson.unit.id === 'studio' ? 'studio' : lesson.id === 'daily' ? 'home' : 'lessons'); };
    return () => { clearTimeout(cueT); g.destroy(); };
  }};
};

// ---------- first note (onboarding) ----------
// The welcome screen promises a ball going through a hole in a wall, and until
// now the first thing a new user actually did was a sliding warm-up drill. The
// hook has to come first, and it has to be winnable: three notes, a hole twice
// the usual width, no score, no streak, no way to fail. Everything that grades
// you starts after this.
const FIRST_STEPS = [
  'Listen first. The app sings a note, then the wall comes.',
  'Now sing it back on "ah" and hold. Your voice is the ball.',
  'Last one. Hold it steady and let the wall come to you.'
];
screens.first = () => ({ html: `<div class="game-top">
    <span class="eyebrow" style="padding-left:4px">How it works</span>
    <span class="grow"></span>
    <button class="btn ghost" id="skip" style="height:36px;padding:0 12px;font-size:14px">Skip</button>
  </div>
  <div class="banner" id="coach">${esc(FIRST_STEPS[0])}</div>
  <div class="stage">
    <canvas id="cv"></canvas>
    <div class="tuner" id="tuner">Get ready</div>
    <div class="phase" id="phase"></div>
    <div class="toast" id="toast"></div>
  </div>
  <div class="game-bottom">
    <button class="btn secondary" id="hear">${I.speaker} Hear again</button>
  </div>`, mount(root){
  const $ = s => root.querySelector(s);
  const done = () => { S.onboarded = true; save(); go('home', { fresh: true }); };
  const g = new Game($('#cv'), {
    base: S.base,
    tol: 110,                       // roughly a semitone either side: a beginner can hit this
    pace: 1,                        // a demonstration, not a drill: never sped up
    phrases: [0, 4, 7].map((n, i) => ({ kind: 'single', notes: [n], labels: [['Do','Mi','Sol'][i]] })),
    tunerEl: $('#tuner'), phaseEl: $('#phase'), toastEl: $('#toast'),
    onWall(i){ const next = FIRST_STEPS[i + 1]; if (next) $('#coach').textContent = next; },
    onEnd(results){
      const hit = results.filter(w => w.hit).length;
      sheet(`<h1 style="font-size:24px">${hit ? 'That is the whole game' : 'That is the idea'}</h1>
        <p class="muted" style="line-height:1.45">${hit
          ? `You put ${hit === 1 ? 'one note' : `${hit} notes`} through. Lessons work exactly like that, with the holes narrower as you get better.`
          : 'Sing the note back and hold it, and the ball lines up with the hole. The holes are wide while you are learning.'}</p>
        <button class="btn primary" id="on">${hit ? 'Start training' : 'Try the first lesson'}</button>
        <button class="btn ghost" id="redo">Run that again</button>`,
        (bg, close) => {
          bg.querySelector('#on').onclick = () => { close(); done(); };
          bg.querySelector('#redo').onclick = () => { close(); go('first'); };
        });
    }
  });
  $('#hear').onclick = () => g.hearAgain();
  $('#skip').onclick = () => done();
  return () => g.destroy();
}});

// ---------- results ----------
screens.results = ({ lesson, results, extra }) => {
  const xpBefore = S.xp, lvBefore = M.level(xpBefore).level;
  // XP tracks work and accuracy, not raw score: a 45 wall arpeggio should not be
  // worth more than a whole unit just because it has more walls in it.
  const xp = Math.min(400, Math.round(results.length * 4 + (results.filter(w => w.hit).length / Math.max(1, results.length)) * 60));
  const r = recordSession(lesson.id, results, xp);
  const lvAfter = M.level().level, levelled = lvAfter > lvBefore;
  const count = g => results.filter(w => w.grade === g).length;
  const perfect = count('perfect'), great = count('great'), good = count('good'), second = count('second'), missed = results.filter(w => !w.passed).length;
  const stars = r.acc >= 95 ? 3 : r.acc >= 80 ? 2 : r.acc >= 60 ? 1 : 0;
  // Pace moves on the lesson just sung, so the next one is already at the new
  // speed. The banner below is the only place the singer is told, which is why
  // it names the reason rather than just the number.
  const paced = M.paceAfter(results);
  const badges = M.checkBadges({ passedAny: results.some(w => w.passed), bestCombo: extra.bestCombo, perfects: perfect, acc: r.acc, tries: r.tries, cleanRun: lesson.type === 'run' && r.acc === 100 });
  const bySemi = {};
  results.forEach(w => { const b = bySemi[w.semi] || (bySemi[w.semi] = { hits: 0, n: 0, c: [] }); b.n++; if (w.hit) b.hits++; if (w.heard && w.cents != null) b.c.push(w.cents); });
  const chips = Object.keys(bySemi).map(Number).sort((a, b) => a - b).map(s => { const b = bySemi[s]; const avg = b.c.length ? Math.round(b.c.reduce((x, y) => x + y, 0) / b.c.length) : null; return { s, miss: b.hits / b.n < 0.5, avg }; });
  const dx = diagnose(results, r, lesson);
  const nx = lesson.id === 'daily' || lesson.id === 'challenge' ? null : nextAfter(lesson.id);
  const passed = r.acc >= 60;
  const rival = lesson.rival;
  const beat = rival && extra.score > rival.score;
  const star = on => `<svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="${on ? '#ffd166' : 'none'}" stroke="${on ? '#ffd166' : '#3a2f58'}" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>`;
  return { html: `<div class="screen">
    <div class="col" style="align-items:center;gap:6px;text-align:center;margin-top:8px">
      <span class="eyebrow" style="color:${passed ? 'var(--good)' : 'var(--warn)'}">${stars === 3 ? 'Flawless' : passed ? 'Lesson complete' : 'Keep practising'}</span>
      <h1 style="font-size:28px">${esc(lesson.title)}</h1>
      <div class="stars">${[0, 1, 2].map(i => `<span class="${i < stars ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.25}s">${star(i < stars)}</span>`).join('')}</div>
    </div>
    ${rival ? `<div class="note ${beat ? 'good' : ''}">${beat ? I.check : I.info}<div>${beat ? `You beat them by ${(extra.score - rival.score).toLocaleString()}. Send it back and make them try again.` : `They scored ${rival.score.toLocaleString()}. You need ${(rival.score - extra.score + 1).toLocaleString()} more.`}</div></div>` : ''}
    <div class="card col" style="align-items:center;gap:4px;padding:20px 0;border-radius:24px">
      <span class="big" id="bigScore">0</span>
      <span class="muted" style="font-size:15px">${r.acc}% first try · best combo ${extra.bestCombo} · +${xp} XP</span>
      <div class="grades">
        <div><b style="color:#ffd166">${perfect}</b><span>Perfect</span></div>
        <div><b style="color:#5ee39b">${great}</b><span>Great</span></div>
        <div><b style="color:#9fd8ff">${good}</b><span>Good</span></div>
        <div><b style="color:#ffb070">${second}</b><span>2nd try</span></div>
        <div><b style="color:#ff6b78">${missed}</b><span>Missed</span></div>
      </div>
    </div>
    ${levelled ? `<div class="levelup"><b>Level ${lvAfter}</b><span>${M.level().rank}</span></div>` : ''}
    ${paced ? `<div class="levelup pace${paced.up ? '' : ' down'}"><b>${paced.up ? 'Pace up' : 'Pace eased'} · ${esc(paced.label)}</b><span>${paced.up ? 'Walls come faster from here. You were first-try on almost all of that.' : 'Walls come a little slower while you find these again.'}</span></div>` : ''}
    <div class="col"><span class="eyebrow">Note by note</span>
      <div class="notegrid">${chips.map(c => `<div class="${c.miss ? 'miss' : ''}"><b>${solf(c.s, lesson.syl === 'flat' ? 'down' : 'up')}</b><span>${c.avg == null ? 'not heard' : (c.avg > 0 ? '+' : c.avg < 0 ? '−' : '') + Math.abs(c.avg) + 'c'}</span></div>`).join('')}</div>
    </div>
    <div class="coach"><div class="row" style="gap:10px;align-items:flex-start">${I.lungs}<div class="col" style="gap:3px"><b>${esc(dx.title)}</b><span class="small muted" style="line-height:1.45">${esc(dx.text)}</span></div></div></div>
    ${badgeStrip(badges)}
    <div class="grow"></div>
    <div class="col">
      ${nx && passed ? `<button class="btn primary" id="next">Next: ${esc(nx.title)}</button>` : `<button class="btn primary" id="again">Try again</button>`}
      <div class="row" style="gap:10px">
        <button class="btn secondary" id="share">${I.share} Share</button>
        ${nx && passed ? `<button class="btn secondary" id="again">Again</button>` : `<button class="btn secondary" data-go="${lesson.id === 'daily' || lesson.id === 'challenge' ? 'home' : lesson.unit.id === 'studio' ? 'studio' : 'lessons'}">Done</button>`}
      </div>
    </div>
  </div>`, mount(root){
    const n = root.querySelector('#next'); if (n) n.onclick = () => startLesson(nx);
    root.querySelector('#again').onclick = () => startLesson(lesson);
    root.querySelector('#share').onclick = () => shareSheet(lesson, extra, r, stars);
    // A results screen that prints NaN is worse than one that prints 0.
    const el = root.querySelector('#bigScore'); let v = 0; const target = Number(extra.score) || 0;
    const tick = () => { v = Math.min(target, v + Math.max(7, Math.ceil(target / 45))); el.textContent = v.toLocaleString(); if (v < target) requestAnimationFrame(tick); };
    tick();
    for (let i = 0; i < stars; i++) setTimeout(() => { A.chime(72 + i * 4, i === 2 ? 'perfect' : 'great'); A.haptic(i === 2 ? 'perfect' : 'hit'); }, 300 + i * 250);
    if (!stars) A.blip('ok');
    if (stars === 3 || levelled) confetti(root);
  }};
};

// Sharing is the only way this app spreads, so the card is the game, not a stat block,
// and the link sets the friend the exact same notes.
function shareSheet(lesson, extra, r, stars){
  const lv = M.level();
  const card = M.shareCard({ title: lesson.title, score: extra.score, acc: r.acc, stars, streak: streakNow(), rank: 'Lv ' + lv.level });
  const ch = M.makeChallenge(extra.score, lesson.title);
  sheet(`<h1 style="font-size:22px">Send it</h1>
    <img class="sharecard" alt="Your score card" src="${card.toDataURL('image/png')}">
    <button class="btn primary" id="img">${I.share} Share the card</button>
    <button class="btn secondary" id="link">Copy challenge link</button>
    <p class="small muted" style="text-align:center;margin:-4px 0 0">The link gives them the same ten notes and your score to beat.</p>
    <button class="btn ghost" id="close">Close</button>`, (bg, close) => {
    bg.querySelector('#close').onclick = close;
    bg.querySelector('#img').onclick = async () => {
      const out = await M.shareScore(card, `${extra.score.toLocaleString()} on Pitch Pass. Beat it: ${ch.url}`);
      const b = bg.querySelector('#img');
      b.textContent = out === 'saved' ? 'Saved to your files' : out === 'shared' ? 'Sent' : out === 'cancelled' ? 'Share the card' : 'Could not share';
    };
    bg.querySelector('#link').onclick = async () => {
      const b = bg.querySelector('#link');
      try { await navigator.clipboard.writeText(ch.url); b.textContent = 'Link copied'; }
      catch (e) { b.textContent = ch.url.length > 40 ? ch.url.slice(0, 37) + '…' : ch.url; }
    };
  });
}

function confetti(root){
  const cv = document.createElement('canvas'); cv.className = 'confetti'; root.appendChild(cv);
  const W = cv.width = root.clientWidth, H = cv.height = root.clientHeight, c = cv.getContext('2d');
  const cols = ['#ffd166', '#ff8a2a', '#5ee39b', '#9fd8ff', '#f6efe4'];
  const ps = Array.from({ length: 120 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: (Math.random() - .5) * 60, vy: 120 + Math.random() * 160, r: Math.random() * 6, w: 4 + Math.random() * 5, col: cols[Math.floor(Math.random() * cols.length)] }));
  let last = performance.now(), t0 = last;
  const f = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; c.clearRect(0, 0, W, H);
    ps.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 6; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.col; c.fillRect(-p.w / 2, -2, p.w, 4); c.restore(); });
    if (now - t0 < 3500) requestAnimationFrame(f); else cv.remove(); };
  requestAnimationFrame(f);
}

// ---------- warm-up slides ----------
screens.slide = ({ lesson }) => ({ html: `<div class="screen">
    <div class="row">
      <button class="icon-btn" id="quit" aria-label="Quit warm-up">${I.x}</button>
      <div class="col grow" style="gap:0"><b style="font-size:15px">${esc(lesson.title)}</b><span class="small muted">${esc(lesson.sub)}</span></div>
      <span class="chip" id="count">1 of ${lesson.slides.length}</span>
    </div>
    ${A.state.touchMode ? '<div class="banner" style="margin:0">Touch mode: drag up and down to follow the line.</div>' : ''}
    <div class="drill-stage" style="height:300px"><canvas id="cv"></canvas><span class="status" id="status">Listen</span></div>
    <div class="note">${I.lungs}<div>${esc(lesson.cue)}</div></div>
    <div class="card col" style="gap:8px"><div class="row between"><b style="font-size:15px">On the line</b><b id="pct" style="font-size:22px">–</b></div><span class="small muted" id="verdict">Follow the dotted line up and back down in one connected sound.</span></div>
    <div class="grow"></div>
    <button class="btn secondary" id="hear">${I.speaker} Hear the sweep again</button>
  </div>`, mount(root){
    const $ = s => root.querySelector(s);
    const startedAt = performance.now();
    const d = new SlideDrill($('#cv'), {
      base: S.base, slides: lesson.slides, secs: lesson.secs || 5, statusEl: $('#status'),
      onSlide(r, i){
        $('#count').textContent = `${Math.min(i + 2, lesson.slides.length)} of ${lesson.slides.length}`;
        $('#pct').textContent = r.heard ? r.pct + '%' : '–';
        $('#pct').style.color = r.pass ? 'var(--good)' : 'var(--warn)';
        $('#verdict').textContent = !r.heard ? 'Barely heard that one. Keep the sound going the whole way up and down.'
          : r.pass ? 'Connected and even. That is what a warm voice sounds like.'
          : r.pct > 45 ? 'You lost the line in the middle. Slow the slide down and do not let the sound break.'
          : 'Most of that was off the line. Start on the low note, then move without stopping.';
      },
      onEnd(results){ timeSpent(startedAt); markStage('warmup'); go('slideResults', { lesson, results }); },
    });
    window.__pp.drill = d;
    $('#hear').onclick = () => d.replay();
    $('#quit').onclick = () => { timeSpent(startedAt); go('session'); };
    return () => d.destroy();
  }});

screens.slideResults = ({ lesson, results }) => {
  const passed = results.filter(r => r.pass).length, total = results.length;
  const avg = Math.round(results.reduce((s, r) => s + r.pct, 0) / Math.max(1, total));
  const xp = passed * 25 + 25;
  recordHold(lesson.id, passed, total, xp);
  const badges = M.checkBadges({ passedAny: passed > 0 });
  return { html: `<div class="screen">
    <div class="col" style="align-items:center;gap:6px;text-align:center;margin-top:12px"><span class="eyebrow" style="color:var(--good)">Warm-up done</span><h1 style="font-size:30px">${esc(lesson.title)}</h1></div>
    <div class="card col" style="align-items:center;gap:4px;padding:24px 0;border-radius:24px"><span class="big">${avg}<span style="font-size:36px;color:var(--muted)">%</span></span><span class="muted">on the line · ${passed} of ${total} clean · +${xp} XP</span></div>
    <div class="note">${I.lungs}<div>Your voice is warm for the next 45 minutes. Good time to work on runs or held notes.</div></div>
    ${badgeStrip(badges)}
    <div class="grow"></div>
    <div class="col"><button class="btn primary" data-go="session">Next stage</button><button class="btn ghost" id="again">Warm up again</button></div>
  </div>`, mount(root){ root.querySelector('#again').onclick = () => startLesson(lesson, { skipWarm: true }); A.blip('big'); } };
};

function badgeStrip(badges){
  if (!badges || !badges.length) return '';
  return `<div class="col" style="gap:8px"><span class="eyebrow">New badge${badges.length > 1 ? 's' : ''}</span>
    ${badges.map(b => `<div class="item" style="background:var(--s2)"><span class="badge" style="background:rgba(255,209,102,.16);color:#ffd166">${I.badge}</span><span class="col"><b>${b.title}</b><span class="sub">${b.hint}</span></span></div>`).join('')}</div>`;
}

// ---------- rehearsal instrument ----------
function instrumentSheet(after){
  const rows = Object.entries(A.INSTRUMENTS).map(([k, v]) => {
    const locked = v.pro && !S.pro;
    return `<button class="plan ${S.instrument === k ? 'on' : ''}" data-ins="${k}" ${locked ? 'data-locked="1"' : ''}>
      <span class="radio"></span>
      <span class="col grow" style="gap:2px"><b>${v.name}</b><span class="small muted">${v.sub}</span></span>
      ${locked ? '<span class="pro">PRO</span>' : ''}</button>`;
  }).join('');
  sheet(`<h1 style="font-size:22px">Rehearsal instrument</h1>
    <p class="small muted" style="margin:-6px 0 0">What plays the reference notes and the chords underneath you. Piano and guitar comp the chord instead of holding it.</p>
    <div class="col" style="gap:8px">${rows}</div>
    <button class="btn ghost" id="close">Close</button>`, (bg, close) => {
    bg.querySelector('#close').onclick = close;
    bg.querySelectorAll('[data-ins]').forEach(b => b.onclick = () => {
      if (b.dataset.locked) { close(); return go('paywall'); }
      S.instrument = b.dataset.ins; A.state.instrument = b.dataset.ins; save();
      A.ctx(); A.playPhrase([S.base, S.base + 4, S.base + 7], 0.26);
      bg.querySelectorAll('[data-ins]').forEach(x => x.classList.toggle('on', x === b));
      if (after) setTimeout(() => { close(); after(); }, 420);
    });
  });
}

// ---------- harmony holds ----------
screens.harmony = ({ lesson }) => ({ html: `<div class="screen">
    <div class="row">
      <button class="icon-btn" id="quit" aria-label="Quit drill">${I.x}</button>
      <div class="col grow" style="gap:0"><b style="font-size:15px">${esc(lesson.title)}</b><span class="small muted">${esc(lesson.sub)}</span></div>
      <span class="chip" id="count">1 of ${lesson.rounds.length}</span>
    </div>
    <div class="row" style="gap:8px">
      <button class="chip" id="ins" style="gap:8px"><span class="muted small">Chord</span><b>${A.INSTRUMENTS[A.state.instrument].name}</b></button>
      ${A.state.touchMode ? '<span class="small muted">Touch mode: drag to hold your line.</span>' : '<span class="small muted">Speakers are fine. The chord is filtered out of what you sing.</span>'}
    </div>
    <div class="drill-stage" style="height:300px"><canvas id="cv"></canvas><span class="status" id="status">Listen</span></div>
    <div class="grid3">
      <div class="stat metric"><span class="small muted">Centre</span><b id="m_centre">–<small> c</small></b><em class="muted" id="t_centre">on the note</em></div>
      <div class="stat metric"><span class="small muted">Steady</span><b id="m_sd">–<small> c</small></b><em class="muted" id="t_sd">under 20</em></div>
      <div class="stat metric"><span class="small muted" id="l_third">${lesson.rounds.some(r => r[3]) ? 'Pulled' : 'Held'}</span><b id="m_third">–<small>${lesson.rounds.some(r => r[3]) ? ' c' : '%'}</small></b><em class="muted" id="t_third">${lesson.rounds.some(r => r[3]) ? 'under 30' : 'over 70'}</em></div>
    </div>
    <div class="note">${I.info}<div id="tip">Your note sits inside the chord. Keep it exactly where it was when the chord changes, and let the harmony move around you.</div></div>
    <div class="grow"></div>
    <button class="btn secondary" id="hear">${I.speaker} Hear the chord again</button>
  </div>`, mount(root){
    const $ = s => root.querySelector(s);
    const startedAt = performance.now();
    const changing = lesson.rounds.some(r => r[3]);
    const d = new HarmonyDrill($('#cv'), {
      base: S.base, tol: S.tol, rounds: lesson.rounds, secs: lesson.secs, statusEl: $('#status'),
      onRound(r, i){
        $('#count').textContent = `${Math.min(i + 2, lesson.rounds.length)} of ${lesson.rounds.length}`;
        if (!r.heard) { $('#tip').textContent = 'Not enough of that hold was heard. Come in as soon as the chord starts and keep the sound going.'; ['centre','sd','third'].forEach(k => { $('#m_' + k).innerHTML = '–'; }); return; }
        const set = (k, v, u, ok) => { $('#m_' + k).innerHTML = `${v}<small> ${u}</small>`; $('#t_' + k).className = ok ? 'ok' : 'no'; };
        set('centre', (r.centre > 0 ? '+' : '') + r.centre, 'c', Math.abs(r.centre) <= S.tol);
        set('sd', r.sd, 'c', r.sd <= 20);
        if (changing) set('third', (r.pull > 0 ? '+' : '') + r.pull, 'c', r.pull <= 30);
        else set('third', r.held, '%', r.held >= 70);
        $('#tip').textContent = r.pass ? `Clean. You held the ${r.deg} without being dragged off it.`
          : changing && r.pull > 30 ? `The chord pulled you ${r.pull} cents when it changed. Your note did not move, so do not let it.`
          : r.sd > 20 ? 'The note wandered. Steady air, and stop listening to the chord for a second.'
          : Math.abs(r.centre) > S.tol ? `You sat ${Math.abs(r.centre)} cents ${r.centre > 0 ? 'above' : 'below'} the ${r.deg}. Match the single note at the start before the chord comes in.`
          : 'Close. Hold it a little longer inside the band next time.';
      },
      onEnd(results){ timeSpent(startedAt); markStage('control'); go('harmonyResults', { lesson, results }); },
    });
    window.__pp.drill = d;
    $('#ins').onclick = () => instrumentSheet(() => go('harmony', { lesson }));
    $('#hear').onclick = () => d.replay();
    $('#quit').onclick = () => { timeSpent(startedAt); go('studio'); };
    return () => d.destroy();
  }});

screens.harmonyResults = ({ lesson, results }) => {
  const passed = results.filter(r => r.pass).length, total = results.length;
  const acc = recordHold(lesson.id, passed, total, passed * 30);
  const badges = M.checkBadges({ passedAny: passed > 0 });
  const changing = lesson.rounds.some(r => r[3]);
  return { html: `<div class="screen">
    <div class="col" style="align-items:center;gap:6px;text-align:center;margin-top:12px"><span class="eyebrow" style="color:${acc >= 60 ? 'var(--good)' : 'var(--warn)'}">${acc >= 60 ? 'Drill complete' : 'Keep practising'}</span><h1 style="font-size:30px">${esc(lesson.title)}</h1></div>
    <div class="card col" style="align-items:center;gap:4px;padding:24px 0;border-radius:24px"><span class="big">${passed}<span style="font-size:36px;color:var(--muted)">/${total}</span></span><span class="muted">holds inside the chord · +${passed * 30} XP</span></div>
    <div class="list">${results.map((r, i) => `<div class="item"><span class="badge ${r.pass ? 'done' : ''}">${r.pass ? I.check : i + 1}</span><span class="col grow"><b>${r.heard ? esc(r.deg + ' of ' + r.chord.toLowerCase()) : 'Round ' + (i + 1)}</b><span class="sub">${!r.heard ? 'Not heard' : `centre ${r.centre > 0 ? '+' : ''}${r.centre}c · steady ${r.sd}c · ${changing ? `pulled ${r.pull}c` : `held ${r.held}%`}`}</span></span></div>`).join('')}</div>
    ${badgeStrip(badges)}
    <div class="grow"></div>
    <div class="col"><button class="btn primary" id="again">Try again</button><button class="btn ghost" data-go="studio">Done</button></div>
  </div>`, mount(root){ root.querySelector('#again').onclick = () => startLesson(lesson); A.blip(acc >= 60 ? 'big' : 'ok'); } };
};

// ---------- drills ----------
screens.drill = ({ lesson }) => {
  const vib = lesson.mode === 'vibrato';
  const tiles = vib ? [['rate','Rate','Hz','target 5 to 7'],['width','Width','c','target 25 to 60'],['centre','Centre','c','on pitch']] : [['wobble','Wobble','c','under 15'],['drift','Drift','c','under 25'],['centre','Centre','c','on pitch']];
  return { html: `<div class="screen">
    <div class="row">
      <button class="icon-btn" id="quit" aria-label="Quit drill">${I.x}</button>
      <div class="col grow" style="gap:0"><b style="font-size:15px">${esc(lesson.title)}</b><span class="small muted">${vib ? 'Hold the note and let it wobble evenly' : 'Hold the note dead straight'}</span></div>
      <span class="chip" id="count">1 of ${lesson.notes.length}</span>
    </div>
    ${A.state.touchMode ? `<div class="banner" style="margin:0">Touch mode: drag up and down inside the box to draw your pitch.</div>` : ''}
    <div class="drill-stage"><canvas id="cv"></canvas><span class="status" id="status">Listen</span></div>
    <div class="grid3">${tiles.map(([k, l, u, t]) => `<div class="stat metric"><span class="small muted">${l}</span><b id="m_${k}">–<small> ${u}</small></b><em class="muted" id="t_${k}">${t}</em></div>`).join('')}</div>
    <div class="note">${I.info}<div id="tip">${vib ? 'Start straight, then let the wobble in. The middle of the wave should sit on the note, not above it.' : 'Breathe low, then hold the note without letting it sag or creep up. No vibrato for this one.'}</div></div>
    <div class="grow"></div>
    <button class="btn secondary" id="hear">${I.speaker} Hear the note again</button>
  </div>`, mount(root){
    const $ = s => root.querySelector(s);
    const startedAt = performance.now();
    const d = new HoldDrill($('#cv'), {
      base: S.base, tol: S.tol, mode: lesson.mode, notes: lesson.notes, statusEl: $('#status'),
      onHold(r, i){
        $('#count').textContent = `${Math.min(i + 2, lesson.notes.length)} of ${lesson.notes.length}`;
        if (!r.heard) { $('#tip').textContent = "Didn't hear enough of the hold. Start singing right after the reference and keep going for 4 seconds."; tiles.forEach(([k]) => { $('#m_' + k).innerHTML = '–'; }); return; }
        const set = (k, v, u, ok) => { $('#m_' + k).innerHTML = `${v}<small> ${u}</small>`; $('#t_' + k).className = ok ? 'ok' : 'no'; };
        if (vib) { set('rate', r.rate, 'Hz', r.rate >= 4.5 && r.rate <= 7.5); set('width', '±' + r.width, 'c', r.width >= 20 && r.width <= 80); }
        else { set('wobble', r.wobble, 'c', r.wobble <= 15); set('drift', (r.drift > 0 ? '+' : '') + r.drift, 'c', Math.abs(r.drift) <= 25); }
        set('centre', (r.centre > 0 ? '+' : '') + r.centre, 'c', Math.abs(r.centre) <= S.tol);
        $('#tip').textContent = r.pass ? 'That one counts. Next note coming up.' : vib
          ? (r.rate < 4.5 ? 'The wobble is too slow or missing. Let it pulse a bit faster and more evenly.' : r.rate > 7.5 ? 'That wobble is fast and tight. Relax your throat and let it slow down.' : r.width < 20 ? 'Good speed, but it is too narrow. Let the pitch swing a little wider.' : r.width > 80 ? 'The swing is very wide. Keep it closer to the note.' : `Your centre drifted ${r.centre > 0 ? 'sharp' : 'flat'}. Keep the middle of the wave on the note.`)
          : (r.wobble > 15 ? 'Too much wobble. Keep the air steady and the note straight.' : Math.abs(r.drift) > 25 ? `The note ${r.drift > 0 ? 'crept up' : 'sagged'} as you held it. Keep your support all the way through.` : `You held it ${r.centre > 0 ? 'sharp' : 'flat'}. Match the reference before you settle.`);
      },
      onEnd(results){ timeSpent(startedAt); markStage('control'); go('drillResults', { lesson, results }); },
    });
    window.__pp.drill = d;
    $('#hear').onclick = () => d.replay();
    $('#quit').onclick = () => { timeSpent(startedAt); go('studio'); };
    return () => d.destroy();
  }};
};
screens.drillResults = ({ lesson, results }) => {
  const passed = results.filter(r => r.pass).length, total = results.length;
  const acc = recordHold(lesson.id, passed, total, passed * 20);
  const badges = M.checkBadges({ passedAny: passed > 0, vibratoPasses: lesson.mode === 'vibrato' ? passed : 0 });
  return { html: `<div class="screen">
    <div class="col" style="align-items:center;gap:6px;text-align:center;margin-top:12px"><span class="eyebrow" style="color:${acc >= 60 ? 'var(--good)' : 'var(--warn)'}">${acc >= 60 ? 'Drill complete' : 'Keep practising'}</span><h1 style="font-size:30px">${esc(lesson.title)}</h1></div>
    <div class="card col" style="align-items:center;gap:4px;padding:24px 0;border-radius:24px"><span class="big">${passed}<span style="font-size:36px;color:var(--muted)">/${total}</span></span><span class="muted">holds passed · +${passed * 20} XP</span></div>
    <div class="list">${results.map((r, i) => `<div class="item"><span class="badge ${r.pass ? 'done' : ''}">${r.pass ? I.check : i + 1}</span><span class="col"><b>${solf(lesson.notes[i], 'up')}</b><span class="sub">${!r.heard ? 'Not heard' : lesson.mode === 'vibrato' ? `${r.rate} Hz · ±${r.width}c · centre ${r.centre > 0 ? '+' : ''}${r.centre}c` : `wobble ${r.wobble}c · drift ${r.drift > 0 ? '+' : ''}${r.drift}c · centre ${r.centre > 0 ? '+' : ''}${r.centre}c`}</span></span></div>`).join('')}</div>
    ${badgeStrip(badges)}
    <div class="grow"></div>
    <div class="col"><button class="btn primary" id="again">Try again</button><button class="btn ghost" data-go="studio">Done</button></div>
  </div>`, mount(root){ root.querySelector('#again').onclick = () => startLesson(lesson); A.blip(acc >= 60 ? 'big' : 'ok'); } };
};

// ---------- progress ----------
screens.progress = (p = {}) => {
  const all = p.all && S.pro;
  const st = stats(all ? null : 7);
  const semis = [0,2,4,5,7,9,11].concat([1,3,6,8,10].filter(s => S.notes[s]));
  const rows = semis.filter(s => S.notes[s] && S.notes[s].tries).map(s => { const n = S.notes[s]; const a = Math.round(n.hits / n.tries * 100); return `<div class="hbar"><span>${solf(s, [3,8,10].includes(s) ? 'down' : 'up')}</span><span class="track"><i style="width:${a}%;background:${a >= 80 ? 'var(--good)' : a >= 60 ? 'var(--warn)' : 'var(--bad)'}"></i></span><span>${a}%</span></div>`; }).join('');
  const tend = st.cents, pos = Math.max(4, Math.min(96, 50 + tend));
  return { html: `<div class="screen tabbed">
    <div class="row between"><h1>Progress</h1><button class="icon-btn" data-go="settings" aria-label="Settings">${I.gear}</button></div>
    <div class="seg"><button class="${all ? '' : 'on'}" data-go="progress">7 days</button><button class="${all ? 'on' : ''}" id="allTime">All time ${S.pro ? '' : I.lock}</button></div>
    <div class="grid3">
      <div class="stat"><b>${st.acc == null ? '–' : st.acc + '%'}</b><span>accuracy</span></div>
      <div class="stat"><b>${streakNow()}</b><span>day streak</span></div>
      <div class="stat"><b>${st.notes}</b><span>notes sung</span></div>
    </div>
    <div class="card col" style="gap:10px"><b style="font-size:16px">Accuracy by note</b>${rows || '<span class="small muted">Finish a lesson to see how each note is going.</span>'}</div>
    <div class="card col" style="gap:10px">
      <div class="row between"><b style="font-size:16px">Your tendency</b><span class="small" style="color:var(--accent);font-weight:700">${st.acc == null ? '–' : Math.abs(tend) < 8 ? 'On pitch' : tend > 0 ? 'Slightly sharp' : 'Slightly flat'}</span></div>
      <div style="position:relative;height:28px"><div style="position:absolute;left:0;right:0;top:12px;height:4px;border-radius:2px;background:var(--s2)"></div><div style="position:absolute;left:50%;top:4px;width:2px;height:20px;background:var(--muted)"></div><div style="position:absolute;left:${pos}%;top:4px;width:20px;height:20px;margin-left:-10px;border-radius:50%;background:var(--ball)"></div></div>
      <div class="row between small muted"><span>Flat</span><span>On pitch</span><span>Sharp</span></div>
    </div>
    <div class="row between small muted"><span>Total XP</span><b style="color:var(--ink)">${S.xp}</b></div>
  </div>${tabbar('progress')}`, mount(root){ root.querySelector('#allTime').onclick = () => S.pro ? go('progress', { all: true }) : go('paywall'); } };
};

// ---------- badges ----------
screens.badges = () => {
  const lv = M.level(), ids = Object.keys(M.BADGES);
  const got = ids.filter(id => S.badges[id]);
  return { html: `<div class="screen">
    <div class="row"><button class="icon-btn" data-go="home" aria-label="Back">${I.back}</button><h1 style="font-size:26px">Badges</h1></div>
    <div class="card col" style="gap:6px">
      <div class="row between"><b style="font-size:16px">Lv ${lv.level} · ${lv.rank}</b><span class="small muted">${S.xp.toLocaleString()} XP</span></div>
      <span class="xpbar"><i style="width:${Math.round(lv.pct * 100)}%"></i></span>
      <span class="small muted">${lv.need - lv.into} XP to level ${lv.level + 1}</span>
    </div>
    <div class="row between"><span class="eyebrow">Earned</span><span class="small muted">${got.length} of ${ids.length}</span></div>
    <div class="grid2">${ids.map(id => { const b = M.BADGES[id], on = S.badges[id];
      return `<div class="tile ${on ? '' : 'soon'}" style="${on ? 'border-color:rgba(255,209,102,.45)' : ''}">
        <span style="color:${on ? '#ffd166' : 'var(--muted)'}">${I.badge}</span><b>${b.title}</b><span>${on ? 'Earned ' + on : b.hint}</span></div>`; }).join('')}</div>
  </div>` };
};

// ---------- settings ----------
screens.settings = () => ({ html: `<div class="screen">
  <div class="row"><button class="icon-btn" data-go="progress" aria-label="Back">${I.back}</button><h1 style="font-size:26px">Settings</h1></div>
  <div class="col"><span class="eyebrow">Voice range</span>
    <div class="card row between"><div class="col" style="gap:2px"><b>Do = ${A.noteName(S.base)}</b><span class="small muted">${S.range ? `Measured ${A.noteName(S.range.low)} to ${A.noteName(S.range.high)}` : 'Picked manually'}</span></div><button class="chip" id="redo">Redo</button></div>
  </div>
  <div class="col"><span class="eyebrow">Hole size</span>
    <div class="seg" id="tol">${[[50,'Easy','±50c'],[30,'Trained','±30c'],[15,'Perfect','±15c Pro']].map(([v, l, s]) => `<button data-v="${v}" class="${S.tol === v ? 'on' : ''}">${l}<small>${s}</small></button>`).join('')}</div>
  </div>
  <div class="col"><span class="eyebrow">Input</span>
    <div class="seg" id="input"><button data-v="mic" class="${S.inputMode !== 'touch' ? 'on' : ''}">Microphone</button><button data-v="touch" class="${S.inputMode === 'touch' ? 'on' : ''}">Touch</button></div>
  </div>
  <div class="col"><span class="eyebrow">Pace</span>
    <div class="card row between"><div class="col" style="gap:2px"><b>${M.paceLabel()}</b><span class="small muted">${S.pace === 1 ? 'Moves up on its own after two clean lessons' : `Walls at ${Math.round(S.pace * 100)}% speed. Moves on its own as you improve.`}</span></div>
      <div class="row" style="gap:6px"><button class="chip" id="slower">Slower</button><button class="chip" id="faster">Faster</button></div></div>
  </div>
  <div class="col"><span class="eyebrow">Daily goal</span>
    <div class="seg" id="goal">${[5, 10, 20].map(v => `<button data-v="${v}" class="${S.goalMin === v ? 'on' : ''}">${v} min<small>${v === 5 ? 'busy day' : v === 10 ? 'steady' : 'serious'}</small></button>`).join('')}</div>
  </div>
  <div class="col"><span class="eyebrow">Rehearsal instrument</span>
    <div class="card row between"><div class="col" style="gap:2px"><b>${A.INSTRUMENTS[A.state.instrument].name}</b><span class="small muted">${A.INSTRUMENTS[A.state.instrument].sub}</span></div><button class="chip" id="ins">Change</button></div>
  </div>
  <div class="col"><span class="eyebrow">Practice reminder</span>
    <div class="card row between"><div class="col" style="gap:2px"><b>${S.reminder ? 'Every day at ' + S.reminder : 'Off'}</b><span class="small muted">${S.reminder ? 'A nudge on the days you forget' : 'Pick a time you are usually free'}</span></div><button class="chip" id="rem">${S.reminder ? 'Change' : 'Set'}</button></div>
  </div>
  <div class="col"><span class="eyebrow">Pro</span>
    <div class="card row between"><div class="col" style="gap:2px"><b>${S.pro ? 'Pro preview is on' : 'Free plan'}</b><span class="small muted">${S.pro ? 'Testing only. Real purchases come with the store apps.' : 'Unlock Studio, units 2 to 4 and Perfect mode'}</span></div><button class="chip" id="pro">${S.pro ? 'Turn off' : 'See Pro'}</button></div>
  </div>
  <div class="col"><span class="eyebrow">Testing</span>
    <div class="card col" style="gap:12px">
      <div class="row between"><div class="col" style="gap:2px"><b>Invite someone</b><span class="small muted">Sends the link to open it in a browser</span></div><button class="chip" id="invite">Share</button></div>
      ${FEEDBACK_URL ? `<div class="row between"><div class="col" style="gap:2px"><b>Report a problem</b><span class="small muted">Say what you did and what happened</span></div><a class="chip" href="${FEEDBACK_URL}" target="_blank" rel="noopener">Open</a></div>` : ''}
      <div class="row between"><span class="small muted">Build</span><span class="small muted">${esc(VERSION)}</span></div>
    </div>
  </div>
  <div class="grow"></div>
  <button class="btn ghost" id="reset" style="color:var(--bad)">Reset all progress</button>
  <p class="small muted" style="text-align:center">Pitch Pass reads your pitch on this device. Nothing is recorded or uploaded. <a href="${PRIVACY_URL}" target="_blank" rel="noopener">Privacy policy</a></p>
</div>`, mount(root){
  root.querySelector('#redo').onclick = async () => { A.ctx(); const ok = S.inputMode === 'touch' ? false : await A.startMic(); go('range', { manual: !ok, fromSettings: true }); };
  root.querySelectorAll('#tol button').forEach(b => b.onclick = () => { const v = +b.dataset.v; if (v === 15 && !S.pro) return go('paywall'); S.tol = v; save(); go('settings'); });
  root.querySelectorAll('#input button').forEach(b => b.onclick = async () => { S.inputMode = b.dataset.v; save(); if (b.dataset.v === 'touch') { A.state.touchMode = true; } else { A.ctx(); const ok = await A.startMic(); A.state.touchMode = !ok; } go('settings'); });
  root.querySelectorAll('#goal button').forEach(b => b.onclick = () => { S.goalMin = +b.dataset.v; save(); go('settings'); });
  root.querySelector('#ins').onclick = () => instrumentSheet(() => go('settings'));
  root.querySelector('#rem').onclick = () => sheet(`<h1 style="font-size:22px">Remind me to sing</h1>
    <div class="col" style="gap:8px">${['07:30', '12:30', '18:00', '20:30'].map(t => `<button class="plan ${S.reminder === t ? 'on' : ''}" data-t="${t}"><span class="radio"></span><b>${t}</b></button>`).join('')}</div>
    <p class="small muted" id="remNote" style="text-align:center">${window.Capacitor ? 'Your phone will nudge you once a day.' : 'In the browser this is saved as a preference. The phone app sends the actual reminder.'}</p>
    <button class="btn ghost" id="off">Turn reminders off</button>`, (bg, close) => {
      bg.querySelectorAll('[data-t]').forEach(b => b.onclick = async () => { await M.setReminder(b.dataset.t); close(); go('settings'); });
      bg.querySelector('#off').onclick = async () => { await M.setReminder(null); close(); go('settings'); };
    });
  root.querySelector('#pro').onclick = () => { if (S.pro) { S.pro = false; if (S.tol === 15) S.tol = 30;
    if (A.INSTRUMENTS[S.instrument] && A.INSTRUMENTS[S.instrument].pro) { S.instrument = 'voice'; A.state.instrument = 'voice'; }
    save(); go('settings'); } else go('paywall'); };
  const nudge = d => { S.pace = Math.max(M.PACE_MIN, Math.min(M.PACE_MAX, +(S.pace + d).toFixed(2))); S.paceWins = 0; save(); go('settings'); };
  root.querySelector('#slower').onclick = () => nudge(-M.PACE_STEP);
  root.querySelector('#faster').onclick = () => nudge(M.PACE_STEP);
  root.querySelector('#invite').onclick = async e => {
    const btn = e.currentTarget, r = await M.shareApp();
    if (r === 'copied' || r === 'failed') {
      btn.textContent = r === 'copied' ? 'Copied' : 'No luck';
      setTimeout(() => { btn.textContent = 'Share'; }, 1600);
    }
  };
  root.querySelector('#reset').onclick = () => sheet(`<h1 style="font-size:24px">Reset everything?</h1><p class="muted">This clears your streak, lesson progress, stats and voice range.</p><button class="btn primary" id="yes" style="background:var(--bad)">Reset</button><button class="btn ghost" id="no">Cancel</button>`, (bg, close) => { bg.querySelector('#no').onclick = close; bg.querySelector('#yes').onclick = () => { close(); reset(); go('welcome'); }; });
}});

// ---------- paywall ----------
screens.paywall = () => ({ html: `<div class="screen" style="gap:14px">
  <div class="row" style="justify-content:flex-end"><button class="icon-btn" data-go="home" aria-label="Close">${I.x}</button></div>
  <div class="col" style="gap:10px"><span class="pro" style="align-self:flex-start;font-size:12px;padding:5px 10px">PRO</span><h1>From in tune to riffing clean</h1></div>
  <div class="col" style="gap:12px">
    ${[['Chord lab.','Arpeggios, chord tones, and holding a line while the harmony moves.'],['Riffs and runs.','Melisma drills that speed up as you get cleaner.'],['Minor and chromatic.','Me, Le and Te. Every one of the twelve notes.'],['Rehearse with a band.','Piano, guitar, strings or organ instead of a plain tone.'],['Perfect mode.','The hole shrinks to ±15 cents, with full history.']].map(([b, t]) => `<div class="check">${I.check}<div><b>${b}</b> <span class="muted">${t}</span></div></div>`).join('')}
  </div>
  <p class="small muted" style="margin-top:-2px">${PRICE.region.worth}</p>
  <div class="grow"></div>
  <div class="col" style="gap:10px" id="plans">
    ${PRICE.region.plans.map((p, i) => `<button class="plan${i ? '' : ' on'}" data-plan="${p.id}"><span class="radio"></span><span class="col" style="gap:2px"><b>${p.name}</b><span class="small muted">${PRICE.money(p.amount)} ${p.per}${p.note ? ` · ${p.note}` : ''}</span></span>${p.tag ? `<span class="tag">${p.tag}</span>` : ''}</button>`).join('')}
  </div>
  <button class="btn primary" id="buy">${buyLabel(PRICE.region.plans[0])}</button>
  <p class="small muted" style="text-align:center;margin-top:-6px" id="fine">${finePrint(PRICE.region.plans[0])}</p>
  ${PRICE.region.pay ? `<p class="small muted" style="text-align:center;margin-top:-4px;opacity:.72">${PRICE.region.pay}</p>` : ''}
</div>`, mount(root){
  let plan = PRICE.region.plans[0].id;
  root.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => {
    plan = b.dataset.plan;
    const p = PRICE.planById(plan);
    root.querySelectorAll('[data-plan]').forEach(x => x.classList.toggle('on', x === b));
    root.querySelector('#buy').textContent = buyLabel(p);
    root.querySelector('#fine').textContent = finePrint(p);
  });
  root.querySelector('#buy').onclick = () => {
    if (window.PitchPassBilling) return window.PitchPassBilling.purchase(plan).then(ok => { if (ok) { S.pro = true; save(); go('studio'); } });
    if (!ALLOW_PRO_PREVIEW) return sheet(`<h1 style="font-size:24px">Purchases aren't ready yet</h1><p class="muted">Pro will be available to buy in the next update.</p><button class="btn primary" id="no">OK</button>`, (bg, close) => { bg.querySelector('#no').onclick = close; });
    sheet(`<h1 style="font-size:24px">Payments open with the store apps</h1><p class="muted" style="line-height:1.45">Subscriptions will run through the App Store and Google Play. While you test, you can turn on a free Pro preview on this device.</p><button class="btn primary" id="on">Turn on Pro preview</button><button class="btn ghost" id="no">Not now</button>`, (bg, close) => { bg.querySelector('#no').onclick = close; bg.querySelector('#on').onclick = () => { close(); S.pro = true; save(); go('studio'); }; });
  };
}});

// ---------- boot ----------
if (S.inputMode === 'touch') A.state.touchMode = true;
A.state.instrument = S.pro && A.INSTRUMENTS[S.instrument] ? S.instrument : 'voice';
go(S.onboarded ? 'home' : 'welcome');
window.addEventListener('hashchange', () => { if (M.readChallenge() && S.onboarded) go('home'); });
window.__pp = { go, S, A, M, save, Game, findLesson, buildPhrases };   // handles for tests and the console
