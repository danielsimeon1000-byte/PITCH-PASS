// Lessons and drills. Notes are semitones above the lesson's Do (the voice range base).
export const SOLF = { 0:'Do', 1:'Di', 2:'Re', 3:'Ri', 4:'Mi', 5:'Fa', 6:'Fi', 7:'Sol', 8:'Si', 9:'La', 10:'Li', 11:'Ti', 12:"Do'" };
export const SCALE = [0,2,4,5,7,9,11,12];

// type: 'single' one wall per note with its own reference, 'run' fast row of walls,
// 'melody' a phrase of walls at a steady pace, 'hold' vibrato or sustain drill.
import { WARMUPS } from './coach.js';

export const UNITS = [
  { id:'u1', title:'The major scale', pro:false, lessons:[
    { id:'u1l1', title:'Do, Re, Mi', sub:'8 walls', type:'single', notes:[0,2,4,2,0,4,2,0] },
    { id:'u1l2', title:'Up to Sol', sub:'8 walls', type:'single', notes:[0,2,4,5,7,5,4,2] },
    { id:'u1l3', title:'Full scale up', sub:'8 walls', type:'single', notes:[0,2,4,5,7,9,11,12] },
    { id:'u1l4', title:'Scale down', sub:'8 walls', type:'single', notes:[12,11,9,7,5,4,2,0] },
    { id:'u1l5', title:'Skipping notes', sub:'10 walls, by ear', type:'single', random:10, blind:true },
  ]},
  { id:'u2', title:'Intervals', sub:'Hear the jump, sing it', pro:true, lessons:[
    { id:'u2l1', title:'Thirds', sub:'8 walls', type:'single', notes:[0,4,2,5,4,7,5,9] },
    { id:'u2l2', title:'Fourths and fifths', sub:'8 walls', type:'single', notes:[0,5,0,7,2,7,4,9] },
  ]},
  { id:'u3', title:'Sharps and flats', sub:'All 12 notes', pro:true, lessons:[
    { id:'u3l1', title:'Half steps', sub:'8 walls', type:'single', notes:[0,1,2,3,4,5,6,7] },
    { id:'u3l2', title:'Chromatic down', sub:'8 walls', type:'single', notes:[12,11,10,9,8,7,6,5] },
  ]},
  { id:'u4', title:'Short melodies', sub:'Sing the phrase', pro:true, lessons:[
    { id:'u4l1', title:'Twinkle', sub:'Folk tune, 7 notes', type:'melody', gap:0.75, phrases:[[0,0,7,7,9,9,7],[5,5,4,4,2,2,0]] },
    { id:'u4l2', title:'Ode to Joy', sub:'Beethoven, 8 notes', type:'melody', gap:0.6, phrases:[[4,4,5,7,7,5,4,2],[0,0,2,4,4,2,2]] },
  ]},
];

export const STUDIO = [
  { id:'sr1', title:'Turns', sub:'4 to 5 notes around one pitch', type:'run', bpm:70, phrases:[[4,5,4,2,4],[7,9,7,5,7],[2,4,2,0,2],[9,11,9,7,9]] },
  { id:'sr2', title:'Pentatonic runs', sub:'6 notes, Sol La Sol Mi Re Do', type:'run', bpm:80, phrases:[[7,9,7,4,2,0],[12,9,7,4,2,0],[4,7,9,12,9,7],[9,7,4,7,4,2,0],[7,4,2,4,2,0]] },
  { id:'sr3', title:'Gospel descents', sub:"Do' down to Do with passing notes", type:'run', bpm:90, phrases:[[12,11,9,7,9,7,4],[12,9,7,4,2,0],[11,9,7,5,4,2,0]] },
  { id:'sr4', title:'Melisma', sub:'10 notes on one vowel', type:'run', bpm:100, phrases:[[7,9,12,9,7,4,7,4,2,0],[4,7,9,7,4,2,4,2,0,2]] },
];
export const TECHNIQUE = [
  { id:'tv', title:'Vibrato', sub:'Rate and width', type:'hold', mode:'vibrato', notes:[7,4,9,5,7] },
  { id:'ts', title:'Steady sustain', sub:'Hold without drifting', type:'hold', mode:'sustain', notes:[4,7,2,9,5] },
  { id:'tsl', title:'Slides', sub:'Scoops and falls', soon:true },
  { id:'tl', title:'Big leaps', sub:'Octaves, land clean', soon:true },
];

export function allLessons(){
  return [
    ...WARMUPS.map(l => ({ ...l, warmup: true, unit: { id: 'warmup', pro: false, title: 'Warm up' } })),
    ...UNITS.flatMap(u => u.lessons.map(l => ({ ...l, unit: u }))),
    ...STUDIO.map(l => ({ ...l, unit: { id: 'studio', pro: true, title: 'Riffs and runs' } })),
    ...TECHNIQUE.filter(t => !t.soon).map(l => ({ ...l, unit: { id: 'tech', pro: true, title: 'Vocal technique' } })),
  ];
}
export const findLesson = id => allLessons().find(l => l.id === id);

// Seeded random so the daily challenge is the same all day.
export function dailyLesson(dayKey){
  let s = 0; for (const ch of dayKey) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const notes = []; let last = -1;
  while (notes.length < 10) { const n = SCALE[Math.floor(rnd() * 8)]; if (n !== last) { notes.push(n); last = n; } }
  return { id:'daily', title:"Daily challenge", sub:'10 walls, mixed notes', type:'single', notes, unit:{ id:'daily', pro:false } };
}

// Expand a lesson into phrases for the game engine.
export function buildPhrases(lesson){
  if (lesson.type === 'single') {
    let notes = lesson.notes;
    if (lesson.random) {
      notes = []; let last = -1;
      while (notes.length < lesson.random) { const n = SCALE[Math.floor(Math.random() * 8)]; if (n !== last && Math.abs(SCALE.indexOf(n) - SCALE.indexOf(last)) <= 5) { notes.push(n); last = n; } }
    }
    return notes.map(n => ({ kind:'single', notes:[n] }));
  }
  if (lesson.type === 'run') return lesson.phrases.map(p => ({ kind:'run', notes:p, gap: 60 / lesson.bpm * 0.5 }));
  if (lesson.type === 'challenge') return lesson.notes.map(n => ({ kind:'single', notes:[n] }));
  if (lesson.type === 'melody') return lesson.phrases.map(p => ({ kind:'melody', notes:p, gap: lesson.gap }));
  return [];
}
