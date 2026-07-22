/* eslint-disable require-jsdoc */
'use strict';

let gl;
const positions = [];
const numPositions = 500000;

window.onload = function init() {
  const canvas = document.getElementById('gl-canvas');
  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }

  //
  // Initialize data for the Sierpiński Gasket (Tetrahedron)
  //
  generate_positions();

  //
  //  Configure WebGL
  //
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.5, 0.5, 0.5, 1.0);
  gl.enable(gl.DEPTH_TEST);

  //  Load shaders and initialize attribute buffers
  const program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram(program);

  // Load the data into the GPU
  const bufferId = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

  // Associate shader variable (aPosition) with data buffer
  const positionLoc = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  render();
};

function generate_positions() {
  // Set vertices of tetrahedron
  const vertices = [
    vec3(0.0000, 0.0000, -1.0000),
    vec3(0.0000, 0.9428, 0.3333),
    vec3(-0.8165, -0.4714, 0.3333),
    vec3(0.8165, -0.4714, 0.3333)];
  // set initial position to vertex 0
  positions.push(vertices[0]);
  for (let i = 0; positions.length < numPositions; ++i) {
    const j = Math.floor(4 * Math.random());
    positions.push(mix(positions[i], vertices[j], 0.5));
  }
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
  gl.drawArrays(gl.POINTS, 0, positions.length);
}
