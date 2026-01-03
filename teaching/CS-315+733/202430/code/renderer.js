import { flatten, randVec2 } from './utils.js';
import PingPongFBO from './fbo.js';
import { vertDiffuse, vertPlotter, fragDiffuse, fragPlotter } from './shaders.js';

export default class Renderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2');
    if (!this.gl) throw new Error('WebGL 2.0 is not available');

    const gl = this.gl;
    this.texSize = opts.texSize || 512;
    this.numParticles = opts.numParticles || 32;
    this.diffuse = opts.diffuse || 4.0;
    this.particleSize = opts.particleSize || 10.0;

    gl.viewport(0, 0, this.texSize, this.texSize);

    this.fbo = new PingPongFBO(gl, this.texSize);

    // programs
    this.diffuser = this._createProgram(vertDiffuse, fragDiffuse);
    this.plotter = this._createProgram(vertPlotter, fragPlotter);

    // geometry data
    this.vertices = [
      [-1.0, -1.0],
      [-1.0, 1.0],
      [1.0, -1.0],
      [1.0, 1.0],
    ];
    this.texCoord = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ];

    this.particles = new Array(this.numParticles).fill(null).map(() => randVec2());

    // combined buffer: vertices, particles, texcoords
    this._setupBuffer();

    // attribute / uniform locations
    this._setupPrograms();

    this._running = false;
    this.debug = false;
  }

  start() {
    if (!this._running) {
      this._running = true;
      requestAnimationFrame(this._frame.bind(this));
    }
  }

  stop() {
    this._running = false;
  }

  setDiffuse(v) {
    this.diffuse = v;
    // update uniform if program active next frame
  }

  setDebug(v) {
    this.debug = !!v;
  }

  _setupBuffer() {
    const gl = this.gl;
    const verts = flatten(this.vertices);
    const parts = flatten(this.particles);
    const tcs = flatten(this.texCoord);
    // combine into one Float32Array
    this.vertexCount = this.vertices.length;
    const combined = new Float32Array(verts.length + parts.length + tcs.length);
    combined.set(verts, 0);
    combined.set(parts, verts.length);
    combined.set(tcs, verts.length + parts.length);

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, combined, gl.DYNAMIC_DRAW);

    // store byte offsets
    this.offsetVertices = 0;
    this.byteOffsetParticles = verts.length * 4; // floats -> bytes
    this.byteOffsetTexCoord = (verts.length + parts.length) * 4;
  }

  _setupPrograms() {
    const gl = this.gl;

    // Plotter program
    gl.useProgram(this.plotter);
    this.pos2Loc = gl.getAttribLocation(this.plotter, 'aPosition2');
    gl.enableVertexAttribArray(this.pos2Loc);
    gl.vertexAttribPointer(this.pos2Loc, 2, gl.FLOAT, false, 0, this.byteOffsetParticles);
    gl.uniform1f(gl.getUniformLocation(this.plotter, 'uPointSize'), this.particleSize);

    // Diffuser
    gl.useProgram(this.diffuser);
    gl.uniform1i(gl.getUniformLocation(this.diffuser, 'uTextureMap'), 0);
    gl.uniform1f(gl.getUniformLocation(this.diffuser, 'uDistance'), 1.0 / this.texSize);
    gl.uniform1f(gl.getUniformLocation(this.diffuser, 'uScale'), this.diffuse);

    this.pos1Loc = gl.getAttribLocation(this.diffuser, 'aPosition1');
    this.texCoordLoc = gl.getAttribLocation(this.diffuser, 'aTexCoord');
    gl.enableVertexAttribArray(this.pos1Loc);
    gl.vertexAttribPointer(this.pos1Loc, 2, gl.FLOAT, false, 0, this.offsetVertices);
    gl.enableVertexAttribArray(this.texCoordLoc);
    gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, this.byteOffsetTexCoord);
  }

  _createShader(type, source) {
    const gl = this.gl;
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error('Shader compile error: ' + err);
    }
    return s;
  }

  _createProgram(vsSource, fsSource) {
    const gl = this.gl;
    const vs = this._createShader(gl.VERTEX_SHADER, vsSource);
    const fs = this._createShader(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const err = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error('Program link error: ' + err);
    }
    return program;
  }

  _frame() {
    const gl = this.gl;

    // 1) Render into FBO (write texture) using current read texture
    this.fbo.bindForWrite();
    // bind read texture to texture unit 0
    this.fbo.bindForRead(0);

    // draw background textured quad into FBO using diffuser
    gl.useProgram(this.diffuser);
    // ensure attributes point to correct buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.vertexAttribPointer(this.pos1Loc, 2, gl.FLOAT, false, 0, this.offsetVertices);
    gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, this.byteOffsetTexCoord);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 2) Draw particles into FBO (so they get baked into the texture)
    gl.useProgram(this.plotter);
    gl.vertexAttribPointer(this.pos2Loc, 2, gl.FLOAT, false, 0, this.byteOffsetParticles);
    gl.uniform4f(gl.getUniformLocation(this.plotter, 'uColor'), 0.9, 0.9, 0.0, 1.0);
    gl.drawArrays(gl.POINTS, 4, Math.floor(this.numParticles / 2));
    gl.uniform4f(gl.getUniformLocation(this.plotter, 'uColor'), 0.0, 0.0, 0.9, 1.0);
    gl.drawArrays(gl.POINTS, 4 + Math.floor(this.numParticles / 2), Math.ceil(this.numParticles / 2));

    // 3) Swap ping-pong textures so this newly written texture becomes the read texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fbo.swap();

    // 4) Render to screen using the texture we just wrote (now read texture)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    this.fbo.bindForRead(0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.diffuser);
    gl.vertexAttribPointer(this.pos1Loc, 2, gl.FLOAT, false, 0, this.offsetVertices);
    gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, this.byteOffsetTexCoord);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 5) Update particles and buffer
    for (let i = 0; i < this.numParticles; i++) {
      this.particles[i][0] += 0.01 * (2.0 * Math.random() - 1.0);
      this.particles[i][1] += 0.01 * (2.0 * Math.random() - 1.0);
      if (this.particles[i][0] > 1.0) this.particles[i][0] -= 2.0;
      if (this.particles[i][0] < -1.0) this.particles[i][0] += 2.0;
      if (this.particles[i][1] > 1.0) this.particles[i][1] -= 2.0;
      if (this.particles[i][1] < -1.0) this.particles[i][1] += 2.0;
    }
    // update particle subrange in buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, this.byteOffsetParticles, flatten(this.particles));

    // 6) Optionally draw debug view of both ping-pong textures
    if (this.debug) {
      const cw = this.canvas.width;
      const ch = this.canvas.height;
      const size = Math.min(128, Math.floor(cw / 4));
      // draw write texture (the one not currently read) at top-right
      gl.useProgram(this.diffuser);
      // save viewport
      const prevViewport = gl.getParameter(gl.VIEWPORT);

      // small square top-right
      gl.viewport(cw - size - 10, ch - size - 10, size, size);
      // bind write texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.fbo.getWriteTexture());
      gl.vertexAttribPointer(this.pos1Loc, 2, gl.FLOAT, false, 0, this.offsetVertices);
      gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, this.byteOffsetTexCoord);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // small square above that: read texture
      gl.viewport(cw - size - 10, ch - (2 * size) - 20, size, size);
      gl.bindTexture(gl.TEXTURE_2D, this.fbo.getReadTexture());
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // restore viewport
      gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3]);
    }

    if (this._running) requestAnimationFrame(this._frame.bind(this));
  }
}
