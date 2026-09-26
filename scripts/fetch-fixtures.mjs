// Downloads the MuseScore files the tests check SodorPiano against: scores
// from MuseScore's own test suite, whose expected results (measure order,
// velocities, MIDI output) MuseScore publishes with them, and its demos.
//
// They come from one fixed commit of github.com/musescore/MuseScore, so
// that results do not drift, and are kept in test/fixtures/musescore/,
// outside version control: they are MuseScore's (GPL-3.0), not ours.
// Only missing files are fetched. Run by `npm test` before the tests.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const COMMIT = '1c81f0a6f3eeb1acff185b4b67569903faf1df36';   // 2026-09-25
const DIR = 'test/fixtures/musescore';
const PATHS = [
  'src/engraving/tests/repeat_data/repeat01.mscx',
  'src/engraving/tests/repeat_data/repeat02.mscx',
  'src/engraving/tests/repeat_data/repeat03.mscx',
  'src/engraving/tests/repeat_data/repeat04.mscx',
  'src/engraving/tests/repeat_data/repeat05.mscx',
  'src/engraving/tests/repeat_data/repeat06.mscx',
  'src/engraving/tests/repeat_data/repeat07.mscx',
  'src/engraving/tests/repeat_data/repeat08.mscx',
  'src/engraving/tests/repeat_data/repeat09.mscx',
  'src/engraving/tests/repeat_data/repeat10.mscx',
  'src/engraving/tests/repeat_data/repeat11.mscx',
  'src/engraving/tests/repeat_data/repeat12.mscx',
  'src/engraving/tests/repeat_data/repeat13.mscx',
  'src/engraving/tests/repeat_data/repeat14.mscx',
  'src/engraving/tests/repeat_data/repeat15.mscx',
  'src/engraving/tests/repeat_data/repeat16.mscx',
  'src/engraving/tests/repeat_data/repeat17.mscx',
  'src/engraving/tests/repeat_data/repeat18.mscx',
  'src/engraving/tests/repeat_data/repeat19.mscx',
  'src/engraving/tests/repeat_data/repeat20.mscx',
  'src/engraving/tests/repeat_data/repeat21.mscx',
  'src/engraving/tests/repeat_data/repeat22.mscx',
  'src/engraving/tests/repeat_data/repeat23.mscx',
  'src/engraving/tests/repeat_data/repeat24.mscx',
  'src/engraving/tests/repeat_data/repeat25.mscx',
  'src/engraving/tests/repeat_data/repeat26.mscx',
  'src/engraving/tests/repeat_data/repeat27.mscx',
  'src/engraving/tests/repeat_data/repeat28.mscx',
  'src/engraving/tests/repeat_data/repeat29.mscx',
  'src/engraving/tests/repeat_data/repeat30.mscx',
  'src/engraving/tests/repeat_data/repeat31.mscx',
  'src/engraving/tests/repeat_data/repeat32.mscx',
  'src/engraving/tests/repeat_data/repeat33.mscx',
  'src/engraving/tests/repeat_data/repeat34.mscx',
  'src/engraving/tests/repeat_data/repeat35.mscx',
  'src/engraving/tests/repeat_data/repeat36.mscx',
  'src/engraving/tests/repeat_data/repeat37.mscx',
  'src/engraving/tests/repeat_data/repeat38.mscx',
  'src/engraving/tests/repeat_data/repeat39.mscx',
  'src/engraving/tests/repeat_data/repeat40.mscx',
  'src/engraving/tests/repeat_data/repeat41.mscx',
  'src/engraving/tests/repeat_data/repeat42.mscx',
  'src/engraving/tests/repeat_data/repeat43.mscx',
  'src/engraving/tests/repeat_data/repeat44.mscx',
  'src/engraving/tests/repeat_data/repeat45.mscx',
  'src/engraving/tests/repeat_data/repeat46.mscx',
  'src/engraving/tests/repeat_data/repeat47.mscx',
  'src/engraving/tests/repeat_data/repeat48.mscx',
  'src/engraving/tests/repeat_data/repeat49.mscx',
  'src/engraving/tests/repeat_data/repeat50.mscx',
  'src/engraving/tests/repeat_data/repeat51.mscx',
  'src/engraving/tests/repeat_data/repeat52.mscx',
  'src/engraving/tests/repeat_data/repeat53.mscx',
  'src/engraving/tests/repeat_data/repeat54.mscx',
  'src/engraving/tests/repeat_data/repeat55.mscx',
  'src/engraving/tests/repeat_data/repeat56.mscx',
  'src/engraving/tests/repeat_data/repeat57.mscx',
  'src/engraving/tests/repeat_data/repeat58.mscx',
  'src/engraving/tests/repeat_data/repeat59.mscx',
  'src/engraving/tests/repeat_data/repeat60.mscx',
  'src/engraving/tests/repeat_data/repeat61.mscx',
  'src/engraving/tests/repeat_data/repeat62.mscx',
  'src/engraving/tests/repeat_data/repeat63.mscx',
  'src/engraving/tests/repeat_data/repeat64.mscx',
  'src/engraving/tests/repeat_data/repeat65.mscx',
  'src/engraving/tests/repeat_data/repeat66.mscx',
  'src/engraving/tests/repeat_data/repeat67.mscx',
  'src/engraving/tests/repeat_data/repeat68.mscx',
  'src/engraving/tests/repeat_data/repeat69.mscx',
  'src/engraving/tests/repeat_tests.cpp',
  'src/engraving/tests/midi/midirenderer_data/hairpin_dynamic_inside.mscx',
  'src/engraving/tests/midi/midirenderer_data/hairpin_dynamic_jump.mscx',
  'src/engraving/tests/midi/midirenderer_data/hairpin_end_dynamic_away.mscx',
  'src/engraving/tests/midi/midirenderer_data/hairpin_simple.mscx',
  'src/engraving/tests/midi/midirenderer_data/hairpin_start_dynamic_away.mscx',
  'src/engraving/tests/midi/midirenderer_data/hairpin_two_instruments.mscx',
  'src/importexport/midi/tests/midiexport_data/testArticulationDynamics-ref.txt',
  'src/importexport/midi/tests/midiexport_data/testArticulationDynamics.mscx',
  'src/importexport/midi/tests/midiexport_data/testPedal-ref.txt',
  'src/importexport/midi/tests/midiexport_data/testPedal.mscx',
  'src/importexport/midi/tests/midiexport_data/testPlayArticulation-ref.txt',
  'src/importexport/midi/tests/midiexport_data/testPlayArticulation.mscx',
  'src/importexport/midi/tests/midiexport_data/testRepeatsDynamics-ref.txt',
  'src/importexport/midi/tests/midiexport_data/testRepeatsDynamics.mscx',
  'demos/All_Dudes.mscz',
  'demos/Amazing_grace.mscz',
  'demos/Reunion.mscz',
  'demos/Triumph.mscz',
  'demos/goldberg.mscz',
  'src/braille/tests/data/testTie_Example_10.2.2_MBC2015.mscx',
  'src/braille/tests/data/testTuplets_Example_8.5_MBC2015.mscx',
  'src/braille/tests/data/testVolta_Example_17.1.1.1_MBC2015.mscx',
  'src/engraving/tests/playback/playbackeventsrenderer_data/tied_notes_and_repeats.mscx',
];

mkdirSync(DIR, { recursive: true });
const missing = PATHS.filter(p => !existsSync(`${DIR}/${basename(p)}`));
if (missing.length) console.log(`Fetching ${missing.length} MuseScore test files…`);
for (const path of missing) {
  const url = `https://raw.githubusercontent.com/musescore/MuseScore/${COMMIT}/${path}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  writeFileSync(`${DIR}/${basename(path)}`, new Uint8Array(await response.arrayBuffer()));
}
