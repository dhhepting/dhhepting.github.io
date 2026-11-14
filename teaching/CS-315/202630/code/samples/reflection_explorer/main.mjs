import { vec3, lookAt, ortho, perspective, translate, scale, mult, normalMatrix, transpose, flatten } from '../../common/MV.mjs';
import { initShaders } from '../../common/initShadersJS.mjs';

import { ENVIRONMENTS, generateFaces, viewImage } from './environments.mjs';
import { buildMesh, buildSphere } from './meshes.mjs';
import { EXAMPLES, GROUPS, exampleById } from './examples.mjs';
import {
    COMPARES, SHADE_INDEX, passConfigs, filterForPass, viewRotationInverse, envRotationMatrix,
    lightInEyeSpace, objectPositions, faceViewMatrices, rotationMatrix,
} from './reflectMath.mjs';

// Shader files are fetched (not imported with ?raw) so that this page also works
// when it is served as-is, without a bundler.
const shaderURLs = {
    reflectVert: new URL('./shaders/reflect.vert', import.meta.url),
    reflectFrag: new URL('./shaders/reflect.frag', import.meta.url),
    skyboxVert: new URL('./shaders/skybox.vert', import.meta.url),
    skyboxFrag: new URL('./shaders/skybox.frag', import.meta.url),
    sceneVert: new URL('./shaders/scene.vert', import.meta.url),
    sceneFrag: new URL('./shaders/scene.frag', import.meta.url),
};

let canvas;
let gl;

const programs = {};
const samplers = {};

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);
const fovy = 40.0;
const tanHalfFov = Math.tan(fovy * Math.PI / 360.0);

// --------------------------------------------------------------------- state
//
// Choosing an example resets the state to these values and then applies the
// example's preset (examples.mjs).

const baseState = {
    // the object
    shape: "sphere", subdivisions: 4, rotX: 0, rotY: 0, rotZ: 0, spin: false, spinAxis: "y", spinSpeed: 40,
    // the material
    material: "mirror", tint: [1.0, 0.8, 0.0], reflectivity: 0.05, roughness: 0.3, ior: 1.5, dispersion: 0.03,
    shininess: 20, ambient: 0.2, lightFixedToCamera: true, lightAzimuth: 40, lightElevation: 35,
    // the environment
    environment: "sky", envSize: 256, envFilter: "LINEAR", envRotation: 0, envSource: "static", dynamicSize: 256,
    showObjects: true, objectSpeed: 1.0,
    // how the reflection vector is computed
    space: "world", where: "fragment", eyeNormalized: false, normalMatrixMode: "correct", skybox: true,
    // the view
    projection: "perspective", radius: 4.0, cameraAzimuth: 0.0, cameraElevation: 15.0, orbitCamera: false, viewMode: 0,
    // the comparison
    compare: "off", splitX: 0.5,
};

let state = { ...baseState, tint: [...baseState.tint] };
let exampleId = "reflectionMap";

// what needs doing before the next frame
let meshDirty = true;
let environmentDirty = true;
let needsRedraw = true;

let meshBuffers = null;
let mesh = null;
let sphereBuffers = null;                 // the small spheres that orbit the object
let staticEnvironment = null;             // { texture, size }
let dynamicEnvironment = null;            // { texture, size, framebuffer, depth, ok }
let dynamicFailed = false;

let spinAngle = 0.0;
let time = 0.0;
let lastTime = null;
const enabledAttributes = [];

const $ = (id) => document.getElementById(id);
const log2 = (n) => Math.round(Math.log2(Math.max(1, n)));
const currentExample = () => exampleById(exampleId);

// ------------------------------------------------------------------ programs

function makeProgram(vertexSource, fragmentSource, uniformNames, attributeNames) {
    const program = initShaders(gl, vertexSource, fragmentSource);
    const uniforms = {};
    for (const name of uniformNames) uniforms[name] = gl.getUniformLocation(program, name);
    const attributes = {};
    for (const name of attributeNames) attributes[name] = gl.getAttribLocation(program, name);
    return { program, uniforms, attributes };
}

function createBuffers(mesh) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);

    return { positionBuffer, normalBuffer, vertexCount: mesh.vertexCount };
}

function drawMesh(program, buffers) {
    gl.useProgram(program.program);
    for (const [name, buffer] of [["aPosition", buffers.positionBuffer], ["aNormal", buffers.normalBuffer]]) {
        const location = program.attributes[name];
        if (location < 0) continue;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);     // a vec3 into the shader's vec4 position gives w = 1
        gl.enableVertexAttribArray(location);
        enabledAttributes.push(location);
    }
    gl.drawArrays(gl.TRIANGLES, 0, buffers.vertexCount);
    while (enabledAttributes.length) gl.disableVertexAttribArray(enabledAttributes.pop());
}

// ---------------------------------------------------------------- environments

function createCanvas(n) {
    const surface = document.createElement("canvas");
    surface.width = n;
    surface.height = n;
    return surface;
}

function makeSamplers() {
    for (const name of ["NEAREST", "LINEAR", "LINEAR_MIPMAP_LINEAR"]) {
        const sampler = gl.createSampler();
        gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, gl[name]);
        gl.samplerParameteri(sampler, gl.TEXTURE_MAG_FILTER, name === "NEAREST" ? gl.NEAREST : gl.LINEAR);
        gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        samplers[name] = sampler;
    }
}

function uploadStaticEnvironment() {
    const { faces, size } = generateFaces(state.environment, state.envSize, { createCanvas });

    if (staticEnvironment) gl.deleteTexture(staticEnvironment.texture);
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    for (let face = 0; face < 6; face++) {
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, 0, gl.RGBA8, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, faces[face]);
    }
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    staticEnvironment = { texture, size };

    drawEnvironmentPreview(faces, size);
}

// The unfolded cube, as seen from inside: +Y above +Z, and +X +Z -X -Z in a row.
const crossLayout = [[2, 1, 0], [0, 0, 1], [4, 1, 1], [1, 2, 1], [5, 3, 1], [3, 1, 2]];     // [face, column, row]

function drawEnvironmentPreview(faces, size) {
    const n = 96;
    const preview = $("EnvPreview");
    preview.width = 4 * n;
    preview.height = 3 * n;
    const context = preview.getContext("2d");
    context.fillStyle = "#14181d";
    context.fillRect(0, 0, preview.width, preview.height);

    for (const [face, column, row] of crossLayout) {
        const pixels = viewImage(faces, size, face, n);
        const image = context.createImageData(n, n);
        image.data.set(pixels);
        context.putImageData(image, column * n, row * n);
    }
}

function ensureDynamicEnvironment() {
    if (dynamicEnvironment && dynamicEnvironment.size === state.dynamicSize) return dynamicEnvironment.ok;

    if (dynamicEnvironment) {
        gl.deleteTexture(dynamicEnvironment.texture);
        gl.deleteFramebuffer(dynamicEnvironment.framebuffer);
        gl.deleteRenderbuffer(dynamicEnvironment.depth);
    }

    const size = state.dynamicSize;
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    for (let face = 0; face < 6; face++) {
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, 0, gl.RGBA8, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    const depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, size, size);

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    dynamicEnvironment = { texture, size, framebuffer, depth, ok };
    dynamicFailed = !ok;
    return ok;
}

// ------------------------------------------------------------------ drawing

const toRadians = (degrees) => degrees * Math.PI / 180.0;

function cameraEye() {
    const az = toRadians(state.cameraAzimuth);
    const el = toRadians(state.cameraElevation);
    return vec3(state.radius * Math.cos(el) * Math.sin(az), state.radius * Math.sin(el), state.radius * Math.cos(el) * Math.cos(az));
}

const rotations = () => {
    const angles = [state.rotX, state.rotY, state.rotZ];
    angles[{ x: 0, y: 1, z: 2 }[state.spinAxis]] += spinAngle;
    return angles;
};

function drawSkybox(rotationInverse, aspect) {
    const p = programs.skybox;
    gl.useProgram(p.program);
    gl.uniform1i(p.uniforms.uEnv, 0);
    gl.uniformMatrix3fv(p.uniforms.uSkyRotation, false, rotationInverse);
    gl.uniformMatrix3fv(p.uniforms.uEnvMatrix, false, envRotationMatrix(state.envRotation));
    gl.uniform1f(p.uniforms.uTanHalfFov, tanHalfFov);
    gl.uniform1f(p.uniforms.uAspect, aspect);

    gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLES, 0, 3);          // a full-screen triangle with no vertex data
    gl.enable(gl.DEPTH_TEST);
}

function drawOrbitingObjects(view, projectionMatrix, lightEye) {
    const p = programs.scene;
    gl.useProgram(p.program);
    gl.uniformMatrix4fv(p.uniforms.uProjectionMatrix, false, flatten(projectionMatrix));
    const length = Math.hypot(lightEye[0], lightEye[1], lightEye[2]);
    gl.uniform3fv(p.uniforms.uLightDirection, [lightEye[0] / length, lightEye[1] / length, lightEye[2] / length]);

    for (const object of objectPositions(time)) {
        const modelView = mult(view, mult(translate(...object.position), scale(object.radius, object.radius, object.radius)));
        gl.uniformMatrix4fv(p.uniforms.uModelViewMatrix, false, flatten(modelView));
        gl.uniformMatrix3fv(p.uniforms.uNormalMatrix, false, flatten(normalMatrix(modelView, true)));
        gl.uniform3fv(p.uniforms.uColor, object.colour);
        drawMesh(p, sphereBuffers);
    }
}

// Re-render the environment from the object's position, into the six faces of a cube map.
function updateDynamicEnvironment() {
    if (!ensureDynamicEnvironment()) return;
    const { texture, size, framebuffer } = dynamicEnvironment;
    const projectionMatrix = perspective(90.0, 1.0, 0.1, 50.0);

    gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, size, size);

    // the static environment is the backdrop for every face
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, staticEnvironment.texture);
    gl.bindSampler(0, samplers.LINEAR);

    faceViewMatrices().forEach((view, face) => {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, texture, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        drawSkybox(viewRotationInverse(view), 1.0);
        if (state.showObjects) drawOrbitingObjects(view, projectionMatrix, lightInEyeSpace({ ...state, lightFixedToCamera: false }, view));
    });

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
}

function drawReflectiveObject(config, view, projectionMatrix, modelView, envTextureSize) {
    const p = programs.reflect;
    const u = p.uniforms;
    gl.useProgram(p.program);

    const correct = normalMatrix(modelView, true);
    const normalMatrixForPass = (config.normalMatrix === "sample") ? transpose(correct) : correct;    // reflectionMap2.js uploads the transpose

    const tint = state.tint;
    gl.uniformMatrix4fv(u.uModelViewMatrix, false, flatten(modelView));
    gl.uniformMatrix4fv(u.uProjectionMatrix, false, flatten(projectionMatrix));
    gl.uniformMatrix3fv(u.uNormalMatrix, false, flatten(normalMatrixForPass));
    gl.uniformMatrix3fv(u.uViewRotationInverse, false, viewRotationInverse(view));
    gl.uniformMatrix3fv(u.uEnvMatrix, false, envRotationMatrix(state.envRotation));

    gl.uniform1i(u.uSpace, config.space === "world" ? 1 : 0);
    gl.uniform1i(u.uWhere, config.where === "fragment" ? 1 : 0);
    gl.uniform1i(u.uEyeNormalized, config.eyeNormalized ? 1 : 0);
    gl.uniform1i(u.uShade, SHADE_INDEX[config.material]);
    gl.uniform1i(u.uView, state.viewMode);
    gl.uniform1i(u.uEnv, 0);

    gl.uniform3fv(u.uTint, tint);
    gl.uniform1f(u.uReflectivity, state.reflectivity);
    gl.uniform1f(u.uRoughness, state.roughness);
    gl.uniform1f(u.uMaxLod, log2(envTextureSize));
    gl.uniform1f(u.uIor, state.ior);
    gl.uniform1f(u.uDispersion, state.dispersion);

    gl.uniform4fv(u.uLightPosition, lightInEyeSpace(state, view));
    gl.uniform3fv(u.uAmbientProduct, [state.ambient * tint[0], state.ambient * tint[1], state.ambient * tint[2]]);
    gl.uniform3fv(u.uDiffuseProduct, tint);
    gl.uniform3fv(u.uSpecularProduct, [1.0, 1.0, 1.0]);
    gl.uniform1f(u.uShininess, state.shininess);

    drawMesh(p, meshBuffers);
}

const usesDynamic = (passes) => passes.some((pass) => pass.config.envSource === "dynamic");

function drawFrame() {
    const width = canvas.width;
    const height = canvas.height;

    const view = lookAt(cameraEye(), at, up);
    const half = state.radius * tanHalfFov;
    const projectionMatrix = (state.projection === "perspective")
        ? perspective(fovy, width / height, 0.1, 60.0)
        : ortho(-half, half, -half, half, -60.0, 60.0);
    const modelView = mult(view, rotationMatrix(rotations()));
    const lightEye = lightInEyeSpace(state, view);

    const passes = passConfigs(state, width);
    if (usesDynamic(passes)) updateDynamicEnvironment();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.enable(gl.SCISSOR_TEST);

    for (const pass of passes) {
        gl.scissor(pass.x, 0, pass.width, height);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const dynamic = pass.config.envSource === "dynamic" && dynamicEnvironment && dynamicEnvironment.ok;
        const environment = dynamic ? dynamicEnvironment : staticEnvironment;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindSampler(0, samplers[filterForPass(pass.config)]);

        // The background is always the static world: a dynamic cube map already contains the orbiting
        // spheres as seen from the object's centre, and drawing it behind the real spheres would show them twice.
        if (state.skybox) {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, staticEnvironment.texture);
            drawSkybox(viewRotationInverse(view), width / height);
        }
        if (state.showObjects) drawOrbitingObjects(view, projectionMatrix, lightEye);

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, environment.texture);
        drawReflectiveObject(pass.config, view, projectionMatrix, modelView, environment.size);
    }

    // the divider
    if (passes.length === 2) {
        gl.scissor(passes[1].x - 1, 0, 2, height);
        gl.clearColor(0.05, 0.05, 0.06, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.disable(gl.SCISSOR_TEST);
    gl.bindSampler(0, null);
}

const animatingObjects = () => (state.showObjects || usesDynamic(passConfigs(state, canvas.width))) && state.objectSpeed > 0;
const animating = () => state.orbitCamera || state.spin || animatingObjects();

function render(now) {
    requestAnimationFrame(render);

    const dt = (lastTime === null) ? 0.0 : Math.max(0.0, Math.min(0.1, (now - lastTime) / 1000.0));
    lastTime = now;

    if (animating()) {
        if (state.orbitCamera) state.cameraAzimuth = (((state.cameraAzimuth + dt * 12.0) % 360.0) + 360.0) % 360.0;
        if (state.spin) spinAngle = (spinAngle + dt * state.spinSpeed) % 360.0;
        if (animatingObjects()) time += dt * state.objectSpeed;
        syncControls();
        needsRedraw = true;
    }

    if (meshDirty) {
        mesh = buildMesh(state.shape, state.subdivisions);
        if (meshBuffers) { gl.deleteBuffer(meshBuffers.positionBuffer); gl.deleteBuffer(meshBuffers.normalBuffer); }
        meshBuffers = createBuffers(mesh);
        meshDirty = false;
        needsRedraw = true;
    }
    if (environmentDirty) {
        uploadStaticEnvironment();
        environmentDirty = false;
        needsRedraw = true;
    }

    if (needsRedraw) {
        drawFrame();
        updateStatus();
        needsRedraw = false;
    }
}

// ------------------------------------------------------------------------ UI
//
// Each entry ties a control's id to a key of the state. "dirty" says what has to
// be redone when it changes.

const rangeControls = {
    Subdivisions:   { key: "subdivisions",  digits: 0, dirty: "mesh" },
    RotX:           { key: "rotX",          digits: 0, dirty: "redraw" },
    RotY:           { key: "rotY",          digits: 0, dirty: "redraw" },
    RotZ:           { key: "rotZ",          digits: 0, dirty: "redraw" },
    SpinSpeed:      { key: "spinSpeed",     digits: 0, dirty: "redraw" },
    Reflectivity:   { key: "reflectivity",  digits: 2, dirty: "redraw" },
    Roughness:      { key: "roughness",     digits: 2, dirty: "redraw" },
    Ior:            { key: "ior",           digits: 2, dirty: "redraw" },
    Dispersion:     { key: "dispersion",    digits: 3, dirty: "redraw" },
    Shininess:      { key: "shininess",     digits: 0, dirty: "redraw" },
    Ambient:        { key: "ambient",       digits: 2, dirty: "redraw" },
    LightAzimuth:   { key: "lightAzimuth",  digits: 0, dirty: "redraw" },
    LightElevation: { key: "lightElevation", digits: 0, dirty: "redraw" },
    EnvRotation:    { key: "envRotation",   digits: 0, dirty: "redraw" },
    ObjectSpeed:    { key: "objectSpeed",   digits: 1, dirty: "redraw" },
    Radius:         { key: "radius",        digits: 2, dirty: "redraw" },
    CameraAzimuth:  { key: "cameraAzimuth", digits: 0, dirty: "redraw" },
    CameraElevation: { key: "cameraElevation", digits: 0, dirty: "redraw" },
    SplitX:         { key: "splitX",        digits: 2, dirty: "redraw" },
};

// numeric: the select's values are numbers
const selectControls = {
    Shape:        { key: "shape",            dirty: "mesh" },
    SpinAxis:     { key: "spinAxis",         dirty: "redraw" },
    Material:     { key: "material",         dirty: "redraw" },
    Environment:  { key: "environment",      dirty: "environment" },
    EnvSize:      { key: "envSize",          numeric: true, dirty: "environment" },
    EnvFilter:    { key: "envFilter",        dirty: "redraw" },
    EnvSource:    { key: "envSource",        dirty: "redraw" },
    DynamicSize:  { key: "dynamicSize",      numeric: true, dirty: "redraw" },
    Space:        { key: "space",            dirty: "redraw" },
    Where:        { key: "where",            dirty: "redraw" },
    NormalMatrix: { key: "normalMatrixMode", dirty: "redraw" },
    Projection:   { key: "projection",       dirty: "redraw" },
    ViewMode:     { key: "viewMode",         numeric: true, dirty: "redraw" },
    Compare:      { key: "compare",          dirty: "redraw" },
};

const checkControls = {
    Spin:         { key: "spin",               dirty: "redraw" },
    LightFixed:   { key: "lightFixedToCamera", dirty: "redraw" },
    ShowObjects:  { key: "showObjects",        dirty: "redraw" },
    EyeNormalized: { key: "eyeNormalized",     dirty: "redraw" },
    Skybox:       { key: "skybox",             dirty: "redraw" },
    OrbitCamera:  { key: "orbitCamera",        dirty: "redraw" },
};

function markDirty(kind) {
    if (kind === "mesh") meshDirty = true;
    if (kind === "environment") environmentDirty = true;
    needsRedraw = true;
}

function rgbToHex(rgb) {
    return "#" + rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");
}

function hexToRgb(hex) {
    return [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
}

function setOutput(id, value, digits) {
    $(`${id}Out`).textContent = Number(value).toFixed(digits);
}

function syncControls() {
    for (const [id, control] of Object.entries(rangeControls)) {
        $(id).value = state[control.key];
        setOutput(id, state[control.key], control.digits);
    }
    for (const [id, control] of Object.entries(selectControls)) $(id).value = String(state[control.key]);
    for (const [id, control] of Object.entries(checkControls)) $(id).checked = Boolean(state[control.key]);
    $("Tint").value = rgbToHex(state.tint);
    $("Example").value = exampleId;

    $("Subdivisions").disabled = state.shape !== "sphere";
    $("EnvSize").disabled = ENVIRONMENTS[state.environment].fixedSize !== undefined;
    $("LightAzimuth").disabled = state.lightFixedToCamera;
    $("LightElevation").disabled = state.lightFixedToCamera;
    $("SplitX").disabled = state.compare === "off";
    $("SpinSpeed").disabled = !state.spin;
}

function updateStatus() {
    const messages = [];
    const compare = COMPARES[state.compare];
    if (state.compare !== "off") messages.push(compare.note);

    const passes = passConfigs(state, canvas.width);
    if (usesDynamic(passes) && dynamicFailed) {
        messages.push("The dynamic environment could not be created (the framebuffer is incomplete in this browser), so the static environment is used.");
    }
    if (passes.some((p) => p.config.material === "glossy")) {
        messages.push("Glossy reflections read blurred mip levels, so they always use a mipmapped filter.");
    }
    if (state.projection === "ortho") {
        messages.push("With an orthographic projection the viewing rays are parallel, but the reflection maths still assumes an eye at a point, as the textbook samples do.");
    }
    if (ENVIRONMENTS[state.environment].fixedSize !== undefined) {
        messages.push("This environment has 1 × 1 faces, as in the samples; NEAREST shows six flat colours, LINEAR blends them.");
    }

    $("Status").textContent = messages.join(" ");
    $("Status").hidden = messages.length === 0;
}

function chooseExample(id) {
    exampleId = id;
    const example = currentExample();
    state = { ...baseState, tint: [...baseState.tint], ...example.preset };
    if (example.preset.tint) state.tint = [...example.preset.tint];
    spinAngle = 0.0;
    time = 0.0;

    $("ExampleLook").textContent = example.look;
    markDirty("mesh");
    markDirty("environment");
}

function buildMenus() {
    const menu = $("Example");
    for (const group of GROUPS) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = group;
        for (const example of EXAMPLES.filter((e) => e.group === group)) {
            const option = document.createElement("option");
            option.value = example.id;
            option.textContent = example.label;
            optgroup.append(option);
        }
        menu.append(optgroup);
    }

    for (const [id, environment] of Object.entries(ENVIRONMENTS)) {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = environment.label;
        $("Environment").append(option);
    }
    for (const [id, compare] of Object.entries(COMPARES)) {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = compare.label;
        $("Compare").append(option);
    }
}

function attachControls() {
    for (const [id, control] of Object.entries(rangeControls)) {
        $(id).oninput = (e) => {
            state[control.key] = Number(e.target.value);
            setOutput(id, e.target.value, control.digits);
            markDirty(control.dirty);
        };
    }

    for (const [id, control] of Object.entries(selectControls)) {
        $(id).onchange = (e) => {
            state[control.key] = control.numeric ? Number(e.target.value) : e.target.value;
            markDirty(control.dirty);
            syncControls();
        };
    }

    for (const [id, control] of Object.entries(checkControls)) {
        $(id).onchange = (e) => {
            state[control.key] = e.target.checked;
            markDirty(control.dirty);
            syncControls();
        };
    }

    $("Example").onchange = (e) => {
        chooseExample(e.target.value);
        syncControls();
    };

    $("Tint").oninput = (e) => { state.tint = hexToRgb(e.target.value); needsRedraw = true; };

    // Drag to orbit the camera, scroll to zoom.
    let dragging = false;
    let last = null;

    canvas.onpointerdown = (e) => {
        dragging = true;
        last = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
    };
    canvas.onpointermove = (e) => {
        if (!dragging) return;
        const dx = (e.clientX - last.x) * 0.4;
        const dy = (e.clientY - last.y) * 0.4;
        last = { x: e.clientX, y: e.clientY };
        state.cameraAzimuth = (((state.cameraAzimuth - dx) % 360.0) + 360.0) % 360.0;
        state.cameraElevation = Math.max(-85.0, Math.min(85.0, state.cameraElevation + dy));
        syncControls();
        needsRedraw = true;
    };
    canvas.onpointerup = () => { dragging = false; };
    canvas.onpointercancel = () => { dragging = false; };
    canvas.onwheel = (e) => {
        e.preventDefault();
        state.radius = Math.max(1.5, Math.min(12.0, state.radius * (1.0 + e.deltaY * 0.001)));
        syncControls();
        needsRedraw = true;
    };
}

// ----------------------------------------------------------------------- main

async function loadShaderSources() {
    const entries = await Promise.all(Object.entries(shaderURLs).map(async ([key, url]) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not load ${url.pathname.split("/").pop()} (HTTP ${response.status})`);
        return [key, await response.text()];
    }));
    return Object.fromEntries(entries);
}

async function init() {
    try {
        const sources = await loadShaderSources();

        canvas = $("gl-canvas");

        gl = canvas.getContext('webgl2');
        if (!gl) alert("WebGL 2.0 isn't available");

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        //
        //  Load shaders
        //
        programs.reflect = makeProgram(sources.reflectVert, sources.reflectFrag, [
            "uModelViewMatrix", "uProjectionMatrix", "uNormalMatrix", "uViewRotationInverse", "uEnvMatrix",
            "uSpace", "uWhere", "uEyeNormalized", "uShade", "uView", "uEnv", "uTint", "uReflectivity", "uRoughness",
            "uMaxLod", "uIor", "uDispersion", "uLightPosition", "uAmbientProduct", "uDiffuseProduct",
            "uSpecularProduct", "uShininess"], ["aPosition", "aNormal"]);
        programs.skybox = makeProgram(sources.skyboxVert, sources.skyboxFrag,
            ["uEnv", "uSkyRotation", "uEnvMatrix", "uTanHalfFov", "uAspect"], []);
        programs.scene = makeProgram(sources.sceneVert, sources.sceneFrag,
            ["uModelViewMatrix", "uProjectionMatrix", "uNormalMatrix", "uColor", "uLightDirection"], ["aPosition", "aNormal"]);

        makeSamplers();
        sphereBuffers = createBuffers(buildSphere(3));

        buildMenus();
        chooseExample(exampleId);
        attachControls();
        syncControls();

        requestAnimationFrame(render);
    } catch (error) {
        console.error(error);
        const box = $("fatal");
        box.hidden = false;
        box.textContent = `Could not start: ${error.message}`;
    }
}

init();
