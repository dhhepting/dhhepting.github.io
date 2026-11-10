// Small helpers that sit beside Common/MV.mjs.
// Matrices follow MV.mjs: an array of four rows, with m.matrix === true.
import { mat4 } from '../../Common/MV.mjs';

export function scaleMatrix(x, y, z) {
  return mat4(
    x, 0, 0, 0,
    0, y, 0, 0,
    0, 0, z, 0,
    0, 0, 0, 1);
}

// Gauss-Jordan inverse of a 4x4 matrix. Returns null if it is singular.
export function inverse4(m) {
  const a = m.map((row, i) => [...row, ...[0, 1, 2, 3].map(j => (i === j ? 1 : 0))]);
  for (let col = 0; col < 4; col++) {
    let pivot = col;
    for (let r = col + 1; r < 4; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const d = a[col][col];
    for (let c = 0; c < 8; c++) a[col][c] /= d;
    for (let r = 0; r < 4; r++) {
      if (r === col) continue;
      const f = a[r][col];
      if (f !== 0) for (let c = 0; c < 8; c++) a[r][c] -= f * a[col][c];
    }
  }
  return mat4(...a.flatMap(row => row.slice(4)));
}

export function isMatrix4(m) {
  return Array.isArray(m) && m.length === 4 &&
    m.every(row => Array.isArray(row) && row.length === 4 && row.every(Number.isFinite));
}

// Four lines of text, for the on-page readout.
export function formatMatrix(m) {
  return m.map(row => row.map(v => (Math.abs(v) < 5e-3 ? 0 : v).toFixed(2).padStart(8)).join('')).join('\n');
}

// Rotations about x, y, z, angle in degrees (right-handed, same as the textbook's MV.js).
const radiansOf = degrees => (degrees * Math.PI) / 180;

export function rotateX(theta) {
  const c = Math.cos(radiansOf(theta)), s = Math.sin(radiansOf(theta));
  return mat4(1, 0, 0, 0,  0, c, -s, 0,  0, s, c, 0,  0, 0, 0, 1);
}

export function rotateY(theta) {
  const c = Math.cos(radiansOf(theta)), s = Math.sin(radiansOf(theta));
  return mat4(c, 0, s, 0,  0, 1, 0, 0,  -s, 0, c, 0,  0, 0, 0, 1);
}

export function rotateZ(theta) {
  const c = Math.cos(radiansOf(theta)), s = Math.sin(radiansOf(theta));
  return mat4(c, -s, 0, 0,  s, c, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1);
}
