/* eslint-disable require-jsdoc */
'use strict';

let gl;

let readOrRender = true; // read textureA; render textureB (opposite when false)
let readTexture;
let renderTexture;

const numParticles = 32;
const diffuse = 4.0;
const particleSize = 10.0;
const texSize = 512;
let texTarget;
let attachment;
const level = 0;
let imgFormat;
let imgDataType;
const border = 0;

const texCoord = [
  vec2(0, 0),
  vec2(0, 1),
  vec2(1, 0),
  vec2(1, 1)];

const vertices = [
  vec2(-1.0, -1.0),
  vec2(-1.0, 1.0),
  vec2(1.0, -1.0),
  vec2(1.0, 1.0)];

const particles = [];

let diffuser; let plotter;
let framebuffer;
let textureA; let textureB;

let buffer;
let position1Loc; let position2Loc;
let texCoordLoc;
let texLoc;

window.onload = function init() {
  const canvas = document.getElementById('gl-canvas');
  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }
  gl.viewport(0, 0, texSize, texSize);
  texTarget = gl.TEXTURE_2D;
  attachment = gl.COLOR_ATTACHMENT0;
  imgFormat = gl.RGBA;
  imgDataType = gl.UNSIGNED_BYTE;

  // use a single texture register (0)
  gl.activeTexture(gl.TEXTURE0);

  textureA = gl.createTexture();
  gl.bindTexture(texTarget, textureA);
  gl.texImage2D(texTarget, level, imgFormat,
      texSize, texSize, border, imgFormat, imgDataType, null);
  gl.texParameteri(texTarget, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(texTarget, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(texTarget, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(texTarget, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  readTexture = textureA;

  textureB = gl.createTexture();
  gl.bindTexture(texTarget, textureB);
  gl.texImage2D(texTarget, level, imgFormat,
      texSize, texSize, border, imgFormat, imgDataType, null);
  gl.texParameteri(texTarget, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(texTarget, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(texTarget, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(texTarget, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  renderTexture = textureB;

  //  Load shaders into 2 programs
  diffuser = initShaders(gl, 'vertex-shader1', 'fragment-shader1');
  plotter = initShaders(gl, 'vertex-shader2', 'fragment-shader2');

  // create a framebuffer
  framebuffer = gl.createFramebuffer();
  framebuffer.width = texSize;
  framebuffer.height = texSize;
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,
      attachment, texTarget, renderTexture, level);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status != gl.FRAMEBUFFER_COMPLETE) {
    alert('Framebuffer did not complete');
  }

  // create a single data buffer to store vertices of the square to be
  // textured, particles that will become part of the texture, and the
  // texture coordinates
  buffer = gl.createBuffer();
  // generate numParticles at random in the range x = [-1,1); y = [-1,1)
  for (let i = 0; i < numParticles; i++) {
    particles[i] = vec2(2.0 * Math.random() - 1.0, 2.0 * Math.random() - 1.0);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // 4 vertices for background square (x,y) each requiring 4 bytes = 32 bytes
  // numParticles for texture (x,y) each with 4 bytes = 8 * numParticles bytes
  // 4 texture coordinates (x,y) each requiring 4 bytes = 32 bytes
  const bufferSize = 32 + (8 * numParticles) + 32;
  gl.bufferData(gl.ARRAY_BUFFER, bufferSize, gl.STATIC_DRAW);
  let offset = 0;
  gl.bufferSubData(gl.ARRAY_BUFFER, offset, flatten(vertices));
  offset += 32;
  gl.bufferSubData(gl.ARRAY_BUFFER, offset, flatten(particles));
  offset += 8 * numParticles;
  gl.bufferSubData(gl.ARRAY_BUFFER, offset, flatten(texCoord));

  // connect uniforms and attributes for plotter
  gl.useProgram(plotter);
  gl.uniform1f(gl.getUniformLocation(plotter, 'uPointSize'), particleSize);
  gl.uniform4f(gl.getUniformLocation(plotter, 'uColor'), 0.9, 0.9, 0.0, 1.0);
  position2Loc = gl.getAttribLocation(plotter, 'aPosition2');
  gl.enableVertexAttribArray(position2Loc);
  gl.vertexAttribPointer(position2Loc, 2, gl.FLOAT, false, 0, 0);

  // connect uniforms and attributes for diffuser
  gl.useProgram(diffuser);
  gl.uniform1i(gl.getUniformLocation(diffuser, 'uTextureMap'), 0);
  gl.uniform1f(gl.getUniformLocation(diffuser, 'uDistance'), 1.0 / texSize);
  gl.uniform1f(gl.getUniformLocation(diffuser, 'uScale'), diffuse);
  position1Loc = gl.getAttribLocation(diffuser, 'aPosition1');
  gl.enableVertexAttribArray(position1Loc);
  gl.vertexAttribPointer(position1Loc, 2, gl.FLOAT, false, 0, 0);
  texCoordLoc = gl.getAttribLocation(diffuser, 'aTexCoord');
  gl.enableVertexAttribArray(texCoordLoc);
  gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT,
      false, 0, 32 + 8 * numParticles);

  // start rendering
  render();
};

function render() {
  // render first to framebuffer to update texture
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  // use one texture (read) as the basis for the other (render)
  readTexture = readOrRender ? textureA : textureB;
  renderTexture = readOrRender ? textureB : textureA;
  gl.bindTexture(texTarget, readTexture);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,
      attachment, texTarget, renderTexture, level);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status != gl.FRAMEBUFFER_COMPLETE) {
    alert('Framebuffer did not complete');
  }
  gl.clear(gl.COLOR_BUFFER_BIT);
  // draw the background square with texture into the FBO
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // draw particles
  gl.useProgram(plotter);
  gl.enableVertexAttribArray(position2Loc);
  gl.vertexAttribPointer(position2Loc, 2, gl.FLOAT, false, 0, 0);
  // draw the first half of the particles in the first colour
  // note that the first index in drawArrays is 4, the background
  // square vertices occupy indices 0-3
  gl.uniform4f(gl.getUniformLocation(plotter, 'uColor'), 0.9, 0.9, 0.0, 1.0);
  gl.drawArrays(gl.POINTS, 4, numParticles / 2);
  // draw second half of the particles in the second colour
  gl.uniform4f(gl.getUniformLocation(plotter, 'uColor'), 0.0, 0.0, 0.9, 1.0);
  gl.drawArrays(gl.POINTS, 4 + numParticles / 2, numParticles / 2);

  // diffuse particles
  gl.useProgram(diffuser);
  gl.enableVertexAttribArray(texCoordLoc);
  gl.enableVertexAttribArray(position1Loc);
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 32 + 8 * numParticles);
  gl.vertexAttribPointer(position1Loc, 2, gl.FLOAT, false, 0, 0);
  gl.generateMipmap(texTarget);

  // render to display
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // use the newly modified texture
  gl.bindTexture(texTarget, renderTexture);
  gl.clear(gl.COLOR_BUFFER_BIT);
  // draw the background square with texture
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // get ready for next call
  // move particles in a random direction and wrap around as required
  for (let i = 0; i < numParticles; i++) {
    particles[i][0] += 0.01 * (2.0 * Math.random() - 1.0);
    particles[i][1] += 0.01 * (2.0 * Math.random() - 1.0);
    if (particles[i][0] > 1.0) {
      particles[i][0] -= 2.0;
    }
    if (particles[i][0] < -1.0) {
      particles[i][0] += 2.0;
    }
    if (particles[i][1] > 1.0) {
      particles[i][1] -= 2.0;
    }
    if (particles[i][1] < -1.0) {
      particles[i][1]+= 2.0;
    }
  }
  gl.bufferSubData(gl.ARRAY_BUFFER, 32, flatten(particles));
  // swap roles for textures A and B
  readOrRender = !readOrRender;
  requestAnimationFrame(render);
};

