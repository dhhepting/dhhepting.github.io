import { mat4, flatten } from '../../../common/MV.mjs';
import { initShaders } from '../../../common/initShadersJS.mjs';

import { buildScene, cubeModel, lightPosition, lightMatrices, projectorMatrices, cameraMatrices, makeSlide, windowDepth } from './lightMath.mjs';
import { COMPARES, configsFor, STORAGE_INDEX, PROJECTOR_INDEX, EXAMPLES, GROUPS, exampleById } from './examples.mjs';

// Shader files are fetched (not imported with ?raw) so that this page also works
// when it is served as-is, without a bundler.
const shaderURLs = {
    depthVert: new URL('./shaders/depth.vert', import.meta.url),
    depthFrag: new URL('./shaders/depth.frag', import.meta.url),
    sceneVert: new URL('./shaders/scene.vert', import.meta.url),
    sceneFrag: new URL('./shaders/scene.frag', import.meta.url),
    fullscreenVert: new URL('./shaders/fullscreen.vert', import.meta.url),
    showDepthFrag: new URL('./shaders/showDepth.frag', import.meta.url),
};

let canvas;
let gl;
const programs = {};
const meshes = {};
const samplers = {};
let slideTexture;
let dummyColour;                       // 1 x 1 stand-ins, so every sampler always has a texture of the right kind
let dummyDepth;
const shadowMaps = {};                 // by storage mode and size

const NEAR = 3.0;
const FAR = 10.0;

// --------------------------------------------------------------------- state

const baseState = {
    storage: "depthTexture", bias: 0.005, slopeBias: false, pcf: 0, mapSize: 1024, shadows: true, sampleShading: false, ambient: 0.3,
    projector: "off", floor: true, triangle: true, view: "camera", inset: true, compare: "off", splitX: 0.5,
    sampleCamera: false, cameraAzimuth: 25, cameraElevation: 28, cameraDistance: 4.2,
    sampleLight: true, lightAzimuth: 11, lightElevation: 30, lightDistance: 5.9, orbitLight: false,
    rotate: false, axis: 1,
};

let state = { ...baseState };
let exampleId = "shadowMap";
let theta = [0, 45, 0];                // shadowMap.js's initial angles
let lastTime = null;

const $ = (id) => document.getElementById(id);
const currentExample = () => exampleById(exampleId);

// ----------------------------------------------------------------- resources

function makeMesh(data) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    [[data.positions, 0], [data.normals, 1], [data.colours, 2]].forEach(([array, location]) => {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);
        gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(location);
    });
    gl.bindVertexArray(null);
    return { vao, count: data.vertexCount };
}

function texture2D(internal, width, height, format, type, data) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, format, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
}

function makeSampler(filter, compare) {
    const s = gl.createSampler();
    gl.samplerParameteri(s, gl.TEXTURE_MIN_FILTER, filter);
    gl.samplerParameteri(s, gl.TEXTURE_MAG_FILTER, filter);
    gl.samplerParameteri(s, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.samplerParameteri(s, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (compare) {
        gl.samplerParameteri(s, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
        gl.samplerParameteri(s, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    }
    return s;
}

/** The shadow map for a storage mode: a colour texture plus depth renderbuffer, or a depth texture alone. */
function shadowMap(storage) {
    const size = state.mapSize;
    const key = `${storage}-${size}`;
    if (shadowMaps[key]) return shadowMaps[key];

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    let colour = null, depth = null;
    if (storage === "depthTexture") {
        depth = texture2D(gl.DEPTH_COMPONENT24, size, size, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
        gl.drawBuffers([gl.NONE]);
        gl.readBuffer(gl.NONE);
    } else {
        colour = texture2D(gl.RGBA8, size, size, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colour, 0);
        const renderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, size, size);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
    }
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`Shadow map ${key} is not complete`);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    shadowMaps[key] = { framebuffer, colour, depth, size };
    return shadowMaps[key];
}

// ------------------------------------------------------------------ drawing

function sceneObjects() {
    const list = [{ mesh: meshes.cube, model: cubeModel(theta) }];
    if (state.triangle) list.push({ mesh: meshes.triangle, model: mat4() });
    if (state.floor) list.push({ mesh: meshes.floor, model: mat4() });
    return list;
}

function frameMatrices() {
    const lightPos = lightPosition({ sample: state.sampleLight, azimuth: state.lightAzimuth, elevation: state.lightElevation, distance: state.lightDistance });
    const light = lightMatrices(lightPos, { near: NEAR, far: FAR });
    const camera = cameraMatrices({ sample: state.sampleCamera, azimuth: state.cameraAzimuth, elevation: state.cameraElevation, distance: state.cameraDistance }, 1);
    return { lightPos, light, camera };
}

function renderShadowMap(storage, light) {
    const map = shadowMap(storage);
    gl.bindFramebuffer(gl.FRAMEBUFFER, map.framebuffer);
    gl.viewport(0, 0, map.size, map.size);
    gl.disable(gl.SCISSOR_TEST);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    if (storage !== "depthTexture") {
        // nothing drawn = as far as possible: 1 in one channel, or 1 packed (255, 0, 0, 0 reads as 1)
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        if (storage === "packed") gl.clearColor(1.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    } else {
        gl.clear(gl.DEPTH_BUFFER_BIT);
    }
    const p = programs.depth;
    gl.useProgram(p.program);
    gl.uniformMatrix4fv(p.uniforms.uLightProjectionMatrix, false, flatten(light.projection));
    gl.uniformMatrix4fv(p.uniforms.uLightViewMatrix, false, flatten(light.view));
    gl.uniform1i(p.uniforms.uStorage, STORAGE_INDEX[storage]);
    for (const { mesh, model } of sceneObjects()) {
        gl.uniformMatrix4fv(p.uniforms.uModelMatrix, false, flatten(model));
        gl.bindVertexArray(mesh.vao);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    }
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function bindShadowTextures(storage, rawDepth = false) {
    const map = shadowMap(storage);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, map.colour || dummyColour);
    gl.bindSampler(0, samplers.nearest);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, map.depth || dummyDepth);
    gl.bindSampler(1, rawDepth ? samplers.nearest : samplers.compare);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, slideTexture);
    gl.bindSampler(2, samplers.linear);
}

function drawCameraPass(config, matrices) {
    const { lightPos, light, camera } = matrices;
    const projector = projectorMatrices(lightPos, config.projector === "sample");
    bindShadowTextures(config.storage);

    const p = programs.scene;
    gl.useProgram(p.program);
    const u = p.uniforms;
    gl.uniform1i(u.uShadowColor, 0);
    gl.uniform1i(u.uShadowDepth, 1);
    gl.uniform1i(u.uSlide, 2);
    gl.uniformMatrix4fv(u.uViewMatrix, false, flatten(camera.view));
    gl.uniformMatrix4fv(u.uProjectionMatrix, false, flatten(camera.projection));
    gl.uniformMatrix4fv(u.uLightViewMatrix, false, flatten(light.view));
    gl.uniformMatrix4fv(u.uLightProjectionMatrix, false, flatten(light.projection));
    gl.uniformMatrix4fv(u.uProjectorViewMatrix, false, flatten(projector.view));
    gl.uniformMatrix4fv(u.uProjectorProjectionMatrix, false, flatten(projector.projection));
    gl.uniform1i(u.uStorage, STORAGE_INDEX[config.storage]);
    gl.uniform1i(u.uShadows, state.shadows ? 1 : 0);
    gl.uniform1f(u.uBias, config.bias);
    gl.uniform1i(u.uSlopeBias, config.slopeBias ? 1 : 0);
    gl.uniform1i(u.uPcf, config.pcf);
    gl.uniform1f(u.uMapSize, state.mapSize);
    gl.uniform3fv(u.uLightPosition, lightPos);
    gl.uniform1f(u.uAmbient, state.ambient);
    gl.uniform1i(u.uProjector, PROJECTOR_INDEX[config.projector]);
    gl.uniform1i(u.uSampleShading, state.sampleShading ? 1 : 0);
    gl.uniform1i(u.uView, { camera: 0, test: 1, difference: 2 }[state.view] ?? 0);

    for (const { mesh, model } of sceneObjects()) {
        gl.uniformMatrix4fv(u.uModelMatrix, false, flatten(model));
        gl.bindVertexArray(mesh.vao);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    }
    gl.bindVertexArray(null);
}

function drawDepthMap(storage, lightPos, viewport) {
    bindShadowTextures(storage, true);
    gl.viewport(...viewport);
    gl.disable(gl.DEPTH_TEST);
    const p = programs.showDepth;
    gl.useProgram(p.program);
    gl.uniform1i(p.uniforms.uShadowColor, 0);
    gl.uniform1i(p.uniforms.uShadowDepthRaw, 1);
    gl.uniform1i(p.uniforms.uStorage, STORAGE_INDEX[storage]);
    // stretch the depths of the region around the origin, from 2 units nearer than it to 2 farther
    const d = Math.hypot(...lightPos);
    gl.uniform1f(p.uniforms.uLow, windowDepth(Math.max(NEAR, d - 2), NEAR, FAR));
    gl.uniform1f(p.uniforms.uHigh, windowDepth(Math.min(FAR, d + 2), NEAR, FAR));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
}

function drawFrame() {
    const matrices = frameMatrices();
    const configs = configsFor(state);

    // the light pass, once per storage mode in use
    for (const storage of new Set(configs.map((c) => c.storage))) renderShadowMap(storage, matrices.light);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const w = canvas.width, h = canvas.height;

    if (state.view === "lightDepth") {
        gl.disable(gl.SCISSOR_TEST);
        drawDepthMap(configs[0].storage, matrices.lightPos, [0, 0, w, h]);
        return;
    }

    const split = Math.round(state.splitX * w);
    const halves = configs.length === 2 ? [[0, split], [split, w - split]] : [[0, w]];
    gl.enable(gl.SCISSOR_TEST);
    configs.forEach((config, k) => {
        const [x, width] = halves[k];
        gl.scissor(x, 0, width, h);
        gl.viewport(0, 0, w, h);
        gl.clearColor(0.5, 0.5, 0.5, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        drawCameraPass(config, matrices);
    });
    if (configs.length === 2) {
        gl.scissor(split - 1, 0, 2, h);
        gl.clearColor(0.05, 0.05, 0.06, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.disable(gl.SCISSOR_TEST);

    if (state.inset) {
        const size = Math.round(w * 0.26);
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(w - size - 9, h - size - 9, size + 6, size + 6);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.disable(gl.SCISSOR_TEST);
        drawDepthMap(configs[configs.length - 1].storage, matrices.lightPos, [w - size - 6, h - size - 6, size, size]);
    }
    gl.viewport(0, 0, w, h);
    for (let unit = 0; unit < 3; unit++) gl.bindSampler(unit, null);
}

function render(now) {
    requestAnimationFrame(render);
    const dt = lastTime === null ? 0 : Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    if (state.rotate) theta[state.axis] += 0.5;                                   // shadowMap.js: half a degree per frame
    if (state.orbitLight && !state.sampleLight) {
        state.lightAzimuth = (state.lightAzimuth + 20 * dt) % 360;
        $("LightAzimuth").value = state.lightAzimuth;
        $("LightAzimuthOut").textContent = state.lightAzimuth.toFixed(0);
    }
    drawFrame();
}

// ------------------------------------------------------------------------ UI

const rangeControls = {
    Bias:            { key: "bias",            digits: 4 },
    Ambient:         { key: "ambient",         digits: 2 },
    SplitX:          { key: "splitX",          digits: 2 },
    CameraAzimuth:   { key: "cameraAzimuth",   digits: 0 },
    CameraElevation: { key: "cameraElevation", digits: 0 },
    CameraDistance:  { key: "cameraDistance",  digits: 1 },
    LightAzimuth:    { key: "lightAzimuth",    digits: 0 },
    LightElevation:  { key: "lightElevation",  digits: 0 },
    LightDistance:   { key: "lightDistance",   digits: 1 },
};
const selectControls = {
    Storage:   { key: "storage" },
    Pcf:       { key: "pcf", numeric: true },
    MapSize:   { key: "mapSize", numeric: true },
    Projector: { key: "projector" },
    View:      { key: "view" },
    Compare:   { key: "compare" },
};
const checkControls = {
    Shadows:       { key: "shadows" },
    SlopeBias:     { key: "slopeBias" },
    SampleShading: { key: "sampleShading" },
    Floor:         { key: "floor" },
    Triangle:      { key: "triangle" },
    Inset:         { key: "inset" },
    SampleCamera:  { key: "sampleCamera" },
    SampleLight:   { key: "sampleLight" },
    OrbitLight:    { key: "orbitLight" },
    Rotate:        { key: "rotate" },
};

function setOutput(id, value, digits) { $(`${id}Out`).textContent = Number(value).toFixed(digits); }

function syncControls() {
    for (const [id, c] of Object.entries(rangeControls)) { $(id).value = state[c.key]; setOutput(id, state[c.key], c.digits); }
    for (const [id, c] of Object.entries(selectControls)) $(id).value = String(state[c.key]);
    for (const [id, c] of Object.entries(checkControls)) $(id).checked = Boolean(state[c.key]);
    $("Example").value = exampleId;
    for (const id of ["CameraAzimuth", "CameraElevation", "CameraDistance"]) $(id).disabled = state.sampleCamera;
    for (const id of ["LightAzimuth", "LightElevation", "LightDistance", "OrbitLight"]) $(id).disabled = state.sampleLight;
    $("SplitX").disabled = state.compare === "off";
    const notes = [];
    if (state.compare !== "off") notes.push(COMPARES[state.compare].note);
    if (state.view === "lightDepth") notes.push("The shadow map, as stored, seen from the light; depths are stretched so that 2 units either side of the origin span black to white. Pure white is 'nothing here'.");
    if (state.view === "difference") notes.push("Red: the fragment is farther from the light than the stored depth (in shadow, or acne). Green: nearer. Grey: equal. Scaled by 200.");
    $("Status").textContent = notes.join(" ");
    $("Status").hidden = notes.length === 0;
}

function chooseExample(id) {
    exampleId = id;
    state = { ...baseState, ...currentExample().preset };
    theta = [0, 45, 0];
    $("ExampleLook").textContent = currentExample().look;
}

function attachControls() {
    for (const [id, c] of Object.entries(rangeControls)) $(id).oninput = (e) => { state[c.key] = Number(e.target.value); setOutput(id, e.target.value, c.digits); };
    for (const [id, c] of Object.entries(selectControls)) $(id).onchange = (e) => { state[c.key] = c.numeric ? Number(e.target.value) : e.target.value; syncControls(); };
    for (const [id, c] of Object.entries(checkControls)) $(id).onchange = (e) => { state[c.key] = e.target.checked; syncControls(); };
    $("Example").onchange = (e) => { chooseExample(e.target.value); syncControls(); };
    $("ButtonX").onclick = () => { state.axis = 0; };
    $("ButtonY").onclick = () => { state.axis = 1; };
    $("ButtonZ").onclick = () => { state.axis = 2; };

    let down = null;
    canvas.onpointerdown = (e) => { down = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); };
    canvas.onpointermove = (e) => {
        if (!down || state.sampleCamera) return;
        state.cameraAzimuth = (((state.cameraAzimuth - (e.clientX - down.x) * 0.4) % 360) + 360) % 360;
        state.cameraElevation = Math.max(-5, Math.min(85, state.cameraElevation + (e.clientY - down.y) * 0.4));
        down = { x: e.clientX, y: e.clientY };
        syncControls();
    };
    canvas.onpointerup = () => { down = null; };
}

function buildMenus() {
    for (const group of GROUPS) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = group;
        for (const example of EXAMPLES.filter((e) => e.group === group)) optgroup.append(new Option(example.label, example.id));
        $("Example").append(optgroup);
    }
    for (const [id, compare] of Object.entries(COMPARES)) $("Compare").append(new Option(compare.label, id));
}

// ----------------------------------------------------------------------- main

function makeProgram(vertexSource, fragmentSource, uniformNames) {
    const program = initShaders(gl, vertexSource, fragmentSource);
    return { program, uniforms: Object.fromEntries(uniformNames.map((n) => [n, gl.getUniformLocation(program, n)])) };
}

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

        programs.depth = makeProgram(sources.depthVert, sources.depthFrag, ["uLightProjectionMatrix", "uLightViewMatrix", "uModelMatrix", "uStorage"]);
        programs.scene = makeProgram(sources.sceneVert, sources.sceneFrag, ["uModelMatrix", "uViewMatrix", "uProjectionMatrix",
            "uLightViewMatrix", "uLightProjectionMatrix", "uProjectorViewMatrix", "uProjectorProjectionMatrix", "uShadowColor", "uShadowDepth",
            "uSlide", "uStorage", "uShadows", "uBias", "uSlopeBias", "uPcf", "uMapSize", "uLightPosition", "uAmbient", "uProjector",
            "uSampleShading", "uView"]);
        programs.showDepth = makeProgram(sources.fullscreenVert, sources.showDepthFrag, ["uShadowColor", "uShadowDepthRaw", "uStorage", "uLow", "uHigh"]);

        const scene = buildScene();
        meshes.cube = makeMesh(scene.cube);
        meshes.triangle = makeMesh(scene.triangle);
        meshes.floor = makeMesh(scene.floor);

        samplers.nearest = makeSampler(gl.NEAREST, false);
        samplers.linear = makeSampler(gl.LINEAR, false);
        samplers.compare = makeSampler(gl.LINEAR, true);          // hardware comparison; LINEAR blends 2 x 2 results
        slideTexture = texture2D(gl.RGBA8, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, makeSlide(256));
        dummyColour = texture2D(gl.RGBA8, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
        dummyDepth = texture2D(gl.DEPTH_COMPONENT24, 1, 1, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, new Uint32Array([0xffffffff]));

        buildMenus();
        chooseExample(exampleId);
        attachControls();
        syncControls();
        requestAnimationFrame(render);
    } catch (error) {
        console.error(error);
        $("fatal").hidden = false;
        $("fatal").textContent = `Could not start: ${error.message}`;
    }
}

init();
