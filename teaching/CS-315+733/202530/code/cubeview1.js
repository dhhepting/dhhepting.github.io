/* eslint-disable require-jsdoc */
'use strict';

var canvas;
var gl;

var numPositions = 36;

var positions = [];
var colors = [];

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;

var axis = 0;
var eta = [0, 0, 0];

var etaLoc;


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

var modelViewMatrixLoc; var projectionMatrixLoc;
var modelViewMatrix; var projectionMatrix;
var eye;

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

window.onload = function init() {
  canvas = document.getElementById('gl-canvas');

  gl = canvas.getContext('webgl2');
  if (!gl) alert('WebGL 2.0 isn\'t available');
  let mmmm = mat4();
  colorCube(mmmm);
  mmmm = mult(mmmm, translate(0.9, 0, 0.1));
  mmmm = mult(mmmm, rotateY(5.0));
  colorCube(mmmm);
  numPositions += 36;

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  gl.enable(gl.DEPTH_TEST);

  //
  //  Load shaders and initialize attribute buffers
  //
  const program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram(program);

  const cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

  const colorLoc = gl.getAttribLocation( program, 'aColor' );
  gl.vertexAttribPointer( colorLoc, 4, gl.FLOAT, false, 0, 0 );
  gl.enableVertexAttribArray( colorLoc );

  const vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);


  const positionLoc = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  etaLoc = gl.getUniformLocation(program, 'uEta');

  modelViewMatrixLoc = gl.getUniformLocation(program, 'uModelViewMatrix');
  projectionMatrixLoc = gl.getUniformLocation(program, 'uProjectionMatrix');


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

  for ( let i = 0; i < indices.length; ++i ) {
    positions.push(mult(xm, vertices[indices[i]]));
    console.log(mult(xm, vertices[indices[i]]));
    // colors.push(vertexColors[indices[i]]);
    // for solid colored faces use
    colors.push(vertexColors[a]);
  }
}

function render() {
  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  eta[axis] += 2.0;
  //gl.uniform3fv(etaLoc, vec3(0,0,0));

  eye = vec3(radius*Math.sin(phi), radius*Math.sin(theta),
      radius*Math.cos(phi));

  modelViewMatrix = mult(rotateZ(eta[xAxis]),lookAt(eye, at, up));
  // projectionMatrix = ortho(left, right, bottom, 5.0, near, far);
  projectionMatrix = ortho(-2., 2., -2.0, 2.0, -2., 2);


  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));


  gl.drawArrays(gl.TRIANGLES, 0, numPositions);
  requestAnimationFrame(render);
}
