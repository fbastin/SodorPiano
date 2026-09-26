import { MusicScore } from '../types';
import { MeasureData, MeasureNote, MeasureRepeat, buildScore, dynamicMark, emptyMeasure, noRepeat, playbackOrder } from './timeline';

// Native MuseScore format (.mscx, and the .mscx inside a .mscz archive), as
// written by MuseScore 2, 3 and 4. Unlike MusicXML it stores MIDI pitches and
// symbolic durations, and it keeps octave marks (8va…) out of the pitch.

const DURATION_BEATS: Record<string, number> = {
  'long': 16, 'breve': 8, 'whole': 4, 'half': 2, 'quarter': 1, 'eighth': 0.5,
  '16th': 1 / 4, '32nd': 1 / 8, '64th': 1 / 16, '128th': 1 / 32,
  '256th': 1 / 64, '512th': 1 / 128, '1024th': 1 / 256,
};

const OTTAVA_SHIFT: Record<string, number> = {
  '8va': 12, '8vb': -12, '15ma': 24, '15mb': -24, '22ma': 36, '22mb': -36,
};

const GRACE_TAG = /^(acciaccatura|appoggiatura|grace\d+(after)?)$/;
const GRACE_BEATS = 0.125;

// MIDI note 21 is A0, the lowest piano key.
const MIDI_A0 = 21;

const children = (el: Element, tag?: string): Element[] =>
  Array.from(el.children).filter(c => !tag || c.tagName === tag);

const child = (el: Element, tag: string): Element | undefined =>
  children(el, tag)[0];

const childText = (el: Element, tag: string): string | undefined =>
  child(el, tag)?.textContent?.trim();

// "3/8" → 1.5 beats (quarter notes).
const fractionBeats = (text: string | undefined): number => {
  const [n, d] = (text ?? '').split('/').map(Number);
  return n && d ? (n / d) * 4 : 0;
};

export const parseMscx = (xmlString: string): MusicScore => {
  const { score, staffElements, staves, partOf } = readScore(xmlString);
  // Staves of the same instrument (the two staves of a piano) share their
  // dynamics and pedal marks.
  const division = Number(childText(score, 'Division')) || 480;
  return buildScore(scoreTitle(score), staves.map(m => parseStaff(m, division)), parseRepeats(staves),
                    staffElements.map((s, i) => partOf.get(s.getAttribute('id') ?? '') ?? -1 - i));
};

/** Measures in the order they are played (indices from 0), for checking. */
export const mscxMeasureOrder = (xmlString: string): number[] =>
  playbackOrder(parseRepeats(readScore(xmlString).staves));

function readScore(xmlString: string) {
  const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('The file is not valid XML');

  const root = doc.documentElement;
  const version = parseFloat(root.getAttribute('version') ?? '0');
  if (root.tagName !== 'museScore') throw new Error('Not a MuseScore file');
  if (version < 2) {
    throw new Error('MuseScore 1 files are not supported; open and save the score in a later version of MuseScore');
  }

  // MuseScore 3 nests part excerpts as further <Score> elements: only the
  // direct children of the main score belong to the full score.
  const score = child(root, 'Score');
  if (!score) throw new Error('No score found in the MuseScore file');

  const { percussion, partOf } = staffParts(score);
  const staffElements = children(score, 'Staff')
    .filter(s => !percussion.has(s.getAttribute('id') ?? ''));
  const staves = staffElements.map(s => children(s, 'Measure'));
  return { score, staffElements, staves, partOf };
}

function scoreTitle(score: Element): string {
  const meta = children(score, 'metaTag').find(m => m.getAttribute('name') === 'workTitle');
  if (meta?.textContent?.trim()) return meta.textContent.trim();
  // Otherwise the title text frame at the top of the first staff.
  for (const text of Array.from(score.querySelectorAll(':scope > Staff > VBox > Text'))) {
    if (childText(text, 'style')?.toLowerCase() === 'title') {
      const title = child(text, 'text')?.textContent?.trim();
      if (title) return title;
    }
  }
  return 'Imported Melody';
}

// Which instrument each staff belongs to. Drum staves hold note-head
// positions, not pitches: they are left out.
function staffParts(score: Element): { percussion: Set<string>; partOf: Map<string, number> } {
  const percussion = new Set<string>();
  const partOf = new Map<string, number>();
  children(score, 'Part').forEach((part, p) => {
    for (const staff of children(part, 'Staff')) {
      const id = staff.getAttribute('id') ?? '';
      partOf.set(id, p);
      if (child(staff, 'StaffType')?.getAttribute('group') === 'percussion') percussion.add(id);
    }
  });
  return { percussion, partOf };
}

// Share of the written length a key stays down, and velocity factor, by
// articulation (symbol names such as articStaccatoAbove). These are the
// defaults MuseScore gives the piano.
// MuseScore 2 names them in lower case: staccato, sforzato (the accent)…
const HELD: [RegExp, number][] = [
  [/staccatissimo/i, 0.33], [/(?<!tenuto)staccato/i, 0.5], [/tenutoStaccato|portato/i, 0.67],
  [/marcato(?!tenuto)/i, 0.67], [/tenuto/i, 1],
];
const ACCENT: [RegExp, number][] = [[/accent|sforzato/i, 1.5], [/marcato/i, 1.2]];

function articulation(chord: Element): Pick<MeasureNote, 'held' | 'accent'> {
  const result: Pick<MeasureNote, 'held' | 'accent'> = {};
  for (const artic of children(chord, 'Articulation')) {
    // The score may silence an articulation's effect on playback.
    if (childText(artic, 'play') === '0') continue;
    const name = childText(artic, 'subtype') ?? '';
    const held = HELD.filter(([re]) => re.test(name)).map(([, v]) => v);
    if (held.length) result.held = Math.min(result.held ?? 1, ...held);
    const accent = ACCENT.filter(([re]) => re.test(name)).map(([, v]) => v);
    if (accent.length) result.accent = Math.max(result.accent ?? 1, ...accent);
  }
  return result;
}

// A spanner (octave mark, pedal line) from its start to where it ends,
// as measure index and beats into that measure.
interface Span {
  startMeasure: number;
  startBeat: number;
  endMeasure: number;
  endBeat: number;
}

interface Ottava extends Span {
  shift: number;
}

// MuseScore writes the end of a spanner relative to its start: a number of
// measures further, and a shift within the measure.
function spanOf(spanner: Element, measure: number, beat: number): Span {
  const loc = child(child(spanner, 'next') ?? spanner, 'location');
  return {
    startMeasure: measure,
    startBeat: beat,
    endMeasure: measure + (Number(loc && childText(loc, 'measures')) || 0),
    endBeat: beat + fractionBeats(loc && childText(loc, 'fractions')),
  };
}

// `division`: ticks per quarter note, for the absolute positions of MuseScore 2.
function parseStaff(measures: Element[], division: number): MeasureData[] {
  let timeSigBeats = 4;   // length of the measure, the same on every staff
  // A local time signature (18/16 on one staff against 3/4 on the others)
  // squeezes this staff's notes into the common measure: written durations
  // are divided by the ratio local / global.
  let stretch = 1;
  let measureStart = 0;   // beats from the start of the score, repeats not unrolled
  const ottavas: Ottava[] = [];
  const pedals: Span[] = [];
  const hairpins: (Span & { kind: 'cresc' | 'dim' })[] = [];
  // Files from MuseScore 2 and 3.0 write spanners as <Pedal id="…"> …
  // <endSpanner id="…"/>, the end being wherever the closing tag stands.
  const openById = new Map<string, { measure: number; beat: number; element: Element }>();

  const data = measures.map((measure, index) => {
    const out = emptyMeasure();
    // Voices are wrapped in <voice> since MuseScore 3; without them the
    // measure holds a single voice.
    const voices = children(measure, 'voice');
    let maxTime = 0;

    for (const voice of voices.length ? voices : [measure]) {
      let time = 0;
      // Tuplets: MuseScore 4 brackets them with <Tuplet>…<endTuplet/>;
      // MuseScore 3 defines them by id and each chord refers to its tuplet.
      const tupletStack: number[] = [];
      const tupletById = new Map<string, number>();
      const tupletRatio = (el: Element) => {
        const ref = childText(el, 'Tuplet');
        if (ref && tupletById.has(ref)) return tupletById.get(ref)!;
        return tupletStack.reduce((a, b) => a * b, 1);
      };

      for (const el of children(voice)) {
        switch (el.tagName) {
          case 'TimeSig': {
            const n = Number(childText(el, 'sigN'));
            const d = Number(childText(el, 'sigD'));
            const sn = Number(childText(el, 'stretchN'));
            const sd = Number(childText(el, 'stretchD'));
            stretch = sn && sd ? sn / sd : 1;
            if (n && d) timeSigBeats = (n / d) * 4 / stretch;
            break;
          }
          case 'Tempo': {
            // Stored in quarter notes per second.
            const qps = parseFloat(childText(el, 'tempo') ?? '');
            if (qps > 0) out.tempos.push({ offset: time, bpm: qps * 60 });
            break;
          }
          case 'tick':
            // MuseScore 2 writes voices one after the other, each starting
            // with its absolute position in the score.
            time = Number(el.textContent) / division - measureStart;
            break;
          case 'location':
            time += fractionBeats(childText(el, 'fractions'));
            break;
          case 'Tuplet': {
            const normal = Number(childText(el, 'normalNotes'));
            const actual = Number(childText(el, 'actualNotes'));
            if (normal && actual) {
              const id = el.getAttribute('id');
              if (id) tupletById.set(id, normal / actual);
              else tupletStack.push(normal / actual);
            }
            break;
          }
          case 'endTuplet':
            tupletStack.pop();
            break;
          case 'Dynamic': {
            const velocity = Number(childText(el, 'velocity'));
            const mark = dynamicMark(childText(el, 'subtype') ?? '', time,
                                     velocity > 0 ? velocity : undefined);
            if (mark) out.dynamics.push(mark);
            break;
          }
          case 'Pedal':
          case 'Ottava':
          case 'HairPin': {
            const id = el.getAttribute('id');
            if (id) openById.set(id, { measure: index, beat: time, element: el });
            break;
          }
          case 'endSpanner': {
            const open = openById.get(el.getAttribute('id') ?? '');
            if (!open) break;
            openById.delete(el.getAttribute('id') ?? '');
            const span = { startMeasure: open.measure, startBeat: open.beat, endMeasure: index, endBeat: time };
            const start = open.element;
            if (start.tagName === 'Pedal') pedals.push(span);
            if (start.tagName === 'Ottava') {
              ottavas.push({ ...span, shift: OTTAVA_SHIFT[childText(start, 'subtype') ?? ''] ?? 0 });
            }
            if (start.tagName === 'HairPin') hairpins.push({ ...span, kind: hairpinKind(start) });
            break;
          }
          case 'Spanner': {
            // Only the opening half of a spanner holds its properties.
            const ottava = child(el, 'Ottava');
            if (el.getAttribute('type') === 'Ottava' && ottava) {
              ottavas.push({
                ...spanOf(el, index, time),
                shift: OTTAVA_SHIFT[childText(ottava, 'subtype') ?? ''] ?? 0,
              });
            }
            if (el.getAttribute('type') === 'Pedal' && child(el, 'Pedal')) {
              pedals.push(spanOf(el, index, time));
            }
            const hairpin = child(el, 'HairPin');
            if (el.getAttribute('type') === 'HairPin' && hairpin) {
              hairpins.push({ ...spanOf(el, index, time), kind: hairpinKind(hairpin) });
            }
            break;
          }
          case 'Rest':
          case 'Chord': {
            const isGrace = children(el).some(c => GRACE_TAG.test(c.tagName));
            const beats = isGrace ? 0 : durationBeats(el, timeSigBeats * stretch) * tupletRatio(el) / stretch;
            if (el.tagName === 'Chord') {
              for (const note of children(el, 'Note')) {
                if (childText(note, 'play') === '0') continue;
                const pitch = Number(childText(note, 'pitch'));
                if (!Number.isFinite(pitch)) continue;
                out.notes.push({
                  keyIndex: pitch - MIDI_A0,
                  offset: time,
                  duration: isGrace ? GRACE_BEATS : beats,
                  tieStop: isTieStop(note),
                  ...articulation(el),
                });
              }
            }
            time += beats;
            break;
          }
        }
        maxTime = Math.max(maxTime, time);
      }
    }

    // A pickup or otherwise irregular measure states its actual length.
    out.length = fractionBeats(measure.getAttribute('len') ?? undefined) || timeSigBeats || maxTime;
    measureStart += out.length;
    return out;
  });

  applyOttavas(data, ottavas);
  // Pedal lines and hairpins become a start and an end event; the end may
  // fall in a later measure, or after the last one.
  for (const p of pedals) {
    data[p.startMeasure]?.pedals.push({ offset: p.startBeat, down: true });
    const end = spanEnd(data, p);
    data[end.measure].pedals.push({ offset: end.beat, down: false });
  }
  for (const h of hairpins) {
    data[h.startMeasure]?.hairpins.push({ offset: h.startBeat, kind: h.kind });
    const end = spanEnd(data, h);
    data[end.measure].hairpins.push({ offset: end.beat, kind: 'end' });
  }
  for (const measure of data) {
    measure.notes = measure.notes.filter(n => n.keyIndex >= 0 && n.keyIndex < 88);
  }
  return data;
}

// Where a spanner ends, as a measure of this staff and a beat in it. An end
// at the very start of a measure belongs to the end of the one before: the
// two differ when a repeat barline stands between them.
function spanEnd(data: MeasureData[], span: Span): { measure: number; beat: number } {
  let measure = Math.min(span.endMeasure, data.length);
  let beat = measure < data.length ? span.endBeat : 0;
  while (measure > span.startMeasure && beat <= 0) {
    measure--;
    beat += data[measure].length;
  }
  return { measure, beat };
}

// Subtypes 0 and 2 grow (hairpin, "cresc." line), 1 and 3 shrink.
const hairpinKind = (hairpin: Element): 'cresc' | 'dim' =>
  Number(childText(hairpin, 'subtype') ?? 0) % 2 === 0 ? 'cresc' : 'dim';

function durationBeats(el: Element, measureBeats: number): number {
  const type = childText(el, 'durationType') ?? 'quarter';
  // Full-measure rests give their length explicitly, as a fraction.
  if (type === 'measure') return fractionBeats(childText(el, 'duration')) || measureBeats;
  const base = DURATION_BEATS[type] ?? 1;
  const dots = Number(childText(el, 'dots')) || 0;
  return base * (2 - Math.pow(2, -dots));
}

// A note ending a tie points back to its start: <Spanner type="Tie"><prev>
// in MuseScore 3.1+ and 4, <endSpanner> in earlier 3.x files.
function isTieStop(note: Element): boolean {
  return children(note, 'Spanner').some(s => s.getAttribute('type') === 'Tie' && child(s, 'prev'))
      || child(note, 'endSpanner') !== undefined;
}

function applyOttavas(data: MeasureData[], ottavas: Ottava[]) {
  const before = (m1: number, b1: number, m2: number, b2: number) =>
    m1 < m2 || (m1 === m2 && b1 < b2);
  data.forEach((measure, m) => {
    for (const note of measure.notes) {
      for (const o of ottavas) {
        if (!before(m, note.offset, o.startMeasure, o.startBeat) &&
            before(m, note.offset, o.endMeasure, o.endBeat)) {
          note.keyIndex += o.shift;
        }
      }
    }
  });
}

// Repeat marks sit on the measures of every staff; voltas usually only on
// the top one. All staves are merged so that none is missed.
function parseRepeats(staves: Element[][]): MeasureRepeat[] {
  const count = Math.max(0, ...staves.map(s => s.length));
  const repeats = Array.from({ length: count }, noRepeat);

  for (const measures of staves) {
    const openVoltas = new Map<string, { start: number; endings: number[]; isOpen: boolean }>();
    measures.forEach((measure, i) => {
      if (child(measure, 'startRepeat')) repeats[i].forward = true;
      const end = child(measure, 'endRepeat');
      if (end) repeats[i].backward = parseInt(end.textContent ?? '', 10) || 2;

      // Road map: segno, coda, fine… markers, and D.C. / D.S. jumps, all
      // referring to each other by label.
      for (const marker of children(measure, 'Marker')) {
        const label = childText(marker, 'label');
        if (label && !repeats[i].markers.includes(label)) repeats[i].markers.push(label);
      }
      const jump = child(measure, 'Jump');
      if (jump && childText(jump, 'jumpTo')) {
        repeats[i].jump = {
          to: childText(jump, 'jumpTo')!,
          until: childText(jump, 'playUntil') || 'end',
          continueAt: childText(jump, 'continueAt') ?? '',
          playRepeats: childText(jump, 'playRepeats') === '1',
        };
      }

      // MuseScore 3.0 files: <Volta id="…"> closed by <endSpanner id="…"/>.
      // An end written before the first note of a measure leaves that
      // measure out of the volta.
      for (const el of children(measure)) {
        if (el.tagName === 'Volta' && el.getAttribute('id')) {
          openVoltas.set(el.getAttribute('id')!, { start: i, endings: voltaEndings(el), isOpen: voltaIsOpen(el) });
        }
        const open = el.tagName === 'endSpanner' ? openVoltas.get(el.getAttribute('id') ?? '') : undefined;
        if (open) {
          openVoltas.delete(el.getAttribute('id')!);
          const beforeNotes = !children(measure).slice(0, children(measure).indexOf(el))
            .some(c => c.tagName === 'Chord' || c.tagName === 'Rest');
          const length = (beforeNotes ? i : i + 1) - open.start;
          if (length > 0) repeats[open.start].voltas.push({ endings: open.endings, length, open: open.isOpen });
        }
      }

      for (const spanner of Array.from(measure.querySelectorAll(':scope > voice > Spanner[type="Volta"], :scope > Spanner[type="Volta"]'))) {
        const volta = child(spanner, 'Volta');
        if (!volta) continue;   // the closing half of the spanner
        const loc = child(child(spanner, 'next') ?? spanner, 'location');
        const length = Math.max(1, Number(loc && childText(loc, 'measures')) || 1);
        repeats[i].voltas.push({ endings: voltaEndings(volta), length, open: voltaIsOpen(volta) });
      }

      // A section break — on the measure, or on a frame before the next
      // measure — ends a section: numbering, repeats and jumps start afresh.
      for (let el: Element | null = measure; el && (el === measure || el.tagName !== 'Measure'); el = el.nextElementSibling) {
        if (children(el, 'LayoutBreak').some(b => childText(b, 'subtype') === 'section')) repeats[i].sectionEnd = true;
      }
    });
  }
  return repeats;
}

// A volta without a closing hook is open: it runs on to what follows.
const voltaIsOpen = (volta: Element): boolean => childText(volta, 'endHookType') !== '1';

const voltaEndings = (volta: Element): number[] =>
  (childText(volta, 'endings') ?? '1').split(/[\s,]+/).map(n => parseInt(n, 10)).filter(n => n > 0);
