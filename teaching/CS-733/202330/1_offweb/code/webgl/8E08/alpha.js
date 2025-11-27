/* eslint-disable require-jsdoc */
'use strict';

let gl;
let program;

let modelViewMatrix;
let projectionMatrix;
let modelViewMatrixLoc;
let projectionMatrixLoc;

const vertices = [
  vec4(-0.5, -0.5, 6.0, 1.0),
  vec4(-0.5, 0.5, 6.0, 1.0),
  vec4(0.5, 0.5, 6.0, 1.0),
  vec4(0.5, -0.5, 6.0, 1.0),
  vec4(-0.5, -0.5, 5.0, 1.0),
  vec4(-0.5, 0.5, 5.0, 1.0),
  vec4(0.5, 0.5, 5.0, 1.0),
  vec4(0.5, -0.5, 5.0, 1.0),
  vec4(-0.5, -0.5, 4.0, 1.0),
  vec4(-0.5, 0.5, 4.0, 1.0),
  vec4(0.5, 0.5, 4.0, 1.0),
  vec4(0.5, -0.5, 4.0, 1.0),
  vec4(-0.5, -0.5, 3.0, 1.0),
  vec4(-0.5, 0.5, 3.0, 1.0),
  vec4(0.5, 0.5, 3.0, 1.0),
  vec4(0.5, -0.5, 3.0, 1.0),
  vec4(-0.5, -0.5, 2.0, 1.0),
  vec4(-0.5, 0.5, 2.0, 1.0),
  vec4(0.5, 0.5, 2.0, 1.0),
  vec4(0.5, -0.5, 2.0, 1.0),
  vec4(-0.5, -0.5, 1.0, 1.0),
  vec4(-0.5, 0.5, 1.0, 1.0),
  vec4(0.5, 0.5, 1.0, 1.0),
  vec4(0.5, -0.5, 1.0, 1.0)];

/* const faceColors = [
  vec4(0.0, 0.0, 1.0, 1.0), // blue opaque
  vec4(0.0, 1.0, 0.0, 1.0), // 0.5), // green
  vec4(0.0, 1.0, 1.0, 1.0), // 0.5), // cyan
  vec4(1.0, 0.0, 0.0, 1.0), // 0.5), // red
  vec4(1.0, 0.0, 1.0, 1.0), // 0.5), // magenta
  vec4(1.0, 1.0, 0.0, 1.0)]; // yellow opaque */

const faceColors = [
  vec4(0.0, 0.0, 1.0, 0.5), // blue 
  vec4(0.0, 1.0, 0.0, 0.5), // green
  vec4(0.0, 1.0, 1.0, 1.0), // cyan opaque
  vec4(1.0, 0.0, 0.0, 0.5), // red
  vec4(1.0, 0.0, 1.0, 0.5), // magenta
  vec4(1.0, 1.0, 0.0, 1.0)]; // yellow opaque

const positions = [];
const colors = [];

const near = 0;
const far = 10;
const left = -1.0;
const right = 1.0;
const bottom = -1.0;
const topp = 1.0;

const eye = vec3(0.0, 0.0, -1.0);
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

window.onload = function() {
  const canvas = document.getElementById('gl-canvas');

  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }

  // get the data ready for rendering
  colourSquares();

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.5, 0.5, 0.5, 1.0);
  gl.enable(gl.DEPTH_TEST);

  //
  //  Load shaders and initialize attribute buffers
  //
  program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram(program);

  const cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
  const colorLoc = gl.getAttribLocation(program, 'aColor');
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(colorLoc);

  const vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
  const positionLoc = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  modelViewMatrixLoc = gl.getUniformLocation(program, 'uModelViewMatrix');
  projectionMatrixLoc = gl.getUniformLocation(program, 'uProjectionMatrix');

  render();
};

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  projectionMatrix = ortho(left, right, bottom, topp, near, far);
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
  // draw opaque squares, writing into depth buffer
  gl.depthMask(true);
  gl.disable(gl.BLEND);
  const opaque = [2, 5];
  for (let i = 0; i < opaque.length; i++) {
    modelViewMatrix = mult(lookAt(eye, at, up),
        mult(translate(0.5 * Math.random() - 0.25, 0.5 * Math.random() - 0.25, 0.0),
            rotateZ(360.0 * Math.random())));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.drawArrays(gl.TRIANGLES, 6 * opaque[i], 6);
    console.log('opaque', 6 * opaque[i]);
  }

  // draw translucent squares, not writing into depth buffer (but reading from it)
  gl.depthMask(false);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const translucent = [ 0, 1, 3, 4];
  for (let i = 0; i < translucent.length; i++) {
    modelViewMatrix = mult(lookAt(eye, at, up),
        mult(translate(0.5 * Math.random() - 0.25, 0.5 * Math.random() - 0.25, 0.0),
            rotateZ(360.0 * Math.random())));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.drawArrays(gl.TRIANGLES, 6 * translucent[i], 6);
    console.log('translucent', 6 * translucent[i]);
  }
  setTimeout(
      function() {
        requestAnimationFrame(render);
      },
      5000);
}

function colourSquares() {
  square(1, 0, 3, 2, 0); // opaque
  square(5, 4, 7, 6, 1);
  square(9, 8, 11, 10, 2);
  square(13, 12, 15, 14, 3);
  square(17, 16, 19, 18, 4);
  square(21, 20, 23, 22, 5); // opaque
}

function square(a, b, c, d, clr) {
  // draw the square as 2 triangles
  const indices = [a, b, c, a, c, d];

  for (let i = 0; i < indices.length; ++i) {
    positions.push(vertices[indices[i]]);
    colors.push(faceColors[clr]);
  }
}
