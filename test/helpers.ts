import { readFileSync } from 'node:fs';
import { MusicNote } from '../src/types';
import { loadScoreFile } from '../src/core/score-file';
import { ZipArchive, decodeText, isZip } from '../src/core/zip';

export const FIXTURES = 'test/fixtures/musescore';

/** A file from MuseScore's repository (see scripts/fetch-fixtures.mjs). */
export const fixture = (name: string) => readFileSync(`${FIXTURES}/${name}`);

// Parsed scores, kept: some are large and read by several tests.
const loaded = new Map<string, ReturnType<typeof loadScoreFile>>();
export function loadFixture(name: string) {
  if (!loaded.has(name)) loaded.set(name, loadScoreFile(new Blob([fixture(name)])));
  return loaded.get(name)!;
}

/** The .mscx text of a MuseScore file, from inside its archive if need be. */
export async function mscxText(name: string): Promise<string> {
  const bytes = new Uint8Array(fixture(name));
  if (!isZip(bytes)) return decodeText(bytes);
  const zip = new ZipArchive(bytes);
  return zip.readText(zip.names.find(n => /\.mscx$/i.test(n))!);
}

/** A one-part MusicXML score from measure bodies; divisions 1, tempo 60. */
export function musicXml(measures: string[], parts = 1): string {
  const part = (id: number) => `<part id="P${id}">` + measures.map((m, i) =>
    `<measure number="${i + 1}">` +
    (i === 0 ? '<attributes><divisions>1</divisions></attributes><direction><sound tempo="60"/></direction>' : '') +
    m + '</measure>').join('') + '</part>';
  const ids = Array.from({ length: parts }, (_, i) => i + 1);
  return '<?xml version="1.0"?><score-partwise version="4.0"><part-list>' +
    ids.map(id => `<score-part id="P${id}"/>`).join('') + '</part-list>' + ids.map(part).join('') + '</score-partwise>';
}

/** A quarter note in MusicXML (divisions 1), with optional extra markup. */
export const quarter = (step: string, octave = 4, extra = '') =>
  `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>1</duration>${extra}</note>`;

/** A whole note in MusicXML (divisions 1). */
export const whole = (step: string, octave = 4, extra = '') =>
  `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>4</duration>${extra}</note>`;

const NAMES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
/** "C4", "F#5"… for a piano key index. */
export const keyName = (keyIndex: number) => NAMES[keyIndex % 12] + Math.floor((keyIndex + 9) / 12);

/** Notes sorted by time then pitch, for comparisons. */
export const sorted = (notes: MusicNote[]) =>
  [...notes].sort((a, b) => a.time - b.time || a.keyIndex - b.keyIndex);
