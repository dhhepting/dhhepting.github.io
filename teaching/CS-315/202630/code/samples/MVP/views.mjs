// What each canvas shows. DOM-free.
//
// Every canvas draws the same scene, but with a different matrix applied, so you
// can watch the vertices travel: model space -> world -> eye -> clip/NDC -> image.
// The amber box is the camera's view volume (the NDC cube, carried back into
// each space with an inverse), so you can see what the camera can see.
import { mult, mat4, vec3, lookAt, perspective } from '../../Common/MV.mjs';

export const VIEWS = [
  {
    id: 'final',
    partStage: m => m.PVM, axesStage: m => m.PV, frustumStage: null, divide: false, orbit: null,
  },
  {
    id: 'model',
    partStage: () => mat4(), axesStage: () => mat4(), frustumStage: m => m.invPVM, divide: true,
    orbit: { azimuth: 35, elevation: 25, distance: 7, target: [0, 0, 0] },
  },
  {
    id: 'world',
    partStage: m => m.M, axesStage: () => mat4(), frustumStage: m => m.invPV, divide: true,
    orbit: { azimuth: 35, elevation: 25, distance: 30, target: [0, 0, 0] },
  },
  {
    id: 'eye',
    partStage: m => m.VM, axesStage: m => m.V, frustumStage: m => m.invP, divide: true,
    orbit: { azimuth: 35, elevation: 25, distance: 30, target: [0, 0, -8] },
  },
  {
    id: 'ndc',
    partStage: m => m.PVM, axesStage: m => m.PV, frustumStage: () => mat4(), divide: true,
    orbit: { azimuth: 35, elevation: 25, distance: 6, target: [0, 0, 0] },
  },
];

// A fixed perspective camera, orbiting `target`, for looking at a space from outside.
export function observerMatrix(o, aspect) {
  const az = (o.azimuth * Math.PI) / 180;
  const el = (o.elevation * Math.PI) / 180;
  const eye = [
    o.target[0] + o.distance * Math.cos(el) * Math.sin(az),
    o.target[1] + o.distance * Math.sin(el),
    o.target[2] + o.distance * Math.cos(el) * Math.cos(az),
  ];
  return mult(perspective(40, aspect, 0.1, 500), lookAt(vec3(...eye), vec3(...o.target), vec3(0, 1, 0)));
}

// Everything the renderer needs for one canvas, for this frame.
export function buildScene(view, mats, parts, shared, aspect, orbit) {
  const stage = view.partStage(mats);
  const draws = parts.map(part => ({ mesh: part.mesh, matrix: mult(stage, part.matrix) }));
  draws.push({ mesh: shared.axes, matrix: view.axesStage(mats) });
  if (view.frustumStage) {
    const f = view.frustumStage(mats);
    if (f) draws.push({ mesh: shared.frustum, matrix: f });
  }
  return { observer: orbit ? observerMatrix(orbit, aspect) : mat4(), divide: view.divide, draws };
}
