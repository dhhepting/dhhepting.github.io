// vite.config.js
import fs from 'fs';
import path from 'path';
import { resolve  } from 'node:path';
import { defineConfig } from 'vite';
import { marked } from 'marked';

export default defineConfig({
    input: { 
      threeJS: resolve(import.meta.dirname, 'ThreeJS/Lab6Sample.html') ,
  },
  plugins: [{
  name: 'custom-directory-listing',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // Split off the query so it doesn't end up in the fs path
      const [urlPath, queryString] = req.url.split('?');
      const params = new URLSearchParams(queryString);
const wantRun = params.has('run');   // was: const showList = params.has('list');
      const targetDir = path.join(process.cwd(), urlPath);
      const hasIndex =
        fs.existsSync(targetDir + 'index.html') ||
        fs.existsSync(targetDir + 'index.php');
      if (urlPath.endsWith('.md') && fs.existsSync(path.join(process.cwd(), urlPath))) {
        const md = fs.readFileSync(path.join(process.cwd(), urlPath), 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>${urlPath}</title>
            <link rel="stylesheet" href="/css/listings.css" />
          </head>
          <body>${marked.parse(md)}</body>
          </html>
        `);
      }
     // Listing is the default for any directory; ?run falls through to Vite's index
if (urlPath.endsWith('/') && !wantRun) {
  if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
    const files = fs.readdirSync(targetDir).filter(x => fs.lstatSync(targetDir + x).isFile());
    const dirs  = fs.readdirSync(targetDir).filter(x => fs.lstatSync(targetDir + x).isDirectory());
    res.writeHead(200, { 'Content-Type': 'text/html' });

    let pre = '';
    if (urlPath !== '/') { pre = '<li><a href="/">/</a></li><li><a href="..">..</a></li>'; }

    // Only offer "run" when there's actually an index to run
    const runLink = hasIndex ? `<p><a href="${urlPath}?run">▶ run app (index.html)</a></p>` : '';

    return res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${urlPath}</title>
        <link rel="stylesheet" href="/css/listings.css" />
      </head>
      <body>
        <h1>${targetDir}</h1>
        ${runLink}
        <ul class="file-tree">
          ${pre}
          ${dirs.map(d => `<li class="dir"><a href="${urlPath}${d}/">${d}/</a></li>`).join('')}
          ${files.map(f => `<li class="file"><a href="${urlPath}${f}">${f}</a></li>`).join('')}
        </ul>
      </body>
      </html>
    `);
  }
}
next();
    });
  }
}]
});