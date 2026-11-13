import { rawData, nRows, nColumns } from './honolulu256.mjs';

// Height fields, colour maps and normal maps for the bump map explorer.
// Nothing here touches the DOM or WebGL.
//
// Conventions (chosen so that the tangent frame in bumpMap.vert is right-handed):
//   - a height field is a Float32Array of n*n values in [0, 1], row-major;
//   - row i is the texture's t (= v) coordinate, column j is s (= u), so the
//     texel (i, j) is at u = (j + 0.5)/n, v = (i + 0.5)/n, and v increases with i;
//   - u runs along the tangent T, v along the bitangent B.

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const mod = (a, n) => ((a % n) + n) % n;
export const lerp = (a, b, t) => a + t * (b - a);

export function smoothstep(edge0, edge1, x) {
    if (edge1 <= edge0) return x < edge0 ? 0.0 : 1.0;
    const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

/** A repeatable pseudo-random number in [0, 1) from two integers and a seed. */
export function hash2(ix, iy, seed = 0) {
    let h = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(seed | 0, 2246822519)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Box blur (applied twice, which approximates a Gaussian), radius in texels, edges clamped. */
export function blurBox(values, n, radius) {
    const r = Math.round(radius);
    if (r <= 0) return Float32Array.from(values);

    const pass = (src, horizontal) => {
        const out = new Float32Array(n * n);
        const width = 2 * r + 1;
        for (let line = 0; line < n; line++) {
            const at = (k) => src[horizontal ? line * n + clamp(k, 0, n - 1) : clamp(k, 0, n - 1) * n + line];
            let sum = 0;
            for (let k = -r; k <= r; k++) sum += at(k);
            for (let k = 0; k < n; k++) {
                out[horizontal ? line * n + k : k * n + line] = sum / width;
                sum += at(k + r + 1) - at(k - r);
            }
        }
        return out;
    };
    return pass(pass(pass(pass(values, true), false), true), false);
}

// ---------------------------------------------------------------- Perlin noise
//
// Improved Perlin noise (Perlin 2002): permutation table, quintic fade curve,
// gradients picked by hashing the lattice corners. Lattice coordinates wrap
// with a period, so the result tiles seamlessly. In this explorer it is not a
// texture of its own: it is the generator behind the water example.

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

export function perlinField(n, p) {
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

// Colours for terrain: ocean, beach, lowland, upland, summit.
const terrainRamp = [
    [0.000, [0.10, 0.30, 0.58]],
    [0.004, [0.18, 0.45, 0.70]],
    [0.010, [0.82, 0.76, 0.52]],
    [0.060, [0.34, 0.58, 0.28]],
    [0.300, [0.55, 0.46, 0.30]],
    [0.700, [0.78, 0.74, 0.68]],
    [1.000, [0.96, 0.96, 0.96]],
];

function terrainColour(h) {
    for (let k = 1; k < terrainRamp.length; k++) {
        if (h <= terrainRamp[k][0]) {
            const [h0, c0] = terrainRamp[k - 1];
            const [h1, c1] = terrainRamp[k];
            const t = (h - h0) / (h1 - h0);
            return c0.map((c, i) => lerp(c, c1[i], t));
        }
    }
    return terrainRamp[terrainRamp.length - 1][1];
}

// ------------------------------------------------------- pieces shared by sources

/** The brick a point is in (rows of bricks twice as long as high, every other row offset by half a brick). */
function brickCell(u, v, rows) {
    const row = Math.floor(v * rows);
    const bu = u * rows / 2.0 + (mod(row, 2) === 1 ? 0.5 : 0.0);
    return { row, col: Math.floor(bu), fu: bu - Math.floor(bu), fv: v * rows - row };
}

/** Plain weave: which thread is on top in the crossing at (u, v), and where in the crossing we are. */
function weaveCell(u, v, threads) {
    const cu = Math.floor(u * threads);
    const cv = Math.floor(v * threads);
    const fu = u * threads - cu;
    const fv = v * threads - cv;
    const warpOnTop = (cu + cv) % 2 === 0;          // warp threads run along v, weft threads along u
    return {
        warpOnTop,
        across: warpOnTop ? fu : fv,                  // position across the thread that is on top
        along: warpOnTop ? fv : fu,                   // position along it
    };
}

/** Index-based chirp, as in textureCube4.js: 0.5 + 0.5 sin(rate * i * j) with i, j in 256-texel units. */
function chirpField(n, rate) {
    const values = new Float32Array(n * n);
    const k = 256 / n;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) values[i * n + j] = 0.5 + 0.5 * Math.sin(rate * (i * k) * (j * k));
    }
    return values;
}

const checkerParity = (u, v, checks) => (Math.floor(u * checks) + Math.floor(v * checks)) % 2;   // as textureCube4.js: patchx%2 ^ patchy%2

const grey = (u, v, h) => [h, h, h];

// -------------------------------------------------------------------- sources
//
// params = controls the page builds for the source
// field  = height at (u, v) in [0, 1), or build = the whole array at once (n, params, env)
// albedo = optional colour map: (u, v, height, params) -> [r, g, b] in 0..1

export const SOURCES = {
    square: {
        label: "Raised square",
        params: [],
        field: (u, v) => (u >= 0.25 && u < 0.75 && v >= 0.25 && v < 0.75 ? 1.0 : 0.0),
    },
    honolulu: {
        label: "Honolulu terrain",
        params: [],
        build: (n) => honoluluField(n),
        albedo: (u, v, h) => terrainColour(h),
    },
    water: {
        label: "Water (tileable noise normals)",
        params: [
            { id: "shape", label: "Wave shape", type: "select", value: "smooth",
                options: [["smooth", "Smooth swell (fBm)"], ["choppy", "Choppy (ridged)"]] },
            { id: "detail", label: "Detail (octaves)", type: "range", min: 2, max: 6, step: 1, value: 5 },
            { id: "seed", label: "Seed", type: "range", min: 0, max: 99, step: 1, value: 11 },
        ],
        build: (n, p) => perlinField(n, {
            frequency: 6, octaves: p.detail, persistence: 0.5, seed: p.seed,
            type: p.shape === "choppy" ? "ridged" : "fbm",
        }),
    },
    text: {
        label: "Embossed or engraved text",
        params: [
            { id: "text", label: "Text", type: "text", value: "BUMP", maxLength: 12 },
            { id: "bevel", label: "Bevel width (fraction of the width)", type: "range", min: 0, max: 0.04, step: 0.001, value: 0.01 },
            { id: "mode", label: "Letters are", type: "select", value: "emboss",
                options: [["emboss", "Raised (embossed)"], ["engrave", "Cut in (engraved)"]] },
        ],
        build: (n, p, env) => {
            const raster = env.rasterizeText ? env.rasterizeText(p.text, n) : new Float32Array(n * n);
            const blurred = blurBox(raster, n, p.bevel * n / 2.0);   // two box passes of this radius, so the bevel is about bevel * n wide
            if (p.mode === "engrave") for (let i = 0; i < blurred.length; i++) blurred[i] = 1.0 - blurred[i];
            return blurred;
        },
        albedo: (u, v, h, p) => {
            const t = p.mode === "engrave" ? 1.0 - h : h;       // 1 on the letters
            return [lerp(0.36, 0.95, t), lerp(0.25, 0.74, t), lerp(0.14, 0.28, t)];   // bronze plate, gold letters
        },
    },
    bricks: {
        label: "Bricks",
        params: [
            { id: "rows", label: "Rows", type: "range", min: 2, max: 24, step: 1, value: 8 },
            { id: "mortar", label: "Mortar width", type: "range", min: 0.02, max: 0.4, step: 0.01, value: 0.12 },
            { id: "softness", label: "Edge softness", type: "range", min: 0, max: 0.3, step: 0.01, value: 0.04 },
        ],
        field: (u, v, p) => {
            const { fu, fv } = brickCell(u, v, p.rows);
            const dist = Math.min(fv - p.mortar, 1.0 - fv, fu - p.mortar / 2.0, 1.0 - fu);
            return smoothstep(0.0, p.softness, dist);
        },
        albedo: (u, v, h, p) => {
            const { row, col } = brickCell(u, v, p.rows);
            const tint = hash2(row, mod(col, 1000), 5);
            const brick = [0.55 + 0.18 * tint, 0.22 + 0.08 * tint, 0.17 + 0.05 * tint];
            const mortar = [0.68, 0.66, 0.60];
            const t = smoothstep(0.15, 0.85, h);
            return mortar.map((m, i) => lerp(m, brick[i], t));
        },
    },
    hammered: {
        label: "Hammered metal",
        params: [
            { id: "cells", label: "Dents across", type: "range", min: 3, max: 40, step: 1, value: 10 },
            { id: "jitter", label: "Irregularity", type: "range", min: 0, max: 1, step: 0.05, value: 0.8 },
            { id: "variation", label: "Depth variation", type: "range", min: 0, max: 1, step: 0.05, value: 0.5 },
            { id: "seed", label: "Seed", type: "range", min: 0, max: 99, step: 1, value: 3 },
        ],
        field: (u, v, p) => {
            const c = p.cells;
            const x = u * c;
            const y = v * c;
            const ix = Math.floor(x);
            const iy = Math.floor(y);
            let deepest = 0.0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const cx = ix + dx;
                    const cy = iy + dy;
                    const wx = mod(cx, c);
                    const wy = mod(cy, c);
                    const centreX = cx + 0.5 + (hash2(wx, wy, p.seed) - 0.5) * p.jitter;
                    const centreY = cy + 0.5 + (hash2(wx, wy, p.seed + 101) - 0.5) * p.jitter;
                    const radius = 0.5 * (1.0 + 0.45 * hash2(wx, wy, p.seed + 202));     // dents overlap their neighbours
                    const d = Math.hypot(x - centreX, y - centreY) / radius;
                    if (d < 1.0) {
                        const depth = 1.0 - p.variation * hash2(wx, wy, p.seed + 303);
                        deepest = Math.max(deepest, depth * (1.0 - d * d));              // a parabolic bowl: a crease where two dents meet
                    }
                }
            }
            return 1.0 - deepest;
        },
        albedo: (u, v, h) => [0.95 * (0.75 + 0.25 * h), 0.58 * (0.75 + 0.25 * h), 0.42 * (0.75 + 0.25 * h)],   // copper
    },
    dimples: {
        label: "Golf ball dimples",
        params: [
            { id: "across", label: "Dimples across", type: "range", min: 4, max: 24, step: 2, value: 10 },
        ],
        field: (u, v, p) => {
            const across = p.across;
            const rows = 2 * Math.round(across / Math.sqrt(3.0));   // an even number of rows, so the lattice tiles
            const x = u * across;
            const y = v * rows;
            const radius = 0.46 / across;
            let depth = 0.0;
            for (let r = Math.floor(y) - 1; r <= Math.floor(y) + 1; r++) {
                const offset = mod(r, 2) === 1 ? 0.5 : 0.0;
                const k = Math.floor(x - offset);
                for (let dk = -1; dk <= 1; dk++) {
                    const centreX = (k + dk + 0.5 + offset) / across;
                    const centreY = (r + 0.5) / rows;
                    const d = Math.hypot(u - centreX, v - centreY) / radius;
                    if (d < 1.0) depth = Math.max(depth, Math.sqrt(1.0 - d * d));
                }
            }
            return 1.0 - depth;
        },
        albedo: (u, v, h) => [0.88 + 0.1 * h, 0.88 + 0.1 * h, 0.86 + 0.1 * h],
    },
    weave: {
        label: "Fabric weave",
        params: [
            { id: "threads", label: "Threads across (even)", type: "range", min: 4, max: 64, step: 2, value: 24 },
        ],
        field: (u, v, p) => {
            const { across, along } = weaveCell(u, v, p.threads);
            const round = Math.sqrt(Math.max(0.0, 1.0 - (2.0 * across - 1.0) ** 2));
            const hump = Math.sin(Math.PI * along);
            return 0.12 + 0.88 * Math.pow(round, 0.7) * hump;
        },
        albedo: (u, v, h, p) => {
            const { warpOnTop } = weaveCell(u, v, p.threads);
            const thread = warpOnTop ? [0.70, 0.20, 0.24] : [0.20, 0.30, 0.58];
            return thread.map((c) => c * (0.35 + 0.65 * h));
        },
    },
    waves: {
        label: "Sine waves",
        params: [
            { id: "waves", label: "Waves across (rounded so the pattern tiles)", type: "range", min: 1, max: 32, step: 1, value: 6 },
            { id: "angle", label: "Direction (degrees, to the nearest tiling direction)", type: "range", min: 0, max: 180, step: 1, value: 30 },
        ],
        field: (u, v, p) => {
            // The wave vector is rounded to whole numbers of waves across the texture, so the pattern tiles
            // seamlessly; the direction is the nearest one that does.
            const a = p.angle * Math.PI / 180.0;
            const ku = Math.round(p.waves * Math.cos(a));
            const kv = Math.round(p.waves * Math.sin(a));
            return 0.5 + 0.5 * Math.sin(2.0 * Math.PI * (ku * u + kv * v));
        },
        albedo: (u, v, h) => [0.66 + 0.1 * h, 0.68 + 0.1 * h, 0.72 + 0.1 * h],     // galvanized steel
    },
    ripples: {
        label: "Ripples",
        params: [
            { id: "rings", label: "Rings per unit length", type: "range", min: 2, max: 40, step: 1, value: 12 },
        ],
        field: (u, v, p) => 0.5 + 0.5 * Math.cos(2.0 * Math.PI * p.rings * Math.hypot(u - 0.5, v - 0.5)),
    },
    studs: {
        label: "Studs (hemispheres)",
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
    checker: {
        label: "Checkerboard (textureCubev2)",
        params: [
            { id: "cells", label: "Squares across", type: "range", min: 2, max: 32, step: 1, value: 8 },
            { id: "softness", label: "Edge softness", type: "range", min: 0, max: 1, step: 0.01, value: 0.0 },
        ],
        field: (u, v, p) => {
            const soft = Math.max(p.softness, 0.001);
            const wave = (t) => clamp(Math.sin(Math.PI * p.cells * t) / soft, -1.0, 1.0);
            return 0.5 * (1.0 - wave(u) * wave(v));          // 1 on odd squares, as in textureCube2.js
        },
        albedo: grey,
    },
    stripeGrid: {
        label: "Two striped textures multiplied (textureCube3)",
        params: [
            { id: "checks", label: "Stripes across", type: "range", min: 4, max: 128, step: 4, value: 64 },
        ],
        // texture 0 has stripes that vary with the row (v), texture 1 with the column (u); the shader multiplies them
        field: (u, v, p) => (Math.floor(v * p.checks) % 2 === 1 && Math.floor(u * p.checks) % 2 === 1 ? 1.0 : 0.0),
        albedo: grey,
    },
    chirp: {
        label: "sin(rate · i · j) pattern (textureCube4)",
        params: [
            { id: "rate", label: "Rate", type: "range", min: 0.01, max: 0.5, step: 0.01, value: 0.1 },
        ],
        build: (n, p) => chirpField(n, p.rate),
        albedo: grey,
    },
    checkerChirp: {
        label: "Checkerboard × sin pattern (textureCube4)",
        params: [
            { id: "checks", label: "Squares across", type: "range", min: 2, max: 32, step: 1, value: 8 },
            { id: "rate", label: "Rate", type: "range", min: 0.01, max: 0.5, step: 0.01, value: 0.1 },
        ],
        build: (n, p) => {
            const chirp = chirpField(n, p.rate);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) chirp[i * n + j] *= checkerParity((j + 0.5) / n, (i + 0.5) / n, p.checks);
            }
            return chirp;
        },
        albedo: grey,
    },
    slice3d: {
        label: "Slice of the 3D sphere texture (texture3D3)",
        params: [
            { id: "slice", label: "Slice position z", type: "range", min: -0.5, max: 0.5, step: 0.01, value: 0.0 },
        ],
        // the red channel of texture3D3.js: 510 r / texSize inside a sphere of radius 0.4 texSize, zero outside
        field: (u, v, p) => {
            const r = Math.hypot(u - 0.5, v - 0.5, p.slice);
            return r < 0.4 ? Math.min(1.0, 2.0 * r) : 0.0;
        },
        albedo: (u, v, h, p) => {
            const r = Math.hypot(u - 0.5, v - 0.5, p.slice);
            if (r >= 0.4) return [0, 0, 0];
            const t = Math.min(1.0, 2.0 * r);
            return [t, 1.0 - t, 0.0];                      // green at the centre, red at the outside
        },
    },
};

export function defaultParams(sourceId) {
    return Object.fromEntries(SOURCES[sourceId].params.map((spec) => [spec.id, spec.value]));
}

/** The height field for one source, as n*n floats in [0, 1]. env.rasterizeText(text, n) is supplied by the page. */
export function generateHeights(sourceId, n, params, env = {}) {
    const source = SOURCES[sourceId];
    if (source.build) return source.build(n, params, env);

    const values = new Float32Array(n * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            values[i * n + j] = source.field((j + 0.5) / n, (i + 0.5) / n, params);
        }
    }
    return values;
}

/** The colour map for a source as n*n RGBA bytes, or null if it has none. */
export function generateAlbedo(sourceId, n, heights, params) {
    const source = SOURCES[sourceId];
    if (!source.albedo) return null;

    const pixels = new Uint8Array(n * n * 4);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const rgb = source.albedo((j + 0.5) / n, (i + 0.5) / n, heights[i * n + j], params);
            const k = 4 * (i * n + j);
            pixels[k] = Math.round(255 * clamp(rgb[0], 0, 1));
            pixels[k + 1] = Math.round(255 * clamp(rgb[1], 0, 1));
            pixels[k + 2] = Math.round(255 * clamp(rgb[2], 0, 1));
            pixels[k + 3] = 255;
        }
    }
    return pixels;
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
