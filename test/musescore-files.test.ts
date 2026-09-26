import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { mscxToMusicXml } from '../src/core/mscx-to-musicxml';
import { loadScoreFile, parseScoreText } from '../src/core/score-file';
import { loadFixture, mscxText, sorted } from './helpers';

const DEMOS = ['Amazing_grace.mscz', 'All_Dudes.mscz', 'Reunion.mscz', 'Triumph.mscz', 'goldberg.mscz'];

describe('MuseScore files', () => {
  it.each(DEMOS)('loads the demo %s', async name => {
    const score = await loadFixture(name);
    expect(score.notes.length).toBeGreaterThan(100);
    expect(score.notes.every(n => n.keyIndex >= 0 && n.keyIndex < 88)).toBe(true);
  });

  it('plays MuseScore 2 voices at their written positions (Goldberg Variations)', async () => {
    const score = await loadFixture('goldberg.mscz');
    // 990 measures, each variation repeated: about an hour.
    expect(score.notes.length).toBe(34548);
    const end = Math.max(...score.notes.map(n => n.time));
    expect(end / 60).toBeGreaterThan(55);
    expect(end / 60).toBeLessThan(70);
  });

  it('spells every note as the key it plays', async () => {
    const naturals = [0, 2, 4, 5, 7, 9, 11];
    for (const name of DEMOS) {
      for (const n of (await loadFixture(name)).notes) {
        const pitchClass = (naturals[n.letter!] + n.alter! + 120) % 12;
        expect(pitchClass, `${name}: key ${n.keyIndex}`).toBe((n.keyIndex + 9) % 12);
      }
    }
  });

  it('finds the score in a MuseScore 4 archive that lists its style sheet first', async () => {
    const zip = new JSZip();
    zip.file('META-INF/container.xml', '<?xml version="1.0"?><container><rootfiles>' +
      '<rootfile full-path="score_style.mss"/><rootfile full-path="piece.mscx"/></rootfiles></container>');
    zip.file('score_style.mss', '<?xml version="1.0"?><museScore version="4.40"><Style/></museScore>');
    zip.file('piece.mscx', await mscxText('hairpin_simple.mscx'));
    const score = await loadScoreFile(new Blob([await zip.generateAsync({ type: 'uint8array' })]));
    expect(score.notes.length).toBe(4);
  });

  it('refuses MuseScore 1 files with a message', () => {
    expect(() => parseScoreText('<?xml version="1.0"?><museScore version="1.14"><Score/></museScore>'))
      .toThrow(/MuseScore 1/);
  });
});

// The full-score view engraves MuseScore files through MusicXML: converted
// and read again, a score must give the same notes. Scores with jumps or
// octave marks are left out: the conversion keeps neither (the engraving
// does not need them).
describe('MuseScore → MusicXML conversion', () => {
  const FILES = [
    'Amazing_grace.mscz', 'testTie_Example_10.2.2_MBC2015.mscx', 'testVolta_Example_17.1.1.1_MBC2015.mscx',
    'tied_notes_and_repeats.mscx', 'hairpin_dynamic_jump.mscx', 'testRepeatsDynamics.mscx', 'testPedal.mscx',
  ];
  it.each(FILES)('%s gives the same notes', async name => {
    const text = await mscxText(name);
    const direct = sorted(parseScoreText(text).notes);
    const converted = sorted(parseScoreText(mscxToMusicXml(text)).notes);
    expect(converted.length).toBe(direct.length);
    direct.forEach((n, i) => {
      const c = converted[i];
      expect(c.keyIndex, `note ${i}`).toBe(n.keyIndex);
      // Tuplets and tempi are rounded in MusicXML: a few milliseconds.
      expect(Math.abs(c.time - n.time), `start of note ${i}`).toBeLessThan(0.005);
      expect(Math.abs((c.hold ?? 0) - (n.hold ?? 0)), `length of note ${i}`).toBeLessThan(0.005);
    });
  });

  it.each(['Amazing_grace.mscz', 'Reunion.mscz'])('writes valid MusicXML, measure for measure: %s', async name => {
    const text = await mscxText(name);
    const doc = new DOMParser().parseFromString(mscxToMusicXml(text), 'text/xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    // Measure N of the playback must be measure N of the engraving.
    const staff = Array.from(new DOMParser().parseFromString(text, 'text/xml')
      .querySelectorAll('museScore > Score > Staff')).find(s => s.querySelector(':scope > Measure'))!;
    const expected = staff.querySelectorAll(':scope > Measure').length;
    for (const part of Array.from(doc.querySelectorAll('score-partwise > part'))) {
      expect(part.querySelectorAll(':scope > measure').length).toBe(expected);
    }
  });
});
