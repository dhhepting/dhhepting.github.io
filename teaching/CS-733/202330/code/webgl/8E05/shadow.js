/* eslint-disable require-jsdoc */
'use strict';

function shadow() {
  let canvas;
  let gl;

  const positionsArray = [];

  const near = -4;
  const far = 4;

  let theta = 0.0;

  const left = -2.0;
  const right = 2.0;
  const top = 2.0;
  const bottom = -2.0;

  let modelViewMatrix; let projectionMatrix;
  let modelViewMatrixLoc; let projectionMatrixLoc;

  let colorLoc;

  let eye; let at; let up;
  let light;

  let m;

  let red;
  let black;


  window.onload = function init() {
    canvas = document.getElementById('gl-canvas');

    gl = canvas.getContext('webgl2');
    if (!gl) {
      alert('WebGL 2.0 is not available');
    }

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    light = vec3(0.0, 2.0, 0.0);

    // matrix for shadow projection

    m = mat4();
    m[3][3] = 0;
    m[3][1] = -1/light[1];

    // console.log("m");
    // printm(m);

    at = vec3(0.0, 0.0, 0.0);
    up = vec3(0.0, 1.0, 0.0);
    eye = vec3(1.0, 1.0, 1.0);

    // color square red and shadow black

    red = vec4(1.0, 0.0, 0.0, 1.0);
    black = vec4(0.0, 0.0, 0.0, 1.0);

    // square

    positionsArray.push(vec4(-0.5, 0.5, -0.5, 1.0));
    positionsArray.push(vec4(-0.5, 0.5, 0.5, 1.0));
    positionsArray.push(vec4(0.5, 0.5, 0.5, 1.0));
    positionsArray.push(vec4(0.5, 0.5, -0.5, 1.0));

    //
    //  Load shaders and initialize attribute buffers
    //
    const program = initShaders(gl, 'vertex-shader', 'fragment-shader');
    gl.useProgram(program);

    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'aPosition');
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    colorLoc = gl.getUniformLocation(program, 'uColor');

    modelViewMatrixLoc = gl.getUniformLocation(program, 'uModelViewMatrix');
    projectionMatrixLoc = gl.getUniformLocation(program, 'uProjectionMatrix');

    projectionMatrix = ortho(left, right, bottom, top, near, far);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    render();
  };


  function render() {
    theta += 0.1;
    if (theta > 2*Math.PI) theta -= 2*Math.PI;

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // model-view matrix for square

    modelViewMatrix = lookAt(eye, at, up);

    // send color and matrix for square then render

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniform4fv(colorLoc, red);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    // rotate light source

    light[0] = Math.sin(theta);
    light[2] = Math.cos(theta);

    modelViewMatrix = mult(modelViewMatrix,
        translate(light[0], light[1], light[2]));

    modelViewMatrix = mult(modelViewMatrix, m);

    modelViewMatrix = mult(modelViewMatrix,
        translate(-light[0], -light[1], -light[2]));

    // send color and matrix for shadow

    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniform4fv(colorLoc, black);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    requestAnimationFrame(render);
  };
};

shadow();
