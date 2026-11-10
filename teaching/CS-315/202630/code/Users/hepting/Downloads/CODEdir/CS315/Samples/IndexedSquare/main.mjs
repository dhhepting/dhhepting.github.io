import { initShaders } from '../../Common/initShadersJS.mjs';

async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
    return response.text();
}

const canvas = document.getElementById('gl-canvas');
const gl = canvas.getContext('webgl2');
if (!gl) {
    alert("WebGL 2.0 isn't available");
    throw new Error("WebGL 2.0 isn't available");
}

const [vertexSource, fragmentSource] = await Promise.all([
    fetchText(new URL('./shaders/square.vert.glsl', import.meta.url)),
    fetchText(new URL('./shaders/square.frag.glsl', import.meta.url)),
]);
const program = initShaders(gl, vertexSource, fragmentSource);

// Four corners, each listed once: x, y, r, g, b
const vertices = new Float32Array([
    -0.5, -0.5,  1.0, 0.0, 0.0,   // 0 bottom left
     0.5, -0.5,  0.0, 1.0, 0.0,   // 1 bottom right
     0.5,  0.5,  0.0, 0.0, 1.0,   // 2 top right
    -0.5,  0.5,  1.0, 1.0, 0.0,   // 3 top left
]);

// Two triangles that share corners 0 and 2, written as indices into the list above
const indices = new Uint16Array([
    0, 1, 2,
    0, 2, 3,
]);

// VAO: remembers the attribute setup and the element buffer binding below
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// VBO: the vertex data
const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// EBO: the indices. Bind it while the VAO is bound so the VAO keeps it.
const ebo = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// Describe how one vertex is laid out in the VBO: 5 floats, position then colour
const stride = 5 * Float32Array.BYTES_PER_ELEMENT;

const positionLoc = gl.getAttribLocation(program, 'aPosition');
gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0);
gl.enableVertexAttribArray(positionLoc);

const colorLoc = gl.getAttribLocation(program, 'aColor');
gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
gl.enableVertexAttribArray(colorLoc);

gl.bindVertexArray(null);   // setup done

gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(1.0, 1.0, 1.0, 1.0);

render();

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindVertexArray(vao);   // one call restores the attributes and the EBO
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
}
