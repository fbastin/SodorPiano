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

export interface MeasureData {
  length: number;      // beats
  notes: MeasureNote[];
  tempos: MeasureTempo[];
  dynamics: MeasureDynamic[];
  pedals: MeasurePedal[];
}

export const emptyMeasure = (): MeasureData =>
  ({ length: 0, notes: [], tempos: [], dynamics: [], pedals: [] });

export interface MeasureRepeat {
  forward: boolean;          // a repeat section starts here
  backward: number;          // total times the section is played; 0 if none
  endings: number[] | null;  // volta numbers this measure belongs to
}

export const noRepeat = (): MeasureRepeat => ({ forward: false, backward: 0, endings: null });

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
 * Order in which measures are played, repeats and voltas unrolled.
 *
 * A pass counter selects the volta: on the second pass through a section,
 * measures of ending "1" are skipped and those of ending "2" played. Once
 * the section's last repeat is done, the counter keeps its final value for
 * the voltas that follow, and returns to 1 at the first measure outside
 * them, where the next section begins. A repeat barline inside a volta
 * jumps back to the start of the section, like any other.
 *
 * Each repeat barline is taken at most its written number of times, which
 * guarantees that playback ends. Nested repeats and jumps (D.C., D.S.,
 * coda) are not handled.
 */
export function playbackOrder(repeats: MeasureRepeat[]): number[] {
  const order: number[] = [];
  const timesPlayed = new Map<number, number>();
  let sectionStart = 0;
  let pass = 1;
  let repeatDone = false;   // past a repeat barline that will not be taken again

  for (let i = 0; i < repeats.length && order.length < MAX_PLAYED_MEASURES; ) {
    const r = repeats[i];

    if (repeatDone && !r.endings) {
      sectionStart = i;
      pass = 1;
      repeatDone = false;
    }
    // A start-repeat barline opens a new section, unless playback has just
    // jumped back to it.
    if (r.forward && i !== sectionStart) {
      sectionStart = i;
      pass = 1;
    }

    const skipped = r.endings !== null && !r.endings.includes(pass);
    if (!skipped) order.push(i);

    if (r.backward > 0) {
      const played = timesPlayed.get(i) ?? 1;
      // A repeat barline inside a skipped volta is not taken.
      if (!skipped && played < r.backward) {
        timesPlayed.set(i, played + 1);
        pass = played + 1;
        repeatDone = false;
        i = sectionStart;
        continue;
      }
      timesPlayed.set(i, r.backward);
      repeatDone = true;
    }
    i++;
  }
  return order;
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
  const pedals = new Map<number, MeasurePedal[]>();
  parts.forEach((part, p) => {
    const group = groups[p];
    if (!dynamics.has(group)) { dynamics.set(group, []); pedals.set(group, []); }
    order.forEach((m, k) => {
      const measure = part[m];
      if (!measure) return;
      const at = measureStarts[k];
      for (const t of measure.tempos) tempos.push({ ...t, offset: at + t.offset });
      for (const d of measure.dynamics) dynamics.get(group)!.push({ ...d, offset: at + d.offset });
      for (const e of measure.pedals) pedals.get(group)!.push({ ...e, offset: at + e.offset });
    });
  });
  const toSeconds = tempoMap(tempos);
  const pedalUp = new Map([...pedals].map(([g, events]) => [g, pedalReleases(events, end)]));

  const notes: MusicNote[] = [];
  parts.forEach((part, p) => {
    const group = groups[p];
    const marks = dynamics.get(group)!.sort((a, b) => a.offset - b.offset);
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
          const velocity = Math.max(0.05, Math.min(1, velocityAt(marks, start) * (n.accent ?? 1)));
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

function velocityAt(marks: MeasureDynamic[], beat: number): number {
  let level = DEFAULT_VELOCITY;
  let hit: number | undefined;
  for (const mark of marks) {
    if (mark.offset > beat + EPSILON) break;
    if (!mark.momentary) level = mark.velocity;
    else if (mark.after !== undefined) level = mark.after;
    hit = mark.momentary && Math.abs(mark.offset - beat) < EPSILON ? mark.velocity : undefined;
  }
  return hit ?? level;
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
