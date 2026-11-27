// mv.mjs -- the subset of the textbook's MV.js that the figure example uses,
// as a real ES module (no globals).
//
// Conventions are identical to Angel's MV.js:
//   * a mat4 is an array of 4 rows (row-major) tagged with .matrix = true
//   * rotate() takes degrees
//   * flatten() transposes a tagged matrix, so the Float32Array it returns is
//     column-major, which is what both gl.uniformMatrix4fv(.., false, ..) and
//     three.js Matrix4.fromArray() expect.
//
// If your tree already has Common/MV.mjs, delete this file and change the one
// import line in figure-model.mjs / diy-renderer.mjs / three-view.mjs.

export function vec3(x = 0, y = 0, z = 0) {
  return [x, y, z];
}

export function vec4(x = 0, y = 0, z = 0, w = 1) {
  return [x, y, z, w];
}

export function mat4() {
  const m = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  m.matrix = true;
  return m;
}

export function mult(u, v) {
  const result = [];
  for (let i = 0; i < 4; ++i) {
    result.push([0, 0, 0, 0]);
    for (let j = 0; j < 4; ++j) {
      let sum = 0;
      for (let k = 0; k < 4; ++k) sum += u[i][k] * v[k][j];
      result[i][j] = sum;
    }
  }
  result.matrix = true;
  return result;
}

export function translate(x, y, z) {
  const result = mat4();
  result[0][3] = x;
  result[1][3] = y;
  result[2][3] = z;
  return result;
}

export function scale(x, y, z) {
  const result = mat4();
  result[0][0] = x;
  result[1][1] = y;
  result[2][2] = z;
  return result;
}

// Axis-angle rotation, angle in degrees, axis is a vec3.
export function rotate(angle, axis) {
  const [ax, ay, az] = axis;
  const len = Math.hypot(ax, ay, az);
  const x = ax / len, y = ay / len, z = az / len;
  const c = Math.cos((angle * Math.PI) / 180);
  const s = Math.sin((angle * Math.PI) / 180);
  const omc = 1 - c;

  const result = mat4();
  result[0][0] = x * x * omc + c;
  result[0][1] = x * y * omc - z * s;
  result[0][2] = x * z * omc + y * s;
  result[1][0] = x * y * omc + z * s;
  result[1][1] = y * y * omc + c;
  result[1][2] = y * z * omc - x * s;
  result[2][0] = x * z * omc - y * s;
  result[2][1] = y * z * omc + x * s;
  result[2][2] = z * z * omc + c;
  return result;
}

export function ortho(left, right, bottom, top, near, far) {
  const w = right - left, h = top - bottom, d = far - near;
  const result = mat4();
  result[0][0] = 2 / w;
  result[1][1] = 2 / h;
  result[2][2] = -2 / d;
  result[0][3] = -(left + right) / w;
  result[1][3] = -(top + bottom) / h;
  result[2][3] = -(near + far) / d;
  return result;
}

// Flatten vectors / matrices (or arrays of them) into a Float32Array.
export function flatten(v) {
  if (v.matrix === true) {
    // transpose: row-major rows -> column-major for GL / three.js
    const t = [];
    for (let col = 0; col < v.length; ++col)
      for (let row = 0; row < v.length; ++row) t.push(v[row][col]);
    return new Float32Array(t);
  }
  const out = [];
  for (const item of v) {
    if (Array.isArray(item)) out.push(...item);
    else out.push(item);
  }
  return new Float32Array(out);
}
