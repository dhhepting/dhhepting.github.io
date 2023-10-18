/* eslint-disable require-jsdoc */
'use strict';

let gl;

const maxNumPositions = 200;
let index = 0;

let cindex = 0;

const colours = [
  vec4(1.0, 0.0, 0.0, 1.0), // red
  vec4(1.0, 1.0, 0.0, 1.0), // yellow
  vec4(0.0, 1.0, 0.0, 1.0), // green
  vec4(0.0, 0.0, 1.0, 1.0), // blue
  vec4(1.0, 0.0, 1.0, 1.0), // magenta
  vec4(0.0, 1.0, 1.0, 1.0)]; // cyan

let t;
let tt;
let numPolygons = 0;
const numPositions = [];
numPositions[0] = 0;
const start = [0];

window.onload = function init() {
  const canvas = document.getElementById('gl-canvas');

  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }

  const m = document.getElementById('mymenu');

  m.addEventListener('click', function() {
    cindex = m.selectedIndex;
  });

  const a = document.getElementById('Button1');
  a.addEventListener('click', function() {
    numPolygons++;
    numPositions[numPolygons] = 0;
    start[numPolygons] = index;
    render();
  });

  const target = gl.ARRAY_BUFFER;
  const componentType = gl.FLOAT;
  canvas.addEventListener('mousedown', function(event) {
    const mx = 2 * event.clientX / canvas.width - 1;
    const my = 2 * (canvas.height - event.clientY) / canvas.height - 1;
    t = vec2(mx, my);
    gl.bindBuffer(target, vBuffer);
    gl.bufferSubData(target, vComponents * componentSize * index, flatten(t));

    tt = vec4(colours[cindex]);

    gl.bindBuffer(target, cBuffer);
    gl.bufferSubData(target, cComponents * componentSize * index, flatten(tt));

    numPositions[numPolygons]++;
    index++;
  });

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.5, 0.5, 0.5, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  //
  //  Load shaders and initialize attribute buffers
  //
  const program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram(program);

  const componentSize = 4; // for gl.FLOAT (32 bits)
  const toBeNormalized = false;
  const stride = 0;
  const offset = 0;
  const vBuffer = gl.createBuffer();
  const vComponents = 2;
  const vSize = vComponents * componentSize * maxNumPositions;
  gl.bindBuffer(target, vBuffer);
  const usage = gl.STATIC_DRAW;
  gl.bufferData(target, vSize, usage);
  const postionLoc = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(postionLoc, vComponents, componentType,
      toBeNormalized, stride, offset);
  gl.enableVertexAttribArray(postionLoc);

  const cBuffer = gl.createBuffer();
  const cComponents = 4;
  const cSize = cComponents * componentSize * maxNumPositions;
  gl.bindBuffer(target, cBuffer);
  gl.bufferData(target, cSize, usage);
  const colorLoc = gl.getAttribLocation(program, 'aColor');
  gl.vertexAttribPointer(colorLoc, cComponents, componentType,
      toBeNormalized, stride, offset);
  gl.enableVertexAttribArray(colorLoc);
};

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  for (let i = 0; i < numPolygons; i++) {
    gl.drawArrays(gl.TRIANGLE_FAN, start[i], numPositions[i]);
  }
}
