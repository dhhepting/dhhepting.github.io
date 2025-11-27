/* eslint-disable require-jsdoc */
// based on https://www.interactivecomputergraphics.com/8E/Code/02/gasket2.js

'use strict';

// global declarations
let gl;
const positions = [];
const colours = [];
const scale_by_half = mat3( 
  0.5, 0.0, 0.0,
  0.0, 0.5, 0.0,
  0.0, 0.0, 1.0
);
const xforms = [
  mat3(),
  mat3(),
  mat3()
];

const baseColours = [
  vec4(1,0,0,1),
  vec4(0,1,0,1),
  vec4(0,0,1,1)
];
const centers = [
  vec3(-0.5, -0.2887, 1.0),
  vec3(0.5, -0.2887, 1.0),
  vec3(0.0, 0.5773, 1.0)
];
  xforms[0] = mult(xforms[0],translate(centers[0][0],centers[0][1]));
  xforms[0] = mult(xforms[0],scale_by_half);
  xforms[0] = mult(xforms[0],translate(-centers[0][0],-centers[0][1]));
  xforms[1] = mult(xforms[1],translate(centers[1][0],centers[1][1]));
  xforms[1] = mult(xforms[1],scale_by_half);
  xforms[1] = mult(xforms[1],translate(-centers[1][0],-centers[1][1]));
  xforms[2] = mult(xforms[2],translate(centers[2][0],centers[2][1]));
  xforms[2] = mult(xforms[2],scale_by_half);
  xforms[2] = mult(xforms[2],translate(-centers[2][0],-centers[2][1]));

 /* xforms[0] = mult(xforms[0],translate(0.0,-0.5773));
  xforms[1] = mult(xforms[1],translate(0.5,-0.2887));
  xforms[1] = mult(xforms[1],scale_by_half);
  xforms[1] = mult(xforms[1],translate(-0.5,0.2887));
  xforms[2] = mult(xforms[2],translate(-0.5,-0.2887));
  xforms[2] = mult(xforms[2],scale_by_half);
  xforms[2] = mult(xforms[2],translate(0.5,0.2887));
  */
console.log('matrix0:')
printm(xforms[0]);
console.log('matrix1:')
printm(xforms[1]);
console.log('matrix2:')
printm(xforms[2]);

console.log(centers[0]);
console.log(centers[1]);
console.log(centers[2]);

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

  // First, initialize the matrices of our gasket transformations

  adaptiveCut(mat3(),0,10);
  //.log('positions:',positions);
  //
  //  Configure WebGL
  //
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.5, 0.5, 0.5, 1.0);

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

  const cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colours), gl.STATIC_DRAW);

  const colourLoc = gl.getAttribLocation(program, 'aColor');
  gl.vertexAttribPointer(colourLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(colourLoc);

  render();
};

function adaptiveCut(currTmat,fxf,count) {
  //console.log('currTmat')
  //printm(currTmat);
  if (count > 0) {
    let m0 = mult(xforms[0],currTmat);
    let m1 = mult(xforms[1],currTmat);
    let m2 = mult(xforms[2],currTmat);
    //console.log('m0')
    //printm(m0);
    adaptiveCut(m0, 0, count - 1);
    adaptiveCut(m1, 1, count - 1);
    adaptiveCut(m2, 2, count - 1);
  } else {
    //console.log('ctm on c0');
    //console.log(centers[0][0],centers[0][1]);
    //printm(currTmat);
    let hp = mult(currTmat,centers[0]);
    let p2d = vec2(hp[0],hp[1]);
    //console.log('-->',p0[0],p0[1]);
    positions.push(p2d);
    colours.push(baseColours[fxf]);
    //console.log('ctm on c1');
    //console.log(centers[1][0],centers[1][1]);
    //printm(currTmat)
    //hp = mult(currTmat,centers[1]);
    //p2d = vec2(hp[0],hp[1]);
    //console.log('-->',p1[0],p1[1]);    
    //positions.push(p2d);
    //positions.push(p1[0],p1[1]);
    //console.log('ctm on c2');
    //console.log(centers[2][0],centers[2][1]);
    //printm(currTmat)
    //hp = mult(currTmat,centers[2]);
    //p2d = vec2(hp[0],hp[1]);
    //let p2 = mult(currTmat,centers[2]);
    //console.log('-->',p2[0],p2[1]);
    //positions.push(p2d);
    //positions.push(p2[0],p2[1]);
    //console.log(positions.length)
  }
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.POINTS, 0, positions.length);
}
