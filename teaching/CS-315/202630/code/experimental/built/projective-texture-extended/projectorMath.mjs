// The projector's pure logic: vector helpers, the light's and the camera's matrices.
// No DOM, no GL.

import { vec3, mult, translate, scale, lookAt, perspective, ortho, radians } from '../../../common/MV.mjs';

export const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm3 = (a) => mul3(a, 1.0 / Math.hypot(a[0], a[1], a[2]));

// maps clip space [-1, 1] to texture space [0, 1]
export const biasMatrix = () => mult(translate(0.5, 0.5, 0.5), scale(0.5, 0.5, 0.5));

export const SCENE_CENTRE = [0.0, -0.3, 0.0];      // what the projector and camera look at

/** View and projection matrices for the light, and the matrix taking a world-space point to (s, t, depth, q). */
export function projectorMatrices(params) {
    const az = radians(params.azimuth);
    const el = radians(params.elevation);
    const d = params.distance;
    const pos = [SCENE_CENTRE[0] + d * Math.cos(el) * Math.cos(az),
                 SCENE_CENTRE[1] + d * Math.sin(el),
                 SCENE_CENTRE[2] + d * Math.cos(el) * Math.sin(az)];

    const fwd = norm3(sub3(SCENE_CENTRE, pos));
    const right0 = norm3(cross3(fwd, [0, 1, 0]));
    const up0 = cross3(right0, fwd);
    const r = radians(params.roll);                       // roll = turn the slide in the projector
    const up = add3(mul3(up0, Math.cos(r)), mul3(right0, Math.sin(r)));
    const right = norm3(cross3(fwd, up));

    const near = 0.5;
    const far = d + 8.0;
    const perspectiveLight = params.projection === "perspective";
    const half = Math.tan(radians(params.fov / 2));
    const proj = perspectiveLight
        ? perspective(params.fov, 1.0, near, far)
        : ortho(-d * half, d * half, -d * half, d * half, near, far);

    const view = lookAt(vec3(...pos), vec3(...SCENE_CENTRE), vec3(...up));
    const textureMatrix = mult(biasMatrix(), mult(proj, view));      // still to be multiplied by the model matrix

    return { pos, fwd, right, up, half, near, far, perspectiveLight, view, proj, textureMatrix };
}

/** The orbit camera: eye position, view and projection matrices. */
export function cameraMatrices(camera, aspect) {
    const yaw = radians(camera.yaw);
    const pitch = radians(camera.pitch);
    const eye = [SCENE_CENTRE[0] + camera.dist * Math.cos(pitch) * Math.sin(yaw),
                 SCENE_CENTRE[1] + camera.dist * Math.sin(pitch),
                 SCENE_CENTRE[2] + camera.dist * Math.cos(pitch) * Math.cos(yaw)];
    const view = lookAt(vec3(...eye), vec3(...SCENE_CENTRE), vec3(0, 1, 0));
    const proj = perspective(40, aspect, 0.1, 60);
    return { eye, view, proj };
}
