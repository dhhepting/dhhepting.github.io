# Colour Cube — WebGL2

A unit cube whose eight corners are coloured by their own position:
colour `(r, g, b)` = position `(x, y, z)` with each coordinate in `{0, 1}`.

| Corner    | Colour  |          | Corner    | Colour  |
|-----------|---------|----------|-----------|---------|
| (0, 0, 0) | Black   |          | (0, 0, 1) | Blue    |
| (1, 0, 0) | Red     |          | (1, 0, 1) | Magenta (red + blue)   |
| (1, 1, 0) | Yellow (red + green) | | (1, 1, 1) | White   (red + green + blue) |
| (0, 1, 0) | Green   |          | (0, 1, 1) | Cyan    (green + blue) |

## Modes

Press **M** or **Space** to cycle four viewing modes:

1. **solid colour cube** — filled faces, orbiting camera.
2. **edges + greyscale diagonal** — the 12 edges as colour ramps plus the
   black → white body diagonal, orbiting camera.
3. **diagonal as UP vector** — a static view with the black → white diagonal as
   the camera's up vector, so the achromatic axis is vertical (black at the
   bottom, white on top). Drawn as edges + diagonal. The eye is placed
   perpendicular to the diagonal so that axis stays centred and level.
4. **diagonal as LOOK-AT vector** — a static view with the eye at (2, 2, 2)
   looking at the cube centre, so the view direction *is* the diagonal. The
   cube is seen corner-on and collapses to the hue hexagon. Drawn solid.

## What these modes are for

- **RGB ↔ CMY.** Complementary colours sit at opposite corners across the body
  diagonal: red↔cyan, green↔magenta, blue↔yellow, black↔white. Each secondary
  is white minus one primary.
- **The 12 edges are ramps.** The three edges leaving black are the pure R, G,
  B axes; the three edges reaching white are the C, M, Y axes.
- **HSB.** Mode 3 makes the Brightness/Value (achromatic) axis vertical; mode 4
  looks down it to reveal Hue as the angle around the axis (R→Y→G→C→B→M) and
  Saturation as distance out from the centre.
- **The K in CMYK** is exactly the grey diagonal — the achromatic channel.

Notes: black corners blend into the dark background, and a greyscale ramp has no
single background tone that keeps both ends visible; the dark background favours
the coloured end of every ramp. In mode 4 the hue hexagon is slightly irregular
because the projection is perspective — an orthographic projection down the
diagonal would give a perfectly regular hexagon.

## Exercises (mode 4)

Two optional extensions to the corner-on hexagon view are stubbed in
`matrix.js` and wired into `main.js` behind flags (both default off, so the app
runs unchanged until you switch one on). Suggested order:

1. **`ortho(...)` — orthographic projection** (EXERCISE 1, no trig). Fill in the
   column-major matrix from the comment, then set `ORTHOGRAPHIC_HEXAGON = true`
   at the top of `main.js`. Payoff: the hue hexagon becomes perfectly regular
   (all six corners equidistant, 60 deg apart) instead of perspective-skewed.
2. **`rotationAxis(axis, rad)` — Rodrigues rotation** (EXERCISE 2). Fill in the
   3x3 block from the comment, then set `SPIN_HUE_WHEEL = true`. Payoff: the cube
   turns about its black->white diagonal, so the hue wheel spins in place while
   white stays fixed at the centre. Sanity check: `rotationAxis([1,0,0], t)`
   should equal `rotationX(t)`, and `rotationAxis([0,1,0], t)` should equal
   `rotationY(t)`.

Turning a flag on before its function is implemented throws a clear error
naming the exercise; press M to cycle back to a working mode.

## Modernization choices

- `const` / `let` only — no `var`.
- ES modules (`main.mjs`, `cube.mjs`, `gl-utils.mjs`, `matrix.mjs`), loaded via
  `<script type="module">`.
- Shaders in separate `.glsl` files, fetched with `async` / `await`.
- No MV.js — a small column-major `matrix.js` supplies the mat4 helpers,
  including `perspective` and `lookAt`.
- Controller / renderer split: `Cube` never touches the DOM; the controller
  owns the canvas, the render loop, mode state, key handling, and all cameras.
- WebGL2 features: one VAO per primitive set (solid / edges / diagonal) sharing
  the same vertex buffers; GLSL ES 3.00 (`in` / `out`, `#version 300 es`).

## Running it

ES modules and `fetch` do not work from `file://`, so the folder is served
with [Vite](https://vite.dev/). This folder depends on files from the 
[CS315StarterPack](https://www.labs.cs.uregina.ca/315/WebGL2/CS315StarterPack.zip)

Then, it is assumed that you have unpacked and configured that folder as a Vite project. [Lab Setup instructions located here](https://www.labs.cs.uregina.ca/315/WebGL2/Lab1/#SETUP)

You can then use 
```
npm run dev
```

Open the printed URL (e.g. http://localhost:5173) to view the page.

It is possible to publish this folder to run as a standalone using:
```
npm build
```
By modifying the entry point of the application in vite.config.js to point the index.html file of this folder as described here: https://vite.dev/config/shared-options#input
eg.:
```
input: { 
      ColourCube: resolve(import.meta.dirname, 'ColourCube_for_StarterPack/index.html'),
  }
```

Multiple entry points are possible and all existing points will be published as static, optimised HTML, CSS and Javascript to the `dist` folder on build. Any external assets such as `glsl` files, textures, or 3D models, and their folder structures will need to be copied manually. The resulting folders can then be moved to a web accessible location to be published with no more need for Vite (eg. move `dist` to `php_web` to be viewed via `www.webdev.cs.uregina.ca` ).

However, since student webpages are not located at web root, the optimized javascript must be found relative to the html instead of from web root. ie: Change script path from:
```
  <script type="module" crossorigin src="/assets/ColourCube-randomstring.js"></script>
```
to
```
  <script type="module" crossorigin src="../assets/ColourCube-randomstring.js"></script>
```

## Files

```
index.html          canvas, caption overlay, module entry point
main.mjs            controller: GL context, shader loading, render loop, modes, cameras
cube.mjs            Cube class (DOM-free renderer; solid + edges + diagonal)
matrix.mjs          minimal column-major mat4 helpers (perspective, lookAt, ...)
shaders/
  cube.vert.glsl  vertex shader (GLSL ES 3.00)
  cube.frag.glsl  fragment shader (GLSL ES 3.00)
```
