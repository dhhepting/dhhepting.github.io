# asgn1-gasket-2D-chaos-spin — README

This small README explains the modernized `asgn1-gasket-2D-chaos-spin` demo found in this folder.

**Purpose:**
- Demonstrates a 2D Sierpiński triangle (chaos game) rendered with WebGL2.
- The JavaScript was modernized to an ES module, uses typed buffers, and starts a single animation loop.

**Files of interest**
- `asgn1-gasket-2D-chaos-spin.html` — demo page (loads vertex/fragment shaders and the module script).
- `asgn1-gasket-2D-chaos-spin.js` — ES module script (expects to be loaded with `type="module"`).

Dependencies
- The page expects two helper scripts (loaded from their current URLs in the HTML):
  - `https://interactivecomputergraphics.com/8E/Code/Common/initShaders.js` (provides `initShaders`)
  - `https://interactivecomputergraphics.com/8E/Code/Common//MVnew.js` (provides `mat3`, `vec2`, `vec3`, `vec4`, `flatten`, etc.)

If you prefer to host those locally, download them into this folder and update the `<script>` tags in the HTML.

Quick start (local HTTP server)
1. From the repo root, start a simple HTTP server (Python 3):

```bash
python3 -m http.server 8000
```

2. Open the demo in a WebGL2-capable browser:

```
http://localhost:8000/teaching/CS-315+733/202530/code/asgn1-gasket-2D-chaos-spin.html
```

Common checks & troubleshooting
- If the page prints "WebGL 2.0 is not available" — try a different browser (Chrome, Edge, Firefox) or verify GPU drivers are enabled.
- If you see 404s for the helper scripts, either place `initShaders.js` and `MVnew.js` in this directory and update the HTML or adjust the URLs to accessible copies.
- Do not open the HTML file via `file://` — the page must be served over HTTP to avoid CORS and module-loading issues.

Quick developer checks
- Run a lightweight JS syntax check with Node:

```bash
node --check teaching/CS-315+733/202530/code/asgn1-gasket-2D-chaos-spin.js
```

- Grep to verify the HTML uses an ES module script tag:

```bash
grep -n 'type="module"' teaching/CS-315+733/202530/code/asgn1-gasket-2D-chaos-spin.html
```

Notes
- The HTML input `nbr-points` has an upper bound of `65536` (to keep generation reasonable). Change it in the HTML if you want different defaults.
- The module expects `initShaders` and `MVnew` globals (the existing HTML loads them before the module). If you refactor those helpers to modules, update the app script accordingly.

If you'd like, I can:
- Add local copies of `initShaders.js` and `MVnew.js` to this folder and update the HTML to use them, or
- Add a small automated smoke test that runs a headless Chromium to capture console logs.

---
Generated/updated by the project maintainer tooling.
