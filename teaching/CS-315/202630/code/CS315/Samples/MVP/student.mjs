// STUDENT FILE: this is the only file you need to edit.
// Everything else (canvases, controls, animation, drawing) is already done.
//
// Matrices come from Common/MV.mjs (mat4, translate, mult, lookAt, perspective, ortho)
// and matrixUtil.mjs (rotateX/Y/Z, scaleMatrix). The page shows what each matrix does as you fill these in.
// Until a function returns a real matrix it returns the identity, so the page runs
// from the start and each canvas changes as you finish a step.
import { mat4, translate, mult } from '../../Common/MV.mjs';
import { colouredCube } from './geometry.mjs';
import { scaleMatrix, rotateX, rotateY, rotateZ } from './matrixUtil.mjs';

// ---- Model -----------------------------------------------------------------

// Called once. Build every mesh the model needs.
export function createModelMeshes() {
  return { block: colouredCube() };
}

// Called every frame. Return the parts of the model as [{ mesh, matrix }].
// `matrix` places a part inside the model's own space (before M is applied).
//
// STEP 1: replace this single block with a more complicated model: several parts,
// each with its own matrix. `seconds` lets you animate a part (an arm, a wheel).
// Try colouredCube() at different sizes, or build your own mesh in geometry.mjs.
export function buildModelParts(meshes, seconds) {
  return [{ mesh: meshes.block, matrix: scaleMatrix(1, 0.6, 1.6) }];
}

// M: model space -> world space (already done for you).
// model = { translate: [x,y,z], rotate: [rx,ry,rz] (degrees), scale: [x,y,z] }
export function buildModelMatrix(model) {
  const [tx, ty, tz] = model.translate;
  const [rx, ry, rz] = model.rotate;
  const [sx, sy, sz] = model.scale;
  // Read right to left: scale, then rotate about x, y, z, then translate.
  return mult(translate(tx, ty, tz), mult(rotateZ(rz), mult(rotateY(ry), mult(rotateX(rx), scaleMatrix(sx, sy, sz)))));
}

// ---- View: two ways to set up the camera ------------------------------------

// STEP 2: camera setup 1. eye, at and up are vec3 objects (what lookAt() expects).
// Hint: one call to lookAt().
export function buildViewLookAt(eye, at, up) {
  return mat4();   // TODO
}

// STEP 3: camera setup 2. position is a vec3 (index it as position[0..2]); the angles are in degrees.
// The camera starts at the origin looking down -z with +y up. Its orientation is
// R = Ry(yaw) * Rx(pitch) * Rz(roll). The view matrix undoes the camera's own
// placement, so build it from the inverse of "orient, then move to position".
// Check yourself: with all three angles at 0 the result should equal translate(-position).
export function buildViewEuler(position, pitch, yaw, roll) {
  return mat4();   // TODO
}

// ---- Projection: two kinds ----------------------------------------------------

// STEP 4: perspective. fovy in degrees; aspect = canvas width / height.
// Hint: perspective() in MV.mjs, or build the matrix yourself from the formulas in the text.
export function buildPerspective(fovy, aspect, near, far) {
  return mat4();   // TODO
}

// STEP 5: parallel (orthographic). `size` is half the height of the view volume,
// so top = size, bottom = -size, and left/right = -+size * aspect.
// Hint: ortho() in MV.mjs.
export function buildParallel(size, aspect, near, far) {
  return mat4();   // TODO
}
