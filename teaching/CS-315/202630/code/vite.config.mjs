// vite.config.mjs -- build config: bundles every experimental/built/**/app.html into dist/ with relative URLs,
// copies the shader files each app fetches at run time, and writes a source zip per app to dist/downloads/.

const [major] = process.versions.node.split('.').map(Number);
if (major < 22) throw new Error(`Node >= 22 required (this is ${process.versions.node}); fs.globSync is not available`);

import { defineConfig } from 'vite';
import { globSync } from 'node:fs';
import { resolve } from 'node:path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { sourceZips } from './source-zips.mjs';


// Directory containing this file (Node >= 20.11); replaces CommonJS __dirname.
const root = import.meta.dirname;

// Every experimental/built/**/app.html becomes a build entry. cwd is pinned so the glob
// works no matter where `vite` is launched from. Needs Node >= 22 (fs.globSync).
const apps = globSync('experimental/built/**/app.html', { cwd: root });

const input = Object.fromEntries(
  apps.map(f => [
    f.replace(/\.html$/, ''),   // entry key = output path, e.g. experimental/built/MVP/app
    resolve(root, f),
  ])
);


export default defineConfig({
  publicDir: false, // optional: only if you have nothing else in public/
  root,
  base: './',            // per-HTML relative URLs, works under any prefix
  plugins: [
    viteStaticCopy({
      // shaders are fetched at run time, so they must sit beside each built page: same path as in the source tree
      targets: [{ src: 'experimental/**/*.{vert,frag,glsl}', dest: '.' }],
      watch: { reloadPageOnChange: true }, // option name may differ by plugin version
    }),
    // dist/downloads/<AppName>.zip -- source for each app, as a download rather than runnable modules
    sourceZips({ apps, base: 'experimental/built', root }),
  ],
  build: {
    outDir: process.env.VITE_OUT ?? 'dist',
    emptyOutDir: !process.env.VITE_OUT,   // clean dist/ on every build; never wipe a custom outDir like Jekyll's _site
    rollupOptions: { input },
  },
});

