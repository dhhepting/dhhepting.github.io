// renderer.js
import { flatten, identity, mult, translate, rotate } from './MVnew.js';

/* Minimal WebGL2 renderer module for the gasket demo. */

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2');
    if (!this.gl) throw new Error('WebGL2 not available');

    this.program = null;
    this.pBuffer = null;
    this.cBuffer = null;
    this.positionLoc = -1;
    this.aColourLoc = -1;
    this.pointSizeLoc = null;
    this.centeredRotationMatrixLoc = null;
    this.count = 0;
  }

  init() {
    const gl = this.gl;

    // Shader sources (moved from HTML into module)
    const vsSource = `#version 300 es
in vec2 aPosition;
in vec4 aColour;
uniform float uPointSize;
uniform mat3 uCenteredRotationMatrix;
out vec4 vColour;

void main() {
  gl_PointSize = uPointSize;
  vec3 a3pos = vec3(aPosition.x, aPosition.y, 1.0);
  gl_Position = vec4((uCenteredRotationMatrix * a3pos).xy, 0.0, 1.0);
  vColour = aColour;
}
`;

    const fsSource = `#version 300 es
precision mediump float;
in vec4 vColour;
out vec4 fColour;

void main() {
  fColour = vColour;
}
`;

    function compileShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const msg = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new Error('Shader compile error: ' + msg);
      }
      return s;
    }

    const vert = compileShader(gl.VERTEX_SHADER, vsSource);
    const frag = compileShader(gl.FRAGMENT_SHADER, fsSource);
    const prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const msg = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error('Program link error: ' + msg);
    }
    gl.useProgram(prog);
    this.program = prog;

    this.pBuffer = gl.createBuffer();
    this.cBuffer = gl.createBuffer();

    this.positionLoc = gl.getAttribLocation(prog, 'aPosition');
    this.aColourLoc = gl.getAttribLocation(prog, 'aColour');

    // bind buffers but don't upload yet
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pBuffer);
    gl.enableVertexAttribArray(this.positionLoc);
    gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.cBuffer);
    gl.enableVertexAttribArray(this.aColourLoc);
    gl.vertexAttribPointer(this.aColourLoc, 4, gl.FLOAT, false, 0, 0);

    this.pointSizeLoc = gl.getUniformLocation(prog, 'uPointSize');
    this.centeredRotationMatrixLoc = gl.getUniformLocation(prog, 'uCenteredRotationMatrix');

    gl.clearColor(0.5, 0.5, 0.5, 1.0);
  }

  uploadInitialCenters(centres, baseColour) {
    // centres: Array of [x,y]
    const pos = new Float32Array(centres.length * 2);
    const cols = new Float32Array(centres.length * 4);
    for (let i = 0; i < centres.length; ++i) {
      pos[i * 2] = centres[i][0];
      pos[i * 2 + 1] = centres[i][1];
      cols.set(flatten(baseColour), i * 4);
    }
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cols, gl.DYNAMIC_DRAW);
    this.count = centres.length;
  }

  uploadData(positionsFloat32, coloursFloat32) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positionsFloat32, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, coloursFloat32, gl.STATIC_DRAW);
    // count will be set by caller
  }

  render(generatedCount, showCentres, rotateOn, srcX = 0, srcY = 0) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform1f(this.pointSizeLoc, 1.0);
    if (generatedCount > 0) gl.drawArrays(gl.POINTS, 3, generatedCount);

    if (showCentres) {
      gl.uniform1f(this.pointSizeLoc, 8.0);
      gl.drawArrays(gl.POINTS, 0, 3);
    }

    // set rotation matrix uniform
    let crm = identity();
    if (rotateOn) {
      crm = mult(crm, translate(srcX, srcY));
      crm = mult(crm, rotate((++this._srcTheta || 0) % 360));
      crm = mult(crm, translate(-srcX, -srcY));
      this._srcTheta = (this._srcTheta || 0) + 1;
    }
    gl.uniformMatrix3fv(this.centeredRotationMatrixLoc, false, flatten(crm));
  }
}
