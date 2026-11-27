// three-view.mjs -- the same figure shown in a three.js scene.
//
// Two ways to pose it, switchable at run time:
//   "diy"    : every joint's local matrix is the matrix computed by the
//              textbook's initNodes()/MV.js, uploaded with Matrix4.fromArray().
//              three.js only renders; the book's maths does the posing.
//   "native" : every joint's local matrix is built by three.js's own Matrix4
//              from the declarative JOINT_SPEC.
// If the book's maths and three.js agree (they should!), both look identical.
// parityError() returns the largest matrix-element difference between them.

import {
  Scene, PerspectiveCamera, WebGLRenderer, Group, Mesh, BoxGeometry, EdgesGeometry,
  LineSegments, LineBasicMaterial, MeshStandardMaterial, AmbientLight, DirectionalLight,
  GridHelper, Matrix4,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { flatten } from "./lib/mv.mjs";
import {
  PARTS, JOINT_SPEC, figure, theta, numNodes, figureParents,
} from "./figure-model.mjs";
import { nativeLocalMatrix, nativeWorldMatrices } from "./native-transforms.mjs";

export function createThreeView(canvas, size = 512) {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(size, size, false); // CSS sets the displayed size
  renderer.setClearColor(0xffffff, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 200);
  camera.position.set(16, 8, 26);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1, 0);
  controls.enableDamping = true;
  controls.update();

  scene.add(new AmbientLight(0xffffff, 0.8));
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(8, 14, 10);
  scene.add(sun);

  const grid = new GridHelper(30, 30, 0x999999, 0xdddddd);
  grid.position.y = -4.7; // feet of the textbook pose
  scene.add(grid);

  // One Group per tree node (the joint frame) holding one Mesh (the box).
  // Hierarchy comes straight from the DIY tree's child/sibling pointers.
  const parent = figureParents();
  const groups = [];
  const edgeMaterial = new LineBasicMaterial({ color: 0x1a1a1a });

  for (let id = 0; id < numNodes; id++) {
    const group = new Group();
    group.matrixAutoUpdate = false; // we set .matrix ourselves, from either source
    const part = PARTS[JOINT_SPEC[id].part];
    const [w, h, d] = part.size;

    const geometry = new BoxGeometry(w, h, d);
    const mesh = new Mesh(
      geometry,
      new MeshStandardMaterial({ color: part.color, roughness: 0.55, metalness: 0.05 }),
    );
    mesh.position.set(0, 0.5 * h, 0); // box bottom sits on the joint, like the book's translate(0, h/2, 0)
    mesh.add(new LineSegments(new EdgesGeometry(geometry), edgeMaterial));
    group.add(mesh);
    groups[id] = group;
  }
  for (let id = 0; id < numNodes; id++) {
    (parent[id] == null ? scene : groups[parent[id]]).add(groups[id]);
  }

  const view = {
    mode: "diy", // "diy" | "native"
    scene,
    camera,
    renderer,
    controls,

    /** Re-pose from the current model state. */
    update() {
      for (let id = 0; id < numNodes; id++) {
        if (view.mode === "diy") groups[id].matrix.fromArray(flatten(figure[id].transform));
        else nativeLocalMatrix(id, theta, groups[id].matrix);
      }
      scene.updateMatrixWorld(true);
    },

    /** Largest |difference| between the book's world matrices and three.js's. */
    parityError() {
      const native = nativeWorldMatrices(theta, parent);
      const diy = new Matrix4();
      const world = [];
      let worst = 0;
      for (let id = 0; id < numNodes; id++) {
        diy.fromArray(flatten(figure[id].transform));
        world[id] = parent[id] == null ? diy.clone() : new Matrix4().multiplyMatrices(world[parent[id]], diy);
        for (let k = 0; k < 16; k++) worst = Math.max(worst, Math.abs(world[id].elements[k] - native[id].elements[k]));
      }
      return worst;
    },

    resize(width, height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },

    render() {
      controls.update();
      view.update();
      renderer.render(scene, camera);
    },

    dispose() {
      controls.dispose();
      renderer.dispose();
    },
  };
  return view;
}
