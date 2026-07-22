/* eslint-disable require-jsdoc */
// Modernized ES6 module-style script for the 2D gasket chaos game

'use strict';

let gl;
let positions = [];
let colours = [];
let pBuffer;
let cBuffer;
let positionLoc;
let aColourLoc;
let pointSizeLoc;
let centeredRotationMatrixLoc;
let nbrPointsRequested = 0;
let generatedCount = 0;
let srcTheta = 0;

const xforms = [mat3(), mat3(), mat3()];

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

const centres = [
  vec3(-1, -1, 1),
  vec3(0, 0, 0),
  vec3(1, 1, 1),
];

document.addEventListener('DOMContentLoaded', init);

function init() {
  const canvas = document.getElementById('gl-canvas');
  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
    return;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.5, 0.5, 0.5, 1.0);

  const program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram(program);

  // create buffers and bind attribute pointers
  pBuffer = gl.createBuffer();
  cBuffer = gl.createBuffer();

  positionLoc = gl.getAttribLocation(program, 'aPosition');
  aColourLoc = gl.getAttribLocation(program, 'aColour');

  gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.enableVertexAttribArray(aColourLoc);
  gl.vertexAttribPointer(aColourLoc, 4, gl.FLOAT, false, 0, 0);

  pointSizeLoc = gl.getUniformLocation(program, 'uPointSize');
  centeredRotationMatrixLoc = gl.getUniformLocation(program, 'uCenteredRotationMatrix');

  // UI elements
  const nbrInput = document.getElementById('nbr-points');
  const nbrRange = document.getElementById('nbr-points-range');
  const generatedCountEl = document.getElementById('generated-count');
  const generationStatusEl = document.getElementById('generation-status');
  const applyBtn = document.getElementById('apply');
  const resetBtn = document.getElementById('reset');

  // keep number input and range in sync
  nbrInput.addEventListener('input', () => { nbrRange.value = nbrInput.value; });
  nbrRange.addEventListener('input', () => { nbrInput.value = nbrRange.value; });

  applyBtn.addEventListener('click', () => triangleXF({applyBtn, generatedCountEl, generationStatusEl}));
  resetBtn.addEventListener('click', () => doReset({generatedCountEl, generationStatusEl, applyBtn}));

  // initial setup + start render loop
  triangleXF({generatedCountEl: document.getElementById('generated-count'), generationStatusEl: document.getElementById('generation-status')});
}

let isGenerating = false;
let cancelGeneration = false;

function triangleXF(opts = {}) {
  const { applyBtn, generatedCountEl, generationStatusEl } = opts;
  positions = [];
  colours = [];

  // read numeric inputs cleanly
  centres[0][0] = parseFloat(document.getElementById('v0-xpos').value);
  centres[0][1] = parseFloat(document.getElementById('v0-ypos').value);
  centres[1][0] = parseFloat(document.getElementById('v1-xpos').value);
  centres[1][1] = parseFloat(document.getElementById('v1-ypos').value);
  centres[2][0] = parseFloat(document.getElementById('v2-xpos').value);
  centres[2][1] = parseFloat(document.getElementById('v2-ypos').value);

  // push the three centre vertices
  positions.push(vec2(centres[0][0], centres[0][1]));
  colours.push(baseColours[0]);
  positions.push(vec2(centres[1][0], centres[1][1]));
  colours.push(baseColours[0]);
  positions.push(vec2(centres[2][0], centres[2][1]));
  colours.push(baseColours[0]);

  // build transforms with numeric rotation values
  xforms[0] = identity();
  xforms[0] = mult(xforms[0], translate(centres[0][0], centres[0][1]));
  xforms[0] = mult(xforms[0], scale(0.5, 0.5));
  xforms[0] = mult(xforms[0], rotate(parseFloat(document.getElementById('v0-rot').value)));
  xforms[0] = mult(xforms[0], translate(-centres[0][0], -centres[0][1]));

  xforms[1] = identity();
  xforms[1] = mult(xforms[1], translate(centres[1][0], centres[1][1]));
  xforms[1] = mult(xforms[1], scale(0.5, 0.5));
  xforms[1] = mult(xforms[1], rotate(parseFloat(document.getElementById('v1-rot').value)));
  xforms[1] = mult(xforms[1], translate(-centres[1][0], -centres[1][1]));

  xforms[2] = identity();
  xforms[2] = mult(xforms[2], translate(centres[2][0], centres[2][1]));
  xforms[2] = mult(xforms[2], scale(0.5, 0.5));
  xforms[2] = mult(xforms[2], rotate(parseFloat(document.getElementById('v2-rot').value)));
  xforms[2] = mult(xforms[2], translate(-centres[2][0], -centres[2][1]));

  nbrPointsRequested = Math.max(0, Math.floor(Number(document.getElementById('nbr-points').value)));

  // start non-blocking generation in chunks so the UI stays responsive
  if (isGenerating) return;
  isGenerating = true;
  cancelGeneration = false;
  if (applyBtn) applyBtn.disabled = true;
  if (generationStatusEl) generationStatusEl.textContent = 'generating...';

  // upload initial centres
  uploadBuffers();
  generatedCount = 0;
  if (generatedCountEl) generatedCountEl.textContent = String(generatedCount);

  triangleChaosAsync(nbrPointsRequested, {applyBtn, generatedCountEl, generationStatusEl});

  // start render loop (render calls itself)
  requestAnimationFrame(render);
}
function triangleChaosAsync(count, opts = {}) {
  const { applyBtn, generatedCountEl, generationStatusEl } = opts;
  const CHUNK = 4096;
  let i = 0;
  let currpoint = vec3(centres[0][0], centres[0][1], 1);
  let newpoint = vec3(centres[0][0], centres[0][1], 1);
  let xf = 0;
  let mrxf = 0;

  function step() {
    const end = Math.min(i + CHUNK, count);
    for (; i < end; i++) {
      mrxf = xf;
      xf = Math.floor(Math.random() * 3);
      newpoint = mult(xforms[xf], currpoint);
      positions.push(vec2(newpoint[0], newpoint[1]));
      const colourIndex = 1 + (xf * 3 + mrxf);
      colours.push(baseColours[colourIndex % baseColours.length]);
      currpoint = newpoint;
    }

    // upload current buffers (simple full upload)
    uploadBuffers();
    generatedCount = Math.max(0, positions.length - 3);
    if (generatedCountEl) generatedCountEl.textContent = String(generatedCount);

    if (cancelGeneration) {
      isGenerating = false;
      if (generationStatusEl) generationStatusEl.textContent = 'cancelled';
      if (applyBtn) applyBtn.disabled = false;
      return;
    }

    if (i < count) {
      // schedule next chunk
      setTimeout(step, 0);
    } else {
      // done
      isGenerating = false;
      if (generationStatusEl) generationStatusEl.textContent = 'done';
      if (applyBtn) applyBtn.disabled = false;
    }
  }

  step();
}

function uploadBuffers() {
  gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(positions)), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(colours)), gl.STATIC_DRAW);
}

function doReset(opts = {}) {
  const { generatedCountEl, generationStatusEl, applyBtn } = opts;
  // cancel any running generation
  if (isGenerating) {
    cancelGeneration = true;
  }
  // reset positions to only centres
  positions = [];
  colours = [];
  positions.push(vec2(centres[0][0], centres[0][1]));
  colours.push(baseColours[0]);
  positions.push(vec2(centres[1][0], centres[1][1]));
  colours.push(baseColours[0]);
  positions.push(vec2(centres[2][0], centres[2][1]));
  colours.push(baseColours[0]);
  uploadBuffers();
  generatedCount = 0;
  if (generatedCountEl) generatedCountEl.textContent = '0';
  if (generationStatusEl) generationStatusEl.textContent = 'reset';
  if (applyBtn) applyBtn.disabled = false;
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.uniform1f(pointSizeLoc, 1.0);
  if (generatedCount > 0) {
    gl.drawArrays(gl.POINTS, 3, generatedCount);
  }

  if (document.querySelector('input[name="show-centres"]:checked')) {
    gl.uniform1f(pointSizeLoc, 8.0);
    gl.drawArrays(gl.POINTS, 0, 3);
  }

  let crm = identity();
  if (document.querySelector('input[name="rotate-on"]:checked')) {
    const srcX = parseFloat(document.getElementById('src-xpos').value);
    const srcY = parseFloat(document.getElementById('src-ypos').value);
    crm = mult(crm, translate(srcX, srcY));
    crm = mult(crm, rotate((++srcTheta) % 360));
    crm = mult(crm, translate(-srcX, -srcY));
  }
  gl.uniformMatrix3fv(centeredRotationMatrixLoc, false, flatten(crm));

  requestAnimationFrame(render);
}

function identity() {
  return mat3(
    1.0, 0.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 0.0, 1.0,
  );
}

function scale(sx, sy) {
  return mat3(
    sx, 0.0, 0.0,
    0.0, sy, 0.0,
    0.0, 0.0, 1.0,
  );
}

function rotate(theta360) {
  const theta = theta360 * Math.PI / 180;
  return mat3(
    Math.cos(theta), -Math.sin(theta), 0.0,
    Math.sin(theta), Math.cos(theta), 0.0,
    0.0, 0.0, 1.0,
  );
}
