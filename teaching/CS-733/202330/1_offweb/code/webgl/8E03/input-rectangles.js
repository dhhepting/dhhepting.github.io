/* eslint-disable require-jsdoc */
'use strict';

let gl;

const maxNumRectangles = 10;
const numVertices = 4;
const maxNumPositions = numVertices * maxNumRectangles;
let rectangles = 0;
let firstclick = true;

const rect = [];
let textOutput;
let cIndex;
let drawMode;

const colours = [
  vec4(0.0, 0.0, 0.0, 1.0), // black
  vec4(1.0, 0.0, 0.0, 1.0), // red
  vec4(1.0, 1.0, 0.0, 1.0), // yellow
  vec4(0.0, 1.0, 0.0, 1.0), // green
  vec4(0.0, 0.0, 1.0, 1.0), // blue
  vec4(1.0, 0.0, 1.0, 1.0), // magenta
  vec4(0.0, 1.0, 1.0, 1.0)]; // cyan

let mo;
window.onload = function init() {
  const canvas = document.getElementById('gl-canvas');

  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.8, 0.8, 0.8, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  mo = document.getElementById('mode-select');
  mo.selectedIndex = drawMode = gl.TRIANGLE_FAN;

  mo.onchange = function(event) {
    const sm = mo.selectedIndex;
    switch (sm) {
      case 1:
        drawMode = gl.POINTS;
        break;
      case 2:
        drawMode = gl.LINE_STRIP;
        break;
      case 3:
        drawMode = gl.LINE_LOOP;
        break;
      case 4:
        drawMode = gl.LINES;
        break;
      case 5:
        drawMode = gl.TRIANGLE_STRIP;
        break;
      case 6:
        drawMode = gl.TRIANGLE_FAN;
        break;
      case 7:
        drawMode = gl.TRIANGLES;
        break;
    }
  };
  //
  //  Load shaders and initialize attribute buffers
  //
  const program = initShaders(gl, 'vertex-shader', 'fragment-shader');
  gl.useProgram(program);

  //
  // Buffers
  //
  const target = gl.ARRAY_BUFFER;
  const usage = gl.STATIC_DRAW;
  const componentType = gl.FLOAT;
  const componentSize = 4; // for gl.FLOAT (32 bits)
  const toBeNormalized = false;
  const stride = 0;
  const offset = 0;

  // Vertices
  const vComponents = 2;
  const vBuffer = gl.createBuffer();
  gl.bindBuffer(target, vBuffer);
  const vSize = vComponents * componentSize * maxNumPositions;
  gl.bufferData(target, vSize, usage);
  const positionLoc = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(positionLoc, vComponents, componentType,
      toBeNormalized, stride, offset);
  gl.enableVertexAttribArray(positionLoc);

  // Colours
  const cComponents = 4;
  const cBuffer = gl.createBuffer();
  gl.bindBuffer(target, cBuffer);
  const cSize = cComponents * componentSize * maxNumPositions;
  gl.bufferData(target, cSize, usage);
  const colorLoc = gl.getAttribLocation(program, 'aColor');
  gl.vertexAttribPointer(colorLoc, cComponents, componentType,
      toBeNormalized, stride, offset);
  gl.enableVertexAttribArray(colorLoc);

  const m = document.getElementById('colour-select');
  m.selectedIndex = cIndex = 1;

  m.onchange = function(event) {
    cIndex = m.selectedIndex;
  };

  m.onclick = function() {
    cIndex = m.selectedIndex;
  };

  textOutput = document.getElementById('output-text');

  canvas.addEventListener('mousedown', function(event) {
    if (rectangles < maxNumRectangles) {
      const bb = canvas.getBoundingClientRect();
      // make event client coordinates relative to canvas bounding box
      const relX = event.clientX - bb.left;
      const relY = event.clientY - bb.top;
      // convert the relative click coordinates into x [-1,1] and y [-1,1]
      // (y gets flipped)
      const mx = 2.0 * relX / canvas.width - 1.0;
      const my = 2.0 * (canvas.height - relY) / canvas.height - 1.0;
      if (firstclick) {
        firstclick = false;
        rect[0] = vec2(mx, my);
      } else {
        // complete rectangle with second click
        firstclick = true;
        rect[2] = vec2(mx, my);
        rect[1] = vec2(rect[0][0], rect[2][1]);
        rect[3] = vec2(rect[2][0], rect[0][1]);
        // display rectangle coordinates on web page
        textOutput.textContent += rectangles + ': [';
        for (let i = 0; i < 4; i++) {
          textOutput.textContent += '(' + (rect[i][0]).toFixed(2) + ', ' +
              (rect[i][1]).toFixed(2) + ')';
          if (i < 3) {
            textOutput.textContent += ', ';
          }
        }
        textOutput.textContent += ']';

        // add data to vertex buffer
        gl.bindBuffer(target, vBuffer);
        const vDstByteOffset = numVertices * vComponents *
          componentSize * rectangles;
        gl.bufferSubData(target, vDstByteOffset, flatten(rect));

        // assign same colour to all 4 vertices
        const rectColour = [];
        for (let i = 0; i < 4; i++) {
          rectColour[i] = vec4(colours[cIndex]);
        }
        // add data to colour buffer
        gl.bindBuffer(target, cBuffer);
        const cDstByteOffset = numVertices * cComponents *
          componentSize * rectangles;
        gl.bufferSubData(target, cDstByteOffset, flatten(rectColour));
        // display rectangle colours on web page
        textOutput.textContent += '\tcolour: (' +
          rectColour[0][0] + ', ' + rectColour[0][1] + ', ' +
          rectColour[0][2] + ', ' + rectColour[0][3] +
          ')\n';

        rectangles++;
      }
    } else {
      textOutput.textContent += 'Maximum number of rectangles reached\n';
    }
  });

  render();
};

function render() {
  const mode = drawMode;
  const count = 4;
  gl.clear(gl.COLOR_BUFFER_BIT);
  for (let r = 0; r < rectangles; r++) {
    const first = r * 4;
    gl.drawArrays(mode, first, count);
  }
  requestAnimationFrame(render);
}
