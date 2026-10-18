// chaosgame.mjs -- DOM-free renderer for a two-map chaos game.
//
// The dependency points one way: main.mjs (controller) -> ChaosGame.
// Nothing here touches `document`; the API speaks in geometry (centres,
// scales, angles, point counts), not in UI vocabulary.

import {
  empathic,
  chaosGame,
  makeChoices,
  viewMatrix,
  worldAt,
} from './ifs.mjs';

export const MAX_POINTS = 400000;

// One colour per transformation (RGB, 0..1). Exported so the controller
// can colour its labels to match the picture.
export const MAP_COLOURS = [
  [0.10, 0.35, 0.85],
  [0.88, 0.30, 0.10],
];

const OUTLINE_COLOUR = [0.13, 0.13, 0.13];

export class ChaosGame {
  #gl;
  #program;
  #uniforms;

  #pointVao;
  #positionBuffer;
  #mapBuffer;

  #centreVao;
  #centrePositionBuffer;
  #centreMapBuffer;

  #positions = new Float32Array(MAX_POINTS * 2);
  #choices;
  #seed = 1;

  #transforms = [];
  #mats = [];

  #count = 100000;
  #pointSize = 1.5;
  #showCentres = true;
  #view = { cx: 0.5, cy: 0.15, half: 1.25 };

  #width = 1;
  #height = 1;
  #dpr = 1;

  #pointsDirty = true;
  #choicesDirty = true;
  #frameDirty = true;
  #lastGenerateMs = 0;

  // `program` comes from initShaders(gl, vertSource, fragSource).
  constructor(gl, program) {
    this.#gl = gl;
    this.#uniforms = {
      view: gl.getUniformLocation(program, 'uView'),
      pointSize: gl.getUniformLocation(program, 'uPointSize'),
      color0: gl.getUniformLocation(program, 'uColor0'),
      color1: gl.getUniformLocation(program, 'uColor1'),
      round: gl.getUniformLocation(program, 'uRound'),
    };
    this.#program = program;

    // --- the chaos-game points: position (vec2) + map index (0 or 1)
    this.#pointVao = gl.createVertexArray();
    gl.bindVertexArray(this.#pointVao);

    this.#positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.#positions.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.#mapBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#mapBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, MAX_POINTS, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    // integer bytes 0/1 arrive in the shader as float 0.0/1.0
    gl.vertexAttribPointer(1, 1, gl.UNSIGNED_BYTE, false, 0, 0);

    // --- the two centre handles
    this.#centreVao = gl.createVertexArray();
    gl.bindVertexArray(this.#centreVao);

    this.#centrePositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#centrePositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 4 * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.#centreMapBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#centreMapBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array([0, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.UNSIGNED_BYTE, false, 0, 0);

    gl.bindVertexArray(null);
    gl.clearColor(1, 1, 1, 1);
  }

  // ------------------------------------------------------------ the maps

  // Exactly two { centre: [x, y], scale, angle } records.
  setTransforms(list) {
    if (list.length !== 2) {
      throw new Error('ChaosGame draws exactly two transformations');
    }
    this.#transforms = list.map((t) => ({
      centre: [t.centre[0], t.centre[1]],
      scale: t.scale,
      angle: t.angle,
    }));
    this.#rebuildMatrices();
  }

  getTransforms() {
    return this.#transforms.map((t) => ({
      centre: [t.centre[0], t.centre[1]],
      scale: t.scale,
      angle: t.angle,
    }));
  }

  // Move one centre; scale and angle are untouched.
  setCentre(i, x, y) {
    this.#transforms[i].centre = [x, y];
    this.#rebuildMatrices();
  }

  // The current 3x3 matrix of map i (a copy)
  getMatrix(i) {
    return Float64Array.from(this.#mats[i]);
  }

  #rebuildMatrices() {
    this.#mats = this.#transforms.map(empathic);
    this.#pointsDirty = true;
    this.#frameDirty = true;
  }

  // ------------------------------------------------------------ settings

  setCount(n) {
    this.#count = Math.max(1, Math.min(MAX_POINTS, Math.floor(n)));
    this.#pointsDirty = true;
    this.#frameDirty = true;
  }

  // New random sequence of map choices. Same seed -> same picture.
  reroll(seed) {
    this.#seed = seed >>> 0;
    this.#choicesDirty = true;
    this.#pointsDirty = true;
    this.#frameDirty = true;
  }

  setPointSize(px) {
    this.#pointSize = px;
    this.#frameDirty = true;
  }

  setShowCentres(on) {
    this.#showCentres = on;
    this.#frameDirty = true;
  }

  get lastGenerateMs() {
    return this.#lastGenerateMs;
  }

  // ---------------------------------------------------------------- view

  // width/height in device pixels; dpr = device pixels per CSS pixel
  resize(width, height, dpr) {
    this.#width = Math.max(1, width);
    this.#height = Math.max(1, height);
    this.#dpr = dpr;
    this.#gl.canvas.width = this.#width;
    this.#gl.canvas.height = this.#height;
    this.#frameDirty = true;
  }

  // u, v in [0, 1] across the canvas, v pointing up -> world [x, y]
  worldAt(u, v) {
    return worldAt(this.#view, this.#width / this.#height, u, v);
  }

  // ------------------------------------------------------------- drawing

  #regenerate() {
    const gl = this.#gl;
    const nMaps = this.#transforms.length;

    if (this.#choicesDirty) {
      this.#choices = makeChoices(MAX_POINTS, nMaps, this.#seed);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#mapBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.#choices);
      this.#choicesDirty = false;
    }

    const t0 = performance.now();
    // Centre 0 is the fixed point of map 0, hence a point of the attractor
    chaosGame(
      this.#mats,
      this.#choices,
      this.#count,
      this.#transforms[0].centre,
      this.#positions,
    );
    this.#lastGenerateMs = performance.now() - t0;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.#positionBuffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      0,
      this.#positions.subarray(0, this.#count * 2),
    );
    this.#pointsDirty = false;
  }

  // Returns true if it drew a frame, false if nothing had changed.
  render() {
    const gl = this.#gl;
    if (this.#pointsDirty) {
      this.#regenerate();
    }
    if (!this.#frameDirty) {
      return false;
    }

    gl.viewport(0, 0, this.#width, this.#height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.#program);

    gl.uniformMatrix3fv(
      this.#uniforms.view,
      false,
      viewMatrix(this.#view, this.#width / this.#height),
    );

    // 1. the attractor
    gl.uniform1i(this.#uniforms.round, 0);
    gl.uniform3fv(this.#uniforms.color0, MAP_COLOURS[0]);
    gl.uniform3fv(this.#uniforms.color1, MAP_COLOURS[1]);
    gl.uniform1f(this.#uniforms.pointSize, this.#pointSize * this.#dpr);
    gl.bindVertexArray(this.#pointVao);
    gl.drawArrays(gl.POINTS, 0, this.#count);

    // 2. the centres: a dark disc, then a coloured disc on top of it
    if (this.#showCentres) {
      const c0 = this.#transforms[0].centre;
      const c1 = this.#transforms[1].centre;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#centrePositionBuffer);
      gl.bufferSubData(
        gl.ARRAY_BUFFER,
        0,
        new Float32Array([c0[0], c0[1], c1[0], c1[1]]),
      );
      gl.bindVertexArray(this.#centreVao);
      gl.uniform1i(this.#uniforms.round, 1);

      gl.uniform3fv(this.#uniforms.color0, OUTLINE_COLOUR);
      gl.uniform3fv(this.#uniforms.color1, OUTLINE_COLOUR);
      gl.uniform1f(this.#uniforms.pointSize, 17 * this.#dpr);
      gl.drawArrays(gl.POINTS, 0, 2);

      gl.uniform3fv(this.#uniforms.color0, MAP_COLOURS[0]);
      gl.uniform3fv(this.#uniforms.color1, MAP_COLOURS[1]);
      gl.uniform1f(this.#uniforms.pointSize, 11 * this.#dpr);
      gl.drawArrays(gl.POINTS, 0, 2);
    }

    gl.bindVertexArray(null);
    this.#frameDirty = false;
    return true;
  }
}
