import { MusicNote, MusicScore } from '../types';

// Format-neutral representation shared by the MusicXML and MuseScore parsers.
// Positions are counted in quarter-note beats, not seconds: seconds depend on
// the tempo, which may be written in any part and must apply to all of them.

export interface MeasureNote {
  keyIndex: number;
  offset: number;      // beats from the start of the measure
  duration: number;    // beats
  tieStop: boolean;    // continues the previous note of the same pitch
  held?: number;       // share of the written length the key is held (staccato < 1)
  accent?: number;     // velocity factor of an accent mark (> 1)
}

export interface MeasureTempo {
  offset: number;      // beats from the start of the measure
  bpm: number;         // quarter notes per minute
}

// A dynamic mark. Momentary marks (sf, fz…) only affect the notes struck at
// their position; fp-like marks then fall back to a new level, `after`.
export interface MeasureDynamic {
  offset: number;
  velocity: number;    // 0–1
  momentary?: boolean;
  after?: number;
}

export interface MeasurePedal {
  offset: number;
  down: boolean;
}

// A hairpin (or cresc./dim. line) opens with 'cresc' or 'dim' and closes
// with 'end', possibly in a later measure.
export interface MeasureHairpin {
  offset: number;
  kind: 'cresc' | 'dim' | 'end';
}

export interface MeasureData {
  length: number;      // beats
  notes: MeasureNote[];
  tempos: MeasureTempo[];
  dynamics: MeasureDynamic[];
  hairpins: MeasureHairpin[];
  pedals: MeasurePedal[];
}

export const emptyMeasure = (): MeasureData =>
  ({ length: 0, notes: [], tempos: [], dynamics: [], hairpins: [], pedals: [] });

export interface MeasureRepeat {
  forward: boolean;          // a repeat section starts here
  backward: number;          // total times the section is played; 0 if none
  voltas: Volta[];           // voltas starting in this measure
  markers: string[];         // road-map signs in this measure: segno, coda, fine…
  jump: MeasureJump | null;  // D.C. or D.S., taken at the end of the measure
  sectionEnd: boolean;       // a section break follows: the next measure starts afresh
}

// A volta bracket over `length` measures. An open one (no closing hook)
// runs on to the next volta, through the next repeat barline, or to the end
// of the section.
export interface Volta {
  endings: number[];
  length: number;
  open: boolean;
}

// A jump names markers by label. "start" is the beginning of the score and
// "end" its end; an empty continueAt means no coda.
export interface MeasureJump {
  to: string;
  until: string;
  continueAt: string;
  playRepeats: boolean;      // repeats are played again after the jump
}

export const noRepeat = (): MeasureRepeat =>
  ({ forward: false, backward: 0, voltas: [], markers: [], jump: null, sectionEnd: false });

// Velocity when the score has no dynamic mark yet: mezzo-forte.
const DEFAULT_VELOCITY = 80 / 127;
const DEFAULT_BPM = 120;
// Guards against malformed repeat structures that would loop forever.
const MAX_PLAYED_MEASURES = 20000;
const EPSILON = 1e-6;

// MIDI velocities MuseScore gives each dynamic mark, used when a file names
// the mark without stating its velocity.
const DYNAMIC_MIDI: Record<string, number> = {
  pppppp: 1, ppppp: 5, pppp: 10, ppp: 16, pp: 33, p: 49, mp: 64,
  mf: 80, f: 96, ff: 112, fff: 126, ffff: 127, fffff: 127, ffffff: 127,
};
// Accent-like marks: loud on the note they sit on, then back to the level
// in force (sf…) or down to a new one (fp…).
const MOMENTARY_MIDI: Record<string, [number, number | undefined]> = {
  sf: [112, undefined], sfz: [112, undefined], sffz: [126, undefined],
  fz: [112, undefined], rf: [112, undefined], rfz: [112, undefined],
  fp: [96, 49], sfp: [112, 49], sfpp: [112, 33], pf: [49, 96],
};

/** Dynamic mark by name ("mf", "sfz"…), or null for an unknown one. */
export function dynamicMark(name: string, offset: number, midiVelocity?: number): MeasureDynamic | null {
  const mark = name.toLowerCase();
  if (mark in DYNAMIC_MIDI) {
    return { offset, velocity: (midiVelocity ?? DYNAMIC_MIDI[mark]) / 127 };
  }
  if (mark in MOMENTARY_MIDI) {
    const [hit, after] = MOMENTARY_MIDI[mark];
    return { offset, velocity: (midiVelocity ?? hit) / 127, momentary: true,
             after: after === undefined ? undefined : after / 127 };
  }
  return null;
}

/**
 * Order in which measures are played, repeats, voltas and jumps unrolled,
 * following MuseScore's rules.
 *
 * Sections (separated by section breaks) are played one after the other,
 * each on its own: repeats and jumps never leave their section.
 */
export function playbackOrder(repeats: MeasureRepeat[]): number[] {
  const order: number[] = [];
  let start = 0;
  repeats.forEach((r, i) => {
    if (r.sectionEnd || i === repeats.length - 1) {
      order.push(...playSection(repeats, start, i + 1));
      start = i + 1;
    }
  });
  return order.slice(0, MAX_PLAYED_MEASURES);
}

/**
 * Measures `from` to `to` (excluded) in playing order.
 *
 * A repeat barline sends playback back to the last start-repeat barline, or
 * to the start of the section; `:|N` does so N - 1 times at most. Each
 * return counts one more pass through that repeat, and the pass selects the
 * voltas: a measure plays only if every volta over it lists the pass. A
 * volta that cannot play, with no repeat barline left after it, sends
 * playback to the next volta that can — or to the end of the section.
 *
 * A jump (D.C., D.S.) is taken once, on the last pass through its measure.
 * Playback then goes on until the marker it names — Fine, where the section
 * ends, or To Coda, where it continues at the coda. Unless the jump says
 * otherwise, the repeats of the stretch played again are not taken, and
 * each group of voltas there gives only its last ending; past the jump,
 * repeats play as usual.
 */
function playSection(repeats: MeasureRepeat[], from: number, to: number): number[] {
  const order: number[] = [];
  const covers = voltaCoverage(repeats, from, to);
  const lastEnding = covers.map((_, k) => groupLastEnding(covers, k));
  const group = voltaGroups(covers);
  const used = new Map<number, number>();       // times each repeat barline was taken
  const jumpsTaken = new Set<number>();
  let repeatStart = from;
  let pass = 1;
  let road: { from: number; until: number | null; coda: number | null; playRepeats: boolean } | null = null;

  // Markers are looked for in this section only.
  const markers = (label: string) => {
    const found: number[] = [];
    for (let m = from; m < to; m++) if (repeats[m].markers.includes(label)) found.push(m);
    return found;
  };
  const endRepeatFrom = (i: number) => repeats.slice(i, to).some(r => r.backward > 0);
  const plays = (k: number, volta: number) => covers[k - from].every(e => e.includes(volta));
  // Whether the repeat barlines still to come will bring playback back
  // through measure i: then this is not the last pass through it.
  const comesBack = (i: number) => {
    let passesLeft = 0;
    for (let j = i; j < to && (j === i || !repeats[j].forward); j++) {
      const b = repeats[j].backward;
      if (b > 0) passesLeft += Math.max(0, b - 1 - (used.get(j) ?? 0));
    }
    for (let p = pass + 1; p <= pass + passesLeft; p++) if (plays(i, p)) return true;
    return false;
  };

  for (let i = from; i < to && order.length < MAX_PLAYED_MEASURES; ) {
    const r = repeats[i];
    const repeatsOn = !road || road.playRepeats || i > road.from;
    // The volta group holding the jump gives its last ending too, even
    // past the jump.
    const finalEnding = !repeatsOn || (road && !road.playRepeats && group[i - from] > 0
      && group[i - from] === group[road.from - from]);
    const volta = finalEnding ? lastEnding[i - from] : pass;
    // A start-repeat barline opens a new repeat — once the volta that may
    // begin on the same measure has been chosen with the pass it closes.
    const opens = repeatsOn && r.forward && i !== repeatStart;
    if (opens && plays(i, volta)) {
      repeatStart = i;
      pass = 1;
    }
    if (!plays(i, volta)) {
      if (!repeatsOn || endRepeatFrom(i)) { i++; continue; }
      let next = i + 1;
      while (next < to && !(covers[next - from].length && plays(next, volta))) next++;
      i = next;
      continue;
    }
    order.push(i);

    // The end of the road after a jump: Fine, or To Coda.
    if (road && road.until === i && !(repeatsOn && comesBack(i))) {
      if (road.coda === null) break;
      i = road.coda;
      road = null;
      repeatStart = i;
      pass = 1;
      continue;
    }

    const jump = r.jump;
    // On its last pass, a jump wins over the repeat barline of its measure.
    if (jump && !jumpsTaken.has(i) && !(repeatsOn && comesBack(i))) {
      jumpsTaken.add(i);
      // The segno is the nearest one before the jump; Fine, To Coda and the
      // coda are the first ones after it.
      const segnos = markers(jump.to);
      const target = jump.to === 'start' ? from
        : segnos.filter(m => m <= i).pop() ?? segnos[0] ?? null;
      if (target !== null) {
        const ends = jump.until === 'end' ? [] : markers(jump.until);
        const until = ends.find(m => m >= target) ?? ends[0] ?? null;
        const codas = jump.continueAt ? markers(jump.continueAt) : [];
        road = {
          from: i,
          until,
          coda: until === null ? null : codas.find(m => m > i) ?? codas[0] ?? null,
          playRepeats: jump.playRepeats,
        };
        if (jump.playRepeats) used.clear();
        i = target;
        // With repeats played, the repeat in force is the last one opened
        // before the target.
        repeatStart = target;
        if (jump.playRepeats) {
          while (repeatStart > from && !repeats[repeatStart].forward) repeatStart--;
        }
        pass = 1;
        continue;
      }
    }

    if (repeatsOn && r.backward > 0 && (used.get(i) ?? 0) < r.backward - 1) {
      used.set(i, (used.get(i) ?? 0) + 1);
      pass++;
      i = repeatStart;
      continue;
    }

    i++;
  }
  return order;
}

// For each measure of the section, the endings of every volta over it.
function voltaCoverage(repeats: MeasureRepeat[], from: number, to: number): number[][][] {
  const covers: number[][][] = Array.from({ length: to - from }, () => []);
  for (let i = from; i < to; i++) {
    for (const v of repeats[i].voltas) {
      let end = Math.min(to, i + Math.max(1, v.length));
      // An open volta reaches the next repeat barline, if no other volta or
      // start-repeat barline comes first (or opens it).
      if (v.open && !repeats[i].forward) {
        for (let j = i; j < to; j++) {
          if (j > i && (repeats[j].voltas.length || repeats[j].forward)) break;
          if (repeats[j].backward > 0) { end = Math.max(end, j + 1); break; }
        }
      }
      for (let k = i; k < end; k++) covers[k - from].push(v.endings);
    }
  }
  return covers;
}

// Volta groups: runs of consecutive measures under voltas, numbered from 1;
// 0 outside any volta.
function voltaGroups(covers: number[][][]): number[] {
  let n = 0;
  return covers.map((c, k) => (c.length ? (k > 0 && covers[k - 1].length ? n : ++n) : 0));
}

// The last ending of the volta group a measure belongs to: the one played
// when repeats are not taken.
function groupLastEnding(covers: number[][][], k: number): number {
  if (!covers[k].length) return 0;
  let first = k;
  let last = k;
  while (first > 0 && covers[first - 1].length) first--;
  while (last < covers.length - 1 && covers[last + 1].length) last++;
  return Math.max(...covers.slice(first, last + 1).flat(2));
}

/**
 * Lays out every part along the unrolled measure order and converts beats to
 * seconds through a tempo map gathered from all parts.
 *
 * `groups` gives, for each part, the instrument it belongs to: the staves of
 * one piano share their dynamics and their pedal. By default each part is
 * its own instrument.
 */
export function buildScore(title: string, parts: MeasureData[][], repeats: MeasureRepeat[],
                           groups: number[] = parts.map((_, i) => i)): MusicScore {
  const order = playbackOrder(repeats);
  const measureCount = Math.max(0, ...parts.map(p => p.length));

  // Parts must stay aligned: a measure lasts as long as its longest part,
  // even if another part leaves its last beats unwritten.
  const lengths: number[] = [];
  for (let m = 0; m < measureCount; m++) {
    lengths.push(Math.max(0, ...parts.map(p => p[m]?.length ?? 0)));
  }
  const measureStarts: number[] = [];
  let end = 0;
  for (const m of order) {
    measureStarts.push(end);
    end += lengths[m];
  }

  // Tempo marks, dynamics and pedal, in beats from the start of the performance.
  const tempos: MeasureTempo[] = [];
  const dynamics = new Map<number, MeasureDynamic[]>();
  const hairpins = new Map<number, MeasureHairpin[]>();
  const pedals = new Map<number, MeasurePedal[]>();
  parts.forEach((part, p) => {
    const group = groups[p];
    if (!dynamics.has(group)) { dynamics.set(group, []); hairpins.set(group, []); pedals.set(group, []); }
    order.forEach((m, k) => {
      const measure = part[m];
      if (!measure) return;
      const at = measureStarts[k];
      for (const t of measure.tempos) tempos.push({ ...t, offset: at + t.offset });
      for (const d of measure.dynamics) dynamics.get(group)!.push({ ...d, offset: at + d.offset });
      for (const h of measure.hairpins) hairpins.get(group)!.push({ ...h, offset: at + h.offset });
      for (const e of measure.pedals) pedals.get(group)!.push({ ...e, offset: at + e.offset });
    });
  });
  const toSeconds = tempoMap(tempos);
  const pedalUp = new Map([...pedals].map(([g, events]) => [g, pedalReleases(events, end)]));

  const notes: MusicNote[] = [];
  parts.forEach((part, p) => {
    const group = groups[p];
    const velocityAt = dynamicsCurve(dynamics.get(group)!, hairpins.get(group)!, end);
    const damperFall = pedalUp.get(group)!;
    // Tied notes extend the latest note of the same pitch in this part only.
    const lastByKey = new Map<number, { start: number; release: number; velocity: number }>();
    const beatNotes: { keyIndex: number; start: number; release: number; velocity: number }[] = [];

    order.forEach((m, k) => {
      for (const n of part[m]?.notes ?? []) {
        const start = measureStarts[k] + n.offset;
        const release = start + n.duration * (n.held ?? 1);
        const tied = n.tieStop ? lastByKey.get(n.keyIndex) : undefined;
        if (tied) {
          tied.release = release;
        } else {
          const velocity = Math.max(0.05, Math.min(1, velocityAt(start) * (n.accent ?? 1)));
          const note = { keyIndex: n.keyIndex, start, release, velocity };
          beatNotes.push(note);
          lastByKey.set(n.keyIndex, note);
        }
      }
    });

    for (const n of beatNotes) {
      const time = toSeconds(n.start);
      notes.push({
        keyIndex: n.keyIndex,
        time,
        // A key released while the pedal is down keeps sounding until the
        // pedal lifts.
        duration: toSeconds(damperFall(n.release)) - time,
        velocity: n.velocity,
      });
    }
  });

  return {
    id: `imported-${Date.now()}`,
    title,
    thumbnail: '🎼',
    notes: notes.sort((a, b) => a.time - b.time),
  };
}

// The level in force at a beat from the dynamic marks alone, and the
// velocity of a momentary mark (sf…) struck exactly there, if any.
function markLevel(marks: MeasureDynamic[], beat: number): { level: number; hit?: number } {
  let level = DEFAULT_VELOCITY;
  let hit: number | undefined;
  for (const mark of marks) {
    if (mark.offset > beat + EPSILON) break;
    if (!mark.momentary) level = mark.velocity;
    else if (mark.after !== undefined) level = mark.after;
    hit = mark.momentary && Math.abs(mark.offset - beat) < EPSILON ? mark.velocity : undefined;
  }
  return { level, hit };
}

// Dynamic levels a hairpin moves between when no mark tells it where to go.
const LEVELS = [16, 33, 49, 64, 80, 96, 112, 126].map(v => v / 127);

function nextLevel(velocity: number, direction: number): number {
  const margin = 0.5 / 127;
  return direction > 0
    ? LEVELS.find(l => l > velocity + margin) ?? 1
    : [...LEVELS].reverse().find(l => l < velocity - margin) ?? LEVELS[0];
}

/**
 * Velocity at any beat, from dynamic marks and hairpins, as MuseScore plays
 * them: a hairpin moves linearly from the level in force where it starts to
 * the mark at its end — if that mark goes the hairpin's way; otherwise, or
 * without a mark, to the next dynamic level (mf → f). A mark written inside
 * the hairpin ends it there. Without a mark at its end, the level reached
 * holds until the next mark.
 */
function dynamicsCurve(marks: MeasureDynamic[], hairpins: MeasureHairpin[], end: number): (beat: number) => number {
  const sorted = [...marks].sort((a, b) => a.offset - b.offset);
  const steady = sorted.filter(m => !m.momentary || m.after !== undefined);
  const ramps: { start: number; end: number; from: number; to: number }[] = [];

  const valueAt = (beat: number): number => {
    const { level, hit } = markLevel(sorted, beat);
    if (hit !== undefined) return hit;
    const ramp = ramps.find(r => beat >= r.start - EPSILON && beat < r.end - EPSILON);
    return ramp ? ramp.from + (ramp.to - ramp.from) * (beat - ramp.start) / (ramp.end - ramp.start) : level;
  };

  // Pair each opening with the next closing; an unclosed hairpin runs until
  // the next one opens, or to the end of the score.
  const spans: { kind: 'cresc' | 'dim'; start: number; end: number }[] = [];
  let open: { kind: 'cresc' | 'dim'; start: number } | null = null;
  const events = [...hairpins].sort((a, b) => a.offset - b.offset || Number(a.kind !== 'end') - Number(b.kind !== 'end'));
  for (const h of events) {
    if (open && h.offset > open.start + EPSILON) spans.push({ ...open, end: h.offset });
    if (h.kind === 'end') open = null;
    else if (!open || h.offset > open.start + EPSILON) open = { kind: h.kind, start: h.offset };
  }
  if (open && end > open.start + EPSILON) spans.push({ ...open, end });

  for (const span of spans) {
    const from = valueAt(span.start);
    const cut = steady.find(m => m.offset > span.start + EPSILON && m.offset < span.end - EPSILON);
    const stop = cut ? cut.offset : span.end;
    const markAtStop = steady.find(m => Math.abs(m.offset - stop) < EPSILON);
    const direction = span.kind === 'cresc' ? 1 : -1;
    const to = markAtStop && Math.sign(markAtStop.velocity - from) === direction
      ? markAtStop.velocity
      : nextLevel(from, direction);
    ramps.push({ start: span.start, end: stop, from, to });
    // The level reached holds after the hairpin, unless a mark takes over.
    if (!markAtStop) {
      sorted.push({ offset: stop, velocity: to });
      sorted.sort((a, b) => a.offset - b.offset);
    }
  }
  return valueAt;
}

// Returns, for a key released at a given beat, when its damper actually
// falls: at once, or when the sustain pedal next lifts. A pedal still down
// at the end holds until the end of the score.
function pedalReleases(events: MeasurePedal[], end: number): (beat: number) => number {
  const held: [number, number][] = [];
  let downAt: number | null = null;
  // At equal positions the lift comes first: a pedal change is up, then down.
  for (const e of [...events].sort((a, b) => a.offset - b.offset || Number(a.down) - Number(b.down))) {
    if (e.down && downAt === null) downAt = e.offset;
    if (!e.down && downAt !== null) { held.push([downAt, e.offset]); downAt = null; }
  }
  if (downAt !== null) held.push([downAt, end]);
  // A key released at the very moment the pedal goes down is not caught: this
  // is what a pedal change is for, clearing the previous harmony.
  return (beat: number) => {
    const span = held.find(([down, up]) => beat > down + EPSILON && beat < up);
    return span ? span[1] : beat;
  };
}

// Piecewise-linear beat → seconds conversion. Before the first tempo mark,
// the score plays at that mark's tempo (or 120 bpm if there is none).
function tempoMap(tempos: MeasureTempo[]): (beat: number) => number {
  const marks = tempos.filter(t => t.bpm > 0).sort((a, b) => a.offset - b.offset);
  const segments: { beat: number; seconds: number; secondsPerBeat: number }[] = [
    { beat: 0, seconds: 0, secondsPerBeat: 60 / (marks[0]?.bpm ?? DEFAULT_BPM) },
  ];
  for (const mark of marks) {
    const prev = segments[segments.length - 1];
    const seconds = prev.seconds + (mark.offset - prev.beat) * prev.secondsPerBeat;
    segments.push({ beat: mark.offset, seconds, secondsPerBeat: 60 / mark.bpm });
  }
  return (beat: number) => {
    let s = segments[0];
    for (const seg of segments) {
      if (seg.beat > beat) break;
      s = seg;
    }
    return s.seconds + (beat - s.beat) * s.secondsPerBeat;
  };
}
