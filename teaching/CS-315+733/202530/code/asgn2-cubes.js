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

let pfovy = 45.0;
let paspect = 16.0/9.00;
let pnear = -2.0;
let pfar = 2.0;

let onear = -2.0;
let ofar = 2.0;
var radius = 1.0;
var theta = 0.0;
var phi = 0.0;
var dr = 5.0 * Math.PI/180.0;

let oleft = -2.0;
let oright = 2.0;
let obottom = -2.0;
let otop = 2.0;

let usePersp = true;

var modelViewMatrixLoc; var projectionMatrixLoc;
var modelViewMatrix; var projectionMatrix;

let eye = vec3(1.0, 1.0, 1.0);
let at = vec3(0.0, 0.0, 0.0);
let up = vec3(0.0, 1.0, 0.0);

window.onload = function init() {
  canvas = document.getElementById('gl-canvas');

  
  gl = canvas.getContext('webgl2');
  if (!gl) alert('WebGL 2.0 isn\'t available');
  STcubes();

  // load interface values from variables
  document.getElementById('eye-x').value = eye[0];
  document.getElementById('eye-y').value = eye[1];
  document.getElementById('eye-z').value = eye[2];
  document.getElementById('lap-x').value = at[0];
  document.getElementById('lap-y').value = at[1];
  document.getElementById('lap-z').value = at[2];
  document.getElementById('up-x').value = up[0];
  document.getElementById('up-y').value = up[1];
  document.getElementById('up-z').value = up[2];
  document.getElementById('o-left').value = oleft;
  document.getElementById('o-right').value = oright;
  document.getElementById('o-bottom').value = obottom;
  document.getElementById('o-top').value = otop;
  document.getElementById('o-near').value = onear;
  document.getElementById('o-far').value = ofar;
  document.getElementById('proj0').checked;
  document.getElementById('p-fovy').value = pfovy;
  document.getElementById('p-aspect').value = paspect;
  document.getElementById('p-near').value = pnear;
  document.getElementById('p-far').value = pfar;

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.7071, 0, 0.7071, 1.0);

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

  document.getElementById('eye-x').onchange = function() {
    eye[0] = document.getElementById('eye-x').value;
  };
  document.getElementById('eye-y').onchange = function() {
    eye[1] = document.getElementById('eye-y').value;
  };
  document.getElementById('eye-z').onchange = function() {
    eye[2] = document.getElementById('eye-z').value;
  };
  document.getElementById('lap-x').onchange = function() {
    at[0] = document.getElementById('lap-x').value;
  };
  document.getElementById('lap-y').onchange = function() {
    at[1] = document.getElementById('lap-y').value;
  };
  document.getElementById('lap-z').onchange = function() {
    at[2] = document.getElementById('lap-z').value;
  };
  document.getElementById('up-x').onchange = function() {
    up[0] = document.getElementById('up-x').value;
  };
  document.getElementById('up-y').onchange = function() {
    up[1] = document.getElementById('up-y').value;
  };
  document.getElementById('up-z').onchange = function() {
    up[2] = document.getElementById('up-z').value;
  };
  // Source - https://stackoverflow.com/a/7275606
  // Posted by Joe, modified by community. See post 'Timeline' for change history
  // Retrieved 2025-11-18, License - CC BY-SA 4.0
  document.getElementById('proj0').onchange = function() {
    console.log(document.querySelector('input[name=projection]:checked').value);
    if (document.querySelector('input[name=projection]:checked').value == "perspective") {
      usePersp = true;
    } else {
      usePersp = false;
    }
    render();
  };
  document.getElementById('proj1').onchange = function() {
    console.log(document.querySelector('input[name=projection]:checked').value);
    if (document.querySelector('input[name=projection]:checked').value == "perspective") {
      usePersp = true;
    } else {
      usePersp = false;
    }
    render();
  };
  document.getElementById('o-left').onchange = function() {
    oleft = document.getElementById('o-left').value;
  };
  document.getElementById('o-right').onchange = function() {
    oright = document.getElementById('o-right').value;
  };
  document.getElementById('o-bottom').onchange = function() {
    obottom = document.getElementById('o-bottom').value;
  };
  document.getElementById('o-top').onchange = function() {
    otop = document.getElementById('o-top').value;
  };
  document.getElementById('o-near').onchange = function() {
    onear = document.getElementById('o-near').value;
  };
  document.getElementById('o-far').onchange = function() {
    ofar = document.getElementById('o-far').value;
  };
  document.getElementById('p-aspect').onchange = function() {
    paspect = document.getElementById('p-aspect').value;
  };
  document.getElementById('p-fovy').onchange = function() {
    pfovy = document.getElementById('p-fovy').value;
  };
  document.getElementById('p-near').onchange = function() {
    pnear = document.getElementById('p-near').value;
  };
  document.getElementById('p-far').onchange = function() {
    pfar = document.getElementById('p-far').value;
  };

  render();
};

const centres = [
  vec3(-1, 0, 0),
  vec3(1, 0, 0),
  vec3(0, 1, 0),
];

const xforms = [
  mat4(),
  mat4(),
  mat4(),
];

function STcubes() {
  centres[0][0] = -0.5;
  centres[0][1] = 0.0;
  centres[1][0] = 0.5;
  centres[1][1] = 0.0;
  centres[2][0] = 0.0;
  centres[2][1] = 0.8660;
  // build the 3 transformation matrices
  // TRANSFORMATION for Vertex 0
  // xforms[0] = identity();
  // translate from origin to centre
  xforms[0] = mult(xforms[0], translate(
      centres[0][0], centres[0][1], centres[0][2]));
  // apply rotation and scale
  xforms[0] = mult(xforms[0], scale(0.5, 0.5, 0.5));
  xforms[0] = mult(xforms[0], rotateY(-5.0 + (Math.random() * 10.0)));
  xforms[0] = mult(xforms[0], translate(
      0, 0, -0.25 + (Math.random() * 0.5)));
  // translate from centre to origin
  xforms[0] = mult(xforms[0], translate(
      -centres[0][0], -centres[0][1], -centres[0][2]));
  // TRANSFORMATION for vertex 1
  // xforms[1] = identity();
  xforms[1] = mult(xforms[1], translate(
      centres[1][0], centres[1][1], centres[1][2]));
  // apply rotation and scale
  xforms[1] = mult(xforms[1], scale(0.5, 0.5, 0.5));
  xforms[1] = mult(xforms[1], rotateY(-5.0 + (Math.random() * 10.0)));
  xforms[1] = mult(xforms[1], translate(
      0,0,-0.25 + (Math.random() * 0.5)));
  // translate from centre to origin
  xforms[1] = mult(xforms[1], translate(
      -centres[1][0], -centres[1][1], -centres[1][2]));
  // TRANSFORMATION for vertex 2
  // xforms[2] = identity();
  xforms[2] = mult(xforms[2], translate(
      centres[2][0], centres[2][1], centres[2][2]));
  // apply rotation and scale
  xforms[2] = mult(xforms[2], scale(0.5, 0.5, 0.5));
  xforms[2] = mult(xforms[2], rotateY(-5.0 + (Math.random() * 10.0)));
  xforms[2] = mult(xforms[2], translate(
      0,0,-0.25 + (Math.random() * 0.5)));
  // translate from centre to origin
  xforms[2] = mult(xforms[2], translate(
      -centres[2][0], -centres[2][1], -centres[2][2]));

  let mmmm = mat4();
  numPositions = 0;
  for (let i=0; i<3; i++) {
    for (let j=0; j<3; j++) {
      mmmm = mat4();
      mmmm = mult(mmmm, xforms[i]);
      mmmm = mult(mmmm, xforms[j]);
      colorCube(mmmm, i*3+j);
      numPositions += 36;
    }
  }
}

function colorCube(xm, ci) {
  quad(1, 0, 3, 2, xm, ci);
  quad(2, 3, 7, 6, xm, ci);
  quad(3, 0, 4, 7, xm, ci);
  quad(6, 5, 1, 2, xm, ci);
  quad(4, 5, 6, 7, xm, ci);
  quad(5, 4, 0, 1, xm, ci);
}

const baseColours = [
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
  vec4(0, 1, 0.5, 1), // 8: green + blue = cyan for 61 [1+6+1]
  vec4(0, 1, 0, 1), // pure green for transformation 2 (22) [1+6+2]
  vec4(1, 1, 1, 1),
];

function quad(a, b, c, d, xm, ci) {
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
    // console.log(mult(xm, vertices[indices[i]]));
    // colors.push(vertexColors[indices[i]]);
    // for solid colored faces use
    colors.push(baseColours[ci]);
  }
}

function render() {
  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniform3fv(etaLoc, eta);
  // console.log(eta);
  // eye = vec3(radius*Math.sin(phi), radius*Math.sin(theta),
  // radius*Math.cos(phi));

  modelViewMatrix = lookAt(eye, at, up);
  if (usePersp) {
    console.log('perspective',pfovy,paspect,pnear,pfar);
    projectionMatrix = perspective(pfovy, paspect, pnear, pfar);
  } else {
     console.log('parallel',oleft,oright,obottom,otop,onear,ofar);
    projectionMatrix = ortho(oleft, oright, obottom, otop, onear, ofar);

  }
 
  //projectionMatrix = ortho(-2., 2., -2.0, 2.0, -2., 2);


  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));


  gl.drawArrays(gl.TRIANGLES, 0, numPositions);
  requestAnimationFrame(render);
}
