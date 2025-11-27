/* eslint-disable require-jsdoc */
'use strict';

let gl;

const positions = [];
const colours = [];

const numTimesToSubdivide = 2;

window.onload = function init() {
  const canvas = document.getElementById('gl-canvas');

  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }

  //
  //  Initialize our data for the Sierpinski Gasket
  //
  generate_positions();

  //
  //  Configure WebGL
  //
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  // enable hidden-surface removal
  gl.enable(gl.DEPTH_TEST);

  //  Load shaders and initialize attribute buffers

  const program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram(program);

  // Create a buffer object, initialize it, and associate it with the
  //  associated attribute variable in our vertex shader

  const cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colours), gl.STATIC_DRAW);

  const colourLoc = gl.getAttribLocation(program, 'aColor');
  gl.vertexAttribPointer(colourLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(colourLoc);

  const vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  render();
};

function generate_positions() {
  // First, initialize the vertices of our 3D gasket
  // Four vertices on unit sphere
  // Intial tetrahedron with equal length sides

  const vertices = [
    vec3(0.0000, 0.0000, -1.0000),
    vec3(0.0000, 0.9428, 0.3333),
    vec3(-0.8165, -0.4714, 0.3333),
    vec3(0.8165, -0.4714, 0.3333)];

  divideTetra(vertices[0], vertices[1], vertices[2], vertices[3],
      numTimesToSubdivide);
}

function divideTetra(a, b, c, d, count) {
  // check for end of recursion

  if (count === 0) {
    tetra(a, b, c, d);
  } else {
    // find midpoints of sides
    // divide four smaller tetrahedra
    const ab = mix(a, b, 0.5);
    const ac = mix(a, c, 0.5);
    const ad = mix(a, d, 0.5);
    const bc = mix(b, c, 0.5);
    const bd = mix(b, d, 0.5);
    const cd = mix(c, d, 0.5);

    --count;

    divideTetra(a, ab, ac, ad, count);
    divideTetra(ab, b, bc, bd, count);
    divideTetra(ac, bc, c, cd, count);
    divideTetra(ad, bd, cd, d, count);
  }
}

function tetra( a, b, c, d ) {
  // tetrahedron with each side using
  // a different colour

  triangle(a, c, b, 0);
  triangle(a, c, d, 1);
  triangle(a, b, d, 2);
  triangle(b, c, d, 3);
}

function triangle(a, b, c, colour) {
  // add colours and vertices for one triangle

  const baseColours = [
    vec3(1.0, 0.0, 0.0),
    vec3(0.0, 1.0, 0.0),
    vec3(0.0, 0.0, 1.0),
    vec3(0.0, 0.0, 0.0)];

  colours.push(baseColours[colour]);
  positions.push(a);
  colours.push(baseColours[colour]);
  positions.push(b);
  colours.push(baseColours[colour]);
  positions.push(c);
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, positions.length);
}
