import { vec3, vec4, mult, mix, normalize, lookAt, ortho, normalMatrix, flatten } from '../../Common/MV.mjs';
import { initShaders } from '../../Common/initShadersJS.mjs';

import vertexShaderSource from './shaders/perVertexLighting.vert?raw';
import fragmentShaderSource from './shaders/colorPassthrough.frag?raw';

let gl;

let numTimesToSubdivide = 3;

let index = 0;

let positionsArray = [];
let normalsArray = [];

const va = vec4(0.0, 0.0, -1.0, 1);
const vb = vec4(0.0, 0.942809, 0.333333, 1);
const vc = vec4(-0.816497, -0.471405, 0.333333, 1);
const vd = vec4(0.816497, -0.471405, 0.333333, 1);

const near = -10;
const far = 10;
let radius = 1.5;
let theta = 0.0;
let phi = 0.0;
const dr = 5.0 * Math.PI / 180.0;

const left = -3.0;
const right = 3.0;
const top = 3.0;
const bottom = -3.0;

const lightPosition = vec4(1.0, 1.0, 1.0, 0.0);
const lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
const lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
const lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

const materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
const materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
const materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
const materialShininess = 20.0;

let modelViewMatrixLoc, projectionMatrixLoc;
let nMatrixLoc;

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

function triangle(a, b, c) {
    positionsArray.push(a);
    positionsArray.push(b);
    positionsArray.push(c);

    // normals are vectors

    normalsArray.push(vec4(a[0], a[1], a[2], 0.0));
    normalsArray.push(vec4(b[0], b[1], b[2], 0.0));
    normalsArray.push(vec4(c[0], c[1], c[2], 0.0));

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
    else {
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

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    const program = initShaders(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);

    const ambientProduct = mult(lightAmbient, materialAmbient);
    const diffuseProduct = mult(lightDiffuse, materialDiffuse);
    const specularProduct = mult(lightSpecular, materialSpecular);

    tetrahedron(va, vb, vc, vd, numTimesToSubdivide);

    const nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    const normalLoc = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(normalLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");

    nMatrixLoc = gl.getUniformLocation(program, "uNormalMatrix");

    document.getElementById("Button0").onclick = () => { radius *= 2.0; };
    document.getElementById("Button1").onclick = () => { radius *= 0.5; };
    document.getElementById("Button2").onclick = () => { theta += dr; };
    document.getElementById("Button3").onclick = () => { theta -= dr; };
    document.getElementById("Button4").onclick = () => { phi += dr; };
    document.getElementById("Button5").onclick = () => { phi -= dr; };

    document.getElementById("Button6").onclick = () => {
        numTimesToSubdivide++;
        index = 0;
        positionsArray = [];
        normalsArray = [];
        init();
    };
    document.getElementById("Button7").onclick = () => {
        if (numTimesToSubdivide) numTimesToSubdivide--;
        index = 0;
        positionsArray = [];
        normalsArray = [];
        init();
    };

    gl.uniform4fv(gl.getUniformLocation(program, "uAmbientProduct"), ambientProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uDiffuseProduct"), diffuseProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uSpecularProduct"), specularProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"), lightPosition);
    gl.uniform1f(gl.getUniformLocation(program, "uShininess"), materialShininess);

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const eye = vec3(radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(theta) * Math.sin(phi), radius * Math.cos(theta));

    const modelViewMatrix = lookAt(eye, at, up);
    const projectionMatrix = ortho(left, right, bottom, top, near, far);

    const nMatrix = normalMatrix(modelViewMatrix, true);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    gl.uniformMatrix3fv(nMatrixLoc, false, flatten(nMatrix));

    for (let i = 0; i < index; i += 3)
        gl.drawArrays(gl.TRIANGLES, i, 3);

    requestAnimationFrame(render);
}

init();
