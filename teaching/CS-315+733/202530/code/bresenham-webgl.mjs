// Bresenham WebGL2 (ESM)
// Modernized demo: CPU Bresenham -> draw via WebGL2 gl.POINTS

const canvas = document.getElementById('canvas');
const statusEl = document.getElementById('status');
const btnClear = document.getElementById('btn-clear');
const btnRandom = document.getElementById('btn-random');
const btnAnimate = document.getElementById('btn-animate');

const dpr = () => window.devicePixelRatio || 1;

function resizeCanvasToDisplaySize(canvas) {
  const ratio = dpr();
  const width = Math.round(canvas.clientWidth * ratio);
  const height = Math.round(canvas.clientHeight * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}

const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: false });
if (!gl) throw new Error('WebGL2 is required for this demo');

const vsSource = `#version 300 es
in vec2 a_pos;
uniform vec2 u_resolution;
uniform float u_pointSize;
void main(){
  vec2 zeroToOne = a_pos / u_resolution;
  vec2 clip = zeroToOne * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = u_pointSize;
}`;

const fsSource = `#version 300 es
precision mediump float;
uniform vec3 u_color;
out vec4 outColor;
void main(){ outColor = vec4(u_color, 1.0); }`;

function createShader(gl, type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error('Could not compile shader:\n' + info);
  }
  return s;
}

function createProgram(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error('Could not link program:\n' + info);
  }
  return p;
}

const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
const program = createProgram(gl, vs, fs);

const attribLoc = gl.getAttribLocation(program, 'a_pos');
const uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
const uColorLoc = gl.getUniformLocation(program, 'u_color');
const uPointSizeLoc = gl.getUniformLocation(program, 'u_pointSize');

const posBuffer = gl.createBuffer();

// --- Screen program (draws the FBO texture scaled to canvas) ---
const vsScreenSrc = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
out vec2 v_uv;
void main(){ v_uv = a_uv; gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const fsScreenSrc = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_texture;
uniform vec2 u_fboSize; // width, height in texels
out vec4 outColor;
void main(){
  // sample at texel centers to avoid half-texel shifts when using NEAREST
  vec2 texel = v_uv * u_fboSize;
  vec2 coord = (floor(texel) + 0.5) / u_fboSize;
  outColor = texture(u_texture, coord);
}`;

const vsScreen = createShader(gl, gl.VERTEX_SHADER, vsScreenSrc);
const fsScreen = createShader(gl, gl.FRAGMENT_SHADER, fsScreenSrc);
const screenProgram = createProgram(gl, vsScreen, fsScreen);
const screenPosLoc = gl.getAttribLocation(screenProgram, 'a_pos');
const screenUvLoc = gl.getAttribLocation(screenProgram, 'a_uv');
const screenTexLoc = gl.getUniformLocation(screenProgram, 'u_texture');
const screenFboSizeLoc = gl.getUniformLocation(screenProgram, 'u_fboSize');

// fullscreen quad (clip space) with UVs
const quadBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
// two triangles
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1, -1,  0, 0,
   1, -1,  1, 0,
  -1,  1,  0, 1,
  -1,  1,  0, 1,
   1, -1,  1, 0,
   1,  1,  1, 1,
]), gl.STATIC_DRAW);

// FBO state
let fbo = null;
let fboTexture = null;
let fboW = 1, fboH = 1;
// pixelSize: how many device pixels per logical "pixel" in the FBO
// pixelSize = device pixels per logical FBO pixel (user adjustable)
let pixelSize = Math.max(1, Math.floor(dpr() * 2));

// UI elements for pixel size control (populated after DOM load)
let pixelRangeEl = null;
let pixelValEl = null;
let overlay = null;
let overlayCtx = null;
let gridToggle = null;
let gridResEl = null;
let pixelPresetEl = null;
let snapToggleEl = null;
let fillToggleEl = null;

function createFBO(width, height) {
  // width/height are in device pixels (canvas.width/height)
  // compute FBO size as smaller by pixelSize to make blocky pixels
  fboW = Math.max(1, Math.floor(width / pixelSize));
  fboH = Math.max(1, Math.floor(height / pixelSize));

  // delete old
  if (fboTexture) gl.deleteTexture(fboTexture);
  if (fbo) gl.deleteFramebuffer(fbo);

  fboTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, fboTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fboW, fboH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture, 0);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Framebuffer incomplete: ' + status);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // effectivePixelSize: how many device pixels wide is each FBO texel
  // use float so mapping can be exact even when width not divisible by pixelSize
  window.__effectivePixelSize = canvas.width / fboW;
}

function resizeOverlayCanvas() {
  if (!overlay) return;
  // overlay should match the drawing canvas in device pixels
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  overlay.style.width = canvas.clientWidth + 'px';
  overlay.style.height = canvas.clientHeight + 'px';
}

function updateGridOverlay() {
  if (!overlayCtx) return;
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  if (!gridToggle || !gridToggle.checked) return;
  if (!fboW || !fboH) return;

  overlayCtx.strokeStyle = 'rgba(0,0,0,0.15)';
  overlayCtx.lineWidth = 1;

  const effectivePixelSize = window.__effectivePixelSize || pixelSize;
  // vertical lines
  for (let i = 0; i <= fboW; ++i) {
    const x = Math.round(i * effectivePixelSize) + 0.5;
    overlayCtx.beginPath();
    overlayCtx.moveTo(x, 0);
    overlayCtx.lineTo(x, overlay.height);
    overlayCtx.stroke();
  }
  // horizontal lines
  for (let j = 0; j <= fboH; ++j) {
    const y = Math.round(j * effectivePixelSize) + 0.5;
    overlayCtx.beginPath();
    overlayCtx.moveTo(0, y);
    overlayCtx.lineTo(overlay.width, y);
    overlayCtx.stroke();
  }
}

function drawFillAndHighlight() {
  if (!overlayCtx) return;
  // draw filled pixels for currentPositions if enabled
  if (fillToggleEl && fillToggleEl.checked && currentPositions && currentPositions.length) {
    overlayCtx.fillStyle = 'rgba(0,0,0,0.12)';
    const eff = window.__effectivePixelSize || pixelSize;
    for (let i = 0; i < currentPositions.length; i += 2) {
      const px = currentPositions[i];
      const py = currentPositions[i+1];
      const x = Math.round(px * eff);
      const y = Math.round(py * eff);
      overlayCtx.fillRect(x, y, Math.ceil(eff), Math.ceil(eff));
    }
  }
  // draw lastPoint highlight
  if (lastPoint) {
    const eff = window.__effectivePixelSize || pixelSize;
    const x = Math.round(lastPoint[0] * eff);
    const y = Math.round(lastPoint[1] * eff);
    overlayCtx.strokeStyle = 'rgba(200,20,20,0.95)';
    overlayCtx.lineWidth = 2;
    overlayCtx.strokeRect(x + 1, y + 1, Math.max(1, Math.round(eff)) - 2, Math.max(1, Math.round(eff)) - 2);
  }
}

function blitFBOToScreen() {
  // draw full-screen quad sampling fboTexture
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(screenProgram);

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  const stride = 4 * 4; // 4 floats per vertex
  gl.enableVertexAttribArray(screenPosLoc);
  gl.vertexAttribPointer(screenPosLoc, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(screenUvLoc);
  gl.vertexAttribPointer(screenUvLoc, 2, gl.FLOAT, false, stride, 2 * 4);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, fboTexture);
  gl.uniform1i(screenTexLoc, 0);
  // pass FBO size so fragment shader can sample texel centers
  gl.uniform2f(screenFboSizeLoc, fboW, fboH);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  // update overlay after blit so grid aligns with FBO mapping
  resizeOverlayCanvas();
  updateGridOverlay();
  drawFillAndHighlight();
}

function setViewportAndClear() {
  const resized = resizeCanvasToDisplaySize(canvas);
  // recompute pixelSize (can depend on DPR)
  // only recreate FBO if size changed or FBO missing
  if (resized || !fbo || !fboTexture) {
    createFBO(canvas.width, canvas.height);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  // ensure overlay matches
  resizeOverlayCanvas();
  updateGridOverlay();
  updateGridLabel();
}

function drawPoints(positions, color = [0, 0, 0]) {
  // positions: Float32Array [x,y,x,y,...] in FBO pixel coords
  if (!fbo || !fboTexture) return;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.viewport(0, 0, fboW, fboH);
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STREAM_DRAW);

  gl.useProgram(program);
  gl.enableVertexAttribArray(attribLoc);
  gl.vertexAttribPointer(attribLoc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(uResolutionLoc, fboW, fboH);
  gl.uniform3fv(uColorLoc, color);
  // choose point size of 1 in FBO space — when blitted it'll appear larger
  gl.uniform1f(uPointSizeLoc, 1.0);

  gl.drawArrays(gl.POINTS, 0, positions.length / 2);

  // blit to screen
  blitFBOToScreen();
}

// Bresenham integer line algorithm returning Float32Array of pixel positions
function bresenham(x0, y0, x1, y1) {
  const pts = [];
  let dx = Math.abs(x1 - x0);
  let sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0);
  let sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  while (true) {
    pts.push(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return new Float32Array(pts);
}

// Helpers to map client mouse coords to canvas pixel coords
function clientToCanvasPixel(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  // device pixel coords
  const xDevice = (clientX - rect.left) * (canvas.width / rect.width);
  const yDevice = (clientY - rect.top) * (canvas.height / rect.height);
  // map to FBO pixel coordinates using effective pixel size
  const effectivePixelSize = window.__effectivePixelSize || pixelSize;
  const x = Math.floor(xDevice / effectivePixelSize);
  const y = Math.floor(yDevice / effectivePixelSize);
  return [x, y];
}

// Keep only the last click — draw between last and previous click
let lastPoint = null; // in FBO coords
let currentPositions = null;
let animHandle = null;
// store last two points in device pixel coords so we can recompute after resize
let prevDevicePoint = null;
let lastDevicePoint = null;

function setStatus(msg) { statusEl.textContent = msg; }

function clear() {
  lastPoint = null;
  currentPositions = null;
  setViewportAndClear();
  setStatus('Cleared');
}

function drawLineFromClicks(a, b) {
  // draw between two provided points [x,y] in FBO coords
  if (!a || !b) return;
  const [x0, y0] = a;
  const [x1, y1] = b;
  currentPositions = bresenham(x0, y0, x1, y1);
  lastPoint = b;
  drawPoints(currentPositions, [0, 0, 0]);
  setStatus(`Line: ${currentPositions.length/2} pixels`);
  updateGridLabel();
}

function randomPoint() {
  // return a point in FBO pixel coords
  return [
    Math.floor(Math.random() * fboW),
    Math.floor(Math.random() * fboH)
  ];
}

function drawRandomLine() {
  const a = randomPoint();
  const b = randomPoint();
  // draw between a and b and set lastPoint to b
  currentPositions = bresenham(a[0], a[1], b[0], b[1]);
  lastPoint = b;
  // record device-space endpoints (use effectivePixelSize so stored device coords
  // match what overlay and remapping will use)
  const eff = window.__effectivePixelSize || pixelSize;
  prevDevicePoint = [a[0] * eff, a[1] * eff];
  lastDevicePoint = [b[0] * eff, b[1] * eff];
  // draw into FBO
  drawPoints(currentPositions, [0,0,0]);
  setStatus(`Random line: ${currentPositions.length/2} pixels`);
  updateGridLabel();
}

function animateLine() {
  if (!currentPositions) return;
  let i = 0;
  setViewportAndClear();
  function step() {
    // smaller chunks so the animation is visible on short lines
    const chunk = Math.max(8, Math.floor((currentPositions.length/2) / 60));
    const count = Math.min(currentPositions.length / 2, i + chunk);
    const slice = currentPositions.subarray(0, count * 2);
    setViewportAndClear();
    drawPoints(slice, [0, 0, 0]);
    i = count;
    if (i < currentPositions.length / 2) {
      animHandle = requestAnimationFrame(step);
    } else {
      animHandle = null;
      setStatus(`Animated ${i} pixels`);
    }
  }
  if (animHandle) { cancelAnimationFrame(animHandle); animHandle = null; }
  step();
}

// Mouse handling
canvas.addEventListener('pointerdown', (e) => {
  // compute device-space coordinates first
  const rect = canvas.getBoundingClientRect();
  const xDevice = (e.clientX - rect.left) * (canvas.width / rect.width);
  const yDevice = (e.clientY - rect.top) * (canvas.height / rect.height);
  // map to FBO coords
  const pt = [Math.floor(xDevice / pixelSize), Math.floor(yDevice / pixelSize)];
  if (!lastPoint) {
    lastPoint = pt;
    prevDevicePoint = null;
    lastDevicePoint = [xDevice, yDevice];
    setStatus('Point set — click another point to draw line');
    return;
  }
  // draw between lastPoint and this point, then set lastPoint to this point
  const prev = lastPoint;
  currentPositions = bresenham(prev[0], prev[1], pt[0], pt[1]);
  // record device-space endpoints
  const eff = window.__effectivePixelSize || pixelSize;
  prevDevicePoint = lastDevicePoint ? [...lastDevicePoint] : [prev[0] * eff, prev[1] * eff];
  lastDevicePoint = [xDevice, yDevice];
  lastPoint = pt;
  drawPoints(currentPositions, [0,0,0]);
  setStatus(`Line: ${currentPositions.length/2} pixels`);
});

btnClear.addEventListener('click', clear);
btnRandom.addEventListener('click', () => { drawRandomLine(); });
btnAnimate.addEventListener('click', () => { animateLine(); });

window.addEventListener('keydown', (e) => {
  if (e.key === 'c') clear();
  if (e.key === 'r') drawRandomLine();
  if (e.key === 'a') animateLine();
});

// Initial draw
setViewportAndClear();
setStatus('Ready — click two points to draw a line');

// Hook up pixel size UI after DOM ready
pixelRangeEl = document.getElementById('pixel-size-range');
pixelValEl = document.getElementById('pixel-size-val');
if (pixelRangeEl && pixelValEl) {
  // initialize slider with current pixelSize
  pixelRangeEl.value = String(pixelSize);
  pixelValEl.textContent = String(pixelSize);
  pixelRangeEl.addEventListener('input', (e) => {
    const v = Math.max(1, Math.min(128, Math.floor(Number(e.target.value))));
    pixelSize = v;
    pixelValEl.textContent = String(pixelSize);
    // recreate FBO and redraw using stored device endpoints if available
    // ensure FBO uses the new pixelSize
    createFBO(canvas.width, canvas.height);
    // clear the screen area
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1,1,1,1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (prevDevicePoint && lastDevicePoint) {
      const a = [Math.floor(prevDevicePoint[0] / pixelSize), Math.floor(prevDevicePoint[1] / pixelSize)];
      const b = [Math.floor(lastDevicePoint[0] / pixelSize), Math.floor(lastDevicePoint[1] / pixelSize)];
      currentPositions = bresenham(a[0], a[1], b[0], b[1]);
      lastPoint = b;
      drawPoints(currentPositions, [0,0,0]);
      updateGridLabel();
    } else if (lastDevicePoint) {
      lastPoint = [Math.floor(lastDevicePoint[0] / pixelSize), Math.floor(lastDevicePoint[1] / pixelSize)];
    } else if (currentPositions) {
      // if we only have currentPositions but no device endpoints, just redraw as-is
      drawPoints(currentPositions, [0,0,0]);
    }
  });
}

// presets + snapping
pixelPresetEl = document.getElementById('pixel-preset');
snapToggleEl = document.getElementById('snap-toggle');
fillToggleEl = document.getElementById('fill-toggle');
if (pixelPresetEl) {
  pixelPresetEl.addEventListener('change', (e) => {
    const v = Math.max(1, Math.min(128, Math.floor(Number(e.target.value))));
    pixelRangeEl.value = String(v);
    pixelRangeEl.dispatchEvent(new Event('input'));
  });
}
if (snapToggleEl && pixelRangeEl && pixelPresetEl) {
  const presets = Array.from(pixelPresetEl.options).map(o => Number(o.value));
  pixelRangeEl.addEventListener('input', (e) => {
    if (!snapToggleEl.checked) return;
    const v = Number(e.target.value);
    // find nearest preset
    let best = presets[0];
    let bd = Math.abs(v - best);
    for (const p of presets) {
      const d = Math.abs(v - p);
      if (d < bd) { bd = d; best = p; }
    }
    if (best !== v) {
      pixelRangeEl.value = String(best);
      pixelRangeEl.dispatchEvent(new Event('input'));
    }
  });
}

// overlay + grid UI
overlay = document.getElementById('overlay');
if (overlay) {
  overlayCtx = overlay.getContext('2d');
}
gridToggle = document.getElementById('grid-toggle');
gridResEl = document.getElementById('grid-res');
function updateGridLabel() {
  if (!gridResEl) return;
  gridResEl.textContent = `Grid: ${fboW}×${fboH}`;
}
if (gridToggle) {
  gridToggle.addEventListener('change', () => {
    updateGridOverlay();
  });
}
// update initial label
updateGridLabel();


// On resize, keep current drawing (re-draw)
new ResizeObserver(() => {
  // resize canvas and FBO, then try to recompute line from stored device endpoints
  setViewportAndClear();
  if (prevDevicePoint && lastDevicePoint) {
    const eff = window.__effectivePixelSize || pixelSize;
    const a = [Math.floor(prevDevicePoint[0] / eff), Math.floor(prevDevicePoint[1] / eff)];
    const b = [Math.floor(lastDevicePoint[0] / eff), Math.floor(lastDevicePoint[1] / eff)];
    currentPositions = bresenham(a[0], a[1], b[0], b[1]);
    lastPoint = b;
    drawPoints(currentPositions, [0,0,0]);
    updateGridLabel();
  } else if (lastDevicePoint) {
    // only a single stored point: update lastPoint
    lastPoint = [Math.floor(lastDevicePoint[0] / pixelSize), Math.floor(lastDevicePoint[1] / pixelSize)];
    // nothing to draw yet
  } else {
    // no stored endpoints — clear screen
    setViewportAndClear();
  }
}).observe(canvas);

// initial widget wiring: ensure preset reflects initial slider
if (pixelPresetEl) {
  const presets = Array.from(pixelPresetEl.options).map(o => Number(o.value));
  // pick nearest preset for initial pixelSize
  let best = presets[0];
  let bd = Math.abs(pixelSize - best);
  for (const p of presets) { const d = Math.abs(pixelSize - p); if (d < bd) { bd = d; best = p; } }
  pixelPresetEl.value = String(best);
}


export default {};
