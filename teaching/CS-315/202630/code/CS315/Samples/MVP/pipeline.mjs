// Composes M, V and P from the interface state, using the student's functions.
// DOM-free. This is where "model-view-projection" is spelled out.
import { mult, mat4, vec3 } from '../../Common/MV.mjs';
import { inverse4, isMatrix4 } from './matrixUtil.mjs';

export function createPipeline(student) {
  const lastGood = { M: mat4(), V: mat4(), P: mat4() };

  // If a student function returns something that is not a finite 4x4 matrix
  // (not written yet, or lookAt with up parallel to the view direction),
  // keep the last good one and say so, instead of breaking every canvas.
  function checked(name, source, warnings, compute) {
    let m;
    try {
      m = compute();
    } catch (error) {
      warnings.push(`${source} threw: ${error}; showing the last good ${name}.`);
      return lastGood[name];
    }
    if (isMatrix4(m)) {
      lastGood[name] = m;
    } else {
      warnings.push(`${source} did not return a finite 4x4 matrix; showing the last good ${name}.`);
    }
    return lastGood[name];
  }

  return function compose(state, aspect) {
    const warnings = [];
    const { camera, projection } = state;

    const M = checked('M', 'buildModelMatrix', warnings, () => student.buildModelMatrix(state.model));
    const V = camera.mode === 'lookAt'
      ? checked('V', 'buildViewLookAt', warnings, () => student.buildViewLookAt(vec3(...camera.lookAt.eye), vec3(...camera.lookAt.at), vec3(...camera.lookAt.up)))
      : checked('V', 'buildViewEuler', warnings, () => {
          const e = camera.euler;
          return student.buildViewEuler(vec3(...e.position), e.pitch, e.yaw, e.roll);
        });
    const P = projection.type === 'perspective'
      ? checked('P', 'buildPerspective', warnings, () => student.buildPerspective(projection.fovy, aspect, projection.near, projection.far))
      : checked('P', 'buildParallel', warnings, () => student.buildParallel(projection.size, aspect, projection.near, projection.far));

    // The composition the whole page is about. Read right to left:
    // model space -M-> world space -V-> eye space -P-> clip space.
    const VM = mult(V, M);
    const PV = mult(P, V);
    const PVM = mult(P, VM);

    // Inverses draw the camera's view volume back in earlier spaces.
    return { M, V, P, VM, PV, PVM, invP: inverse4(P), invPV: inverse4(PV), invPVM: inverse4(PVM), warnings };
  };
}
