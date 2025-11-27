/* eslint-disable require-jsdoc */
'use strict';

let gl;

let theta = 0.0;
let thetaLoc;

let speed = 50;
let toggleDirection = true;

let speedometer;
const sFactor = 1.2;

window.onload = function init() {
  const canvas = document.getElementById('gl-canvas');
  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }

  //
  //  Configure WebGL
  //
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  //  Load shaders and initialize attribute buffers

  const program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram(program);

  const vertices = [
    vec2(0, 1),
    vec2(-1, 0),
    vec2(1, 0),
    vec2(0, -1)];


  // Load the data into the GPU
  const target = gl.ARRAY_BUFFER;
  const usage = gl.STATIC_DRAW;
  const vBuffer = gl.createBuffer();
  const vComponents = 2;
  const componentType = gl.FLOAT;
  const toBeNormalized = false;
  const stride = 0;
  const offset = 0;
  gl.bindBuffer(target, vBuffer);
  gl.bufferData(target, flatten(vertices), usage);

  const positionLoc = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(positionLoc, vComponents, componentType,
      toBeNormalized, stride, offset);
  gl.enableVertexAttribArray(positionLoc);

  thetaLoc = gl.getUniformLocation(program, 'uTheta');

  // Initialize event handlers

  speedometer = document.getElementById('speed-o-meter');

  /* document.getElementById('Controls').onclick = function( event) {
    switch (event.target.index) {
      case 1:
        toggleDirection = !toggleDirection;
        break;
      case 2:
        spinSlower();
        break;
      case 3:
        spinFaster();
        break;
    }
  };
  */
  document.getElementById('direction').onclick = function(event) {
    toggleDirection = !toggleDirection;
  };

  document.getElementById('slower').onclick = function(event) {
    spinSlower();
  };
  document.getElementById('faster').onclick = function(event) {
    spinFaster();
  };

  window.onkeydown = function(event) {
    const key = String.fromCharCode(event.keyCode);
    switch (key) {
      case '1':
        toggleDirection = !toggleDirection;
        break;

      case '2':
        spinSlower();
        break;

      case '3':
        spinFaster();
        break;
    }
  };
  render();
};

function spinSlower() {
  speed /= sFactor;
  if (speed < 1) {
    speed = 0;
  }
  updateSpeedometer();
}

function spinFaster() {
  if (speed > 0) {
    speed *= sFactor;
    if (speed > 100) {
      speed = 100;
    }
  } else {
    speed = 1;
  }
  updateSpeedometer();
}

function updateSpeedometer() {
  speedometer.style.width = speed.toFixed(0) + '%';
  speedometer.ariaValueNow = speed.toFixed(0);
  speedometer.innerText = 'Speed: ' + speed.toFixed(0) + '%';
}
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  if (speed > 0) {
    theta += (toggleDirection ? 0.1 : -0.1);
    gl.uniform1f(thetaLoc, theta);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    setTimeout(
        function() {
          requestAnimationFrame(render);
        },
        100 - speed,
    );
  } else {
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }
}
