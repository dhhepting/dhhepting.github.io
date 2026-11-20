# SVG Zoom — vector vs frozen raster

Two WebGL2 panels magnify the **same** artwork (`dh.svg`) toward the **same**
focus point at the **same** magnification. The only thing that differs is where
each panel's pixels come from:

- **vector** (left) — the SVG is re-rasterized from its vector source **every
  frame** at display resolution. The zoom is baked into fresh pixels, so the
  edges stay crisp however far you go in. This is what a real SVG viewer does.
- **frozen raster** (right) — the SVG is rasterized **once** to an `N × N` grid
  (default 32) and then only magnified. Its texels grow into visible squares: a
  raster has a fixed resolution, and zooming cannot recover detail that was
  never captured.

The `N` is specifiable — drag the *frozen resolution* slider (4–256) to freeze
the raster at any size and watch how far you can zoom before it breaks up.

## The lesson

This is the resolution-independence of vector graphics, made visible:

- A **vector** image stores *what to draw* (paths, fills), so it can be rendered
  at any size on demand — always sharp.
- A **raster** image stores *a fixed grid of pixels*. Enlarging it just makes
  each stored pixel bigger; `NEAREST` sampling shows hard blocks, `LINEAR`
  smears them into blur. Neither adds detail — press **F** to switch the frozen
  panel's filter and confirm that smoothing is not the same as resolution.

The two panels reach identical framing by two different routes, which is the
point worth dwelling on:

- the **frozen** panel keeps a static texture and does the zoom in the shader,
  by sampling a smaller window of texcoords around the focus (`sampled = focus +
  (uv - focus) / zoom`);
- the **vector** panel bakes the same window into a freshly rasterized texture
  and draws it with no shader zoom at all.

Same window, same focus — only the fidelity differs.

## Controls

- **frozen resolution** — the `N` of the frozen `N × N` raster (the "freeze").
- **max zoom** — how deep the automatic ping-pong zoom goes (2×–12×).
- **pause** / **play** (or **Space** / **P**) — freeze the zoom to inspect a frame.
- **reset** (or **R**) — recentre the focus and return to 1×.
- **frozen filter** (or **F**) — toggle the frozen panel between `NEAREST`
  (blocks) and `LINEAR` (blur).
- **click either panel** — move the shared focus point there.

## Modernization choices

Same conventions as the Colour Cube:

- `const` / `let` only — no `var`.
- ES modules (`main.mjs`, `zoomer.mjs`, `initShadersJS.mjs`), loaded via
  `<script type="module">`.
- Shaders in separate `.glsl` files, fetched with `async` / `await`.
- Controller / renderer split: `Zoomer` never touches the DOM; the controller
  owns both canvases, the render loop, all SVG rasterization, and input.
- One `Zoomer` class drives both panels — identical geometry and shader; only
  the texture source and the sampling filter differ.
- WebGL2 features: one VAO per panel; GLSL ES 3.00 (`in` / `out`,
  `#version 300 es`); `texSubImage2D` reuse so the vector panel's per-frame
  re-upload does not reallocate texture storage each frame.

## Implementation notes

- The SVG is loaded into an `<img>`; a `width`/`height` is injected into the
  in-memory copy (the source `dh.svg` only has a `viewBox`) so every browser
  rasterizes it crisply at whatever size it is drawn.
- The vector panel rasterizes into a fixed `640 × 640` scratch canvas, so its
  per-frame cost is roughly constant. The full-artwork raster size is capped at
  8192 px as a guard; at the default 12× max zoom on this scratch size the cap
  is not reached, so the vector panel stays fully crisp across the slider range.
- Both GL contexts and both 2D scratch contexts use `{ alpha: false }`, and the
  frozen texel colours are painted over an opaque background, so magnified
  texels read as solid blocks with no compositing surprises.

## Running it

ES modules and `fetch` do not work from `file://`, so serve the folder with
[Vite](https://vite.dev/), the same as the Colour Cube:

```
npm run dev
```

Open the printed URL (e.g. http://localhost:5173).

`standalone.html` is a single self-contained file with the shaders, the SVG,
and all the code inlined — it opens straight from `file://` with no server, handy
for a quick look or for handing to students. The modular files below are the
version to build on.

## Files

```
index.html          two canvases, control row, module entry point
main.mjs            controller: GL contexts, SVG rasterization, render loop, controls
zoomer.mjs          Zoomer class (DOM-free renderer; textured quad + UV zoom)
initShadersJS.mjs   two-string shader loader (unchanged, Alex Clarke 2026)
shaders/
  quad.vert.glsl    vertex shader — magnifies texcoords about the focus
  quad.frag.glsl    fragment shader — samples the image
assets/
  dh.svg            the artwork (Daryl Hepting, 2020)
standalone.html     single-file build (shaders + SVG + code inlined)
```
