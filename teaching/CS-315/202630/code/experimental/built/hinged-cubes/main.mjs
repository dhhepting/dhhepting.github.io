// Controller: owns the DOM, the animation loop and input; the renderer never touches the DOM.
import { Hinge } from './hinge.mjs';

const byId = (id) => document.getElementById(id);

const canvas = byId('gl-canvas');
const gl = canvas.getContext('webgl2');
if (!gl) {
  document.body.insertAdjacentHTML('afterbegin', '<p>WebGL2 is not available in this browser.</p>');
  throw new Error('WebGL2 not supported');
}

const hinge = new Hinge(gl);

const angleInput = byId('angle');
const angleOut = byId('angle-out');
const speedInput = byId('speed');
const speedOut = byId('speed-out');
const animateBox = byId('animate');
const resetButton = byId('reset');

const DEFAULT_ANGLE = 90;
const minAngle = Number(angleInput.min);
const maxAngle = Number(angleInput.max);

let angle = DEFAULT_ANGLE;
let direction = 1;          // ping-pong direction while animating

function setAngle(value) {
  angle = Math.min(maxAngle, Math.max(minAngle, value));
  hinge.setAngle(angle);
  angleInput.value = angle;
  angleOut.textContent = `${angle.toFixed(1)}\u00b0`;
}

function updateSpeedLabel() {
  speedOut.textContent = `${speedInput.value}\u00b0/s`;
}

// Controls
angleInput.addEventListener('input', () => {
  animateBox.checked = false;            // manual control takes over
  setAngle(Number(angleInput.value));
});
speedInput.addEventListener('input', updateSpeedLabel);
resetButton.addEventListener('click', () => {
  animateBox.checked = false;
  setAngle(DEFAULT_ANGLE);
});

// Orbit by dragging
let dragging = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener('pointerdown', (e) => {
  dragging = true; lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  hinge.orbit(-(e.clientX - lastX) * 0.5, (e.clientY - lastY) * 0.5);
  lastX = e.clientX; lastY = e.clientY;
});
const endDrag = () => { dragging = false; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// Keep the drawing buffer matched to the displayed size
function resizeCanvasToDisplaySize() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

// Animation loop: ping-pong between the slider limits at the chosen speed
let previous = performance.now();
function frame(now) {
  const dt = Math.min((now - previous) / 1000, 0.1);   // clamp after tab switches
  previous = now;

  if (animateBox.checked) {
    let next = angle + direction * Number(speedInput.value) * dt;
    if (next >= maxAngle) { next = maxAngle; direction = -1; }
    else if (next <= minAngle) { next = minAngle; direction = 1; }
    setAngle(next);
  }

  resizeCanvasToDisplaySize();
  hinge.render();
  requestAnimationFrame(frame);
}

setAngle(DEFAULT_ANGLE);
updateSpeedLabel();
requestAnimationFrame(frame);
