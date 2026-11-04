import { vec3, vec4, mat4, mult, subtract, cross, rotate, translate, scale, lookAt, perspective, normalMatrix, radians, flatten } from '../../Common/MV.mjs';
import { initShaders } from '../../Common/initShadersJS.mjs';

import vertexShaderSource from './shaders/shadedCubeHalfway.vert?raw';
import fragmentShaderSource from './shaders/shadedCubeHalfway.frag?raw';

let gl;
let program;
const loc = {};     // uniform locations, looked up once in init()

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

// light colors and material (the light position is computed every frame)
const lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
const lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
const lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

const materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
const materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
const materialSpecular = vec4(1.0, 0.8, 0.0, 1.0);

const markerColor = vec4(1.0, 1.0, 0.2, 1.0);
const markerSize = 0.08;

// camera: fixed, looking at the cube from +z; the perspective projection is
// what makes the viewer vector E differ from fragment to fragment
const eye = vec3(0.0, 0.0, 4.0);
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);
const fovy = 45.0;
const near = 0.1;
const far = 20.0;

// cube rotation
const xAxis = 0;
const yAxis = 1;
const zAxis = 2;
let axis = 0;
const theta = vec3(0, 0, 0);
let rotating = false;

// light position in spherical coordinates around the cube (degrees)
let lightAzimuth = 40.0;
let lightElevation = 30.0;
let lightDistance = 2.5;
let orbiting = true;

// specular model
let shininess = 50.0;
let useHalfway = true;
let compensate = false;

const $ = (id) => document.getElementById(id);

function quad(a, b, c, d) {
    const t1 = subtract(vertices[b], vertices[a]);
    const t2 = subtract(vertices[c], vertices[b]);
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

// light position in world coordinates from azimuth, elevation, distance
function lightPositionWorld() {
    const az = radians(lightAzimuth);
    const el = radians(lightElevation);
    return vec3(lightDistance * Math.cos(el) * Math.cos(az),
        lightDistance * Math.sin(el),
        lightDistance * Math.cos(el) * Math.sin(az));
}

// copy the JavaScript state into the sliders and their read-outs
function showControls() {
    $("Shininess").value = shininess;
    $("ShininessOut").textContent = shininess;
    $("Azimuth").value = lightAzimuth;
    $("AzimuthOut").textContent = Math.round(lightAzimuth);
    $("Elevation").value = lightElevation;
    $("ElevationOut").textContent = lightElevation;
    $("Distance").value = lightDistance;
    $("DistanceOut").textContent = lightDistance.toFixed(1);
}

function init() {
    const canvas = $("gl-canvas");

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

    for (const name of ["uModelViewMatrix", "uProjectionMatrix", "uNormalMatrix",
        "uAmbientProduct", "uDiffuseProduct", "uSpecularProduct", "uLightPosition",
        "uShininess", "uUseHalfway", "uUnlit", "uUnlitColor"]) {
        loc[name] = gl.getUniformLocation(program, name);
    }

    const projectionMatrix = perspective(fovy, canvas.width / canvas.height, near, far);
    gl.uniformMatrix4fv(loc.uProjectionMatrix, false, flatten(projectionMatrix));

    gl.uniform4fv(loc.uAmbientProduct, mult(lightAmbient, materialAmbient));
    gl.uniform4fv(loc.uDiffuseProduct, mult(lightDiffuse, materialDiffuse));
    gl.uniform4fv(loc.uSpecularProduct, mult(lightSpecular, materialSpecular));
    gl.uniform4fv(loc.uUnlitColor, markerColor);

    $("ButtonX").onclick = () => { axis = xAxis; };
    $("ButtonY").onclick = () => { axis = yAxis; };
    $("ButtonZ").onclick = () => { axis = zAxis; };
    $("ButtonT").onclick = () => { rotating = !rotating; };

    $("Halfway").checked = useHalfway;
    $("Compensate").checked = compensate;
    $("Orbit").checked = orbiting;

    $("Halfway").onchange = () => { useHalfway = $("Halfway").checked; };
    $("Compensate").onchange = () => { compensate = $("Compensate").checked; };
    $("Orbit").onchange = () => { orbiting = $("Orbit").checked; };

    $("Shininess").oninput = () => {
        shininess = Number($("Shininess").value);
        showControls();
    };
    $("Azimuth").oninput = () => {
        lightAzimuth = Number($("Azimuth").value);
        showControls();
    };
    $("Elevation").oninput = () => {
        lightElevation = Number($("Elevation").value);
        showControls();
    };
    $("Distance").oninput = () => {
        lightDistance = Number($("Distance").value);
        showControls();
    };

    showControls();
    render();
}

function drawCube(modelViewMatrix) {
    gl.uniformMatrix4fv(loc.uModelViewMatrix, false, flatten(modelViewMatrix));
    gl.uniformMatrix3fv(loc.uNormalMatrix, false, flatten(normalMatrix(modelViewMatrix, true)));
    gl.drawArrays(gl.TRIANGLES, 0, numPositions);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (rotating) theta[axis] += 2.0;

    if (orbiting) {
        lightAzimuth = (lightAzimuth + 1.0) % 360.0;
        showControls();
    }

    const viewMatrix = lookAt(eye, at, up);

    // the cube rotates; the light and the camera do not
    let modelMatrix = mat4();
    modelMatrix = mult(modelMatrix, rotate(theta[xAxis], vec3(1, 0, 0)));
    modelMatrix = mult(modelMatrix, rotate(theta[yAxis], vec3(0, 1, 0)));
    modelMatrix = mult(modelMatrix, rotate(theta[zAxis], vec3(0, 0, 1)));

    // the shader works in eye coordinates, so move the light there
    const lightWorld = lightPositionWorld();
    const lightEye = mult(viewMatrix, vec4(lightWorld[0], lightWorld[1], lightWorld[2], 1.0));
    gl.uniform4fv(loc.uLightPosition, flatten(lightEye));

    gl.uniform1f(loc.uShininess, (useHalfway && compensate) ? 4.0 * shininess : shininess);
    gl.uniform1i(loc.uUseHalfway, useHalfway ? 1 : 0);

    // the lit cube
    gl.uniform1i(loc.uUnlit, 0);
    drawCube(mult(viewMatrix, modelMatrix));

    // a small unlit cube marks the light
    let markerMatrix = translate(lightWorld[0], lightWorld[1], lightWorld[2]);
    markerMatrix = mult(markerMatrix, scale(markerSize, markerSize, markerSize));
    gl.uniform1i(loc.uUnlit, 1);
    drawCube(mult(viewMatrix, markerMatrix));

    requestAnimationFrame(render);
}

init();
