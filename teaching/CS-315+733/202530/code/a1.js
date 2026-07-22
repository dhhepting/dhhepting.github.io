/* eslint-disable require-jsdoc */
// based on https://www.interactivecomputergraphics.com/8E/Code/02/gasket2.js

'use strict';

// const { flatten } = require("three/src/extras/lib/earcut.js");

// global declarations
let gl;
let positions = [];
let colours = [];
let crm, centeredRotationMatrix;
let centeredRotationMatrixLoc;
let aColourLoc;
let uColourLoc;
let positionLoc;
let pointSizeLoc;
let stateLoc;
let plotpoint;
let nbrPoints;
let srcTheta = 0;

const xforms = [
  mat3(),
  mat3(),
  mat3(),
];

let pBuffer;
let cBuffer;

const baseColours = [
  vec4(1.0, 0.67, 0.125, 1), // 0: vertex colour
  // Reds
  vec4(1, 0, 0, 1), // 1: pure red for transformation 0 (00) [1+0]
  vec4(1, 0, 0.5, 1), // 2: red + blue = magenta for 01 [1+1]
  vec4(1, 0.5, 0, 1), // 3: red + green = yellow for 02 [1+2] 
  // Blues
  vec4(0.5, 0, 1, 1), // 4: blue + red = magenta for 30 [1+3+0]
  vec4(0, 0, 1, 1), // 5: pure blue for transformation 1 [1+3+1]
  vec4(0, 0.5, 1, 1), // 6: blue + green = cyan for 32 [1+3+2]
  // Greens
  vec4(0.5, 1, 0, 1), // 7: green + red = yellow for 60 [1+6+0]
  vec4(0, 1, 0.5, 1),// 8: green + blue = cyan for 61 [1+6+1]
  vec4(0, 1, 0, 1), // pure green for transformation 2 (22) [1+6+2]
  vec4(1, 1, 1, 1),
];


const centres = [
  vec3(-1, -1, 1),
  vec3(0, 0, 0),
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

  pointSizeLoc = gl.getUniformLocation(program, 'uPointSize');
  centeredRotationMatrixLoc = gl.getUniformLocation(program,
      'uCenteredRotationMatrix');

  cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  // Associate shader variable with colour buffer
  const aColourLoc = gl.getAttribLocation(program, 'aColour');
  gl.vertexAttribPointer(aColourLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aColourLoc);

  triangleXF();

  document.getElementById('apply').onclick =
    function() {
      triangleXF();
    };
};

function triangleXF() {
  // start with empty arrays for positions and colours
  positions = [];
  colours = [];
  // load the vertices from the interface and put them in
  // the first 3 spots in positions array
  centres[0][0] = document.getElementById('v0-xpos').value;
  centres[0][1] = document.getElementById('v0-ypos').value;
  centres[1][0] = document.getElementById('v1-xpos').value;
  centres[1][1] = document.getElementById('v1-ypos').value;
  centres[2][0] = document.getElementById('v2-xpos').value;
  centres[2][1] = document.getElementById('v2-ypos').value;
  positions.push(vec2(centres[0][0], centres[0][1]));
  colours.push(baseColours[0]);
  positions.push(vec2(centres[1][0], centres[1][1]));
  colours.push(baseColours[0]);
  positions.push(vec2(centres[2][0], centres[2][1]));
  colours.push(baseColours[0]);
  // build the 3 transformation matrices
  // TRANSFORMATION for Vertex 0
  xforms[0] = identity();
  // translate from origin to centre
  xforms[0] = mult(xforms[0], translate(
      centres[0][0], centres[0][1]));
  // apply rotation and scale
  xforms[0] = mult(xforms[0], scale(0.5, 0.5));
  xforms[0] = mult(xforms[0], rotate(
      document.getElementById('v0-rot').value));
  // translate from centre to origin
  xforms[0] = mult(xforms[0], translate(
      -centres[0][0], -centres[0][1]));
  // TRANSFORMATION for vertex 1
  xforms[1] = identity();
  xforms[1] = mult(xforms[1], translate(
      centres[1][0], centres[1][1]));
  // apply rotation and scale
  xforms[1] = mult(xforms[1], scale(0.5, 0.5));
  xforms[1] = mult(xforms[1], rotate(
      document.getElementById('v1-rot').value));
  // translate from centre to origin
  xforms[1] = mult(xforms[1], translate(
      -centres[1][0], -centres[1][1]));
  // TRANSFORMATION for vertex 2
  xforms[2] = identity();
  xforms[2] = mult(xforms[2], translate(
      centres[2][0], centres[2][1]));
  // apply rotation and scale
  xforms[2] = mult(xforms[2], scale(0.5, 0.5));
  xforms[2] = mult(xforms[2], rotate(
      document.getElementById('v2-rot').value));
  // translate from centre to origin
  xforms[2] = mult(xforms[2], translate(
      -centres[2][0], -centres[2][1]));
  triangleChaos();
  gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colours), gl.STATIC_DRAW);
  requestAnimationFrame(render);
}

function triangleChaos() {
  nbrPoints = document.getElementById('nbr-points').value;
  let currpoint = vec3(centres[0][0], centres[0][1], 1);
  let newpoint = vec3(centres[0][0], centres[0][1], 1);
  let xf = 0; // variable for current vertex transformation
  let mrxf; // variable for most recent vertex transformation
  for (let i = 0; i < nbrPoints; i++) {
    mrxf = xf; // store current in most recent and pick a new current
    xf = Math.floor(Math.random() * 3);
    newpoint = mult(xforms[xf], currpoint);
    positions.push(vec2(newpoint[0],newpoint[1]));
    colours.push(baseColours[1+(xf*3 + mrxf)]);
    currpoint = newpoint;
  }
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1f(pointSizeLoc, 1.0);
  gl.drawArrays(gl.POINTS, 3, nbrPoints-3);

  // draw centres if selected
  if (document.querySelector('input[name="show-centres"]:checked')) {
    gl.uniform1f(pointSizeLoc, 8.0);
    gl.drawArrays(gl.POINTS, 0, 3);
  }

  // setup matrix for rotation, if selected
  crm = identity();
  gl.uniformMatrix3fv(centeredRotationMatrixLoc, false, flatten(crm));
  if (document.querySelector('input[name="rotate-on"]:checked')) {
    const srcX = document.getElementById('src-xpos').value;
    const srcY = document.getElementById('src-ypos').value;
    // translate from origin to centre
    crm = mult(crm, translate(srcX, srcY));
    // apply rotation
    crm = mult(crm, rotate(++srcTheta % 360));
    // translate from centre to origin
    crm = mult(crm, translate(-srcX, -srcY));
    gl.uniformMatrix3fv(centeredRotationMatrixLoc, false, flatten(crm));
  }
  requestAnimationFrame(render);
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
function rotate(theta360) {
  const theta = theta360 * Math.PI/180;
  return (mat3(
      Math.cos(theta), -Math.sin(theta), 0.0,
      Math.sin(theta), Math.cos(theta), 0.0,
      0.0, 0.0, 1.0,
  ));
}
