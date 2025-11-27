/* eslint-disable require-jsdoc */
'use strict';

let gl;

const xAxis = 0;
const yAxis = 1;
const zAxis = 2;
let axis = xAxis;

let theta = [0, 0, 0];
let thetaLoc;
let isRotating = false;
let xAngle;
let yAngle;
let zAngle;
/*
const vertexColors = [
  // ordered as binary numbers: R -> [0,1], G -> [0,1], B -> [0,1]
  vec4(0.0, 0.0, 0.0, 1.0), // 000 0, black
  vec4(0.0, 0.0, 1.0, 1.0), // 001 1, blue
  vec4(0.0, 1.0, 0.0, 1.0), // 010 2, green
  vec4(0.0, 1.0, 1.0, 1.0), // 011 3, cyan
  vec4(1.0, 0.0, 0.0, 1.0), // 100 4, red
  vec4(1.0, 0.0, 1.0, 1.0), // 101 5, magenta
  vec4(1.0, 1.0, 0.0, 1.0), // 110 6, yellow
  vec4(1.0, 1.0, 1.0, 1.0)]; // 111 7, white
  */

const vertexColors = [
  // ordered as binary numbers: R -> [0,1], G -> [0,1], B -> [0,1]
  vec4(0.0, 0.0, 0.0, 1.0), // 000 0, black
  vec4(0.0, 0.0, 0.0, 1.0), // 000 0, black
  vec4(0.0, 0.0, 0.0, 1.0), // 000 0, black
  vec4(0.0, 0.0, 0.0, 1.0), // 000 0, black
  vec4(1.0, 1.0, 1.0, 1.0), // 111 7, white
  vec4(1.0, 1.0, 1.0, 1.0), // 111 7, white
  vec4(1.0, 1.0, 1.0, 1.0), // 111 7, white
  vec4(1.0, 1.0, 1.0, 1.0)]; // 111 7, white


const vertices = [
  // ordered as binary numbers: -0.5 -> 0; 0.5 -> 1
  vec3(-0.5, -0.5, -0.5), // 000 -> 0
  vec3(-0.5, -0.5, 0.5), // 001 -> 1
  vec3(-0.5, 0.5, -0.5), // 010 -> 2
  vec3(-0.5, 0.5, 0.5), // 011 -> 3
  vec3(0.5, -0.5, -0.5), // 100 -> 4
  vec3(0.5, -0.5, 0.5), // 101 -> 5
  vec3(0.5, 0.5, -0.5), // 110 -> 6
  vec3(0.5, 0.5, 0.5)]; // 111 -> 7

  const indices = [0, 1, 2, 3, 7, 1, 5, 0, 4, 2, 6, 7, 4, 5];
  
  //const indices = [3, 2, 1, 0];//, 7, 1, 5, 0, 4, 2, 6, 7, 4, 5];
  const numElements = indices.length;

window.onload = function init() {
  const canvas = document.getElementById('gl-canvas');
  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.5, 0, 0, 1.0);

  //gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.frontFace(gl.CW);
  //gl.cullFace(gl.FRONT);
  // gl.enable(gl.PRIMITIVE_RESTART_FIXED_INDEX);

  //
  //  Load shaders and initialize attribute buffers
  //
  const program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram(program);

  // array element buffer
  const arrayTarget = gl.ARRAY_BUFFER;
  const elementTarget = gl.ELEMENT_ARRAY_BUFFER;
  const usage = gl.STATIC_DRAW;
  const arrayComponentType = gl.FLOAT;
 
  const toBeNormalized = false;
  const stride = 0;
  const offset = 0;

  const iBuffer = gl.createBuffer();
  gl.bindBuffer(elementTarget, iBuffer);
  const indexSrcData = new Uint8Array(indices);
  gl.bufferData(elementTarget, indexSrcData, usage);

  // color array atrribute buffer
  const cComponents = 4;
  const cBuffer = gl.createBuffer();
  gl.bindBuffer(arrayTarget, cBuffer);
  const colorSrcData = flatten(vertexColors);
  gl.bufferData(arrayTarget, colorSrcData, usage);

  const colorLoc = gl.getAttribLocation(program, 'aColor');
  gl.vertexAttribPointer(colorLoc, cComponents, arrayComponentType,
      toBeNormalized, stride, offset);
  gl.enableVertexAttribArray(colorLoc);

  // vertex array attribute buffer

  const vBuffer = gl.createBuffer();
  gl.bindBuffer(arrayTarget, vBuffer);
  const vertexSrcData = flatten(vertices);
  gl.bufferData(arrayTarget, vertexSrcData, usage);
  const vComponents = 3;
  const positionLoc = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(positionLoc, vComponents, arrayComponentType,
      toBeNormalized, stride, offset);
  gl.enableVertexAttribArray(positionLoc);

  thetaLoc = gl.getUniformLocation(program, 'uTheta');

  // event listeners for buttons
  xAngle = document.getElementById('xAngle');
  xAngle.onclick = function() {
    theta[xAxis] = parseInt(xAngle.value,10);
    axis = xAxis;
  };

  yAngle = document.getElementById('yAngle');
  yAngle.onclick = function() {
    theta[yAxis] = parseInt(yAngle.value,10);
    axis = yAxis;
  };

  zAngle = document.getElementById('zAngle');
  zAngle.onclick = function() {
    theta[zAxis] = parseInt(zAngle.value,10);
    axis = zAxis;
  };
  document.getElementById('ButtonT').onclick = function() {
    isRotating = !isRotating;
  };

  render();
};

function render() {
  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (isRotating) {
    theta[axis] = (theta[axis] + 1) % 360;
    xAngle.value = theta[xAxis];
    yAngle.value = theta[yAxis];
    zAngle.value = theta[zAxis];
    console.log(theta);
  }
  gl.uniform3fv(thetaLoc, theta);
  const elementComponentType = gl.UNSIGNED_BYTE;
  const offset = 0;
  gl.drawElements(gl.TRIANGLE_STRIP, numElements, elementComponentType, offset);
  requestAnimationFrame(render);
}
