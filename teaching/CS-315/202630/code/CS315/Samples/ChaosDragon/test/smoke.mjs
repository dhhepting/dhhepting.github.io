// node test/smoke.mjs      (needs:  npm install jsdom)
//
// Runs the REAL main.mjs against app.html in jsdom, with:
//   * the REAL ../Common/initShadersJS.mjs (so run it inside your CS315 tree)
//   * a recording mock of WebGL2 (jsdom has no GPU)
//   * fetch() reading shaders/ from disk
// then drives the controls the way a person would.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

// ------------------------------------------------------------- environment
const alerts = [];
const rafQueue = [];
let resizeCallback = null;

Object.assign(globalThis, {
  window,
  document,
  alert: (m) => alerts.push(m),
  requestAnimationFrame: (cb) => { rafQueue.push(cb); return rafQueue.length; },
  cancelAnimationFrame: () => {},
  ResizeObserver: class {
    constructor(cb) { resizeCallback = cb; }
    observe() {}
  },
  fetch: async (url) => {
    const text = readFileSync(fileURLToPath(url), 'utf8');
    return { ok: true, status: 200, statusText: 'OK', text: async () => text };
  },
});
window.devicePixelRatio = 2;

const canvas = document.getElementById('gl-canvas');
canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 640 });
canvas.setPointerCapture = () => {};
canvas.releasePointerCapture = () => {};
canvas.hasPointerCapture = () => true;

const calls = [];
canvas.getContext = () => new Proxy({ canvas }, {
  get(t, prop) {
    if (prop in t) return t[prop];
    if (typeof prop === 'symbol') return undefined;
    if (/^[A-Z0-9_]+$/.test(prop)) return prop;
    if (prop === 'getUniformLocation') return (p, name) => ({ uniform: name });
    if (prop === 'getProgramParameter' || prop === 'getShaderParameter') return () => true;
    if (/^create/.test(prop)) return () => ({ made: prop });
    return (...args) => { calls.push({ name: prop, args }); };
  },
});

// ------------------------------------------------------------------ helpers
const tick = () => new Promise((r) => setTimeout(r, 0));
const frame = (t) => { const cb = rafQueue.shift(); assert.ok(cb, 'a frame is queued'); cb(t); };
const $ = (id) => document.getElementById(id);
const centre = (i) => {
  const m = $(`readout${i}`).textContent.match(/c = \((-?[\d.]+), (-?[\d.]+)\)/);
  return [Number(m[1]), Number(m[2])];
};
const mouse = (type, x, y) =>
  canvas.dispatchEvent(new window.MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
// world -> client pixel on the 640x640 canvas (window is x in [-0.75,1.75], y in [-1.1,1.4])
const toClient = (wx, wy) => [((wx + 0.75) / 2.5) * 640, (1 - (wy + 1.1) / 2.5) * 640];
const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);

let passed = 0;
function check(name, fn) { return Promise.resolve(fn()).then(() => { passed++; console.log(`  ok  ${name}`); }); }

// -------------------------------------------------------------------- run
await import('../main.mjs');
await tick(); await tick();

console.log('Controller smoke test');

await check('starts without alerts, compiles via initShaders, and draws on the first frame', () => {
  assert.deepEqual(alerts, []);
  assert.equal(calls.filter((c) => c.name === 'shaderSource').length, 2);
  frame(16);
  assert.ok(calls.some((c) => c.name === 'drawArrays' && c.args[2] === 100000), 'draws 100000 points');
  assert.match($('status').textContent, /100,000 points/);
});

await check('sliders are scaled to the visible window; swatches coloured', () => {
  near(Number($('c0x').min), -0.75, 1e-9);
  near(Number($('c0x').max), 1.75, 1e-9);
  near(Number($('c0y').min), -1.1, 1e-9);
  near(Number($('c0y').max), 1.4, 1e-9);
  assert.match($('swatch0').style.background, /26 89 217|rgb\(26,\s*89,\s*217\)/);
});

await check('readouts show the dragon from each centre: c, s, theta and the brief\'s matrices', () => {
  const r0 = $('readout0').textContent;
  const r1 = $('readout1').textContent;
  console.log('\n' + r0.split('\n').map((l) => '        ' + l).join('\n'));
  console.log('\n' + r1.split('\n').map((l) => '        ' + l).join('\n') + '\n');
  assert.match(r0, /c = \(0\.000, 0\.000\)\s+s = 0\.7071\s+\u03b8 = 45\.0\u00b0/);
  assert.match(r0, /\[\s*0\.500\s+-0\.500\s+0\.000 \]/);
  assert.match(r0, /\[\s*0\.500\s+0\.500\s+0\.000 \]/);
  assert.match(r1, /c = \(0\.600, 0\.200\)\s+s = 0\.7071\s+\u03b8 = 135\.0\u00b0/);
  assert.match(r1, /\[\s*-0\.500\s+-0\.500\s+1\.000 \]/);
  assert.match(r1, /\[\s*0\.500\s+-0\.500\s+0\.000 \]/);
});

await check('canvas backing store follows the ResizeObserver (device pixels)', () => {
  resizeCallback([{ devicePixelContentBoxSize: [{ inlineSize: 1280, blockSize: 1280 }] }]);
  assert.equal(canvas.width, 1280);
  assert.equal(canvas.height, 1280);
  calls.length = 0;
  frame(32);
  assert.ok(calls.some((c) => c.name === 'viewport' && c.args[2] === 1280));
});

await check('dragging a centre on the canvas moves it, regenerates points, and updates the readout', () => {
  const [x, y] = toClient(0.6, 0.2);
  calls.length = 0;
  mouse('pointerdown', x, y);
  const [tx, ty] = toClient(0.9, -0.4);
  mouse('pointermove', tx, ty);
  mouse('pointerup', tx, ty);
  const [cx, cy] = centre(1);
  near(cx, 0.9, 0.005);
  near(cy, -0.4, 0.005);
  near(Number($('c1x').value), 0.9, 0.005);
  calls.length = 0;
  frame(48);
  assert.ok(calls.some((c) => c.name === 'bufferSubData' && c.args[2] instanceof Float32Array && c.args[2].length === 200000));
  assert.deepEqual(centre(0), [0, 0], 'map 0 untouched');
});

await check('pointer-down on empty canvas does not start a drag', () => {
  const before = centre(0).concat(centre(1));
  const [x, y] = toClient(-0.5, 1.0);
  mouse('pointerdown', x, y);
  const [x2, y2] = toClient(0.2, 0.2);
  mouse('pointermove', x2, y2);
  mouse('pointerup', x2, y2);
  assert.deepEqual(centre(0).concat(centre(1)), before);
});

await check('dragging past the canvas edge clamps to the window', () => {
  const [x, y] = toClient(0.0, 0.0);
  mouse('pointerdown', x, y);
  mouse('pointermove', 5000, -5000);
  mouse('pointerup', 5000, -5000);
  const [cx, cy] = centre(0);
  near(cx, 1.75, 0.005);
  near(cy, 1.4, 0.005);
});

await check('slider input moves a centre', () => {
  $('c0x').value = '0.25';
  $('c0x').dispatchEvent(new window.Event('input'));
  near(centre(0)[0], 0.25, 1e-9);
  assert.equal($('c0x-out').textContent, '0.250');
});

await check('Reset to dragon restores both centres exactly', () => {
  $('reset').dispatchEvent(new window.MouseEvent('click'));
  assert.deepEqual(centre(0), [0, 0]);
  assert.deepEqual(centre(1), [0.6, 0.2]);
});

await check('Wander moves the centres smoothly about home, and switching it off leaves them where they are', () => {
  $('wander').checked = true;
  $('wander').dispatchEvent(new window.Event('change'));
  const path = [];
  for (let i = 0; i < 40; i++) {
    frame(100 + i * 16);
    path.push(centre(0));
  }
  const spread = Math.max(...path.map((p) => Math.hypot(p[0] - 0, p[1] - 0)));
  assert.ok(spread > 0.02 && spread <= 0.12 * Math.SQRT2 + 1e-9, `spread ${spread}`);
  let maxStep = 0;
  for (let i = 1; i < path.length; i++) {
    maxStep = Math.max(maxStep, Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  }
  assert.ok(maxStep < 0.01, `largest per-frame step ${maxStep}`);
  $('wander').checked = false;
  const stopped = centre(0);
  frame(900);
  assert.deepEqual(centre(0), stopped);
});

await check('Count, point size, Show centres and New random sequence reach the renderer', () => {
  $('count').value = '20000';
  $('count').dispatchEvent(new window.Event('input'));
  calls.length = 0;
  frame(1000);
  assert.ok(calls.some((c) => c.name === 'drawArrays' && c.args[2] === 20000));

  $('show-centres').checked = false;
  $('show-centres').dispatchEvent(new window.Event('change'));
  calls.length = 0;
  frame(1016);
  assert.equal(calls.filter((c) => c.name === 'drawArrays').length, 1);

  calls.length = 0;
  $('reroll').dispatchEvent(new window.MouseEvent('click'));
  frame(1032);
  assert.ok(calls.some((c) => c.name === 'bufferSubData' && c.args[2] instanceof Uint8Array));
});

assert.deepEqual(alerts, [], 'no alerts raised during the run');
console.log(`\n${passed} controller checks passed`);
process.exit(0);
