/* eslint-disable require-jsdoc */
'use strict';

let gl;

const texSize = 16;
// background square texture coordinates that match the
// TRIANGLE vertices (6 for 2 triangles) that make up the
// background square
const texCoord = [
  vec2(0, 0),
  vec2(0, 1),
  vec2(1, 1),
  vec2(1, 1),
  vec2(1, 0),
  vec2(0, 0)];
// quad vertices
const vertices = [
  vec2(-0.5, -0.5),
  vec2(-0.5, 0.5),
  vec2(0.5, 0.5),
  vec2(0.5, 0.5),
  vec2(0.5, -0.5),
  vec2(-0.5, -0.5)];

// vertices for 2 intersecting triangles to be drawn in texture
const positionsArray = [
  vec4(-0.5, -0.5, 0, 1),
  vec4(0.5, -0.5, 0, 1),
  vec4(0.0, 0.5, 0, 1),
  vec4(-0.5, 0.5, 0, 1),
  vec4(0.5, 0.5, 0.25, 1),
  vec4(0.25, -0.5, -0.25, 1)];

let createTT; let useTT;
let texture;

let framebuffer;
let depthbuffer;

window.onload = function init() {
  const canvas = document.getElementById('gl-canvas');

  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }
  gl.activeTexture(gl.TEXTURE0);

  // Create an empty texture
  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
      texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // Allocate a frame buffer object
  framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  // Attach colour buffer
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D, texture, 0);
  // Attach depth buffer
  depthbuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthbuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
      texSize, texSize);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER, depthbuffer);
  // check for completeness
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status != gl.FRAMEBUFFER_COMPLETE) {
    alert('Frame buffer not complete');
  }
  //
  //  Load shaders and initialize attribute buffers
  //
  createTT = initShaders(gl, 'vertex-shader1', 'fragment-shader1');
  useTT = initShaders(gl, 'vertex-shader2', 'fragment-shader2');

  // create the triangles texture
  gl.useProgram(createTT);
  gl.enable(gl.DEPTH_TEST);

  // Create and initialize a buffer object with triangle vertices
  const buffer1 = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer1);
  gl.bufferData(gl.ARRAY_BUFFER,
      flatten(positionsArray), gl.STATIC_DRAW);

  // Initialize the vertex position attribute from the vertex shader
  let positionLoc = gl.getAttribLocation(createTT, 'aPosition');
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  // Render 2 triangle intersecting triangles
  gl.viewport(0, 0, texSize, texSize);
  gl.clearColor(0.5, 0.5, 0.5, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT );
  gl.uniform4f(gl.getUniformLocation(createTT, 'uColor'), 0.9, 0.0, 0.0, 1.0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.uniform4f(gl.getUniformLocation(createTT, 'uColor'), 0.0, 0.9, 0.0, 1.0);
  gl.drawArrays(gl.TRIANGLES, 3, 3);
  gl.generateMipmap(gl.TEXTURE_2D);

  // Bind to window system frame buffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.disableVertexAttribArray(positionLoc);

  // use the triangles texture just created
  gl.useProgram(useTT);

  // send data to GPU for normal render
  const buffer2 = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer2);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

  positionLoc = gl.getAttribLocation(useTT, 'aPosition');
  gl.vertexAttribPointer( positionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  const buffer3 = gl.createBuffer();
  gl.bindBuffer( gl.ARRAY_BUFFER, buffer3);
  gl.bufferData( gl.ARRAY_BUFFER,
      flatten(texCoord), gl.STATIC_DRAW);
  const texCoordLoc = gl.getAttribLocation(useTT, 'aTexCoord');
  gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(texCoordLoc);

  gl.uniform1i(gl.getUniformLocation(useTT, 'uTextureMap'), 0);
  gl.viewport(0, 0, 512, 512);

  render();
};

function render() {
  gl.clearColor(0.0, 0.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // render background square with texture
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
