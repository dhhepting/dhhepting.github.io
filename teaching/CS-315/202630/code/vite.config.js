
import { defineConfig } from 'vite';
import { globSync, readFileSync } from 'node:fs'; // Node 22+; otherwise use fast-glob
import { resolve, basename } from 'node:path';

const textbook = globSync('textbook/[0-9][0-9]/*.html')
  .filter(f => basename(f) !== 'index.html')
  .filter(f => /<script[^>]*type=["']module["']/.test(readFileSync(f, 'utf8')));
//const textbook = globSync('textbook/[0-9][0-9]/*.html')
 // .filter(f => basename(f) !== 'index.html');      // keep Jekyll listings out

// const apps = globSync('{samples,compare}/**/app.html');
const apps = globSync('samples/**/app.html');

const input = Object.fromEntries(
  [...textbook, ...apps].map(f => [
    f.replace(/\.html$/, ''),                      // e.g. textbook/02/gasket1
    resolve(__dirname, f),
  ])
);

export default defineConfig({
  root: __dirname,
  base: './',                                      // per-HTML relative URLs, works under any prefix
  build: {
    outDir: process.env.VITE_OUT ?? 'dist',
    emptyOutDir: false,                            // don't wipe Jekyll's output if pointed at _site
    rollupOptions: { input },
  },
});

