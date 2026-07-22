/* eslint-disable require-jsdoc */
// based on https://www.interactivecomputergraphics.com/8E/Code/02/gasket2.js

'use strict';

// global declarations
let gl;
let positions = [];
let colours = [];
let aColourLoc;
let uColourLoc;
let positionLoc;
let pointSizeLoc;
let stateLoc;
let plotpoint;
let precision = 0.01;

let concatted = [];
const xforms = [
  mat3(),
  mat3(),
  mat3(),
];

let pBuffer;
let cBuffer;

const baseColours = [
  vec4(1, 0.5, 0.25, 1),
  vec4(0, 0, 0, 1),
  vec4(0, 0, 1, 1),
  vec4(0, 1, 0, 1),
  vec4(0, 1, 1, 1),
  vec4(1, 0, 0, 1),
  vec4(1, 0, 1, 1),
  vec4(1, 1, 0, 1),
  vec4(1, 1, 1, 1)
];

const centres = [
  vec3(-1, -1, 1),
  vec3(1, 1, 1),
];

window.onload = function init() {
  const canvas = document.getElementById('gl-canvas');
  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }

  //
  //  Configure WebGL
  //
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.5, 0.5, 0.5, 1.0);

  //  Load shaders and initialize attribute buffers

  const program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram(program);

  // Load the data into the GPU

  pBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
  // Associate shader variable with point buffer
  positionLoc = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  uColourLoc = gl.getUniformLocation(program, 'uColour');
  pointSizeLoc = gl.getUniformLocation(program, 'uPointSize');
  stateLoc = gl.getUniformLocation(program, 'uState');

  cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  // Associate shader variable with colour buffer
  const aColourLoc = gl.getAttribLocation(program, 'aColour');
  gl.vertexAttribPointer(aColourLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aColourLoc);

  document.getElementById('apply').onclick =
    function( event ) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      twoXF();
    };
};

function twoXF() {
  // start with empty arrays for positions and colours
  positions = [];
  colours = [];
  // load the centres from the interface and put them in
  // the first 2 spots in positions array
  centres[0][0] = document.getElementById('0x-centre').value;
  centres[0][1] = document.getElementById('0y-centre').value;
  centres[1][0] = document.getElementById('1x-centre').value;
  centres[1][1] = document.getElementById('1y-centre').value;
  let c2d = vec2(centres[0][0], centres[0][1]);
  positions.push(c2d);
  colours.push(baseColours[2]);
  c2d = vec2(centres[1][0], centres[1][1]);
  positions.push(c2d);
  colours.push(baseColours[2]);
  // build the 2 transformation matrices
  // TRANSFORMATION 0
  xforms[0] = identity();
  // translate from origin to centre
  xforms[0] = mult(xforms[0], translate(
      centres[0][0], centres[0][1]));
  // apply rotation, scale, and shear
  xforms[0] = mult(xforms[0], shear(
      document.getElementById('0x-shear').value,
      document.getElementById('0y-shear').value));
  xforms[0] = mult(xforms[0], scale(
      document.getElementById('0x-scale').value,
      document.getElementById('0y-scale').value));
  xforms[0] = mult(xforms[0], rotate(
      document.getElementById('0-theta').value));
  // translate from centre to origin
  xforms[0] = mult(xforms[0], translate(
      -centres[0][0], -centres[0][1]));
  // TRANSFORMATION 1
  xforms[1] = identity();
  xforms[1] = mult(xforms[1], translate(
      centres[1][0], centres[1][1]));
  // apply rotation, scale, and shear
  xforms[1] = mult(xforms[1], shear(
      document.getElementById('1x-shear').value,
      document.getElementById('1y-shear').value));
  xforms[1] = mult(xforms[1], scale(
      document.getElementById('1x-scale').value,
      document.getElementById('1y-scale').value));
  xforms[1] = mult(xforms[1], rotate(
      document.getElementById('1-theta').value));
  // translate from centre to origin
  xforms[1] = mult(xforms[1], translate(
      -centres[1][0], -centres[1][1]));
  printm(xforms[1]);
  precision = document.getElementById('precision').value;

  recursivePts(mat3(), 0, 2.0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colours), gl.STATIC_DRAW);
  console.log(positions.length, colours.length);
  requestAnimationFrame(firstFrame);
}

function recursivePts(currTmat, fxf, diameter, level) {
  concatted[level - 1] = fxf;
  if (diameter > precision) {
    // compose the transformations
    // by multiplying each of the 2 transformations with the current
    if (document.querySelector('input[name="concat"]:checked').value == 0) {
      // if pre:
      recursivePts(
          mult(xforms[0], currTmat),
          0, diameter * document.getElementById('0x-scale').value,
          level + 1);
      recursivePts(
          mult(xforms[1], currTmat),
          1, diameter * document.getElementById('1x-scale').value,
          level + 1);
    } else {
      // if post:
      recursivePts(
          mult(currTmat, xforms[0]),
          0, diameter * document.getElementById('0x-scale').value,
          level + 1);
      recursivePts(
          mult(currTmat, xforms[1]),
          1, diameter * document.getElementById('1x-scale').value,
          level + 1);
    }
  } else {
    const hp = mult(currTmat, centres[0]);
    const p2d = vec2(hp[0], hp[1]);
    positions.push(p2d);
    // if pre, take colour from the last;
    // if post, take colour from the first
    if (document.querySelector('input[name="concat"]:checked').value == 0) {
      colours.push(baseColours[fxf]);
    } else {
      colours.push(baseColours[concatted[0]]);
    }
  }
}

function firstFrame(timestamp) {
  plotpoint = 0;
  animate(timestamp);
}

function animate(timestamp) {
  plotpoint += 64;
  if (plotpoint < 65536) {
    gl.clear(gl.COLOR_BUFFER_BIT);

    // draw points in groups of 64
    gl.uniform4f(uColourLoc, 0, 0, 0, 1);
    gl.uniform1f(pointSizeLoc, 1.0);
    gl.uniform1i(stateLoc, document.querySelector('input[name="colours"]:checked').value);
    gl.drawArrays(gl.POINTS, 2, plotpoint);

    // draw centres
    gl.uniform4f(uColourLoc, 0, 0, 1, 1);
    gl.uniform1f(pointSizeLoc, 8.0);
    gl.drawArrays(gl.POINTS, 0, 2);

    requestAnimationFrame((t) => animate(t));
  }
}

function identity() {
  return (mat3(
      1.0, 0.0, 0.0,
      0.0, 1.0, 0.0,
      0.0, 0.0, 1.0,
  ));
}
function scale(sx, sy) {
  return (mat3(
      sx, 0.0, 0.0,
      0.0, sy, 0.0,
      0.0, 0.0, 1.0,
  ));
}
function shear(hx, hy) {
  return (mat3(
      1.0, hx, 0.0,
      hy, 1.0, 0.0,
      0.0, 0.0, 1.0,
  ));
}
function rotate(theta360) {
  const theta = theta360 * Math.PI/180;
  return (mat3(
      Math.cos(theta), -Math.sin(theta), 0.0,
      Math.sin(theta), Math.cos(theta), 0.0,
      0.0, 0.0, 1.0,
  ));
}
