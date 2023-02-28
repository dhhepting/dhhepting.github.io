'use strict'

let canvas, gl, program, texture

var numPositions  = 36;

var texSize = 64;


var flag = true;

var positionsArray = [];
//var colorsArray = [];
var texCoordsArray = [];

const texCoord = [
  vec2(0, 0),
  vec2(0, 1),
  vec2(1, 1),
  vec2(1, 0)
]

const vertices = [
  vec4(-0.5, -0.5,  0.5, 1.0),
  vec4(-0.5,  0.5, 0.5, 1.0),
  vec4(0.5,  0.5, 0.5, 1.0),
  vec4(0.5, -0.5, 0.5, 1.0),
  vec4(-0.5, -0.5, -0.5, 1.0),
  vec4(-0.5,  0.5, -0.5, 1.0),
  vec4(0.5,  0.5, -0.5, 1.0),
  vec4(0.5, -0.5, -0.5, 1.0)
]

// var vertexColors = [
//     vec4(0.0, 0.0, 0.0, 1.0),  // black
//     vec4(1.0, 0.0, 0.0, 1.0),  // red
//     vec4(1.0, 1.0, 0.0, 1.0),  // yellow
//     vec4(0.0, 1.0, 0.0, 1.0),  // green
//     vec4(0.0, 0.0, 1.0, 1.0),  // blue
//     vec4(1.0, 0.0, 1.0, 1.0),  // magenta
//     vec4(0.0, 1.0, 1.0, 1.0),  // white
//     vec4(0.0, 1.0, 1.0, 1.0)   // cyan
// ];

const xAxis = 0
const yAxis = 1
const zAxis = 2
let axis = xAxis
let theta = vec3(45.0, 45.0, 45.0)
let thetaLoc

function configureTexture (image) {
  texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D,texture)
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,gl.NEAREST_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.uniform1i(gl.getUniformLocation(program,'uTexMap'),0)
}

function quad (a, b, c, d) {
  positionsArray.push(vertices[a])
  //colorsArray.push(vertexColors[a])
  texCoordsArray.push(texCoord[0])
  positionsArray.push(vertices[b])
  //colorsArray.push(vertexColors[a])
  texCoordsArray.push(texCoord[1])
  positionsArray.push(vertices[c])
  //colorsArray.push(vertexColors[a])
  texCoordsArray.push(texCoord[2])
  positionsArray.push(vertices[a])
  //colorsArray.push(vertexColors[a])
  texCoordsArray.push(texCoord[0])
  positionsArray.push(vertices[c])
  //colorsArray.push(vertexColors[a])
  texCoordsArray.push(texCoord[2])
  positionsArray.push(vertices[d])
  //colorsArray.push(vertexColors[a])
  texCoordsArray.push(texCoord[3])
}

function textureCube () {
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
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0.9, 0.9, 0.9, 1.0)
  gl.enable(gl.DEPTH_TEST)
  program = initShaders(gl, 'vertex-shader', 'fragment-shader')
  gl.useProgram(program)

  textureCube()

    //var cBuffer = gl.createBuffer();
    //gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW );

    //var colorLoc = gl.getAttribLocation(program, 'aColor');
    //gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    //gl.enableVertexAttribArray(colorLoc);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

    var positionLoc = gl.getAttribLocation(program, 'aPosition');
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

    var texCoordLoc = gl.getAttribLocation(program, 'aTexCoord');
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texCoordLoc);

    const teximage = document.getElementById('texImage')

    configureTexture(teximage)

    thetaLoc = gl.getUniformLocation(program, 'uTheta');

    document.getElementById('ButtonX').onclick = function(){axis = xAxis;};
    document.getElementById('ButtonY').onclick = function(){axis = yAxis;};
    document.getElementById('ButtonZ').onclick = function(){axis = zAxis;};
    document.getElementById('ButtonT').onclick = function(){flag = !flag;};

  render()
}

function render () {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  if (flag) {
    theta[axis] += 2.0
  }
  gl.uniform3fv(thetaLoc, theta)
  gl.drawArrays(gl.TRIANGLES, 0, numPositions)
  window.requestAnimationFrame(render)
}
