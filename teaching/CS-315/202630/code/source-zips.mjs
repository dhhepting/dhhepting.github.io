// source-zips.mjs -- Vite plugin: at build time, writes one zip of the *source* of each app
// into <outDir>/downloads/<AppName>.zip, so the raw files can be offered as a download
// without being served as runnable modules.
//
// Also (txtMirror, on by default) a read-only copy of the same files, for reading in the browser:
//   downloads/<AppName>/index.html          list of files, with a link to the zip
//   downloads/<AppName>/<path>.txt          each text file with '.txt' appended (served as text/plain,
//                                           so a browser shows it and will not run it as a module)
//   downloads/index.html                    list of all apps
// Binary files (images, ...) are only in the zip. The generated pages contain no script.
//
// A zip holds:
//   - every file in the app's folder (html, mjs, glsl, css, ...), minus junk
//   - every local file those files import (e.g. ../../../common/MV.mjs), found by scanning
//     static `import ... from`, `export ... from`, `import '...'` and `import('...')`
//     statements, plus <script src> / <link href> in the html, recursively
//   - a README.txt saying how to run it
// Paths inside the zip are relative to the project root, so the relative imports keep
// working after unzipping.
//
// Limits: only string-literal relative specifiers are followed. Files reached any other
// way (computed paths, `new URL('../x', import.meta.url)`) are not added automatically.

import { readFileSync, readdirSync, statSync, existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative, sep, extname } from 'node:path';
import { zipSync, strToU8 } from 'fflate';

const SKIP_DIRS = new Set(['node_modules', '.git', '.jekyll-cache']);
const SKIP_FILES = new Set(['.DS_Store']);
const CODE_EXT = new Set(['.js', '.mjs']);

const IMPORT_RE = /\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
const TEXT_EXT = new Set(['.html', '.htm', '.js', '.mjs', '.css', '.glsl', '.vert', '.frag', '.json',
                          '.md', '.txt', '.svg', '.xml', '.csv', '.tsv', '.yml', '.yaml']);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const href = (rel) => rel.split('/').map(encodeURIComponent).join('/');
const txtName = (rel) => (rel.endsWith('.txt') ? rel : `${rel}.txt`);

const htmlPage = (title, body) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:50rem;margin:2rem auto;padding:0 1rem}li{margin:.15rem 0}</style>
</head>
<body>
${body}
</body>
</html>
`;

const HTML_REF_RE = /\b(?:src|href)\s*=\s*["']([^"'#?]+)["']/g;

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) out.push(...walk(resolve(dir, e.name)));
    } else if (e.isFile() && !SKIP_FILES.has(e.name)) {
      out.push(resolve(dir, e.name));
    }
  }
  return out;
}

function resolveLocal(fromFile, spec) {
  if (!spec || !spec.startsWith('.')) return null;     // bare/absolute/URL specifiers: not ours
  const base = resolve(dirname(fromFile), spec);
  for (const candidate of [base, `${base}.mjs`, `${base}.js`]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const insideRoot = (root, file) => {
  const rel = relative(root, file);
  return rel !== '' && !rel.startsWith('..') && !rel.split(sep).includes('node_modules');
};

// the app's own files plus everything local they depend on
function collectSources(appDir, root) {
  const files = new Set(walk(appDir));
  const queue = [...files];
  while (queue.length) {
    const file = queue.pop();
    const ext = extname(file);
    const re = CODE_EXT.has(ext) ? IMPORT_RE : ext === '.html' ? HTML_REF_RE : null;
    if (!re) continue;
    for (const m of readFileSync(file, 'utf8').matchAll(re)) {
      const dep = resolveLocal(file, m[1] ?? m[2] ?? m[3]);
      if (dep && insideRoot(root, dep) && !files.has(dep)) {
        files.add(dep);
        queue.push(dep);
      }
    }
  }
  return [...files].sort();
}

const readme = (name, pagePath) => `${name} -- source files

Unzip, then serve this folder with any static web server, for example:

    python3 -m http.server 8000

and open  http://localhost:8000/${pagePath}

(Opening the html file straight from disk will not work: the page loads ES modules
and shader files, which browsers only allow over http.)
`;

/**
 * @param {object}   opts
 * @param {string[]} opts.apps  app entry pages, relative to root (e.g. 'experimental/modular/ShaderStages/app.html')
 * @param {string}   opts.base  folder the app names are taken relative to (e.g. 'experimental/modular')
 * @param {string}   opts.root  project root
 * @param {string}  [opts.dir]  subfolder of outDir for the zips (default 'downloads')
 * @param {boolean} [opts.txtMirror] also write browsable .txt copies and index pages (default true)
 */
export function sourceZips({ apps, base, root, dir = 'downloads', txtMirror = true }) {
  let outDir;
  return {
    name: 'source-zips',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      const target = resolve(outDir, dir);
      rmSync(target, { recursive: true, force: true });   // drop zips of apps that no longer exist
      mkdirSync(target, { recursive: true });

      const listing = [];

      for (const page of apps) {
        const appDir = resolve(root, dirname(page));
        const name = relative(resolve(root, base), appDir).split(sep).join('-') || 'app';

        const entries = {};
        const sources = [];                                  // { rel, mirrored }
        for (const file of collectSources(appDir, root)) {
          const rel = relative(root, file).split(sep).join('/');
          const data = new Uint8Array(readFileSync(file));
          entries[rel] = [data, { mtime: statSync(file).mtime }];

          const mirrored = txtMirror && TEXT_EXT.has(extname(file).toLowerCase());
          if (mirrored) {
            const copy = resolve(target, name, txtName(rel));
            mkdirSync(dirname(copy), { recursive: true });
            writeFileSync(copy, data);
          }
          sources.push({ rel, mirrored });
        }
        entries['README.txt'] = strToU8(readme(name, page.split(sep).join('/')));

        writeFileSync(resolve(target, `${name}.zip`), zipSync(entries, { level: 9 }));
        listing.push(name);

        if (txtMirror) {
          const appRel = relative(root, appDir).split(sep).join('/') + '/';
          const item = ({ rel, mirrored }) => mirrored
            ? `<li><a href="${href(txtName(rel))}">${esc(rel)}</a></li>`
            : `<li>${esc(rel)} <em>(binary: in the zip only)</em></li>`;
          const own = sources.filter((f) => f.rel.startsWith(appRel));
          const shared = sources.filter((f) => !f.rel.startsWith(appRel));
          writeFileSync(resolve(target, name, 'index.html'), htmlPage(`${name} - source`, `
<h1>${esc(name)} &mdash; source</h1>
<p><a href="../${href(name)}.zip">Download everything as a zip</a> (${sources.length} files).
The files below are plain-text copies for reading in the browser; they cannot be run from here.</p>
<h2>This app</h2>
<ul>
${own.map(item).join('\n')}
</ul>${shared.length ? `
<h2>Shared files it imports</h2>
<ul>
${shared.map(item).join('\n')}
</ul>` : ''}
<p><a href="../index.html">All downloads</a></p>`));
        }
      }

      if (txtMirror) {
        listing.sort();
        writeFileSync(resolve(target, 'index.html'), htmlPage('Source downloads', `
<h1>Source downloads</h1>
<ul>
${listing.map((n) => `<li>${esc(n)} &mdash; <a href="${href(n)}/index.html">read the source</a> &middot; <a href="${href(n)}.zip">zip</a></li>`).join('\n')}
</ul>`));
      }
    },
  };
}
