/* eslint-disable require-jsdoc */
// based on https://www.interactivecomputergraphics.com/8E/Code/02/gasket1.js

'use strict';

// global declarations
let gl1;
let gl2;
const positions = [];

window.onload = function init() {
  //
  // get the canvas via DOM and attempt to get a webgl2 context
  //
  const canvas1 = document.getElementById('gl-canvas-1');
  gl1 = canvas1.getContext('webgl2');
  if (!gl1) {
    alert('WebGL 2.0 is not available');
  }
  const canvas2 = document.getElementById('gl-canvas-2');
  gl2 = canvas2.getContext('webgl2');
  if (!gl2) {
    alert('WebGL 2.0 is not available');
  }

  //
  // generate data for Sierpiński Gasket
  //

  // Specify number of points to generate
  const numPositions = 500000;
  // Initialize the vertices of the triangle: x: [-1,1]; y: [-1,1]
  const vertices = [
    vec2(-1, -0.87),
    vec2(0.0, 0.87),
    vec2(1, -0.87)];

  // Specify a starting position, p, as vertex 0
  let p = vertices[0];
  // Add the initial position to the array of positions
  positions.push(p);
  // Iterate to compute remaining positions (numPositions)
  for (let i = 0; positions.length < numPositions; ++i) {
    // choose a vertex at random: j will be one of [0, 1, 2]
    const j = Math.floor(3*Math.random());
    // add vertex j to the last position (i) then muliply by 0.5
    p = add(positions[i], vertices[j]);
    p = mult(0.5, p);
    // Add the new position to the array of positions
    positions.push(p);
  }

  //
  //  Configure WebGL
  //
  gl1.viewport(0, 0, canvas1.width, canvas1.height);
  gl1.clearColor(1.0, 1.0, 1.0, 1.0);
  gl2.viewport(0, 0, canvas2.width, canvas2.height);
  gl2.clearColor(0.5, 0.2, 0.7, 1.0);
  // Load shaders into program and use it
  const program = initShaders(gl1, 'vertex-shader', 'fragment-shader');
  gl1.useProgram(program);
  // Load the data into the GPU
  const bufferId = gl1.createBuffer();
  // See: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bindBuffer
  // gl1.ARRAY_BUFFER as a target means that the buffer contains vertex
  // attributes, such as vertex coordinates, texture coordinate data,
  // or vertex colour data.
  const target = gl1.ARRAY_BUFFER;
  gl1.bindBuffer(target, bufferId);
  // usage specifies the intended usage pattern of the data store
  // for optimization purposes. gl1.STATIC_DRAW indicates that the
  // contents are intended to be specified once by the application,
  // and used many times as the source for WebGL drawing and image
  // specification commands.
  const usage = gl1.STATIC_DRAW;
  const srcData = flatten(positions);
  const srcOffset = 0;
  gl1.bufferData(target, srcData, usage, srcOffset);
  // Associate shader variables with data buffer
  // See: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer
  const positionLoc = gl1.getAttribLocation(program, 'aPosition');
  // number of components per vertex attribute: 2 -> (x,y) coordinates 2D
  const numComponents = 2;
  // data type of components
  const componentType = gl1.FLOAT;
  // whether integer data values should be normalized into a certain
  // range when being cast to a float (has no effect for gl1.FLOAT)
  const toBeNormalized = false;
  // stride specifies the offset in bytes between the beginning of
  // consecutive vertex attributes. Cannot be negative or larger than 255.
  // If stride is 0, the attribute is taken to be tightly packed,
  // not interleaved with other attributes but in a separate block,
  // and the next attribute follows immediately after the current.
  const stride = 0;
  // specify an offset in bytes of the first component in the vertex
  // attribute array.
  const offset = 0;
  gl1.vertexAttribPointer(positionLoc,
      numComponents,
      componentType,
      toBeNormalized,
      stride,
      offset);
  gl1.enableVertexAttribArray(positionLoc);

  render();
};

function render() {
  gl1.clear(gl1.COLOR_BUFFER_BIT);
  gl2.clear(gl2.COLOR_BUFFER_BIT);
  gl1.drawArrays(gl1.POINTS, 0, positions.length);
}

