// main.mjs
// Controller for the vector-vs-raster zoom demo. It owns both canvases and
// their GL contexts, loads the shaders, rasterizes the SVG, drives the render
// loop, and handles all input. The renderer (zoomer.mjs) stays DOM-free; every
// document/canvas access lives here.
//
// The idea: two panels zoom into the SAME artwork with the SAME focus and the
// SAME magnification, so the ONLY variable is how each panel gets its pixels.
//
//   LEFT  ("vector")  -- re-rasterized from the SVG every frame at display
//                        resolution. The zoom is baked into fresh pixels, so it
//                        stays sharp no matter how far you go in.
//   RIGHT ("frozen")  -- the SVG rasterized ONCE to an N x N grid (default 32),
//                        then only magnified. Its texels turn into big blocks:
//                        a raster has a fixed resolution and zooming cannot add
//                        detail that was never captured.

import { initShaders } from './initShadersJS.mjs';
import { Zoomer } from './zoomer.mjs';

// --- Tunables -------------------------------------------------------------
const DEFAULT_FROZEN_RES = 32;   // N for the frozen N x N raster (specifiable)
const SHARP_DIM = 640;           // fixed size of the vector panel's live raster
const MAX_RASTER = 8192;         // safety cap on the live raster's pixel size
const DEFAULT_MAX_ZOOM = 8;      // deepest magnification of the auto zoom
const OMEGA = 0.5;               // zoom angular speed (rad/s); ~12.5s round trip
const ART_BG = '#ffffff';        // background painted behind the artwork
const MARGIN = '#26262e';        // shown where the zoom window leaves the artwork
const CLEAR = [0.15, 0.15, 0.18, 1.0];

// --- DOM ------------------------------------------------------------------
const sharpCanvas = document.querySelector('#sharp-canvas');
const frozenCanvas = document.querySelector('#frozen-canvas');
const frozenCap = document.querySelector('#frozen-cap');
const resInput = document.querySelector('#res');
const resVal = document.querySelector('#res-val');
const zoomInput = document.querySelector('#zoom');
const zoomVal = document.querySelector('#zoom-val');
const pauseBtn = document.querySelector('#pause');
const resetBtn = document.querySelector('#reset');
const filterBtn = document.querySelector('#filter');
const readout = document.querySelector('#readout');

const sharpGL = sharpCanvas.getContext('webgl2', { alpha: false });
const frozenGL = frozenCanvas.getContext('webgl2', { alpha: false });
if (!sharpGL || !frozenGL) {
  throw new Error('WebGL2 is not available in this browser.');
}

// --- Shaders (one program per context; programs cannot be shared) ---------
const [vertSrc, fragSrc] = await Promise.all([
  fetch('./shaders/quad.vert.glsl').then((r) => r.text()),
  fetch('./shaders/quad.frag.glsl').then((r) => r.text()),
]);
const sharpProgram = initShaders(sharpGL, vertSrc, fragSrc);
const frozenProgram = initShaders(frozenGL, vertSrc, fragSrc);

const sharpZoomer = new Zoomer(sharpGL, sharpProgram, sharpGL.LINEAR);
let frozenFilter = frozenGL.NEAREST;
const frozenZoomer = new Zoomer(frozenGL, frozenProgram, frozenFilter);

for (const gl of [sharpGL, frozenGL]) {
  gl.clearColor(...CLEAR);
}

// --- Load the SVG as an <img> so the browser can rasterize the vector -----
// The source viewBox is 220 x 220 with no width/height; we inject an intrinsic
// size so every browser rasterizes crisply at whatever size we draw it.
const rawSvg = await fetch('./assets/dh.svg').then((r) => r.text());
const sizedSvg = rawSvg.replace(
  /<svg\b(?![^>]*\bwidth=)/,
  '<svg width="220" height="220"',
);
const svgURL = URL.createObjectURL(new Blob([sizedSvg], { type: 'image/svg+xml' }));
const svgImg = new Image();
svgImg.src = svgURL;
await svgImg.decode();

// --- Offscreen 2D canvases used to rasterize the SVG ----------------------
// The vector panel rasterizes into a fixed-size scratch canvas every frame.
const sharpScratch = document.createElement('canvas');
sharpScratch.width = SHARP_DIM;
sharpScratch.height = SHARP_DIM;
const sharpCtx = sharpScratch.getContext('2d', { alpha: false });

// The frozen panel rasterizes once into an N x N canvas, rebuilt when N changes.
let frozenScratch = null;
let frozenCtx = null;
let frozenRes = DEFAULT_FROZEN_RES;
let frozenDirty = true;

// Rasterize the WHOLE artwork into an N x N grid and hand it to the frozen
// panel. Called only when N changes -- this is the "freeze".
function rebuildFrozen() {
  if (!frozenScratch || frozenScratch.width !== frozenRes) {
    frozenScratch = document.createElement('canvas');
    frozenScratch.width = frozenRes;
    frozenScratch.height = frozenRes;
    frozenCtx = frozenScratch.getContext('2d', { alpha: false });
  }
  frozenCtx.imageSmoothingEnabled = true; // smooth DOWN-sampling into the grid
  frozenCtx.fillStyle = ART_BG;
  frozenCtx.fillRect(0, 0, frozenRes, frozenRes);
  frozenCtx.drawImage(svgImg, 0, 0, frozenRes, frozenRes);
  frozenZoomer.setTexture(frozenScratch);
  frozenDirty = false;
}

// Rasterize just the visible zoom window of the SVG, at display resolution,
// into the fixed scratch canvas. The zoom is baked into these pixels, so the
// vector panel then draws them with no further magnification.
function rasterizeSharpWindow(zoom, center) {
  const s = SHARP_DIM;
  sharpCtx.setTransform(1, 0, 0, 1, 0, 0);
  sharpCtx.fillStyle = MARGIN;
  sharpCtx.fillRect(0, 0, s, s); // opaque, in case the window leaves the art

  // At zoom Z a 1/Z-wide window fills the canvas, so the full artwork spans
  // s * Z pixels; place it so `center` lands at the canvas middle.
  const full = Math.min(s * zoom, MAX_RASTER);
  const originX = s / 2 - center[0] * full;
  const originY = s / 2 - center[1] * full;

  sharpCtx.fillStyle = ART_BG;
  sharpCtx.fillRect(originX, originY, full, full);
  sharpCtx.drawImage(svgImg, originX, originY, full, full);

  sharpZoomer.setTexture(sharpScratch);
}

// --- Shared zoom state ----------------------------------------------------
const center = [0.5, 0.5]; // focus point in [0,1], shared by both panels
let maxZoom = DEFAULT_MAX_ZOOM;
let elapsed = 0;           // seconds of zoom animation accumulated
let paused = false;
let currentZoom = 1;

// Smooth ping-pong 1 -> maxZoom -> 1, eased at both ends. Exponential in the
// magnification so each second of travel feels like a constant zoom rate.
function zoomAt(t) {
  const phase = (1 - Math.cos(t * OMEGA)) / 2; // 0..1..0, eased
  return Math.exp(phase * Math.log(maxZoom));
}

// --- Canvas sizing (DPR-aware), per canvas --------------------------------
function resize(canvas, gl) {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.floor(canvas.clientWidth * dpr);
  const height = Math.floor(canvas.clientHeight * dpr);
  if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
    canvas.width = width;
    canvas.height = height;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
}

// --- Controls -------------------------------------------------------------
function updateReadout() {
  readout.textContent =
    `zoom ${currentZoom.toFixed(1)}x   ·   frozen ${frozenRes}x${frozenRes}` +
    `   ·   focus (${center[0].toFixed(2)}, ${center[1].toFixed(2)})`;
}

resInput.addEventListener('input', () => {
  frozenRes = Number(resInput.value);
  resVal.textContent = frozenRes;
  frozenCap.textContent = `frozen raster \u2014 ${frozenRes}\u00d7${frozenRes}, magnified`;
  frozenDirty = true;
});

zoomInput.addEventListener('input', () => {
  maxZoom = Number(zoomInput.value);
  zoomVal.textContent = `${maxZoom}\u00d7`;
});

function setPaused(next) {
  paused = next;
  pauseBtn.textContent = paused ? 'play' : 'pause';
}
pauseBtn.addEventListener('click', () => setPaused(!paused));
resetBtn.addEventListener('click', () => {
  elapsed = 0;
  center[0] = 0.5;
  center[1] = 0.5;
});
filterBtn.addEventListener('click', () => {
  frozenFilter = frozenFilter === frozenGL.NEAREST ? frozenGL.LINEAR : frozenGL.NEAREST;
  frozenZoomer.setFilter(frozenFilter);
  filterBtn.textContent = frozenFilter === frozenGL.NEAREST ? 'nearest' : 'linear';
});

// Click either panel to move the shared focus point there.
function focusFromEvent(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  center[0] = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  center[1] = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
}
sharpCanvas.addEventListener('pointerdown', (e) => focusFromEvent(e, sharpCanvas));
frozenCanvas.addEventListener('pointerdown', (e) => focusFromEvent(e, frozenCanvas));

// Keyboard shortcuts mirror the buttons.
window.addEventListener('keydown', (event) => {
  const k = event.key.toLowerCase();
  if (k === ' ' || k === 'p') { event.preventDefault(); setPaused(!paused); }
  else if (k === 'r') { resetBtn.click(); }
  else if (k === 'f') { filterBtn.click(); }
});

// --- Render loop ----------------------------------------------------------
let lastNow = performance.now();

function render(now) {
  const dt = (now - lastNow) / 1000;
  lastNow = now;
  if (!paused) elapsed += dt;
  currentZoom = zoomAt(elapsed);

  if (frozenDirty) rebuildFrozen();

  // Vector panel: bake this frame's zoom into a fresh raster, draw it as-is.
  resize(sharpCanvas, sharpGL);
  rasterizeSharpWindow(currentZoom, center);
  sharpGL.clear(sharpGL.COLOR_BUFFER_BIT);
  sharpZoomer.draw(1.0, center);

  // Frozen panel: same zoom and focus, but applied in the shader to the
  // never-refreshed N x N texture.
  resize(frozenCanvas, frozenGL);
  frozenGL.clear(frozenGL.COLOR_BUFFER_BIT);
  frozenZoomer.draw(currentZoom, center);

  updateReadout();
  requestAnimationFrame(render);
}

// Initial UI sync, then go.
resInput.value = String(frozenRes);
resVal.textContent = frozenRes;
zoomInput.value = String(maxZoom);
zoomVal.textContent = `${maxZoom}\u00d7`;
requestAnimationFrame(render);
