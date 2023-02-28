'use strict'

let canvas, gl, program, texture
const numPositions = 36
// variables related to rotating the cube
let rotateOn = true
const xAxis = 0
const yAxis = 1
const zAxis = 2
let axis = xAxis
let theta = vec3(45.0, 45.0, 45.0)
let thetaLoc

const positionsArray = []
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

window.onload = function init () {
  // set up graphics environment and shaders
  canvas = document.getElementById('gl-canvas')
  gl = canvas.getContext('webgl2')
  if (!gl) {
    alert('WebGL 2.0 is not available')
  }
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0.9, 0.9, 0.9, 1.0)
  gl.enable(gl.DEPTH_TEST)
  program = initShaders(gl, 'vertex-shader', 'fragment-shader')
  gl.useProgram(program)
  // create the cube
  textureCube()
  // handle vertices for cube and connect them with shaders
  const vBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW)
  const positionLoc = gl.getAttribLocation(program, 'aPosition')
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLoc)
  // handle texture coordinates and connect them with shaders
  const tBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW)
  const texCoordLoc = gl.getAttribLocation(program, 'aTexCoord')
  gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(texCoordLoc)
  // load an image for the texture and configure it
  const teximage = document.getElementById('texImage')
  configureTexture(teximage)
  // connect theta (rotation angles) to shaders
  thetaLoc = gl.getUniformLocation(program, 'uTheta')
  // set onclick handlers for buttons
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

function textureCube () {
  // construct a cube from 6 quad faces
  quad(1, 0, 3, 2)
  quad(2, 3, 7, 6)
  quad(3, 0, 4, 7)
  quad(6, 5, 1, 2)
  quad(4, 5, 6, 7)
  quad(5, 4, 0, 1)
}

function quad (a, b, c, d) {
  positionsArray.push(vertices[a])
  texCoordsArray.push(texCoord[0])
  positionsArray.push(vertices[b])
  texCoordsArray.push(texCoord[1])
  positionsArray.push(vertices[c])
  texCoordsArray.push(texCoord[2])
  positionsArray.push(vertices[a])
  texCoordsArray.push(texCoord[0])
  positionsArray.push(vertices[c])
  texCoordsArray.push(texCoord[2])
  positionsArray.push(vertices[d])
  texCoordsArray.push(texCoord[3])
}

function configureTexture (image) {
  // create texture and connect it with shaders
  texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.uniform1i(gl.getUniformLocation(program, 'uTexMap'), 0)
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
