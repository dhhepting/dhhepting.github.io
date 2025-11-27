// main.js
import { Renderer } from './renderer.js';
import { bindUI } from './ui.js';
import { vec4, mat3, flatten, identity, mult, translate, scale } from './MVnew.js';

// copy of colour palette from original script
const baseColours = [
  vec4(1.0, 0.67, 0.125, 1), // 0: vertex colour
  vec4(1, 0, 0, 1),
  vec4(1, 0, 0.5, 1),
  vec4(1, 0.5, 0, 1),
  vec4(0.5, 0, 1, 1),
  vec4(0, 0, 1, 1),
  vec4(0, 0.5, 1, 1),
  vec4(0.5, 1, 0, 1),
  vec4(0, 1, 0.5, 1),
  vec4(0, 1, 0, 1),
  vec4(1, 1, 1, 1),
];

let renderer;
let ui;
let centres = [ [-1,-1], [0,0], [1,1] ];
let xforms = [ mat3(), mat3(), mat3() ];
let generationController = null;
let worker = null;
let generatedCount = 0;
let totalCount = 0;
let positionsBuf = null;
let coloursBuf = null;

document.addEventListener('DOMContentLoaded', () => {
  ui = bindUI();
  const canvas = document.getElementById('gl-canvas');
  renderer = new Renderer(canvas);
  renderer.init();

  // wire buttons
  const { applyBtn, resetBtn, generatedCountEl, generationStatusEl } = ui.elements;
  applyBtn.addEventListener('click', () => doApply());
  resetBtn.addEventListener('click', () => doReset());

  // initial reset to show centres
  doReset();
  requestAnimationFrame(tick);
});

function buildXforms(centresArr, rotations) {
  for (let k = 0; k < 3; ++k) {
    xforms[k] = identity();
    xforms[k] = mult(xforms[k], translate(centresArr[k][0], centresArr[k][1]));
    xforms[k] = mult(xforms[k], scale(0.5, 0.5));
    xforms[k] = mult(xforms[k], rotate(rotations[k]));
    xforms[k] = mult(xforms[k], translate(-centresArr[k][0], -centresArr[k][1]));
  }
}

function doApply() {
  if (!ui) return;
  const { generatedCountEl, generationStatusEl, applyBtn } = ui.elements;
  const count = ui.readCount();
  const centresArr = ui.readCentres();
  const rotations = ui.readRotations();
  centres = centresArr;
  buildXforms(centres, rotations);

  // prepare buffers: 3 centres + count generated
  totalCount = count;
  positionsBuf = new Float32Array((3 + totalCount) * 2);
  coloursBuf = new Float32Array((3 + totalCount) * 4);

  // fill centres into buffer
  for (let i = 0; i < 3; ++i) {
    positionsBuf[i*2] = centres[i][0];
    positionsBuf[i*2 + 1] = centres[i][1];
    coloursBuf.set(flatten(baseColours[0]), i*4);
  }

  generatedCount = 0;
  if (generatedCountEl) generatedCountEl.textContent = String(generatedCount);
  if (generationStatusEl) generationStatusEl.textContent = 'generating...';
  if (applyBtn) applyBtn.disabled = true;

  // upload initial centres to GPU immediately
  renderer.uploadData(positionsBuf, coloursBuf);

  // start generation
  // Use a Web Worker to generate points and transfer chunks back
  if (worker) {
    worker.terminate();
    worker = null;
  }
  // use a module worker so paths resolve relative to this module
  worker = new Worker(new URL('./points.worker.js', import.meta.url), { type: 'module' });

  // prepare flattened xforms and baseColours to send to worker
  const xformsFlat = xforms.map(x => flatten(x));
  const baseColoursFlat = new Float32Array(baseColours.length * 4);
  for (let i = 0; i < baseColours.length; ++i) baseColoursFlat.set(flatten(baseColours[i]), i * 4);
  const centresFlat = new Float32Array([centres[0][0], centres[0][1], centres[1][0], centres[1][1], centres[2][0], centres[2][1]]);

  worker.onmessage = (ev) => {
    const msg = ev.data;
    if (!msg) return;
    if (msg.type === 'chunk') {
      const posChunk = new Float32Array(msg.pos);
      const colChunk = new Float32Array(msg.col);
      const startPos = 3 * 2 + generatedCount * 2;
      positionsBuf.set(posChunk, startPos);
      const startCol = 3 * 4 + generatedCount * 4;
      coloursBuf.set(colChunk, startCol);
      generatedCount += posChunk.length / 2;
      renderer.uploadData(positionsBuf, coloursBuf);
      if (ui && ui.elements.generatedCountEl) ui.elements.generatedCountEl.textContent = String(generatedCount);
    } else if (msg.type === 'done') {
      if (ui && ui.elements.applyBtn) ui.elements.applyBtn.disabled = false;
      if (ui && ui.elements.generationStatusEl) ui.elements.generationStatusEl.textContent = 'done';
      // worker may be reused for future generates
    } else if (msg.type === 'cancelled') {
      if (ui && ui.elements.generationStatusEl) ui.elements.generationStatusEl.textContent = 'cancelled';
      if (ui && ui.elements.applyBtn) ui.elements.applyBtn.disabled = false;
    }
  };

  worker.postMessage({ cmd: 'generate', count, xforms: xformsFlat, centres: centresFlat, baseColours: baseColoursFlat, CHUNK: 4096 });
}

function doReset() {
  if (!ui) return;
  const { generatedCountEl, generationStatusEl, applyBtn } = ui.elements;
  if (generationController && generationController.cancel) generationController.cancel();
  if (worker) {
    try { worker.postMessage({ cmd: 'cancel' }); } catch (e) { /* ignore */ }
    try { worker.terminate(); } catch (e) { /* ignore */ }
    worker = null;
  }
  // read centres
  centres = ui.readCentres();
  // prepare small buffers for centres only
  positionsBuf = new Float32Array(3 * 2);
  coloursBuf = new Float32Array(3 * 4);
  for (let i = 0; i < 3; ++i) {
    positionsBuf[i*2] = centres[i][0];
    positionsBuf[i*2 + 1] = centres[i][1];
    coloursBuf.set(flatten(baseColours[0]), i*4);
  }
  renderer.uploadData(positionsBuf, coloursBuf);
  generatedCount = 0;
  if (generatedCountEl) generatedCountEl.textContent = '0';
  if (generationStatusEl) generationStatusEl.textContent = 'reset';
  if (applyBtn) applyBtn.disabled = false;
}

function tick() {
  if (!ui || !renderer) return;
  const showCentres = !!document.querySelector('input[name="show-centres"]:checked');
  const rotateOn = !!document.querySelector('input[name="rotate-on"]:checked');
  const srcX = parseFloat(document.getElementById('src-xpos').value);
  const srcY = parseFloat(document.getElementById('src-ypos').value);
  renderer.render(generatedCount, showCentres, rotateOn, srcX, srcY);
  requestAnimationFrame(tick);
}
