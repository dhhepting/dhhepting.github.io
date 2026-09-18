#!/usr/bin/env node
// gen-listings.mjs
// Static directory-listing generator.
// Replaces the dev-server-only `configureServer` plugin: instead of generating
// a listing per HTTP request, it walks a directory tree once and writes a real
// index.html into every folder that doesn't already have one. The output is
// plain static files, so it works identically on github.io and Apache.
//
// Usage:
//   node gen-listings.mjs <rootDir> [cssFile]
//     <rootDir>  directory to walk (e.g. teaching/CS-315/202630/code)
//     [cssFile]  optional path to a stylesheet; linked via a RELATIVE href from
//                each generated page, so it survives any baseurl/subpath.
//
// Safe to re-run: pages it generated carry a marker and are refreshed, never
// double-counted. Directories that have your OWN index.html (an app or a real
// page) are left untouched.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] ?? '.');
const CSS_FILE = process.argv[3] ? path.resolve(process.argv[3]) : null;
const EXCLUDE = new Set(['node_modules', '.git', '.jekyll-cache', '_site']);
const MARKER = '<!-- generated-listing -->';

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
   .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const toPosix = (p) => p.split(path.sep).join('/');

// A directory "has its own index" (an app/page we must not clobber) unless the
// index.html present is one WE generated (identified by MARKER).
function hasOwnIndex(dir) {
  for (const name of ['index.html', 'index.php']) {
    const f = path.join(dir, name);
    if (fs.existsSync(f)) {
      if (name === 'index.html' && fs.readFileSync(f, 'utf8').includes(MARKER)) {
        return false; // ours — refresh it
      }
      return true;    // real page — leave it alone
    }
  }
  return false;
}

function renderListing(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => !EXCLUDE.has(e.name));
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const files = entries.filter((e) => e.isFile()).map((e) => e.name)
    .filter((n) => n !== 'index.html')
    .sort();

  const rel = toPosix(path.relative(ROOT, dir));
  const title = rel === '' ? '/' : '/' + rel + '/';
  const parent = rel === '' ? '' : '<li class="up"><a href="../">../</a></li>';

  // Relative stylesheet href from THIS directory, so it works under any subpath.
  const cssLink = CSS_FILE
    ? `<link rel="stylesheet" href="${escapeHtml(toPosix(path.relative(dir, CSS_FILE)))}" />`
    : '';

  // Mark subdirectories that are runnable apps (have their own index) so the
  // listing can point at them distinctly.
  const li = (name, cls, href) =>
    `<li class="${cls}"><a href="${escapeHtml(href)}">${escapeHtml(name)}</a></li>`;
  const dirItems = dirs.map((d) => {
    const runnable = hasOwnIndex(path.join(dir, d));
    return li(d + '/', runnable ? 'dir app' : 'dir', d + '/');
  });
  const fileItems = files.map((f) => li(f, 'file', f));

  return `<!DOCTYPE html>
${MARKER}
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  ${cssLink}
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <ul class="file-tree">
    ${[parent, ...dirItems, ...fileItems].filter(Boolean).join('\n    ')}
  </ul>
</body>
</html>
`;
}

let made = 0, skipped = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && !EXCLUDE.has(e.name)) walk(path.join(dir, e.name));
  }
  const label = toPosix(path.relative(ROOT, dir)) || '.';
  if (hasOwnIndex(dir)) { console.log(`  skip   ${label}/  (has its own index)`); skipped++; return; }
  fs.writeFileSync(path.join(dir, 'index.html'), renderListing(dir));
  console.log(`  write  ${label}/index.html`); made++;
}

if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
  console.error(`Not a directory: ${ROOT}`); process.exit(1);
}
console.log(`Generating listings under: ${ROOT}\n`);
walk(ROOT);
console.log(`\nDone. ${made} listing(s) written, ${skipped} dir(s) skipped (already had an index).`);
