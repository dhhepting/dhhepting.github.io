// vite.config.mjs -- build config: bundles every samples/**/app.html into dist/ with relative URLs.
import { defineConfig } from 'vite';
import { globSync } from 'node:fs';
import { resolve } from 'node:path';

// Directory containing this file (Node >= 20.11); replaces CommonJS __dirname.
const root = import.meta.dirname;

// Every samples/**/app.html becomes a build entry. cwd is pinned so the glob
// works no matter where `vite` is launched from. Needs Node >= 22 (fs.globSync).
const apps = globSync('samples/**/app.html', { cwd: root });

const input = Object.fromEntries(
  apps.map(f => [
    f.replace(/\.html$/, ''),   // entry key = output path, e.g. samples/MVP/app
    resolve(root, f),
  ])
);

export default defineConfig({
  root,
  base: './',                                      // per-HTML relative URLs, works under any prefix
  build: {
    outDir: process.env.VITE_OUT ?? 'dist',
    emptyOutDir: false,                            // don't wipe Jekyll's output if pointed at _site
    rollupOptions: { input },
  },
});