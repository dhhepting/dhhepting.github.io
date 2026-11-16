// The light-view explorer's pure logic: the scene of shadowMap.js (a cube, a triangle)
// plus a floor, the light's and the projector's matrices, the slide of
// projectiveTexture.js, depth packing, and a CPU shadow test to check the GPU against.
// No DOM, no GL.

import { vec3, mat4, mult, translate, scale, rotateX, rotateZ, rotate, lookAt, perspective, ortho, normalize } from '../../Common/MV.mjs';

// ---------------------------------------------------------------- geometry

// shadowMap.js gives its cube vertices w = 1.2, so after the divide by w the cube is
// 0.5/1.2 = 0.4167 wide each way. Here the same cube is built with w = 1 and scaled.
export const SAMPLE_CUBE_HALF = 0.5 / 1.2;

const CUBE = [[-1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, 1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]];
const CUBE_QUADS = [[1, 0, 3, 2], [2, 3, 7, 6], [3, 0, 4, 7], [6, 5, 1, 2], [4, 5, 6, 7], [5, 4, 0, 1]];
const CUBE_COLOURS = [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1]];      // shadowMap.js's six colours

export const TRIANGLE = [[0.0, 1.0, 1.0], [0.25, 0.5, 1.0], [-0.25, 0.5, 1.0]];                  // shadowMap.js
export const FLOOR_Y = -0.75;
const FLOOR_HALF = 2.5;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };

/** One mesh per object: positions, normals, colours (vec3 each), and the vertex count. */
export function buildScene() {
    const pack = (triangles) => ({
        positions: new Float32Array(triangles.flatMap((t) => t.p.flat())),
        normals: new Float32Array(triangles.flatMap((t) => [t.n, t.n, t.n].flat())),
        colours: new Float32Array(triangles.flatMap((t) => [t.c, t.c, t.c].flat())),
        vertexCount: triangles.length * 3,
    });
    const cube = [];
    CUBE_QUADS.forEach((q, f) => {
        const [a, b, c, d] = q.map((k) => CUBE[k]);
        const n = unit(cross(sub(b, a), sub(c, b)));
        cube.push({ p: [a, b, c], n, c: CUBE_COLOURS[f] }, { p: [a, c, d], n, c: CUBE_COLOURS[f] });
    });
    const tn = unit(cross(sub(TRIANGLE[1], TRIANGLE[0]), sub(TRIANGLE[2], TRIANGLE[0])));
    const triangle = [{ p: TRIANGLE, n: tn, c: [0.5, 0.5, 0.0] }];                                 // shadowMap.js's olive
    const h = FLOOR_HALF, y = FLOOR_Y;
    const floor = [{ p: [[-h, y, h], [h, y, h], [h, y, -h]], n: [0, 1, 0], c: [0.82, 0.82, 0.8] }, { p: [[-h, y, h], [h, y, -h], [-h, y, -h]], n: [0, 1, 0], c: [0.82, 0.82, 0.8] }];
    return { cube: pack(cube), triangle: pack(triangle), floor: pack(floor) };
}

/** The cube's model matrix: rotations about x, y, z (shadowMap.js), and the sample's size. */
export function cubeModel(theta) {
    let m = mult(rotateX(theta[0]), rotate(theta[1], vec3(0, 1, 0)));
    m = mult(m, rotateZ(theta[2]));
    return mult(m, scale(SAMPLE_CUBE_HALF, SAMPLE_CUBE_HALF, SAMPLE_CUBE_HALF));
}

// ---------------------------------------------------------------- the light and the camera

export const SAMPLE_LIGHT = [1.0, 3.0, 5.0];

export function lightPosition(light) {
    if (light.sample) return [...SAMPLE_LIGHT];
    const az = light.azimuth * Math.PI / 180, el = light.elevation * Math.PI / 180;
    return [light.distance * Math.cos(el) * Math.sin(az), light.distance * Math.sin(el), light.distance * Math.cos(el) * Math.cos(az)];
}

/** The light's view and projection: a spot light looking at the origin, as shadowMap.js (fovy 45, near 3, far 10). */
export function lightMatrices(position, { fovy = 45, near = 3, far = 10 } = {}) {
    return { view: lookAt(vec3(...position), vec3(0, 0, 0), vec3(0, 1, 0)), projection: perspective(fovy, 1, near, far) };
}

/**
 * The projector of projectiveTexture.js. With sampleEye, the eye is normalize(lightPosition),
 * a point at distance 1 from the origin, as the sample computes it.
 */
export function projectorMatrices(position, sampleEye) {
    const eye = sampleEye ? normalize(vec3(...position)) : vec3(...position);
    return { view: lookAt(eye, vec3(0, 0, 0), vec3(0, 1, 0)), projection: perspective(55, 1, 0.1, 10) };
}

export function cameraMatrices(camera, aspect) {
    if (camera.sample) {
        // shadowMap.js: lookAt((0, 1, 1), origin, y up) and ortho(-1, 1, -1, 1, -5, 5)
        return { view: lookAt(vec3(0, 1, 1), vec3(0, 0, 0), vec3(0, 1, 0)), projection: ortho(-1, 1, -1, 1, -5, 5), position: [0, 1, 1] };
    }
    const az = camera.azimuth * Math.PI / 180, el = camera.elevation * Math.PI / 180;
    const position = [camera.distance * Math.cos(el) * Math.sin(az), camera.distance * Math.sin(el), camera.distance * Math.cos(el) * Math.cos(az)];
    return { view: lookAt(vec3(...position), vec3(0, 0, 0), vec3(0, 1, 0)), projection: perspective(40, aspect, 0.1, 50), position };
}

// ---------------------------------------------------------------- the slide of projectiveTexture.js

/** 8 x 8-texel checkerboard, black border, black outside the inscribed circle; RGBA bytes. */
export function makeSlide(n = 256) {
    const bytes = new Uint8Array(4 * n * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let c = (((i & 0x8) === 0) ^ ((j & 0x8) === 0)) ? 255 : 0;
            if (i === 0 || j === 0 || i === n - 1 || j === n - 1) c = 0;
            if (Math.hypot(i - n / 2, j - n / 2) > 0.5 * n) c = 0;
            bytes.set([c, c, c, 255], 4 * (i * n + j));
        }
    }
    return bytes;
}

// ---------------------------------------------------------------- depth packing (as depth.frag / scene.frag)

const fract = (x) => x - Math.floor(x);
/** pack a depth in [0, 1) into four 8-bit channels, as depth.frag does */
export function packDepth(z) {
    const scales = [1, 255, 65025, 16581375];
    const v = scales.map((s) => fract(z * s));
    const out = [v[0] - v[1] / 255, v[1] - v[2] / 255, v[2] - v[3] / 255, v[3]];
    return out.map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255));      // what an RGBA8 target stores
}
export const unpackDepth = (bytes) => bytes[0] / 255 + bytes[1] / 255 / 255 + bytes[2] / 255 / 65025 + bytes[3] / 255 / 16581375;

/** Window depth (0 to 1) of a point at distance d along the view axis of a perspective projection. */
export const windowDepth = (d, near, far) => 0.5 * ((far + near) / (far - near) - 2 * far * near / ((far - near) * d)) + 0.5;

// ---------------------------------------------------------------- CPU shadow test

const apply = (m, v) => [0, 1, 2, 3].map((r) => m[r][0] * v[0] + m[r][1] * v[1] + m[r][2] * v[2] + m[r][3] * v[3]);

function rayTriangle(o, d, a, b, c) {
    const e1 = sub(b, a), e2 = sub(c, a), p = cross(d, e2), det = dot(e1, p);
    if (Math.abs(det) < 1e-12) return null;
    const s = sub(o, a), u = dot(s, p) / det; if (u < 0 || u > 1) return null;
    const q = cross(s, e1), v = dot(d, q) / det; if (v < 0 || u + v > 1) return null;
    const t = dot(e2, q) / det;
    return t > 1e-6 ? t : null;
}

/** Is the world point in shadow (something between it and the light)? Exact, for checking. */
export function inShadowCPU(point, light, theta, scene) {
    const toLight = sub(light, point), d = toLight;                       // t in (0, 1) is between the point and the light
    const blockers = [];
    const model = cubeModel(theta);
    const cubePositions = scene.cube.positions;
    for (let k = 0; k < cubePositions.length; k += 9) {
        blockers.push([0, 1, 2].map((v) => apply(model, [cubePositions[k + 3 * v], cubePositions[k + 3 * v + 1], cubePositions[k + 3 * v + 2], 1]).slice(0, 3)));
    }
    blockers.push(TRIANGLE);
    return blockers.some(([a, b, c]) => { const t = rayTriangle(point, d, a, b, c); return t !== null && t < 1 - 1e-6; });
}

export const worldToScreen = (point, view, projection, width, height) => {
    const c = apply(mult(projection, view), [...point, 1]);
    return [(c[0] / c[3] + 1) / 2 * width, (c[1] / c[3] + 1) / 2 * height];
};

export { mat4, translate };
