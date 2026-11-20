// One canvas + one WebGL2 context + one lit-mesh program. Uniforms are
// discovered by reflection, so a pane ignores any value in the shared frame
// dictionary that its program does not declare. Attributes are looked up by name
// (aPosition, aNormal) and fed as vec3 or vec4 according to how the shader
// declares them, so the course shaders work unmodified.
import { initShaders } from './common.mjs';
import { analyzeProgram } from './costModel.mjs';

function reflectUniforms(gl, program) {
    const found = new Map();
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i += 1) {
        const info = gl.getActiveUniform(program, i);
        found.set(info.name, { location: gl.getUniformLocation(program, info.name), type: info.type });
    }
    return found;
}

function applyUniforms(gl, uniforms, values) {
    for (const [name, value] of Object.entries(values)) {
        const uniform = uniforms.get(name);
        if (!uniform) continue;
        switch (uniform.type) {
            case gl.FLOAT: gl.uniform1f(uniform.location, value); break;
            case gl.BOOL: case gl.INT: gl.uniform1i(uniform.location, value ? Number(value) : 0); break;
            case gl.FLOAT_VEC3: gl.uniform3fv(uniform.location, value); break;
            case gl.FLOAT_VEC4: gl.uniform4fv(uniform.location, value); break;
            case gl.FLOAT_MAT3: gl.uniformMatrix3fv(uniform.location, false, value); break;
            case gl.FLOAT_MAT4: gl.uniformMatrix4fv(uniform.location, false, value); break;
            default: throw new Error(`Unhandled uniform type for ${name}`);
        }
    }
}

export class LitMeshPane {
    constructor(canvas) {
        this.canvas = canvas;
        // preserveDrawingBuffer lets the app read pixels back at any time
        // (for the difference image and the shaded-pixel count).
        const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
        if (!gl) throw new Error('WebGL2 is not available in this browser.');
        this.gl = gl;

        gl.clearColor(0, 0, 0, 0);   // transparent; the canvas is drawn on white in CSS
        gl.enable(gl.DEPTH_TEST);

        this.main = { program: null, uniforms: new Map(), vao: gl.createVertexArray(), vertexCount: 0 };
        this.buffers = { position: gl.createBuffer(), normal3: gl.createBuffer(), normal4: gl.createBuffer() };
        this.mesh = null;
        this.analysis = null;
    }

    /**
     * (Re)build the lit program from source text. costConstants (optional)
     * tells the cost model which uniform-controlled branches this pane takes.
     */
    setSources(vertSource, fragSource, costConstants = null) {
        const { gl } = this;
        if (this.main.program) gl.deleteProgram(this.main.program);
        this.main.program = initShaders(gl, vertSource, fragSource);
        this.main.uniforms = reflectUniforms(gl, this.main.program);
        this.analysis = analyzeProgram(vertSource, fragSource, costConstants);
        this.#bindAttributes();
    }

    /** Upload the mesh: { positions, normals, vertexCount } (vec3 each). */
    setMesh(mesh) {
        const { gl } = this;
        this.mesh = mesh;
        this.main.vertexCount = mesh.vertexCount;

        // Some shaders declare aNormal as vec4 and transform it by the
        // model-view matrix, so it needs w = 0 (a direction, not a point).
        const normals4 = new Float32Array(mesh.vertexCount * 4);
        for (let i = 0; i < mesh.vertexCount; i += 1) {
            normals4[i * 4] = mesh.normals[i * 3];
            normals4[i * 4 + 1] = mesh.normals[i * 3 + 1];
            normals4[i * 4 + 2] = mesh.normals[i * 3 + 2];
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal3);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal4);
        gl.bufferData(gl.ARRAY_BUFFER, normals4, gl.STATIC_DRAW);
        this.#bindAttributes();
    }

    /** Point aPosition / aNormal at the right buffers for the current program. */
    #bindAttributes() {
        const { gl, main, mesh } = this;
        if (!main.program || !mesh) return;

        const declared = new Map();
        const count = gl.getProgramParameter(main.program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < count; i += 1) {
            const info = gl.getActiveAttrib(main.program, i);
            declared.set(info.name, info.type);
        }

        gl.bindVertexArray(main.vao);
        const feed = (name, buffer, size) => {
            const location = gl.getAttribLocation(main.program, name);
            if (location < 0) return;
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
        };
        // A vec3 feed into a vec4 attribute gives w = 1: right for positions.
        feed('aPosition', this.buffers.position, 3);
        const normalIsVec4 = declared.get('aNormal') === gl.FLOAT_VEC4;
        feed('aNormal', normalIsVec4 ? this.buffers.normal4 : this.buffers.normal3, normalIsVec4 ? 4 : 3);
        gl.bindVertexArray(null);
    }

    resize(pixels) {
        this.canvas.width = pixels;
        this.canvas.height = pixels;
        this.gl.viewport(0, 0, pixels, pixels);
    }

    /**
     * markerValues (optional): uniforms for a second draw of the same mesh
     * with the same program, as shadedCubeHalfway draws its light marker
     * (uUnlit = 1 and its own model-view matrix).
     */
    draw(values, markerValues = null) {
        const { gl, main } = this;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(main.program);
        applyUniforms(gl, main.uniforms, values);
        gl.bindVertexArray(main.vao);
        gl.drawArrays(gl.TRIANGLES, 0, main.vertexCount);

        if (markerValues) {
            applyUniforms(gl, main.uniforms, markerValues);
            gl.drawArrays(gl.TRIANGLES, 0, main.vertexCount);
        }
        gl.bindVertexArray(null);
    }

    /**
     * Stress test: draw the lit mesh `passes` times with the depth test set to
     * ALWAYS (so every fragment of every pass is shaded, nothing is rejected
     * early), then read back one pixel to force the GPU to finish.
     * Returns wall-clock milliseconds for the whole batch.
     */
    timePasses(values, passes) {
        const { gl, main } = this;
        gl.useProgram(main.program);
        applyUniforms(gl, main.uniforms, values);
        gl.bindVertexArray(main.vao);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.depthFunc(gl.ALWAYS);

        const probe = new Uint8Array(4);
        const start = performance.now();
        for (let i = 0; i < passes; i += 1) {
            gl.drawArrays(gl.TRIANGLES, 0, main.vertexCount);
        }
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probe);
        const elapsed = performance.now() - start;

        gl.depthFunc(gl.LESS);
        gl.bindVertexArray(null);
        return elapsed;
    }

    readPixels(target) {
        const { gl, canvas } = this;
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, target);
    }
}
