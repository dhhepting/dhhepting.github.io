// vite.config.js
import fs from 'fs';
import path from 'path';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { marked } from 'marked';

export default defineConfig({
  // Relative base: asset URLs are resolved relative to each HTML file, so the
  // same build works under /~hepting/... (uregina), github.io, and local dev
  // without any per-host configuration.
  base: './',
  build: {
    rollupOptions: {
      input: {
        ColourCube: resolve(import.meta.dirname, 'Samples/ColourCube/app.html'),
        SVG_Zoomer: resolve(import.meta.dirname, 'Samples/SVG_Zoomer/app.html'),
      },
      output: {
        // Jekyll silently skips files whose names start with '_' or '.', and
        // Rollup can emit shared chunks like '_commonjsHelpers-*.js'. A fixed
        // 'chunk-' prefix guarantees no chunk name can start with an underscore.
        chunkFileNames: 'assets/chunk-[name]-[hash].js',
      },
    },
  },
  plugins: [{
    name: 'custom-directory-listing',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Split off the query so it doesn't end up in the fs path
        const [urlPath] = req.url.split('?');
        const targetDir = path.join(process.cwd(), urlPath);
        // Runnable app lives at app.html; index.html is reserved for the listing
        const hasApp = fs.existsSync(targetDir + 'app.html');
        if (urlPath.endsWith('.md') && fs.existsSync(path.join(process.cwd(), urlPath))) {
          const md = fs.readFileSync(path.join(process.cwd(), urlPath), 'utf-8');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
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
        // Listing is the response for any directory URL, matching the static site
        if (urlPath.endsWith('/')) {
          if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
            const files = fs.readdirSync(targetDir).filter(x => fs.lstatSync(targetDir + x).isFile());
            const dirs  = fs.readdirSync(targetDir).filter(x => fs.lstatSync(targetDir + x).isDirectory());
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

            let pre = '';
            if (urlPath !== '/') { pre = '<li><a href="/">/</a></li><li><a href="..">..</a></li>'; }

            // Only offer "run" when there's actually an app.html to run
            const runLink = hasApp ? `<p><a href="${urlPath}app.html">▶ run app (app.html)</a></p>` : '';

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
    },
  }],
});