/* eslint-disable require-jsdoc */
'use strict';

let gl;
let texTarget;
let attachment;
let level;
let border;
let program;
let imgFormat;
let imgDataType;
let framebuffer;

const numPositions = 36; // 6 faces, 2 triangles each with 3 vertices

const pointsArray = [];
const colorsArray = [];

const vertices = [
  vec4(-0.5, -0.5, 0.5, 1.0),
  vec4(-0.5, 0.5, 0.5, 1.0),
  vec4(0.5, 0.5, 0.5, 1.0),
  vec4(0.5, -0.5, 0.5, 1.0),
  vec4(-0.5, -0.5, -0.5, 1.0),
  vec4(-0.5, 0.5, -0.5, 1.0),
  vec4(0.5, 0.5, -0.5, 1.0),
  vec4(0.5, -0.5, -0.5, 1.0)];

const vertexColors = [
  vec4(0.0, 0.0, 0.0, 1.0), // black
  vec4(0.0, 0.0, 1.0, 1.0), // blue
  vec4(0.0, 1.0, 0.0, 1.0), // green
  vec4(0.0, 1.0, 1.0, 1.0), // cyan
  vec4(1.0, 0.0, 0.0, 1.0), // red
  vec4(1.0, 0.0, 1.0, 1.0), // magenta
  vec4(1.0, 1.0, 0.0, 1.0), // yellow
  vec4(1.0, 1.0, 1.0, 1.0)]; // white

const pickedColor = new Uint8Array(4);
// cube has 6 faces: 1 is blue, 6 is yellow.
// if index into this array is 0, no face was picked -> background
const pickedNames = [
  'background',
  'blue',
  'green',
  'cyan',
  'red',
  'magenta',
  'yellow'];

let rotateOn = true;
const xAxis = 0;
const yAxis = 1;
const zAxis = 2;
let axis = xAxis;
const theta = vec3(45.0, 45.0, 45.0);
let thetaLoc;

function quad(a, b, c, d) {
  pointsArray.push(vertices[a]);
  colorsArray.push(vertexColors[a]);
  pointsArray.push(vertices[b]);
  colorsArray.push(vertexColors[b]);
  pointsArray.push(vertices[c]);
  colorsArray.push(vertexColors[c]);
  pointsArray.push(vertices[a]);
  colorsArray.push(vertexColors[a]);
  pointsArray.push(vertices[c]);
  colorsArray.push(vertexColors[c]);
  pointsArray.push(vertices[d]);
  colorsArray.push(vertexColors[d]);
}

function colorCube() {
  quad(1, 0, 3, 2);
  quad(2, 3, 7, 6);
  quad(3, 0, 4, 7);
  quad(6, 5, 1, 2);
  quad(4, 5, 6, 7);
  quad(5, 4, 0, 1);
}

window.onload = function init() {
  const canvas = document.getElementById('gl-canvas');
  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }
  // assign variables with meaningful names for use in WebGL2 calls
  texTarget = gl.TEXTURE_2D;
  attachment = gl.COLOR_ATTACHMENT0;
  level = 0;
  border = 0;
  imgFormat = gl.RGBA;
  imgDataType = gl.UNSIGNED_BYTE;

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.5, 0.5, 0.5, 1.0);

  gl.enable(gl.CULL_FACE);

  // create a texture to use for off-screen rendering
  const texture = gl.createTexture();
  gl.bindTexture(texTarget, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(texTarget, level, imgFormat, 512, 512, border,
      imgFormat, imgDataType, null);
  gl.generateMipmap(texTarget);

  // Allocate a frame buffer object
  framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  // Attach texture to framebuffer's colour buffer
  gl.framebufferTexture2D(gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0, texTarget, texture, level);
  // check for completeness
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status != gl.FRAMEBUFFER_COMPLETE) {
    alert('Framebuffer is not complete');
  }
  // unbind the framebuffer so that the display is used
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // generate coloured cube
  colorCube();

  //
  //  Load shaders and initialize attribute buffers
  //
  program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram(program);

  // colours buffer
  const cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);
  const colorLoc = gl.getAttribLocation(program, 'aColor');
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(colorLoc);

  // vertices buffer
  const vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
  const positionLoc = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  // get rotation uniform location in shader
  thetaLoc = gl.getUniformLocation(program, 'uTheta');

  // set up handlers for 'onclick' events on each button
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
  let pickDisplay = document.getElementById('picks');
  // add a listener to the canvas to handle 'mousedown' events
  // by rendering into the off-screen framebuffer and returning
  // the simplified colour at the mouse coordinates, which can
  // be used to identify which face (or background) was picked
  canvas.addEventListener('mousedown', function(event) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform3fv(thetaLoc, theta);
    // draw each face of the cube (2 triangles, with 6 vertices)
    // with a different colour by passing an index for the colour
    // to be used by the fragment shader
    for (let i = 0; i < 6; i++) {
      gl.uniform1i(gl.getUniformLocation(program, 'uColorIndex'), i + 1);
      gl.drawArrays(gl.TRIANGLES, 6 * i, 6);
    }
    // get mouse coordinates (x,y)
    const x = event.clientX;
    const y = canvas.height - event.clientY;

    // read colour at mouse coordinates
    gl.readPixels(x, y, 1, 1, imgFormat, imgDataType, pickedColor);

    // convert colour into index into an array of names to identify
    // what has been picked
    let nameIndex = 0;
    // if red component set, add 4 to nameIndex
    if (pickedColor[0] == 255) {
      nameIndex += (1 << 2);
    }
    // if green component set, add 2 to nameIndex
    if (pickedColor[1] == 255) {
      nameIndex += (1 << 1);
    }
    // if blue component set, add 1 to nameIndex
    if (pickedColor[2] == 255) {
      nameIndex += (1 << 0);
    }
    // if no components set, nameIndex will be 0 (background) in pickedNames
    // add the name of what was picked to the interface display
    pickDisplay.value += pickedNames[nameIndex] + ', ';
    // unbind the framebuffer so that the display is used
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // set colour index to 0 which will use the colour from the vertex
    // shader as the fragment colour (normal rendering)
    gl.uniform1i(gl.getUniformLocation(program, 'uColorIndex'), 0);
    // do a normal rendering
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform3fv(thetaLoc, theta);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  });

  render();
};

function render() {
  // normal render
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (rotateOn) {
    theta[axis] += 2.0;
  }
  gl.uniform3fv(thetaLoc, theta);
  // set colour index to 0 which will use the colour from the vertex
  // shader as the fragment colour (normal rendering)
  gl.uniform1i(gl.getUniformLocation(program, 'uColorIndex'), 0);
  gl.drawArrays(gl.TRIANGLES, 0, numPositions);

  requestAnimationFrame(render);
};
