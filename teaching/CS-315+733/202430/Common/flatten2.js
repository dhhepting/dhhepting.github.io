/* eslint-disable require-jsdoc */

function flatten2(v) {
  if (!Array.isArray(v)) {
    return v;
  }
  if (typeof(v[0]) == 'number') {
    const floats = new Float32Array( v.length );
    for (let i = 0; i < v.length; i++) {
      floats[i] = v[i];
    }
    return floats;
  }
  const floats = new Float32Array(v.length * v[0].length);
  for (let i = 0; i < v.length; i++) {
    for (let j = 0; j < v[0].length; j++) {
      floats[i * v[0].length + j] = v[i][j];
    }
  }
  return floats;
}
