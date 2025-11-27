/* eslint-disable require-jsdoc */
'use strict';

let gl;
let program;

const numPositions = 36;

const vertices = [
  vec3(-0.5, -0.5, 0.5),
  vec3(-0.5, 0.5, 0.5),
  vec3(0.5, 0.5, 0.5),
  vec3(0.5, -0.5, 0.5),
  vec3(-0.5, -0.5, 0.25),
  vec3(-0.5, 0.5, 0.25),
  vec3(0.5, 0.5, 0.25),
  vec3(0.5, -0.5, 0.25),
  vec3(-0.5, -0.5, 0.125),
  vec3(-0.5, 0.5, 0.125),
  vec3(0.5, 0.5, 0.125),
  vec3(0.5, -0.5, 0.125),
  vec3(-0.5, -0.5, -0.125),
  vec3(-0.5, 0.5, -0.125),
  vec3(0.5, 0.5, -0.125),
  vec3(0.5, -0.5, -0.125),
  vec3(-0.5, -0.5, -0.25),
  vec3(-0.5, 0.5, -0.25),
  vec3(0.5, 0.5, -0.25),
  vec3(0.5, -0.5, -0.25),
  vec3(-0.5, -0.5, -0.5),
  vec3(-0.5, 0.5, -0.5),
  vec3(0.5, 0.5, -0.5),
  vec3(0.5, -0.5, -0.5)];

const faceColors = [
  vec4(0.0, 0.0, 1.0, 1.0), // blue
  vec4(0.0, 1.0, 0.0, 0.5), // green
  vec4(0.0, 1.0, 1.0, 0.5), // cyan
  vec4(1.0, 0.0, 0.0, 0.5), // red
  vec4(1.0, 0.0, 1.0, 0.5), // magenta
  vec4(1.0, 1.0, 0.0, 1.0)]; // yellow

const positions = [];
const colors = [];

const xAxis = 0;
const yAxis = 1;
const zAxis = 2;
let axis = xAxis;
const theta = vec3(0.0, 0.0, 0.0);
let thetaLoc;

let rotateOn = false;
const hiddenSurfaceRemoval = true;

window.onload = function() {
  const canvas = document.getElementById('gl-canvas');

  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }

  colorCube();

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
  gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  thetaLoc = gl.getUniformLocation(program, 'uTheta');

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
    rotateOn = !rotateOn;
  };
  document.getElementById('ButtonH').onclick = function() {
  };

  render();
};

function colorCube() {
  quad(1, 0, 3, 2, 0);
  quad(5, 4, 7, 6, 1);
  quad(9, 8, 11, 10, 2);
  quad(13, 12, 15, 14, 3);
  quad(17, 16, 19, 18, 4);
  quad(21, 20, 23, 22, 5);
}

function quad(a, b, c, d, clr) {
  // We need to parition the quad into two triangles in order for
  // WebGL to be able to render it.  In this case, we create two
  // triangles from the quad.
  const indices = [a, b, c, a, c, d];

  for (let i = 0; i < indices.length; ++i) {
    positions.push(vertices[indices[i]]);
    colors.push(faceColors[clr]);
  }
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // draw opaque squares, writing into depth buffer
  gl.depthMask(gl.TRUE);
  gl.disable(gl.BLEND);
  for (let i = 0; i < 6; i += 5) {
    gl.uniform2fv(gl.getUniformLocation(program, 'uTranslate'),
        // vec2(0,0));
        vec2(0.5 * Math.random() - 0.25, 0.5 * Math.random() - 0.25));
    gl.uniform1f(gl.getUniformLocation(program, 'uRotate'),
        360.0 * Math.random());
    // gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.drawArrays(gl.TRIANGLES, 6 * i, 6);
    console.log(6*i);
  }
  // draw translucent squares, not writing into depth buffer
/*   gl.depthMask(gl.FALSE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  for (let i = 4; i > 0; i--) {
    gl.uniform2fv(gl.getUniformLocation(program, 'uTranslate'),
        // vec2(0,0));
        vec2(0.5 * Math.random() - 0.25, 0.5 * Math.random() - 0.25));
    gl.uniform1f(gl.getUniformLocation(program, 'uRotate'),
        360.0 * Math.random());
    gl.drawArrays(gl.TRIANGLES, 6 * i, 6);
    console.log(6*i);
  } */
  /* for (let i = 0; i < 6; i++) {
    gl.uniform2fv(gl.getUniformLocation(program, 'uTranslate'),
        vec2(0,0));
        //vec2(Math.random() - 0.5, 2.0 * Math.random() - 0.5));
    gl.uniform1f(gl.getUniformLocation(program, 'uRotate'),
        360.0 * Math.random());
    // gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.drawArrays(gl.TRIANGLES, 6 * i, 6);
  } */
  setTimeout(
      function() {
        requestAnimationFrame(render);
      },
      5000);
}
