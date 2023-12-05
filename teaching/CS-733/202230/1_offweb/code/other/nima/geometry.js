'use strict'

let canvas, gl, program1, program2, program3
let modelViewMatrix, projectionMatrix, viewerPos

const xAxis = 0
const yAxis = 1
const zAxis = 2
let axis = 0
let theta = vec3(0, 0, 0)

let flag = false
let shady = 0

let points = []
let normals = []
let colors = []
let texCoord = []

const mySpheres = []

window.onload = function init () {
  canvas = document.getElementById('gl-canvas')
  gl = canvas.getContext('webgl2')
  if (!gl) {
    window.alert('WebGL 2.0 is not available')
  }
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(1.0, 1.0, 1.0, 1.0)
  gl.enable(gl.DEPTH_TEST)

  // specify objects and instance them

  for (let i = 0; i < 100; i++) {
    mySpheres[i] = sphere(3)
    let s = 0.3 * (2.0 * Math.random() - 1.0)
    mySpheres[i].scale(s, s, s)
    // mySpheres[i].scale(0.1, 0.1, 0.1)
    mySpheres[i].rotate(360 * Math.random(),
      [2.0 * Math.random() - 1.0, 2.0 * Math.random() - 1.0,
        2.0 * Math.random() - 1.0])

    mySpheres[i].translate(0.5 * (2.0 * Math.random() - 1.0),
      0.5 * (2.0 * Math.random() - 1.0), 0.5 * (2.0 * Math.random() - 1.0))
  }

  points = mySpheres[0].TriangleVertices
  colors = mySpheres[0].TriangleVertexColors
  normals = mySpheres[0].TriangleNormals
  texCoord = mySpheres[0].TextureCoordinates

  for (let i = 1; i < 100; i++) {
    points = points.concat(mySpheres[i].TriangleVertices)
    colors = colors.concat(mySpheres[i].TriangleVertexColors)
    normals = normals.concat(mySpheres[i].TriangleNormals)
    texCoord = texCoord.concat(mySpheres[i].TextureCoordinates)
  }

  // light, material, texture
  let myMaterial = goldMaterial()
  let myLight = light0()
  let texture = checkerboardTexture()

  //
  //  Load shaders and initialize attribute buffers
  //
  program1 = initShaders(gl, 'vertex-shader1', 'fragment-shader1')
  program2 = initShaders(gl, 'vertex-shader2', 'fragment-shader2')
  program3 = initShaders(gl, 'vertex-shader3', 'fragment-shader3')

  // program1: render with lighting
  //    need position and normal attributes sent to shaders
  // program2: render with vertex colors
  //    need position and color attributes sent to shaders
  // program3: render with texture and vertex colors
  //    need position, color and texture coordinate attributes send to shaders

  const cBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW)

  const colorLoc = gl.getAttribLocation(program2, 'aColor')
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(colorLoc)

  const color2Loc = gl.getAttribLocation(program3, 'aColor')
  gl.vertexAttribPointer(color2Loc, 4, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(color2Loc)

  const nBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW)

  const normalLoc = gl.getAttribLocation(program1, 'aNormal')
  gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(normalLoc)

  const vBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW)

  const positionLoc = gl.getAttribLocation(program1, 'aPosition')
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLoc)

  const position2Loc = gl.getAttribLocation(program2, 'aPosition')
  gl.vertexAttribPointer(position2Loc, 4, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(position2Loc)

  const position3Loc = gl.getAttribLocation(program3, 'aPosition')
  gl.vertexAttribPointer(position3Loc, 4, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(position3Loc)

  const tBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoord), gl.STATIC_DRAW)

  var texCoordLoc = gl.getAttribLocation(program3, 'aTexCoord')
  gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(texCoordLoc)

  // set up projection matrix
  viewerPos = vec3(0.0, 0.0, -20.0)
  projectionMatrix = ortho(-1, 1, -1, 1, -100, 100)

  // products of material and light properties
  let ambientProduct = mult(myLight.lightAmbient, myMaterial.materialAmbient)
  let diffuseProduct = mult(myLight.lightDiffuse, myMaterial.materialDiffuse)
  let specularProduct = mult(myLight.lightSpecular, myMaterial.materialSpecular)

  // listeners
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
  document.getElementById('ButtonS').onclick = function () {
    shady = (shady + 1) % 3
  }

  // uniforms for each program object
  gl.useProgram(program1)
  gl.uniform4fv(gl.getUniformLocation(program1, 'ambientProduct'),
    flatten(ambientProduct))
  gl.uniform4fv(gl.getUniformLocation(program1, 'diffuseProduct'),
    flatten(diffuseProduct))
  gl.uniform4fv(gl.getUniformLocation(program1, 'specularProduct'),
    flatten(specularProduct))
  gl.uniform4fv(gl.getUniformLocation(program1, 'lightPosition'),
    flatten(myLight.lightPosition))
  gl.uniform1f(gl.getUniformLocation(program1, 'shininess'),
    myMaterial.materialShininess)
  gl.uniformMatrix4fv(gl.getUniformLocation(program1, 'projectionMatrix'),
    false, flatten(projectionMatrix))

  gl.useProgram(program2)
  gl.uniformMatrix4fv(gl.getUniformLocation(program2, 'projectionMatrix'),
    false, flatten(projectionMatrix))

  gl.useProgram(program3)
  gl.uniformMatrix4fv(gl.getUniformLocation(program3, 'projectionMatrix'),
    false, flatten(projectionMatrix))

  render()
}

function render () {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
// update rotation angles and form modelView matrix
  if (flag) {
    theta[axis] += 2.0
  }
  modelViewMatrix = mat4()
  modelViewMatrix = mult(modelViewMatrix, rotate(theta[xAxis], vec3(1, 0, 0)))
  modelViewMatrix = mult(modelViewMatrix, rotate(theta[yAxis], vec3(0, 1, 0)))
  modelViewMatrix = mult(modelViewMatrix, rotate(theta[zAxis], vec3(0, 0, 1)))

  switch (shady) {
    case 0:
      gl.useProgram(program1)
      gl.uniformMatrix4fv(gl.getUniformLocation(program1,'modelViewMatrix'),
        false, flatten(modelViewMatrix))
      gl.drawArrays(gl.TRIANGLES, 0, points.length)
      break
    case 1:
      gl.useProgram(program2)
      gl.uniformMatrix4fv(gl.getUniformLocation(program2, 'modelViewMatrix'),
        false, flatten(modelViewMatrix))
      gl.drawArrays(gl.TRIANGLES, 0, points.length)
      break
    case 2:
      gl.useProgram(program3)
      gl.uniformMatrix4fv(gl.getUniformLocation(program3, 'modelViewMatrix'),
        false, flatten(modelViewMatrix))
      gl.drawArrays(gl.TRIANGLES, 0, points.length)
      break
  }




// texture + color



    requestAnimationFrame(render)
}