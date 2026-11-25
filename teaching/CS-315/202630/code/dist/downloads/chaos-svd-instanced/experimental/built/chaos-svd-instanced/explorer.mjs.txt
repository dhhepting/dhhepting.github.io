// explorer.mjs -- automated exploration of the two maps. No DOM, no WebGL.
//
// The state of the system is a vector of 12 numbers, 6 per map:
//
//   [ cx, cy, u, v, s0, s1 ]  x  2 maps
//
// cx, cy : the centre (the map's fixed point)
// u, v   : the rotations U and V of the SVD  L = U S V^T   (radians)
// s0, s1 : the singular values, both kept inside (0, 1) so the maps contract
//
// Exploration is a random walk by legs: pick a target vector near the current
// one, glide there with smoothstep easing, pick the next target, and so on.

export const SCALE_LIMITS = [0.05, 0.95];   // hard limits; the UI range sits inside these
export const CENTRE_LIMIT = 1.0;            // centres are explored inside [-1, 1]^2
export const MIN_CENTRE_DISTANCE = 0.4;     // keeps the two maps from collapsing onto each other

export const GROUPS = {
  centres: [0, 1, 6, 7],
  angles: [2, 3, 8, 9],
  scales: [4, 5, 10, 11],
};

export function toVec(ts) {
  return ts.flatMap((t) => [t.centre[0], t.centre[1], t.u, t.v, t.s[0], t.s[1]]);
}

export function fromVec(v) {
  return [0, 6].map((o) => ({
    centre: [v[o], v[o + 1]],
    u: v[o + 2],
    v: v[o + 3],
    s: [v[o + 4], v[o + 5]],
  }));
}

export function smoothstep(t) {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
}

export function lerpVec(a, b, k) {
  return a.map((x, i) => x + (b[i] - x) * k);
}

// keep angles in (-pi, pi]; the picture depends on them only modulo 2 pi
export function wrapAngles(v) {
  const w = v.slice();
  for (const i of GROUPS.angles) {
    w[i] = Math.atan2(Math.sin(w[i]), Math.cos(w[i]));
  }
  return w;
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const uniform = (rand, lo, hi) => lo + (hi - lo) * rand();
const centreDistance = (v) => Math.hypot(v[0] - v[6], v[1] - v[7]);

// sort out a scale range given by two sliders that may cross
export function scaleRange(a, b) {
  const lo = clamp(Math.min(a, b), SCALE_LIMITS[0], SCALE_LIMITS[1]);
  const hi = clamp(Math.max(a, b), SCALE_LIMITS[0], SCALE_LIMITS[1]);
  return [lo, hi];
}

// A completely random vector: the "jump to random" button.
export function randomVec(rand, { smin, smax }) {
  const [lo, hi] = scaleRange(smin, smax);
  const v = new Array(12);
  do {
    for (const i of GROUPS.centres) v[i] = uniform(rand, -CENTRE_LIMIT, CENTRE_LIMIT);
  } while (centreDistance(v) < MIN_CENTRE_DISTANCE);
  for (const i of GROUPS.angles) v[i] = uniform(rand, -Math.PI, Math.PI);
  for (const i of GROUPS.scales) v[i] = uniform(rand, lo, hi);
  return v;
}

// The next waypoint, a step away from `cur`.
// opts: { amount 0..1, centres, angles, scales (booleans), smin, smax }
//   amount = 0 stays put, amount = 1 can land anywhere in the allowed ranges.
// Groups switched off are left exactly where they are.
export function nextTarget(cur, opts, rand) {
  const { amount, smin, smax } = opts;
  const [lo, hi] = scaleRange(smin, smax);
  const t = cur.slice();

  if (opts.centres) {
    for (let tries = 0; tries < 50; tries++) {
      for (const i of GROUPS.centres) {
        t[i] = clamp(cur[i] + uniform(rand, -1, 1) * amount * 2 * CENTRE_LIMIT, -CENTRE_LIMIT, CENTRE_LIMIT);
      }
      if (centreDistance(t) >= MIN_CENTRE_DISTANCE) break;
      for (const i of GROUPS.centres) t[i] = cur[i];   // give up on this draw; the last try keeps the old centres
    }
  }
  if (opts.angles) {
    for (const i of GROUPS.angles) t[i] = cur[i] + uniform(rand, -1, 1) * Math.PI * amount;
  }
  if (opts.scales) {
    for (const i of GROUPS.scales) {
      const goal = uniform(rand, lo, hi);
      t[i] = clamp(cur[i] + (goal - cur[i]) * amount, SCALE_LIMITS[0], SCALE_LIMITS[1]);
    }
  }
  return t;
}
