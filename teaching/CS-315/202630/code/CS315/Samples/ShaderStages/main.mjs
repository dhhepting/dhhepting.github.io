import './style.css';

import vertexSource from './shaders/triangle.vert?raw';
import colorSource from './shaders/color.frag?raw';
import barycentricSource from './shaders/barycentric.frag?raw';
import fragcoordSource from './shaders/fragcoord.frag?raw';

import { ShaderDemo } from './ShaderDemo.mjs';
import { DISPLAY_SIZE, HANDLE_RADIUS, drawOverlay } from './overlay.mjs';
import { vec2, rotateZ } from '../../Common/MV.mjs';
import {
  transform, clipToDisplay, displayToClip, pixelCenterToClip,
  barycentric, isInside, expectedOutput, toByte, hexToRgb, rgbToHex,
} from './math.mjs';

const pub = import.meta.env
  ? './'     // Vite dev/build: shaders sit beside the page
  : new URL(/* @vite-ignore */ '../../public/Samples/ShaderStages/', import.meta.url).href;  // raw copy

// ---- Fragment shader choices ------------------------------------------------
const FRAGMENT_SHADERS = {
  color: { label: 'Interpolated vertex color', source: colorSource },
  barycentric: { label: 'Blend weights (barycentric)', source: barycentricSource },
  fragcoord: { label: 'Pixel position (gl_FragCoord)', source: fragcoordSource },
};

// ---- State -----------------------------------------------------------------
const DEFAULTS = {
  positions: [vec2(0, 0.8), vec2(-0.8, -0.7), vec2(0.8, -0.7)],   // attribute space
  colors: ['#e63946', '#2a9d8f', '#3a6ff7'],
  resolution: 12,
  angleDegrees: 0,
};

const state = {
  positions: DEFAULTS.positions.map((p) => vec2(p)),
  colors: DEFAULTS.colors.map(hexToRgb),
  angleDegrees: DEFAULTS.angleDegrees,
  mode: 'color',
  hovered: null,       // { ix, iy } or null
  dragging: -1,        // index of the dragged vertex, or -1
};

// ---- DOM -------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const glCanvas = $('gl');
const overlayCanvas = $('overlay');
const gl = glCanvas.getContext('webgl2', { preserveDrawingBuffer: true });

if (!gl) {
  $('unsupported').hidden = false;
  throw new Error('WebGL2 is not available in this browser.');
}

const dpr = window.devicePixelRatio || 1;
overlayCanvas.width = DISPLAY_SIZE * dpr;
overlayCanvas.height = DISPLAY_SIZE * dpr;
const ctx = overlayCanvas.getContext('2d');
ctx.scale(dpr, dpr);

const demo = new ShaderDemo(
  gl,
  vertexSource,
  Object.fromEntries(Object.entries(FRAGMENT_SHADERS).map(([k, v]) => [k, v.source])),
);

// ---- Helpers ---------------------------------------------------------------
const fmt = (v) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
const fmtVec = (v) => `(${v.map(fmt).join(', ')})`;
const swatch = (rgb) =>
  `<span class="swatch" style="background:rgb(${rgb.map(toByte).join(' ')})"></span>`;

/** Clip-space positions after the vertex shader (mirrors triangle.vert). */
const clipPositions = () => {
  const matrix = rotateZ(state.angleDegrees);
  return state.positions.map((p) => transform(matrix, p));
};

// ---- Rendering -------------------------------------------------------------
function inspectHovered(clip) {
  if (!state.hovered) return null;
  const { ix, iy } = state.hovered;
  const n = demo.resolution;
  const center = pixelCenterToClip(ix, iy, n);
  const weights = barycentric(center, clip[0], clip[1], clip[2]);
  const fragCoord = [ix + 0.5, n - iy - 0.5];
  const gpu = demo.readPixel(ix, iy);
  const covered = gpu[3] > 0;
  const expected = covered
    ? expectedOutput(state.mode, weights, state.colors, fragCoord, n)
    : null;
  const matches = covered && expected.every((v, k) => Math.abs(toByte(v) - gpu[k]) <= 1);
  return { ix, iy, center, weights, fragCoord, gpu, covered, expected, matches,
           cpuInside: isInside(weights) };
}

function renderReadouts(clip, inspected) {
  // Stage 1: one row per vertex shader invocation.
  $('vertex-rows').innerHTML = state.positions.map((p, i) => `
    <tr>
      <td>${i}</td>
      <td>${fmtVec(p)}</td>
      <td>${swatch(state.colors[i])}</td>
      <td>${fmtVec(clip[i])}</td>
    </tr>`).join('');

  // Stage 2: how many pixels the rasterizer produced fragments for.
  const n = demo.resolution;
  $('fragment-count').textContent =
    `${demo.countCoveredPixels()} of ${n * n} pixels`;

  // Stage 3: the inspected pixel.
  const box = $('inspector');
  if (!inspected) {
    box.innerHTML = '<p class="hint">Move the pointer over the image to follow one fragment.</p>';
    return;
  }
  const w = inspected.weights;
  const lines = [
    `<dt>Pixel</dt><dd>column ${inspected.ix}, row ${inspected.iy} from the top</dd>`,
    `<dt>gl_FragCoord.xy</dt><dd>${fmtVec(inspected.fragCoord)}</dd>`,
  ];
  if (inspected.covered) {
    lines.push(
      `<dt>Blend weights</dt><dd>${fmtVec(w)} <span class="muted">for v0, v1, v2</span></dd>`,
      `<dt>Expected output</dt><dd>${swatch(inspected.expected)} ${fmtVec(inspected.expected)}</dd>`,
      `<dt>GPU wrote</dt><dd>${swatch([...inspected.gpu].slice(0, 3).map((b) => b / 255))} ` +
        `(${[...inspected.gpu].slice(0, 3).join(', ')}) ` +
        `<span class="${inspected.matches ? 'ok' : 'bad'}">${inspected.matches ? 'matches' : 'differs'}</span></dd>`,
    );
  } else {
    lines.push(
      `<dt>Result</dt><dd>No fragment: this pixel's center is outside the triangle, ` +
        `so the fragment shader never ran here.` +
        `${inspected.cpuInside ? ' (Edge case: the center lies exactly on an edge.)' : ''}</dd>`,
    );
  }
  box.innerHTML = `<dl>${lines.join('')}</dl>`;
}

function render() {
  demo.setMatrix(rotateZ(state.angleDegrees));
  demo.setVertices(state.positions, state.colors);
  demo.render();

  const clip = clipPositions();
  const inspected = inspectHovered(clip);
  drawOverlay(ctx, {
    resolution: demo.resolution,
    clipPositions: clip,
    colors: state.colors,
    hovered: state.hovered,
    weights: inspected?.weights,
    showGrid: $('show-grid').checked,
    showWeights: $('show-weights').checked,
  });
  renderReadouts(clip, inspected);
}

function showSources() {
  $('vertex-source').textContent = vertexSource;
  $('fragment-source').textContent = FRAGMENT_SHADERS[state.mode].source;
}

// ---- Pointer interaction ---------------------------------------------------
function logicalPoint(event) {
  const rect = overlayCanvas.getBoundingClientRect();
  return [
    ((event.clientX - rect.left) * DISPLAY_SIZE) / rect.width,
    ((event.clientY - rect.top) * DISPLAY_SIZE) / rect.height,
  ];
}

function handleAt([px, py]) {
  const reach = HANDLE_RADIUS + 6;
  let best = -1;
  let bestDistance = reach;
  clipPositions().forEach((p, i) => {
    const [x, y] = clipToDisplay(p, DISPLAY_SIZE);
    const d = Math.hypot(px - x, py - y);
    if (d <= bestDistance) { best = i; bestDistance = d; }
  });
  return best;
}

overlayCanvas.addEventListener('pointerdown', (event) => {
  const index = handleAt(logicalPoint(event));
  if (index < 0) return;
  state.dragging = index;
  overlayCanvas.setPointerCapture(event.pointerId);
  overlayCanvas.classList.add('dragging');
});

overlayCanvas.addEventListener('pointermove', (event) => {
  const point = logicalPoint(event);

  if (state.dragging >= 0) {
    // Dragging moves the vertex's *output*; undo the rotation to find the
    // attribute value that would produce it.
    const raw = displayToClip(point, DISPLAY_SIZE);
    const clip = vec2(Math.min(1, Math.max(-1, raw[0])), Math.min(1, Math.max(-1, raw[1])));
    state.positions[state.dragging] = transform(rotateZ(-state.angleDegrees), clip);
  } else {
    overlayCanvas.style.cursor = handleAt(point) >= 0 ? 'grab' : 'crosshair';
  }

  const n = demo.resolution;
  const ix = Math.floor((point[0] / DISPLAY_SIZE) * n);
  const iy = Math.floor((point[1] / DISPLAY_SIZE) * n);
  state.hovered = ix >= 0 && ix < n && iy >= 0 && iy < n ? { ix, iy } : null;
  render();
});

const endDrag = () => {
  state.dragging = -1;
  overlayCanvas.classList.remove('dragging');
};
overlayCanvas.addEventListener('pointerup', endDrag);
overlayCanvas.addEventListener('pointercancel', endDrag);
overlayCanvas.addEventListener('pointerleave', () => {
  if (state.dragging < 0) { state.hovered = null; render(); }
});

// ---- Controls --------------------------------------------------------------
for (const [key, { label }] of Object.entries(FRAGMENT_SHADERS)) {
  $('fragment-select').add(new Option(label, key));
}

$('fragment-select').addEventListener('change', (event) => {
  state.mode = event.target.value;
  demo.setFragmentShader(state.mode);
  showSources();
  render();
});

$('resolution').addEventListener('input', (event) => {
  const n = Number(event.target.value);
  demo.setResolution(n);
  $('resolution-value').textContent = `${n} × ${n}`;
  state.hovered = null;
  render();
});

$('angle').addEventListener('input', (event) => {
  const degrees = Number(event.target.value);
  state.angleDegrees = degrees;
  $('angle-value').textContent = `${degrees}°`;
  render();
});

['color-0', 'color-1', 'color-2'].forEach((id, i) => {
  $(id).addEventListener('input', (event) => {
    state.colors[i] = hexToRgb(event.target.value);
    render();
  });
});

$('show-grid').addEventListener('change', render);
$('show-weights').addEventListener('change', render);

$('reset').addEventListener('click', () => {
  state.positions = DEFAULTS.positions.map((p) => vec2(p));
  state.colors = DEFAULTS.colors.map(hexToRgb);
  state.angleDegrees = DEFAULTS.angleDegrees;
  state.hovered = null;
  $('angle').value = DEFAULTS.angleDegrees;
  $('angle-value').textContent = `${DEFAULTS.angleDegrees}°`;
  DEFAULTS.colors.forEach((hex, i) => { $(`color-${i}`).value = hex; });
  render();
});

// ---- Start -----------------------------------------------------------------
DEFAULTS.colors.forEach((hex, i) => { $(`color-${i}`).value = rgbToHex(hexToRgb(hex)); });
$('resolution').value = DEFAULTS.resolution;
$('resolution-value').textContent = `${DEFAULTS.resolution} × ${DEFAULTS.resolution}`;
showSources();
render();
