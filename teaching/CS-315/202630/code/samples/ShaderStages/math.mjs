// Pure helpers (no DOM, no GL). They mirror what the GPU does so the page can
// show its work and check the GPU's answer. Vectors and matrices come from
// Common/MV.mjs.

import { vec2, vec3, vec4, mult, add } from '../../Common/MV.mjs';

/** What triangle.vert does to a vertex: u_matrix * vec4(p, 0, 1), xy only. */
export function transform(matrix, p) {
  const out = mult(matrix, vec4(p[0], p[1], 0, 1));
  return vec2(out[0], out[1]);
}

/** Clip space (-1..1, y up) -> logical display pixels (y down). */
export function clipToDisplay([x, y], size) {
  return [((x + 1) / 2) * size, ((1 - y) / 2) * size];
}

export function displayToClip([px, py], size) {
  return vec2((px / size) * 2 - 1, 1 - (py / size) * 2);
}

/** Clip-space position of the center of pixel (ix, iy); iy counts from the top. */
export function pixelCenterToClip(ix, iy, n) {
  return vec2(((ix + 0.5) / n) * 2 - 1, 1 - ((iy + 0.5) / n) * 2);
}

/** Barycentric weights of point p in triangle (a, b, c). */
export function barycentric(p, a, b, c) {
  const det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  if (Math.abs(det) < 1e-12) return vec3(-1, -1, -1); // degenerate triangle
  const wa = ((b[1] - c[1]) * (p[0] - c[0]) + (c[0] - b[0]) * (p[1] - c[1])) / det;
  const wb = ((c[1] - a[1]) * (p[0] - c[0]) + (a[0] - c[0]) * (p[1] - c[1])) / det;
  return vec3(wa, wb, 1 - wa - wb);
}

export const isInside = (weights) => weights.every((w) => w >= 0);

/** The rasterizer's interpolation: weights[0]*c0 + weights[1]*c1 + weights[2]*c2. */
export function blend(weights, colors) {
  return add(add(mult(weights[0], colors[0]), mult(weights[1], colors[1])),
             mult(weights[2], colors[2]));
}

/** What each fragment shader should output for a pixel (used to check the GPU). */
export function expectedOutput(mode, weights, colors, fragCoord, resolution) {
  switch (mode) {
    case 'color': return blend(weights, colors);
    case 'barycentric': return vec3(weights[0], weights[1], weights[2]);
    case 'fragcoord': return vec3(fragCoord[0] / resolution, fragCoord[1] / resolution, 0);
    default: throw new Error(`Unknown fragment shader mode: ${mode}`);
  }
}

export const toByte = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255);

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return vec3((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export function rgbToHex(rgb) {
  return '#' + [rgb[0], rgb[1], rgb[2]].map((v) => toByte(v).toString(16).padStart(2, '0')).join('');
}
