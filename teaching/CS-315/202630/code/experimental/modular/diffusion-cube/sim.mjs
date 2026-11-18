// GPU particle diffusion with ping-pong textures. DOM-free.
//
// Two ping-pong pairs:
//   pos[0], pos[1]     RGBA32F  P x P   one texel = one particle (xy in [0,1) uv space)
//   trail[0], trail[1] RGBA16F  T x T   concentration field the particles deposit into
//
// Per step():
//   1. update   read pos[a] + trail[b]  -> write pos[1-a]   (random walk + chemotaxis)
//   2. diffuse  read trail[b]           -> write trail[1-b]  (3x3 blur + decay)
//   3. deposit  draw P*P points from pos, additively blended into trail[1-b]
// then both pairs swap. `trailTexture` is always the most recently completed field.

import {
  createProgram, createTexture, createFramebuffer, withIncludes,
} from './gl-utils.mjs';

export const SHADER_FILES = [
  'quad.vert', 'particleUpdate.frag', 'diffuse.frag', 'deposit.vert', 'deposit.frag',
];

export class DiffusionSim {
  constructor(gl, sources, { particleSize = 512, trailSize = 512 } = {}) {
    this.gl = gl;
    if (!gl.getExtension('EXT_color_buffer_float')) {
      throw new Error('EXT_color_buffer_float is required (float render targets).');
    }
    this.trailSize = trailSize;
    this.particleSize = particleSize;
    this.frame = 0;
    this.lastResetMode = 'point';

    this.params = {
      sigma: 0.003,    // random-walk step (uv units / step)
      chemo: 0.0,      // >0 climb the trail gradient (aggregate), <0 flee it
      diffuse: 0.5,    // 0..1 blend toward 3x3 blur each step
      decay: 0.992,    // trail multiplier each step
      deposit: 0.02,   // amount each particle adds per step
      pointSize: 1,
      stepsPerFrame: 2,
    };

    this.progs = {
      update: createProgram(gl, sources['quad.vert'], sources['particleUpdate.frag'], 'update'),
      diffuse: createProgram(gl, sources['quad.vert'], sources['diffuse.frag'], 'diffuse'),
      deposit: createProgram(gl, sources['deposit.vert'], sources['deposit.frag'], 'deposit'),
    };
    this.emptyVAO = gl.createVertexArray(); // attribute-less draws use gl_VertexID

    this.#allocTrail();
    this.#allocParticles();
    this.reset('point');
  }

  // ---- resources -----------------------------------------------------------

  #allocTrail() {
    const { gl, trailSize } = this;
    this.trail = [0, 1].map(() => createTexture(gl, trailSize, {
      internalFormat: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT, filter: gl.LINEAR,
    }));
    this.trailFBO = this.trail.map((t) => createFramebuffer(gl, t));
    this.ti = 0; // index of the current (readable) trail texture
  }

  #allocParticles() {
    const { gl, particleSize } = this;
    this.pos = [0, 1].map(() => createTexture(gl, particleSize, {
      internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT, filter: gl.NEAREST,
    }));
    this.posFBO = this.pos.map((t) => createFramebuffer(gl, t));
    this.pi = 0; // index of the current (readable) particle texture
  }

  #freeParticles() {
    const { gl } = this;
    this.pos.forEach((t) => gl.deleteTexture(t));
    this.posFBO.forEach((f) => gl.deleteFramebuffer(f));
  }

  get particleCount() { return this.particleSize * this.particleSize; }
  get trailTexture() { return this.trail[this.ti]; }

  setParticleSize(size) {
    if (size === this.particleSize) return;
    this.#freeParticles();
    this.particleSize = size;
    this.#allocParticles();
    this.reset(this.lastResetMode);
  }

  // ---- state ---------------------------------------------------------------

  /** mode: 'point' (gaussian blob at centre), 'ring', or 'uniform'. */
  reset(mode = this.lastResetMode) {
    const { gl, particleSize: P } = this;
    this.lastResetMode = mode;
    const data = new Float32Array(P * P * 4);
    const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
    for (let i = 0; i < P * P; i++) {
      let x, y;
      if (mode === 'uniform') {
        x = Math.random(); y = Math.random();
      } else if (mode === 'ring') {
        const a = Math.random() * 2 * Math.PI;
        const r = 0.25 + 0.004 * gauss();
        x = 0.5 + r * Math.cos(a); y = 0.5 + r * Math.sin(a);
      } else {
        x = 0.5 + 0.004 * gauss(); y = 0.5 + 0.004 * gauss();
      }
      data[i * 4] = x - Math.floor(x);
      data[i * 4 + 1] = y - Math.floor(y);
      data[i * 4 + 3] = 1;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.pos[this.pi]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, P, P, gl.RGBA, gl.FLOAT, data);

    gl.clearColor(0, 0, 0, 0);
    for (const fbo of this.trailFBO) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.frame = 0;
  }

  // ---- simulation ----------------------------------------------------------

  step() {
    const n = Math.max(1, Math.round(this.params.stepsPerFrame));
    for (let i = 0; i < n; i++) this.#stepOnce();
  }

  #stepOnce() {
    const { gl, params: p, particleSize: P, trailSize: T } = this;
    const nextPi = 1 - this.pi;
    const nextTi = 1 - this.ti;
    gl.bindVertexArray(this.emptyVAO);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    // 1. particle update: pos[pi] (+ trail[ti]) -> pos[nextPi]
    {
      const { program, uniforms: u } = this.progs.update;
      gl.useProgram(program);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.posFBO[nextPi]);
      gl.viewport(0, 0, P, P);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.pos[this.pi]);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.trail[this.ti]);
      gl.uniform1i(u.uPos, 0);
      gl.uniform1i(u.uTrail, 1);
      gl.uniform2f(u.uTrailTexel, 1 / T, 1 / T);
      gl.uniform1f(u.uSigma, p.sigma);
      gl.uniform1f(u.uChemo, p.chemo);
      gl.uniform1ui(u.uFrame, this.frame >>> 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // 2. diffuse: trail[ti] -> trail[nextTi]
    {
      const { program, uniforms: u } = this.progs.diffuse;
      gl.useProgram(program);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.trailFBO[nextTi]);
      gl.viewport(0, 0, T, T);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.trail[this.ti]);
      gl.uniform1i(u.uTrail, 0);
      gl.uniform2f(u.uTexel, 1 / T, 1 / T);
      gl.uniform1f(u.uDiffuse, p.diffuse);
      gl.uniform1f(u.uDecay, p.decay);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // 3. deposit: every particle (new positions) adds into trail[nextTi]
    {
      const { program, uniforms: u } = this.progs.deposit;
      gl.useProgram(program);
      // trail[nextTi] is still bound as the framebuffer from the diffuse pass.
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.pos[nextPi]);
      gl.uniform1i(u.uPos, 0);
      gl.uniform1i(u.uPosSize, P);
      gl.uniform1f(u.uPointSize, p.pointSize);
      gl.uniform1f(u.uDeposit, p.deposit);
      gl.drawArrays(gl.POINTS, 0, P * P);
      gl.disable(gl.BLEND);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.pi = nextPi;
    this.ti = nextTi;
    this.frame++;
  }

  // ---- diagnostics (GPU readback; not for per-frame use) --------------------

  readTrailStats() {
    const { gl, trailSize: T } = this;
    const buf = new Float32Array(T * T * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.trailFBO[this.ti]);
    gl.readPixels(0, 0, T, T, gl.RGBA, gl.FLOAT, buf);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let sum = 0, max = 0, occupied = 0, bad = 0;
    for (let i = 0; i < T * T; i++) {
      const v = buf[i * 4];
      if (!Number.isFinite(v)) { bad++; continue; }
      sum += v;
      if (v > max) max = v;
      if (v > 1e-3) occupied++;
    }
    return { sum, max, occupiedFraction: occupied / (T * T), nonFinite: bad };
  }

  dispose() {
    const { gl } = this;
    this.#freeParticles();
    this.trail.forEach((t) => gl.deleteTexture(t));
    this.trailFBO.forEach((f) => gl.deleteFramebuffer(f));
    Object.values(this.progs).forEach((p) => gl.deleteProgram(p.program));
    gl.deleteVertexArray(this.emptyVAO);
  }
}

export { withIncludes };
