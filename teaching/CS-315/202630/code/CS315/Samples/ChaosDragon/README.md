# Chaos game: dragon curve, seen from each map's own centre

WebGL2 sample in the CS315 style: ES modules (`.mjs`), `let`/`const`, shaders fetched
from `shaders/`, program built with `Common/initShadersJS.mjs`.

## Run

Put this folder next to your `Common/` folder (it imports `../Common/initShadersJS.mjs`),
serve the tree over http (modules do not load from `file://`), open `app.html`.

## Files

| file | job |
|---|---|
| `app.html` | page and controls |
| `main.mjs` | controller: the only file that touches the DOM |
| `chaosgame.mjs` | `ChaosGame`: DOM-free renderer (buffers, uniforms, `gl.POINTS`) |
| `ifs.mjs` | pure maths: 3x3 matrices, the empathic factorisation, the chaos-game loop |
| `shaders/chaos.vert`, `chaos.frag` | one vertex per point; frag clips the centre handles to discs |
| `test/verify.mjs` | `node test/verify.mjs`: maths and renderer against a mock GL, no dependencies |
| `test/smoke.mjs` | `npm i jsdom`, then `node test/smoke.mjs`: runs the real controller; uses your real `../Common` |

## The idea

A map is described from its own centre c (its fixed point), with scale s and rotation theta:

    A = T(c) . R(theta) . S(s) . T(-c)

The brief's two matrices become c0 = (0, 0), c1 = (0.6, 0.2), s = 1/sqrt(2), theta = 45 and 135 degrees.
Moving a centre keeps s and theta and recomputes the matrix, so the translation column follows.

Each point is `p' = A_k . (x, y, 1)^T`, with k drawn at random. The sequence of k is drawn once
(seeded) and reused, so point i stays point i while a centre moves and the picture deforms
instead of shimmering. Centre 0 is a fixed point of map 0, so it lies on the attractor and
the orbit needs no burn-in.

## Possible next steps

* Make `scale` and `angle` adjustable too (the data model already carries them).
* Move the iteration to the GPU with transform feedback (a later, behaviour-changing pass).
