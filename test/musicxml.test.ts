import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { loadScoreFile, parseScoreText } from '../src/core/score-file';
import { keyName, musicXml, quarter, whole } from './helpers';

const direction = (content: string, sound = '') =>
  `<direction><direction-type>${content}</direction-type>${sound}</direction>`;
const sound = (attributes: string) => `<direction><direction-type><words/></direction-type><sound ${attributes}/></direction>`;
const barline = (location: 'left' | 'right', content: string) => `<barline location="${location}">${content}</barline>`;

// One whole note per measure, C4 D4 E4…: the notes played give the order
// in which the measures were.
const STEPS = 'CDEFGABCDEFGAB';
const byMeasure = (bodies: string[]) => bodies.map((b, i) => b + whole(STEPS[i], i < 7 ? 4 : 5));
const measureOrder = (xml: string) => {
  const first = parseScoreText(xml).notes.map(n => keyName(n.keyIndex));
  const names = STEPS.split('').map((s, i) => s + (i < 7 ? 4 : 5));
  return first.map(n => names.indexOf(n) + 1).join(' ');
};

describe('MusicXML: structure', () => {
  it('plays chord notes together', () => {
    const score = parseScoreText(musicXml([quarter('C') + quarter('E', 4, '').replace('<note>', '<note><chord/>') + quarter('G')]));
    expect(score.notes.map(n => [keyName(n.keyIndex), n.time])).toEqual([['C4', 0], ['E4', 0], ['G4', 1]]);
  });

  it('unrolls repeats and voltas, with one tempo map for every part', () => {
    const forward = barline('left', '<repeat direction="forward"/>');
    const firstEnding = barline('left', '<ending number="1" type="start"/>');
    const firstEndingEnd = barline('right', '<ending number="1" type="stop"/><repeat direction="backward"/>');
    const second = barline('left', '<ending number="2" type="start"/>') + barline('right', '<ending number="2" type="discontinue"/>');
    const xml = musicXml([
      whole('C', 5), forward + whole('D', 5), firstEnding + whole('E', 5) + firstEndingEnd, second + whole('F', 5),
      // The tempo doubles halfway through the last measure.
      `<note><pitch><step>G</step><octave>5</octave></pitch><duration>2</duration></note>${sound('tempo="120"')}` +
      '<note><pitch><step>A</step><octave>5</octave></pitch><duration>2</duration></note>',
    ]);
    const notes = parseScoreText(xml).notes.map(n => `${keyName(n.keyIndex)}@${n.time}`);
    expect(notes).toEqual(['C5@0', 'D5@4', 'E5@8', 'D5@12', 'F5@16', 'G5@20', 'A5@22']);
  });

  it('plays nested repeats', () => {
    const forward = barline('left', '<repeat direction="forward"/>');
    const backward = barline('right', '<repeat direction="backward"/>');
    const xml = musicXml(byMeasure([forward, forward, backward, backward, '']).map((m, i) =>
      i === 2 || i === 3 ? m.replace(backward, '') + backward : m));
    expect(measureOrder(xml)).toBe('1 2 3 2 3 4 1 2 3 2 3 4 5');
  });
});

describe('MusicXML: road map', () => {
  it('plays D.C. al Fine', () => {
    const xml = musicXml(byMeasure(['', '', sound('fine="yes"'), '', sound('dacapo="yes"')]));
    expect(measureOrder(xml)).toBe('1 2 3 4 5 1 2 3');
  });

  it('plays D.S. al Coda', () => {
    const xml = musicXml(byMeasure(['', sound('segno="s1"'), sound('tocoda="c1"'), '', sound('dalsegno="s1"'), sound('coda="c1"'), '']));
    expect(measureOrder(xml)).toBe('1 2 3 4 5 2 3 6 7');
  });

  it('does not repeat again in the stretch played after D.S.', () => {
    const measures = byMeasure(['', sound('segno="s"'), '', sound('dalsegno="s"'), '']);
    measures[1] = barline('left', '<repeat direction="forward"/>') + measures[1];
    measures[2] += barline('right', '<repeat direction="backward"/>');
    expect(measureOrder(musicXml(measures))).toBe('1 2 3 2 3 4 2 3 4 5');
  });
});

describe('MusicXML: performance marks', () => {
  const dynamic = (mark: string, midi?: number) =>
    direction(`<dynamics><${mark}/></dynamics>`, midi === undefined ? '' : `<sound dynamics="${(midi / 0.9).toFixed(2)}"/>`);
  const pedal = (type: string) => direction(`<pedal type="${type}"/>`);
  const articulation = (mark: string) => `<notations><articulations><${mark}/></articulations></notations>`;

  const xml = musicXml([
    dynamic('p', 49) + pedal('start') + quarter('C') + quarter('D') + pedal('change') + quarter('E') + quarter('F') + pedal('stop'),
    dynamic('f') + quarter('G', 4, articulation('staccato')) + quarter('A', 4, articulation('accent')) +
      dynamic('sfz') + quarter('B') + quarter('C', 5),
    dynamic('fp') + quarter('D', 5) + quarter('E', 5) + sound('damper-pedal="yes"') +
      quarter('F', 5, articulation('tenuto')) + quarter('G', 5, articulation('staccatissimo')),
  ]);
  const notes = parseScoreText(xml).notes.map(n => ({
    note: keyName(n.keyIndex), velocity: Math.round((n.velocity ?? 0) * 127), sounds: +(n.duration ?? 0).toFixed(2),
  }));

  it('follows dynamics: levels, sforzando, forte-piano', () => {
    expect(notes.map(n => n.velocity)).toEqual([49, 49, 49, 49, 96, 127, 112, 96, 96, 49, 49, 49]);
  });

  it('holds keys by articulation and pedal; a pedal change clears the harmony', () => {
    // C4 is held by the pedal until the change; D4, released at the change,
    // is not caught again; F5 and G5 ring to the end under the last pedal.
    expect(notes.map(n => n.sounds)).toEqual([2, 1, 2, 1, 0.5, 1, 1, 1, 1, 1, 2, 1]);
  });

  it('applies the articulations of a chord to all its notes', () => {
    const chord = quarter('C', 4, articulation('staccato')) + quarter('E').replace('<note>', '<note><chord/>');
    const held = parseScoreText(musicXml([chord])).notes.map(n => n.hold);
    expect(held).toEqual([0.5, 0.5]);
  });
});

describe('MusicXML files', () => {
  it('reads compressed MusicXML (.mxl) as the plain file', async () => {
    const text = musicXml([quarter('C') + quarter('D') + quarter('E') + quarter('F')]);
    const zip = new JSZip();
    zip.file('META-INF/container.xml',
      '<?xml version="1.0"?><container><rootfiles><rootfile full-path="score/piece.musicxml"/></rootfiles></container>');
    zip.file('score/piece.musicxml', text);
    const mxl = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const fromMxl = await loadScoreFile(new Blob([mxl]));
    expect(fromMxl.notes).toEqual(parseScoreText(text).notes);
  });

  it('keeps the spelling of notes', () => {
    const flat = '<note><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration></note>';
    const [note] = parseScoreText(musicXml([flat])).notes;
    expect([note.letter, note.alter, keyName(note.keyIndex)]).toEqual([6, -1, 'A#4']);
  });
});
