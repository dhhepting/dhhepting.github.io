// tests/parity.mjs -- does the textbook's DIY maths agree with three.js's?
//   node tests/parity.mjs
import assert from "node:assert/strict";
import { OrthographicCamera } from "three";

import { flatten, ortho, mat4 } from "../src/lib/mv.mjs";
import {
  theta, numAngles, numNodes, initAllNodes, traverseFigure, figureParents, figure,
  torsoId, headId, DEFAULT_THETA, POSES,
} from "../src/figure-model.mjs";
import { nativeWorldMatrices } from "../src/native-transforms.mjs";

const TOL = 1e-5; // flatten() returns Float32Array, so ~1e-7 relative is the floor

let worst = 0;
function compareWorld(label) {
  // DIY: the book's traverse() with its matrix stack, flattened column-major.
  const diyWorld = [];
  const order = [];
  traverseFigure((id, part, m) => { diyWorld[id] = flatten(m); order.push(id); });

  const native = nativeWorldMatrices(theta, figureParents());
  for (let id = 0; id < numNodes; id++) {
    assert.ok(diyWorld[id], `${label}: node ${id} never visited`);
    for (let k = 0; k < 16; k++) {
      const d = Math.abs(diyWorld[id][k] - native[id].elements[k]);
      worst = Math.max(worst, d);
      assert.ok(d < TOL, `${label}: node ${id} element ${k} differs by ${d}`);
    }
  }
  return order;
}

// 1. tree structure: every node visited exactly once, torso first, in book order
initAllNodes();
const order = compareWorld("default pose");
assert.deepEqual(order, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "traversal order");
assert.equal(new Set(order).size, numNodes);
console.log("traversal order      :", order.join(" "));

// 2. parents derived from child/sibling pointers
const parent = figureParents();
assert.deepEqual(parent, [null, 0, 0, 2, 0, 4, 0, 6, 0, 8]);
console.log("parents              :", JSON.stringify(parent));

// 3. every named pose
for (const [name, values] of Object.entries(POSES)) {
  for (let i = 0; i < numAngles; i++) theta[i] = values[i];
  initAllNodes();
  compareWorld(`pose "${name}"`);
}
console.log("named poses          :", Object.keys(POSES).length, "ok");

// 4. random poses (including non-multiples of 10 and head1/head2 together)
let seed = 12345;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const TRIALS = 2000;
for (let t = 0; t < TRIALS; t++) {
  for (let i = 0; i < numAngles; i++) theta[i] = rand() * 360 - 180;
  initAllNodes();
  compareWorld(`random pose #${t}`);
}
console.log(`random poses         : ${TRIALS} ok`);

// 5. MV.js ortho() == three.js orthographic projection (the book's camera)
const cam = new OrthographicCamera(-10, 10, 10, -10, -10, 10);
cam.updateProjectionMatrix();
const mine = flatten(ortho(-10, 10, -10, 10, -10, 10));
for (let k = 0; k < 16; k++) assert.ok(Math.abs(mine[k] - cam.projectionMatrix.elements[k]) < TOL, `ortho element ${k}`);
console.log("ortho() vs three     : ok");

// 6. a sample number worth eyeballing: left lower arm in the default pose
theta.splice(0, numAngles, ...DEFAULT_THETA);
initAllNodes();
traverseFigure((id, part, m) => { if (id === 3) console.log("leftLowerArm origin  :", [m[0][3], m[1][3], m[2][3]].map((v) => +v.toFixed(3)).join(", ")); });

console.log(`\nPASS  max |DIY - three.js| over all poses = ${worst.toExponential(2)} (tolerance ${TOL})`);
