# figure — textbook hierarchical figure, modernized (DIY WebGL2 + three.js)

Port of `textbook-classic/09/figure.html` + `figure.js`.

## Run / build

    npm install
    npm run dev        # Vite dev server
    npm run build      # -> dist/   (copy dist/* to code/experimental/built/figure/)
    npm test           # DIY-vs-three.js matrix parity test (Node, no browser)

`base: "./"` in `vite.config.js` keeps all URLs relative, so the build works from any folder.
ES modules do not load from `file://`; serve the folder (or use `npm run preview`).

## What changed from the book's version (same behaviour unless noted)

| Book | Here |
| --- | --- |
| `<script>` shader blocks | `src/shaders/figure.vert`, `figure.frag`, loaded with `fetch(new URL("./shaders/…", import.meta.url))` |
| `globals.mjs` / implicit globals | explicit `import` / `export`; no globals |
| `var` everywhere, implicit `i` in `for(i=…)` | `const` / `let` |
| `window.onload = init` | `async init()` in `main.mjs` |
| 11 hand-written slider `<div>`s | generated from `JOINT_CONTROLS` (ids `slider0`…`slider10` kept) |
| `onchange` (fires on release), string values | `input` (live), `Number()` |
| slider shows 0 for legs that start at 180° | sliders initialise from `theta[]` |
| duplicate `id="slider2"` on a `<div>` and the input, stray `"` in `width="512""` | fixed |
| `torso()`, `head()`, … ten copies of the same code | one `drawPart()` + `PARTS` size table |

Kept as in the book: `createNode` / `initNodes` / `traverse` (left-child, right-sibling tree with a
matrix stack), MV-style row-major matrices + `flatten()`, `rotate`/`translate`/`scale`/`mult`/`ortho`,
the cube buffer, 6 `TRIANGLE_FAN`s per box, the orthographic ±10 camera.
One deliberate difference: a node's `render` field holds a part *name* (`"torso"`) instead of a
function, so the model has no GL dependency and can also drive three.js.

## Enhancements

- three.js view next to the DIY canvas (orbit controls, lighting, grid), driven by the same sliders.
- Two pose sources for three.js: the book's matrices uploaded via `Matrix4.fromArray(flatten(m))`, or
  three.js's own `Matrix4` built from the declarative `JOINT_SPEC`. A live readout shows the max
  difference between the two sets of world matrices (≈1e-7).
- DIY view: per-part colours, outlines, depth test (`uColor` uniform in the fragment shader;
  untick *part colours* for the book's flat red).
- Pose buttons and a walk-cycle animation.

## Files

    index.html
    src/main.mjs            wiring (replaces window.onload)
    src/figure-model.mjs    ids, dimensions, createNode/initNodes/traverse, JOINT_SPEC, POSES   (no GL)
    src/diy-renderer.mjs    raw WebGL2 drawing
    src/three-view.mjs      three.js scene
    src/native-transforms.mjs  three.js Matrix4 version of the joint maths (also used by the test)
    src/controls.mjs        slider / pose-button generation
    src/lib/mv.mjs          the MV.js subset used here, as an ES module
    src/lib/init-shaders.mjs   initShadersJS(gl, vsSource, fsSource) + loadText(url)
    src/shaders/*.vert|frag
    tests/parity.mjs

## Using your own `Common/MV.mjs` / `initShadersJS.mjs`

`src/lib/mv.mjs` and `src/lib/init-shaders.mjs` are small stand-ins with MV.js conventions. To use the
shared copies from your CS315 tree, delete them and point the imports at them
(`figure-model.mjs`, `diy-renderer.mjs`, `three-view.mjs`; `init-shaders` only in `diy-renderer.mjs`).
`loadText()` would then need to live somewhere else. Re-run `npm test` afterwards: it will tell you
immediately if the shared MV.mjs disagrees with three.js on any convention.
