// figure-model.mjs -- the textbook's hierarchical figure, with no WebGL and no DOM.
//
// This is the "DIY framework" from the book: every body part is a node holding
//   transform : the matrix that places the part relative to its parent
//   render    : which part to draw (a key here; the book stores a function)
//   sibling   : next node drawn in the SAME parent frame
//   child     : first node drawn in THIS node's frame
// (a "left-child, right-sibling" tree), walked with an explicit matrix stack.
//
// Nothing here knows about GL, so the same tree can feed the DIY WebGL2
// renderer *and* a three.js scene (see three-view.mjs).

import { vec3, mat4, mult, rotate, translate } from "./lib/mv.mjs";

// ---------------------------------------------------------------- node ids
export const torsoId = 0;
export const headId = 1;
export const head1Id = 1;
export const head2Id = 10;
export const leftUpperArmId = 2;
export const leftLowerArmId = 3;
export const rightUpperArmId = 4;
export const rightLowerArmId = 5;
export const leftUpperLegId = 6;
export const leftLowerLegId = 7;
export const rightUpperLegId = 8;
export const rightLowerLegId = 9;

// -------------------------------------------------------------- dimensions
export const torsoHeight = 5.0;
export const torsoWidth = 1.0;
export const upperArmHeight = 3.0;
export const lowerArmHeight = 2.0;
export const upperArmWidth = 0.5;
export const lowerArmWidth = 0.5;
export const upperLegWidth = 0.5;
export const lowerLegWidth = 0.5;
export const lowerLegHeight = 2.0;
export const upperLegHeight = 3.0;
export const headHeight = 1.5;
export const headWidth = 1.0;

export const numNodes = 10;
export const numAngles = 11;

// Joint angles in degrees. Index = joint id above. The legs start at 180 so
// that the (upward-growing) leg boxes hang downward -- exactly as in the book.
export const DEFAULT_THETA = [0, 0, 0, 0, 0, 0, 180, 0, 180, 0, 0];
export const theta = [...DEFAULT_THETA];

// What to draw for each node: box size (x, y, z) and a display colour.
// Every part is a unit cube centred on the origin, scaled to this size and
// lifted by half its height so its *bottom* sits on the joint.
export const PARTS = {
  torso: { size: [torsoWidth, torsoHeight, torsoWidth], color: 0xc0392b },
  head: { size: [headWidth, headHeight, headWidth], color: 0xf1c40f },
  leftUpperArm: { size: [upperArmWidth, upperArmHeight, upperArmWidth], color: 0x2980b9 },
  leftLowerArm: { size: [lowerArmWidth, lowerArmHeight, lowerArmWidth], color: 0x5dade2 },
  rightUpperArm: { size: [upperArmWidth, upperArmHeight, upperArmWidth], color: 0x27ae60 },
  rightLowerArm: { size: [lowerArmWidth, lowerArmHeight, lowerArmWidth], color: 0x58d68d },
  leftUpperLeg: { size: [upperLegWidth, upperLegHeight, upperLegWidth], color: 0x8e44ad },
  leftLowerLeg: { size: [lowerLegWidth, lowerLegHeight, lowerLegWidth], color: 0xbb8fce },
  rightUpperLeg: { size: [upperLegWidth, upperLegHeight, upperLegWidth], color: 0xd35400 },
  rightLowerLeg: { size: [lowerLegWidth, lowerLegHeight, lowerLegWidth], color: 0xeb984e },
};

// Slider definitions, in the book's on-screen order. `id` indexes theta[].
export const JOINT_CONTROLS = [
  { id: torsoId, label: "torso" },
  { id: head2Id, label: "head2" },
  { id: head1Id, label: "head1" },
  { id: leftUpperArmId, label: "left upper arm" },
  { id: leftLowerArmId, label: "left lower arm" },
  { id: rightUpperArmId, label: "right upper arm" },
  { id: rightLowerArmId, label: "right lower arm" },
  { id: leftUpperLegId, label: "left upper leg" },
  { id: leftLowerLegId, label: "left lower leg" },
  { id: rightUpperLegId, label: "right upper leg" },
  { id: rightLowerLegId, label: "right lower leg" },
];

// --------------------------------------------------------------- the tree
export function createNode(transform, render, sibling, child) {
  return { transform, render, sibling, child };
}

export const figure = [];
for (let i = 0; i < numNodes; i++) figure[i] = createNode(null, null, null, null);

// (Re)build one node's transform from theta[]. Call again whenever a joint
// angle changes. Head has two angles (head1 about x, head2 about y), so any of
// the three head ids rebuilds the head node.
export function initNodes(Id) {
  let m = mat4();

  switch (Id) {
    case torsoId:
      m = rotate(theta[torsoId], vec3(0, 1, 0));
      figure[torsoId] = createNode(m, "torso", null, headId);
      break;

    case headId:
    case head1Id:
    case head2Id:
      m = translate(0.0, torsoHeight + 0.5 * headHeight, 0.0);
      m = mult(m, rotate(theta[head1Id], vec3(1, 0, 0)));
      m = mult(m, rotate(theta[head2Id], vec3(0, 1, 0)));
      m = mult(m, translate(0.0, -0.5 * headHeight, 0.0));
      figure[headId] = createNode(m, "head", leftUpperArmId, null);
      break;

    case leftUpperArmId:
      m = translate(-(torsoWidth + upperArmWidth), 0.9 * torsoHeight, 0.0);
      m = mult(m, rotate(theta[leftUpperArmId], vec3(1, 0, 0)));
      figure[leftUpperArmId] = createNode(m, "leftUpperArm", rightUpperArmId, leftLowerArmId);
      break;

    case rightUpperArmId:
      m = translate(torsoWidth + upperArmWidth, 0.9 * torsoHeight, 0.0);
      m = mult(m, rotate(theta[rightUpperArmId], vec3(1, 0, 0)));
      figure[rightUpperArmId] = createNode(m, "rightUpperArm", leftUpperLegId, rightLowerArmId);
      break;

    case leftUpperLegId:
      m = translate(-(torsoWidth + upperLegWidth), 0.1 * upperLegHeight, 0.0);
      m = mult(m, rotate(theta[leftUpperLegId], vec3(1, 0, 0)));
      figure[leftUpperLegId] = createNode(m, "leftUpperLeg", rightUpperLegId, leftLowerLegId);
      break;

    case rightUpperLegId:
      m = translate(torsoWidth + upperLegWidth, 0.1 * upperLegHeight, 0.0);
      m = mult(m, rotate(theta[rightUpperLegId], vec3(1, 0, 0)));
      figure[rightUpperLegId] = createNode(m, "rightUpperLeg", null, rightLowerLegId);
      break;

    case leftLowerArmId:
      m = translate(0.0, upperArmHeight, 0.0);
      m = mult(m, rotate(theta[leftLowerArmId], vec3(1, 0, 0)));
      figure[leftLowerArmId] = createNode(m, "leftLowerArm", null, null);
      break;

    case rightLowerArmId:
      m = translate(0.0, upperArmHeight, 0.0);
      m = mult(m, rotate(theta[rightLowerArmId], vec3(1, 0, 0)));
      figure[rightLowerArmId] = createNode(m, "rightLowerArm", null, null);
      break;

    case leftLowerLegId:
      m = translate(0.0, upperLegHeight, 0.0);
      m = mult(m, rotate(theta[leftLowerLegId], vec3(1, 0, 0)));
      figure[leftLowerLegId] = createNode(m, "leftLowerLeg", null, null);
      break;

    case rightLowerLegId:
      m = translate(0.0, upperLegHeight, 0.0);
      m = mult(m, rotate(theta[rightLowerLegId], vec3(1, 0, 0)));
      figure[rightLowerLegId] = createNode(m, "rightLowerLeg", null, null);
      break;
  }
}

export function initAllNodes() {
  for (let i = 0; i < numNodes; i++) initNodes(i);
}

// ---------------------------------------------------------- the traversal
// Depth-first, with the book's matrix stack: push before descending, pop after
// the subtree is done, and visit siblings in the *parent's* frame.
const stack = [];
let modelViewMatrix = mat4();

function traverse(Id, visit) {
  if (Id == null) return;
  stack.push(modelViewMatrix);
  modelViewMatrix = mult(modelViewMatrix, figure[Id].transform);
  visit(Id, figure[Id].render, modelViewMatrix); // <- where the book calls figure[Id].render()
  if (figure[Id].child != null) traverse(figure[Id].child, visit);
  modelViewMatrix = stack.pop();
  if (figure[Id].sibling != null) traverse(figure[Id].sibling, visit);
}

/**
 * Walk the whole figure starting from the identity matrix (or `root`, e.g. a
 * camera/model-view matrix).  visit(id, partName, nodeMatrix) is called once
 * per node with that node's accumulated model-view matrix.
 */
export function traverseFigure(visit, root = mat4()) {
  modelViewMatrix = root;
  stack.length = 0;
  traverse(torsoId, visit);
}

/** parent[id] for every node, derived from the child/sibling pointers. */
export function figureParents() {
  const parent = new Array(numNodes).fill(null);
  const walk = (Id, parentId) => {
    if (Id == null) return;
    parent[Id] = parentId;
    walk(figure[Id].child, Id);
    walk(figure[Id].sibling, parentId);
  };
  walk(torsoId, null);
  return parent;
}

// ------------------------------------------------- declarative description
// The same figure described as data: for each node, a translation, then a list
// of rotations (axis + which theta[] entry), then a translation. Local matrix =
// T(pre) * R1 * R2 * ... * T(post). three-view.mjs builds its "native three.js"
// transforms from this, and tests/parity.mjs proves it matches initNodes().
export const JOINT_SPEC = {
  [torsoId]: { part: "torso", pre: [0, 0, 0], rot: [["y", torsoId]], post: [0, 0, 0] },
  [headId]: {
    part: "head",
    pre: [0, torsoHeight + 0.5 * headHeight, 0],
    rot: [["x", head1Id], ["y", head2Id]],
    post: [0, -0.5 * headHeight, 0],
  },
  [leftUpperArmId]: {
    part: "leftUpperArm",
    pre: [-(torsoWidth + upperArmWidth), 0.9 * torsoHeight, 0],
    rot: [["x", leftUpperArmId]],
    post: [0, 0, 0],
  },
  [rightUpperArmId]: {
    part: "rightUpperArm",
    pre: [torsoWidth + upperArmWidth, 0.9 * torsoHeight, 0],
    rot: [["x", rightUpperArmId]],
    post: [0, 0, 0],
  },
  [leftUpperLegId]: {
    part: "leftUpperLeg",
    pre: [-(torsoWidth + upperLegWidth), 0.1 * upperLegHeight, 0],
    rot: [["x", leftUpperLegId]],
    post: [0, 0, 0],
  },
  [rightUpperLegId]: {
    part: "rightUpperLeg",
    pre: [torsoWidth + upperLegWidth, 0.1 * upperLegHeight, 0],
    rot: [["x", rightUpperLegId]],
    post: [0, 0, 0],
  },
  [leftLowerArmId]: { part: "leftLowerArm", pre: [0, upperArmHeight, 0], rot: [["x", leftLowerArmId]], post: [0, 0, 0] },
  [rightLowerArmId]: { part: "rightLowerArm", pre: [0, upperArmHeight, 0], rot: [["x", rightLowerArmId]], post: [0, 0, 0] },
  [leftLowerLegId]: { part: "leftLowerLeg", pre: [0, upperLegHeight, 0], rot: [["x", leftLowerLegId]], post: [0, 0, 0] },
  [rightLowerLegId]: { part: "rightLowerLeg", pre: [0, upperLegHeight, 0], rot: [["x", rightLowerLegId]], post: [0, 0, 0] },
};

// ------------------------------------------------------------------ poses
// Handy poses for demos. Each is a full theta[] array. All joints rotate about
// the x axis (except torso and head2, which turn about y), and the boxes grow
// along +y, so 0 deg = limb straight up, 90 deg = pointing at the viewer (+z),
// 180 deg = straight down.
export const POSES = {
  "textbook default": DEFAULT_THETA,
  "arms down": [0, 0, 180, 0, 180, 0, 180, 0, 180, 0, 0],
  "arms forward": [0, 0, 90, 0, 90, 0, 180, 0, 180, 0, 0],
  wave: [0, 0, 180, 0, 0, 45, 180, 0, 180, 0, 0],
  sit: [0, 0, 180, 0, 180, 0, 90, 90, 90, 90, 0],
};

export function setTheta(values) {
  for (let i = 0; i < numAngles; i++) theta[i] = values[i];
  initAllNodes();
}

initAllNodes();
