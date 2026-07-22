/* eslint no-undef: "error" */
/* eslint-env browser */
/* global initShaders, flatten, vec2, vec4 */
'use strict'

let canvas
let gl
const maxNumPositions = 10
let index = 0

const colors = [
  vec4(0.0, 0.0, 0.0, 1.0), // black
  vec4(1.0, 0.0, 0.0, 1.0), // red
  vec4(1.0, 1.0, 0.0, 1.0), // yellow
  vec4(0.0, 1.0, 0.0, 1.0), // green
  vec4(0.0, 0.0, 1.0, 1.0), // blue
  vec4(1.0, 0.0, 1.0, 1.0), // magenta
  vec4(0.0, 1.0, 1.0, 1.0) // cyan
]

window.onload = function init () {
  canvas = document.getElementById('gl-canvas')
  gl = canvas.getContext('webgl2')
  if (!gl) {
    window.alert('WebGL 2.0 is not available')
  }

  const rectW = Math.round(canvas.getBoundingClientRect().width)
  const rectH = Math.round(canvas.getBoundingClientRect().height)

  canvas.addEventListener('mousedown', function md (event) {
    if (index < maxNumPositions) {
      const rectL = canvas.getBoundingClientRect().left
      const rectT = canvas.getBoundingClientRect().top
      const relX = event.clientX - rectL
      const relY = event.clientY - rectT
      gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer)
      let t = vec2(
        2 * relX / Math.round(rectW) - 1,
        2 * (Math.round(rectH) - relY) / Math.round(rectH) - 1)
      document.getElementById('relx').innerHTML = relX
      document.getElementById('rely').innerHTML = relY
      document.getElementById('mousex').innerHTML = event.clientX
      document.getElementById('mousey').innerHTML = event.clientY
      document.getElementById('appx').innerHTML = t[0]
      document.getElementById('appy').innerHTML = t[1]
      gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index, flatten(t))
      gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer)
      t = vec4(colors[index % 7])
      gl.bufferSubData(gl.ARRAY_BUFFER, 16 * index, flatten(t))
      index++
    } else {
      window.alert('Cannot store any more points')
      canvas.removeEventListener('mousedown', md)
    }
  })

  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0.5, 0.5, 0.5, 1.0)

  // load shaders and initialize attribute buffers
  const program = initShaders(gl, 'vertex-shader', 'fragment-shader')
  gl.useProgram(program)

  const vBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, 8 * maxNumPositions, gl.STATIC_DRAW)

  const positionLoc = gl.getAttribLocation(program, 'aPosition')
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLoc)

  const cBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, 16 * maxNumPositions, gl.STATIC_DRAW)

  const colorLoc = gl.getAttribLocation(program, 'aColor')
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(colorLoc)

  render()
}

function render () {
  gl.clear(gl.COLOR_BUFFER_BIT)
  if (index < maxNumPositions) {
    gl.drawArrays(gl.POINTS, 0, index)
    window.requestAnimationFrame(render)
  } else {
    gl.drawArrays(gl.POINTS, 0, maxNumPositions)
  }
}

const heightOutput = document.querySelector('#height')
const widthOutput = document.querySelector('#width')

function reportWindowSize () {
  // heightOutput.textContent = window.innerHeight
  // widthOutput.textContent = window.innerWidth
  document.getElementById('wWidth').innerHTML = window.innerHeight
  document.getElementById('wHeight').innerHTML = window.innerWidth

}

window.onresize = reportWindowSize
