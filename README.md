# Sodor Piano Studio

A browser-based 88-key piano synthesizer with a realistic sampled grand piano, multiple sound presets, and MusicXML playback support. The **Sodor Grand** preset plays real recorded grand-piano samples; the other presets are generated in real time using the Web Audio API.

## Features

- Full 88-key piano keyboard (A0 to C8)
- 6 sound presets: Sodor Grand, Electric Whistle, Tidmouth Synth, Vicarstown Organ, Steam Whistle, Station Bell
- Sodor Grand uses 30 recorded notes × 3 velocity layers from the Salamander Grand Piano library, with 3-layered dynamics, velocity touch, and sympathetic resonance
- MusicXML file import and automated playback
- Touch and mouse input support

## Sound sources & credits

The `Sodor Grand` preset plays the **Salamander Grand Piano** sample library by Alessandro Iafrati, released under the [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/) license (CC-BY-3.0). The samples are bundled under `assets/samples/`; see `samples-LICENSE.txt` for full attribution.

The remaining presets are synthesized live with the Web Audio API and require no samples.

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

Opens a local development server (default: http://localhost:5173).

### Production build

```bash
npm run build
```

Outputs static files to `dist/`. Serve them with any web server:

```bash
npm run preview
```

### Deploying behind a base path

If you deploy under a subpath (e.g. `https://example.com/piano/`), set the `base` option in `vite.config.ts`:

```ts
export default defineConfig({
  base: '/piano/',
  build: { outDir: 'dist', emptyOutDir: true },
});
```

Then rebuild.

## Embedding in another page

You can also use the `SodorPiano` class directly:

```html
<div id="piano" style="width:100%;height:600px"></div>
<script type="module">
  import { SodorPiano } from './src/ui/piano-vanilla.ts';
  new SodorPiano(document.getElementById('piano'));
</script>
```

## Project structure

```
src/
  core/
    audio.ts          Audio synthesis engine (Web Audio API) + sample playback
    parser.ts         MusicXML parser
  ui/
    piano-vanilla.ts  Self-contained piano UI component
  types.ts            Shared type definitions
  main.ts             Application entry point
  index.ts            Library barrel export
index.html            Standalone app shell
assets/samples/       Salamander Grand Piano sample files (see samples-LICENSE.txt)
```

## License

MIT (application code). The bundled `Sodor Grand` piano samples are the Salamander Grand Piano by Alessandro Iafrati, CC-BY-3.0.
