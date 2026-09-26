import { MusicScore } from '../types';
import { parseMusicXml } from './parser';
import { parseMscx } from './mscx';
import { ZipArchive, decodeText, isZip } from './zip';

// File types offered by the import button.
export const SCORE_FILE_TYPES = '.musicxml,.xml,.mxl,.mscz,.mscx';

/**
 * Reads any supported score file: MusicXML (.musicxml, .xml), compressed
 * MusicXML (.mxl), MuseScore (.mscz, .mscx). The format is recognised from
 * the content, not the file name.
 */
export async function loadScoreFile(file: Blob): Promise<MusicScore> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = isZip(bytes) ? await readRootFile(new ZipArchive(bytes)) : decodeText(bytes);
  return parseScoreText(text);
}

export function parseScoreText(text: string): MusicScore {
  return /<museScore[\s>]/.test(text) ? parseMscx(text) : parseMusicXml(text);
}

const SCORE_PATH = /\.(mscx?|musicxml|xml)$/i;

// Both .mxl and .mscz name their files in META-INF/container.xml. The score
// is not necessarily the first: MuseScore 4 lists its style sheet first.
async function readRootFile(zip: ZipArchive): Promise<string> {
  if (zip.has('META-INF/container.xml')) {
    const container = new DOMParser().parseFromString(
      await zip.readText('META-INF/container.xml'), 'text/xml');
    const path = Array.from(container.querySelectorAll('rootfile'))
      .map(r => r.getAttribute('full-path') ?? '')
      .find(p => SCORE_PATH.test(p) && zip.has(p));
    if (path) return zip.readText(path);
  }
  // Archives without a container: take the first score-looking file.
  const fallback = zip.names.find(n => /\.mscx?$/i.test(n)) ??
                   zip.names.find(n => /\.(musicxml|xml)$/i.test(n) && !n.startsWith('META-INF/'));
  if (!fallback) throw new Error('No score found in the archive');
  return zip.readText(fallback);
}
