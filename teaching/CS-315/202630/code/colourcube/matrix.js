// matrix.js
// A tiny, dependency-free set of 4x4 matrix helpers.
//
// All matrices are Float32Array(16) in COLUMN-MAJOR order, which is what
// gl.uniformMatrix4fv(loc, false, m) expects. Element (row, col) lives at
// index [col * 4 + row]. Keeping this one convention throughout is what lets
// us drop MV.js entirely.

export function identity() {
  const m = new Float32Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

// Returns a * b (both column-major). Order matters: the result applies b
// first, then a, to a column vector on the right (out = a * b * v).
export function multiply(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

export function translation(tx, ty, tz) {
  const m = identity();
  m[12] = tx;
  m[13] = ty;
  m[14] = tz;
  return m;
}

export function rotationX(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const m = identity();
  m[5] = c;
  m[6] = s;
  m[9] = -s;
  m[10] = c;
  return m;
}

export function rotationY(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const m = identity();
  m[0] = c;
  m[2] = -s;
  m[8] = s;
  m[10] = c;
  return m;
}

// Standard OpenGL perspective projection. fovyRad is the vertical field of
// view in radians; aspect is width / height.
export function perspective(fovyRad, aspect, near, far) {
  const f = 1 / Math.tan(fovyRad / 2);
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}

// --- Small 3-vector helpers (module-private) for lookAt / rotationAxis. ---
function normalize3(v) {
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

// View matrix for a camera at `eye` looking at `center`, with the given `up`
// hint. `up` need not be exactly perpendicular to the view direction (it is
// re-orthogonalized), but it must not be parallel to it. eye/center/up are
// plain [x, y, z] arrays.
export function lookAt(eye, center, up) {
  const f = normalize3(sub3(center, eye)); // forward (view direction)
  const s = normalize3(cross3(f, up)); // right
  const u = cross3(s, f); // true up

  const m = new Float32Array(16);
  m[0] = s[0];  m[1] = u[0];  m[2] = -f[0];  m[3] = 0;
  m[4] = s[1];  m[5] = u[1];  m[6] = -f[1];  m[7] = 0;
  m[8] = s[2];  m[9] = u[2];  m[10] = -f[2]; m[11] = 0;
  m[12] = -dot3(s, eye);
  m[13] = -dot3(u, eye);
  m[14] = dot3(f, eye);
  m[15] = 1;
  return m;
}

// ===========================================================================
// EXERCISES — complete these two functions.
//
// main.js already calls them; each is guarded by a flag there (both default
// off) so the app runs with these stubs until you switch a flag on. Suggested
// order: EXERCISE 1 first (no trig), then EXERCISE 2.
//
// Both must return a column-major Float32Array(16), same as everything above:
// the entry at (row, col) goes to index [col * 4 + row]. The diagonal lands at
// m[0], m[5], m[10], m[15]; a translation column lands at m[12], m[13], m[14].
// ===========================================================================

// EXERCISE 1 — Orthographic projection.
// A box-shaped view volume with NO perspective foreshortening, so a cube
// sighted down its diagonal projects to a PERFECTLY REGULAR hexagon.
// Turn it on with ORTHOGRAPHIC_HEXAGON in main.js once this is done.
//
// The standard OpenGL ortho matrix (written row-major, for reference):
//
//   | 2/(r-l)      0          0        -(r+l)/(r-l) |
//   | 0        2/(t-b)        0        -(t+b)/(t-b) |
//   | 0            0      -2/(f-n)      -(f+n)/(f-n) |
//   | 0            0          0              1       |
//
//   l,r = left,right   b,t = bottom,top   n,f = near,far
//
// HINT: the three scale terms are on the diagonal (m[0], m[5], m[10]); the
// three offset terms fill the last column (m[12], m[13], m[14]); m[15] = 1.
// Note the -2/(f-n) sign on the z term.
export function ortho(left, right, bottom, top, near, far) {
  // TODO: build and return the column-major matrix above.
  throw new Error('ortho() not implemented yet — see EXERCISE 1 in matrix.js');
}

// EXERCISE 2 — Rotation by `rad` about an ARBITRARY axis (Rodrigues' formula).
// Used to spin the cube about its black->white diagonal (axis = (1,1,1)), so
// the hue hexagon turns in place. Turn it on with SPIN_HUE_WHEEL in main.js.
//
// The axis is normalized for you below. With a = (x, y, z) normalized,
// c = cos(rad), s = sin(rad), t = 1 - c, the rotation is (row-major):
//
//   | t*x*x + c     t*x*y - s*z   t*x*z + s*y |
//   | t*x*y + s*z   t*y*y + c     t*y*z - s*x |
//   | t*x*z - s*y   t*y*z + s*x   t*z*z + c   |
//
// That is the upper-left 3x3 block; row/col index 3 stay as identity
// (zeros, with m[15] = 1).
//
// HINT: start from identity(), then set the nine 3x3 entries via
// [col * 4 + row]. SANITY CHECK when done: rotationAxis([1,0,0], theta) should
// equal rotationX(theta), and rotationAxis([0,1,0], theta) should equal
// rotationY(theta).
export function rotationAxis(axis, rad) {
  const [x, y, z] = normalize3(axis);
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const t = 1 - c;
  // TODO: build and return the column-major rotation matrix above.
  // (x, y, z, c, s, t are ready to use.)
  throw new Error('rotationAxis() not implemented yet — see EXERCISE 2 in matrix.js');
}
