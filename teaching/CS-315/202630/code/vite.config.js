
import { defineConfig } from 'vite';
import { globSync } from 'node:fs';
import { resolve } from 'node:path';

const apps = globSync('samples/**/app.html');

const input = Object.fromEntries(
  apps.map(f => [
    f.replace(/\.html$/, ''),
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

