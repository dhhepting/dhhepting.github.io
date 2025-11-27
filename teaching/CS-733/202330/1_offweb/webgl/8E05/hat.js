/* eslint-disable require-jsdoc */
'use strict';

function hat() {
  let gl;

  const nRows = 50;
  const nColumns = 50;

  // data for radial hat function: sin(Pi*r)/(Pi*r)

  const data = [];
  for (let i = 0; i < nRows; ++i) {
    data.push([]);
    const x = Math.PI*(4*i/nRows-2.0);

    for (let j = 0; j < nColumns; ++j) {
      const y = Math.PI*(4*j/nRows-2.0);
      const r = Math.sqrt(x*x+y*y);

      // take care of 0/0 for r = 0

      data[i][j] = r ? Math.sin(r) / r : 1.0;
    }
  }

  const positionsArray = [];

  let colorLoc;

  let near = -10;
  let far = 10;
  let radius = 1.0;
  let theta = 0.0;
  let phi = 0.0;
  const dr = 5.0 * Math.PI/180.0;

  const black = vec4(0.0, 0.0, 0.0, 1.0);
  const red = vec4(1.0, 0.0, 0.0, 1.0);

  const at = vec3(0.0, 0.0, 0.0);
  const up = vec3(0.0, 1.0, 0.0);

  let left = -2.0;
  let right = 2.0;
  let top = 2.0;
  let bottom = -2.0;
  let modelViewMatrixLoc;
  let projectionMatrixLoc;

  window.onload = function init() {
    const canvas = document.getElementById('gl-canvas');

    gl = canvas.getContext('webgl2');
    if (!gl) alert( 'WebGL 2.0 isn\'t available');

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // enable depth testing and polygon offset
    // so lines will be in front of filled triangles

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

    // vertex array of nRows*nColumns quadrilaterals
    // (two triangles/quad) from data

    for (let i = 0; i < nRows - 1; i++) {
      for (let j = 0; j < nColumns - 1; j++) {
        positionsArray.push(
            vec4(2 * i / nRows - 1,
                data[i][j],
                2 * j / nColumns - 1,
                1.0));
        positionsArray.push(
            vec4(2 * (i + 1) / nRows - 1,
                data[i + 1][j],
                2 * j / nColumns - 1,
                1.0));
        positionsArray.push(
            vec4(2 * (i + 1) / nRows - 1,
                data[i + 1][j + 1],
                2 * (j + 1) / nColumns - 1,
                1.0));
        positionsArray.push(
            vec4(2 * i / nRows - 1,
                data[i][j + 1],
                2 * (j + 1) / nColumns - 1,
                1.0));
      }
    }
    //
    //  Load shaders and initialize attribute buffers
    //
    const program = initShaders(gl, 'vertex-shader', 'fragment-shader');
    gl.useProgram(program);


    const vBufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBufferId);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);
    const positionLoc = gl.getAttribLocation( program, 'aPosition');
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( positionLoc);

    colorLoc = gl.getUniformLocation(program, 'uColor');

    modelViewMatrixLoc = gl.getUniformLocation(program, 'uModelViewMatrix');
    projectionMatrixLoc = gl.getUniformLocation(program, 'uProjectionMatrix');

    // buttons for moving viewer and changing size

    document.getElementById('Button1').onclick = function() {
      near *= 1.1; far *= 1.1;
    };
    document.getElementById('Button2').onclick = function() {
      near *= 0.9; far *= 0.9;
    };
    document.getElementById('Button3').onclick = function() {
      radius *= 2.0;
    };
    document.getElementById('Button4').onclick = function() {
      radius *= 0.5;
    };
    document.getElementById('Button5').onclick = function() {
      theta += dr;
    };
    document.getElementById('Button6').onclick = function() {
      theta -= dr;
    };
    document.getElementById('Button7').onclick = function() {
      phi += dr;
    };
    document.getElementById('Button8').onclick = function() {
      phi -= dr;
    };
    document.getElementById('Button9').onclick = function() {
      left *= 0.9; right *= 0.9;
    };
    document.getElementById('Button10').onclick = function() {
      left *= 1.1; right *= 1.1;
    };
    document.getElementById('Button11').onclick = function() {
      top *= 0.9; bottom *= 0.9;
    };
    document.getElementById('Button12').onclick = function() {
      top *= 1.1; bottom *= 1.1;
    };

    render();
  };


  function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const eye = vec3(radius*Math.sin(theta)*Math.cos(phi),
        radius*Math.sin(theta)*Math.sin(phi),
        radius*Math.cos(theta));

    const modelViewMatrix = lookAt(eye, at, up);
    const projectionMatrix = ortho(left, right, bottom, top, near, far);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // draw each quad as two filled red triangles
    // and then as two black line loops

    for (let i=0; i<positionsArray.length; i+=4) {
      gl.uniform4fv(colorLoc, red);
      gl.drawArrays( gl.TRIANGLE_FAN, i, 4 );
      gl.uniform4fv(colorLoc, black);
      gl.drawArrays( gl.LINE_LOOP, i, 4 );
    }


    requestAnimationFrame(render);
  }
};

hat();
