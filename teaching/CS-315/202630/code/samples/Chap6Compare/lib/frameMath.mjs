// Per-frame maths for the two scenes (sphere, cube). No DOM, no GL.
//
// Both scenes return a dictionary of every uniform any demo shader might
// declare; a pane ignores the ones its program does not use. The light is
// provided in two forms, because the demos differ in which space they light in:
//   uLightPositionEye     - light in eye coordinates
//   uLightPositionObject  - light in object coordinates (and uEyePosition, the
//                           eye in object coordinates)
// CompareApp copies the right one into uLightPosition for each pane.
import {
    vec3, mat4, lookAt, ortho, perspective, rotate, translate, scale,
    mult, inverse, normalMatrix, flatten,
} from './common.mjs';

export const DEG = Math.PI / 180;

export const mulMat4Vec4 = (m, v) =>
    [0, 1, 2, 3].map((i) => m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2] + m[i][3] * v[3]);

const normalize3 = (v) => {
    const len = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / len, v[1] / len, v[2] / len];
};

/** Light and material products used by the textbook samples. */
export const products = (specular = [1, 1, 1, 1]) => ({
    uAmbientProduct: [0.2, 0.0, 0.2, 1.0],   // light (0.2,0.2,0.2) x material (1,0,1)
    uDiffuseProduct: [1.0, 0.8, 0.0, 1.0],   // light (1,1,1)       x material (1,0.8,0)
    uSpecularProduct: specular,
});

/**
 * view, model, proj: MV.mjs mat4s. lightIn: [x, y, z, w]. lightFrame: 'camera'
 * (lightIn is already in eye coordinates) or 'world' (lightIn is in world
 * coordinates and is carried into eye coordinates by the view matrix).
 */
export function lightingFrame({ view, model, proj, lightIn, lightFrame, specular, shininess }) {
    const mv = mult(view, model);
    const lightEye = lightFrame === 'camera' ? lightIn : mulMat4Vec4(view, lightIn);

    const mvInv = inverse(mv);
    const lightObj = mulMat4Vec4(mvInv, lightEye);
    const eyeObj = mulMat4Vec4(mvInv, [0, 0, 0, 1]);

    return {
        view, model, mv, proj, lightEye, lightObj, eyeObj,
        uniforms: {
            uModelViewMatrix: flatten(mv),
            uProjectionMatrix: flatten(proj),
            uNormalMatrix: flatten(normalMatrix(mv, true)),
            uLightPositionEye: lightEye,
            uLightPositionObject: lightObj,
            uEyePosition: eyeObj.slice(0, 3),
            uShininess: shininess,
            uUnlit: 0,
            ...products(specular),
        },
    };
}

// ------------------------------------------------------------------ sphere

/** Eye position from the samples' R, theta, phi (degrees here, radians there). */
export function sphereEye(s) {
    const t = s.theta * DEG;
    const p = s.phi * DEG;
    return [
        s.radius * Math.sin(t) * Math.cos(p),
        s.radius * Math.sin(t) * Math.sin(p),
        s.radius * Math.cos(t),
    ];
}

export function sphereFrame(s) {
    const eye = sphereEye(s);
    // The samples use up = +y, which degenerates when the eye is on the y axis.
    const up = Math.abs(eye[1]) > 0.9999 * s.radius ? vec3(0, 0, 1) : vec3(0, 1, 0);
    const view = lookAt(vec3(eye[0], eye[1], eye[2]), vec3(0, 0, 0), up);
    const model = rotate(s.spinAngle, vec3(0, 1, 0));
    const proj = s.projection === 'persp'
        ? perspective(40, 1, 0.1, 100)
        : ortho(-1.5, 1.5, -1.5, 1.5, 0.1, 100);

    const w = s.lightType === 'point' ? 1 : 0;
    return {
        eye,
        ...lightingFrame({
            view, model, proj,
            lightIn: [s.lightX, s.lightY, s.lightZ, w],
            lightFrame: s.lightFrame,
            specular: [1, 1, 1, 1],
            shininess: s.shininess,
        }),
    };
}

/**
 * Orbit by dragging. The samples' (theta, phi) are not a friendly drag
 * parameterisation (phi does nothing at theta = 0), so convert to azimuth /
 * elevation, move, and convert back. Mutates and returns s.
 */
export function dragSphere(s, dxDeg, dyDeg) {
    const [x, y, z] = sphereEye(s);
    let az = Math.atan2(x, z) / DEG - dxDeg;
    let el = Math.asin(Math.max(-1, Math.min(1, y / s.radius))) / DEG + dyDeg;
    el = Math.max(-89, Math.min(89, el));
    az *= DEG; el *= DEG;
    const nx = s.radius * Math.cos(el) * Math.sin(az);
    const ny = s.radius * Math.sin(el);
    const nz = s.radius * Math.cos(el) * Math.cos(az);
    s.theta = Math.acos(Math.max(-1, Math.min(1, nz / s.radius))) / DEG;
    if (Math.hypot(nx, ny) > 1e-9) s.phi = Math.atan2(ny, nx) / DEG;
    return s;
}

// -------------------------------------------------------------------- cube

// Taken from shadedCubeHalfway.mjs.
export const CUBE = {
    eye: [0, 0, 4], fovy: 45, near: 0.1, far: 20,
    markerSize: 0.08, markerColor: [1.0, 1.0, 0.2, 1.0],
    specular: [1.0, 0.8, 0.0, 1.0],
};

export function cubeLightWorld(s) {
    const az = s.lightAzimuth * DEG;
    const el = s.lightElevation * DEG;
    return [
        s.lightDistance * Math.cos(el) * Math.cos(az),
        s.lightDistance * Math.sin(el),
        s.lightDistance * Math.cos(el) * Math.sin(az),
    ];
}

export function cubeFrame(s) {
    const view = lookAt(vec3(...CUBE.eye), vec3(0, 0, 0), vec3(0, 1, 0));
    const proj = perspective(CUBE.fovy, 1, CUBE.near, CUBE.far);

    // As in the sample: the cube rotates; the camera and the light do not.
    let model = mat4();
    model = mult(model, rotate(s.thetaX, vec3(1, 0, 0)));
    model = mult(model, rotate(s.thetaY, vec3(0, 1, 0)));
    model = mult(model, rotate(s.thetaZ, vec3(0, 0, 1)));

    const lw = cubeLightWorld(s);
    const frame = lightingFrame({
        view, model, proj,
        lightIn: [lw[0], lw[1], lw[2], 1.0],
        lightFrame: 'world',
        specular: CUBE.specular,
        shininess: s.shininess,
    });

    let markerModel = translate(lw[0], lw[1], lw[2]);
    markerModel = mult(markerModel, scale(CUBE.markerSize, CUBE.markerSize, CUBE.markerSize));
    frame.marker = {
        uniforms: {
            uModelViewMatrix: flatten(mult(view, markerModel)),
            uProjectionMatrix: flatten(proj),
            uUnlit: 1,
            uUnlitColor: CUBE.markerColor,
        },
    };
    frame.lightWorld = lw;
    return frame;
}
