/* eslint-disable require-jsdoc */
'use strict';


let gl;

const texSize = 256;

// Bump Data
const data = [];
for (let i = 0; i <= texSize; i++) {
  data[i] = [];
}
for (let i = 0; i <= texSize; i++) {
  for (let j = 0; j <= texSize; j++) {
    data[i][j] = 0.0;
  }
}
// once data is initialized to a texSize+1 * texSize+1
// array of 0's, inscribe a square inside it by setting
// array values to 1's
for (let i = texSize / 4; i < 3 * texSize / 4; i++) {
  for (let j = texSize / 4; j < 3 * texSize / 4; j++) {
    data[i][j] = 1.0;
  }
}

// Bump Map Normals
const normalst = [];
for (let i = 0; i < texSize; i++) {
  normalst[i] = [];
}
for (let i = 0; i < texSize; i++) {
  for (let j = 0; j < texSize; j++) {
    normalst[i][j] = [];
  }
}
for (let i = 0; i < texSize; i++) {
  for (let j = 0; j < texSize; j++) {
    normalst[i][j][0] = data[i][j] - data[i+1][j];
    normalst[i][j][1] = data[i][j] - data[i][j+1];
    normalst[i][j][2] = 1;
  }
}

// Scale to Texture Coordinates
for (let i = 0; i < texSize; i++) {
  for (let j = 0; j < texSize; j++) {
    let d = 0;
    for (let k = 0; k < 3; k++) {
      d += normalst[i][j][k] * normalst[i][j][k];
    }
    const dd = Math.sqrt(d);
    for (let k = 0; k < 3; k++) {
      normalst[i][j][k] = 0.5 * normalst[i][j][k] / dd + 0.5;
    }
  }
}

// Normal Texture Array
const normals = new Uint8Array(3 * texSize * texSize);
for (let i = 0; i < texSize; i++) {
  for (let j = 0; j < texSize; j++) {
    for (let k = 0; k < 3; k++) {
      normals[3 * texSize * i + 3 * j + k] = 255 * normalst[i][j][k];
    }
  }
}

const numPositions = 6;

const positionsArray = [];
const texCoordsArray = [];

const texCoord = [
  vec2(0, 0),
  vec2(0, 1),
  vec2(1, 1),
  vec2(1, 0)];

const vertices = [
  vec4(0.0, 0.0, 0.0, 1.0),
  vec4(1.0, 0.0, 0.0, 1.0),
  vec4(1.0, 0.0, 1.0, 1.0),
  vec4(0.0, 0.0, 1.0, 1.0)];

let modelViewMatrix; let projectionMatrix; let nMatrix;

const eye = vec3(2.0, 2.0, 2.0);
const at = vec3(0.5, 0.0, 0.5);
const up = vec3(0.0, 1.0, 0.0);

const normal = vec4(0.0, 1.0, 0.0, 0.0);
const tangent = vec3(1.0, 0.0, 0.0);

const lightPosition = vec4(0.0, 2.0, 0.0, 1.0);
const lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);

const materialDiffuse = vec4(0.7, 0.7, 0.7, 1.0);

let program;

let time = 0;

function configureTexture(image) {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB,
      texSize, texSize, 0, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
};

function mesh() {
  positionsArray.push(vertices[0]);
  texCoordsArray.push(texCoord[0]);
  positionsArray.push(vertices[1]);
  texCoordsArray.push(texCoord[1]);
  positionsArray.push(vertices[2]);
  texCoordsArray.push(texCoord[2]);
  positionsArray.push(vertices[2]); ;
  texCoordsArray.push(texCoord[2]);
  positionsArray.push(vertices[3]);
  texCoordsArray.push(texCoord[3]);
  positionsArray.push(vertices[0]);
  texCoordsArray.push(texCoord[0]);
};

window.onload = function init() {
  const canvas = document.getElementById('gl-canvas');

  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  gl.enable(gl.DEPTH_TEST);

  //
  //  Load shaders and initialize attribute buffers
  //
  program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram(program);

  modelViewMatrix = lookAt(eye, at, up);
  projectionMatrix = ortho(-0.75, 0.75, -0.75, 0.75, -5.5, 5.5);

  nMatrix = normalMatrix(modelViewMatrix, true);

  mesh();

  const vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);
  const positionLoc = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  const tBuffer = gl.createBuffer();
  gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer);
  gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

  const texCoordLoc = gl.getAttribLocation( program, 'aTexCoord');
  gl.vertexAttribPointer( texCoordLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(texCoordLoc);

  configureTexture(normals);

  const diffuseProduct = mult(lightDiffuse, materialDiffuse);

  gl.uniform4fv(
      gl.getUniformLocation(program, 'uDiffuseProduct'), diffuseProduct);
  gl.uniform4fv(
      gl.getUniformLocation(program, 'uLightPosition'), lightPosition);
  gl.uniform4fv(
      gl.getUniformLocation(program, 'uNormal'), normal);
  gl.uniform3fv(
      gl.getUniformLocation(program, 'uObjTangent'), tangent);
  gl.uniformMatrix4fv(
      gl.getUniformLocation(program, 'uModelViewMatrix'),
      false, flatten(modelViewMatrix));
  gl.uniformMatrix4fv(
      gl.getUniformLocation(program, 'uProjectionMatrix'),
      false, flatten(projectionMatrix));
  gl.uniformMatrix3fv(
      gl.getUniformLocation(program, 'uNormalMatrix'), false, flatten(nMatrix));

  render();
};

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  lightPosition[0] = 5.5*Math.sin(0.01*time);
  lightPosition[2] = 5.5*Math.cos(0.01*time);

  time += 1;

  gl.uniform4fv(
      gl.getUniformLocation(program, 'uLightPosition'),
      lightPosition);

  gl.drawArrays(gl.TRIANGLES, 0, numPositions);

  requestAnimationFrame(render);
};
