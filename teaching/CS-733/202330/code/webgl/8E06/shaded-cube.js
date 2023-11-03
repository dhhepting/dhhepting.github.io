/* eslint-disable require-jsdoc */
'use strict';

function shadedCube() {
  let gl;
  let program;

  const numPositions = 36;

  const positionsArray = [];
  const normalsArray = [];

  const vertices = [
    vec4(-0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, 0.5, 0.5, 1.0),
    vec4(0.5, 0.5, 0.5, 1.0),
    vec4(0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5, 0.5, -0.5, 1.0),
    vec4(0.5, 0.5, -0.5, 1.0),
    vec4(0.5, -0.5, -0.5, 1.0)];

  const viewerPosition = vec4(0.0, 0.0, 20.0, 0.0);
  const lightPosition = vec4(0.0, 2.0, 2.0, 0.0);
  const lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
  // const lightAmbient = vec4(1.0, 1.0, 1.0, 1.0);
  const lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
  const lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

  const materialAmbient = vec4(0.0, 0.0, 0.8, 1.0);
  const materialDiffuse = vec4(0.8, 0.8, 0.0, 1.0);
  const materialSpecular = vec4(0.4, 0.4, 0.4, 1.0);
  const materialShininess = 100.0;

  const xAxis = 0;
  const yAxis = 1;
  const zAxis = 2;
  const axis = 0;
  const theta = vec3(0, 0, 0);

  const flag = true;

  function quad(a, b, c, d) {
    const t1 = subtract(vertices[b], vertices[a]);
    const t2 = subtract(vertices[c], vertices[b]);
    let normal = cross(t1, t2);
    //normal = vec4(normal,0.0);
    normal = vec3(normal);
    console.log('cube face normal', normal[0], normal[1], normal[2]);//, normal[3]);

    positionsArray.push(vertices[a]);
    normalsArray.push(normal);
    positionsArray.push(vertices[b]);
    normalsArray.push(normal);
    positionsArray.push(vertices[c]);
    normalsArray.push(normal);
    positionsArray.push(vertices[a]);
    normalsArray.push(normal);
    positionsArray.push(vertices[c]);
    normalsArray.push(normal);
    positionsArray.push(vertices[d]);
    normalsArray.push(normal);
  }

  function colorCube() {
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
  }

  window.onload = function init() {
    const canvas = document.getElementById('gl-canvas');
    gl = canvas.getContext('webgl2');
    if (!gl) {
      alert( 'WebGL 2.0 is not available');
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.8, 0.8, 0.8, 1.0);
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, 'vertex-shader-f', 'fragment-shader-f');
    gl.useProgram(program);

    // generate the data needed for the cube
    colorCube();
    console.log('number of normals', normalsArray.length);

    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);
    const positionLoc = gl.getAttribLocation(program, 'aPosition');
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);
    console.log('positionLoc', positionLoc);

    const nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    const normalLoc = gl.getAttribLocation(program, 'aNormal');
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);
    console.log('normalLoc', normalLoc);

    const projectionMatrix = ortho(-1, 1, -1, 1, -100, 100);

    const ambientProduct = mult(lightAmbient, materialAmbient);
    const diffuseProduct = mult(lightDiffuse, materialDiffuse);
    const specularProduct = mult(lightSpecular, materialSpecular);
    /*
    document.getElementById('ButtonX').onclick = function() {
      axis = xAxis;
    };
    document.getElementById('ButtonY').onclick = function() {
      axis = yAxis;
    };
    document.getElementById('ButtonZ').onclick = function() {
      axis = zAxis;
    };
    document.getElementById('ButtonT').onclick = function() {
      flag = !flag;
    }; */

    gl.uniform4fv(
        gl.getUniformLocation(program, 'uAmbientProduct'), ambientProduct);
    gl.uniform4fv(
        gl.getUniformLocation(program, 'uDiffuseProduct'), diffuseProduct);
    gl.uniform4fv(
        gl.getUniformLocation(program, 'uSpecularProduct'), specularProduct);
    gl.uniform1f(
        gl.getUniformLocation(program, 'uShininess'), materialShininess);
    gl.uniform4fv(
        gl.getUniformLocation(program, 'uLightPosition'), lightPosition);
    gl.uniform4fv(
        gl.getUniformLocation(program, 'uViewerPosition'), viewerPosition);

    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, 'uProjectionMatrix'),
        false, flatten(projectionMatrix));
    render();
  };
  function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (flag) {
      theta[axis] += 2.0;
    }
    let modelViewMatrix = mat4();
    modelViewMatrix = mult(modelViewMatrix,
        rotate(theta[xAxis], vec3(1, 0, 0)));
    modelViewMatrix = mult(modelViewMatrix,
        rotate(theta[yAxis], vec3(0, 1, 0)));
    modelViewMatrix = mult(modelViewMatrix,
        rotate(theta[zAxis], vec3(0, 0, 1)));

    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, 'uModelViewMatrix'),
        false, flatten(modelViewMatrix));
    gl.drawArrays(gl.TRIANGLES, 0, numPositions);
    requestAnimationFrame(render);
  };
};

shadedCube();
