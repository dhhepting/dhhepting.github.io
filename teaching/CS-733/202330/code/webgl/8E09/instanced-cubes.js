/* eslint-disable require-jsdoc */
'use strict';

let points = [];
let colors = [];

let modelViewMatrix = [];
let projectionMatrix = [];

// let vBuffer;
// let nMatrix; let nMatrixLoc;

const numInstances = 216;

const xAxis = 0;
const yAxis = 1;
const zAxis = 2;
let axis = 0;

const theta = vec3(30, 45, 60);
let iAngle = 30;
const dTheta = 5.0;
let matrixData;
let matrixBuffer;
const bytesPerMatrix = 4 * 16;
let vBuffer;
const matrices = [];

let flag = true;
let vao;

let program;
let canvas; let gl;

onload = function init() {
  canvas = document.getElementById('gl-canvas');

  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }

  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.clearColor(0.5, 0.5, 0.5, 1.0);

  const myCube = cube();
  colors = myCube.TriangleFaceColors;
  points = myCube.TriangleVertices;
  console.log(colors.length, points.length);

  gl.enable(gl.DEPTH_TEST);
  document.getElementById('ButtonX').onclick = function() {
    axis = xAxis;
  };
  document.getElementById('ButtonY').onclick = function() {
    axis = yAxis;
  };
  document.getElementById('ButtonZ').onclick = function() {
    axis = zAxis;
  };
  document.getElementById('ButtonT').onclick = function() {
    flag = !flag;
  };

  program = initShaders( gl, 'vertex-shader', 'fragment-shader' );
  gl.useProgram( program );

  // Create a vertex array object (attribute state)
  vao = gl.createVertexArray();

  // and make it the one we're currently working with
  gl.bindVertexArray(vao);

  vBuffer = gl.createBuffer();
  gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );
  const positionLoc = gl.getAttribLocation( program, 'aPosition' );
  gl.vertexAttribPointer( positionLoc, 4, gl.FLOAT, false, 0, 0 );
  gl.enableVertexAttribArray( positionLoc );

  const cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
  const colorLoc = gl.getAttribLocation(program, 'aColor');
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(colorLoc);
  gl.vertexAttribDivisor(colorLoc, 6);

  matrixData = new Float32Array(numInstances * 16);
  /*for (let i = 0; i < numInstances; i++) {
    // const identity = mat4();
    matrixData[i] = new Float32Array(4);
    matrixData[i][0] = new Array(4);
    matrixData[i][1] = new Array(4);
    matrixData[i][2] = new Array(4);
    matrixData[i][3] = new Array(4);
    if (i == 0) console.log(i, matrixData[i]);
  }*/

  
  matrixBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, matrixBuffer);
  // just allocate the buffer
  gl.bufferData(gl.ARRAY_BUFFER, matrixData, gl.DYNAMIC_DRAW);
  const matrixLoc = gl.getAttribLocation(program, 'aMatrix');
  //console.log(flatten(matrices));
  // set all 4 attributes for matrix
  for (let i = 0; i < 4; ++i) {
    const loc = matrixLoc + i;
    gl.enableVertexAttribArray(loc);
    // note the stride and offset
    const offset = i * 16; // 4 floats per row, 4 bytes per float
    gl.vertexAttribPointer(
        loc, // location
        4, // size (num values to pull from buffer per iteration)
        gl.FLOAT, // type of data in buffer
        false, // normalize
        bytesPerMatrix, // stride, num bytes to advance to get to next set of values
        offset, // offset in buffer
    );
    // this line says this attribute only changes for each 1 instance
    gl.vertexAttribDivisor(loc, 1);
  }
  projectionMatrix = ortho(-12, 12, -12, 12, -12, 12);
  gl.uniformMatrix4fv(
      gl.getUniformLocation(program, 'projectionMatrix'),
      false, flatten(projectionMatrix));

  render();
};

function render() {
  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (flag) theta[axis] += 0.5;
  // console.log(theta);

  gl.bindVertexArray(vao);

  modelViewMatrix = mat4();
  modelViewMatrix = mult(modelViewMatrix, rotate(theta[xAxis], vec3(1, 0, 0)));
  modelViewMatrix = mult(modelViewMatrix, rotate(theta[yAxis], vec3(0, 1, 0)));
  modelViewMatrix = mult(modelViewMatrix, rotate(theta[zAxis], vec3(0, 0, 1)));

  gl.uniformMatrix4fv(
      gl.getUniformLocation(program, 'modelViewMatrix'),
      false, flatten(modelViewMatrix));

// upload the new matrix data
if (flag) {
gl.bindBuffer(gl.ARRAY_BUFFER, matrixBuffer);
for (let i = 0; i < numInstances; i++) {
    const iMat = rotate(iAngle * ((i +1) * Math.random()* 10.0), vec3(1, 1, 1));
    gl.bufferSubData(gl.ARRAY_BUFFER, i*bytesPerMatrix , flatten(iMat),0);
    //if (i == 0) console.log(i, matrices[i]);
}}



  gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, numInstances);
  setTimeout(
    function() {
      requestAnimationFrame(render);
    },
    100);
};
