// Pitch Pass app shell: screens, navigation and flow.
import * as A from './audio.js';
import { S, save, reset, dayKey, streakNow, recordSession, recordHold, stats, weekBars } from './store.js';
import { UNITS, STUDIO, TECHNIQUE, SOLF, SCALE, findLesson, dailyLesson, buildPhrases } from './content.js';
import { Game } from './game.js';
import { HoldDrill } from './drill.js';
import { ALLOW_PRO_PREVIEW, PRIVACY_URL } from './config.js';

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
  const seqs = [...UNITS.map(u => u.lessons.map(l => l.id)), STUDIO.map(l => l.id)];
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

function startLesson(lesson){
  if (!lessonOpen(lesson)) return go('paywall');
  A.ctx();
  ensureInput().then(() => go(lesson.type === 'hold' ? 'drill' : 'game', { lesson }));
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
    if (ok) { S.inputMode = 'mic'; save(); go('range'); }
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
    <div class="col" style="gap:10px"><h1>Pick your range</h1><p class="lead">Choose where Do sits for your voice. You can run the singing check later in Settings.</p></div>
    <div class="col" style="gap:10px">
      ${RANGE_OPTS.map(o => `<button class="plan ${S.base === o.base ? 'on' : ''}" data-base="${o.base}"><span class="radio"></span><div class="col" style="gap:2px"><b>${o.label}</b><span class="small muted">${o.sub}${o.base === 48 ? ', most men' : o.base === 60 ? ', most women and kids' : ''}</span></div></button>`).join('')}
    </div>
    <div class="grow"></div>
    <button class="btn primary" id="done">Continue</button>
  </div>`, mount(root){
    root.querySelectorAll('[data-base]').forEach(b => b.onclick = () => { S.base = +b.dataset.base; save(); root.querySelectorAll('[data-base]').forEach(x => x.classList.toggle('on', x === b)); });
    root.querySelector('#done').onclick = () => { S.onboarded = true; save(); go(fromSettings ? 'settings' : 'home'); };
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
  </div>`, mount(root){
    const $ = s => root.querySelector(s);
    const tr = new A.PitchTracker();
    let step = 'low', voiced = [], lo = null, hi = null, raf, last = performance.now(), stepAt = performance.now();
    const LOW_M = 36, HIGH_M = 84;
    const yOf = m => Math.max(2, Math.min(92, (HIGH_M - m) / (HIGH_M - LOW_M) * 100));
    const finish = () => {
      step = 'done';
      const base = baseFromRange(lo, hi);
      S.range = { low: Math.round(lo), high: Math.round(hi) }; S.base = base; save();
      $('#result').hidden = false;
      $('#resultText').innerHTML = `Your range: <b>${A.noteName(lo)}</b> to <b>${A.noteName(hi)}</b>. Lessons will start with Do on <b>${A.noteName(base)}</b>.`;
      $('#again').hidden = false; $('#ok').hidden = false;
      $('#ask').textContent = 'Got it. You can redo this any time in Settings.';
      $('#hint').textContent = '';
      const band = $('#band'); band.style.display = 'block'; band.style.top = yOf(hi) + '%'; band.style.bottom = (100 - yOf(lo)) + '%';
    };
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const v = tr.update(now, dt, null, false);
      if (v != null) {
        $('#now').textContent = A.noteName(v);
        $('#mball').style.top = `calc(${yOf(v)}% - 15px)`;
        if (step === 'low' || step === 'high') {
          voiced.push(v);
          $('#hint').textContent = 'Hold it…';
          if (voiced.length > 45) {
            const sorted = [...voiced].sort((a, b) => a - b);
            const val = sorted[Math.floor(sorted.length * (step === 'low' ? 0.2 : 0.8))];
            if (step === 'low') { lo = val; $('#lo').textContent = A.noteName(lo); step = 'gap'; stepAt = now; voiced = []; $('#ask').textContent = 'Nice. Now slide up to your highest comfortable note and hold it.'; $('#hint').textContent = 'Breathe, then sing high'; }
            else { hi = val; $('#hi').textContent = A.noteName(hi); if (hi - lo < 5) { step = 'high'; voiced = []; $('#ask').textContent = 'That was close to your low note. Try going higher.'; } else finish(); }
          }
        }
      } else if (step === 'low' || step === 'high') { if (voiced.length && voiced.length < 20) voiced = []; }
      if (step === 'gap' && now - stepAt > 900) step = 'high';
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    $('#again').onclick = () => { step = 'low'; voiced = []; lo = hi = null; ['#lo','#hi'].forEach(s => $(s).textContent = '–'); $('#result').hidden = true; $('#again').hidden = true; $('#ok').hidden = true; $('#band').style.display = 'none'; $('#ask').textContent = 'Sing "ah" as low as feels easy and hold it.'; };
    $('#ok').onclick = () => { S.onboarded = true; save(); go(fromSettings ? 'settings' : 'home'); };
    $('#pick').onclick = () => go('range', { manual: true, fromSettings });
    return () => cancelAnimationFrame(raf);
  }};
};

// ---------- home ----------
screens.home = () => {
  const today = dayKey(), dailyDone = S.daily === today, nx = nextUnit1(), st = streakNow();
  const week = weekBars(), ws = stats(7);
  const unitDone = UNITS[0].lessons.filter(l => S.done[l.id]).length;
  const nxIdx = UNITS[0].lessons.indexOf(nx) + 1;
  return { html: `<div class="screen tabbed">
    <div class="row between">
      <div class="col" style="gap:2px"><span class="muted small">${greet()}</span><span style="font-weight:800;font-size:26px;letter-spacing:-.02em">Ready to sing?</span></div>
      <span class="chip" aria-label="${st} day streak">${I.flame}${st}</span>
    </div>
    <button class="daily" id="daily">
      <span class="w1"></span><span class="w2"></span>
      <span class="eyebrow" style="color:var(--accent-ink)">Daily challenge</span>
      <span class="col" style="gap:4px;max-width:230px"><span style="font-weight:800;font-size:26px;line-height:1.05;letter-spacing:-.02em">${dailyDone ? 'Done for today' : '10 walls, mixed notes'}</span><span style="font-size:14px;opacity:.8">${dailyDone ? 'Play again for practice. New set tomorrow.' : 'About 3 minutes. Keep your streak alive.'}</span></span>
      <span class="play">${I.play} ${dailyDone ? 'Play again' : "Play today's set"}</span>
    </button>
    <div class="col">
      <span class="eyebrow">Continue</span>
      <button class="item" id="cont" style="border:1px solid var(--line)">
        <span class="badge" style="color:var(--accent);width:52px;height:52px;border-radius:16px">${nxIdx}</span>
        <span class="col grow" style="gap:6px"><b>${esc(nx.title)}</b>
          <span style="height:6px;border-radius:3px;background:var(--s2);display:block"><span style="display:block;width:${unitDone / UNITS[0].lessons.length * 100}%;height:6px;border-radius:3px;background:var(--accent)"></span></span>
          <span class="sub">Unit 1 · ${unitDone} of ${UNITS[0].lessons.length} lessons done</span></span>${I.chev}
      </button>
    </div>
    <div class="card col" style="gap:10px">
      <div class="row between"><b style="font-size:16px">This week</b><span class="small muted">avg accuracy <b style="color:var(--ink)">${ws.acc == null ? '–' : ws.acc + '%'}</b></span></div>
      <div class="bars">${week.map(d => `<div><i class="${d.today ? 'today' : ''}" style="height:${d.acc == null ? 6 : Math.max(10, d.acc * 0.7)}px;${d.acc == null && d.today ? 'background:var(--s2);border:1px dashed var(--accent)' : ''}"></i><span style="${d.today ? 'color:var(--ink);font-weight:700' : ''}">${d.label}</span></div>`).join('')}</div>
    </div>
  </div>${tabbar('home')}`, mount(root){
    root.querySelector('#daily').onclick = () => startLesson(dailyLesson(today));
    root.querySelector('#cont').onclick = () => startLesson(findLesson(nx.id));
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
      <span class="row" style="gap:4px;font-weight:700">${I.flame}<span id="streak">0</span></span>
    </div>
    ${A.state.touchMode ? `<div class="banner">${S.inputMode === 'touch' ? 'Touch mode: drag up and down to move the ball. Switch to the mic in Settings.' : "Mic isn't available, so drag up and down to move the ball. Allow the microphone in your browser or phone settings to sing."}</div>` : ''}
    <div class="stage">
      <canvas id="cv"></canvas>
      <div class="tuner" id="tuner">Get ready</div>
      <div class="phase" id="phase"></div>
      <div class="toast" id="toast"></div>
    </div>
    <div class="game-bottom">
      <button class="btn secondary" id="hear">${I.speaker} Hear again</button>
      <button class="btn secondary" id="pause">${I.pause} Pause</button>
    </div>`, mount(root){
    const $ = s => root.querySelector(s);
    let streak = 0;
    const segOf = i => Math.floor(i * segs / total);
    const g = new Game($('#cv'), {
      base: S.base, tol: S.tol, phrases, blind: !!lesson.blind,
      tunerEl: $('#tuner'), phaseEl: $('#phase'), toastEl: $('#toast'),
      onWall(i, hit){
        streak = hit ? streak + 1 : 0; $('#streak').textContent = streak;
        const bars = $('#prog').children, k = segOf(i), kn = segOf(i + 1);
        if (bars[k]) bars[k].className = hit ? 'hit' : 'miss';
        if (kn !== k && bars[kn]) bars[kn].className = 'now';
      },
      onEnd(results, extra){ go('results', { lesson, results, extra }); },
    });
    $('#hear').onclick = () => g.hearAgain();
    $('#pause').onclick = e => { g.pause(!g.paused); e.currentTarget.innerHTML = g.paused ? `${I.play} Resume` : `${I.pause} Pause`; $('#phase').textContent = g.paused ? 'Paused' : ''; };
    $('#quit').onclick = () => go(lesson.unit.id === 'studio' ? 'studio' : lesson.id === 'daily' ? 'home' : 'lessons');
    return () => g.destroy();
  }};
};

// ---------- results ----------
screens.results = ({ lesson, results, extra }) => {
  const xp = Math.round(extra.score);
  const r = recordSession(lesson.id, results, xp);
  const bySemi = {};
  results.forEach(w => { const b = bySemi[w.semi] || (bySemi[w.semi] = { hits: 0, n: 0, c: [], }); b.n++; if (w.hit) b.hits++; if (w.heard && w.cents != null) b.c.push(w.cents); });
  const chips = Object.keys(bySemi).map(Number).sort((a, b) => a - b).map(s => { const b = bySemi[s]; const avg = b.c.length ? Math.round(b.c.reduce((x, y) => x + y, 0) / b.c.length) : null; return { s, miss: b.hits / b.n < 0.5, avg }; });
  const worst = chips.filter(c => c.miss).sort((a, b) => Math.abs(b.avg || 999) - Math.abs(a.avg || 999))[0];
  let tip = 'Clean work. Try a faster lesson or a smaller hole size in Settings.';
  if (r.tries && results.filter(w => !w.heard).length > r.tries / 3) tip = "A lot of walls passed without hearing you. Sing as soon as the reference note stops, and keep going until the wall passes the ball.";
  else if (worst && worst.avg != null) tip = `${SOLF[worst.s]} gave you the most trouble: you were ${Math.abs(worst.avg)} cents ${worst.avg > 0 ? 'sharp. Aim a little lower than feels right.' : 'flat. Lift it a little and keep your breath steady.'}`;
  else if (Math.abs(r.cents) >= 15) tip = `Overall you sing ${r.cents > 0 ? 'sharp' : 'flat'} by about ${Math.abs(r.cents)} cents. ${r.cents > 0 ? 'Relax and aim slightly lower.' : 'Support the note and aim slightly higher.'}`;
  const nx = lesson.id === 'daily' ? null : nextAfter(lesson.id);
  const passed = r.acc >= 60;
  return { html: `<div class="screen">
    <div class="col" style="align-items:center;gap:6px;text-align:center;margin-top:12px">
      <span class="eyebrow" style="color:${passed ? 'var(--good)' : 'var(--warn)'}">${passed ? 'Lesson complete' : 'Keep practising'}</span>
      <h1 style="font-size:30px">${esc(lesson.title)}</h1>
    </div>
    <div class="card col" style="align-items:center;gap:4px;padding:24px 0;border-radius:24px">
      <span class="big">${r.acc}<span style="font-size:36px;color:var(--muted)">%</span></span>
      <span class="muted" style="font-size:15px">${r.hits} of ${r.tries} walls passed</span>
      <div class="row" style="gap:22px;margin-top:14px">
        <div class="col" style="align-items:center;gap:0"><b style="font-size:20px">${r.cents > 0 ? '+' : ''}${r.cents}c</b><span class="small muted">avg off</span></div>
        <div class="col" style="align-items:center;gap:0"><b style="font-size:20px">${extra.bestStreak}</b><span class="small muted">best streak</span></div>
        <div class="col" style="align-items:center;gap:0"><b style="font-size:20px;color:var(--accent)">+${xp}</b><span class="small muted">XP</span></div>
      </div>
    </div>
    <div class="col"><span class="eyebrow">Note by note</span>
      <div class="notegrid">${chips.map(c => `<div class="${c.miss ? 'miss' : ''}"><b>${SOLF[c.s]}</b><span>${c.avg == null ? 'not heard' : (c.avg > 0 ? '+' : c.avg < 0 ? '−' : '') + Math.abs(c.avg) + 'c'}</span></div>`).join('')}</div>
    </div>
    <div class="note">${r.cents > 0 ? I.up : I.down}<div>${tip}</div></div>
    <div class="grow"></div>
    <div class="col">
      ${nx && passed ? `<button class="btn primary" id="next">Next: ${esc(nx.title)}</button><button class="btn ghost" id="again">Try again</button>`
        : `<button class="btn primary" id="again">Try again</button><button class="btn ghost" data-go="${lesson.id === 'daily' ? 'home' : lesson.unit.id === 'studio' ? 'studio' : 'lessons'}">Done</button>`}
    </div>
  </div>`, mount(root){
    const n = root.querySelector('#next'); if (n) n.onclick = () => startLesson(nx);
    root.querySelector('#again').onclick = () => startLesson(lesson);
    A.blip(passed ? 'big' : 'ok');
  }};
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
      onEnd(results){ go('drillResults', { lesson, results }); },
    });
    $('#hear').onclick = () => d.replay();
    $('#quit').onclick = () => go('studio');
    return () => d.destroy();
  }};
};
screens.drillResults = ({ lesson, results }) => {
  const passed = results.filter(r => r.pass).length, total = results.length;
  const acc = recordHold(lesson.id, passed, total, passed * 20);
  return { html: `<div class="screen">
    <div class="col" style="align-items:center;gap:6px;text-align:center;margin-top:12px"><span class="eyebrow" style="color:${acc >= 60 ? 'var(--good)' : 'var(--warn)'}">${acc >= 60 ? 'Drill complete' : 'Keep practising'}</span><h1 style="font-size:30px">${esc(lesson.title)}</h1></div>
    <div class="card col" style="align-items:center;gap:4px;padding:24px 0;border-radius:24px"><span class="big">${passed}<span style="font-size:36px;color:var(--muted)">/${total}</span></span><span class="muted">holds passed · +${passed * 20} XP</span></div>
    <div class="list">${results.map((r, i) => `<div class="item"><span class="badge ${r.pass ? 'done' : ''}">${r.pass ? I.check : i + 1}</span><span class="col"><b>${SOLF[lesson.notes[i]]}</b><span class="sub">${!r.heard ? 'Not heard' : lesson.mode === 'vibrato' ? `${r.rate} Hz · ±${r.width}c · centre ${r.centre > 0 ? '+' : ''}${r.centre}c` : `wobble ${r.wobble}c · drift ${r.drift > 0 ? '+' : ''}${r.drift}c · centre ${r.centre > 0 ? '+' : ''}${r.centre}c`}</span></span></div>`).join('')}</div>
    <div class="grow"></div>
    <div class="col"><button class="btn primary" id="again">Try again</button><button class="btn ghost" data-go="studio">Done</button></div>
  </div>`, mount(root){ root.querySelector('#again').onclick = () => startLesson(lesson); A.blip(acc >= 60 ? 'big' : 'ok'); } };
};

// ---------- progress ----------
screens.progress = (p = {}) => {
  const all = p.all && S.pro;
  const st = stats(all ? null : 7);
  const semis = [0,2,4,5,7,9,11].concat([1,3,6,8,10].filter(s => S.notes[s]));
  const rows = semis.filter(s => S.notes[s] && S.notes[s].tries).map(s => { const n = S.notes[s]; const a = Math.round(n.hits / n.tries * 100); return `<div class="hbar"><span>${SOLF[s]}</span><span class="track"><i style="width:${a}%;background:${a >= 80 ? 'var(--good)' : a >= 60 ? 'var(--warn)' : 'var(--bad)'}"></i></span><span>${a}%</span></div>`; }).join('');
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
  <div class="col"><span class="eyebrow">Pro</span>
    <div class="card row between"><div class="col" style="gap:2px"><b>${S.pro ? 'Pro preview is on' : 'Free plan'}</b><span class="small muted">${S.pro ? 'Testing only. Real purchases come with the store apps.' : 'Unlock Studio, units 2 to 4 and Perfect mode'}</span></div><button class="chip" id="pro">${S.pro ? 'Turn off' : 'See Pro'}</button></div>
  </div>
  <div class="grow"></div>
  <button class="btn ghost" id="reset" style="color:var(--bad)">Reset all progress</button>
  <p class="small muted" style="text-align:center">Pitch Pass reads your pitch on this device. Nothing is recorded or uploaded. <a href="${PRIVACY_URL}" target="_blank" rel="noopener">Privacy policy</a></p>
</div>`, mount(root){
  root.querySelector('#redo').onclick = async () => { A.ctx(); const ok = S.inputMode === 'touch' ? false : await A.startMic(); go('range', { manual: !ok, fromSettings: true }); };
  root.querySelectorAll('#tol button').forEach(b => b.onclick = () => { const v = +b.dataset.v; if (v === 15 && !S.pro) return go('paywall'); S.tol = v; save(); go('settings'); });
  root.querySelectorAll('#input button').forEach(b => b.onclick = async () => { S.inputMode = b.dataset.v; save(); if (b.dataset.v === 'touch') { A.state.touchMode = true; } else { A.ctx(); const ok = await A.startMic(); A.state.touchMode = !ok; } go('settings'); });
  root.querySelector('#pro').onclick = () => { if (S.pro) { S.pro = false; if (S.tol === 15) S.tol = 30; save(); go('settings'); } else go('paywall'); };
  root.querySelector('#reset').onclick = () => sheet(`<h1 style="font-size:24px">Reset everything?</h1><p class="muted">This clears your streak, lesson progress, stats and voice range.</p><button class="btn primary" id="yes" style="background:var(--bad)">Reset</button><button class="btn ghost" id="no">Cancel</button>`, (bg, close) => { bg.querySelector('#no').onclick = close; bg.querySelector('#yes').onclick = () => { close(); reset(); go('welcome'); }; });
}});

// ---------- paywall ----------
screens.paywall = () => ({ html: `<div class="screen" style="gap:14px">
  <div class="row" style="justify-content:flex-end"><button class="icon-btn" data-go="home" aria-label="Close">${I.x}</button></div>
  <div class="col" style="gap:10px"><span class="pro" style="align-self:flex-start;font-size:12px;padding:5px 10px">PRO</span><h1>From in tune to riffing clean</h1></div>
  <div class="col" style="gap:12px">
    ${[['Riffs and runs.','Melisma drills that speed up as you get cleaner.'],['Vocal technique.','Vibrato and steady sustain, scored live.'],['Every unit.','Intervals, sharps and flats, short melodies.'],['Perfect mode.','The hole shrinks to ±15 cents.'],['Full history.','All-time accuracy and per-note coaching.']].map(([b, t]) => `<div class="check">${I.check}<div><b>${b}</b> <span class="muted">${t}</span></div></div>`).join('')}
  </div>
  <div class="grow"></div>
  <div class="col" style="gap:10px" id="plans">
    <button class="plan on" data-plan="year"><span class="radio"></span><span class="col" style="gap:2px"><b>Yearly</b><span class="small muted">$49.99 a year · $4.17 a month, save 48%</span></span><span class="tag">BEST VALUE</span></button>
    <button class="plan" data-plan="month"><span class="radio"></span><span class="col" style="gap:2px"><b>Monthly</b><span class="small muted">$7.99 a month</span></span></button>
  </div>
  <button class="btn primary" id="buy">Start 7-day free trial</button>
  <p class="small muted" style="text-align:center;margin-top:-6px" id="fine">Then $49.99 a year. Cancel anytime before the trial ends.</p>
</div>`, mount(root){
  let plan = 'year';
  root.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => { plan = b.dataset.plan; root.querySelectorAll('[data-plan]').forEach(x => x.classList.toggle('on', x === b)); root.querySelector('#fine').textContent = plan === 'year' ? 'Then $49.99 a year. Cancel anytime before the trial ends.' : 'Then $7.99 a month. Cancel anytime before the trial ends.'; });
  root.querySelector('#buy').onclick = () => {
    if (window.PitchPassBilling) return window.PitchPassBilling.purchase(plan).then(ok => { if (ok) { S.pro = true; save(); go('studio'); } });
    if (!ALLOW_PRO_PREVIEW) return sheet(`<h1 style="font-size:24px">Purchases aren't ready yet</h1><p class="muted">Pro will be available to buy in the next update.</p><button class="btn primary" id="no">OK</button>`, (bg, close) => { bg.querySelector('#no').onclick = close; });
    sheet(`<h1 style="font-size:24px">Payments open with the store apps</h1><p class="muted" style="line-height:1.45">Subscriptions will run through the App Store and Google Play. While you test, you can turn on a free Pro preview on this device.</p><button class="btn primary" id="on">Turn on Pro preview</button><button class="btn ghost" id="no">Not now</button>`, (bg, close) => { bg.querySelector('#no').onclick = close; bg.querySelector('#on').onclick = () => { close(); S.pro = true; save(); go('studio'); }; });
  };
}});

// ---------- boot ----------
if (S.inputMode === 'touch') A.state.touchMode = true;
go(S.onboarded ? 'home' : 'welcome');
window.__pp = { go, S, A };
