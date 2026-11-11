// Lessons and drills. Notes are semitones above the lesson's Do (the voice range base).
//
// Chromatic solfege is directional, the way singers actually use it: a raised note
// climbing to the next one is Di, the same pitch falling back down is Ra. Minor keys
// are taught do-based, so the flat third is Me and the flat sixth is Le.
const UP   = ['Do','Di','Re','Ri','Mi','Fa','Fi','Sol','Si','La','Li','Ti'];
const DOWN = ['Do','Ra','Re','Me','Mi','Fa','Se','Sol','Le','La','Te','Ti'];
const CHROM = [1,3,6,8,10];
export function solf(semi, dir){
  const oct = Math.floor(semi / 12), k = ((semi % 12) + 12) % 12;
  const name = (dir === 'down' ? DOWN : UP)[k];
  return oct > 0 ? name + "'" : oct < 0 ? name + ',' : name;
}
// Spell each note by where it is going: up to the next note means a sharp name,
// down means a flat one. syl 'flat' or 'sharp' pins it for a whole lesson.
export function labelsFor(notes, syl){
  return notes.map((n, i) => {
    let dir = 'up';
    if (syl === 'flat') dir = 'down';
    else if (syl !== 'sharp' && CHROM.includes(((n % 12) + 12) % 12)) {
      const nx = notes[i + 1], pv = notes[i - 1];
      if (nx != null && nx !== n) dir = nx > n ? 'up' : 'down';
      else if (pv != null && pv !== n) dir = pv > n ? 'down' : 'up';
    }
    return solf(n, dir);
  });
}
export const SOLF = new Proxy({}, { get: (_, k) => (k === 'length' ? 13 : solf(Number(k), 'up')) });
export const SCALE = [0,2,4,5,7,9,11,12];
export const MINOR = [0,2,3,5,7,8,10,12];

// Chords are built on a scale degree, so they stay in movable Do like everything else.
export const CHORDS = {
  maj:  { name:'Major',         tones:[0,4,7],     deg:['Root','3rd','5th'] },
  min:  { name:'Minor',         tones:[0,3,7],     deg:['Root','\u266d3rd','5th'] },
  dim:  { name:'Diminished',    tones:[0,3,6],     deg:['Root','\u266d3rd','\u266d5th'] },
  aug:  { name:'Augmented',     tones:[0,4,8],     deg:['Root','3rd','\u266f5th'] },
  dom7: { name:'Dominant 7th',  tones:[0,4,7,10],  deg:['Root','3rd','5th','\u266d7th'] },
  maj7: { name:'Major 7th',     tones:[0,4,7,11],  deg:['Root','3rd','5th','7th'] },
  min7: { name:'Minor 7th',     tones:[0,3,7,10],  deg:['Root','\u266d3rd','5th','\u266d7th'] },
};
export const chordNotes = (id, root) => CHORDS[id].tones.map(t => t + root);
export const chordName = (id, root) => `${CHORDS[id].name} on ${solf(root, 'up')}`;
// up then back down without repeating the top note
export const arpSeq = (id, root) => { const t = chordNotes(id, root); return [...t, ...t.slice(0, -1).reverse()]; };

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
    { id:'u3l1', title:'Half steps up', sub:'Do Di Re Ri Mi', type:'single', notes:[0,1,2,3,4,5,6,7], syl:'sharp' },
    { id:'u3l2', title:'Half steps down', sub:"Do' Ti Te La Le", type:'single', notes:[12,11,10,9,8,7,6,5], syl:'flat' },
    { id:'u3l3', title:'Raised or lowered', sub:'Di and Ra are the same pitch, different jobs', type:'single', notes:[0,1,2,2,1,0,4,3,2], syl:'auto' },
  ]},
  { id:'u5', title:'Minor keys', sub:'Me, Le and Te', pro:true, lessons:[
    { id:'u5l1', title:'Major or minor third', sub:'Mi against Me, the first thing to hear', type:'single', notes:[0,4,0,3,0,4,3,0], syl:'flat' },
    { id:'u5l2', title:'Natural minor', sub:'Do Re Me Fa Sol Le Te Do', type:'single', notes:[0,2,3,5,7,8,10,12], syl:'flat' },
    { id:'u5l3', title:'Minor coming down', sub:"Do' Te Le Sol Fa Me Re Do", type:'single', notes:[12,10,8,7,5,3,2,0], syl:'flat' },
    { id:'u5l4', title:'Harmonic minor', sub:'Le to Ti, the big step', type:'single', notes:[0,2,3,5,7,8,11,12], syl:'flat' },
    { id:'u5l5', title:'Melodic minor', sub:'Raised going up, lowered coming down', type:'single', notes:[0,2,3,5,7,9,11,12,10,8,7,5,3,2], syl:'flat' },
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
// Chord work. Arpeggios teach the shape, Find the tone teaches the ear to pick one
// voice out of a stack, and the hold drills put a chord underneath you while you sing.
export const CHORD_LAB = [
  { id:'ch1', title:'Triad arpeggios', sub:'Root, third, fifth and back', type:'arp', gap:0.62,
    rounds:[['maj',0],['min',0],['maj',5],['min',9],['maj',7]] },
  { id:'ch2', title:'Seventh chords', sub:'Four notes, up and down', type:'arp', gap:0.56,
    rounds:[['dom7',7],['maj7',0],['min7',2],['min7',9],['dom7',2]] },
  { id:'ch3', title:'Thin air', sub:'Diminished and augmented', type:'arp', gap:0.66,
    rounds:[['dim',11],['aug',0],['dim',2],['aug',5]] },
  { id:'ch4', title:'Find the tone', sub:'The chord plays, you sing one note of it', type:'tone',
    rounds:[['maj',0,1],['min',0,1],['maj',5,2],['dom7',7,3],['min7',2,1],['maj7',0,3],['dim',11,2],['maj',7,1]] },
  { id:'ch5', title:'Hold against the chord', sub:'Your note, their harmony', type:'harmony', secs:5,
    rounds:[['maj',0,1],['min',0,1],['dom7',7,3],['maj7',5,2]] },
  // Each of these is a real common tone: the held note belongs to every chord that
  // passes under it, so the only thing that can move it is the singer's ear.
  { id:'ch6', title:'Through the changes', sub:'Hold one note while the chord moves under it', type:'harmony', secs:7,
    rounds:[['maj',0,0,[['maj',0],['min',9],['maj',5],['maj',0]]],
            ['maj',0,2,[['maj',0],['dom7',7],['min',4],['maj',0]]],
            ['min',9,0,[['min',9],['maj',5],['min',2],['min',9]]],
            ['maj',0,1,[['maj',0],['min',9],['min',4],['maj',0]]]] },
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
    ...CHORD_LAB.map(l => ({ ...l, unit: { id: 'chords', pro: true, title: 'Chord lab' } })),
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
  if (lesson.type === 'arp') {
    return lesson.rounds.map(([id, root]) => {
      const notes = arpSeq(id, root);
      return { kind:'chord', notes, labels: labelsFor(notes, id.startsWith('min') || id === 'dim' ? 'flat' : 'sharp'),
        gap: lesson.gap, chord: chordNotes(id, root), chordName: chordName(id, root) };
    });
  }
  if (lesson.type === 'tone') {
    return lesson.rounds.map(([id, root, deg]) => {
      const tones = chordNotes(id, root);
      return { kind:'chordtone', notes:[tones[deg]], labels:[CHORDS[id].deg[deg]],
        chord: tones, chordName: chordName(id, root), ask: CHORDS[id].deg[deg], hideHole: true };
    });
  }
  if (lesson.type === 'single') {
    let notes = lesson.notes;
    if (lesson.random) {
      notes = []; let last = -1;
      while (notes.length < lesson.random) { const n = SCALE[Math.floor(Math.random() * 8)]; if (n !== last && Math.abs(SCALE.indexOf(n) - SCALE.indexOf(last)) <= 5) { notes.push(n); last = n; } }
    }
    const labs = labelsFor(notes, lesson.syl);
    return notes.map((n, i) => ({ kind:'single', notes:[n], labels:[labs[i]] }));
  }
  if (lesson.type === 'run') return lesson.phrases.map(p => ({ kind:'run', notes:p, labels: labelsFor(p, lesson.syl), gap: 60 / lesson.bpm * 0.5 }));
  if (lesson.type === 'challenge') return lesson.notes.map(n => ({ kind:'single', notes:[n], labels:[solf(n, 'up')] }));
  if (lesson.type === 'melody') return lesson.phrases.map(p => ({ kind:'melody', notes:p, labels: labelsFor(p, lesson.syl), gap: lesson.gap }));
  return [];
}
