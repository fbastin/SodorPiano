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
                ...articulation(child),
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
  for (const mark of Array.from(note.querySelectorAll('notations > articulations > *'))) {
    if (mark.tagName in HELD) result.held = Math.min(result.held ?? 1, HELD[mark.tagName]);
    if (mark.tagName in ACCENT) result.accent = Math.max(result.accent ?? 1, ACCENT[mark.tagName]);
  }
  return result;
}

// Repeat barlines and volta brackets. Parts repeat the same structure, so the
// first part is read for all of them.
function parseRepeats(measures: Element[]): MeasureRepeat[] {
  let openEnding: number[] | null = null;

  return measures.map(measure => {
    const r = noRepeat();
    r.endings = openEnding;

    for (const barline of Array.from(measure.querySelectorAll(':scope > barline'))) {
      const repeat = barline.querySelector('repeat');
      if (repeat?.getAttribute('direction') === 'forward') r.forward = true;
      if (repeat?.getAttribute('direction') === 'backward') {
        r.backward = parseInt(repeat.getAttribute('times') ?? '', 10) || 2;
      }

      const ending = barline.querySelector('ending');
      if (!ending) continue;
      if (ending.getAttribute('type') === 'start') {
        openEnding = (ending.getAttribute('number') ?? '1')
          .split(/[\s,]+/).map(n => parseInt(n, 10)).filter(n => n > 0);
        r.endings = openEnding;
      } else {
        // "stop" or "discontinue": this measure is the last of the volta.
        r.endings = r.endings ?? openEnding;
        openEnding = null;
      }
    }
    return r;
  });
}
