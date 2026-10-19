// All interface state lives in one plain object. DOM-free.

export function createState() {
  return {
    animate: false,
    model: { translate: [0, 0, 0], rotate: [0, 30, 0], scale: [1, 1, 1] },
    camera: {
      mode: 'lookAt',                                        // 'lookAt' | 'euler'
      lookAt: { eye: [4, 3, 6], at: [0, 0, 0], up: [0, 1, 0] },
      euler: { position: [0, 0, 8], pitch: 0, yaw: 0, roll: 0 },   // degrees
    },
    projection: { type: 'perspective', fovy: 45, size: 3, near: 1, far: 20 },
  };
}

const ORBIT_DEGREES_PER_SECOND = 25;
const toRadians = d => (d * Math.PI) / 180;
const toDegrees = r => (r * 180) / Math.PI;
const wrap180 = d => ((((d + 180) % 360) + 360) % 360) - 180;

// The animation: the camera circles the vertical axis. In lookAt mode that moves
// `eye` around `at`; in pitch/yaw/roll mode it moves `position` around the origin
// and turns `yaw` with it, so the camera keeps facing the middle of the scene.
export function stepAnimation(state, seconds) {
  const turn = toRadians(ORBIT_DEGREES_PER_SECOND * seconds);
  if (state.camera.mode === 'lookAt') {
    const { eye, at } = state.camera.lookAt;
    const dx = eye[0] - at[0];
    const dz = eye[2] - at[2];
    const radius = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz) + turn;
    eye[0] = at[0] + radius * Math.sin(angle);
    eye[2] = at[2] + radius * Math.cos(angle);
  } else {
    const e = state.camera.euler;
    const radius = Math.hypot(e.position[0], e.position[2]);
    const angle = Math.atan2(e.position[0], e.position[2]) + turn;
    e.position[0] = radius * Math.sin(angle);
    e.position[2] = radius * Math.cos(angle);
    e.yaw = wrap180(toDegrees(angle));
  }
}
