/* eslint-disable require-jsdoc */
'use strict';

let canvas1; let canvas2;
let program1; let program2;
let gl1; let gl2;

var numPositions = 36;

var positions = [];
var colors = [];
var normalsArray = [];

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;

let LAinvertCB = false;

var axis = 0;
var eta = [0, 0, 0];

var etaLoc1;


var near = -1;
var far = 1;
var radius = 1.0;
var theta = 0.0;
var phi = 0.0;
var dr = 5.0 * Math.PI/180.0;

var left = -5.0;
var right = 5.0;
// let top = 5.0;
var bottom = -5.0;

var modelViewMatrixLoc1; var projectionMatrixLoc1;
var modelViewMatrixLoc2; var projectionMatrixLoc2;

var modelViewMatrix; var projectionMatrix;
var eye;

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

window.onload = function init() {
  // setup canvas1
  canvas1 = document.getElementById('gl-canvas-1');
  gl1 = canvas1.getContext('webgl2');
  if (!gl1) alert('WebGL 2.0 isn\'t available');
  gl1.viewport(0, 0, canvas1.width, canvas1.height);
  gl1.clearColor(0.6, 0.7, 0.8, 1.0);
  gl1.enable(gl1.DEPTH_TEST);

  // setup canvas2
  canvas2 = document.getElementById('gl-canvas-2');
  gl2 = canvas2.getContext('webgl2');
  if (!gl2) alert('WebGL 2.0 isn\'t available');
  gl2.viewport(0, 0, canvas2.width, canvas2.height);
  gl2.clearColor(0.8, 0.7, 0.6, 1.0);
  gl2.enable(gl2.DEPTH_TEST);

  // set up shared model
  let mmmm = mat4();
  colorCube(mmmm);
  mmmm = mult(mmmm, translate(0.9, 0, 0.1));
  mmmm = mult(mmmm, rotateY(5.0));
  colorCube(mmmm);
  numPositions += 36;

  //
  //  Load shaders and initialize attribute buffers
  //

  // set up program1 for canvas1
  program1 = initShaders(gl1, 'vertex-shader-1', 'fragment-shader-1');
  gl1.useProgram(program1);
  const cBuffer1 = gl1.createBuffer();
  gl1.bindBuffer(gl1.ARRAY_BUFFER, cBuffer1);
  gl1.bufferData(gl1.ARRAY_BUFFER, flatten(colors), gl1.STATIC_DRAW);
  const colorLoc1 = gl1.getAttribLocation( program1, 'aColour' );
  gl1.vertexAttribPointer( colorLoc1, 4, gl1.FLOAT, false, 0, 0 );
  gl1.enableVertexAttribArray( colorLoc1 );
  const vBuffer1 = gl1.createBuffer();
  gl1.bindBuffer(gl1.ARRAY_BUFFER, vBuffer1);
  gl1.bufferData(gl1.ARRAY_BUFFER, flatten(positions), gl1.STATIC_DRAW);
  const positionLoc1 = gl1.getAttribLocation(program1, 'aPosition');
  gl1.vertexAttribPointer(positionLoc1, 4, gl1.FLOAT, false, 0, 0);
  gl1.enableVertexAttribArray(positionLoc1);
  etaLoc1 = gl1.getUniformLocation(program1, 'uEta');
  modelViewMatrixLoc1 = gl1.getUniformLocation(program1, 'uModelViewMatrix');
  projectionMatrixLoc1 = gl1.getUniformLocation(program1, 'uProjectionMatrix');

  // set up program2 for canvas2
  gl2 = canvas2.getContext('webgl2');
  program2 = initShaders(gl2, 'vertex-shader-2', 'fragment-shader-2');
  gl2.useProgram(program2);
  const cBuffer2 = gl2.createBuffer();
  gl2.bindBuffer(gl2.ARRAY_BUFFER, cBuffer2);
  gl2.bufferData(gl2.ARRAY_BUFFER, flatten(colors), gl2.STATIC_DRAW);
  const colorLoc2 = gl2.getAttribLocation( program2, 'aColour' );
  gl2.vertexAttribPointer( colorLoc2, 4, gl2.FLOAT, false, 0, 0 );
  gl2.enableVertexAttribArray( colorLoc2 );
  const vBuffer2 = gl2.createBuffer();
  gl2.bindBuffer(gl2.ARRAY_BUFFER, vBuffer2);
  gl2.bufferData(gl2.ARRAY_BUFFER, flatten(positions), gl2.STATIC_DRAW);
  const positionLoc2 = gl2.getAttribLocation(program2, 'aPosition');
  gl2.vertexAttribPointer(positionLoc2, 4, gl2.FLOAT, false, 0, 0);
  gl2.enableVertexAttribArray(positionLoc2);
  modelViewMatrixLoc2 = gl2.getUniformLocation(program2, 'uModelViewMatrix');
  projectionMatrixLoc2 = gl2.getUniformLocation(program2, 'uProjectionMatrix');
  normalMatrixLoc2 = gl2.getUniformLocation(program2, 'uNormalMatrix');

  // event listeners for buttons

  document.getElementById( 'XANGinput' ).onclick = function() {
    axis = xAxis;
    eta[axis] = document.getElementById('XANGinput').value;
  };
  document.getElementById( 'YANGinput' ).onclick = function() {
    axis = yAxis;
    eta[axis] = document.getElementById('YANGinput').value;
  };
  document.getElementById( 'ZANGinput' ).onclick = function() {
    axis = zAxis;
    eta[axis] = document.getElementById('ZANGinput').value;
  };
  document.getElementById( 'LAinvert' ).onchange = function() {
    if (document.getElementById('LAinvert').checked) {
      LAinvertCB = true;
    } else {
      LAinvertCB = false;
    }
    console.log('LAinvertCB', LAinvertCB);
  };

  render();
};

function colorCube(xm) {
  quad(1, 0, 3, 2, xm);
  quad(2, 3, 7, 6, xm);
  quad(3, 0, 4, 7, xm);
  quad(6, 5, 1, 2, xm);
  quad(4, 5, 6, 7, xm);
  quad(5, 4, 0, 1, xm);
}

function quad(a, b, c, d, xm) {
  const vertices = [
    vec4(-0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, 0.5, 0.5, 1.0),
    vec4(0.5, 0.5, 0.5, 1.0),
    vec4(0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5, 0.5, -0.5, 1.0),
    vec4(0.5, 0.5, -0.5, 1.0),
    vec4(0.5, -0.5, -0.5, 1.0),
  ];

  const vertexColors = [
    vec4(0.0, 0.0, 0.0, 1.0), // black
    vec4(1.0, 0.0, 0.0, 1.0), // red
    vec4(1.0, 1.0, 0.0, 1.0), // yellow
    vec4(0.0, 1.0, 0.0, 1.0), // green
    vec4(0.0, 0.0, 1.0, 1.0), // blue
    vec4(1.0, 0.0, 1.0, 1.0), // magenta
    vec4(0.0, 1.0, 1.0, 1.0), // cyan
    vec4(1.0, 1.0, 1.0, 1.0), // white
  ];

  // We need to parition the quad into two triangles in order for
  // WebGL to be able to render it.  In this case, we create two
  // triangles from the quad indices

  // vertex color assigned by the index of the vertex

  const indices = [a, b, c, a, c, d];

  triangle(a, b, c);
  triangle(a, c, d);


  /* for ( let i = 0; i < indices.length; ++i ) {
    positions.push(mult(xm, vertices[indices[i]]));
    // console.log(mult(xm, vertices[indices[i]]));
    // colors.push(vertexColors[indices[i]]);
    // for solid colored faces use
    colors.push(vertexColors[a]);
  } */
}

function triangle(a, b, c) {
  const vertices = [
    vec4(-0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, 0.5, 0.5, 1.0),
    vec4(0.5, 0.5, 0.5, 1.0),
    vec4(0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5, 0.5, -0.5, 1.0),
    vec4(0.5, 0.5, -0.5, 1.0),
    vec4(0.5, -0.5, -0.5, 1.0),
  ];

  const vertexColors = [
    vec4(0.0, 0.0, 0.0, 1.0), // black
    vec4(1.0, 0.0, 0.0, 1.0), // red
    vec4(1.0, 1.0, 0.0, 1.0), // yellow
    vec4(0.0, 1.0, 0.0, 1.0), // green
    vec4(0.0, 0.0, 1.0, 1.0), // blue
    vec4(1.0, 0.0, 1.0, 1.0), // magenta
    vec4(0.0, 1.0, 1.0, 1.0), // cyan
    vec4(1.0, 1.0, 1.0, 1.0), // white
  ];

  // We need to parition the quad into two triangles in order for
  // WebGL to be able to render it.  In this case, we create two
  // triangles from the quad indices

  // vertex color assigned by the index of the vertex

  //  const indices = [a, b, c, a, c, d];
  const t1 = subtract(b, a);
  const t2 = subtract(c, a);
  const normal = normalize(cross(t2, t1));

  normalsArray.push(vec4(normal[0], normal[1], normal[2], 0.0));
  normalsArray.push(vec4(normal[0], normal[1], normal[2], 0.0));
  normalsArray.push(vec4(normal[0], normal[1], normal[2], 0.0));

  positions.push(vertices[a]);
  colors.push(baseColours[0]);
  positions.push(vertices[b]);
  colors.push(baseColours[0]);
  positions.push(vertices[c]);
  colors.push(baseColours[0]);


  index += 3;
}
function render() {
  // handle canvas1 (1st context)
  gl1.clear( gl1.COLOR_BUFFER_BIT | gl1.DEPTH_BUFFER_BIT);
  gl1.uniform3fv(etaLoc1, eta);
  eye = vec3(0, 0, 1);
  modelViewMatrix = lookAt(eye, at, up);
  // projectionMatrix = ortho(left, right, bottom, 5.0, near, far);
  projectionMatrix = ortho(-2., 2., -2.0, 2.0, -2., 2);
  gl1.uniformMatrix4fv(modelViewMatrixLoc1, false, flatten(modelViewMatrix));
  gl1.uniformMatrix4fv(projectionMatrixLoc1, false, flatten(projectionMatrix));
  gl1.drawArrays(gl1.TRIANGLES, 0, numPositions);

  // handle canvas2 (2nd context)
  gl2.clear( gl2.COLOR_BUFFER_BIT | gl2.DEPTH_BUFFER_BIT);
  eye = vec3(0, 0, 1);
  const eye4 = vec4(eye[0], eye[1], eye[2], 1);
  const up4 = vec4(up[0], up[1], up[2], 1);
  let erm;
  if (LAinvertCB) {
    erm = inverse(mult(rotateZ(eta[2]), mult(rotateY(eta[1]), rotateX(eta[0]))));
  } else {
    erm = mult(rotateZ(eta[2]), mult(rotateY(eta[1]), rotateX(eta[0])));
  }
  const reye4 = mult(erm, eye4);
  const rup4 = mult(erm, up4);
  const reye = vec3(reye4[0], reye4[1], reye4[2]);
  const rup = vec3(rup4[0], rup4[1], rup4[2]);
  modelViewMatrix = lookAt(reye, at, rup);
  // projectionMatrix = ortho(left, right, bottom, 5.0, near, far);
  projectionMatrix = ortho(-2., 2., -2.0, 2.0, -2., 2);
  gl2.uniformMatrix4fv(modelViewMatrixLoc2, false, flatten(modelViewMatrix));
  gl2.uniformMatrix4fv(projectionMatrixLoc2, false, flatten(projectionMatrix));
  gl2.drawArrays(gl2.TRIANGLES, 0, numPositions);

  requestAnimationFrame(render);
}
