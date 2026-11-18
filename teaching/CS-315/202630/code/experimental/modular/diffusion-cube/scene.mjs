// Cube + sphere meshes that sample the simulation's trail texture. DOM-free.

import { createProgram, withIncludes } from './gl-utils.mjs';
import { multiply, translation, rotationY, rotationX } from './math.mjs';

export const SCENE_SHADER_FILES = ['mesh.vert', 'mesh.frag', 'preview.frag', 'colormap.glsl'];

// ---- geometry --------------------------------------------------------------
// Interleaved: position(3) normal(3) uv(2). Every cube face maps the whole
// texture to 0..1, so each face shows the full field.

function buildCube(h = 1) {
  const faces = [
    // normal,        u axis,        v axis
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
    [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  ];
  const verts = [];
  const idx = [];
  faces.forEach(([n, u, v], f) => {
    for (const [s, t] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      const a = s * 2 - 1, b = t * 2 - 1;
      verts.push(
        (n[0] + u[0] * a + v[0] * b) * h,
        (n[1] + u[1] * a + v[1] * b) * h,
        (n[2] + u[2] * a + v[2] * b) * h,
        n[0], n[1], n[2], s, t,
      );
    }
    const o = f * 4;
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  return { vertices: new Float32Array(verts), indices: new Uint16Array(idx) };
}

function buildSphere(radius = 1, segments = 96, rings = 48) {
  const verts = [];
  const idx = [];
  for (let y = 0; y <= rings; y++) {
    const v = y / rings;
    const phi = v * Math.PI;
    for (let x = 0; x <= segments; x++) {
      const u = x / segments;
      const theta = u * 2 * Math.PI;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      verts.push(nx * radius, ny * radius, nz * radius, nx, ny, nz, u, v);
    }
  }
  const stride = segments + 1;
  for (let y = 0; y < rings; y++) {
    for (let x = 0; x < segments; x++) {
      const a = y * stride + x, b = a + stride;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return { vertices: new Float32Array(verts), indices: new Uint16Array(idx) };
}

function uploadMesh(gl, { vertices, indices }) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  const stride = 8 * 4;
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 24);
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, vbo, ibo, count: indices.length };
}

// ---- scene -----------------------------------------------------------------

export class Scene {
  constructor(gl, sources) {
    this.gl = gl;
    const includes = { colormap: sources['colormap.glsl'] };
    this.meshProg = createProgram(
      gl, sources['mesh.vert'], withIncludes(sources['mesh.frag'], includes), 'mesh');
    this.previewProg = createProgram(
      gl, sources['quad.vert'], withIncludes(sources['preview.frag'], includes), 'preview');
    this.cube = uploadMesh(gl, buildCube(0.95));
    this.sphere = uploadMesh(gl, buildSphere(1.0));
    this.emptyVAO = gl.createVertexArray();
    this.lightDir = (() => {
      const l = [0.5, 0.8, 0.6];
      const n = Math.hypot(...l);
      return l.map((c) => c / n);
    })();
  }

  /**
   * shape: 'cube' | 'sphere' | 'both'
   * angle: model spin in radians.  viewProj: Float32Array(16).
   */
  draw({ trailTexture, shape, angle, viewProj, exposure, width, height }) {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0.04, 0.045, 0.06, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const { program, uniforms: u } = this.meshProg;
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, trailTexture);
    gl.uniform1i(u.uTrail, 0);
    gl.uniform1f(u.uExposure, exposure);
    gl.uniform3fv(u.uLightDir, this.lightDir);
    gl.uniformMatrix4fv(u.uViewProj, false, viewProj);

    const spin = (x) => multiply(translation(x, 0, 0),
      multiply(rotationY(angle), rotationX(0.35)));
    const drawMesh = (mesh, x) => {
      gl.uniformMatrix4fv(u.uModel, false, spin(x));
      gl.bindVertexArray(mesh.vao);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    };

    if (shape === 'cube') drawMesh(this.cube, 0);
    else if (shape === 'sphere') drawMesh(this.sphere, 0);
    else { drawMesh(this.cube, -1.6); drawMesh(this.sphere, 1.6); }
    gl.bindVertexArray(null);
  }

  /** Draw the raw (unwrapped) trail texture into a pixel rectangle (origin bottom-left). */
  drawPreview({ trailTexture, exposure, x, y, size }) {
    const { gl } = this;
    const { program, uniforms: u } = this.previewProg;
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(program);
    gl.viewport(x, y, size, size);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, trailTexture);
    gl.uniform1i(u.uTrail, 0);
    gl.uniform1f(u.uExposure, exposure);
    gl.bindVertexArray(this.emptyVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  dispose() {
    const { gl } = this;
    for (const m of [this.cube, this.sphere]) {
      gl.deleteVertexArray(m.vao); gl.deleteBuffer(m.vbo); gl.deleteBuffer(m.ibo);
    }
    gl.deleteVertexArray(this.emptyVAO);
    gl.deleteProgram(this.meshProg.program);
    gl.deleteProgram(this.previewProg.program);
  }
}
