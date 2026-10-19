// Controller: owns the DOM, the five WebGL2 contexts and the frame loop.
// Dependencies point one way: main -> pipeline / views / renderer. None of those touch the DOM.
import { createState, stepAnimation } from './state.mjs';
import { buildPanel, syncControls } from './ui.mjs';
import { SceneRenderer } from './renderer.mjs';
import { createPipeline } from './pipeline.mjs';
import { VIEWS, buildScene } from './views.mjs';
import { axes, wireCube } from './geometry.mjs';
import { formatMatrix } from './matrixUtil.mjs';

// ---- Student code (app.html?solution loads the instructor reference instead) ----
const studentFile = new URLSearchParams(location.search).has('solution') ? './student.solution.mjs' : './student.mjs';
const student = await import(/* @vite-ignore */ studentFile);

// ---- Shader sources: fetched next to this file, then handed to initShaders() ----
const shaderUrls = {
  vertex: new URL('./shaders/mvp.vert.glsl', import.meta.url),
  fragment: new URL('./shaders/mvp.frag.glsl', import.meta.url),
};

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
  return response.text();
}

const [vertexSource, fragmentSource] = await Promise.all([
  fetchText(shaderUrls.vertex),
  fetchText(shaderUrls.fragment),
]);

// ---- Canvases: one WebGL2 context and one renderer per view ----
const views = VIEWS.map(def => {
  const canvas = document.getElementById(`view-${def.id}`);
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    document.getElementById('error').textContent = 'This browser does not support WebGL2.';
    throw new Error('WebGL2 not available');
  }
  const orbit = def.orbit ? { ...def.orbit, target: [...def.orbit.target] } : null;
  return { def, canvas, renderer: new SceneRenderer(gl, vertexSource, fragmentSource), orbit };
});

// Drag to orbit, wheel to zoom, on every canvas that has an orbit.
for (const { canvas, orbit } of views) {
  if (!orbit) continue;
  canvas.addEventListener('pointermove', event => {
    if (!(event.buttons & 1)) return;
    orbit.azimuth -= event.movementX * 0.5;
    orbit.elevation = Math.max(-89, Math.min(89, orbit.elevation + event.movementY * 0.5));
  });
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    orbit.distance = Math.max(1, orbit.distance * Math.exp(event.deltaY * 0.001));
  }, { passive: false });
}

// ---- Scene ----
const state = createState();
const compose = createPipeline(student);
const meshes = student.createModelMeshes();
const shared = { axes: axes(2), frustum: wireCube(1) };

buildPanel(document.getElementById('panel'), state, () => syncControls(state));

const readouts = ['M', 'V', 'P', 'PVM'].map(name => ({ name, element: document.getElementById(`mat-${name}`), text: '' }));
const warningBox = document.getElementById('warnings');

function fitCanvas(canvas) {
  const scale = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(canvas.clientWidth * scale));
  const height = Math.max(1, Math.round(canvas.clientHeight * scale));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

let previous = performance.now();

function frame(now) {
  const seconds = Math.min((now - previous) / 1000, 0.1);
  previous = now;

  if (state.animate) {
    stepAnimation(state, seconds);
    syncControls(state);
  }
  for (const view of views) fitCanvas(view.canvas);

  const finalCanvas = views[0].canvas;
  const mats = compose(state, finalCanvas.width / finalCanvas.height);
  const parts = student.buildModelParts(meshes, now / 1000);

  for (const view of views) {
    const aspect = view.canvas.width / view.canvas.height;
    view.renderer.render(buildScene(view.def, mats, parts, shared, aspect, view.orbit));
  }

  for (const readout of readouts) {
    const text = formatMatrix(mats[readout.name]);
    if (text !== readout.text) {
      readout.text = text;
      readout.element.textContent = text;
    }
  }
  warningBox.textContent = mats.warnings.join('\n');
  warningBox.hidden = mats.warnings.length === 0;

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
