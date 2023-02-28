'use strict'
// based on https://interactivecomputergraphics.com/Code/02/gasket1.js

// declare variables with global scope
var gl
var positions = []
var numPositions = 10000

window.onload = function init () {
  var canvas = document.getElementById('gl-canvas')
  gl = canvas.getContext('webgl2')
  if (!gl) window.alert('WebGL 2.0 is not available')

  // Initialize data for the Sierpiński Gasket
  // with the 3 vertices of the initial triangle
  var vertices = [vec2(-1, -1), vec2(0, 1), vec2(1, -1)]

  // use the first vertex as the starting point, p
  var p = vertices[0]

  // push that starting point into the array of points
  // to be drawn
  positions.push(p)

  // compute subsequent positions from the previous:
  // -> each new point is located midway between the
  //    last point and a vertex chosen at random
  for (var i = 0; positions.length < numPositions; ++i) {
    var j = Math.floor(3 * Math.random())
    p = add(positions[i], vertices[j])
    p = mult(0.5, p)
    positions.push(p)
  }

  // configure WebGL
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0.9, 0.9, 0.9, 1.0)

  // load shaders and initialize attribute buffers
  var program = initShaders(gl, 'vertex-shader', 'fragment-shader')
  gl.useProgram(program)

  // load the data into the GPU
  var vbuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vbuffer)
  gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW)

  // associate shader variables with data buffer
  var positionLoc = gl.getAttribLocation(program, 'aPosition')
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLoc)

  // render the triangle
  render()
}

function render () {
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.POINTS, 0, positions.length)
}
