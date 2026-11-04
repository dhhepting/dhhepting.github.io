import { vec3, vec4, mat4, mult, subtract, cross, rotate, lookAt, ortho, flatten } from '../../Common/MV.mjs';
import { initShaders } from '../../Common/initShadersJS.mjs';

import vertexShaderSource from './shaders/shadedCube2.vert?raw';
import fragmentShaderSource from './shaders/colorPassthrough.frag?raw';

let gl;
let program;

const numPositions = 36;

const positionsArray = [];
const normalsArray = [];

const vertices = [
    vec4(-0.5, -0.5,  0.5, 1.0),
    vec4(-0.5,  0.5,  0.5, 1.0),
    vec4( 0.5,  0.5,  0.5, 1.0),
    vec4( 0.5, -0.5,  0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5,  0.5, -0.5, 1.0),
    vec4( 0.5,  0.5, -0.5, 1.0),
    vec4( 0.5, -0.5, -0.5, 1.0)
];

const lightPosition = vec4(1.0, 1.0, 1.0, 0.0);
const lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
const lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
const lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

const materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
const materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
const materialSpecular = vec4(1.0, 0.8, 0.0, 1.0);
const materialShininess = 100.0;

const xAxis = 0;
const yAxis = 1;
const zAxis = 2;
let axis = 0;
const theta = vec3(0, 0, 0);

const eye = vec3(1.0, 1.0, 1.0);
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

let rflag = false;
let lflag = false;
let cflag = false;

function quad(a, b, c, d) {
    const t1 = subtract(vertices[b], vertices[a]);
    const t2 = subtract(vertices[c], vertices[a]);
    const normal = vec3(cross(t1, t2));

    positionsArray.push(vertices[a]);
    normalsArray.push(normal);
    positionsArray.push(vertices[b]);
    normalsArray.push(normal);
    positionsArray.push(vertices[c]);
    normalsArray.push(normal);
    positionsArray.push(vertices[a]);
    normalsArray.push(normal);
    positionsArray.push(vertices[c]);
    normalsArray.push(normal);
    positionsArray.push(vertices[d]);
    normalsArray.push(normal);
}

function colorCube() {
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
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
    program = initShaders(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);

    colorCube();

    const nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    const normalLoc = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    const projectionMatrix = ortho(-1, 1, -1, 1, -100, 100);

    const ambientProduct = mult(lightAmbient, materialAmbient);
    const diffuseProduct = mult(lightDiffuse, materialDiffuse);
    const specularProduct = mult(lightSpecular, materialSpecular);

    document.getElementById("ButtonX").onclick = () => { axis = xAxis; };
    document.getElementById("ButtonY").onclick = () => { axis = yAxis; };
    document.getElementById("ButtonZ").onclick = () => { axis = zAxis; };
    document.getElementById("ButtonC").onclick = () => {
        cflag = !cflag;
        gl.uniform1f(gl.getUniformLocation(program, "uCflag"), cflag);
    };
    document.getElementById("ButtonL").onclick = () => {
        lflag = !lflag;
        gl.uniform1f(gl.getUniformLocation(program, "uLflag"), lflag);
    };

    document.getElementById("ButtonT").onclick = () => { rflag = !rflag; };

    gl.uniform4fv(gl.getUniformLocation(program, "uAmbientProduct"),
        ambientProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uDiffuseProduct"),
        diffuseProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uSpecularProduct"),
        specularProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"),
        lightPosition);

    gl.uniform1f(gl.getUniformLocation(program, "uShininess"),
        materialShininess);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uProjectionMatrix"),
        false, flatten(projectionMatrix));

    const modelViewMatrix = lookAt(eye, at, up);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModelViewMatrix"),
        false, flatten(modelViewMatrix));

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (rflag) theta[axis] += 2.0;

    let rotationMatrix = mat4();
    rotationMatrix = mult(rotationMatrix, rotate(theta[xAxis], vec3(1, 0, 0)));
    rotationMatrix = mult(rotationMatrix, rotate(theta[yAxis], vec3(0, 1, 0)));
    rotationMatrix = mult(rotationMatrix, rotate(theta[zAxis], vec3(0, 0, 1)));

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uRotationMatrix"),
        false, flatten(rotationMatrix));
    gl.drawArrays(gl.TRIANGLES, 0, numPositions);
    requestAnimationFrame(render);
}

init();
