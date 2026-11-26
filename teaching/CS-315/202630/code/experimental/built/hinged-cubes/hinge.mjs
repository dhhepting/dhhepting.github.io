// WebGL2 renderer for two cubes joined along a shared edge. DOM-free:
// dependency flows controller -> renderer only.
import { lookAt, perspective, flatten, vec3 } from '../../../common/MV.mjs';
import { initShadersJS } from '../../../common/initShadersJS.mjs';
import vertexSource from 'shaders/hinge.vert?raw';
import fragmentSource from 'shaders/hinge.frag?raw';
import { buildCube, hingeModels, CUBE_VERTEX_COUNT } from 'geometry.mjs';

const COLOR_A = [0.25, 0.55, 0.95, 1.0];
const COLOR_B = [0.95, 0.60, 0.20, 1.0];

export class Hinge {
  constructor(gl) {
    this.gl = gl;
    this.angle = 90;      // degrees, hinge angle theta
    this.yaw = 35;        // degrees, camera orbit
    this.pitch = 25;      // degrees
    this.distance = 5;

    const program = initShadersJS(gl, vertexSource, fragmentSource);
    this.program = program;
    this.loc = {
      position: gl.getAttribLocation(program, 'aPosition'),
      normal: gl.getAttribLocation(program, 'aNormal'),
      model: gl.getUniformLocation(program, 'uModel'),
      view: gl.getUniformLocation(program, 'uView'),
      projection: gl.getUniformLocation(program, 'uProjection'),
      color: gl.getUniformLocation(program, 'uColor'),
    };

    // One interleaved buffer shared by both cubes (they differ only in model matrix and colour).
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, buildCube(), gl.STATIC_DRAW);
    const stride = 6 * Float32Array.BYTES_PER_ELEMENT;
    gl.vertexAttribPointer(this.loc.position, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.loc.position);
    gl.vertexAttribPointer(this.loc.normal, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(this.loc.normal);
    gl.bindVertexArray(null);

    gl.clearColor(0.063, 0.071, 0.086, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
  }

  setAngle(degrees) { this.angle = degrees; }

  orbit(dYaw, dPitch) {
    this.yaw += dYaw;
    this.pitch = Math.max(-89, Math.min(89, this.pitch + dPitch));
  }

  render() {
    const gl = this.gl;
    const { width, height } = gl.canvas;
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (height === 0) return;

    const yaw = this.yaw * Math.PI / 180;
    const pitch = this.pitch * Math.PI / 180;
    const eye = vec3(
      this.distance * Math.cos(pitch) * Math.sin(yaw),
      this.distance * Math.sin(pitch),
      this.distance * Math.cos(pitch) * Math.cos(yaw),
    );
    const view = lookAt(eye, vec3(0, 0, 0), vec3(0, 1, 0));
    const projection = perspective(45, width / height, 0.1, 50);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniformMatrix4fv(this.loc.view, false, flatten(view));
    gl.uniformMatrix4fv(this.loc.projection, false, flatten(projection));

    const { a, b } = hingeModels(this.angle);
    this.#drawCube(a, COLOR_A);
    this.#drawCube(b, COLOR_B);
    gl.bindVertexArray(null);
  }

  #drawCube(model, color) {
    const gl = this.gl;
    gl.uniformMatrix4fv(this.loc.model, false, flatten(model));
    gl.uniform4fv(this.loc.color, color);
    gl.drawArrays(gl.TRIANGLES, 0, CUBE_VERTEX_COUNT);
  }
}
