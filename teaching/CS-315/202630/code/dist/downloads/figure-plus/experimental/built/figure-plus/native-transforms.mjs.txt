// native-transforms.mjs -- the figure's joint matrices computed with three.js's
// own Matrix4 (no MV.js involved), from the declarative JOINT_SPEC.
// Kept free of any renderer so it can run in Node for tests/parity.mjs.

import { Matrix4 } from "three";
import { JOINT_SPEC, numNodes } from "./figure-model.mjs";

const DEG = Math.PI / 180;
const _rot = new Matrix4();

/** out = T(pre) * R(...) * ... * T(post) for one node, using three.js maths. */
export function nativeLocalMatrix(id, theta, out = new Matrix4()) {
  const { pre, rot, post } = JOINT_SPEC[id];
  out.makeTranslation(pre[0], pre[1], pre[2]);
  for (const [axis, thetaId] of rot) {
    const a = theta[thetaId] * DEG;
    if (axis === "x") _rot.makeRotationX(a);
    else if (axis === "y") _rot.makeRotationY(a);
    else _rot.makeRotationZ(a);
    out.multiply(_rot);
  }
  _rot.makeTranslation(post[0], post[1], post[2]);
  out.multiply(_rot);
  return out;
}

/** World matrix of every node, given parent[] from figureParents(). */
export function nativeWorldMatrices(theta, parent) {
  const world = [];
  // parents always have a smaller or equal id except the head chain; resolve recursively
  const resolve = (id) => {
    if (world[id]) return world[id];
    const m = nativeLocalMatrix(id, theta);
    world[id] = parent[id] == null ? m : new Matrix4().multiplyMatrices(resolve(parent[id]), m);
    return world[id];
  };
  for (let i = 0; i < numNodes; i++) resolve(i);
  return world;
}
