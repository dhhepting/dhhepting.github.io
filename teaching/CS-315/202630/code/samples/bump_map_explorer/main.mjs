import { vec2, vec3, vec4, lookAt, ortho, perspective, normalMatrix, flatten } from '../../common/MV.mjs';
import { initShaders } from '../../common/initShadersJS.mjs';

import { SOURCES, defaultParams, generateHeights, generateAlbedo, normalsFromHeights } from './heightFields.mjs';
import { EXAMPLES, GROUPS, exampleById } from './examples.mjs';

// Shader files are fetched (not imported with ?raw) so that this page also works
// when it is served as-is, without a bundler.
const shaderURLs = {
    vertex: new URL('./shaders/bumpMap.vert', import.meta.url),
    fragment: new URL('./shaders/bumpMap.frag', import.meta.url),
};

let canvas;
let gl;
let program;
let anisotropyExt = null;
let maxAnisotropy = 1;

const loc = {};

// ------------------------------------------------------------------- geometry
//
// One quad in the xz plane. The normal is +y and the tangent +x; the texture
// coordinate s is x and t is 1 - z, so that (T, B = N x T, N) is right-handed
// and "up the screen" is +t when the camera looks along -z.

const positionsArray = [
    vec4(0.0, 0.0, 0.0, 1.0),
    vec4(1.0, 0.0, 0.0, 1.0),
    vec4(0.0, 0.0, 1.0, 1.0),
    vec4(1.0, 0.0, 1.0, 1.0),
];

const texCoordsArray = [
    vec2(0.0, 1.0),
    vec2(1.0, 1.0),
    vec2(0.0, 0.0),
    vec2(1.0, 0.0),
];

const normal = vec4(0.0, 1.0, 0.0, 0.0);
const tangent = vec3(1.0, 0.0, 0.0);

const at = vec3(0.5, 0.0, 0.5);
const up = vec3(0.0, 1.0, 0.0);
const fovy = 40.0;

// The colours the fragment shader uses to tint mip levels (levelTint in bumpMap.frag).
const levelTint = [
    [1.0, 1.0, 1.0], [0.45, 0.65, 1.0], [0.45, 1.0, 0.55], [1.0, 1.0, 0.35], [1.0, 0.65, 0.25],
    [1.0, 0.35, 0.35], [0.85, 0.4, 1.0], [0.35, 0.9, 0.9], [0.6, 0.6, 0.6], [0.3, 0.3, 0.3],
];

// --------------------------------------------------------------------- state
//
// Choosing an example resets the state to these values and then applies the
// example's preset (examples.mjs).

const baseState = {
    // the texture
    textureSize: 256, bump: 0.05, normalMethod: "central", edgeMode: "wrap",
    // texture parameters
    minFilter: "LINEAR_MIPMAP_LINEAR", magFilter: "LINEAR", wrapS: "REPEAT", wrapT: "REPEAT",
    generateMipmaps: true, maxLevel: 12, lodBias: 0.0, anisotropy: 1, repeat: 1,
    // view
    viewMode: 0, projection: "perspective", radius: 2.2, cameraAzimuth: 0.0, cameraElevation: 50.0, orbitCamera: false,
    // light and material
    lightType: "point", lightAzimuth: 40.0, lightElevation: 35.0, lightDistance: 1.5, orbitLight: false,
    ambient: 0.2, specularStrength: 0.25, shininess: 40.0, surfaceColor: [0.7, 0.7, 0.7],
    // shading techniques
    material: "lit", useColorMap: true, relief: 0, reliefSteps: 32, normalSource: 0, toksvig: false, convention: 0,
    splitMode: 0, splitX: 0.5,
    // water
    waterScale1: 2.0, waterScale2: 5.5, waterLayer2: 0.6, waterSpeed: 1.0, waterAnimate: true,
    waterFresnel: 5.0, waterDepth: 0.6, waterDistortion: 0.03,
};

let state = { ...baseState, surfaceColor: [...baseState.surfaceColor] };
let exampleId = "honolulu";
const sourceParams = {};

const materialIndex = { lit: 0, metal: 1, water: 2 };

// what needs doing before the next frame
let heightsDirty = true;       // regenerate the height field, colour map and everything after them
let normalsDirty = true;       // recompute the normal map and upload the textures
let parametersDirty = true;    // re-apply the texture parameters
let needsRedraw = true;

let heights = null;
let normalPixels = null;
let colorPixels = null;
let normalTexture = null;
let colorTexture = null;
let lastTime = null;
let time = 0.0;

const $ = (id) => document.getElementById(id);
const log2 = (n) => Math.round(Math.log2(n));
const currentExample = () => exampleById(exampleId);

// ------------------------------------------------------------------- texture

// The text example rasterizes with a 2D canvas: white letters on black, fitted to the width.
function rasterizeText(text, n) {
    const surface = document.createElement("canvas");
    surface.width = n;
    surface.height = n;
    const context = surface.getContext("2d");

    context.fillStyle = "#000";
    context.fillRect(0, 0, n, n);
    context.fillStyle = "#fff";
    context.textAlign = "center";
    context.textBaseline = "middle";

    let size = n * 0.5;
    context.font = `bold ${size}px sans-serif`;
    const width = Math.max(context.measureText(text || " ").width, 1);
    size = Math.min(size * (0.86 * n) / width, n * 0.7);
    context.font = `bold ${size}px sans-serif`;
    context.fillText(text, n / 2, n / 2 + size * 0.04);

    const data = context.getImageData(0, 0, n, n).data;
    const values = new Float32Array(n * n);
    for (let row = 0; row < n; row++) {
        for (let column = 0; column < n; column++) {
            values[(n - 1 - row) * n + column] = data[4 * (row * n + column)] / 255;   // canvas row 0 is the top; texture row 0 is v = 0
        }
    }
    return values;
}

function makeTexture(unit, size, pixels) {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    if (state.generateMipmaps) gl.generateMipmap(gl.TEXTURE_2D);
    return texture;
}

function uploadTextures() {
    if (normalTexture) gl.deleteTexture(normalTexture);
    if (colorTexture) gl.deleteTexture(colorTexture);

    // unit 0: RGB = the tangent-space normal, A = the height
    normalTexture = makeTexture(0, state.textureSize, normalPixels);

    // unit 1: the colour map; a 1 x 1 white texture stands in when the example has none
    if (colorPixels) {
        colorTexture = makeTexture(1, state.textureSize, colorPixels);
    } else {
        colorTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, colorTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    }

    gl.uniform1i(loc.uTexMap, 0);
    gl.uniform1i(loc.uColorMap, 1);
    parametersDirty = true;
}

function applyTextureParameters() {
    for (const [unit, texture, isReal] of [[0, normalTexture, true], [1, colorTexture, Boolean(colorPixels)]]) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // the 1 x 1 stand-in has no mip chain, so it always samples level 0
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, isReal ? gl[state.minFilter] : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, isReal ? gl[state.magFilter] : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[state.wrapS]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[state.wrapT]);

        if (isReal && state.generateMipmaps) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, Math.min(state.maxLevel, log2(state.textureSize)));
        }
        if (isReal && anisotropyExt) {
            gl.texParameterf(gl.TEXTURE_2D, anisotropyExt.TEXTURE_MAX_ANISOTROPY_EXT, state.anisotropy);
        }
    }

    updateStatus();
    parametersDirty = false;
    needsRedraw = true;
}

function rebuildTexture() {
    const example = currentExample();
    if (heightsDirty) {
        const params = sourceParams[exampleId];
        heights = generateHeights(example.source, state.textureSize, params, { rasterizeText });
        colorPixels = generateAlbedo(example.source, state.textureSize, heights, params);
        normalsDirty = true;
        heightsDirty = false;
    }
    if (normalsDirty) {
        normalPixels = normalsFromHeights(heights, state.textureSize, {
            bump: state.bump, method: state.normalMethod, edges: state.edgeMode,
        });
        uploadTextures();
        drawPreviews();
        normalsDirty = false;
        needsRedraw = true;
    }
}

const previewContexts = {};

function drawPreview(id, size, pixelAt) {
    const preview = $(id);
    preview.width = size;
    preview.height = size;
    previewContexts[id] ??= preview.getContext("2d");
    const context = previewContexts[id];
    const image = context.createImageData(size, size);

    for (let i = 0; i < size; i++) {
        const row = size - 1 - i;           // row 0 of the texture is the bottom (t = 0)
        for (let j = 0; j < size; j++) {
            const [r, g, b] = pixelAt(4 * (i * size + j));
            const o = 4 * (row * size + j);
            image.data[o] = r;
            image.data[o + 1] = g;
            image.data[o + 2] = b;
            image.data[o + 3] = 255;
        }
    }
    context.putImageData(image, 0, 0);
}

function drawPreviews() {
    const n = state.textureSize;
    drawPreview("HeightPreview", n, (k) => [normalPixels[k + 3], normalPixels[k + 3], normalPixels[k + 3]]);
    drawPreview("NormalPreview", n, (k) => [normalPixels[k], normalPixels[k + 1], normalPixels[k + 2]]);
    $("ColorPreviewFigure").hidden = !colorPixels;
    if (colorPixels) drawPreview("ColorPreview", n, (k) => [colorPixels[k], colorPixels[k + 1], colorPixels[k + 2]]);
}

const splitDescriptions = {
    1: "Left of the divider: bump mapping only. Right: the selected parallax mode.",
    2: "Left of the divider: the stored normal map. Right: normals from derivatives of the height.",
    3: "Left of the divider: no Toksvig correction. Right: with it.",
};

function updateStatus() {
    const messages = [];

    if (/MIPMAP/.test(state.minFilter) && !state.generateMipmaps) {
        messages.push("Incomplete texture: the minification filter needs mipmaps, but none were generated. " +
            "WebGL then samples (0, 0, 0, 1), so the surface is lit as if its normal pointed one way.");
    }
    if (!/MIPMAP/.test(state.minFilter) && state.generateMipmaps) {
        messages.push("Mipmaps exist but the minification filter does not use them.");
    }
    if (!anisotropyExt) {
        messages.push("Anisotropic filtering (EXT_texture_filter_anisotropic) is not available in this browser.");
    }
    if (state.repeat > 1 && (state.wrapS === "CLAMP_TO_EDGE" || state.wrapT === "CLAMP_TO_EDGE")) {
        messages.push("With repeat above 1, clamping smears the edge texels across the surface.");
    }
    if (state.splitMode > 0) messages.push(splitDescriptions[state.splitMode]);
    if (state.material === "water" && (state.relief > 0 || state.normalSource === 1)) {
        messages.push("Parallax and derivative normals are not applied to water, which blends two copies of the normal map.");
    }
    if (state.normalSource === 1 && state.convention !== 0) {
        messages.push("The derivative method builds the normal from the geometry, so the normal-map convention has no effect on it.");
    }

    $("TextureStatus").textContent = messages.join(" ");
    $("TextureStatus").hidden = messages.length === 0;
}

// -------------------------------------------------------------------- drawing

const toRadians = (degrees) => degrees * Math.PI / 180.0;

function cameraEye() {
    const az = toRadians(state.cameraAzimuth);
    const el = toRadians(state.cameraElevation);
    return vec3(at[0] + state.radius * Math.cos(el) * Math.sin(az),
        at[1] + state.radius * Math.sin(el),
        at[2] + state.radius * Math.cos(el) * Math.cos(az));
}

function lightPosition() {
    const az = toRadians(state.lightAzimuth);
    const el = toRadians(state.lightElevation);
    const direction = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
    if (state.lightType === "directional") return vec4(direction[0], direction[1], direction[2], 0.0);
    return vec4(at[0] + state.lightDistance * direction[0], at[1] + state.lightDistance * direction[1],
        at[2] + state.lightDistance * direction[2], 1.0);
}

const animating = () => state.orbitCamera || state.orbitLight || (state.material === "water" && state.waterAnimate);

function render(now) {
    requestAnimationFrame(render);

    const dt = (lastTime === null) ? 0.0 : Math.max(0.0, Math.min(0.1, (now - lastTime) / 1000.0));
    lastTime = now;

    if (animating()) {
        if (state.orbitCamera) state.cameraAzimuth = (((state.cameraAzimuth + dt * 15.0) % 360.0) + 360.0) % 360.0;
        if (state.orbitLight) state.lightAzimuth = (((state.lightAzimuth + dt * 40.0) % 360.0) + 360.0) % 360.0;
        if (state.material === "water" && state.waterAnimate) time += dt;
        syncControls();
        needsRedraw = true;
    }

    rebuildTexture();
    if (parametersDirty) applyTextureParameters();

    if (needsRedraw) {
        drawScene();
        needsRedraw = false;
    }
}

function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const modelViewMatrix = lookAt(cameraEye(), at, up);

    // an orthographic view that shows the same extent as the perspective one at the focus distance
    const half = state.radius * Math.tan(toRadians(fovy) / 2.0);
    const projectionMatrix = (state.projection === "perspective")
        ? perspective(fovy, 1.0, 0.1, 50.0)
        : ortho(-half, half, -half, half, -50.0, 50.0);

    const nMatrix = normalMatrix(modelViewMatrix, true);
    const hasColor = Boolean(colorPixels) && state.useColorMap;

    gl.uniformMatrix4fv(loc.uModelViewMatrix, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(loc.uProjectionMatrix, false, flatten(projectionMatrix));
    gl.uniformMatrix3fv(loc.uNormalMatrix, false, flatten(nMatrix));
    gl.uniform4fv(loc.uLightPosition, lightPosition());
    gl.uniform1f(loc.uTexScale, state.repeat);

    gl.uniform1i(loc.uUseColor, hasColor ? 1 : 0);
    gl.uniform3fv(loc.uSurfaceColor, state.surfaceColor);
    gl.uniform1f(loc.uAmbient, state.ambient);
    gl.uniform1f(loc.uSpecularStrength, state.specularStrength);
    gl.uniform1f(loc.uShininess, state.shininess);
    gl.uniform1i(loc.uMaterial, materialIndex[state.material]);
    gl.uniform1i(loc.uView, state.viewMode);
    gl.uniform1f(loc.uTexSize, state.textureSize);
    gl.uniform1f(loc.uLodBias, state.lodBias);
    gl.uniform1f(loc.uBumpHeight, state.bump);

    gl.uniform1i(loc.uRelief, state.relief);
    gl.uniform1i(loc.uReliefSteps, state.reliefSteps);
    gl.uniform1i(loc.uNormalSource, state.normalSource);
    gl.uniform1i(loc.uToksvig, state.toksvig ? 1 : 0);
    gl.uniform1i(loc.uConvention, state.convention);
    gl.uniform1i(loc.uSplitMode, state.splitMode);
    gl.uniform1f(loc.uSplitX, state.splitX * canvas.width);

    gl.uniform1f(loc.uTime, time);
    gl.uniform1f(loc.uWaterScale1, state.waterScale1);
    gl.uniform1f(loc.uWaterScale2, state.waterScale2);
    gl.uniform1f(loc.uWaterLayer2, state.waterLayer2);
    gl.uniform1f(loc.uWaterFresnel, state.waterFresnel);
    gl.uniform1f(loc.uWaterDepth, state.waterDepth);
    gl.uniform1f(loc.uWaterDistortion, state.waterDistortion);
    gl.uniform2fv(loc.uWaterFlow1, [0.03 * state.waterSpeed, 0.02 * state.waterSpeed]);     // layer velocities, in texture repeats per second
    gl.uniform2fv(loc.uWaterFlow2, [-0.02 * state.waterSpeed, 0.04 * state.waterSpeed]);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// ------------------------------------------------------------------------ UI
//
// Each entry ties a control's id to a key of the state. "dirty" says what has to
// be redone when it changes.

const rangeControls = {
    Bump:             { key: "bump",             digits: 3, dirty: "normals" },
    Repeat:           { key: "repeat",           digits: 0, dirty: "redraw" },
    MaxLevel:         { key: "maxLevel",         digits: 0, dirty: "parameters" },
    LodBias:          { key: "lodBias",          digits: 1, dirty: "redraw" },
    Anisotropy:       { key: "anisotropy",       digits: 0, dirty: "parameters" },
    Radius:           { key: "radius",           digits: 2, dirty: "redraw" },
    CameraAzimuth:    { key: "cameraAzimuth",    digits: 0, dirty: "redraw" },
    CameraElevation:  { key: "cameraElevation",  digits: 0, dirty: "redraw" },
    LightAzimuth:     { key: "lightAzimuth",     digits: 0, dirty: "redraw" },
    LightElevation:   { key: "lightElevation",   digits: 0, dirty: "redraw" },
    LightDistance:    { key: "lightDistance",    digits: 2, dirty: "redraw" },
    Ambient:          { key: "ambient",          digits: 2, dirty: "redraw" },
    SpecularStrength: { key: "specularStrength", digits: 2, dirty: "redraw" },
    Shininess:        { key: "shininess",        digits: 0, dirty: "redraw" },
    ReliefSteps:      { key: "reliefSteps",      digits: 0, dirty: "redraw" },
    SplitX:           { key: "splitX",           digits: 2, dirty: "redraw" },
    WaterScale1:      { key: "waterScale1",      digits: 1, dirty: "redraw" },
    WaterScale2:      { key: "waterScale2",      digits: 1, dirty: "redraw" },
    WaterLayer2:      { key: "waterLayer2",      digits: 2, dirty: "redraw" },
    WaterSpeed:       { key: "waterSpeed",       digits: 1, dirty: "redraw" },
    WaterFresnel:     { key: "waterFresnel",     digits: 1, dirty: "redraw" },
    WaterDepth:       { key: "waterDepth",       digits: 2, dirty: "redraw" },
    WaterDistortion:  { key: "waterDistortion",  digits: 3, dirty: "redraw" },
};

// numeric: the select's values are numbers (indexes the shader uses)
const selectControls = {
    TextureSize:  { key: "textureSize",  numeric: true,  dirty: "heights" },
    NormalMethod: { key: "normalMethod",                 dirty: "normals" },
    EdgeMode:     { key: "edgeMode",                     dirty: "normals" },
    MinFilter:    { key: "minFilter",                    dirty: "parameters" },
    MagFilter:    { key: "magFilter",                    dirty: "parameters" },
    WrapS:        { key: "wrapS",                        dirty: "parameters" },
    WrapT:        { key: "wrapT",                        dirty: "parameters" },
    ViewMode:     { key: "viewMode",     numeric: true,  dirty: "redraw" },
    Projection:   { key: "projection",                   dirty: "redraw" },
    LightType:    { key: "lightType",                    dirty: "redraw" },
    Material:     { key: "material",                     dirty: "redraw" },
    Relief:       { key: "relief",       numeric: true,  dirty: "redraw" },
    NormalSource: { key: "normalSource", numeric: true,  dirty: "redraw" },
    Convention:   { key: "convention",   numeric: true,  dirty: "redraw" },
    SplitMode:    { key: "splitMode",    numeric: true,  dirty: "redraw" },
};

const checkControls = {
    Mipmaps:      { key: "generateMipmaps", dirty: "normals" },
    OrbitCamera:  { key: "orbitCamera",     dirty: "redraw" },
    OrbitLight:   { key: "orbitLight",      dirty: "redraw" },
    UseColorMap:  { key: "useColorMap",     dirty: "redraw" },
    Toksvig:      { key: "toksvig",         dirty: "redraw" },
    WaterAnimate: { key: "waterAnimate",    dirty: "redraw" },
};

function markDirty(kind) {
    if (kind === "heights") heightsDirty = true;
    if (kind === "heights" || kind === "normals") normalsDirty = true;
    if (kind === "parameters") parametersDirty = true;
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
    $("SurfaceColor").value = rgbToHex(state.surfaceColor);
    $("Example").value = exampleId;

    const water = state.material === "water";
    $("WaterControls").hidden = !water;
    $("MaxLevel").disabled = !state.generateMipmaps;
    $("Anisotropy").disabled = !anisotropyExt;
    $("ReliefSteps").disabled = state.relief !== 2;
    $("SplitX").disabled = state.splitMode === 0;
    $("UseColorMap").disabled = !colorPixels;
}

function updateMaxLevel() {
    const levels = log2(state.textureSize);
    $("MaxLevel").max = levels;
    state.maxLevel = Math.min(state.maxLevel, levels);
    updateLegend();
}

function updateLegend() {
    const legend = $("LodLegend");
    legend.replaceChildren();
    legend.hidden = (state.viewMode !== 4);
    if (state.viewMode !== 4) return;

    for (let level = 0; level <= log2(state.textureSize); level++) {
        const swatch = document.createElement("span");
        swatch.className = "swatch";
        swatch.style.background = rgbToHex(levelTint[Math.min(level, levelTint.length - 1)]);
        swatch.textContent = String(level);
        legend.append(swatch);
    }
}

function chooseExample(id) {
    exampleId = id;
    const example = currentExample();

    state = { ...baseState, surfaceColor: [...baseState.surfaceColor], ...example.preset };
    if (example.preset.surfaceColor) state.surfaceColor = [...example.preset.surfaceColor];
    sourceParams[id] = { ...defaultParams(example.source), ...(example.params ?? {}) };
    time = 0.0;

    $("ExampleLook").textContent = example.look;
    buildSourceParams();
    updateMaxLevel();
    markDirty("heights");
    parametersDirty = true;
}

function buildSourceParams() {
    const container = $("SourceParams");
    container.replaceChildren();

    const store = sourceParams[exampleId];
    for (const spec of SOURCES[currentExample().source].params) {
        const label = document.createElement("label");
        label.className = "ctl";
        const name = document.createElement("span");
        name.className = "lab";
        name.textContent = spec.label;
        label.append(name);

        if (spec.type === "select") {
            const select = document.createElement("select");
            select.id = `Param_${spec.id}`;
            for (const [value, text] of spec.options) {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = text;
                select.append(option);
            }
            select.value = store[spec.id];
            select.onchange = () => { store[spec.id] = select.value; markDirty("heights"); };
            label.append(select);
        } else if (spec.type === "text") {
            const input = document.createElement("input");
            input.type = "text";
            input.id = `Param_${spec.id}`;
            input.maxLength = spec.maxLength ?? 16;
            input.value = store[spec.id];
            input.style.gridColumn = "1 / -1";
            input.oninput = () => { store[spec.id] = input.value; markDirty("heights"); };
            label.append(input);
        } else {
            const input = document.createElement("input");
            input.type = "range";
            input.id = `Param_${spec.id}`;
            input.min = spec.min;
            input.max = spec.max;
            input.step = spec.step;
            input.value = store[spec.id];
            const output = document.createElement("output");
            const digits = spec.step < 0.01 ? 3 : spec.step < 1 ? 2 : 0;
            output.textContent = Number(store[spec.id]).toFixed(digits);
            input.oninput = () => {
                store[spec.id] = Number(input.value);
                output.textContent = Number(input.value).toFixed(digits);
                markDirty("heights");
            };
            label.append(input, output);
        }
        container.append(label);
    }
    container.hidden = SOURCES[currentExample().source].params.length === 0;
}

function buildExampleMenu() {
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
}

// coupling between controls
function afterChange(id) {
    if (id === "SplitMode" && state.splitMode === 1 && state.relief === 0) state.relief = 2;   // the compare needs a relief mode to show
    if (id === "TextureSize") updateMaxLevel();
    if (id === "ViewMode") updateLegend();
}

function attachControls() {
    for (const [id, control] of Object.entries(rangeControls)) {
        $(id).oninput = (e) => {
            state[control.key] = Number(e.target.value);
            setOutput(id, e.target.value, control.digits);
            markDirty(control.dirty);
            afterChange(id);
            if (control.dirty === "parameters") syncControls();
        };
    }

    for (const [id, control] of Object.entries(selectControls)) {
        $(id).onchange = (e) => {
            state[control.key] = control.numeric ? Number(e.target.value) : e.target.value;
            markDirty(control.dirty);
            afterChange(id);
            syncControls();
            updateStatus();
        };
    }

    for (const [id, control] of Object.entries(checkControls)) {
        $(id).onchange = (e) => {
            state[control.key] = e.target.checked;
            markDirty(control.dirty);
            afterChange(id);
            syncControls();      // e.g. the mip-level slider is disabled without mipmaps
        };
    }

    $("Example").onchange = (e) => {
        chooseExample(e.target.value);
        syncControls();
    };

    $("SurfaceColor").oninput = (e) => { state.surfaceColor = hexToRgb(e.target.value); needsRedraw = true; };

    $("ButtonResetTexture").onclick = () => {
        for (const key of ["minFilter", "magFilter", "wrapS", "wrapT", "generateMipmaps", "maxLevel", "lodBias", "anisotropy", "repeat"]) {
            state[key] = baseState[key];
        }
        updateMaxLevel();
        syncControls();
        markDirty("normals");      // mipmaps may have been switched back on, which needs a new upload
        parametersDirty = true;
    };

    // Drag to orbit the camera, shift-drag to move the light, scroll to zoom.
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

        if (e.shiftKey) {
            state.lightAzimuth = (((state.lightAzimuth - dx) % 360.0) + 360.0) % 360.0;
            state.lightElevation = Math.max(2.0, Math.min(89.0, state.lightElevation + dy));
        } else {
            state.cameraAzimuth = (((state.cameraAzimuth - dx) % 360.0) + 360.0) % 360.0;
            state.cameraElevation = Math.max(5.0, Math.min(89.0, state.cameraElevation + dy));
        }
        syncControls();
        needsRedraw = true;
    };
    canvas.onpointerup = () => { dragging = false; };
    canvas.onpointercancel = () => { dragging = false; };
    canvas.onwheel = (e) => {
        e.preventDefault();
        state.radius = Math.max(1.0, Math.min(8.0, state.radius * (1.0 + e.deltaY * 0.001)));
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
        const shaderSources = await loadShaderSources();

        canvas = $("gl-canvas");

        gl = canvas.getContext('webgl2');
        if (!gl) alert("WebGL 2.0 isn't available");

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);

        gl.enable(gl.DEPTH_TEST);

        //
        //  Load shaders and initialize attribute buffers
        //
        program = initShaders(gl, shaderSources.vertex, shaderSources.fragment);
        gl.useProgram(program);

        const vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, "aPosition");
        gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLoc);

        const tBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

        const texCoordLoc = gl.getAttribLocation(program, "aTexCoord");
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(texCoordLoc);

        for (const name of ["uModelViewMatrix", "uProjectionMatrix", "uNormalMatrix", "uNormal", "uObjTangent",
            "uLightPosition", "uTexScale", "uTexMap", "uColorMap", "uUseColor", "uSurfaceColor", "uAmbient",
            "uSpecularStrength", "uShininess", "uMaterial", "uView", "uTexSize", "uLodBias", "uBumpHeight",
            "uRelief", "uReliefSteps", "uNormalSource", "uToksvig", "uConvention", "uSplitMode", "uSplitX", "uTime",
            "uWaterScale1", "uWaterScale2", "uWaterLayer2", "uWaterFresnel", "uWaterDepth", "uWaterDistortion",
            "uWaterFlow1", "uWaterFlow2"]) {
            loc[name] = gl.getUniformLocation(program, name);
        }

        gl.uniform4fv(loc.uNormal, normal);
        gl.uniform3fv(loc.uObjTangent, tangent);

        anisotropyExt = gl.getExtension("EXT_texture_filter_anisotropic");
        if (anisotropyExt) {
            maxAnisotropy = gl.getParameter(anisotropyExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            $("Anisotropy").max = maxAnisotropy;
        }

        buildExampleMenu();
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
