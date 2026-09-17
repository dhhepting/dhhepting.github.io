// main.js
// Controller: owns the canvas and GL context, loads the shader files, drives
// the render loop, and tracks the current viewing mode. All DOM access lives
// here; the renderer stays DOM-free.

import { initShaders } from '../../Common/initShadersXHR.mjs';
import { Cube } from './cube.mjs';
import * as mat4 from './matrix.mjs';

// --- Mode 4 exercises (see matrix.js). Each flag stays OFF until you have
// implemented the matching function; flip one on to try your work. Turning a
// flag on before implementing its function will throw a clear error naming the
// exercise (press M to cycle back to a working mode). ---
const ORTHOGRAPHIC_HEXAGON = false; // EXERCISE 1: needs mat4.ortho
const SPIN_HUE_WHEEL = false; // EXERCISE 2: needs mat4.rotationAxis

const canvas = document.querySelector('#gl-canvas');
const caption = document.querySelector('#caption');
const gl = canvas.getContext('webgl2');
if (!gl) {
  throw new Error('WebGL2 is not available in this browser.');
}

// Load and compile both .glsl files, and link them as a shader program.
const program = await initShaders(gl,'./shaders/cube.vert.glsl','./shaders/cube.frag.glsl');

const cube = new Cube(gl, program);

gl.enable(gl.DEPTH_TEST);
gl.clearColor(0.15, 0.15, 0.18, 1.0);

const CUBE_CENTER = [0.5, 0.5, 0.5];
const DIAGONAL = [1, 1, 1]; // black (0,0,0) -> white (1,1,1) direction

// Viewing modes cycled with M / Space. Each names the geometry `style` the
// renderer draws and the `camera` the controller builds:
//   orbit         - the spinning view (modes 1 & 2)
//   diagonalUp    - the black->white diagonal is the UP vector (static)
//   diagonalView  - eye at (2,2,2); the diagonal is the LOOK-AT vector
const MODES = [
  { label: 'solid colour cube', style: 'solid', camera: 'orbit' },
  { label: 'edges + greyscale diagonal', style: 'edges', camera: 'orbit' },
  { label: 'diagonal as UP vector', style: 'edges', camera: 'diagonalUp' },
  { label: 'diagonal as LOOK-AT vector (eye 2,2,2)', style: 'solid', camera: 'diagonalView' },
];
let modeIndex = 0;

function updateCaption() {
  if (!caption) return;
  caption.textContent =
    `mode ${modeIndex + 1}/${MODES.length}: ${MODES[modeIndex].label}` +
    '   ·   press M or Space to cycle';
}
updateCaption();

// Cycle mode on M or Space. Key handling belongs to the controller.
window.addEventListener('keydown', (event) => {
  if (event.key === 'm' || event.key === 'M' || event.key === ' ') {
    event.preventDefault();
    modeIndex = (modeIndex + 1) % MODES.length;
    updateCaption();
  }
});

// Keep the drawing buffer matched to the displayed size (and DPR-aware).
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.floor(canvas.clientWidth * dpr);
  const height = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
}

// Model matrix that spins the cube about its diagonal, through the cube centre:
// M = T(centre) * R_axis(diagonal) * T(-centre). Identity when SPIN is off.
function diagonalSpin(now) {
  if (!SPIN_HUE_WHEEL) return mat4.identity();
  const angle = now * 0.0006;
  const toOrigin = mat4.translation(-CUBE_CENTER[0], -CUBE_CENTER[1], -CUBE_CENTER[2]);
  const spin = mat4.rotationAxis(DIAGONAL, angle); // EXERCISE 2
  const back = mat4.translation(CUBE_CENTER[0], CUBE_CENTER[1], CUBE_CENTER[2]);
  return mat4.multiply(back, mat4.multiply(spin, toOrigin));
}

// Projection for the corner-on hexagon view: perspective by default,
// orthographic (regular hexagon) once EXERCISE 1 is done.
function hexagonProjection(aspect) {
  if (!ORTHOGRAPHIC_HEXAGON) {
    return mat4.perspective(Math.PI / 4, aspect, 0.1, 100);
  }
  const halfH = 1.1; // frames the hexagon (circumradius ~0.82) with margin
  const halfW = halfH * aspect;
  return mat4.ortho(-halfW, halfW, -halfH, halfH, 0.1, 100); // EXERCISE 1
}

// Build the full model-view-projection matrix for the active camera.
function buildMVP(now, aspect) {
  const camera = MODES[modeIndex].camera;

  if (camera === 'orbit') {
    // Spin the cube about its own centre, pushed in front of the camera.
    const projection = mat4.perspective(Math.PI / 4, aspect, 0.1, 100);
    const angle = now * 0.0006;
    const center = mat4.translation(-0.5, -0.5, -0.5);
    const rotX = mat4.rotationX(angle * 0.6);
    const rotY = mat4.rotationY(angle);
    const view = mat4.translation(0, 0, -4);

    let mvp = mat4.multiply(rotX, center);
    mvp = mat4.multiply(rotY, mvp);
    mvp = mat4.multiply(view, mvp);
    return mat4.multiply(projection, mvp);
  }

  if (camera === 'diagonalUp') {
    // The diagonal (1,1,1) is the UP vector, so the black->white axis appears
    // vertical. Placing the eye PERPENDICULAR to the diagonal keeps that axis
    // centred and level: (2,-1,-1) . (1,1,1) = 0.
    const projection = mat4.perspective(Math.PI / 4, aspect, 0.1, 100);
    const dist = 4;
    const inv = 1 / Math.sqrt(6); // |(2,-1,-1)|
    const dir = [2 * inv, -1 * inv, -1 * inv];
    const eye = [
      CUBE_CENTER[0] + dist * dir[0],
      CUBE_CENTER[1] + dist * dir[1],
      CUBE_CENTER[2] + dist * dir[2],
    ];
    const view = mat4.lookAt(eye, CUBE_CENTER, DIAGONAL);
    return mat4.multiply(projection, view);
  }

  // camera === 'diagonalView'
  // Eye at (2,2,2) looking at the cube centre: the view direction IS the
  // black->white diagonal, so the cube is seen corner-on (the hue hexagon).
  // up = (0,1,0) is just a hint; it must not be parallel to (1,1,1).
  const projection = hexagonProjection(aspect);
  const view = mat4.lookAt([2, 2, 2], CUBE_CENTER, [0, 1, 0]);
  const model = diagonalSpin(now);
  return mat4.multiply(projection, mat4.multiply(view, model));
}

function render(now) {
  resize();
  const aspect = canvas.width / canvas.height;
  const mvp = buildMVP(now, aspect);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  cube.draw(mvp, MODES[modeIndex].style);

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
