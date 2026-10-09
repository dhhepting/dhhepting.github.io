import { initShaders } from '../../Common/initShadersJS.mjs';
import { flatten, mat4 } from '../../Common/MV.mjs';

/**
 * DOM-free renderer: draws one triangle with a shared vertex shader and a
 * choice of fragment shaders. It only knows about the GL context it is given;
 * the controller (main.js) owns every document/element reference.
 */
export class ShaderDemo {
  #gl;
  #programs = new Map();      // name -> { program, uAngle, uResolution }
  #active;
  #vao;
  #positionBuffer;
  #colorBuffer;
  #positions = new Float32Array(6);
  #colors = new Float32Array(9);
  #matrix = mat4();           // identity until setMatrix() is called
  #size = 12;

  constructor(gl, vertexSource, fragmentSources) {
    this.#gl = gl;

    for (const [name, source] of Object.entries(fragmentSources)) {
      const program = initShaders(gl, vertexSource, source);
      this.#programs.set(name, {
        program,
        uMatrix: gl.getUniformLocation(program, 'u_matrix'),
        uResolution: gl.getUniformLocation(program, 'u_resolution'), // null if unused
      });
    }
    this.#active = this.#programs.keys().next().value;

    this.#vao = gl.createVertexArray();
    gl.bindVertexArray(this.#vao);

    this.#positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.#positions.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.#colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.#colors.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    this.setResolution(this.#size);
  }

  get resolution() { return this.#size; }

  setFragmentShader(name) {
    if (!this.#programs.has(name)) throw new Error(`No fragment shader named "${name}"`);
    this.#active = name;
  }

  /** The drawing buffer is size x size; CSS scales it up so pixels stay visible. */
  setResolution(size) {
    this.#size = size;
    this.#gl.canvas.width = size;
    this.#gl.canvas.height = size;
  }

  /** A mat4 from MV.mjs; passed to the vertex shader as u_matrix. */
  setMatrix(matrix) { this.#matrix = matrix; }

  /** positions: [vec2 x3] in attribute space; colors: [vec3 x3]. */
  setVertices(positions, colors) {
    const gl = this.#gl;
    this.#positions.set(flatten(positions));
    this.#colors.set(flatten(colors));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#positionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.#positions);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#colorBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.#colors);
  }

  render() {
    const gl = this.#gl;
    const { program, uMatrix, uResolution } = this.#programs.get(this.#active);

    gl.viewport(0, 0, this.#size, this.#size);
    gl.clearColor(0, 0, 0, 0);          // alpha 0 = "no fragment was written here"
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.uniformMatrix4fv(uMatrix, false, flatten(this.#matrix));
    gl.uniform2f(uResolution, this.#size, this.#size);

    gl.bindVertexArray(this.#vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  /** RGBA bytes of pixel (ix, iy), where iy counts from the top of the image. */
  readPixel(ix, iy) {
    const out = new Uint8Array(4);
    this.#gl.readPixels(ix, this.#size - 1 - iy, 1, 1, this.#gl.RGBA, this.#gl.UNSIGNED_BYTE, out);
    return out;
  }

  /** How many pixels the fragment shader wrote (alpha > 0 after the clear to 0). */
  countCoveredPixels() {
    const n = this.#size;
    const pixels = new Uint8Array(n * n * 4);
    this.#gl.readPixels(0, 0, n, n, this.#gl.RGBA, this.#gl.UNSIGNED_BYTE, pixels);
    let covered = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) covered++;
    return covered;
  }
}
