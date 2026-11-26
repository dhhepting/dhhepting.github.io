// Pure model data: no DOM, no GL calls.
import { mat4, rotateY } from '../Common/MV.mjs';

export const CUBE_VERTEX_COUNT = 36;

// Unit cube occupying x in [0,1], y in [-0.5,0.5], z in [0,1].
// Its vertical edge at x = 0, z = 0 lies on the Y axis and is the hinge edge.
// Seen from above, the cube fills the quadrant between +X and +Z.
//
// Returns interleaved [px, py, pz, nx, ny, nz] for 12 triangles (CCW = front).
export function buildCube() {
  const x0 = 0, x1 = 1, y0 = -0.5, y1 = 0.5, z0 = 0, z1 = 1;
  const faces = [
    { n: [0, 0, 1],  v: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] }, // +z
    { n: [0, 0, -1], v: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]] }, // -z
    { n: [1, 0, 0],  v: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]] }, // +x
    { n: [-1, 0, 0], v: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] }, // -x
    { n: [0, 1, 0],  v: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]] }, // +y
    { n: [0, -1, 0], v: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] }, // -y
  ];

  const data = new Float32Array(CUBE_VERTEX_COUNT * 6);
  let i = 0;
  for (const { n, v } of faces) {
    for (const k of [0, 1, 2, 0, 2, 3]) {
      data.set(v[k], i); data.set(n, i + 3);
      i += 6;
    }
  }
  return data;
}

// Cube A is fixed. Cube B is the same cube rotated about the hinge (the Y axis).
//
// Measuring angle psi from +X toward +Z, A covers psi in [0, 90].
// B covers psi in [90 + theta, 180 + theta], so:
//   theta =   0 -> B flush against A's +X..-X face (2x1x1 slab)
//   theta =  90 -> B in the opposite quadrant, touching A only along the hinge edge
//   theta = 180 -> B flush against A's other face
// For theta outside [0, 180] the cubes interpenetrate.
//
// rotateY(phi) moves a point at psi to psi - phi, hence the minus sign.
export function hingeModels(thetaDeg) {
  return {
    a: mat4(),
    b: rotateY(-(90 + thetaDeg)),
  };
}
