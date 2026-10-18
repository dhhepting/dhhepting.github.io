// node test/verify.mjs
// Maths checks plus a ChaosGame run against a recording mock of WebGL2.
// No dependencies, no browser.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DRAGON, empathic, fromAffine, toAffine, mulPoint, makeChoices, chaosGame,
  viewMatrix, worldAt,
} from '../ifs.mjs';
import { ChaosGame, MAX_POINTS } from '../chaosgame.mjs';

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}
const near = (a, b, eps = 1e-12) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);

console.log('Maths');

const T = DRAGON.map((spec) => fromAffine(spec));

check('map 0 seen from its centre: c=(0,0), s=1/sqrt2, theta=45 deg', () => {
  near(T[0].centre[0], 0);
  near(T[0].centre[1], 0);
  near(T[0].scale, Math.SQRT1_2);
  near(T[0].angle, Math.PI / 4);
});

check('map 1 seen from its centre: c=(0.6,0.2), s=1/sqrt2, theta=135 deg', () => {
  near(T[1].centre[0], 0.6);
  near(T[1].centre[1], 0.2);
  near(T[1].scale, Math.SQRT1_2);
  near(T[1].angle, (3 * Math.PI) / 4);
});

check('T(c) R(theta) S(s) T(-c) reproduces the matrices in the brief exactly', () => {
  DRAGON.forEach((spec, i) => {
    const got = toAffine(empathic(T[i]));
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        near(got[r][c], spec[r][c]);
      }
    }
  });
});

check('each centre is a fixed point of its own map', () => {
  T.forEach((t) => {
    const [x, y] = mulPoint(empathic(t), t.centre[0], t.centre[1]);
    near(x, t.centre[0]);
    near(y, t.centre[1]);
  });
});

check('moving a centre keeps the linear part and gives translation = c - L c', () => {
  const moved = { ...T[1], centre: [0.9, -0.3] };
  const m = empathic(moved);
  const base = empathic(T[1]);
  [0, 1, 3, 4].forEach((k) => near(m[k], base[k]));
  const [lx, ly] = [m[0] * 0.9 + m[3] * -0.3, m[1] * 0.9 + m[4] * -0.3];
  near(m[6], 0.9 - lx);
  near(m[7], -0.3 - ly);
});

check('fromAffine rejects a shear and a pure translation', () => {
  assert.throws(() => fromAffine([[1, 0.5, 0], [0, 1, 0]]));
  assert.throws(() => fromAffine([[1, 0, 2], [0, 1, 0]]));
});

console.log('Chaos game');

const N = 200000;
const choices = makeChoices(N, 2, 1);

check('makeChoices is deterministic and roughly balanced', () => {
  const again = makeChoices(N, 2, 1);
  assert.deepEqual(choices.subarray(0, 1000), again.subarray(0, 1000));
  let ones = 0;
  for (let i = 0; i < N; i++) ones += choices[i];
  assert.ok(Math.abs(ones / N - 0.5) < 0.01, `fraction of 1s = ${ones / N}`);
});

const mats = T.map(empathic);
const pos = new Float32Array(N * 2);
chaosGame(mats, choices, N, T[0].centre, pos);

check('matrix chaos game == the same game in complex arithmetic', () => {
  // f0(z) = (1+i)/2 z ;  f1(z) = 1 - (1-i)/2 z   (Heighway dragon)
  let zr = 0;
  let zi = 0;
  let worst = 0;
  for (let i = 0; i < 5000; i++) {
    if (choices[i] === 0) {
      [zr, zi] = [0.5 * zr - 0.5 * zi, 0.5 * zr + 0.5 * zi];
    } else {
      [zr, zi] = [1 - (0.5 * zr + 0.5 * zi), -0.5 * zi + 0.5 * zr];
    }
    worst = Math.max(worst, Math.hypot(zr - pos[2 * i], zi - pos[2 * i + 1]));
  }
  console.log(`      worst difference over 5000 points: ${worst.toExponential(2)} (float32 storage)`);
  assert.ok(worst < 1e-6);
});

check('dragon bounding box is x in [-1/3, 7/6], y in [-1/3, 2/3]', () => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < N; i++) {
    x0 = Math.min(x0, pos[2 * i]); x1 = Math.max(x1, pos[2 * i]);
    y0 = Math.min(y0, pos[2 * i + 1]); y1 = Math.max(y1, pos[2 * i + 1]);
  }
  console.log(`      measured x [${x0.toFixed(3)}, ${x1.toFixed(3)}]  y [${y0.toFixed(3)}, ${y1.toFixed(3)}]`);
  assert.ok(Math.abs(x0 + 1 / 3) < 0.01 && Math.abs(x1 - 7 / 6) < 0.01);
  assert.ok(Math.abs(y0 + 1 / 3) < 0.01 && Math.abs(y1 - 2 / 3) < 0.01);
});

check('the fast loop in chaosGame agrees with step-by-step mulPoint (full 3x3 product)', () => {
  let bad = 0;
  let x = T[0].centre[0];
  let y = T[0].centre[1];
  for (let i = 0; i < 2000; i++) {
    [x, y] = mulPoint(mats[choices[i]], x, y);
    if (Math.hypot(x - pos[2 * i], y - pos[2 * i + 1]) > 1e-5) bad++;
  }
  assert.equal(bad, 0);
});

check('moving a centre MORPHS the picture: same choices, small move, small change', () => {
  const delta = 0.01;
  const moved = [T[0], { ...T[1], centre: [T[1].centre[0] + delta, T[1].centre[1]] }].map(empathic);
  const pos2 = new Float32Array(N * 2);
  chaosGame(moved, choices, N, T[0].centre, pos2);
  let worst = 0;
  for (let i = 0; i < N; i++) {
    worst = Math.max(worst, Math.hypot(pos[2 * i] - pos2[2 * i], pos[2 * i + 1] - pos2[2 * i + 1]));
  }
  console.log(`      centre moved ${delta}; no point moved more than ${worst.toFixed(4)} (ratio ${(worst / delta).toFixed(2)})`);
  assert.ok(worst < 10 * delta);
});

console.log('View');

check('viewMatrix sends the window centre to (0,0) and the edges to +-1', () => {
  const view = { cx: 0.5, cy: 0.15, half: 1.25 };
  const m = viewMatrix(view, 1);
  const apply = (x, y) => [m[0] * x + m[3] * y + m[6], m[1] * x + m[4] * y + m[7]];
  const c = apply(0.5, 0.15);
  near(c[0], 0, 1e-6); near(c[1], 0, 1e-6);
  const e = apply(0.5 + 1.25, 0.15 + 1.25);
  near(e[0], 1, 1e-6); near(e[1], 1, 1e-6);
});

check('worldAt is the inverse of viewMatrix, also on a wide canvas', () => {
  const view = { cx: 0.5, cy: 0.15, half: 1.25 };
  for (const aspect of [1, 2, 0.5]) {
    const m = viewMatrix(view, aspect);
    const [wx, wy] = worldAt(view, aspect, 0.3, 0.8);
    const cx = m[0] * wx + m[3] * wy + m[6];
    const cy = m[1] * wx + m[4] * wy + m[7];
    near(cx, 2 * 0.3 - 1, 1e-6);
    near(cy, 2 * 0.8 - 1, 1e-6);
  }
});

console.log('ChaosGame renderer against a recording mock of WebGL2');

function makeGL() {
  const calls = [];
  const canvas = { width: 0, height: 0 };
  const target = { canvas };
  const gl = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (typeof prop === 'symbol') return undefined;
      if (/^[A-Z0-9_]+$/.test(prop)) return prop;
      if (prop === 'getUniformLocation') return (p, name) => ({ uniform: name });
      if (/^create/.test(prop)) return () => ({ made: prop });
      return (...args) => { calls.push({ name: prop, args }); };
    },
  });
  return { gl, calls, canvas };
}

const withName = (calls, name) => calls.filter((c) => c.name === name);

check('first render draws the attractor and both centre passes; nothing changed -> no redraw', () => {
  const { gl, calls } = makeGL();
  const game = new ChaosGame(gl, { program: true });
  game.setTransforms(T);
  game.setCount(50000);
  game.resize(800, 800, 2);

  assert.equal(game.render(), true);
  const draws = withName(calls, 'drawArrays');
  assert.deepEqual(draws.map((d) => [d.args[0], d.args[2]]), [['POINTS', 50000], ['POINTS', 2], ['POINTS', 2]]);

  const sub = withName(calls, 'bufferSubData').find((c) => c.args[2] instanceof Float32Array && c.args[2].length === 100000);
  assert.ok(sub, 'positions uploaded as exactly count*2 floats');

  calls.length = 0;
  assert.equal(game.render(), false);
  assert.equal(calls.length, 0);
});

check('setCentre regenerates the points; setPointSize alone only redraws', () => {
  const { gl, calls } = makeGL();
  const game = new ChaosGame(gl, {});
  game.setTransforms(T);
  game.setCount(10000);
  game.resize(400, 400, 1);
  game.render();

  calls.length = 0;
  game.setCentre(1, 0.7, 0.1);
  assert.equal(game.render(), true);
  const uploaded = withName(calls, 'bufferSubData').filter((c) => c.args[2].length === 20000 && c.args[2] instanceof Float32Array);
  assert.equal(uploaded.length, 1, 'positions re-uploaded once');

  calls.length = 0;
  game.setPointSize(3);
  assert.equal(game.render(), true);
  assert.equal(withName(calls, 'bufferSubData').filter((c) => c.args[2].length === 20000).length, 0, 'no regeneration');
});

check('the choice sequence (colour attribute) is uploaded once, and again only on reroll', () => {
  const { gl, calls } = makeGL();
  const game = new ChaosGame(gl, {});
  game.setTransforms(T);
  game.resize(400, 400, 1);
  const isChoiceUpload = (c) => c.name === 'bufferSubData' && c.args[2] instanceof Uint8Array && c.args[2].length === MAX_POINTS;
  game.render();
  game.setCentre(0, 0.1, 0.1);
  game.render();
  assert.equal(calls.filter(isChoiceUpload).length, 1);
  game.reroll(99);
  game.render();
  assert.equal(calls.filter(isChoiceUpload).length, 2);
});

check('uView and point size are sent in device pixels; Show centres off drops the handle passes', () => {
  const { gl, calls } = makeGL();
  const game = new ChaosGame(gl, {});
  game.setTransforms(T);
  game.setPointSize(2);
  game.setShowCentres(false);
  game.resize(1280, 1280, 2);
  game.render();
  const view = withName(calls, 'uniformMatrix3fv')[0].args[2];
  assert.ok(view instanceof Float32Array && view.length === 9);
  near(view[0], 1 / 1.25, 1e-6);
  near(view[6], -0.5 / 1.25, 1e-6);
  assert.equal(withName(calls, 'drawArrays').length, 1);
  const sizes = withName(calls, 'uniform1f').map((c) => c.args[1]);
  assert.deepEqual(sizes, [4]);
});

check('worldAt on the renderer covers the window the sliders are scaled to', () => {
  const { gl } = makeGL();
  const game = new ChaosGame(gl, {});
  game.setTransforms(T);
  game.resize(640, 640, 1);
  const [x0, y0] = game.worldAt(0, 0);
  const [x1, y1] = game.worldAt(1, 1);
  near(x0, -0.75); near(x1, 1.75); near(y0, -1.1); near(y1, 1.4);
});

check('exactly two transformations are enforced', () => {
  const { gl } = makeGL();
  const game = new ChaosGame(gl, {});
  assert.throws(() => game.setTransforms([T[0]]));
});

console.log('Shaders');

check('shader sources start with #version 300 es and use the attribute locations the renderer binds', () => {
  const vert = readFileSync(new URL('../shaders/chaos.vert', import.meta.url), 'utf8');
  const frag = readFileSync(new URL('../shaders/chaos.frag', import.meta.url), 'utf8');
  assert.ok(vert.startsWith('#version 300 es'));
  assert.ok(frag.startsWith('#version 300 es'));
  assert.match(vert, /layout\(location = 0\) in vec2 aPosition/);
  assert.match(vert, /layout\(location = 1\) in float aMap/);
  for (const u of ['uView', 'uPointSize', 'uColor0', 'uColor1']) assert.match(vert, new RegExp(`uniform \\w+ ${u}`));
  assert.match(frag, /uniform bool uRound/);
});

console.log(`\n${passed} checks passed`);
