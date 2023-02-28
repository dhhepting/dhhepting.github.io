'use strict'
// based on https://interactivecomputergraphics.com/Code/02/triangle.js

// declare variables with global scope
var gl
var points

window.onload = function init () {
  var canvas = document.getElementById('gl-canvas')
  gl = canvas.getContext('webgl2')
  if (!gl) {
    window.alert('WebGL 2.0 is not available')
  }

  // Initialize data for a single triangle
  points = new Float32Array([-1, -1, 0, 1, 1, -1])

  // configure WebGL
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(1.0, 1.0, 1.0, 1.0)

  // load shaders and initialize attribute buffers
  var program = initShaders(gl,'vertex-shader','fragment-shader')
  gl.useProgram(program)

  // load the data into the GPU
  var vBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW)

  // associate shader variables with data buffer
  var aPosition = gl.getAttribLocation(program, 'aPosition')
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(aPosition)

  // render
  render()
}

function render () {
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
}
