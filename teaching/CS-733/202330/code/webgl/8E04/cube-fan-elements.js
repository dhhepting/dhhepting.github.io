/* eslint-disable require-jsdoc */
'use strict';

let gl;

const xAxis = 0;
const yAxis = 1;
const zAxis = 2;
let axis = 0;

let theta = [0, 0, 0];
let thetaLoc;
let isRotating = true;
const numElements = 29;

const vertexColors = [
  vec4(0.0, 0.0, 0.0, 1.0), // black
  vec4(1.0, 0.0, 0.0, 1.0), // red
  vec4(1.0, 1.0, 0.0, 1.0), // yellow
  vec4(0.0, 1.0, 0.0, 1.0), // green
  vec4(0.0, 0.0, 1.0, 1.0), // blue
  vec4(1.0, 0.0, 1.0, 1.0), // magenta
  vec4(1.0, 1.0, 1.0, 1.0), // white
  vec4(0.0, 1.0, 1.0, 1.0)]; // cyan

const vertices = [
  vec3(-0.5, -0.5, 0.5), // 0
  vec3(-0.5, 0.5, 0.5), // 1
  vec3(0.5, 0.5, 0.5), // 2
  vec3(0.5, -0.5, 0.5), // 3
  vec3(-0.5, -0.5, -0.5), // 4
  vec3(-0.5, 0.5, -0.5), // 5
  vec3(0.5, 0.5, -0.5), // 6
  vec3(0.5, -0.5, -0.5)]; // 7

// indices of the 12 triangle fans that compise the cube
const indices = [
  1, 0, 3, 2, 255, // z == 0.5 plane
  2, 3, 7, 6, 255, // x == 0.5 plane
  3, 0, 4, 7, 255, // y == -0.5 plane
  6, 5, 1, 2, 255, // y == 0.5 plane
  4, 5, 6, 7, 255, // z == -0.5 plane
  5, 4, 0, 1]; // x == -0.5 plane

window.onload = function init() {
  const canvas = document.getElementById('gl-canvas');
  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.PRIMITIVE_RESTART_FIXED_INDEX);

  //
  //  Load shaders and initialize attribute buffers
  //
  const program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram(program);

  // array element buffer

  const iBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

  // color array atrribute buffer

  const cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);

  const colorLoc = gl.getAttribLocation(program, 'aColor');
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(colorLoc);

  // vertex array attribute buffer

  const vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation( program, 'aPosition');
  gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc );

  thetaLoc = gl.getUniformLocation(program, 'uTheta');

  // event listeners for buttons

  document.getElementById( 'xButton' ).onclick = function() {
    axis = xAxis;
  };
  document.getElementById( 'yButton' ).onclick = function() {
    axis = yAxis;
  };
  document.getElementById( 'zButton' ).onclick = function() {
    axis = zAxis;
  };
  document.getElementById('ButtonT').onclick = function() {
    flag = !flag;
  };

  render();
};

function render() {
  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (isRotating) {
    theta[axis] += 2.0;
  }
  gl.uniform3fv(thetaLoc, theta);
  gl.drawElements(gl.TRIANGLE_FAN, numElements, gl.UNSIGNED_BYTE, 0);
  requestAnimationFrame(render);
}
