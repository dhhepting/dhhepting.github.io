// The explorer's pure logic: matrices, orbiting objects, and which settings each
// half of a split view uses. No DOM, no GL.
import { lookAt, vec3, rotate, mult } from '../../Common/MV.mjs';
import { FACE_RENDER_VIEWS } from './environments.mjs';

export const SHADE_INDEX = { mirror: 0, litEnv: 1, plastic: 2, glossy: 3, glass: 4 };
export const FILTERS = ["NEAREST", "LINEAR", "LINEAR_MIPMAP_LINEAR"];

/** The inverse of the rotation part of a view matrix (eye -> world), as 9 floats in column-major order. */
export function viewRotationInverse(view) {
    // the rotation R occupies the upper-left 3x3 and R^-1 = R^T, whose columns are R's rows
    const out = new Float32Array(9);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) out[3 * row + col] = view[row][col];
    return out;
}

/** Rotates the environment about +y by `degrees`: the lookup direction is the world direction rotated by -degrees. */
export function envRotationMatrix(degrees) {
    const a = -degrees * Math.PI / 180;
    const c = Math.cos(a), s = Math.sin(a);
    // rotation about y, column-major: columns are the images of x, y, z
    return new Float32Array([c, 0, -s, 0, 1, 0, s, 0, c]);
}

/** The eye-space position and light for a world-space directional light. */
export function lightInEyeSpace(state, view) {
    if (state.lightFixedToCamera) return [1, 1, 1, 0];             // reflectingSphere: (1, 1, 1, 0) in eye coordinates
    const az = state.lightAzimuth * Math.PI / 180, el = state.lightElevation * Math.PI / 180;
    const world = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
    return [0, 1, 2].map((r) => view[r][0] * world[0] + view[r][1] * world[1] + view[r][2] * world[2]).concat([0]);
}

/** Four small spheres that orbit the reflecting object. */
export const ORBITING_OBJECTS = [
    { radius: 0.30, orbit: 2.1, height: 0.0, speed: 1.0, colour: [0.95, 0.15, 0.12] },
    { radius: 0.26, orbit: 2.5, height: 0.8, speed: -0.7, colour: [0.15, 0.75, 0.25] },
    { radius: 0.30, orbit: 1.9, height: -0.7, speed: 1.4, colour: [0.2, 0.35, 0.95] },
    { radius: 0.24, orbit: 2.3, height: 0.3, speed: -1.1, colour: [0.98, 0.85, 0.15] },
];

export function objectPositions(time) {
    return ORBITING_OBJECTS.map((o, i) => {
        const angle = time * o.speed + i * Math.PI / 2;
        return { ...o, position: [o.orbit * Math.cos(angle), o.height, o.orbit * Math.sin(angle)] };
    });
}

/** View matrices for rendering the six faces of a dynamic environment from `centre`. */
export function faceViewMatrices(centre = [0, 0, 0]) {
    return FACE_RENDER_VIEWS.map(({ direction, up }) =>
        lookAt(vec3(...centre), vec3(centre[0] + direction[0], centre[1] + direction[1], centre[2] + direction[2]), vec3(...up)));
}

// ---------------------------------------------------------------- split-view comparisons
//
// Each comparison names the settings the left and right halves override. Everything
// else is shared, so the two halves differ in exactly one thing.

export const COMPARES = {
    off: { label: "Off" },
    space: {
        label: "Reflection vector in eye space | world space",
        left: { space: "eye" }, right: { space: "world" },
        note: "Left: the reflection vector is looked up in eye coordinates, as the orbiting-camera samples do, so the environment turns with the camera. Right: it is rotated into world coordinates first.",
    },
    where: {
        label: "Reflection vector per vertex | per fragment",
        left: { where: "vertex" }, right: { where: "fragment" },
        note: "Left: the vectors are computed at the vertices and interpolated. Right: they are recomputed for every pixel.",
    },
    eyeVector: {
        label: "Per-vertex eye vector: raw | normalized",
        left: { where: "vertex", eyeNormalized: false }, right: { where: "vertex", eyeNormalized: true },
        note: "Both per vertex. Left: reflect(eyePos, N), as reflectionMap1. Right: reflect(normalize(eyePos), N), as reflectionMap2. On a flat face the left is exact; the right is not.",
    },
    normalMatrix: {
        label: "Normal matrix: as in reflectionMap2.js | correct",
        left: { normalMatrix: "sample" }, right: { normalMatrix: "correct" },
        note: "Left: the transposed (inverse) normal matrix that reflectionMap2.js uploads. Right: the correct one. Rotate the object: the left reflections swirl.",
    },
    shading: {
        label: "Shading: mirror | the selected material",
        left: { material: "mirror" }, right: { material: null },
        note: "Left: a pure mirror (reflectionMap). Right: the selected material.",
    },
    filter: {
        label: "Environment filter: NEAREST | LINEAR",
        left: { envFilter: "NEAREST" }, right: { envFilter: "LINEAR" },
        note: "Left: NEAREST. Right: LINEAR. With the 1 × 1 faces of the samples, LINEAR blends the six colours smoothly across the whole sphere.",
    },
    environment: {
        label: "Environment: static | dynamic",
        left: { envSource: "static" }, right: { envSource: "dynamic" },
        note: "Left: a fixed cube map, which cannot show the orbiting spheres. Right: a cube map re-rendered every frame from the object's position, which does.",
    },
};

/** The settings one pass of drawing uses. */
export function baseConfig(state) {
    return {
        space: state.space, where: state.where, eyeNormalized: state.eyeNormalized, normalMatrix: state.normalMatrixMode,
        material: state.material, envFilter: state.envFilter, envSource: state.envSource,
    };
}

/** The passes to draw: one full-width pass, or two scissored halves of a split view. */
export function passConfigs(state, width) {
    const base = baseConfig(state);
    const compare = COMPARES[state.compare];
    if (!compare || state.compare === "off") return [{ x: 0, width, config: base, side: "all" }];

    const split = Math.round(state.splitX * width);
    const resolve = (overrides) => {
        const merged = { ...base };
        for (const [key, value] of Object.entries(overrides)) merged[key] = value === null ? base[key] : value;
        // comparing mirror with a mirror shows nothing: stand in the material that differs most
        if (state.compare === "shading" && merged.material === "mirror" && overrides.material === null) merged.material = "litEnv";
        return merged;
    };
    return [
        { x: 0, width: split, config: resolve(compare.left), side: "left" },
        { x: split, width: width - split, config: resolve(compare.right), side: "right" },
    ];
}

/** Which sampler (min/mag filtering) a pass uses: glossy reflections read blurred mip levels, which need a mipmapped filter. */
export const filterForPass = (config) => (config.material === "glossy" ? "LINEAR_MIPMAP_LINEAR" : config.envFilter);

export function rotationMatrix(rotations) {
    let m = rotate(rotations[0], vec3(1, 0, 0));
    m = mult(m, rotate(rotations[1], vec3(0, 1, 0)));
    return mult(m, rotate(rotations[2], vec3(0, 0, 1)));
}
