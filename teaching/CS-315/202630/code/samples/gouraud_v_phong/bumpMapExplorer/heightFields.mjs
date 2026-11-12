import { rawData, nRows, nColumns } from './honolulu256.mjs';

// Height fields for the bump map explorer, and the step that turns a height
// field into a normal map. Nothing here touches the DOM or WebGL.
//
// Conventions (chosen so that the tangent frame in bumpMap.vert is right-handed):
//   - a height field is a Float32Array of n*n values in [0, 1], row-major;
//   - row i is the texture's t (= v) coordinate, column j is s (= u), so the
//     texel (i, j) is at u = (j + 0.5)/n, v = (i + 0.5)/n, and v increases with i;
//   - u runs along the tangent T, v along the bitangent B.

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const mod = (a, n) => ((a % n) + n) % n;

function smoothstep(edge0, edge1, x) {
    if (edge1 <= edge0) return x < edge0 ? 0.0 : 1.0;
    const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

// ---------------------------------------------------------------- Perlin noise
//
// Improved Perlin noise (Perlin 2002): permutation table, quintic fade curve,
// gradients picked by hashing the lattice corners. Lattice coordinates wrap
// with a period, so the result tiles seamlessly.

function mulberry32(seed) {
    let a = (seed >>> 0) + 0x6D2B79F5;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function makePermutation(seed) {
    const perm = Array.from({ length: 256 }, (_, i) => i);
    const random = mulberry32(seed);
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    return perm;
}

const gradients = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
const fade = (t) => t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
const lerp = (a, b, t) => a + t * (b - a);

export function perlin2(perm, x, y, period) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    const x0 = mod(xi, period) & 255;
    const x1 = mod(xi + 1, period) & 255;
    const y0 = mod(yi, period) & 255;
    const y1 = mod(yi + 1, period) & 255;

    const corner = (cx, cy, dx, dy) => {
        const g = gradients[perm[(perm[cx] + cy) & 255] & 7];
        return g[0] * dx + g[1] * dy;
    };

    const u = fade(xf);
    const v = fade(yf);
    return lerp(
        lerp(corner(x0, y0, xf, yf), corner(x1, y0, xf - 1.0, yf), u),
        lerp(corner(x0, y1, xf, yf - 1.0), corner(x1, y1, xf - 1.0, yf - 1.0), u),
        v);
}

function normalizeToUnitRange(values) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of values) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const range = hi - lo || 1.0;
    for (let i = 0; i < values.length; i++) values[i] = (values[i] - lo) / range;
    return values;
}

function perlinField(n, p) {
    const perm = makePermutation(p.seed);
    const values = new Float32Array(n * n);

    let amplitude = 1.0;
    for (let octave = 0; octave < p.octaves; octave++) {
        const cells = p.frequency * (1 << octave);          // lattice cells across the texture
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const noise = perlin2(perm, (j + 0.5) / n * cells, (i + 0.5) / n * cells, cells);
                let term;
                if (p.type === "turbulence") term = Math.abs(noise);
                else if (p.type === "ridged") { term = 1.0 - Math.abs(noise); term *= term; }
                else term = noise;
                values[i * n + j] += amplitude * term;
            }
        }
        amplitude *= p.persistence;
    }
    return normalizeToUnitRange(values);
}

// ------------------------------------------------------------ Honolulu terrain

const honoluluMax = rawData.reduce((m, v) => Math.max(m, v), 0);

function honoluluField(n) {
    // Bilinear resampling of the 256 x 256 data (so any texture size works).
    // The data's first row is the top of the map, so rows are flipped to put
    // north at +v. At n = 256 this is an exact copy.
    const values = new Float32Array(n * n);
    const sample = (x, y) => {
        const x0 = clamp(Math.floor(x), 0, nColumns - 1);
        const y0 = clamp(Math.floor(y), 0, nRows - 1);
        const x1 = Math.min(x0 + 1, nColumns - 1);
        const y1 = Math.min(y0 + 1, nRows - 1);
        const fx = clamp(x - x0, 0, 1);
        const fy = clamp(y - y0, 0, 1);
        const at = (r, c) => rawData[r * nColumns + c];
        return lerp(lerp(at(y0, x0), at(y0, x1), fx), lerp(at(y1, x0), at(y1, x1), fx), fy);
    };
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const u = (j + 0.5) / n;
            const v = (i + 0.5) / n;
            values[i * n + j] = sample(u * nColumns - 0.5, (1.0 - v) * nRows - 0.5) / honoluluMax;
        }
    }
    return values;
}

// -------------------------------------------------------------------- sources
//
// bump     = default bump height (see normalsFromHeights)
// params   = controls the page builds for this source
// field    = height at (u, v) in [0, 1), or build = the whole array at once

export const SOURCES = {
    square: {
        label: "Raised square (bumpMap)",
        bump: 0.004,    // about 1/256: a slope of 1 across one texel at 256, as in bumpMap.js
        params: [],
        field: (u, v) => (u >= 0.25 && u < 0.75 && v >= 0.25 && v < 0.75 ? 1.0 : 0.0),
    },
    honolulu: {
        label: "Honolulu terrain (bumpMap2)",
        bump: 0.3,
        params: [],
        build: (n) => honoluluField(n),
    },
    checker: {
        label: "Checkerboard (textureCube2)",
        bump: 0.01,
        params: [
            { id: "cells", label: "Squares across", type: "range", min: 2, max: 32, step: 1, value: 8 },
            { id: "softness", label: "Edge softness", type: "range", min: 0, max: 1, step: 0.01, value: 0.05 },
        ],
        field: (u, v, p) => {
            const soft = Math.max(p.softness, 0.001);
            const wave = (t) => clamp(Math.sin(Math.PI * p.cells * t) / soft, -1.0, 1.0);
            return 0.5 * (1.0 - wave(u) * wave(v));          // 1 on odd squares, as in textureCube2.js
        },
    },
    waves: {
        label: "Sine waves",
        bump: 0.05,
        params: [
            { id: "waves", label: "Waves across", type: "range", min: 1, max: 32, step: 1, value: 6 },
            { id: "angle", label: "Direction (degrees)", type: "range", min: 0, max: 180, step: 1, value: 30 },
        ],
        field: (u, v, p) => {
            const a = p.angle * Math.PI / 180.0;
            return 0.5 + 0.5 * Math.sin(2.0 * Math.PI * p.waves * (u * Math.cos(a) + v * Math.sin(a)));
        },
    },
    ripples: {
        label: "Ripples",
        bump: 0.05,
        params: [
            { id: "rings", label: "Rings per unit length", type: "range", min: 2, max: 40, step: 1, value: 12 },
        ],
        field: (u, v, p) => 0.5 + 0.5 * Math.cos(2.0 * Math.PI * p.rings * Math.hypot(u - 0.5, v - 0.5)),
    },
    bricks: {
        label: "Bricks",
        bump: 0.012,
        params: [
            { id: "rows", label: "Rows", type: "range", min: 2, max: 24, step: 1, value: 8 },
            { id: "mortar", label: "Mortar width", type: "range", min: 0.02, max: 0.4, step: 0.01, value: 0.12 },
            { id: "softness", label: "Edge softness", type: "range", min: 0, max: 0.3, step: 0.01, value: 0.04 },
        ],
        field: (u, v, p) => {
            const row = Math.floor(v * p.rows);
            const fv = v * p.rows - row;
            const bu = u * p.rows / 2.0 + (mod(row, 2) === 1 ? 0.5 : 0.0);   // bricks twice as long as high, offset on odd rows
            const fu = bu - Math.floor(bu);
            const dist = Math.min(fv - p.mortar, 1.0 - fv, fu - p.mortar / 2.0, 1.0 - fu);
            return smoothstep(0.0, p.softness, dist);
        },
    },
    hemispheres: {
        label: "Hemispheres",
        bump: 0.03,
        params: [
            { id: "cells", label: "Bumps across", type: "range", min: 2, max: 16, step: 1, value: 5 },
        ],
        field: (u, v, p) => {
            const fu = u * p.cells - Math.floor(u * p.cells) - 0.5;
            const fv = v * p.cells - Math.floor(v * p.cells) - 0.5;
            const r2 = 4.0 * (fu * fu + fv * fv);
            return r2 < 1.0 ? Math.sqrt(1.0 - r2) : 0.0;
        },
    },
    perlin: {
        label: "Perlin noise",
        bump: 0.25,
        params: [
            { id: "type", label: "Kind", type: "select", value: "fbm",
                options: [["fbm", "Fractal (fBm)"], ["turbulence", "Turbulence (|noise|)"], ["ridged", "Ridged"]] },
            { id: "frequency", label: "Lattice cells across", type: "range", min: 1, max: 32, step: 1, value: 4 },
            { id: "octaves", label: "Octaves", type: "range", min: 1, max: 8, step: 1, value: 5 },
            { id: "persistence", label: "Persistence (amplitude per octave)", type: "range", min: 0.1, max: 0.9, step: 0.05, value: 0.5 },
            { id: "seed", label: "Seed", type: "range", min: 0, max: 99, step: 1, value: 7 },
        ],
        build: (n, p) => perlinField(n, p),
    },
};

export function defaultParams(sourceId) {
    return Object.fromEntries(SOURCES[sourceId].params.map((spec) => [spec.id, spec.value]));
}

/** The height field for one source, as n*n floats in [0, 1]. */
export function generateHeights(sourceId, n, params) {
    const source = SOURCES[sourceId];
    if (source.build) return source.build(n, params);

    const values = new Float32Array(n * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            values[i * n + j] = source.field((j + 0.5) / n, (i + 0.5) / n, params);
        }
    }
    return values;
}

// ------------------------------------------------------------------ normal map

/**
 * Normal map from a height field, as n*n RGBA bytes: RGB = the tangent-space
 * normal packed as 0.5*N + 0.5, A = the height.
 *
 * The slope at a texel is  bump * n * (height difference per texel).  That is
 * the real slope when the surface is one unit wide and bump is its total
 * height, so the result does not depend on the texture size. With bump = 1/256
 * and n = 256 the slope equals the raw difference, which is what bumpMap.js
 * computes.
 *
 *   method: "forward" (the textbook samples), "central", or "sobel"
 *   edges:  "wrap" (differences wrap around, for tiling) or "clamp"
 */
export function normalsFromHeights(heights, n, { bump, method, edges }) {
    const at = edges === "wrap"
        ? (i, j) => heights[mod(i, n) * n + mod(j, n)]
        : (i, j) => heights[clamp(i, 0, n - 1) * n + clamp(j, 0, n - 1)];

    const pixels = new Uint8Array(n * n * 4);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let du;     // height difference per texel along u (columns)
            let dv;     // ... along v (rows)
            if (method === "central") {
                du = (at(i, j + 1) - at(i, j - 1)) / 2.0;
                dv = (at(i + 1, j) - at(i - 1, j)) / 2.0;
            } else if (method === "sobel") {
                du = ((at(i - 1, j + 1) + 2.0 * at(i, j + 1) + at(i + 1, j + 1))
                    - (at(i - 1, j - 1) + 2.0 * at(i, j - 1) + at(i + 1, j - 1))) / 8.0;
                dv = ((at(i + 1, j - 1) + 2.0 * at(i + 1, j) + at(i + 1, j + 1))
                    - (at(i - 1, j - 1) + 2.0 * at(i - 1, j) + at(i - 1, j + 1))) / 8.0;
            } else {
                du = at(i, j + 1) - at(i, j);
                dv = at(i + 1, j) - at(i, j);
            }

            // the surface z = h(u, v) has normal (-dh/du, -dh/dv, 1)
            const nx = -bump * n * du;
            const ny = -bump * n * dv;
            const length = Math.sqrt(nx * nx + ny * ny + 1.0);

            const k = 4 * (i * n + j);
            pixels[k] = Math.round(255 * (0.5 * nx / length + 0.5));
            pixels[k + 1] = Math.round(255 * (0.5 * ny / length + 0.5));
            pixels[k + 2] = Math.round(255 * (0.5 / length + 0.5));
            pixels[k + 3] = Math.round(255 * heights[i * n + j]);
        }
    }
    return pixels;
}
