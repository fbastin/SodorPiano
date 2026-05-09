# Sodor Piano Studio

A browser-based 88-key piano synthesizer with realistic grand piano sound modeling, multiple sound presets, and MusicXML playback support. No external audio samples required -- all sounds are generated in real time using the Web Audio API.

## Features

- Full 88-key piano keyboard (A0 to C8)
- 6 synthesized sound presets: Sodor Grand, Electric Whistle, Tidmouth Synth, Vicarstown Organ, Steam Whistle, Station Bell
- Realistic grand piano modeling with per-string inharmonicity, multi-string detuning, hammer noise, and soundboard filtering
- MusicXML file import and automated playback
- Touch and mouse input support
- Zero dependencies at runtime

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
    audio.ts          Audio synthesis engine (Web Audio API)
    parser.ts         MusicXML parser
  ui/
    piano-vanilla.ts  Self-contained piano UI component
  types.ts            Shared type definitions
  main.ts             Application entry point
  index.ts            Library barrel export
index.html            Standalone app shell
```

## License

MIT
