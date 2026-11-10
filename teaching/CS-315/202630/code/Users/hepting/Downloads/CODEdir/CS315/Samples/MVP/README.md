# MVP: building the model-view-projection matrix (WebGL2)

## What the page shows

Five canvases draw the same model after each matrix has been applied:
final image, 1 model space, 2 world space (after M), 3 eye space (after V·M),
4 normalized device coordinates (after P·V·M and ÷w). The amber box is the camera's
view volume. The matrices M, V, P and P·V·M are printed live under the canvases.
Controls: model transform, two camera setups (lookAt, or position + pitch/yaw/roll),
two projections (perspective, parallel), and a toggle that orbits the camera.
Drag and wheel on the small canvases to look around each space.

## Student task (edit `student.mjs` only)

1. A more complicated model ["more complicated" is optional], however you should add another colouredCube, attach them and move them to demonstrate that they are attached (`createModelMeshes`, `buildModelParts`). Also requires some additions to UI.
2. `buildViewLookAt`
3. `buildViewEuler`
4. `buildPerspective`
5. `buildParallel`

Each stub returns the identity, so the page runs from the start and each canvas
changes as a step is finished. If a function returns something that is not a finite
4x4 matrix, the page keeps the last good one and prints a warning.


## Files

- `app.html`, `assets/style.css`
- `main.mjs` controller: DOM, five contexts, frame loop
- `student.mjs` the exercise;
- `pipeline.mjs` composes M, V, P and P·V·M from the state
- `views.mjs` what each canvas draws; `renderer.mjs` DOM-free renderer; `geometry.mjs` meshes
- `state.mjs` state and camera animation; `ui.mjs` control table and panel
- `matrixUtil.mjs` scale, inverse, matrix formatting
- `shaders/mvp.vert.glsl`, `shaders/mvp.frag.glsl`

## V = Rz(-roll)·Rx(-pitch)·Ry(-yaw)·T(-position).
