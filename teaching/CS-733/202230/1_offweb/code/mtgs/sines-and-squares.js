/* eslint-disable require-jsdoc */
'use strict'

let canvas, gl, program, texture1, texture2

const numPositions = 36
const texSize = 256
const numChecks = 4

let rotateOn = true

const image1 = new Uint8Array(4 * texSize * texSize)
const image2 = new Uint8Array(4 * texSize * texSize)

const positionsArray = []
const colorsArray = []
const texCoordsArray = []

const texCoord = [
  vec2(0, 0),
  vec2(0, 1),
  vec2(1, 1),
  vec2(1, 0)
]

const vertices = [
  vec4(-0.5, -0.5, 0.5, 1.0),
  vec4(-0.5, 0.5, 0.5, 1.0),
  vec4(0.5, 0.5, 0.5, 1.0),
  vec4(0.5, -0.5, 0.5, 1.0),
  vec4(-0.5, -0.5, -0.5, 1.0),
  vec4(-0.5, 0.5, -0.5, 1.0),
  vec4(0.5, 0.5, -0.5, 1.0),
  vec4(0.5, -0.5, -0.5, 1.0)
]

const vertexColors = [
  vec4(0.0, 0.0, 0.0, 1.0),  // black
  vec4(1.0, 0.0, 0.0, 1.0),  // red
  vec4(1.0, 1.0, 0.0, 1.0),  // yellow
  vec4(0.0, 1.0, 0.0, 1.0),  // green
  vec4(0.0, 0.0, 1.0, 1.0),  // blue
  vec4(1.0, 0.0, 1.0, 1.0),  // magenta
  vec4(0.0, 1.0, 1.0, 1.0),  // white
  vec4(0.0, 1.0, 1.0, 1.0)   // cyan
]

const xAxis = 0
const yAxis = 1
const zAxis = 2
let axis = xAxis
let theta = vec3(45.0, 45.0, 45.0)
let thetaLoc

function configureTexture () {
  checkersquares(image1)
  texture1 = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture1)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image1)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  checkersines(image2)
  texture2 = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture2)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image2)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
}

function checkersquares (image) {
  let c = 0
  for (let i = 0; i < texSize; i++) {
    for (let j = 0; j < texSize; j++) {
      const patchx = Math.floor(i / (texSize / numChecks))
      const patchy = Math.floor(j / (texSize / numChecks))
      if (patchx % 2 ^ patchy % 2) {
        c = 255
      } else {
        c = 128
      }
      image[4 * i * texSize + 4 * j + 0] = c
      image[4 * i * texSize + 4 * j + 1] = c
      image[4 * i * texSize + 4 * j + 2] = c
      image[4 * i * texSize + 4 * j + 3] = 128
    }
  }
}

function checkersines (image) {
  // Create a pattern based on sines
  for (let i = 0; i < texSize; i++) {
    for (let j = 0; j < texSize; j++) {
      image[4 * i * texSize + 4 * j + 0] = 127 + 127 * Math.sin(0.1 * i * j)
      image[4 * i * texSize + 4 * j + 1] = 127 + 127 * Math.sin(0.1 * i * j)
      image[4 * i * texSize + 4 * j + 2] = 127 + 127 * Math.sin(0.1 * i * j)
      image[4 * i * texSize + 4 * j + 3] = 255
    }
  }
}

function quad (a, b, c, d) {
  positionsArray.push(vertices[a])
  colorsArray.push(vertexColors[a])
  texCoordsArray.push(texCoord[0])
  positionsArray.push(vertices[b])
  colorsArray.push(vertexColors[a])
  texCoordsArray.push(texCoord[1])
  positionsArray.push(vertices[c])
  colorsArray.push(vertexColors[a])
  texCoordsArray.push(texCoord[2])
  positionsArray.push(vertices[a])
  colorsArray.push(vertexColors[a])
  texCoordsArray.push(texCoord[0])
  positionsArray.push(vertices[c])
  colorsArray.push(vertexColors[a])
  texCoordsArray.push(texCoord[2])
  positionsArray.push(vertices[d])
  colorsArray.push(vertexColors[a])
  texCoordsArray.push(texCoord[3])
}

function colorCube () {
  quad(1, 0, 3, 2)
  quad(2, 3, 7, 6)
  quad(3, 0, 4, 7)
  quad(6, 5, 1, 2)
  quad(4, 5, 6, 7)
  quad(5, 4, 0, 1)
}

window.onload = function init () {
  canvas = document.getElementById('gl-canvas')
  gl = canvas.getContext('webgl2')
  if (!gl) {
    alert('WebGL 2.0 is not available')
  }
  const maxVertexTextureUnits = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
 const maxFragmentTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
 const maxCombinedTextureUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
  console.log(maxVertexTextureUnits);
  console.log(maxFragmentTextureUnits);
  console.log(maxCombinedTextureUnits);
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0.9, 0.9, 0.9, 1.0)
  gl.enable(gl.DEPTH_TEST)
  //  Load shaders and initialize attribute buffers
  program = initShaders(gl, 'vertex-shader', 'fragment-shader')
  gl.useProgram(program)

  colorCube()

  const cBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW)
  const colorLoc = gl.getAttribLocation(program, 'aColor')
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(colorLoc)

  const vBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW)
  const positionLoc = gl.getAttribLocation(program, 'aPosition')
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLoc)

  const tBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW)
  const texCoordLoc = gl.getAttribLocation(program, 'aTexCoord')
  gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(texCoordLoc)
  configureTexture()
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texture1)
  gl.uniform1i(gl.getUniformLocation(program, 'uTex0'), 0)
  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, texture2)
  gl.uniform1i(gl.getUniformLocation(program, 'uTex1'), 1)

  thetaLoc = gl.getUniformLocation(program, 'uTheta')

  document.getElementById('ButtonX').onclick = function () {
    axis = xAxis
  }
  document.getElementById('ButtonY').onclick = function () {
    axis = yAxis
  }
  document.getElementById('ButtonZ').onclick = function () {
    axis = zAxis
  }
  document.getElementById('ButtonT').onclick = function () {
    rotateOn = !rotateOn
  }
  render()
}

function render () {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  if (rotateOn) {
    theta[axis] += 2.0
  }
  gl.uniform3fv(thetaLoc, theta)
  gl.drawArrays(gl.TRIANGLES, 0, numPositions)
  window.requestAnimationFrame(render)
}
