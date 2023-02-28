'use strict'
// based on https://interactivecomputergraphics.com/Code/02/triangle.js

// declare global variables
var gl
var points
var colours

window.onload = function init () {
  var canvas = document.getElementById('gl-canvas')
  gl = canvas.getContext('webgl2')
  if (!gl) {
    window.alert('WebGL 2.0 is not available')
  }

  // configure WebGL
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0.0, 1.0, 0.0, 1.0)

  // load shaders and initialize attribute buffers
  var program = initShaders(gl, 'vertex-shader', 'fragment-shader')
  gl.useProgram(program)

  // initialize points (vertices) array
  points = new Float32Array([-1, -1, 0, -1, 0, 0.5, 1, -1, 1, 0, 0, 0])

  // create a vertex buffer and load that vertex data
  var vBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW)

  // associate shader variables with data buffer
  var aPosition = gl.getAttribLocation(program, 'aPosition')
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(aPosition)

  // initialize colours (RGBA)
  colours = new Float32Array([
    1.0, 0.0, 0.0, 1.0,
    1.0, 1.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    0.0, 1.0, 1.0, 1.0,
    1.0, 0.0, 1.0, 1.0,
    0.0, 1.0, 1.0, 1.0
  ])

  // create a colour buffer and load that colour data
  var cBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, colours, gl.STATIC_DRAW)

  // associate shader variables with data buffer
  var aColour = gl.getAttribLocation(program, 'aColor')
  gl.vertexAttribPointer(aColour, 4, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(aColour)

  // render
  render()
}

function render () {
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
}
