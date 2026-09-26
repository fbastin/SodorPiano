import {
  GRACE_TAG, child, childText, children, durationBeats, fractionBeats, isTieStop,
  parseRepeats, readScore, spelling,
} from './mscx';

// Converts a MuseScore score (.mscx) into MusicXML, for engraving by
// OpenSheetMusicDisplay, which reads only MusicXML. Only what the notation
// display needs is carried over: notes, rests and chords with their written
// rhythm, ties, tuplets, grace notes, clefs, key and time signatures, repeat
// barlines and voltas. Measures are kept one for one, so that measure N of
// the playback is measure N of the engraving.

const STEPS = 'CDEFGAB';
const TYPES = new Set(['long', 'breve', 'whole', 'half', 'quarter', 'eighth', '16th', '32nd',
  '64th', '128th', '256th', '512th', '1024th']);
// MuseScore clef names → MusicXML sign, line and octave change.
const CLEFS: Record<string, [string, number, number]> = {
  G: ['G', 2, 0], G8va: ['G', 2, 1], G15ma: ['G', 2, 2], G8vb: ['G', 2, -1], 'G8vb-o': ['G', 2, -1],
  F: ['F', 4, 0], F8va: ['F', 4, 1], F8vb: ['F', 4, -1], F15mb: ['F', 4, -2], F3: ['F', 3, 0], F5: ['F', 5, 0],
  C1: ['C', 1, 0], C2: ['C', 2, 0], C3: ['C', 3, 0], C4: ['C', 4, 0], C5: ['C', 5, 0],
  G1: ['G', 1, 0], PERC: ['percussion', 0, 0], TAB: ['TAB', 5, 0],
};

// MuseScore articulation symbols (articStaccatoAbove, or "staccato" in
// MuseScore 2) → MusicXML articulations. Combined symbols give several.
const ARTICULATIONS: [RegExp, string][] = [
  [/staccatissimo/i, 'staccatissimo'],
  [/tenutoStaccato|portato/i, 'detached-legato'],
  [/(?<!tenuto)staccato/i, 'staccato'],
  [/tenuto(?!Staccato)/i, 'tenuto'],
  [/accent|sforzato/i, 'accent'],
  [/marcato/i, 'strong-accent'],
];

function articulationsXml(chord: Element): string {
  const marks = new Set<string>();
  for (const artic of children(chord, 'Articulation')) {
    const name = childText(artic, 'subtype') ?? '';
    for (const [re, tag] of ARTICULATIONS) if (re.test(name)) marks.add(tag);
  }
  return marks.size ? `<articulations>${[...marks].map(m => `<${m}/>`).join('')}</articulations>` : '';
}

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface Attributes {
  fifths: number;
  beats: number;
  beatType: number;
  clefs: string[];
}

export function mscxToMusicXml(xmlString: string): string {
  const { score, staffElements, partOf } = readScore(xmlString);
  const division = Number(childText(score, 'Division')) || 480;
  const partElements = children(score, 'Part');
  // Repeat barlines and voltas are read as for playback, from all staves.
  const repeats = parseRepeats(staffElements.map(s => children(s, 'Measure')));

  // Staves grouped by instrument, in score order.
  const parts: { name: string; staves: Element[]; defaultClefs: string[] }[] = [];
  const partIndex = new Map<number, number>();
  staffElements.forEach(staff => {
    const p = partOf.get(staff.getAttribute('id') ?? '') ?? -1;
    if (!partIndex.has(p)) {
      const part = partElements[p];
      partIndex.set(p, parts.length);
      parts.push({ name: part ? (childText(part, 'trackName') ?? '') : '', staves: [], defaultClefs: [] });
    }
    const entry = parts[partIndex.get(p)!];
    entry.staves.push(staff);
    entry.defaultClefs.push(defaultClef(partElements[p], entry.staves.length));
  });

  const out: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<score-partwise version="4.0">',
    '<part-list>',
    ...parts.map((p, i) => `<score-part id="P${i + 1}"><part-name>${escape(p.name)}</part-name></score-part>`),
    '</part-list>',
  ];
  parts.forEach((part, i) => {
    out.push(`<part id="P${i + 1}">`);
    out.push(...convertPart(part.staves, part.defaultClefs, division, repeats));
    out.push('</part>');
  });
  out.push('</score-partwise>');
  return out.join('\n');
}

// The clef a staff starts with, unless its first measure says otherwise:
// the staff's own default, else the instrument's.
function defaultClef(part: Element | undefined, staffNumber: number): string {
  if (!part) return 'G';
  const staff = children(part, 'Staff')[staffNumber - 1];
  const own = staff && childText(staff, 'defaultClef');
  if (own) return own;
  const instrument = child(part, 'Instrument');
  const clefs = instrument ? children(instrument, 'clef') : [];
  const clef = clefs.find(c => (c.getAttribute('staff') ?? '1') === String(staffNumber));
  return clef?.textContent?.trim() || (staffNumber > 1 ? 'F' : 'G');
}

function convertPart(staves: Element[], defaultClefs: string[], division: number,
                     repeats: ReturnType<typeof parseRepeats>): string[] {
  const measures = staves.map(s => children(s, 'Measure'));
  const count = Math.max(0, ...measures.map(m => m.length));
  const out: string[] = [];
  const shown: Attributes = { fifths: NaN, beats: NaN, beatType: NaN, clefs: [] };
  const current: Attributes = { fifths: 0, beats: 4, beatType: 4, clefs: [...defaultClefs] };
  // Start of each measure, in beats, for the absolute positions of MuseScore 2.
  const starts = staves.map(() => 0);
  let measureBeats = 4;
  // Voltas still open, with the measure where they end.
  const openVoltas: { end: number; endings: number[]; open: boolean }[] = [];

  for (let m = 0; m < count; m++) {
    const r = repeats[m];
    const first = measures[0][m];
    const len = first?.getAttribute('len');
    out.push(`<measure number="${m + 1}"${len && m === 0 ? ' implicit="yes"' : ''}>`);

    // Left barline: start repeat, start of voltas.
    const starting = r?.voltas ?? [];
    if (r?.forward || starting.length) {
      out.push('<barline location="left">');
      if (r?.forward) out.push('<bar-style>heavy-light</bar-style><repeat direction="forward"/>');
      for (const v of starting) {
        out.push(`<ending number="${v.endings.join(', ')}" type="start">${v.endings.join('. ')}.</ending>`);
        openVoltas.push({ end: m + Math.max(1, v.length) - 1, endings: v.endings, open: v.open });
      }
      out.push('</barline>');
    }

    // Signatures and clefs at the head of the measure, on any staff.
    measures.forEach((staffMeasures, s) => {
      const measure = staffMeasures[m];
      if (!measure) return;
      for (const el of leadingElements(measure)) readAttribute(el, current, s);
    });
    measureBeats = (current.beats / current.beatType) * 4;
    const attributes = attributesXml(current, shown, division, m === 0, staves.length);
    if (attributes) out.push(attributes);

    // Each staff, each voice, one after the other: <backup> rewinds.
    let cursor = 0;   // in divisions from the start of the measure
    const moveTo = (ticks: number) => {
      if (ticks > cursor) out.push(`<forward><duration>${ticks - cursor}</duration></forward>`);
      if (ticks < cursor) out.push(`<backup><duration>${cursor - ticks}</duration></backup>`);
      cursor = ticks;
    };
    measures.forEach((staffMeasures, s) => {
      const measure = staffMeasures[m];
      if (!measure) return;
      for (const voice of voiceStreams(measure)) {
        const items = readVoice(voice.elements, division, measureBeats, starts[s], voice.index);
        for (const item of items) {
          if (item.kind === 'clef') {
            if (item.time > 0 && item.clef) {
              moveTo(item.ticks);
              current.clefs[s] = item.clef;
              const [sign, line, octave] = CLEFS[item.clef] ?? CLEFS.G;
              out.push(`<attributes><clef number="${s + 1}"><sign>${sign}</sign><line>${line}</line>` +
                (octave ? `<clef-octave-change>${octave}</clef-octave-change>` : '') + '</clef></attributes>');
              shown.clefs[s] = item.clef;
            }
            continue;
          }
          moveTo(item.ticks);
          out.push(...item.xml(s, staves.length));
          if (item.kind === 'note' && item.advance) cursor += item.advance;
        }
      }
      starts[s] += fractionBeats(measure.getAttribute('len') ?? undefined) || measureBeats;
    });
    // A staff left empty or incomplete (a measure-repeat sign, say) still
    // lasts the whole measure.
    const length = fractionBeats(first?.getAttribute('len') ?? undefined) || measureBeats;
    moveTo(Math.max(cursor, Math.round(length * division)));

    // Right barline: end of voltas, end repeat.
    const ending = openVoltas.filter(v => v.end === m);
    if (r?.backward || ending.length) {
      out.push('<barline location="right">');
      if (r?.backward) out.push('<bar-style>light-heavy</bar-style>');
      for (const v of ending) {
        out.push(`<ending number="${v.endings.join(', ')}" type="${v.open ? 'discontinue' : 'stop'}"/>`);
      }
      if (r?.backward) out.push(`<repeat direction="backward" times="${r.backward}"/>`);
      out.push('</barline>');
    }
    for (const v of ending) openVoltas.splice(openVoltas.indexOf(v), 1);
    out.push('</measure>');
  }
  return out;
}

// Signatures and clefs written before the first note or rest of a measure.
function leadingElements(measure: Element): Element[] {
  const voices = children(measure, 'voice');
  const stream = voices.length ? children(voices[0]) : children(measure);
  const out: Element[] = [];
  for (const el of stream) {
    if (el.tagName === 'Chord' || el.tagName === 'Rest') break;
    if (el.tagName === 'KeySig' || el.tagName === 'TimeSig' || el.tagName === 'Clef') out.push(el);
  }
  return out;
}

function readAttribute(el: Element, a: Attributes, staff: number) {
  if (el.tagName === 'KeySig') {
    const key = childText(el, 'concertKey') ?? childText(el, 'accidental') ?? childText(el, 'key');
    if (key !== undefined && Number.isFinite(Number(key))) a.fifths = Number(key);
  }
  if (el.tagName === 'TimeSig') {
    const n = Number(childText(el, 'sigN'));
    const d = Number(childText(el, 'sigD'));
    if (n && d) { a.beats = n; a.beatType = d; }
  }
  if (el.tagName === 'Clef') {
    const type = childText(el, 'concertClefType') ?? childText(el, 'subtype');
    if (type) a.clefs[staff] = type;
  }
}

function attributesXml(a: Attributes, shown: Attributes, division: number, first: boolean, staves: number): string {
  const parts: string[] = [];
  if (first) parts.push(`<divisions>${division}</divisions>`);
  if (a.fifths !== shown.fifths) parts.push(`<key><fifths>${a.fifths}</fifths></key>`);
  if (a.beats !== shown.beats || a.beatType !== shown.beatType) {
    parts.push(`<time><beats>${a.beats}</beats><beat-type>${a.beatType}</beat-type></time>`);
  }
  if (first && staves > 1) parts.push(`<staves>${staves}</staves>`);
  a.clefs.forEach((clef, s) => {
    if (clef === shown.clefs[s]) return;
    const [sign, line, octave] = CLEFS[clef] ?? CLEFS.G;
    parts.push(`<clef number="${s + 1}"><sign>${sign}</sign><line>${line}</line>` +
      (octave ? `<clef-octave-change>${octave}</clef-octave-change>` : '') + '</clef>');
  });
  shown.fifths = a.fifths;
  shown.beats = a.beats;
  shown.beatType = a.beatType;
  shown.clefs = [...a.clefs];
  return parts.length ? `<attributes>${parts.join('')}</attributes>` : '';
}

// The voices of a staff's measure: <voice> elements since MuseScore 3; in
// MuseScore 2, one stream where <track> switches voices.
function voiceStreams(measure: Element): { index: number; elements: Element[] }[] {
  const voices = children(measure, 'voice');
  if (voices.length) return voices.map((v, index) => ({ index, elements: children(v) }));
  return [{ index: -1, elements: children(measure) }];
}

interface Item {
  kind: 'note' | 'clef' | 'tempo';
  time: number;       // beats from the start of the measure
  ticks: number;      // the same, in divisions
  advance?: number;   // divisions the item lasts
  clef?: string;
  xml: (staff: number, staves: number) => string[];
}

// One voice of a measure as MusicXML items, positioned in time. `voiceIndex`
// is -1 for a MuseScore 2 stream, where each chord names its track.
function readVoice(elements: Element[], division: number, measureBeats: number,
                   measureStart: number, voiceIndex: number): Item[] {
  const items: Item[] = [];
  let time = 0;
  let voice = Math.max(0, voiceIndex);
  // Tuplets: bracketed by <Tuplet>…<endTuplet/> (MuseScore 4) or named by
  // id from each chord (MuseScore 2 and 3).
  const tupletStack: { actual: number; normal: number; key: string }[] = [];
  const tupletById = new Map<string, { actual: number; normal: number; key: string }>();
  let tupletCount = 0;
  // Nested tuplets multiply: a triplet inside a triplet is 9 in the time of 4.
  const tupletOf = (el: Element) => {
    const ref = childText(el, 'Tuplet');
    if (ref && tupletById.has(ref)) return tupletById.get(ref)!;
    if (!tupletStack.length) return undefined;
    const inner = tupletStack[tupletStack.length - 1];
    return {
      actual: tupletStack.reduce((p, t) => p * t.actual, 1),
      normal: tupletStack.reduce((p, t) => p * t.normal, 1),
      key: inner.key,
    };
  };
  const members: { item: Item; key: string }[] = [];

  for (const el of elements) {
    switch (el.tagName) {
      case 'tick':
        time = Number(el.textContent) / division - measureStart;
        break;
      case 'location':
        time += fractionBeats(childText(el, 'fractions'));
        break;
      case 'Clef': {
        const clef = childText(el, 'concertClefType') ?? childText(el, 'subtype');
        if (clef) items.push({ kind: 'clef', time, ticks: Math.round(time * division), clef, xml: () => [] });
        break;
      }
      case 'Tempo': {
        // Stored in quarter notes per second.
        const bpm = parseFloat(childText(el, 'tempo') ?? '') * 60;
        if (bpm > 0) {
          items.push({ kind: 'tempo', time, ticks: Math.round(time * division),
                       xml: () => [`<direction placement="above"><direction-type><words/></direction-type><sound tempo="${+bpm.toFixed(3)}"/></direction>`] });
        }
        break;
      }
      case 'Tuplet': {
        const normal = Number(childText(el, 'normalNotes'));
        const actual = Number(childText(el, 'actualNotes'));
        if (!normal || !actual) break;
        const t = { actual, normal, key: `t${tupletCount++}` };
        const id = el.getAttribute('id');
        if (id) tupletById.set(id, t); else tupletStack.push(t);
        break;
      }
      case 'endTuplet':
        tupletStack.pop();
        break;
      case 'Rest':
      case 'Chord': {
        const track = childText(el, 'track');
        if (voiceIndex < 0 && track !== undefined) voice = Number(track) % 4;
        const isGrace = children(el).some(c => GRACE_TAG.test(c.tagName));
        const tuplet = tupletOf(el);
        const ratio = tuplet ? tuplet.normal / tuplet.actual : 1;
        const beats = isGrace ? 0 : durationBeats(el, measureBeats, ratio);
        const ticks = Math.round(time * division);
        const advance = Math.round(beats * division);
        const item: Item = {
          kind: 'note', time, ticks, advance,
          xml: (staff, staves) => noteXml(el, isGrace, advance, voice, staff, staves, tuplet, item),
        };
        items.push(item);
        if (tuplet) members.push({ item, key: tuplet.key });
        time += beats;
        break;
      }
    }
  }
  // Tuplet brackets: first and last member of each tuplet.
  const byKey = new Map<string, Item[]>();
  for (const { item, key } of members) byKey.set(key, [...(byKey.get(key) ?? []), item]);
  for (const group of byKey.values()) {
    tupletEdge.set(group[0], 'start');
    tupletEdge.set(group[group.length - 1], group.length > 1 ? 'stop' : 'start');
  }
  return items;
}

const tupletEdge = new WeakMap<Item, 'start' | 'stop'>();

function noteXml(el: Element, isGrace: boolean, duration: number, voice: number, staff: number, staves: number,
                 tuplet: { actual: number; normal: number } | undefined, item: Item): string[] {
  const type = childText(el, 'durationType') ?? 'quarter';
  const dots = Number(childText(el, 'dots')) || 0;
  const voiceNumber = staff * 4 + voice + 1;
  const common = (grace: boolean) =>
    (grace ? '' : `<duration>${Math.max(1, duration)}</duration>`);
  const tail = (notations: string[]) => {
    const parts: string[] = [`<voice>${voiceNumber}</voice>`];
    if (TYPES.has(type)) parts.push(`<type>${type}</type>`);
    for (let d = 0; d < dots; d++) parts.push('<dot/>');
    if (tuplet) {
      parts.push(`<time-modification><actual-notes>${tuplet.actual}</actual-notes>` +
        `<normal-notes>${tuplet.normal}</normal-notes></time-modification>`);
    }
    if (staves > 1) parts.push(`<staff>${staff + 1}</staff>`);
    const edge = tupletEdge.get(item);
    if (edge) notations.push(`<tuplet type="${edge}"/>`);
    if (notations.length) parts.push(`<notations>${notations.join('')}</notations>`);
    return parts.join('');
  };

  if (el.tagName === 'Rest') {
    const whole = type === 'measure';
    return [`<note><rest${whole ? ' measure="yes"' : ''}/>${common(false)}` +
      (whole ? tail([]).replace(/<type>[^<]*<\/type>/, '') : tail([])) + '</note>'];
  }

  const out: string[] = [];
  children(el, 'Note').forEach((note, i) => {
    const pitch = Number(childText(note, 'pitch'));
    if (!Number.isFinite(pitch)) return;
    const { letter, alter } = spelling(note);
    const l = letter ?? [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][pitch % 12];
    const a = alter ?? [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0][pitch % 12];
    const octave = Math.floor((pitch - a) / 12) - 1;
    const tieStart = child(note, 'Tie') !== undefined ||
      children(note, 'Spanner').some(s => s.getAttribute('type') === 'Tie' && child(s, 'next'));
    const tieStop = isTieStop(note);
    const ties = (tieStop ? '<tie type="stop"/>' : '') + (tieStart ? '<tie type="start"/>' : '');
    const tied = (tieStop ? ['<tied type="stop"/>'] : []).concat(tieStart ? ['<tied type="start"/>'] : []);
    // Articulations belong to the chord: written once, on its first note.
    const articulations = i === 0 ? articulationsXml(el) : '';
    if (articulations) tied.push(articulations);
    out.push('<note>' +
      (isGrace ? `<grace${child(el, 'acciaccatura') ? ' slash="yes"' : ''}/>` : '') +
      (i > 0 ? '<chord/>' : '') +
      `<pitch><step>${STEPS[l]}</step>${a ? `<alter>${a}</alter>` : ''}<octave>${octave}</octave></pitch>` +
      common(isGrace) + ties + tail(tied) + '</note>');
  });
  return out;
}
