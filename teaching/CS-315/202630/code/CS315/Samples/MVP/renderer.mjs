// DOM-free renderer for one WebGL2 context. It knows nothing about cameras or
// the page: give it an observer matrix and a list of { mesh, matrix } draws.
import { flatten } from '../../Common/MV.mjs';
import { initShaders } from '../../Common/initShadersJS.mjs';

export class SceneRenderer {
  #gl;
  #loc;
  #uploaded = new WeakMap();

  constructor(gl, vertexSource, fragmentSource) {
    this.#gl = gl;
    const program = initShaders(gl, vertexSource, fragmentSource);
    gl.useProgram(program);
    this.#loc = {
      aPosition: gl.getAttribLocation(program, 'aPosition'),
      aColor: gl.getAttribLocation(program, 'aColor'),
      uStage: gl.getUniformLocation(program, 'uStage'),
      uObserver: gl.getUniformLocation(program, 'uObserver'),
      uDivide: gl.getUniformLocation(program, 'uDivide'),
    };
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.POLYGON_OFFSET_FILL);   // push filled faces back so edges win the depth test
    gl.polygonOffset(1, 1);
    gl.clearColor(0.07, 0.09, 0.105, 1);
  }

  // scene = { observer: mat4, divide: boolean, draws: [{ mesh, matrix: mat4 }, ...] }
  render({ observer, divide, draws }) {
    const gl = this.#gl;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(this.#loc.uObserver, false, flatten(observer));
    gl.uniform1i(this.#loc.uDivide, divide ? 1 : 0);
    for (const { mesh, matrix } of draws) {
      const gpu = this.#upload(mesh);
      gl.uniformMatrix4fv(this.#loc.uStage, false, flatten(matrix));
      if (gpu.triangles) {
        gl.bindVertexArray(gpu.triangles.vao);
        gl.drawArrays(gl.TRIANGLES, 0, gpu.triangles.count);
      }
      if (gpu.lines) {
        gl.bindVertexArray(gpu.lines.vao);
        gl.drawArrays(gl.LINES, 0, gpu.lines.count);
      }
    }
  }

  #upload(mesh) {
    let gpu = this.#uploaded.get(mesh);
    if (!gpu) {
      gpu = {
        triangles: mesh.triangles ? this.#makeVao(mesh.triangles) : null,
        lines: mesh.lines ? this.#makeVao(mesh.lines) : null,
      };
      this.#uploaded.set(mesh, gpu);
    }
    return gpu;
  }

  #makeVao({ positions, colors }) {
    const gl = this.#gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    for (const [data, location] of [[positions, this.#loc.aPosition], [colors, this.#loc.aColor]]) {
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
    }
    return { vao, count: positions.length / 3 };
  }
}
