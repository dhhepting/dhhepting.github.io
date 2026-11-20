// A scene bundles everything that differs between the sphere demos and the
// cube demo: default state, controls, animation, mesh and per-frame uniforms.
// Pure data and functions (no DOM, no GL), so it can be tested without a browser.
import { buildSphere, buildCube, MAX_SUBDIVISIONS } from './meshes.mjs';
import { sphereFrame, cubeFrame, dragSphere } from './frameMath.mjs';

const CANVAS_SIZES = [256, 512, 768, 1024];
const mod360 = (a) => ((a % 360) + 360) % 360;          // true modulo: never negative
const wrap180 = (a) => mod360(a + 180) - 180;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

const resolutionControl = {
    id: 'canvasSize', type: 'select', label: 'Canvas resolution',
    options: CANVAS_SIZES.map((n) => [n, `${n} × ${n}`]),
    hint: 'More pixels means more fragments to shade.',
};

/**
 * Sphere scene: the camera, projection and light of shadedSphere1-4,
 * EyeSpace and ObjectSpace (eye at (R sinθ cosφ, R sinθ sinφ, R cosθ) looking
 * at the origin, light (1,1,1,0) fixed to the camera, shininess 20).
 * normalMode: 'vertex' (normal = position) or 'true' (face normal).
 */
export function sphereScene({ normalMode, defaults = {} }) {
    return {
        kind: 'sphere',
        normalMode,
        defaults: {
            radius: 1.5, theta: 0, phi: 0, projection: 'ortho', orbit: false, spin: false, spinAngle: 0,
            subdiv: 3,
            lightType: 'directional', lightFrame: 'camera', lightX: 1, lightY: 1, lightZ: 1,
            shininess: 20,
            ...defaults,
        },
        meshKey: (s) => `sphere:${s.subdiv}`,
        buildMesh: (s) => buildSphere(s.subdiv, normalMode),
        marker: null,
        isAnimating: (s) => s.orbit || s.spin,
        advance(s, dt) {
            if (s.orbit) s.theta = wrap180(s.theta + dt * 20);
            if (s.spin) s.spinAngle = mod360(s.spinAngle + dt * 40);
        },
        frame: sphereFrame,
        drag: (s, dx, dy) => dragSphere(s, dx, dy),
        wheel(s, deltaY) { s.radius = clamp(s.radius * (1 + deltaY * 0.001), 1.1, 12); },
        controls: [
            {
                group: 'Viewing (drives both canvases; you can also drag on either canvas and scroll to zoom)',
                items: [
                    { id: 'radius', type: 'range', label: 'R (distance)', min: 1.1, max: 12, step: 0.1 },
                    { id: 'theta', type: 'range', label: 'θ (theta)', min: -180, max: 180, step: 1 },
                    { id: 'phi', type: 'range', label: 'φ (phi)', min: -180, max: 180, step: 1 },
                    {
                        id: 'projection', type: 'select', label: 'Projection',
                        options: [['ortho', 'Orthographic (as in the samples)'], ['persp', 'Perspective']],
                    },
                    { id: 'orbit', type: 'checkbox', label: 'Auto-orbit camera (sweeps θ)' },
                    { id: 'spin', type: 'checkbox', label: 'Spin the object' },
                ],
            },
            {
                group: 'Geometry',
                items: [
                    {
                        id: 'subdiv', type: 'range', label: 'Subdivisions', min: 0, max: MAX_SUBDIVISIONS, step: 1,
                        hint: 'Each level quadruples the triangles. Level 8 is 262,144 triangles and takes a moment to build.',
                    },
                    resolutionControl,
                ],
            },
            {
                group: 'Light and material',
                items: [
                    {
                        id: 'lightType', type: 'select', label: 'Light',
                        options: [['directional', 'Directional (w = 0)'], ['point', 'Point (w = 1)']],
                    },
                    {
                        id: 'lightFrame', type: 'select', label: 'Light is fixed to',
                        options: [['camera', 'The camera (eye coordinates)'], ['world', 'The object (moves relative to the camera)']],
                    },
                    { id: 'lightX', type: 'range', label: 'Light x', min: -5, max: 5, step: 0.1 },
                    { id: 'lightY', type: 'range', label: 'Light y', min: -5, max: 5, step: 0.1 },
                    { id: 'lightZ', type: 'range', label: 'Light z', min: -5, max: 5, step: 0.1 },
                    { id: 'shininess', type: 'range', label: 'Shininess', min: 1, max: 300, step: 1 },
                ],
            },
        ],
    };
}

/**
 * Cube scene: shadedCubeHalfway. Fixed perspective camera on +z, a cube that
 * rotates about X/Y/Z, a point light orbiting the cube (azimuth, elevation,
 * distance) with a small unlit marker cube at the light.
 */
export function cubeScene({ defaults = {} } = {}) {
    return {
        kind: 'cube',
        defaults: {
            thetaX: 0, thetaY: 0, thetaZ: 0, axis: 0, rotating: false,
            lightAzimuth: 40, lightElevation: 30, lightDistance: 2.5, orbiting: true,
            shininess: 50, compensate: true,
            ...defaults,
        },
        meshKey: () => 'cube',
        buildMesh: () => buildCube(0.5),
        marker: true,   // drawn with the lit program, as in shadedCubeHalfway (uUnlit)
        isAnimating: (s) => s.rotating || s.orbiting,
        advance(s, dt) {
            if (s.rotating) {
                const key = ['thetaX', 'thetaY', 'thetaZ'][s.axis];
                s[key] = mod360(s[key] + dt * 120);           // the sample adds 2 degrees per frame
            }
            if (s.orbiting) s.lightAzimuth = mod360(s.lightAzimuth + dt * 60);   // 1 degree per frame
        },
        frame: cubeFrame,
        drag(s, dx, dy) {                                      // drag moves the light
            s.lightAzimuth = mod360(s.lightAzimuth + dx);
            s.lightElevation = clamp(s.lightElevation + dy, -89, 89);
        },
        wheel(s, deltaY) { s.lightDistance = clamp(s.lightDistance * (1 + deltaY * 0.001), 1.2, 6); },
        controls: [
            {
                group: 'Cube (drives both canvases)',
                items: [
                    { id: 'btnX', type: 'button', label: 'Rotate X', action: (s) => { s.axis = 0; } },
                    { id: 'btnY', type: 'button', label: 'Rotate Y', action: (s) => { s.axis = 1; } },
                    { id: 'btnZ', type: 'button', label: 'Rotate Z', action: (s) => { s.axis = 2; } },
                    { id: 'btnT', type: 'button', label: 'Toggle rotation', action: (s) => { s.rotating = !s.rotating; } },
                ],
            },
            {
                group: 'Light (drag on a canvas to move it; scroll to change distance)',
                items: [
                    { id: 'lightAzimuth', type: 'range', label: 'Azimuth', min: 0, max: 360, step: 1 },
                    { id: 'lightElevation', type: 'range', label: 'Elevation', min: -89, max: 89, step: 1 },
                    { id: 'lightDistance', type: 'range', label: 'Distance', min: 1.2, max: 6, step: 0.1 },
                    { id: 'orbiting', type: 'checkbox', label: 'Orbit the light' },
                ],
            },
            {
                group: 'Material',
                items: [
                    { id: 'shininess', type: 'range', label: 'Shininess', min: 1, max: 300, step: 1 },
                    resolutionControl,
                ],
            },
        ],
    };
}
