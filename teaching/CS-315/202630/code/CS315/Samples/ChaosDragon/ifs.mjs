// ifs.mjs -- the mathematics of the chaos game. No DOM, no WebGL.
//
// Matrices are 3x3 homogeneous 2D transforms stored column-major in a
// Float64Array(9), which is also the layout gl.uniformMatrix3fv wants:
//
//   [ m[0] m[3] m[6] ]     [ a  b  tx ]
//   [ m[1] m[4] m[7] ]  =  [ c  d  ty ]
//   [ m[2] m[5] m[8] ]     [ 0  0  1  ]
//
// MATHEMATICAL EMPATHY
// --------------------
// An affine map like  x' = 0.5x - 0.5y,  y' = 0.5x + 0.5y  hides what it
// does. Empathy means standing where the map stands: at its own centre c,
// the fixed point A(c) = c. From there the map is nothing but a uniform
// scale s and a rotation theta about c. In matrix form, reading right to left:
//
//   A  =  T(c) . R(theta) . S(s) . T(-c)
//         ^^^^   walk back    ^^^^   step into the map's shoes (c -> origin)
//
// Described this way, "move the centre" is a one-line change: keep s and
// theta, change c, and the translation column adjusts itself.

// ---------------------------------------------------------------- matrices

export function identity() {
  const m = new Float64Array(9);
  m[0] = m[4] = m[8] = 1;
  return m;
}

// a . b  (apply b first, then a)
export function mul(a, b) {
  const out = new Float64Array(9);
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += a[k * 3 + row] * b[col * 3 + k];
      }
      out[col * 3 + row] = sum;
    }
  }
  return out;
}

// m0 . m1 . m2 ...  (rightmost is applied to the point first)
export function chain(...ms) {
  return ms.reduce((acc, m) => mul(acc, m), identity());
}

export function translation(x, y) {
  const m = identity();
  m[6] = x;
  m[7] = y;
  return m;
}

export function rotation(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const m = identity();
  m[0] = c;
  m[1] = s;
  m[3] = -s;
  m[4] = c;
  return m;
}

export function scaling(s) {
  const m = identity();
  m[0] = m[4] = s;
  return m;
}

// M . (x, y, 1)^T, returned as [x', y'] (w stays 1 for affine maps)
export function mulPoint(m, x, y) {
  const w = m[2] * x + m[5] * y + m[8];
  return [
    (m[0] * x + m[3] * y + m[6]) / w,
    (m[1] * x + m[4] * y + m[7]) / w,
  ];
}

// ------------------------------------------------- empathy: c, s, theta <-> A

// { centre: [cx, cy], scale, angle }  ->  3x3 matrix
export function empathic({ centre, scale, angle }) {
  const [cx, cy] = centre;
  return chain(
    translation(cx, cy),
    rotation(angle),
    scaling(scale),
    translation(-cx, -cy),
  );
}

// 3x3 matrix -> [[a, b, tx], [c, d, ty]]  (the notation used in the brief)
export function toAffine(m) {
  return [
    [m[0], m[3], m[6]],
    [m[1], m[4], m[7]],
  ];
}

// [[a, b, tx], [c, d, ty]] -> { centre, scale, angle }
//
// The linear part must be a rotation with a uniform scale:
//   [a b; c d] = s [cos -sin; sin cos]   so  a = d  and  b = -c.
// The centre is the fixed point, the solution of (I - L) p = t.
export function fromAffine([[a, b, tx], [c, d, ty]], eps = 1e-9) {
  if (Math.abs(a - d) > eps || Math.abs(b + c) > eps) {
    throw new Error('fromAffine: linear part is not a rotation with uniform scale');
  }
  const m00 = 1 - a;
  const m01 = -b;
  const m10 = -c;
  const m11 = 1 - d;
  const det = m00 * m11 - m01 * m10;
  if (Math.abs(det) < eps) {
    throw new Error('fromAffine: no unique fixed point (map is a pure translation)');
  }
  return {
    centre: [(m11 * tx - m01 * ty) / det, (m00 * ty - m10 * tx) / det],
    scale: Math.hypot(a, c),
    angle: Math.atan2(c, a),
  };
}

// The two maps from the brief: the Heighway dragon.
export const DRAGON = [
  [[0.5, -0.5, 0], [0.5, 0.5, 0]],
  [[-0.5, -0.5, 1], [0.5, -0.5, 0]],
];

// ------------------------------------------------------------- chaos game

// mulberry32: tiny seeded PRNG so a given seed always draws the same picture
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The random "addresses" of the chaos game: which map each step applies.
// Fixed once, then reused every time the maps change, so moving a centre
// MORPHS the picture (point i stays point i) instead of re-rolling the dice.
export function makeChoices(count, nMaps, seed) {
  const rand = mulberry32(seed);
  const out = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = Math.floor(rand() * nMaps);
  }
  return out;
}

// p_{i+1} = M[choices[i]] . p_i, written to outPos as x0,y0,x1,y1,...
// The start must lie on the attractor. Centre 0 always does: it is the
// fixed point of map 0, so the orbit never has to "settle in".
export function chaosGame(mats, choices, count, start, outPos) {
  let x = start[0];
  let y = start[1];
  for (let i = 0; i < count; i++) {
    const m = mats[choices[i]];
    // (x', y', 1) = M . (x, y, 1); the bottom row of an affine map is 0 0 1
    const nx = m[0] * x + m[3] * y + m[6];
    const ny = m[1] * x + m[4] * y + m[7];
    x = nx;
    y = ny;
    outPos[2 * i] = x;
    outPos[2 * i + 1] = y;
  }
}

// ------------------------------------------------------------------- view

// The visible window is a square of half-size `half` about (cx, cy), grown
// along one axis if the canvas is not square, so the window is never cropped.
export function viewExtents({ cx, cy, half }, aspect) {
  return {
    halfW: half * Math.max(1, aspect),
    halfH: half * Math.max(1, 1 / aspect),
    cx,
    cy,
  };
}

// world -> clip, column-major Float32Array(9) ready for uniformMatrix3fv
export function viewMatrix(view, aspect) {
  const { halfW, halfH, cx, cy } = viewExtents(view, aspect);
  const m = chain(scaling2(1 / halfW, 1 / halfH), translation(-cx, -cy));
  return Float32Array.from(m);
}

function scaling2(sx, sy) {
  const m = identity();
  m[0] = sx;
  m[4] = sy;
  return m;
}

// u, v in [0, 1] across the canvas (v pointing up) -> world coordinates
export function worldAt(view, aspect, u, v) {
  const { halfW, halfH, cx, cy } = viewExtents(view, aspect);
  return [cx + (2 * u - 1) * halfW, cy + (2 * v - 1) * halfH];
}
