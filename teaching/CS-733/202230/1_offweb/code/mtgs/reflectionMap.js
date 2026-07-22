'use strict'

let canvas, gl, program

const numPositions = 36

// let texSize = 4
// var numChecks = 2

const xAxis = 0
const yAxis = 1
const zAxis = 2
let axis = xAxis

var theta = vec3(0.0, 0.0, 0.0)
var flag = true
var cubeMap

var positionsArray = []
var normalsArray = []

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
  canvas = document.getElementById('gl-canvas')
  gl = canvas.getContext('webgl2')
  if (!gl) {
    window.alert('WebGL 2.0 is not available')
  }
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0.9, 0.9, 0.9, 1.0)
  gl.enable(gl.DEPTH_TEST)

  //  Load shaders and initialize attribute buffers
  program = initShaders(gl, 'vertex-shader', 'fragment-shader')
  gl.useProgram(program)

  colorCube()

  const nBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW)
  const normalLoc = gl.getAttribLocation(program, 'aNormal')
  gl.vertexAttribPointer(normalLoc, 4, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(normalLoc)

  const vBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW)
  const positionLoc = gl.getAttribLocation(program, 'aPosition')
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLoc)

  const projectionMatrix = ortho(-2, 2, -2, 2, -10, 10)
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjectionMatrix'), false, flatten(projectionMatrix))

  configureCubeMap()
  gl.activeTexture(gl.TEXTURE0)
  gl.uniform1i(gl.getUniformLocation(program, 'uTexMap'), 0)

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
    flag = !flag
  }
  render()
}

function colorCube () {
  quad(1, 0, 3, 2)
  quad(2, 3, 7, 6)
  quad(3, 0, 4, 7)
  quad(6, 5, 1, 2)
  quad(4, 5, 6, 7)
  quad(5, 4, 0, 1)
}

function quad (a, b, c, d) {
  const t1 = subtract(vertices[b], vertices[a])
  const t2 = subtract(vertices[c], vertices[a])
  const temp = cross(t1, t2)
  const normal = vec4(temp[0], temp[1], temp[2], 0.0)

  positionsArray.push(vertices[a])
  normalsArray.push(normal)

  positionsArray.push(vertices[b])
  normalsArray.push(normal)

  positionsArray.push(vertices[c])
  normalsArray.push(normal)

  positionsArray.push(vertices[a])
  normalsArray.push(normal)

  positionsArray.push(vertices[c])
  normalsArray.push(normal)

  positionsArray.push(vertices[d])
  normalsArray.push(normal)
}

function configureCubeMap () {
  cubeMap = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap)
  const teximage = document.getElementById('texImage')
  const level = 0
  const internalFormat = gl.RGBA
  const width = 512
  const height = 512
  const format = gl.RGBA
  const type = gl.UNSIGNED_BYTE
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, level, internalFormat, width, height, 0, format, type, teximage)
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, level, internalFormat, width, height, 0, format, type, teximage)
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, level, internalFormat, width, height, 0, format, type, teximage)
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, level, internalFormat, width, height, 0, format, type, teximage)
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, level, internalFormat, width, height, 0, format, type, teximage)
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, level, internalFormat, width, height, 0, format, type, teximage)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
}

function render () {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  if (flag) {
    theta[axis] += 2.0
  }
  const eye = vec3(0.0, 0.0, 1.0)
  const at = vec3(0.0, 0.0, 0.0)
  const up = vec3(0.0, 1.0, 0.0)
  let modelViewMatrix = lookAt(eye, at, up)
  modelViewMatrix = mult(modelViewMatrix, rotate(theta[xAxis], vec3(1, 0, 0)))
  modelViewMatrix = mult(modelViewMatrix, rotate(theta[yAxis], vec3(0, 1, 0)))
  modelViewMatrix = mult(modelViewMatrix, rotate(theta[zAxis], vec3(0, 0, 1)))
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModelViewMatrix'), false, flatten(modelViewMatrix))
  // matrix to orient the normals
  const nMatrix = normalMatrix(modelViewMatrix, true)
  gl.uniformMatrix3fv(gl.getUniformLocation(program, 'uNormalMatrix'), false, flatten(nMatrix))
  gl.drawArrays(gl.TRIANGLES, 0, numPositions)
  window.requestAnimationFrame(render)
}
