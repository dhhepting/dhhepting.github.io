import { mult, normalMatrix, flatten, mat4 } from '../../Common/MV.mjs';
import { initShaders } from '../../Common/initShadersJS.mjs';

import {
    buildCube, FACE_NAMES, PICK_COLOUR_NAMES, sampleDecode, PICKCUBE2_NAMES, faceFromPickColour,
    decodeId, bytesToId, SCENES, modelMatrix, cameraMatrices, pickMatrix, eventToPixel, insideCanvas, rayCast,
} from './pickMath.mjs';
import { METHODS, EXAMPLES, GROUPS, exampleById } from './examples.mjs';

// Shader files are fetched (not imported with ?raw) so that this page also works
// when it is served as-is, without a bundler.
const shaderURLs = {
    sceneVert: new URL('./shaders/scene.vert', import.meta.url),
    sceneFrag: new URL('./shaders/scene.frag', import.meta.url),
    idColorFrag: new URL('./shaders/idColor.frag', import.meta.url),
    idUintFrag: new URL('./shaders/idUint.frag', import.meta.url),
    mrtFrag: new URL('./shaders/mrt.frag', import.meta.url),
};

let canvas;
let overlay;
let gl;

const programs = {};
let cubeVAO;
const cube = buildCube();
const lightDirection = [0.5, 0.7, 1.0];      // eye coordinates
const identity = mat4();

// --------------------------------------------------------------------- state

const baseState = {
    scene: "single", method: "idUint", strategy: "separate", depth: true, region: "full", coords: "canvas",
    when: "click", view: "scene", rotate: false, axis: 0, spinSpeed: 15,
    azimuth: 0, elevation: 0, distance: 3.2,
};

let state = { ...baseState };
let exampleId = "pickCube";

let theta = [45, 45, 45];                    // the single cube's angles, as in pickCube
let time = 0;                                // the spinning cubes' angle, degrees
let lastTime = null;
let picked = null;                           // { object, face } highlighted
let lastPick = null;                         // { event, pixel, clickPixel } for the overlay
let hoverEvent = null;
let mrtTarget = null;
const pickTargets = {};                      // framebuffers for the separate pick pass, by size, format and depth

const $ = (id) => document.getElementById(id);
const currentExample = () => exampleById(exampleId);
const objects = () => SCENES[state.scene].objects;

// ------------------------------------------------------------------ matrices

function frameMatrices(width = canvas.width, height = canvas.height) {
    const camera = cameraMatrices({ azimuth: state.azimuth, elevation: state.elevation, distance: state.distance }, width / height);
    const models = objects().map((o) => modelMatrix(o, theta, time));
    return { ...camera, models };
}

// --------------------------------------------------------------- drawing

function drawObjects(p, view, projection, models, extra = () => {}, pick = identity) {
    gl.useProgram(p.program);
    gl.bindVertexArray(cubeVAO);
    gl.uniformMatrix4fv(p.uniforms.uProjectionMatrix, false, flatten(projection));
    gl.uniformMatrix4fv(p.uniforms.uPickMatrix, false, flatten(pick));
    models.forEach((model, k) => {
        const modelView = mult(view, model);
        gl.uniformMatrix4fv(p.uniforms.uModelViewMatrix, false, flatten(modelView));
        gl.uniformMatrix3fv(p.uniforms.uNormalMatrix, false, flatten(normalMatrix(modelView, true)));
        gl.uniform1i(p.uniforms.uObject, k);
        extra(p, k);
        gl.drawArrays(gl.TRIANGLES, 0, cube.vertexCount);
    });
    gl.bindVertexArray(null);
}

const litUniforms = (p, k) => {
    gl.uniform3fv(p.uniforms.uColor, objects()[k].colour);
    gl.uniform3fv(p.uniforms.uLightDirection, lightDirection);
    gl.uniform1i(p.uniforms.uPickedObject, picked ? picked.object : -1);
    gl.uniform1i(p.uniforms.uPickedFace, picked ? picked.face : -1);
};

function ensureMrtTarget() {
    const w = canvas.width, h = canvas.height;
    if (mrtTarget && mrtTarget.w === w && mrtTarget.h === h) return mrtTarget;
    const colour = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, colour);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, w, h);
    const ids = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, ids);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.R32UI, w, h);
    const depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colour);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.RENDERBUFFER, ids);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("The multiple-render-target framebuffer is not complete");
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    mrtTarget = { framebuffer, w, h };
    return mrtTarget;
}

function drawFrame() {
    const { view, projection, models } = frameMatrices();
    gl.enable(gl.CULL_FACE);

    if (state.view === "pickBuffer") {
        // what the pick pass sees, drawn for people; the depth test follows the pick option
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (state.depth) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
        drawObjects(programs.idColor, view, projection, models, (p) => {
            gl.uniform1i(p.uniforms.uMethod, state.method === "faceColours" ? 0 : 1);
            gl.uniform1i(p.uniforms.uVisualize, 1);
        });
        return;
    }

    gl.enable(gl.DEPTH_TEST);
    if (state.strategy === "mrt") {
        // one pass, two attachments: the image and the ids; then copy the image to the canvas
        const { framebuffer } = ensureMrtTarget();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearBufferfv(gl.COLOR, 0, [0.5, 0.5, 0.5, 1.0]);
        gl.clearBufferuiv(gl.COLOR, 1, [0, 0, 0, 0]);
        gl.clearBufferfi(gl.DEPTH_STENCIL, 0, 1.0, 0);
        drawObjects(programs.mrt, view, projection, models, litUniforms);

        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        gl.blitFramebuffer(0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.5, 0.5, 1.0);                // pickCube's grey
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawObjects(programs.scene, view, projection, models, litUniforms);
}

// ----------------------------------------------------------------- picking

function pickTarget(format, width, height, depth) {
    const key = `${format}-${width}x${height}-${depth}`;
    if (pickTargets[key]) return pickTargets[key];
    const colour = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, colour);
    gl.renderbufferStorage(gl.RENDERBUFFER, format === "uint" ? gl.R32UI : gl.RGBA8, width, height);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colour);
    if (depth) {
        const depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    }
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`Pick framebuffer ${key} is not complete`);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    pickTargets[key] = { framebuffer, width, height };
    return pickTargets[key];
}

/** One GPU method: draw the ids off-screen and read the pixel. Returns the raw value read. */
function gpuPick(method, pixel) {
    const { view, projection, models } = frameMatrices();
    const onePixel = state.region === "pixel";
    const target = pickTarget(method === "idUint" ? "uint" : "rgba8", onePixel ? 1 : canvas.width, onePixel ? 1 : canvas.height, state.depth);
    const pick = onePixel ? pickMatrix(pixel.x, pixel.y, canvas.width, canvas.height) : identity;

    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, target.width, target.height);
    gl.enable(gl.CULL_FACE);
    if (state.depth) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);

    if (method === "idUint") {
        gl.clearBufferuiv(gl.COLOR, 0, [0, 0, 0, 0]);
        if (state.depth) gl.clear(gl.DEPTH_BUFFER_BIT);
        drawObjects(programs.idUint, view, projection, models, () => {}, pick);
    } else {
        // face colours: the samples' grey, which matches no face colour; ids: 0, which means background
        // (grey would decode as id 8421504)
        if (method === "faceColours") gl.clearColor(0.5, 0.5, 0.5, 1.0); else gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT | (state.depth ? gl.DEPTH_BUFFER_BIT : 0));
        drawObjects(programs.idColor, view, projection, models, (p) => {
            gl.uniform1i(p.uniforms.uMethod, method === "faceColours" ? 0 : 1);
            gl.uniform1i(p.uniforms.uVisualize, 0);
        }, pick);
    }

    const x = onePixel ? 0 : pixel.x, y = onePixel ? 0 : pixel.y;
    let value;
    if (method === "idUint") {
        const out = new Uint32Array(4);
        gl.readPixels(x, y, 1, 1, gl.RGBA_INTEGER, gl.UNSIGNED_INT, out);
        value = out[0];
    } else {
        const out = new Uint8Array(4);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
        value = [out[0], out[1], out[2]];
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.enable(gl.DEPTH_TEST);
    return value;
}

/** The id under a pixel, read from the id attachment of the frame already drawn. */
function mrtPick(pixel) {
    const { framebuffer } = ensureMrtTarget();
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    const out = new Uint32Array(4);
    gl.readPixels(pixel.x, pixel.y, 1, 1, gl.RGBA_INTEGER, gl.UNSIGNED_INT, out);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    return out[0];
}

const describe = (hit) => (hit ? `cube ${hit.object + 1}, ${FACE_NAMES[hit.face]}` : "background");
const same = (a, b, faceOnly = false) => (!a && !b) || (a && b && a.face === b.face && (faceOnly || a.object === b.object));

function runPick(event, clickPixel) {
    const pixel = eventToPixel(event, canvas.getBoundingClientRect(), canvas.width, canvas.height, state.coords);
    lastPick = { pixel, clickPixel };
    const rows = [];

    // the reference: a ray through the pixel that was CLICKED (what the user meant)
    const { view, projection, models } = frameMatrices();
    const truth = insideCanvas(clickPixel, canvas.width, canvas.height) ? rayCast(clickPixel.x, clickPixel.y, canvas.width, canvas.height, view, projection, models) : null;
    rows.push({ method: "CPU ray cast through the clicked pixel (reference)", read: "–", result: describe(truth), agrees: "–", ms: null });

    if (!insideCanvas(pixel, canvas.width, canvas.height)) {
        rows.push({ method: "Every GPU method", read: `pixel (${pixel.x}, ${pixel.y}) is outside the canvas`, result: "nothing read", agrees: truth ? "no" : "yes", ms: null });
        finishPick(rows, null);
        return;
    }

    let chosen = null;
    for (const method of Object.keys(METHODS)) {
        const t0 = performance.now();
        const value = gpuPick(method, pixel);
        const ms = performance.now() - t0;
        let hit, read, extra = "";
        if (method === "faceColours") {
            const face = faceFromPickColour(value);
            hit = face < 0 ? null : { object: null, face };
            read = `rgb (${value.join(", ")})`;
            extra = face < 0 ? "" : ` · pickCube prints "${PICK_COLOUR_NAMES[face]}", pickCube2 "${sampleDecode(value, PICKCUBE2_NAMES)}"`;
        } else {
            const id = method === "idUint" ? value : bytesToId(value);
            hit = decodeId(id);
            read = method === "idUint" ? `uint ${value}` : `rgb (${value.join(", ")}) = id ${id}`;
        }
        const result = hit ? (hit.object === null ? `${FACE_NAMES[hit.face]} of some cube` : describe(hit)) : "background";
        rows.push({ method: METHODS[method].label + (state.region === "pixel" ? ", 1 × 1" : ""), read, result: result + extra, agrees: same(hit, truth, hit && hit.object === null) ? "yes" : "no", ms });
        if (method === state.method && state.strategy === "separate") chosen = hit;
    }

    const t0 = performance.now();
    const id = mrtPick(pixel);
    const ms = performance.now() - t0;
    const mrtHit = decodeId(id);
    const mrtValid = state.strategy === "mrt" && state.view === "scene";
    rows.push({ method: "Id attachment of the last frame (multiple render targets)", read: mrtValid ? `uint ${id}` : "–", result: mrtValid ? describe(mrtHit) : "only with the MRT strategy and the scene view", agrees: mrtValid ? (same(mrtHit, truth) ? "yes" : "no") : "–", ms: mrtValid ? ms : null });
    if (mrtValid) chosen = mrtHit;

    finishPick(rows, chosen);
}

function finishPick(rows, chosen) {
    picked = chosen && chosen.object !== null ? chosen : null;
    const body = $("Results");
    body.replaceChildren();
    for (const r of rows) {
        const tr = document.createElement("tr");
        for (const cell of [r.method, r.read, r.result, r.agrees, r.ms === null ? "–" : r.ms.toFixed(2)]) {
            const td = document.createElement("td");
            td.textContent = cell;
            if (cell === "no") td.className = "bad";
            tr.append(td);
        }
        body.append(tr);
    }
    drawOverlay();
}

function drawOverlay() {
    const context = overlay.getContext("2d");
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    context.clearRect(0, 0, overlay.width, overlay.height);
    if (!lastPick) return;
    const { pixel, clickPixel } = lastPick;
    const toScreen = (p) => [p.x + 0.5, canvas.height - p.y - 0.5];
    const [cx, cy] = toScreen(clickPixel);
    context.lineWidth = 2;
    context.strokeStyle = "#ffffff";
    context.beginPath(); context.moveTo(cx - 9, cy); context.lineTo(cx + 9, cy); context.moveTo(cx, cy - 9); context.lineTo(cx, cy + 9); context.stroke();
    if (pixel.x !== clickPixel.x || pixel.y !== clickPixel.y) {
        const [px, py] = toScreen(pixel);
        context.strokeStyle = "#ff5a36";
        context.beginPath(); context.arc(px, py, 8, 0, 2 * Math.PI); context.stroke();
        context.setLineDash([5, 4]);
        context.beginPath(); context.moveTo(cx, cy); context.lineTo(px, py); context.stroke();
        $("Offset").textContent = `Clicked pixel (${clickPixel.x}, ${clickPixel.y}); pixel read (${pixel.x}, ${pixel.y}): off by (${pixel.x - clickPixel.x}, ${pixel.y - clickPixel.y}).`;
    } else {
        $("Offset").textContent = `Pixel (${pixel.x}, ${pixel.y}) read: the one under the mouse.`;
    }
}

// ------------------------------------------------------------------- frame

function render(now) {
    requestAnimationFrame(render);
    const dt = lastTime === null ? 0 : Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    if (state.rotate) {
        if (state.scene === "single") theta[state.axis] += 2.0;          // pickCube: 2 degrees per frame
        else time += state.spinSpeed * dt;
    }
    drawFrame();
    if (state.when === "hover" && hoverEvent) {
        runPick(hoverEvent, eventToPixel(hoverEvent, canvas.getBoundingClientRect(), canvas.width, canvas.height, "canvas"));
    }
}

// ------------------------------------------------------------------------ UI

const rangeControls = {
    SpinSpeed: { key: "spinSpeed", digits: 0 },
    Azimuth:   { key: "azimuth",   digits: 0 },
    Elevation: { key: "elevation", digits: 0 },
    Distance:  { key: "distance",  digits: 1 },
};
const selectControls = {
    Scene:    { key: "scene" },
    Method:   { key: "method" },
    Strategy: { key: "strategy" },
    Region:   { key: "region" },
    Coords:   { key: "coords" },
    When:     { key: "when" },
    View:     { key: "view" },
};
const checkControls = {
    Depth:  { key: "depth" },
    Rotate: { key: "rotate" },
};

function setOutput(id, value, digits) { $(`${id}Out`).textContent = Number(value).toFixed(digits); }

function syncControls() {
    for (const [id, c] of Object.entries(rangeControls)) { $(id).value = state[c.key]; setOutput(id, state[c.key], c.digits); }
    for (const [id, c] of Object.entries(selectControls)) $(id).value = String(state[c.key]);
    for (const [id, c] of Object.entries(checkControls)) $(id).checked = Boolean(state[c.key]);
    $("Example").value = exampleId;
    for (const b of ["ButtonX", "ButtonY", "ButtonZ"]) $(b).disabled = state.scene !== "single";
    $("SpinSpeed").disabled = state.scene === "single";
}

function chooseExample(id) {
    exampleId = id;
    state = { ...baseState, ...currentExample().preset };
    theta = [45, 45, 45];
    time = 0;
    picked = null;
    lastPick = null;
    $("ExampleLook").textContent = currentExample().look;
    $("Results").replaceChildren();
    $("Offset").textContent = "";
    drawOverlay();
}

function buildMenus() {
    for (const group of GROUPS) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = group;
        for (const example of EXAMPLES.filter((e) => e.group === group)) optgroup.append(new Option(example.label, example.id));
        $("Example").append(optgroup);
    }
    for (const [id, scene] of Object.entries(SCENES)) $("Scene").append(new Option(scene.label, id));
    for (const [id, method] of Object.entries(METHODS)) $("Method").append(new Option(method.label, id));
}

function attachControls() {
    for (const [id, c] of Object.entries(rangeControls)) {
        $(id).oninput = (e) => { state[c.key] = Number(e.target.value); setOutput(id, e.target.value, c.digits); };
    }
    for (const [id, c] of Object.entries(selectControls)) {
        $(id).onchange = (e) => { state[c.key] = e.target.value; picked = null; syncControls(); };
    }
    for (const [id, c] of Object.entries(checkControls)) {
        $(id).onchange = (e) => { state[c.key] = e.target.checked; syncControls(); };
    }
    $("Example").onchange = (e) => { chooseExample(e.target.value); syncControls(); };
    $("ButtonX").onclick = () => { state.axis = 0; };
    $("ButtonY").onclick = () => { state.axis = 1; };
    $("ButtonZ").onclick = () => { state.axis = 2; };

    // A click picks; a drag orbits the camera; with "hover", moving picks every frame.
    let down = null;
    canvas.onpointerdown = (e) => { down = { x: e.clientX, y: e.clientY, moved: false }; canvas.setPointerCapture(e.pointerId); };
    canvas.onpointermove = (e) => {
        hoverEvent = { clientX: e.clientX, clientY: e.clientY };
        if (!down) return;
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (!down.moved && Math.hypot(dx, dy) < 4) return;
        down.moved = true;
        state.azimuth = (((state.azimuth - dx * 0.4) % 360) + 360) % 360;
        state.elevation = Math.max(-80, Math.min(80, state.elevation + dy * 0.4));
        down.x = e.clientX; down.y = e.clientY;
        syncControls();
    };
    canvas.onpointerup = (e) => {
        if (down && !down.moved) {
            const event = { clientX: e.clientX, clientY: e.clientY };
            runPick(event, eventToPixel(event, canvas.getBoundingClientRect(), canvas.width, canvas.height, "canvas"));
        }
        down = null;
    };
    canvas.onpointerleave = () => { hoverEvent = null; };
}

// ----------------------------------------------------------------------- main

function makeProgram(vertexSource, fragmentSource, uniformNames) {
    const program = initShaders(gl, vertexSource, fragmentSource);
    const uniforms = Object.fromEntries(uniformNames.map((name) => [name, gl.getUniformLocation(program, name)]));
    return { program, uniforms };
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
        overlay = $("Overlay");
        // no antialiasing: blitFramebuffer cannot copy into a multisampled canvas
        gl = canvas.getContext('webgl2', { antialias: false });
        if (!gl) alert("WebGL 2.0 isn't available");

        const common = ["uModelViewMatrix", "uProjectionMatrix", "uPickMatrix", "uNormalMatrix", "uObject"];
        const lit = ["uColor", "uLightDirection", "uPickedObject", "uPickedFace"];
        programs.scene = makeProgram(sources.sceneVert, sources.sceneFrag, [...common, ...lit]);
        programs.mrt = makeProgram(sources.sceneVert, sources.mrtFrag, [...common, ...lit]);
        programs.idColor = makeProgram(sources.sceneVert, sources.idColorFrag, [...common, "uMethod", "uVisualize"]);
        programs.idUint = makeProgram(sources.sceneVert, sources.idUintFrag, common);

        // All four programs share scene.vert, whose inputs have fixed locations (layout(location = ...)),
        // so one vertex array object serves every pass. Check that, rather than assume it.
        cubeVAO = gl.createVertexArray();
        gl.bindVertexArray(cubeVAO);
        for (const [name, data, size] of [["aPosition", cube.positions, 3], ["aNormal", cube.normals, 3], ["aFace", cube.faces, 1]]) {
            const location = gl.getAttribLocation(programs.scene.program, name);
            for (const p of Object.values(programs)) {
                if (gl.getAttribLocation(p.program, name) !== location) throw new Error(`Attribute ${name} has different locations in different programs`);
            }
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(location);
        }
        gl.bindVertexArray(null);

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
