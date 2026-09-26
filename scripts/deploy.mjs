// Builds the application and puts the result where the site serves it:
// index.html and the hashed bundles in assets/ (the samples stay as they
// are). Bundles of previous builds are removed.
//
//   npm run deploy
import { build } from 'vite';
import { copyFileSync, readdirSync, rmSync } from 'node:fs';

// Built bundles are named <name>-<hash>.js by Vite.
const BUNDLE = /^[\w.]+-[\w-]{8}\.js$/;

await build();

for (const file of readdirSync('assets')) {
  if (BUNDLE.test(file)) rmSync(`assets/${file}`);
}
for (const file of readdirSync('dist/assets')) {
  copyFileSync(`dist/assets/${file}`, `assets/${file}`);
}
copyFileSync('dist/index.src.html', 'index.html');
// The licenses of the libraries in the engraver bundle travel with it.
copyFileSync('THIRD_PARTY_NOTICES.md', 'assets/third-party-notices.txt');

console.log('\nDeployed:', ['index.html', 'assets/third-party-notices.txt', ...readdirSync('dist/assets').map(f => `assets/${f}`)].join(', '));
