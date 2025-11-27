/* eslint-disable require-jsdoc */
'use strict';

// var canvas;
let gl;

// 6 faces
// * 2 triangles per face
// * 3 vertices per triangle = 36
const numPositions = 36;

const vertices = [
  vec4(-0.5, -0.5, 0.5, 1.0), // 0
  vec4(-0.5, 0.5, 0.5, 1.0), // 1
  vec4(0.5, 0.5, 0.5, 1.0), // 2
  vec4(0.5, -0.5, 0.5, 1.0), // 3
  vec4(-0.5, -0.5, -0.5, 1.0), // 4
  vec4(-0.5, 0.5, -0.5, 1.0), // 5
  vec4(0.5, 0.5, -0.5, 1.0), // 6
  vec4(0.5, -0.5, -0.5, 1.0)]; // 7

const vertexColors = [
  vec4(0.0, 0.0, 0.0, 1.0), // black
  vec4(1.0, 0.0, 0.0, 1.0), // red
  vec4(1.0, 1.0, 0.0, 1.0), // yellow
  vec4(0.0, 1.0, 0.0, 1.0), // green
  vec4(0.0, 0.0, 1.0, 1.0), // blue
  vec4(1.0, 0.0, 1.0, 1.0), // magenta
  vec4(0.0, 1.0, 1.0, 1.0), // cyan
  vec4(1.0, 1.0, 1.0, 1.0)]; // white

const positions = [];
const colors = [];

const xAxis = 0;
const yAxis = 1;
const zAxis = 2;

let axis = 0;
const colourByVertex = true;
const theta = [0, 0, 0];

let thetaLoc;

window.onload = function init() {
  const canvas = document.getElementById('gl-canvas');

  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }
  // fill positions and colors arrays for cube
  colorCube();

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  gl.enable(gl.DEPTH_TEST);

  //
  //  Load shaders and initialize attribute buffers
  //
  const program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram(program);

  const target = gl.ARRAY_BUFFER;
  const usage = gl.STATIC_DRAW;
  const vComponents = 4; // (x, y, z, w)
  const cComponents = 4; // (r, g, b, a)
  const componentType = gl.FLOAT;
  // const componentSize = 4; // for gl.FLOAT (32 bits)
  const toBeNormalized = false;
  const stride = 0;
  const offset = 0;

  const vBuffer = gl.createBuffer();
  gl.bindBuffer(target, vBuffer);
  gl.bufferData(target, flatten(positions), usage);
  const positionLoc = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(positionLoc, vComponents, componentType,
      toBeNormalized, stride, offset);
  gl.enableVertexAttribArray(positionLoc);

  const cBuffer = gl.createBuffer();
  gl.bindBuffer(target, cBuffer);
  gl.bufferData(target, flatten(colors), usage);

  const colorLoc = gl.getAttribLocation(program, 'aColor');
  gl.vertexAttribPointer(colorLoc, cComponents, componentType,
      toBeNormalized, stride, offset);
  gl.enableVertexAttribArray(colorLoc);

  thetaLoc = gl.getUniformLocation(program, 'uTheta');

  // event listeners for buttons

  document.getElementById('xButton').onclick = function() {
    axis = xAxis;
  };
  document.getElementById('yButton').onclick = function() {
    axis = yAxis;
  };
  document.getElementById('zButton').onclick = function() {
    axis = zAxis;
  };

  render();
};

function colorCube() {
  quad(1, 0, 3, 2);
  quad(2, 3, 7, 6);
  quad(3, 0, 4, 7);
  quad(6, 5, 1, 2);
  quad(4, 5, 6, 7);
  quad(5, 4, 0, 1);
}

// accept vertex indices to define a face of the cube
// create 2 triangles to represent the quadrilateral face
// add results to positions and colors
function quad(a, b, c, d) {
  const indices = [a, b, c, a, c, d];

  for (let i = 0; i < indices.length; ++i) {
    positions.push(vertices[indices[i]]);
    if (colourByVertex) {
      colors.push(vertexColors[indices[i]]);
    } else {
      colors.push(vertexColors[a]);
    }
  }
}

function render() {
  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  theta[axis] += 2.0;
  gl.uniform3fv(thetaLoc, theta);

  gl.drawArrays(gl.TRIANGLES, 0, numPositions);
  requestAnimationFrame(render);
}
