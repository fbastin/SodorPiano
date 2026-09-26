# Sodor Piano Studio

A browser-based 88-key piano synthesizer with a realistic sampled grand piano, multiple sound presets, and playback of MusicXML and MuseScore scores. The **Sodor Grand** preset plays real recorded grand-piano samples; the other presets are generated in real time using the Web Audio API.

## Features

- Full 88-key piano keyboard (A0 to C8)
- 6 sound presets: Sodor Grand, Electric Whistle, Tidmouth Synth, Vicarstown Organ, Steam Whistle, Station Bell
- Sodor Grand uses 30 recorded notes × 3 velocity layers from the Salamander Grand Piano library, with velocity touch, dampers that fall when a key is released (the top strings have none, as on a real grand), sympathetic resonance and a light room reverb
- Score import and automated playback: MusicXML (`.musicxml`, `.xml`), compressed MusicXML (`.mxl`) and MuseScore 2, 3 and 4 files (`.mscz`, `.mscx`)
- Repeats (nested ones included), first/second endings, and the road map (D.C., D.S., al Fine, al Coda, section breaks) are played as MuseScore plays them; tempo changes apply to every staff
- Scores are performed with their dynamics and hairpins (crescendo, decrescendo), accents, staccato and tenuto marks, and sustain pedal; notes are scheduled on the audio clock, so chords sound together and the tempo never drifts
- A scrolling view above the keyboard follows the score as it plays: either a simple grand staff (notes placed by time, also showing the notes played by hand) or the full score, engraved with OpenSheetMusicDisplay (loaded on demand; MuseScore files are converted to MusicXML for it). It can be hidden for small screens
- Volume, tempo (0.25× to 2×) and sustain pedal controls; a key struck near its front sounds louder than one grazed at the top
- Touch and mouse input support

## Sound sources & credits

The `Sodor Grand` preset plays the **Salamander Grand Piano** sample library by Alessandro Iafrati, released under the [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/) license (CC-BY-3.0). The samples are bundled under `assets/samples/`; see `assets/samples/samples-LICENSE.txt` for full attribution.

The remaining presets are synthesized live with the Web Audio API and require no samples.

The full-score view is engraved by [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/) (BSD-3-Clause), which includes VexFlow, JSZip, pako, loglevel and typescript-collections (MIT). Their copyright notices and license texts are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

All other app code is released under the MIT license.

## Installation

```bash
git clone https://github.com/fbastin/SodorPiano.git
cd SodorPiano
npm install
```

## Usage

### Development server

```bash
npm run dev
```

Starts a local development server and opens the source page, `index.src.html` (http://localhost:5173/SodorPiano/index.src.html).

### Production build and deployment

The application is served straight from the repository: `index.html` and the bundles in `assets/` (`index-*.js`, and `notation-*.js` for the full-score view) are build output, committed alongside the sources. Edit `index.src.html`, never `index.html`.

```bash
npm run deploy
```

Builds the application and replaces `index.html` and the bundles in `assets/` with the new ones, removing those of the previous build; the samples in `assets/samples/` are left as they are. Commit the result to publish it.

`npm run build` alone builds into `dist/` without touching the served files; `npm run preview` serves that build locally.

### Deploying behind another base path

The application expects to be served under `/SodorPiano/`. To serve it elsewhere (e.g. `https://example.com/piano/`), change `base` in `vite.config.ts`, and the paths opened by the `dev` and `preview` scripts in `package.json`:

```ts
export default defineConfig({
  base: '/piano/',
  // …
});
```

Then run `npm run deploy` again.

## Embedding in another page

In a project built with Vite (or another bundler that compiles TypeScript), you can use the `SodorPiano` class directly:

```ts
import { SodorPiano } from './SodorPiano/src/ui/piano-vanilla';

new SodorPiano(document.getElementById('piano')!);   // e.g. <div id="piano" style="width:100%;height:600px">
```

To load a score programmatically, pass a `File` or `Blob` in any supported format to `loadScoreFile`, then call `playScore`:

```ts
const piano = new SodorPiano(container);
await piano.loadScoreFile(await (await fetch('song.mscz')).blob());
piano.playScore();
```

Other public methods: `loadMusicXml(text)`, `stopScore()`, `playNote(keyIndex, duration, velocity)` (key 0 is A0, 87 is C8), `setSoundType(type)` and `setPedal(down)`.

## Project structure

```
src/
  core/
    audio.ts              Audio engine (Web Audio API): sampled grand, synthesized presets, reverb
    parser.ts             MusicXML parser
    mscx.ts               MuseScore (.mscx) parser
    mscx-to-musicxml.ts   MuseScore → MusicXML conversion, for the full-score view
    timeline.ts           Shared playback model: repeats, voltas and jumps, tempo map,
                          dynamics and hairpins, pedal, ties
    zip.ts                ZIP reader for .mxl and .mscz archives
    score-file.ts         Score file loader: detects the format from the content
  ui/
    piano-vanilla.ts      Self-contained piano UI component
    staff.ts              Simple scrolling grand staff (canvas)
    notation.ts           Full-score view (OpenSheetMusicDisplay), loaded on demand
  types.ts                Shared type definitions
  main.ts                 Application entry point
  index.ts                Library barrel export
index.src.html            Source page (Vite entry)
index.html                Built page, served (build output — see npm run deploy)
assets/                   Built bundles (build output) and samples/, the Salamander
                          Grand Piano samples (see samples/samples-LICENSE.txt)
scripts/deploy.mjs        Build and deployment script
THIRD_PARTY_NOTICES.md    Licenses of the libraries bundled in the full-score view
```

## License

MIT (application code). The bundled `Sodor Grand` piano samples are the Salamander Grand Piano by Alessandro Iafrati, CC-BY-3.0. The libraries bundled in the full-score view keep their own licenses (BSD-3-Clause and MIT); see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
