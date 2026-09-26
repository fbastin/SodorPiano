/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// The page is served straight from the repository: index.html and the
// bundles in assets/ are build output, committed (see `npm run deploy`).
// The source page is index.src.html.
export default defineConfig({
  base: '/SodorPiano/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    // The entry is named `index` whatever the page is called.
    rollupOptions: {
      input: { index: 'index.src.html' },
      output: {
        // The engraver bundles third-party code: point to its licenses,
        // published next to it by `npm run deploy`.
        banner: chunk => chunk.name === 'notation'
          ? '/*! Bundles OpenSheetMusicDisplay (BSD-3-Clause), VexFlow, JSZip, pako, loglevel and typescript-collections (MIT). Licenses: third-party-notices.txt */'
          : '',
      },
    },
    // The engraver chunk is large, and loaded only when the full score is
    // first shown.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['test/**/*.test.ts'],
    // Node's Blob, fetch and DecompressionStream, with jsdom's DOMParser.
    environment: 'node',
    setupFiles: ['test/setup.ts'],
    testTimeout: 30000,
  },
});
