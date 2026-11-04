import { vec3, vec4, mix, normalize, lookAt, ortho, flatten } from '../../Common/MV.mjs';
import { initShaders } from '../../Common/initShadersJS.mjs';

import vertexShaderSource from './shaders/wireSphere.vert?raw';
import fragmentShaderSource from './shaders/black.frag?raw';

let gl;

let numTimesToSubdivide = 3;

let index = 0;

let positionsArray = [];

const near = -10;
const far = 10;
const radius = 6.0;
let theta = 0.0;
let phi = 0.0;
const dr = 5.0 * Math.PI / 180.0;

const left = -2.0;
const right = 2.0;
const top = 2.0;
const bottom = -2.0;

let modelViewMatrixLoc, projectionMatrixLoc;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

function triangle(a, b, c) {
    positionsArray.push(a);
    positionsArray.push(b);
    positionsArray.push(c);
    index += 3;
}

function divideTriangle(a, b, c, count) {
    if (count > 0) {
        const ab = normalize(mix(a, b, 0.5), true);
        const ac = normalize(mix(a, c, 0.5), true);
        const bc = normalize(mix(b, c, 0.5), true);

        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    }
    else { // draw tetrahedron at end of recursion
        triangle(a, b, c);
    }
}

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

function init() {
    const canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    //
    //  Load shaders and initialize attribute buffers
    //
    const program = initShaders(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);

    const va = vec4(0.0, 0.0, -1.0, 1);
    const vb = vec4(0.0, 0.942809, 0.333333, 1);
    const vc = vec4(-0.816497, -0.471405, 0.333333, 1);
    const vd = vec4(0.816497, -0.471405, 0.333333, 1);

    tetrahedron(va, vb, vc, vd, numTimesToSubdivide);

    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");

    document.getElementById("Button0").onclick = () => { theta += dr; };
    document.getElementById("Button1").onclick = () => { theta -= dr; };
    document.getElementById("Button2").onclick = () => { phi += dr; };
    document.getElementById("Button3").onclick = () => { phi -= dr; };

    document.getElementById("Button4").onclick = () => {
        numTimesToSubdivide++;
        index = 0;
        positionsArray = [];
        init();
    };
    document.getElementById("Button5").onclick = () => {
        if (numTimesToSubdivide) numTimesToSubdivide--;
        index = 0;
        positionsArray = [];
        init();
    };
    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const eye = vec3(radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(theta) * Math.sin(phi), radius * Math.cos(theta));

    const modelViewMatrix = lookAt(eye, at, up);
    const projectionMatrix = ortho(left, right, bottom, top, near, far);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    for (let i = 0; i < index; i += 3)
        gl.drawArrays(gl.LINE_LOOP, i, 3);

    requestAnimationFrame(render);
}

init();
