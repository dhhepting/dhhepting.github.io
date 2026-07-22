/* eslint-disable require-jsdoc */
// based on https://www.interactivecomputergraphics.com/8E/Code/02/gasket2.js

'use strict';

// global declarations
let gl;
const positions = [];

let theta = 0;
let thetaLoc;
const gasketCentre = [0.0, -0.28864973081];
const centre = [];
centre[0] = gasketCentre[0];
centre[1] = gasketCentre[1];
let centreLoc;

let rotateGasket = true;

const numTimesToSubdivide = 3;

window.onload = function init() {
  const canvas = document.getElementById('gl-canvas');
  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }

  //
  //  Initialize our data for the Sierpinski Gasket
  //

  // First, initialize the corners of our gasket with three positions.

  const vertices = [
    vec2(-1.0, -0.8660),
    vec2(0.0, 0.8660),
    vec2(1.0, -0.8660)];

  divideTriangle(vertices[0], vertices[1], vertices[2],
      numTimesToSubdivide);

  //
  //  Configure WebGL
  //
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  //  Load shaders and initialize attribute buffers

  const program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram(program);

  // Load the data into the GPU

  const bufferId = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

  // Associate out shader variables with our data buffer

  const positionLoc = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  thetaLoc = gl.getUniformLocation(program, 'uTheta');
  centreLoc = gl.getUniformLocation(program, 'uCentre');

  const centreX = document.getElementById('centre-X');
  centreX.value = centre[0];
  centreX.onchange = function(event) {
    centre[0] = centreX.value;
  };

  const centreY = document.getElementById('centre-Y');
  centreY.value = centre[1];
  centreY.onchange = function(event) {
    centre[1] = centreY.value;
  };

  document.getElementById('toggleRotation').onclick = function(event) {
    rotateGasket = !rotateGasket;
  };

  document.getElementById('reset').onclick = function(event) {
    centre[0] = gasketCentre[0];
    centre[1] = gasketCentre[1];
    centreX.value = centre[0];
    centreY.value = centre[1];
  };
  render();
};

function triangle(a, b, c) {
  positions.push(a, b, c);
}

function divideTriangle(a, b, c, count) {
  // check for end of recursion

  if (count === 0) {
    triangle(a, b, c);
  } else {
    // bisect the sides

    const ab = mix(a, b, 0.5);
    const ac = mix(a, c, 0.5);
    const bc = mix(b, c, 0.5);

    --count;

    // three new triangles

    divideTriangle(a, ab, ac, count);
    divideTriangle(c, ac, bc, count);
    divideTriangle(b, bc, ab, count);
  }
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (rotateGasket) {
    theta += 0.1;
    gl.uniform1f(thetaLoc, theta);
  }
  gl.uniform2fv(centreLoc, centre);
  gl.drawArrays(gl.TRIANGLES, 0, positions.length);
  requestAnimationFrame(render);
}
