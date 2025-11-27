/* eslint-disable require-jsdoc */
'use strict';
let gl;

const xAxis = 0;
const yAxis = 1;
const zAxis = 2;
let axis = xAxis;
const theta = [0, 0, 0];

let thetaLoc;

let rotateOn = false;

let points = [];
let colors = [];

window.onload = function init() {
  const canvas = document.getElementById('gl-canvas');

  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert( 'WebGL 2.0 is not available' );
  }

  const myCube = cube();
  myCube.scale(0.5, 0.5, 0.5);
  myCube.rotate(45, [1, 1, 1]);
  myCube.translate(0.5, 0.5, 0.0);

  const myCube2 = cube(1.5);
  myCube2.scale(0.5, 0.5, 0.5);
  myCube.rotate(30, [1, 0, 1]);
  myCube2.translate(-0.5, -0.5, 0.0);

  const myCube3 = cube(2.0);
  myCube3.scale(0.5, 0.25, 0.125);
  myCube3.rotate(45, [0, 1, 0]);
  myCube3.translate(0.5, 0., 0.0);

  // colour myCube by vertex
  colors = myCube.TriangleVertexColors;
  points = myCube.TriangleVertices;
  // colour myCube2 by face
  colors = colors.concat(myCube2.TriangleFaceColors);
  points = points.concat(myCube2.TriangleVertices);
  // colour myCube2 by face
  colors = colors.concat(myCube3.TriangleFaceColors);
  points = points.concat(myCube3.TriangleVertices);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  //
  //  Load shaders and initialize attribute buffers
  //
  const program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram( program );

  const cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
  const colorLoc = gl.getAttribLocation(program, 'aColor');
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(colorLoc);

  const vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
  const positionLoc = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  thetaLoc = gl.getUniformLocation(program, 'theta');

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
    rotateOn = !rotateOn;
  };

  render();
};

function render() {
  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (rotateOn) {
    theta[axis] += 2.0;
  }
  gl.uniform3fv(thetaLoc, theta);
  gl.drawArrays(gl.TRIANGLES, 0, points.length);
  requestAnimationFrame(render);
}
