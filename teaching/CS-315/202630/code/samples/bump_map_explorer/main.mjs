import { vec2, vec3, vec4, mult, lookAt, ortho, perspective, normalMatrix, flatten } from '../../common/MV.mjs';
import { initShaders } from '../../common/initShadersJS.mjs';

import { SOURCES, defaultParams, generateHeights, normalsFromHeights } from './heightFields.mjs';

// Shader files are fetched (not imported with ?raw) so that this page also works
// when it is served as-is, without a bundler.
const shaderURLs = {
    vertex: new URL('./shaders/bumpMap.vert', import.meta.url),
    fragment: new URL('./shaders/bumpMap.frag', import.meta.url),
};

let canvas;
let gl;
let program;
let texture = null;
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

// the texture itself
let source = "honolulu";
let textureSize = 256;
let bump = SOURCES[source].bump;
let normalMethod = "forward";
let edgeMode = "wrap";
const sourceParams = {};

// texture parameters
const textureDefaults = {
    minFilter: "LINEAR_MIPMAP_LINEAR",
    magFilter: "LINEAR",
    wrapS: "REPEAT",
    wrapT: "REPEAT",
    generateMipmaps: true,
    maxLevel: 12,
    lodBias: 0.0,
    anisotropy: 1,
    repeat: 1,
};
let { minFilter, magFilter, wrapS, wrapT, generateMipmaps, maxLevel, lodBias, anisotropy, repeat } = textureDefaults;

// viewing
let viewMode = 0;
let projection = "perspective";
let radius = 2.2;
let cameraAzimuth = 0.0;
let cameraElevation = 50.0;
let orbitCamera = false;

// lighting
let lightType = "point";
let lightAzimuth = 40.0;
let lightElevation = 35.0;
let lightDistance = 1.5;
let orbitLight = true;
let ambient = 0.2;
let specularStrength = 0.25;
let shininess = 40.0;
let surfaceColor = [0.7, 0.7, 0.7];

// what needs doing before the next frame
let heightsDirty = true;       // regenerate the height field (and everything after it)
let normalsDirty = true;       // recompute the normal map and upload the texture
let parametersDirty = true;    // re-apply the texture parameters
let needsRedraw = true;

let heights = null;
let pixels = null;
let lastTime = null;

const $ = (id) => document.getElementById(id);
const log2 = (n) => Math.round(Math.log2(n));

// ------------------------------------------------------------------- texture

function uploadTexture() {
    if (texture) gl.deleteTexture(texture);
    texture = gl.createTexture();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // RGB = the tangent-space normal, A = the height
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, textureSize, textureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    if (generateMipmaps) gl.generateMipmap(gl.TEXTURE_2D);

    gl.uniform1i(loc.uTexMap, 0);
    gl.uniform1f(loc.uTexSize, textureSize);

    parametersDirty = true;
}

function applyTextureParameters() {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[minFilter]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[magFilter]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[wrapS]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[wrapT]);

    // how many mip levels may be used (only meaningful if they were generated)
    if (generateMipmaps) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, Math.min(maxLevel, log2(textureSize)));
    }
    if (anisotropyExt) {
        gl.texParameterf(gl.TEXTURE_2D, anisotropyExt.TEXTURE_MAX_ANISOTROPY_EXT, anisotropy);
    }

    gl.uniform1f(loc.uLodBias, lodBias);
    gl.uniform1f(loc.uTexScale, repeat);

    updateStatus();
    parametersDirty = false;
    needsRedraw = true;
}

function rebuildTexture() {
    if (heightsDirty) {
        if (!sourceParams[source]) sourceParams[source] = defaultParams(source);
        heights = generateHeights(source, textureSize, sourceParams[source]);
        normalsDirty = true;
        heightsDirty = false;
    }
    if (normalsDirty) {
        pixels = normalsFromHeights(heights, textureSize, { bump, method: normalMethod, edges: edgeMode });
        uploadTexture();
        drawPreviews();
        normalsDirty = false;
        needsRedraw = true;
    }
}

const previewContexts = {};

function drawPreviews() {
    const n = textureSize;
    for (const [id, show] of [["HeightPreview", "height"], ["NormalPreview", "normal"]]) {
        const preview = $(id);
        preview.width = n;
        preview.height = n;
        previewContexts[id] ??= preview.getContext("2d");
        const context = previewContexts[id];
        const image = context.createImageData(n, n);

        for (let i = 0; i < n; i++) {
            const row = n - 1 - i;          // row 0 of the texture is the bottom (t = 0)
            for (let j = 0; j < n; j++) {
                const k = 4 * (i * n + j);
                const o = 4 * (row * n + j);
                if (show === "height") {
                    image.data[o] = image.data[o + 1] = image.data[o + 2] = pixels[k + 3];
                } else {
                    image.data[o] = pixels[k];
                    image.data[o + 1] = pixels[k + 1];
                    image.data[o + 2] = pixels[k + 2];
                }
                image.data[o + 3] = 255;
            }
        }
        context.putImageData(image, 0, 0);
    }
}

function updateStatus() {
    const messages = [];

    if (/MIPMAP/.test(minFilter) && !generateMipmaps) {
        messages.push("Incomplete texture: the minification filter needs mipmaps, but none were generated. " +
            "WebGL then samples (0, 0, 0, 1), so the surface is lit as if its normal pointed one way.");
    }
    if (!/MIPMAP/.test(minFilter) && generateMipmaps) {
        messages.push("Mipmaps exist but the minification filter does not use them.");
    }
    if (!anisotropyExt) {
        messages.push("Anisotropic filtering (EXT_texture_filter_anisotropic) is not available in this browser.");
    }
    if (repeat > 1 && (wrapS === "CLAMP_TO_EDGE" || wrapT === "CLAMP_TO_EDGE")) {
        messages.push("With repeat above 1, clamping smears the edge texels across the surface.");
    }

    $("TextureStatus").textContent = messages.join(" ");
    $("TextureStatus").hidden = messages.length === 0;
}

// -------------------------------------------------------------------- drawing

const toRadians = (degrees) => degrees * Math.PI / 180.0;

function cameraEye() {
    const az = toRadians(cameraAzimuth);
    const el = toRadians(cameraElevation);
    return vec3(at[0] + radius * Math.cos(el) * Math.sin(az),
        at[1] + radius * Math.sin(el),
        at[2] + radius * Math.cos(el) * Math.cos(az));
}

function lightPosition() {
    const az = toRadians(lightAzimuth);
    const el = toRadians(lightElevation);
    const direction = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
    if (lightType === "directional") return vec4(direction[0], direction[1], direction[2], 0.0);
    return vec4(at[0] + lightDistance * direction[0], at[1] + lightDistance * direction[1],
        at[2] + lightDistance * direction[2], 1.0);
}

function render(now) {
    requestAnimationFrame(render);

    const dt = (lastTime === null) ? 0.0 : Math.max(0.0, Math.min(0.1, (now - lastTime) / 1000.0));
    lastTime = now;

    if (orbitCamera || orbitLight) {
        if (orbitCamera) cameraAzimuth = (((cameraAzimuth + dt * 15.0) % 360.0) + 360.0) % 360.0;
        if (orbitLight) lightAzimuth = (((lightAzimuth + dt * 40.0) % 360.0) + 360.0) % 360.0;
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
    const half = radius * Math.tan(toRadians(fovy) / 2.0);
    const projectionMatrix = (projection === "perspective")
        ? perspective(fovy, 1.0, 0.1, 50.0)
        : ortho(-half, half, -half, half, -50.0, 50.0);

    const nMatrix = normalMatrix(modelViewMatrix, true);

    const ambientProduct = vec4(ambient * surfaceColor[0], ambient * surfaceColor[1], ambient * surfaceColor[2], 1.0);
    const diffuseProduct = vec4(surfaceColor[0], surfaceColor[1], surfaceColor[2], 1.0);
    const specularProduct = vec4(specularStrength, specularStrength, specularStrength, 1.0);

    gl.uniformMatrix4fv(loc.uModelViewMatrix, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(loc.uProjectionMatrix, false, flatten(projectionMatrix));
    gl.uniformMatrix3fv(loc.uNormalMatrix, false, flatten(nMatrix));
    gl.uniform4fv(loc.uLightPosition, lightPosition());
    gl.uniform4fv(loc.uAmbientProduct, ambientProduct);
    gl.uniform4fv(loc.uDiffuseProduct, diffuseProduct);
    gl.uniform4fv(loc.uSpecularProduct, specularProduct);
    gl.uniform1f(loc.uShininess, shininess);
    gl.uniform1i(loc.uView, viewMode);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// ------------------------------------------------------------------------ UI
//
// Each entry ties a control's id to a variable. "dirty" says what has to be
// redone when it changes.

const rangeControls = {
    Bump:             { get: () => bump,             set: (v) => { bump = v; },             digits: 3, dirty: "normals" },
    Repeat:           { get: () => repeat,           set: (v) => { repeat = v; },           digits: 0, dirty: "parameters" },
    MaxLevel:         { get: () => maxLevel,         set: (v) => { maxLevel = v; },         digits: 0, dirty: "parameters" },
    LodBias:          { get: () => lodBias,          set: (v) => { lodBias = v; },          digits: 1, dirty: "parameters" },
    Anisotropy:       { get: () => anisotropy,       set: (v) => { anisotropy = v; },       digits: 0, dirty: "parameters" },
    Radius:           { get: () => radius,           set: (v) => { radius = v; },           digits: 2, dirty: "redraw" },
    CameraAzimuth:    { get: () => cameraAzimuth,    set: (v) => { cameraAzimuth = v; },    digits: 0, dirty: "redraw" },
    CameraElevation:  { get: () => cameraElevation,  set: (v) => { cameraElevation = v; },  digits: 0, dirty: "redraw" },
    LightAzimuth:     { get: () => lightAzimuth,     set: (v) => { lightAzimuth = v; },     digits: 0, dirty: "redraw" },
    LightElevation:   { get: () => lightElevation,   set: (v) => { lightElevation = v; },   digits: 0, dirty: "redraw" },
    LightDistance:    { get: () => lightDistance,    set: (v) => { lightDistance = v; },    digits: 2, dirty: "redraw" },
    Ambient:          { get: () => ambient,          set: (v) => { ambient = v; },          digits: 2, dirty: "redraw" },
    SpecularStrength: { get: () => specularStrength, set: (v) => { specularStrength = v; }, digits: 2, dirty: "redraw" },
    Shininess:        { get: () => shininess,        set: (v) => { shininess = v; },        digits: 0, dirty: "redraw" },
};

const selectControls = {
    Source:       { get: () => source,          set: (v) => { chooseSource(v); },                       dirty: "none" },
    TextureSize:  { get: () => textureSize,     set: (v) => { textureSize = Number(v); updateMaxLevel(); }, dirty: "heights" },
    NormalMethod: { get: () => normalMethod,    set: (v) => { normalMethod = v; },                      dirty: "normals" },
    EdgeMode:     { get: () => edgeMode,        set: (v) => { edgeMode = v; },                          dirty: "normals" },
    MinFilter:    { get: () => minFilter,       set: (v) => { minFilter = v; },                         dirty: "parameters" },
    MagFilter:    { get: () => magFilter,       set: (v) => { magFilter = v; },                         dirty: "parameters" },
    WrapS:        { get: () => wrapS,           set: (v) => { wrapS = v; },                             dirty: "parameters" },
    WrapT:        { get: () => wrapT,           set: (v) => { wrapT = v; },                             dirty: "parameters" },
    ViewMode:     { get: () => String(viewMode), set: (v) => { viewMode = Number(v); updateLegend(); }, dirty: "redraw" },
    Projection:   { get: () => projection,      set: (v) => { projection = v; },                        dirty: "redraw" },
    LightType:    { get: () => lightType,       set: (v) => { lightType = v; },                         dirty: "redraw" },
};

const checkControls = {
    Mipmaps:     { get: () => generateMipmaps, set: (v) => { generateMipmaps = v; }, dirty: "normals" },
    OrbitCamera: { get: () => orbitCamera,     set: (v) => { orbitCamera = v; },     dirty: "redraw" },
    OrbitLight:  { get: () => orbitLight,      set: (v) => { orbitLight = v; },      dirty: "redraw" },
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
        $(id).value = control.get();
        setOutput(id, control.get(), control.digits);
    }
    for (const [id, control] of Object.entries(selectControls)) $(id).value = control.get();
    for (const [id, control] of Object.entries(checkControls)) $(id).checked = control.get();
    $("SurfaceColor").value = rgbToHex(surfaceColor);

    // minification filters that use mipmaps are meaningless without them: say so, but let the user pick
    $("MaxLevel").disabled = !generateMipmaps;
    $("Anisotropy").disabled = !anisotropyExt;
}

function updateMaxLevel() {
    const levels = log2(textureSize);
    $("MaxLevel").max = levels;
    maxLevel = Math.min(maxLevel, levels);
    updateLegend();
}

function updateLegend() {
    const legend = $("LodLegend");
    legend.replaceChildren();
    legend.hidden = (viewMode !== 4);
    if (viewMode !== 4) return;

    for (let level = 0; level <= log2(textureSize); level++) {
        const swatch = document.createElement("span");
        swatch.className = "swatch";
        swatch.style.background = rgbToHex(levelTint[Math.min(level, levelTint.length - 1)]);
        swatch.textContent = String(level);
        legend.append(swatch);
    }
}

function chooseSource(id) {
    source = id;
    if (!sourceParams[source]) sourceParams[source] = defaultParams(source);
    bump = SOURCES[source].bump;
    buildSourceParams();
}

function buildSourceParams() {
    const container = $("SourceParams");
    container.replaceChildren();

    for (const spec of SOURCES[source].params) {
        const label = document.createElement("label");
        label.className = "ctl";
        const name = document.createElement("span");
        name.className = "lab";
        name.textContent = spec.label;
        label.append(name);

        const store = sourceParams[source];
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
        } else {
            const input = document.createElement("input");
            input.type = "range";
            input.id = `Param_${spec.id}`;
            input.min = spec.min;
            input.max = spec.max;
            input.step = spec.step;
            input.value = store[spec.id];
            const output = document.createElement("output");
            const digits = spec.step < 1 ? 2 : 0;
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
    container.hidden = SOURCES[source].params.length === 0;
}

function attachControls() {
    for (const [id, control] of Object.entries(rangeControls)) {
        $(id).oninput = (e) => {
            control.set(Number(e.target.value));
            setOutput(id, e.target.value, control.digits);
            markDirty(control.dirty);
        };
    }

    for (const [id, control] of Object.entries(selectControls)) {
        $(id).onchange = (e) => {
            control.set(e.target.value);
            // choosing a source, or a new size, regenerates the field
            markDirty(id === "Source" ? "heights" : control.dirty);
            syncControls();
        };
    }

    for (const [id, control] of Object.entries(checkControls)) {
        $(id).onchange = (e) => {
            control.set(e.target.checked);
            markDirty(control.dirty);
            syncControls();          // e.g. the mip-level slider is disabled without mipmaps
        };
    }

    $("SurfaceColor").oninput = (e) => { surfaceColor = hexToRgb(e.target.value); needsRedraw = true; };

    $("ButtonResetTexture").onclick = () => {
        ({ minFilter, magFilter, wrapS, wrapT, generateMipmaps, maxLevel, lodBias, anisotropy, repeat } = textureDefaults);
        updateMaxLevel();
        syncControls();
        markDirty("normals");      // mipmaps may have been switched back on, which needs a new upload
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
            lightAzimuth = (((lightAzimuth - dx) % 360.0) + 360.0) % 360.0;
            lightElevation = Math.max(2.0, Math.min(89.0, lightElevation + dy));
        } else {
            cameraAzimuth = (((cameraAzimuth - dx) % 360.0) + 360.0) % 360.0;
            cameraElevation = Math.max(5.0, Math.min(89.0, cameraElevation + dy));
        }
        syncControls();
        needsRedraw = true;
    };
    canvas.onpointerup = () => { dragging = false; };
    canvas.onpointercancel = () => { dragging = false; };
    canvas.onwheel = (e) => {
        e.preventDefault();
        radius = Math.max(1.0, Math.min(8.0, radius * (1.0 + e.deltaY * 0.001)));
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
            "uLightPosition", "uTexScale", "uTexMap", "uTexSize", "uLodBias", "uAmbientProduct",
            "uDiffuseProduct", "uSpecularProduct", "uShininess", "uView"]) {
            loc[name] = gl.getUniformLocation(program, name);
        }

        gl.uniform4fv(loc.uNormal, normal);
        gl.uniform3fv(loc.uObjTangent, tangent);

        anisotropyExt = gl.getExtension("EXT_texture_filter_anisotropic");
        if (anisotropyExt) {
            maxAnisotropy = gl.getParameter(anisotropyExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            $("Anisotropy").max = maxAnisotropy;
        }

        // fill the source menu
        for (const [id, spec] of Object.entries(SOURCES)) {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = spec.label;
            $("Source").append(option);
        }

        chooseSource(source);
        updateMaxLevel();
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
