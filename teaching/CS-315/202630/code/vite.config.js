// vite.config.js
import fs from 'fs';
import path from 'path';
import { resolve  } from 'node:path';
import { defineConfig } from 'vite';


export default defineConfig({
    input: { 
      threeJS: resolve(import.meta.dirname, 'ThreeJS/Lab6Sample.html') ,
  },
  plugins: [{
    name: 'custom-directory-listing',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Intercept requests ending in a trailing slash
        const targetDir = path.join(process.cwd(), req.url);
        if (req.url.endsWith('/') && (!fs.existsSync(targetDir+"index.html") && !fs.existsSync(targetDir+"index.php"))) {
          
          if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
            const files = fs.readdirSync(targetDir).filter( (x) => {return fs.lstatSync(targetDir+x).isFile()});
            const dirs = fs.readdirSync(targetDir).filter( (x) => {return fs.lstatSync(targetDir+x).isDirectory()});
            res.writeHead(200, { 'Content-Type': 'text/html' });
            let pre = "";
            if (req.url !== "/") {pre = '<li><a href="/">/</a></li><li><a href="..">..</a></li>'};
            return res.end(`
            <!DOCTYPE html>
            <html>
            <head lang="en">
            <meta charset="UTF-8" />
            <title>${req.url}</title>
            <link rel="stylesheet" href="/css/listings.css" />
            </head>
            <body>
              <h1>${targetDir} </h1>
              <ul class="file-tree">
                ${pre}
                ${dirs.map(d => `<li class="dir"><a href="${req.url}${d}/">${d}/</a></li>`).join('')}
                ${files.map(f => `<li class="file"><a href="${req.url}${f}">${f}</a></li>`).join('')}
              </ul>
            </html>
            `);
          }
        }
        next();
      });
    }
  }]
});