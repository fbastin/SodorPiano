import { defineConfig } from 'vite';

export default defineConfig({
  base: '/SodorPiano/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
});
