// The picking explorer's pure logic: the scenes, the cube mesh with a face index per
// vertex, ID encodings, a CPU ray cast to check the GPU against, the pick matrix, and
// the two ways of turning a mouse event into a pixel. No DOM, no GL.

import { vec3, vec4, mat4, mult, translate, scale, rotateX, rotateZ, rotate, lookAt, perspective, inverse } from '../../Common/MV.mjs';

// ---------------------------------------------------------------- the cube of pickCube*.js

const VERTICES = [[-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5],
    [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0.5, -0.5, -0.5]];

// colorCube() in the samples: quad(1,0,3,2), quad(2,3,7,6), ... Face k is drawn with pick colour c[k + 1].
export const QUADS = [[1, 0, 3, 2], [2, 3, 7, 6], [3, 0, 4, 7], [6, 5, 1, 2], [4, 5, 6, 7], [5, 4, 0, 1]];
export const FACE_NAMES = ["front (+z)", "right (+x)", "bottom (-y)", "top (+y)", "back (-z)", "left (-x)"];
export const FACE_NORMALS = [[0, 0, 1], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [-1, 0, 0]];

// The pick colours of pickCube's fragment shader: c[1] ... c[6].
export const PICK_COLOURS = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [0, 255, 255], [255, 0, 255]];
export const PICK_COLOUR_NAMES = ["red", "green", "blue", "yellow", "cyan", "magenta"];

/** 36 vertices: positions (vec3), flat normals, and the face index of each vertex. */
export function buildCube() {
    const positions = [], normals = [], faces = [];
    QUADS.forEach((q, face) => {
        for (const k of [0, 1, 2, 0, 2, 3]) {
            positions.push(...VERTICES[q[k]]);
            normals.push(...FACE_NORMALS[face]);
            faces.push(face);
        }
    });
    return { positions: new Float32Array(positions), normals: new Float32Array(normals), faces: new Float32Array(faces), vertexCount: 36 };
}

// ---------------------------------------------------------------- decoding the samples' way

/** pickCube.js / pickCube2.js / pickCube3.js decode the pixel with nested tests on 255. */
export function sampleDecode(rgb, names) {
    const [r, g, b] = rgb;
    if (r === 255) return g === 255 ? names[0] : b === 255 ? names[1] : names[2];
    if (g === 255) return b === 255 ? names[3] : names[4];
    return b === 255 ? names[5] : "background";
}
export const PICKCUBE2_NAMES = ["front", "back", "right", "left", "top", "bottom"];

/** The face a pick colour means: exact match against c[1..6], or -1 for background. */
export const faceFromPickColour = (rgb) => PICK_COLOURS.findIndex((c) => c[0] === rgb[0] && c[1] === rgb[1] && c[2] === rgb[2]);

// ---------------------------------------------------------------- IDs

/** id 0 is the background; object k, face f is k*6 + f + 1. */
export const encodeId = (object, face) => object * 6 + face + 1;
export const decodeId = (id) => (id === 0 ? null : { object: Math.floor((id - 1) / 6), face: (id - 1) % 6 });

/** An id split into the bytes an RGBA8 target stores (what idColor.frag writes). */
export const idToBytes = (id) => [id & 255, (id >> 8) & 255, (id >> 16) & 255];
export const bytesToId = (rgb) => rgb[0] + (rgb[1] << 8) + (rgb[2] << 16);

// ---------------------------------------------------------------- scenes

export const SCENES = {
    single: {
        label: "One cube (pickCube)",
        objects: [{ position: [0, 0, 0], size: 1.0, colour: [1.0, 0.8, 0.0], spinAxis: null }],
    },
    stack: {
        label: "Six overlapping cubes",
        // Listed nearest the default camera first: drawn in this order with no depth test,
        // a farther cube covers a nearer one wherever they overlap (about 40% of the cube pixels).
        objects: [
            { position: [0.15, 0.1, 1.1], size: 0.75, colour: [0.3, 0.7, 0.35], spinAxis: [1, 0, 1] },
            { position: [-0.45, 0.35, 0.2], size: 0.85, colour: [0.95, 0.75, 0.2], spinAxis: [0, 1, 0] },
            { position: [0.55, -0.3, -0.3], size: 0.9, colour: [0.25, 0.75, 0.8], spinAxis: [0, 0, 1] },
            { position: [-0.15, -0.45, -1.1], size: 1.0, colour: [0.7, 0.35, 0.8], spinAxis: [1, 0, 0] },
            { position: [0.75, 0.55, -1.5], size: 1.0, colour: [0.3, 0.5, 0.9], spinAxis: [0, 1, 1] },
            { position: [-0.85, -0.1, -2.1], size: 1.1, colour: [0.85, 0.3, 0.25], spinAxis: [1, 1, 0] },
        ],
    },
};

/**
 * The model matrix of an object. One cube rotates by theta about x, then y, then z, as in
 * pickCube2-6; the cubes of the larger scene spin by `time` degrees about their own axes.
 */
export function modelMatrix(object, theta, time) {
    let m = translate(object.position[0], object.position[1], object.position[2]);
    if (object.spinAxis) {
        m = mult(m, rotate(time, vec3(...object.spinAxis)));
    } else {
        m = mult(m, rotateX(theta[0]));
        m = mult(m, rotate(theta[1], vec3(0, 1, 0)));
        m = mult(m, rotateZ(theta[2]));
    }
    return mult(m, scale(object.size, object.size, object.size));
}

export function cameraMatrices(camera, aspect) {
    const az = camera.azimuth * Math.PI / 180, el = camera.elevation * Math.PI / 180;
    const eye = vec3(camera.distance * Math.cos(el) * Math.sin(az), camera.distance * Math.sin(el), camera.distance * Math.cos(el) * Math.cos(az));
    return { view: lookAt(eye, vec3(0, 0, 0), vec3(0, 1, 0)), projection: perspective(40, aspect, 0.1, 50), eye };
}

// ---------------------------------------------------------------- the pick matrix

/**
 * A matrix applied after the projection that blows up the pixel (px, py) of a
 * width x height viewport to fill the whole of clip space, so a 1 x 1 framebuffer
 * sees exactly that pixel (what gluPickMatrix did).
 */
export function pickMatrix(px, py, width, height) {
    const cx = 2 * (px + 0.5) / width - 1;
    const cy = 2 * (py + 0.5) / height - 1;
    return mat4(
        width, 0, 0, -width * cx,
        0, height, 0, -height * cy,
        0, 0, 1, 0,
        0, 0, 0, 1);
}

// ---------------------------------------------------------------- mouse -> pixel

/**
 * The pixel (x right, y up, as glReadPixels counts) under a mouse event.
 *   "canvas": relative to the canvas's box, scaled to its drawing-buffer size
 *   "sample": as pickCube*.js do it: x = clientX, y = canvas.height - clientY
 */
export function eventToPixel(event, rect, width, height, mode) {
    if (mode === "sample") return { x: Math.floor(event.clientX), y: Math.floor(height - event.clientY) };
    return {
        x: Math.floor((event.clientX - rect.left) * width / rect.width),
        y: Math.floor((rect.bottom - event.clientY) * height / rect.height),
    };
}

export const insideCanvas = (p, width, height) => p.x >= 0 && p.y >= 0 && p.x < width && p.y < height;

// ---------------------------------------------------------------- CPU ray cast

const apply = (m, v) => [0, 1, 2, 3].map((r) => m[r][0] * v[0] + m[r][1] * v[1] + m[r][2] * v[2] + m[r][3] * v[3]);
const toPoint = (h) => [h[0] / h[3], h[1] / h[3], h[2] / h[3]];

/**
 * Casts the ray through the centre of pixel (px, py) and returns the nearest cube face
 * it hits: { object, face, t, point } or null. Works in each object's own space, where
 * the cube is the box [-0.5, 0.5]^3.
 */
export function rayCast(px, py, width, height, view, projection, models) {
    const ndc = [2 * (px + 0.5) / width - 1, 2 * (py + 0.5) / height - 1];
    const inverseVP = inverse(mult(projection, view));
    const near = toPoint(apply(inverseVP, [ndc[0], ndc[1], -1, 1]));
    const far = toPoint(apply(inverseVP, [ndc[0], ndc[1], 1, 1]));

    let best = null;
    models.forEach((model, object) => {
        const inv = inverse(model);
        const o = toPoint(apply(inv, [...near, 1]));
        const e = toPoint(apply(inv, [...far, 1]));
        const d = [e[0] - o[0], e[1] - o[1], e[2] - o[2]];          // t in [0, 1] runs from the near to the far plane

        let t0 = -Infinity, t1 = Infinity, enterAxis = -1, enterSign = 0;
        for (let a = 0; a < 3; a++) {
            if (Math.abs(d[a]) < 1e-12) {
                if (o[a] < -0.5 || o[a] > 0.5) return;
                continue;
            }
            let ta = (-0.5 - o[a]) / d[a], tb = (0.5 - o[a]) / d[a];
            let sign = -1;                                         // entering through the -a side
            if (ta > tb) { [ta, tb] = [tb, ta]; sign = 1; }
            if (ta > t0) { t0 = ta; enterAxis = a; enterSign = sign; }
            if (tb < t1) t1 = tb;
        }
        if (t0 > t1 || t1 < 0 || t0 < 0 || t0 > 1) return;
        if (best && t0 >= best.t) return;
        const normal = [0, 0, 0];
        normal[enterAxis] = enterSign;
        const face = FACE_NORMALS.findIndex((n) => n[0] === normal[0] && n[1] === normal[1] && n[2] === normal[2]);
        best = { object, face, t: t0, point: [o[0] + t0 * d[0], o[1] + t0 * d[1], o[2] + t0 * d[2]] };
    });
    return best;
}

/** Where a world point lands, in pixels (y up). */
export function project(point, view, projection, width, height) {
    const c = apply(mult(projection, view), [...point, 1]);
    return [(c[0] / c[3] + 1) / 2 * width, (c[1] / c[3] + 1) / 2 * height, c[2] / c[3]];
}

export { vec4 };
