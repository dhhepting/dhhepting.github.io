// Starting images for the diffusion explorer, a CPU reference for every update
// rule in shaders/step.frag, and the measurements the page reports.
// Nothing here touches the DOM or WebGL, so it can be tested without a browser.
//
// Images are Float32Array(n*n*4), RGBA, row-major, row 0 at the BOTTOM: the
// texel order of a texture rendered to through a framebuffer, where row i is
// gl_FragCoord.y = i + 0.5.

import { rawData, nRows, nColumns } from './honolulu256.mjs';

export const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** Clip-space position (x, y in [-1, 1]) of the centre of texel (row i, column j). */
export const texelToClip = (i, j, n) => [2 * (j + 0.5) / n - 1, 2 * (i + 0.5) / n - 1];

function fill(n, colourAt) {
    const pixels = new Float32Array(n * n * 4);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const [x, y] = texelToClip(i, j, n);
            const c = colourAt(x, y, i, j);
            pixels.set([c[0], c[1], c[2], 1.0], 4 * (i * n + j));
        }
    }
    return pixels;
}

// The triangle of render1-render5: (-1,-1), (0, 1), (1,-1) in clip coordinates.
export const inTriangle = (x, y) => y >= -1 && y <= 1 && Math.abs(x) <= (1 - y) / 2;

/** Inside the Sierpinski gasket that render1/render3 draw with divideTriangle(..., 5). */
export function inGasket(x, y, levels) {
    if (!inTriangle(x, y)) return false;
    // barycentric-style coordinates: (-1,-1) -> (0,0), (1,-1) -> (1,0), (0,1) -> (0,1)
    let v = (y + 1) / 2;
    let u = (x + 1 - v) / 2;
    for (let k = 0; k < levels; k++) {
        u *= 2;
        v *= 2;
        if (u >= 1) u -= 1;
        else if (v >= 1) v -= 1;
        else if (u + v > 1) return false;        // the middle triangle, removed at this level
    }
    return true;
}

let seedState = 1;
function random() {                               // a small LCG so seeds are repeatable
    seedState = (Math.imul(seedState, 1664525) + 1013904223) >>> 0;
    return seedState / 4294967296;
}
export function reseed(s) { seedState = s >>> 0 || 1; }

const honoluluMax = rawData.reduce((m, v) => Math.max(m, v), 0);

const RED = [1, 0, 0];
const WHITE = [1, 1, 1];

export const SEEDS = {
    triangle: {
        label: "Red triangle on white (render4, render5)",
        make: (n) => fill(n, (x, y) => (inTriangle(x, y) ? RED : WHITE)),
    },
    gasket: {
        label: "Sierpinski gasket (render1, render3)",
        make: (n) => fill(n, (x, y) => (inGasket(x, y, 5) ? RED : WHITE)),
    },
    impulse: {
        label: "One texel at full value",
        make: (n) => fill(n, (x, y, i, j) => (i === n / 2 && j === n / 2 ? WHITE : [0, 0, 0])),
    },
    block: {
        label: "A white square",
        make: (n) => fill(n, (x, y) => (Math.abs(x) < 0.25 && Math.abs(y) < 0.25 ? WHITE : [0, 0, 0])),
    },
    hat: {
        label: "Mexican hat, sin(r)/r (hatImage1)",
        // hatImage1.js: x, y in [-4 pi, 4 pi), c = (1 + sin(r)/r)/2
        make: (n) => fill(n, (x, y, i, j) => {
            const a = Math.PI * (8 * i / n - 4), b = Math.PI * (8 * j / n - 4), r = Math.hypot(a, b);
            const c = r ? (1 + Math.sin(r) / r) / 2 : 1;
            return [c, c, c];
        }),
    },
    honolulu: {
        label: "Honolulu elevation (hawaiiImage)",
        // nearest-neighbour resampling; the data's first row is the top of the map
        make: (n) => fill(n, (x, y, i, j) => {
            const r = Math.min(nRows - 1, Math.floor((n - 1 - i) * nRows / n));
            const c = Math.min(nColumns - 1, Math.floor(j * nColumns / n));
            const h = rawData[r * nColumns + c] / honoluluMax;
            return [h, h, h];
        }),
    },
    noise: {
        label: "Random noise",
        make: (n) => { reseed(7); return fill(n, () => { const v = random(); return [v, v, v]; }); },
    },
    grayScott: {
        label: "Gray-Scott start: U = 1, a few patches of V",
        make: (n) => {
            reseed(11);
            const patches = Array.from({ length: 9 }, () => [random() * 1.4 - 0.7, random() * 1.4 - 0.7]);
            return fill(n, (x, y) => (patches.some(([px, py]) => Math.abs(x - px) < 0.04 && Math.abs(y - py) < 0.04) ? [0.5, 0.25, 0] : [1, 0, 0]));
        },
    },
    empty: {
        label: "Empty (black): paint or add particles",
        make: (n) => fill(n, () => [0, 0, 0]),
    },
};

// ---------------------------------------------------------------- the update rules
//
// The same arithmetic as step.frag, one channel or vector at a time. The tests run
// both on the same image and compare.

export const RULES = {
    average4: { label: "Average of the 4 neighbours (render3, render4, particleDiffusion)" },
    heat: { label: "Explicit heat step u + r(sum of 4 neighbours - 4u) (render5, r = 0.5)" },
    average5: { label: "Average of the centre and its 4 neighbours" },
    grayScott: { label: "Gray-Scott reaction-diffusion (U in red, V in green)" },
    none: { label: "None: copy (for viewing and filtering images)" },
};
export const RULE_INDEX = { average4: 0, heat: 1, average5: 2, grayScott: 3, none: 4 };

/**
 * One step on the CPU. boundary: "clamp" | "repeat". quantize: true for RGBA8
 * (round to 1/255 and clamp to [0, 1], as a UNORM8 render target does).
 */
export function stepCPU(image, n, { rule, rate = 0.25, decay = 1, boundary = "clamp", feed = 0.055, kill = 0.062, diffU = 1.0, diffV = 0.5, quantize = false }) {
    const out = new Float32Array(n * n * 4);
    const wrap = (k) => (boundary === "repeat" ? (k + n) % n : Math.min(n - 1, Math.max(0, k)));
    const at = (i, j, c) => image[4 * (wrap(i) * n + wrap(j)) + c];
    const store = (x) => (quantize ? Math.round(clamp01(x) * 255) / 255 : x);

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const k = 4 * (i * n + j);
            if (rule === "grayScott") {
                const lap = (c) => -at(i, j, c) + 0.2 * (at(i + 1, j, c) + at(i - 1, j, c) + at(i, j + 1, c) + at(i, j - 1, c))
                    + 0.05 * (at(i + 1, j + 1, c) + at(i + 1, j - 1, c) + at(i - 1, j + 1, c) + at(i - 1, j - 1, c));
                const u = at(i, j, 0), v = at(i, j, 1), uvv = u * v * v;
                out[k] = store(u + diffU * lap(0) - uvv + feed * (1 - u));
                out[k + 1] = store(v + diffV * lap(1) + uvv - (feed + kill) * v);
                out[k + 2] = 0;
            } else {
                for (let c = 0; c < 3; c++) {
                    const centre = at(i, j, c);
                    const sum = at(i + 1, j, c) + at(i - 1, j, c) + at(i, j + 1, c) + at(i, j - 1, c);
                    let x;
                    if (rule === "average4") x = sum / 4;
                    else if (rule === "heat") x = centre + rate * (sum - 4 * centre);
                    else if (rule === "average5") x = (centre + sum) / 5;
                    else x = centre;
                    out[k + c] = store(x * decay);
                }
            }
            out[k + 3] = 1;
        }
    }
    return out;
}

/** How the checkerboard pattern (-1)^(i+j), the fastest-varying one, is scaled by one step. */
export function checkerboardFactor(rule, rate) {
    if (rule === "average4") return -1;              // sum of 4 neighbours = -4c, divided by 4
    if (rule === "heat") return 1 - 8 * rate;
    if (rule === "average5") return -3 / 5;
    if (rule === "none") return 1;
    return null;                                     // Gray-Scott is not linear
}

/** Mean, min, max and checkerboard component of one channel. */
export function measure(image, n, channel) {
    let sum = 0, min = Infinity, max = -Infinity, checker = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const v = image[4 * (i * n + j) + channel];
            sum += v;
            if (v < min) min = v;
            if (v > max) max = v;
            checker += ((i + j) & 1) ? -v : v;
        }
    }
    return { mean: sum / (n * n), min, max, checker: checker / (n * n) };
}

/** RGBA8 bytes for an image (what texImage2D receives for the RGBA8 format). */
export function toBytes(image) {
    const bytes = new Uint8Array(image.length);
    for (let k = 0; k < image.length; k++) bytes[k] = Math.round(clamp01(image[k]) * 255);
    return bytes;
}

// ---------------------------------------------------------------- particles (particleDiffusion.js)

export function makeParticles(count, seed = 3) {
    reseed(seed);
    const positions = new Float32Array(2 * count);
    for (let k = 0; k < 2 * count; k++) positions[k] = 2 * random() - 1;
    return positions;
}

/** A random-walk step of up to `size` in x and y, wrapping around the square. */
export function moveParticles(positions, size) {
    for (let k = 0; k < positions.length; k++) {
        let p = positions[k] + size * (2 * random() - 1);
        if (p > 1) p -= 2;
        if (p < -1) p += 2;
        positions[k] = p;
    }
}
