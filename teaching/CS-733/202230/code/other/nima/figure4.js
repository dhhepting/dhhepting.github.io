
let canvas, gl, program

let projectionMatrix, modelViewMatrix, instanceMatrix
let modelViewMatrixLoc
let points = []
let normals = []

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

let angle = 0
let angleSine = 0
let rotateOn = true

const torsoId = 0
const headId = 1
const head1Id = 1
const head2Id = 10
const leftUpperArmId = 2
const leftLowerArmId = 3
const rightUpperArmId = 4
const rightLowerArmId = 5
const leftUpperLegId = 6
const leftLowerLegId = 7
const rightUpperLegId = 8
const rightLowerLegId = 9

const torsoHeight = 5.0
const torsoWidth = 1.0
const upperArmHeight = 3.0
const lowerArmHeight = 2.0
const upperArmWidth = 0.5
const lowerArmWidth = 0.5
const upperLegWidth = 0.5
const lowerLegWidth = 0.5
const lowerLegHeight = 2.0
const upperLegHeight = 3.0
const headHeight = 1.5
const headWidth = 1.0

const numNodes = 10
// const numAngles = 11
// const angle = 0

let theta = [0, 0, 0, 0, 0, 0, 180, 0, 180, 0, 0]

// const numVertices = 24

const stack = []

const figure = []

const pointsArray = []

window.onload = function init () {
  canvas = document.getElementById('gl-canvas')
  gl = canvas.getContext('webgl2')
  if (!gl) {
    alert('WebGL 2.0 is not available')
  }
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0.9, 0.9, 0.9, 1.0)
  //  Load shaders and initialize attribute buffers
  //program = initShaders(gl, 'vertex-shader', 'fragment-shader')
  program = initShaders(gl, 'vertex-shader1', 'fragment-shader1')
  var myCube = cube()
  console.log(myCube)
  points = myCube.TriangleVertices;
  normals = myCube.TriangleNormals;
  colors = myCube.TriangleVertexColors;
  texCoord = myCube.TextureCoordinates;

  let myMaterial = goldMaterial()
  let myLight = light0()
  projectionMatrix = ortho(-1, 1, -1, 1, -100, 100)
  let ambientProduct = mult(myLight.lightAmbient, myMaterial.materialAmbient)
  let diffuseProduct = mult(myLight.lightDiffuse, myMaterial.materialDiffuse)
  let specularProduct = mult(myLight.lightSpecular, myMaterial.materialSpecular)




    // uniforms for each program object
  gl.useProgram(program)
  gl.uniform4fv(gl.getUniformLocation(program, 'ambientProduct'),
      flatten(ambientProduct))
  gl.uniform4fv(gl.getUniformLocation(program, 'diffuseProduct'),
      flatten(diffuseProduct))
  gl.uniform4fv(gl.getUniformLocation(program, 'specularProduct'),
      flatten(specularProduct))
  gl.uniform4fv(gl.getUniformLocation(program, 'lightPosition'),
      flatten(myLight.lightPosition))
  gl.uniform1f(gl.getUniformLocation(program, 'shininess'),
      myMaterial.materialShininess)
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'projectionMatrix'),
      false, flatten(projectionMatrix))

  instanceMatrix = mat4()
  projectionMatrix = ortho(-10.0, 10.0, -10.0, 10.0, -10.0, 10.0)
  modelViewMatrix = mat4()

  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'modelViewMatrix'), false, flatten(modelViewMatrix))
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'projectionMatrix'), false, flatten(projectionMatrix))

  modelViewMatrixLoc = gl.getUniformLocation(program, 'modelViewMatrix')

  for (let i = 0; i < numNodes; i++) {
    figure[i] = createNode(null, null, null, null)
  }



  const vBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW)

  const positionLoc = gl.getAttribLocation(program, 'aPosition')
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLoc)

  const nBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW)

  const normalLoc = gl.getAttribLocation(program, 'aNormal')
  gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(normalLoc)

  document.getElementById('slider0').onchange = function (event) {
    theta[torsoId] = event.target.value
    initNodes(torsoId)
  }
  document.getElementById('slider1').onchange = function (event) {
    theta[head1Id] = event.target.value
    initNodes(head1Id)
  }
  document.getElementById('slider2').onchange = function (event) {
    theta[leftUpperArmId] = event.target.value
    initNodes(leftUpperArmId)
  }
  document.getElementById('slider3').onchange = function (event) {
    theta[leftLowerArmId] = event.target.value
    initNodes(leftLowerArmId)
  }
  document.getElementById('slider4').onchange = function (event) {
    theta[rightUpperArmId] = event.target.value
    initNodes(rightUpperArmId)
  }
  document.getElementById('slider5').onchange = function (event) {
    theta[rightLowerArmId] = event.target.value
    initNodes(rightLowerArmId)
  }
  document.getElementById('slider6').onchange = function (event) {
    theta[leftUpperLegId] = event.target.value
    initNodes(leftUpperLegId)
  }
  document.getElementById('slider7').onchange = function (event) {
    theta[leftLowerLegId] = event.target.value
    initNodes(leftLowerLegId)
  }
  document.getElementById('slider8').onchange = function (event) {
    theta[rightUpperLegId] = event.target.value
    initNodes(rightUpperLegId)
  }
  document.getElementById('slider9').onchange = function (event) {
    theta[rightLowerLegId] = event.target.value
    initNodes(rightLowerLegId)
  }
  document.getElementById('slider10').onchange = function (event) {
    theta[head2Id] = event.target.value
    initNodes(head2Id)
  }

  for (let i = 0; i < numNodes; i++) {
    initNodes(i)
  }
  render()
}

function initNodes (Id) {
  let m = mat4()
  switch (Id) {
    case torsoId:
      m = rotate(theta[torsoId], vec3(0, 1, 0))
      figure[torsoId] = createNode(m, torso, null, headId) //// check it
      break
    case headId:
    case head1Id:
    case head2Id:
      m = translate(0.0, torsoHeight + 0.5 * headHeight, 0.0)
      m = mult(m, rotate(theta[head1Id], vec3(1, 0, 0)))
      m = mult(m, rotate(theta[head2Id], vec3(0, 1, 0)))
      m = mult(m, translate(0.0, -0.5 * headHeight, 0.0))
      figure[headId] = createNode(m, head, leftUpperArmId, null)
      break
    case leftUpperArmId:
      m = translate(-(torsoWidth + upperArmWidth), 0.9 * torsoHeight, 0.0)
      m = mult(m, rotate(theta[leftUpperArmId], vec3(1, 0, 0)))
      figure[leftUpperArmId] = createNode(m, leftUpperArm, rightUpperArmId, leftLowerArmId)
      break
    case rightUpperArmId:
      m = translate(torsoWidth + upperArmWidth, 0.9 * torsoHeight, 0.0)
      m = mult(m, rotate(theta[rightUpperArmId], vec3(1, 0, 0)))
      figure[rightUpperArmId] = createNode(m, rightUpperArm, leftUpperLegId, rightLowerArmId)
      break
    case leftUpperLegId:
      m = translate(-(torsoWidth + upperLegWidth), 0.1 * upperLegHeight, 0.0)
      m = mult(m, rotate(theta[leftUpperLegId], vec3(1, 0, 0)))
      figure[leftUpperLegId] = createNode(m, leftUpperLeg, rightUpperLegId, leftLowerLegId)
      break
    case rightUpperLegId:
      m = translate(torsoWidth + upperLegWidth, 0.1 * upperLegHeight, 0.0)
      m = mult(m, rotate(theta[rightUpperLegId], vec3(1, 0, 0)))
      figure[rightUpperLegId] = createNode(m, rightUpperLeg, null, rightLowerLegId)
      break
    case leftLowerArmId:
      m = translate(0.0, upperArmHeight, 0.0)
      m = mult(m, rotate(theta[leftLowerArmId], vec3(1, 0, 0)))
      figure[leftLowerArmId] = createNode(m, leftLowerArm, null, null)
      break
    case rightLowerArmId:
      m = translate(0.0, upperArmHeight, 0.0)
      m = mult(m, rotate(theta[rightLowerArmId], vec3(1, 0, 0)))
      figure[rightLowerArmId] = createNode(m, rightLowerArm, null, null)
      break
    case leftLowerLegId:
      m = translate(0.0, upperLegHeight, 0.0)
      m = mult(m, rotate(theta[leftLowerLegId], vec3(1, 0, 0)))
      figure[leftLowerLegId] = createNode(m, leftLowerLeg, null, null)
      break
    case rightLowerLegId:
      m = translate(0.0, upperLegHeight, 0.0)
      m = mult(m, rotate(theta[rightLowerLegId], vec3(1, 0, 0)))
      figure[rightLowerLegId] = createNode(m, rightLowerLeg, null, null)
      break
  }
}

function createNode (transform, render, sibling, child) {
  const node = { transform, render, sibling, child }
  return node
}

function traverse (Id) {
  if (Id == null) {
    return
  }
  stack.push(modelViewMatrix)
  modelViewMatrix = mult(modelViewMatrix, figure[Id].transform)
  figure[Id].render()
  if (figure[Id].child != null) {
    traverse(figure[Id].child)
  }
  modelViewMatrix = stack.pop()
  if (figure[Id].sibling != null) {
    traverse(figure[Id].sibling)
  }
}

function torso () {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * torsoHeight, 0.0))
  instanceMatrix = mult(instanceMatrix, scale(torsoWidth, torsoHeight, torsoWidth))
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix))
  /*for (let i = 0; i < 6; i++) {
    gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4)
  }*/
  gl.drawArrays(gl.TRIANGLES, 0, 36)
}

function head () {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * headHeight, 0.0))
  instanceMatrix = mult(instanceMatrix, scale(headWidth, headHeight, headWidth))
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix))
  for (let i = 0; i < 6; i++) {
    gl.drawArrays(gl.TRIANGLES, 0, 36)
  }
}

function leftUpperArm () {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperArmHeight, 0.0))
  instanceMatrix = mult(instanceMatrix, scale(upperArmWidth, upperArmHeight, upperArmWidth))
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix))
  for (let i = 0; i < 6; i++) {
    gl.drawArrays(gl.TRIANGLES, 0, 36)
  }
}

function leftLowerArm () {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerArmHeight, 0.0))
  instanceMatrix = mult(instanceMatrix, scale(lowerArmWidth, lowerArmHeight, lowerArmWidth))
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix))
  for (let i = 0; i < 6; i++) {
    gl.drawArrays(gl.TRIANGLES, 0, 36)
  }
}

function rightUpperArm () {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperArmHeight, 0.0))
  instanceMatrix = mult(instanceMatrix, scale(upperArmWidth, upperArmHeight, upperArmWidth))
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix))
  for (let i = 0; i < 6; i++) {
    gl.drawArrays(gl.TRIANGLES, 0, 36)
  }
}

function rightLowerArm () {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerArmHeight, 0.0))
  instanceMatrix = mult(instanceMatrix, scale(lowerArmWidth, lowerArmHeight, lowerArmWidth))
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix))
  for (let i = 0; i < 6; i++) {
    gl.drawArrays(gl.TRIANGLES, 0, 36)
  }
}

function leftUpperLeg () {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperLegHeight, 0.0))
  instanceMatrix = mult(instanceMatrix, scale(upperLegWidth, upperLegHeight, upperLegWidth))
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix))
  for (let i = 0; i < 6; i++) {
    gl.drawArrays(gl.TRIANGLES, 0, 36)
  }
}

function leftLowerLeg () {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerLegHeight, 0.0))
  instanceMatrix = mult(instanceMatrix, scale(lowerLegWidth, lowerLegHeight, lowerLegWidth))
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix))
  for (let i = 0; i < 6; i++) {
    gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4)
  }
}

function rightUpperLeg () {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperLegHeight, 0.0))
  instanceMatrix = mult(instanceMatrix, scale(upperLegWidth, upperLegHeight, upperLegWidth))
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix))
  for (let i = 0; i < 6; i++) {
    gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4)
  }
}

function rightLowerLeg () {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerLegHeight, 0.0))
  instanceMatrix = mult(instanceMatrix, scale(lowerLegWidth, lowerLegHeight, lowerLegWidth))
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix))
  for (let i = 0; i < 6; i++) {
    gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4)
  }
}

function render () {
  gl.clear(gl.COLOR_BUFFER_BIT)
  if (rotateOn) {
    angle = ((angle + 1.0) % 360)
    angleSine = Math.sin(angle * Math.PI / 180)
    theta[torsoId] = angleSine * 180
    theta[leftLowerLegId] = angleSine * 45
    document.getElementById('slider0').value = theta[torsoId]
    initNodes(torsoId)
    document.getElementById('slider7').value = theta[leftLowerLegId]
    initNodes(leftLowerLegId)
    //theta[LowerArm] = angleSine * 60
    //theta[UpperArm] = angleSine * 30
  }
  traverse(torsoId)
  window.requestAnimationFrame(render)
}
