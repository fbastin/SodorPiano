import { MusicScore } from '../types';
import { MeasureData, MeasureNote, MeasureRepeat, buildScore, dynamicMark, emptyMeasure, noRepeat } from './timeline';

const STEP_SEMITONES: Record<string, number> = {
  'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
};

// Grace notes take no time in the notation; they are sounded briefly, on the beat.
const GRACE_BEATS = 0.125;

// Share of the written length a key stays down, and velocity factor, by
// articulation: MuseScore's defaults for the piano, so that a score plays
// as it does in MuseScore.
const HELD: Record<string, number> = {
  'staccatissimo': 0.33, 'spiccato': 0.33, 'staccato': 0.5, 'detached-legato': 0.67,
  'strong-accent': 0.67, 'tenuto': 1,
};
const ACCENT: Record<string, number> = { 'accent': 1.5, 'strong-accent': 1.2 };

const childText = (el: Element, selector: string): string | undefined =>
  el.querySelector(selector)?.textContent ?? undefined;

const childNumber = (el: Element, selector: string, fallback: number): number => {
  const value = parseFloat(childText(el, selector) ?? '');
  return Number.isFinite(value) ? value : fallback;
};

export const parseMusicXml = (xmlString: string): MusicScore => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  if (xmlDoc.querySelector('parsererror')) {
    throw new Error('The file is not valid XML');
  }
  if (!xmlDoc.querySelector('score-partwise')) {
    throw new Error(xmlDoc.querySelector('score-timewise')
      ? 'Timewise MusicXML is not supported; export the score as partwise MusicXML'
      : 'Not a MusicXML score');
  }

  const title = xmlDoc.querySelector('work-title')?.textContent ||
                xmlDoc.querySelector('movement-title')?.textContent ||
                'Imported Melody';

  const parts = Array.from(xmlDoc.querySelectorAll('part'));
  const measuresOf = (part: Element) => Array.from(part.children).filter(c => c.tagName === 'measure');

  return buildScore(
    title,
    parts.map(part => parsePart(measuresOf(part))),
    parts.length ? parseRepeats(measuresOf(parts[0])) : [],
  );
};

function parsePart(measures: Element[]): MeasureData[] {
  // Divisions per quarter note carry over from one measure to the next.
  let divisions = 1;

  return measures.map(measure => {
    const data = emptyMeasure();
    let time = 0;          // in divisions
    let maxTime = 0;
    let lastStart = 0;     // start of the previous note, for chords
    // Articulations of the chord being read: MuseScore, among others,
    // writes them on its first note only.
    let chordMarks: ReturnType<typeof articulation> = {};

    // <sound> carries playback values: tempo, dynamics (as a percentage of
    // MIDI velocity 90) and the damper pedal.
    const addSound = (sound: Element | null, at: number, marked: { dynamic: boolean; pedal: boolean }) => {
      if (!sound) return;
      const offset = at / divisions;
      const bpm = parseFloat(sound.getAttribute('tempo') ?? '');
      if (bpm > 0) data.tempos.push({ offset, bpm });
      const dynamics = parseFloat(sound.getAttribute('dynamics') ?? '');
      if (dynamics >= 0 && !marked.dynamic) {
        data.dynamics.push({ offset, velocity: Math.min(1, dynamics * 0.9 / 127) });
      }
      const damper = sound.getAttribute('damper-pedal');
      if (damper && !marked.pedal) data.pedals.push({ offset, down: damper !== 'no' });
    };

    const addDirection = (direction: Element, at: number) => {
      const offset = at / divisions;
      const sound = direction.querySelector(':scope > sound');
      const soundDynamics = parseFloat(sound?.getAttribute('dynamics') ?? '');
      let dynamic = false;
      for (const mark of Array.from(direction.querySelectorAll('direction-type > dynamics > *'))) {
        // The <sound> element, when present, states the velocity actually meant.
        const d = dynamicMark(mark.tagName, offset,
          soundDynamics >= 0 ? Math.min(127, soundDynamics * 0.9) : undefined);
        if (d) { data.dynamics.push(d); dynamic = true; }
      }
      // Hairpins: <wedge type="crescendo|diminuendo|stop">.
      for (const wedge of Array.from(direction.querySelectorAll('direction-type > wedge'))) {
        const type = wedge.getAttribute('type');
        if (type === 'crescendo') data.hairpins.push({ offset, kind: 'cresc' });
        if (type === 'diminuendo') data.hairpins.push({ offset, kind: 'dim' });
        if (type === 'stop') data.hairpins.push({ offset, kind: 'end' });
      }
      let pedal = false;
      for (const mark of Array.from(direction.querySelectorAll('direction-type > pedal'))) {
        const type = mark.getAttribute('type');
        if (type === 'stop' || type === 'change') data.pedals.push({ offset, down: false });
        if (type === 'start' || type === 'change' || type === 'resume') data.pedals.push({ offset, down: true });
        if (type === 'discontinue') data.pedals.push({ offset, down: false });
        pedal = true;
      }
      addSound(sound, at, { dynamic, pedal });
    };

    for (const child of Array.from(measure.children)) {
      switch (child.tagName) {
        case 'attributes':
          divisions = childNumber(child, 'divisions', divisions);
          break;
        case 'direction':
          addDirection(child, time + childNumber(child, ':scope > offset', 0));
          break;
        case 'sound':
          addSound(child, time, { dynamic: false, pedal: false });
          break;
        case 'forward':
          time += childNumber(child, 'duration', 0);
          maxTime = Math.max(maxTime, time);
          break;
        case 'backup':
          time -= childNumber(child, 'duration', 0);
          break;
        case 'note': {
          if (child.querySelector('cue')) break;
          const isGrace = child.querySelector('grace') !== null;
          const isChord = child.querySelector('chord') !== null;
          const duration = isGrace ? 0 : childNumber(child, ':scope > duration', 0);
          // A chord note sounds with the previous note, which has already
          // advanced the clock.
          const start = isChord ? lastStart : time;

          const step = childText(child, 'pitch > step');
          if (child.querySelector('rest') === null && step && step in STEP_SEMITONES) {
            const octave = childNumber(child, 'pitch > octave', 4);
            const alter = Math.round(childNumber(child, 'pitch > alter', 0));
            const keyIndex = octave * 12 + STEP_SEMITONES[step] + alter - 9;
            if (keyIndex >= 0 && keyIndex < 88) {
              data.notes.push({
                keyIndex,
                offset: start / divisions,
                duration: isGrace ? GRACE_BEATS : duration / divisions,
                tieStop: child.querySelector('tie[type="stop"]') !== null,
                letter: 'CDEFGAB'.indexOf(step),
                alter,
                ...(isChord ? { ...chordMarks, ...articulation(child) } : (chordMarks = articulation(child))),
              });
            }
          }

          if (!isChord && !isGrace) {
            lastStart = time;
            time += duration;
            maxTime = Math.max(maxTime, time);
          }
          break;
        }
      }
    }

    data.length = maxTime / divisions;
    return data;
  });
}

function articulation(note: Element): Pick<MeasureNote, 'held' | 'accent'> {
  const result: Pick<MeasureNote, 'held' | 'accent'> = {};
  const marks = Array.from(note.querySelectorAll('notations > articulations > *'));
  // With a tenuto, a strong accent keeps the key down (MuseScore's marcato-tenuto).
  const tenuto = marks.some(m => m.tagName === 'tenuto');
  for (const mark of marks) {
    if (mark.tagName in HELD && !(tenuto && mark.tagName === 'strong-accent')) {
      result.held = Math.min(result.held ?? 1, HELD[mark.tagName]);
    }
    if (mark.tagName in ACCENT) result.accent = Math.max(result.accent ?? 1, ACCENT[mark.tagName]);
  }
  return result;
}

// Repeat barlines, volta brackets and the road map (segno, coda, fine,
// D.C., D.S.). Parts repeat the same structure, so the first part is read
// for all of them.
function parseRepeats(measures: Element[]): MeasureRepeat[] {
  const repeats = measures.map(() => noRepeat());
  let open: { start: number; endings: number[] } | null = null;
  const closeVolta = (end: number, isOpen: boolean) => {
    if (!open) return;
    repeats[open.start].voltas.push({ endings: open.endings, length: end - open.start + 1, open: isOpen });
    open = null;
  };

  measures.forEach((measure, i) => {
    const r = repeats[i];
    for (const barline of Array.from(measure.querySelectorAll(':scope > barline'))) {
      const repeat = barline.querySelector('repeat');
      if (repeat?.getAttribute('direction') === 'forward') r.forward = true;
      if (repeat?.getAttribute('direction') === 'backward') {
        r.backward = parseInt(repeat.getAttribute('times') ?? '', 10) || 2;
      }

      const ending = barline.querySelector('ending');
      if (!ending) continue;
      const type = ending.getAttribute('type');
      if (type === 'start') {
        closeVolta(i - 1, false);
        open = {
          start: i,
          endings: (ending.getAttribute('number') ?? '1')
            .split(/[\s,]+/).map(n => parseInt(n, 10)).filter(n => n > 0),
        };
      } else {
        // "stop" (closing hook) or "discontinue" (open end): this measure
        // is the last of the volta.
        closeVolta(i, type === 'discontinue');
      }
    }

    // <sound> carries the road map, wherever it stands in the measure.
    for (const sound of Array.from(measure.querySelectorAll('sound'))) {
      const segno = sound.getAttribute('segno');
      const coda = sound.getAttribute('coda');
      const toCoda = sound.getAttribute('tocoda');
      if (segno !== null) r.markers.push(`segno:${segno}`);
      if (coda !== null) r.markers.push(`coda:${coda}`);
      if (toCoda !== null) r.markers.push(`tocoda:${toCoda}`);
      if (sound.getAttribute('fine') !== null) r.markers.push('fine');
      const dalSegno = sound.getAttribute('dalsegno');
      if (sound.getAttribute('dacapo') === 'yes' || dalSegno !== null) {
        r.jump = { to: dalSegno !== null ? `segno:${dalSegno}` : 'start', until: 'end', continueAt: '', playRepeats: false };
      }
    }
  });
  closeVolta(measures.length - 1, true);

  // MusicXML does not say where a D.C. or D.S. stops: at a To Coda if the
  // score has one — continuing at the coda of the same name — or at Fine.
  const toCoda = repeats.flatMap(r => r.markers).find(m => m.startsWith('tocoda:'));
  const fine = repeats.some(r => r.markers.includes('fine'));
  for (const r of repeats) {
    if (!r.jump) continue;
    if (toCoda) {
      r.jump.until = toCoda;
      r.jump.continueAt = `coda:${toCoda.slice('tocoda:'.length)}`;
    } else if (fine) {
      r.jump.until = 'fine';
    }
  }
  return repeats;
}
