/* eslint-disable require-jsdoc */
// based on https://www.interactivecomputergraphics.com/8E/Code/02/gasket2.js

'use strict';

// global declarations
let gl;
let positions = [];
let colours = [];
let x_min, x_max, y_min, y_max;
let aColourLoc;
let uColourLoc;
let positionLoc;
let pointSizeLoc;
let stateLoc;
let plotpoint;
let contract0, contract1;
//let precision = 0.01;

const concatted = [];
let slicedColours = [];
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
  vec4(1, 1, 1, 1),
];


let centres = [
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

  twoXF();

  document.getElementById('apply').onclick =
    function() {
      console.log('Apply');
      twoXF();
    };

  document.getElementById('resetcentres').onclick =
    function() {
      console.log('Reset Centres');
      document.getElementById('0x-centre').value = -0.5;
      document.getElementById('0y-centre').value = 0;
      document.getElementById('1x-centre').value = 0.5;
      document.getElementById('1y-centre').value = 0;
      document.getElementById('0x-scale').value = Math.sqrt(2.0)/2.0;
      document.getElementById('0y-scale').value = Math.sqrt(2.0)/2.0;
      document.getElementById('1x-scale').value = Math.sqrt(2.0)/2.0;
      document.getElementById('1y-scale').value = Math.sqrt(2.0)/2.0;
    };
};
function twoXF() {
  x_min = 65536, y_min = 65536, x_max = 65536, y_max = 65536;
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
  colours.push(baseColours[0]);
  c2d = vec2(centres[1][0], centres[1][1]);
  positions.push(c2d);
  colours.push(baseColours[0]);
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
  console.log(xforms[0]);
  let det0 = xforms[0][0][0] * xforms[0][1][1] - xforms[0][0][1] * xforms[0][1][0];
  contract0 = Math.sqrt(Math.abs(det0));
  console.log('det0',det0,'sqrt(det0))',contract0);

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
  console.log(xforms[1]);
  let det1 = xforms[1][0][0] * xforms[1][1][1] - xforms[1][0][1] * xforms[1][1][0];
  contract1 = Math.sqrt(Math.abs(det1));
  //console.log('sqrt(det1))',contract1);
  //precision = document.getElementById('precision').value;
  recursivePts(mat3(), 0, 2.0, 0);
   document.getElementById('0x-scale').value,
  gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colours), gl.STATIC_DRAW);
  requestAnimationFrame(firstFrame);
}
function recursivePts(currTmat, fxf, diameter, level) {
  concatted[level - 1] = fxf;
  // if (diameter > precision) {
  if (level < 16) {
    // compose the transformations
    // by multiplying each of the 2 transformations with the current
    if (document.querySelector('input[name="concat"]:checked').value == 0) {
      // if pre:
      recursivePts(
          mult(xforms[0], currTmat),
          0, diameter * contract0/*document.getElementById('c0x-scale').value*/,
          level + 1);
      recursivePts(
          mult(xforms[1], currTmat),
          1, diameter * contract1/*document.getElementById('1x-scale').value*/,
          level + 1);
    } else {
      // if post:
      recursivePts(
          mult(currTmat, xforms[0]),
          0, diameter * contract0/*document.getElementById('0x-scale').value*/,
          level + 1);
      recursivePts(
          mult(currTmat, xforms[1]),
          1, diameter * contract1/*document.getElementById('1x-scale').value*/,
          level + 1);
    }
  } else {
    const hp = mult(currTmat, centres[0]);
    const p2d = vec2(hp[0], hp[1]);
    //console.log(p2d,concatted);
    if (p2d[0] < x_min || x_min == 65536) {
      x_min = p2d[0];
    }
    if (p2d[0] > x_max || x_max == 65536) {
      x_max = p2d[0];
    }
    if (p2d[1] < y_min || y_min == 65536) {
      y_min = p2d[1];
    }
    if (p2d[1] > y_max || y_max == 65536) {
      y_max = p2d[1];
    }
    positions.push(p2d);

    // if pre, take colour from the last;
    // if post, take colour from the first
    if (document.querySelector('input[name="concat"]:checked').value == 0) {
      slicedColours = concatted.slice(-1 *
          document.getElementById('colour-len').value);
    } else {
      slicedColours = concatted.slice(0,
          document.getElementById('colour-len').value);
    }
    let colourIndex = 0;
    for (let i=0; i<document.getElementById('colour-len').value; i++) {
      colourIndex += (slicedColours[i] * Math.pow(2, i));
    }
    // save baseColour[0] for centres
    colours.push(baseColours[colourIndex+1]);
  }
}

function firstFrame(timestamp) {
  plotpoint = 0
  animate(timestamp);
}

function animate(timestamp) {
 
  if (plotpoint < 64) {
    let x_extent, y_extent, extent, sa;
    x_extent = x_max - x_min;
    y_extent = y_max - y_min;
    if (x_extent > y_extent) {
      extent = x_extent;
    } else {
      extent = y_extent;
    }
    sa = 1.90 / extent;

    let delta_x = -(x_min + x_max)/2.0;
    let delta_y = -(y_min + y_max)/2.0;

    // adjusted centres
    let nc1x = sa * (parseFloat(centres[0][0]) + delta_x);
    let nc1y = sa * (parseFloat(centres[0][1]) + delta_y);
    let nc2x = sa * (parseFloat(centres[1][0]) + delta_x);
    let nc2y = nc1y;

    document.getElementById('0x-centre').value = nc1x;
    document.getElementById('0y-centre').value = nc1y;
    document.getElementById('1x-centre').value = nc2x;
    document.getElementById('1y-centre').value = nc2y;
    document.getElementById('delta-x').value = delta_x;
    document.getElementById('delta-y').value = delta_y;
    document.getElementById('contract-0').value = contract0;
    document.getElementById('contract-1').value = contract1;

  }
  plotpoint += 64;
  if (plotpoint <= 65536) {
    gl.clear(gl.COLOR_BUFFER_BIT);

    // draw points in groups of 64
    gl.uniform4f(uColourLoc, 0, 0, 0, 1);
    gl.uniform1f(pointSizeLoc, 1.0);
    gl.uniform1i(stateLoc,
        document.querySelector('input[name="colours"]:checked').value);
    gl.drawArrays(gl.POINTS, 2, plotpoint);

    // draw centres
    if (document.querySelector('input[name="show-centres"]:checked')) {
      gl.uniform4f(uColourLoc, 0, 0, 1, 1);
      gl.uniform1f(pointSizeLoc, 8.0);
      gl.drawArrays(gl.POINTS, 0, 2);
    }
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
