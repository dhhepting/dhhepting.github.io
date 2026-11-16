import { initShaders } from '../../common/initShadersJS.mjs';

import { SEEDS, RULES, RULE_INDEX, checkerboardFactor, toBytes, makeParticles, moveParticles } from './seeds.mjs';
import { FORMATS, COMPARES, simConfigs, boundaryForStep, EXAMPLES, GROUPS, exampleById } from './examples.mjs';

// Shader files are fetched (not imported with ?raw) so that this page also works
// when it is served as-is, without a bundler.
const shaderURLs = {
    fullscreenVert: new URL('./shaders/fullscreen.vert', import.meta.url),
    stepFrag: new URL('./shaders/step.frag', import.meta.url),
    displayFrag: new URL('./shaders/display.frag', import.meta.url),
    pointsVert: new URL('./shaders/points.vert', import.meta.url),
    pointsFrag: new URL('./shaders/points.frag', import.meta.url),
};

let canvas;
let gl;
let floatTargets = false;          // EXT_color_buffer_float: float textures can be rendered to and read back

const programs = {};
let pointBuffer;
let brushBuffer;

// --------------------------------------------------------------------- state

const baseState = {
    seed: "triangle", size: 512, rule: "average4", rate: 0.2, format: "rgba8", boundary: "clamp", decay: 1.0,
    stepsPerFrame: 1, running: true, feed: 0.055, kill: 0.062,
    particles: false, particleCount: 1000, particleSize: 10, particleStep: 0.01,
    view: "stored", channel: 1, kernel: 2, gain: 1.0, compare: "off",
    brushSize: 12, brushColour: [1.0, 0.85, 0.1],
};

let state = { ...baseState };
let exampleId = "render4";

let sims = [];                     // one or two { config, format, textures: [2], framebuffers: [2], current, history }
let particles = null;
let stepCount = 0;
let frameCount = 0;
let needsReset = true;
let pendingSteps = 0;              // single steps requested while paused
let paintQueue = [];               // clip-space points to paint before the next step
let pendingRead = null;            // an asynchronous read for the chart, waiting on a fence
let generation = 0;                // bumped on every restart, so a read of deleted textures is discarded

const VIEW_INDEX = { stored: 0, grey: 1, heat: 2, falseColour: 3, edges: 4, grayScott: 5 };
const $ = (id) => document.getElementById(id);
const currentExample = () => exampleById(exampleId);

// ------------------------------------------------------------- simulations

function textureFormat(format) {
    if (format === "rgba16f") return { internal: gl.RGBA16F, type: gl.FLOAT };
    if (format === "rgba32f") return { internal: gl.RGBA32F, type: gl.FLOAT };
    return { internal: gl.RGBA8, type: gl.UNSIGNED_BYTE };
}

// A float format needs EXT_color_buffer_float to be rendered to; without it the page falls back to RGBA8.
const usableFormat = (format) => (FORMATS[format].float && !floatTargets ? "rgba8" : format);

function createSim(config, image) {
    const format = usableFormat(config.format);
    const { internal, type } = textureFormat(format);
    const n = state.size;
    const data = (type === gl.FLOAT) ? image : toBytes(image);

    const textures = [];
    const framebuffers = [];
    for (let k = 0; k < 2; k++) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, internal, n, n, 0, gl.RGBA, type, data);
        // NEAREST, no mipmaps: the shaders read single texels with texelFetch
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error(`The ${format} framebuffer is not complete`);
        }
        textures.push(texture);
        framebuffers.push(framebuffer);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { config, format, textures, framebuffers, current: 0, history: [] };
}

function deleteSims() {
    for (const sim of sims) {
        sim.textures.forEach((t) => gl.deleteTexture(t));
        sim.framebuffers.forEach((f) => gl.deleteFramebuffer(f));
    }
    sims = [];
}

function cancelPendingRead() {
    if (!pendingRead) return;
    gl.deleteSync(pendingRead.fence);
    pendingRead.reads.forEach((r) => gl.deleteBuffer(r.buffer));
    pendingRead = null;
}

function resetSimulations() {
    cancelPendingRead();             // a read of the old textures must not block the first read of the new ones
    deleteSims();
    const image = SEEDS[state.seed].make(state.size);
    sims = simConfigs(state).map((config) => createSim(config, image));
    particles = makeParticles(state.particleCount);
    stepCount = 0;
    frameCount = 0;
    needsReset = false;
    generation++;
    resizeCanvas();
    requestStatistics();
    updateReadouts();
    updateStatus();
}

// The configs can change without a reset (e.g. the rate); formats cannot.
function refreshConfigs() {
    const configs = simConfigs(state);
    if (configs.length !== sims.length || configs.some((c, k) => usableFormat(c.format) !== sims[k].format)) {
        needsReset = true;
        return;
    }
    configs.forEach((c, k) => { sims[k].config = c; });
}

// ----------------------------------------------------------------- stepping

function drawPoints(buffer, count, size, colour) {
    const p = programs.points;
    gl.useProgram(p.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(p.attributes.aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(p.attributes.aPosition);
    gl.uniform1f(p.uniforms.uPointSize, size);
    gl.uniform4fv(p.uniforms.uColor, colour);
    gl.uniform1i(p.uniforms.uRound, 1);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.disableVertexAttribArray(p.attributes.aPosition);
}

function stepSim(sim) {
    const n = state.size;
    const next = 1 - sim.current;

    gl.bindFramebuffer(gl.FRAMEBUFFER, sim.framebuffers[next]);
    gl.viewport(0, 0, n, n);

    const p = programs.step;
    gl.useProgram(p.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sim.textures[sim.current]);
    gl.uniform1i(p.uniforms.uState, 0);
    gl.uniform1i(p.uniforms.uRule, RULE_INDEX[sim.config.rule]);
    gl.uniform1i(p.uniforms.uBoundary, boundaryForStep(sim.config.boundary, stepCount) === "repeat" ? 1 : 0);
    gl.uniform1f(p.uniforms.uRate, sim.config.rate);
    gl.uniform1f(p.uniforms.uDecay, sim.config.decay);
    gl.uniform1f(p.uniforms.uFeed, state.feed);
    gl.uniform1f(p.uniforms.uKill, state.kill);
    gl.uniform1f(p.uniforms.uDiffU, 1.0);
    gl.uniform1f(p.uniforms.uDiffV, 0.5);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // particleDiffusion: the walkers are drawn into the new state after each step
    if (state.particles) {
        const half = Math.floor(state.particleCount / 2);
        const p2 = programs.points;
        gl.useProgram(p2.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
        gl.vertexAttribPointer(p2.attributes.aPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(p2.attributes.aPosition);
        gl.uniform1f(p2.uniforms.uPointSize, state.particleSize * n / 1024);
        gl.uniform1i(p2.uniforms.uRound, 0);
        gl.uniform4fv(p2.uniforms.uColor, [0.9, 0.0, 0.9, 1.0]);
        gl.drawArrays(gl.POINTS, 0, half);
        gl.uniform4fv(p2.uniforms.uColor, [0.0, 1.0, 0.0, 1.0]);
        gl.drawArrays(gl.POINTS, half, state.particleCount - half);
        gl.disableVertexAttribArray(p2.attributes.aPosition);
    }

    sim.current = next;
}

function applyPaint() {
    if (!paintQueue.length) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, brushBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(paintQueue.flat()), gl.DYNAMIC_DRAW);
    const colour = (state.rule === "grayScott") ? [0.5, 0.25, 0.0, 1.0] : [...state.brushColour, 1.0];
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);        // never leave the texture being drawn into bound for sampling
    for (const sim of sims) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, sim.framebuffers[sim.current]);
        gl.viewport(0, 0, state.size, state.size);
        drawPoints(brushBuffer, paintQueue.length, state.brushSize * state.size / 512, colour);
    }
    paintQueue = [];
}

function advance(steps) {
    for (let s = 0; s < steps; s++) {
        if (state.particles) {
            moveParticles(particles, state.particleStep);
            gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, particles, gl.DYNAMIC_DRAW);
        }
        for (const sim of sims) stepSim(sim);
        stepCount++;
    }
}

// ----------------------------------------------------------------- display

function resizeCanvas() {
    const width = (sims.length === 2) ? 1024 : 768;
    const height = (sims.length === 2) ? 512 : 768;
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
    canvas.style.aspectRatio = `${width} / ${height}`;
}

/** The viewport (in canvas pixels) each simulation is drawn into. */
function viewports() {
    if (sims.length === 2) return [[0, 0, 512, 512], [512, 0, 512, 512]];
    return [[0, 0, canvas.width, canvas.height]];
}

function drawDisplay() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0.08, 0.09, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const p = programs.display;
    gl.useProgram(p.program);
    viewports().forEach((viewport, k) => {
        const sim = sims[k];
        gl.viewport(...viewport);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sim.textures[sim.current]);
        gl.uniform1i(p.uniforms.uState, 0);
        gl.uniform1i(p.uniforms.uView, VIEW_INDEX[sim.config.view]);
        gl.uniform1i(p.uniforms.uChannel, state.channel);
        gl.uniform1i(p.uniforms.uKernel, sim.config.kernel);
        gl.uniform1f(p.uniforms.uGain, state.gain);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
}

// ------------------------------------------------- reading values back (readPixels)

function readState(sim, x, y, width, height) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, sim.framebuffers[sim.current]);
    let values;
    if (sim.format === "rgba8") {
        const bytes = new Uint8Array(width * height * 4);
        gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
        values = Float32Array.from(bytes, (b) => b / 255);
    } else {
        values = new Float32Array(width * height * 4);
        gl.readPixels(x, y, width, height, gl.RGBA, gl.FLOAT, values);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return values;
}

// The chart's numbers are read asynchronously: readPixels into a pixel-pack buffer
// returns at once, a fence marks when the GPU has finished, and the data is copied
// out on a later frame. A plain readPixels (the probe) makes the CPU wait for the GPU.
function requestStatistics() {
    if (pendingRead) return;
    const n = state.size;
    const reads = sims.map((sim) => {
        const float = sim.format !== "rgba8";
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buffer);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, n * n * 4 * (float ? 4 : 1), gl.STREAM_READ);
        gl.bindFramebuffer(gl.FRAMEBUFFER, sim.framebuffers[sim.current]);
        gl.readPixels(0, 0, n, n, gl.RGBA, float ? gl.FLOAT : gl.UNSIGNED_BYTE, 0);
        return { sim, buffer, float };
    });
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    pendingRead = { reads, n, step: stepCount, generation, channel: state.channel, fence: gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) };
    gl.flush();
}

function collectStatistics() {
    if (!pendingRead) return;
    if (gl.clientWaitSync(pendingRead.fence, 0, 0) === gl.TIMEOUT_EXPIRED) return;     // not finished yet: try next frame
    gl.deleteSync(pendingRead.fence);

    const { reads, n, step, channel } = pendingRead;
    const current = pendingRead.generation === generation;
    for (const { sim, buffer, float } of reads) {
        if (current) {
            const data = float ? new Float32Array(n * n * 4) : new Uint8Array(n * n * 4);
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buffer);
            gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, data);
            const scale = float ? 1 : 1 / 255;
            let sum = 0, checker = 0;
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    const v = data[4 * (i * n + j) + channel] * scale;
                    sum += v;
                    checker += ((i + j) & 1) ? -v : v;
                }
            }
            sim.history.push({ step, mean: sum / (n * n), checker: checker / (n * n) });
            if (sim.history.length > 300) sim.history.shift();
        }
        gl.deleteBuffer(buffer);
    }
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    pendingRead = null;
    if (current) {
        drawChart();
        updateReadouts();
    }
}

const SIDE_COLOURS = ["#1b8a8f", "#c2551d"];

function drawChart() {
    const chart = $("Chart");
    const context = chart.getContext("2d");
    const width = chart.width, height = chart.height;
    context.clearRect(0, 0, width, height);

    const all = sims.flatMap((s) => s.history.map((h) => h.mean));
    if (!all.length) return;
    let lo = Math.min(...all), hi = Math.max(...all);
    if (hi - lo < 1e-6) { lo -= 0.01; hi += 0.01; }
    const steps = sims.flatMap((s) => s.history.map((h) => h.step));
    const s0 = Math.min(...steps), s1 = Math.max(...steps, s0 + 1);

    context.strokeStyle = "rgba(128,128,128,0.35)";
    context.lineWidth = 1;
    context.strokeRect(0.5, 0.5, width - 1, height - 1);

    sims.forEach((sim, k) => {
        context.strokeStyle = SIDE_COLOURS[k];
        context.lineWidth = 2;
        context.beginPath();
        sim.history.forEach((h, q) => {
            const x = 4 + (width - 8) * (h.step - s0) / (s1 - s0);
            const y = height - 4 - (height - 8) * (h.mean - lo) / (hi - lo);
            if (q === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.stroke();
    });
    $("ChartRange").textContent = `mean of channel ${"RGB"[state.channel]}: ${lo.toFixed(4)} to ${hi.toFixed(4)}, steps ${s0} to ${s1}`;
}

function updateReadouts() {
    const lines = sims.map((sim, k) => {
        const h = sim.history.at(-1);
        const name = sims.length === 2 ? (k === 0 ? "Left" : "Right") : "State";
        const first = sim.history[0];
        return `${name} (${sim.format}): mean ${h ? h.mean.toFixed(5) : "–"}${first && h ? ` (started ${first.mean.toFixed(5)})` : ""}, checkerboard component ${h ? h.checker.toExponential(2) : "–"}`;
    });
    $("Readout").textContent = `Step ${stepCount}. ` + lines.join(" · ");
}

function updateStatus() {
    const messages = [];
    const compare = COMPARES[state.compare];
    if (state.compare !== "off") messages.push(compare.note);

    for (const config of simConfigs(state)) {
        const factor = checkerboardFactor(config.rule, config.rate);
        if (factor === null) continue;
        const where = config.side === "all" ? "" : `${config.side === "left" ? "Left" : "Right"}: `;
        const verdict = Math.abs(factor) > 1 ? "grows: unstable" : Math.abs(factor) === 1 ? "never decays" : "decays";
        messages.push(`${where}one step multiplies the checkerboard pattern by ${factor.toFixed(2)} (${verdict}).`);
    }
    if (simConfigs(state).some((c) => FORMATS[c.format].float) && !floatTargets) {
        messages.push("This browser cannot render to float textures (EXT_color_buffer_float), so RGBA8 is used instead.");
    }
    if (state.rule === "grayScott" && simConfigs(state).some((c) => usableFormat(c.format) === "rgba8")) {
        messages.push("Gray-Scott in RGBA8: changes smaller than 1/255 per step are lost.");
    }
    $("Status").textContent = messages.join(" ");
    $("Status").hidden = messages.length === 0;
}

// ------------------------------------------------------------------- frame

function render() {
    requestAnimationFrame(render);

    if (needsReset) resetSimulations();

    applyPaint();
    const steps = state.running ? state.stepsPerFrame : pendingSteps;
    pendingSteps = 0;
    if (steps > 0) advance(steps);

    drawDisplay();

    frameCount++;
    collectStatistics();
    const every = Math.max(4, Math.round((state.size / 256) ** 2 * 2));      // read back less often for big textures
    if (steps > 0 && (frameCount % every === 0 || !state.running)) requestStatistics();
}

// ------------------------------------------------------------------------ UI

const rangeControls = {
    Rate:          { key: "rate",          digits: 3, refresh: true },
    Decay:         { key: "decay",         digits: 3, refresh: true },
    StepsPerFrame: { key: "stepsPerFrame", digits: 0 },
    Feed:          { key: "feed",          digits: 4 },
    Kill:          { key: "kill",          digits: 4 },
    ParticleCount: { key: "particleCount", digits: 0, reset: true },
    ParticleSize:  { key: "particleSize",  digits: 0 },
    ParticleStep:  { key: "particleStep",  digits: 3 },
    Gain:          { key: "gain",          digits: 1 },
    BrushSize:     { key: "brushSize",     digits: 0 },
};

const selectControls = {
    Seed:     { key: "seed",     reset: true },
    Size:     { key: "size",     numeric: true, reset: true },
    Rule:     { key: "rule",     refresh: true },
    Format:   { key: "format",   refresh: true },
    Boundary: { key: "boundary", refresh: true },
    View:     { key: "view",     refresh: true },
    Channel:  { key: "channel",  numeric: true },
    Kernel:   { key: "kernel",   numeric: true, refresh: true },
    Compare:  { key: "compare",  refresh: true },
};

const checkControls = {
    Running:   { key: "running" },
    Particles: { key: "particles" },
};

function setOutput(id, value, digits) {
    $(`${id}Out`).textContent = Number(value).toFixed(digits);
}

function rgbToHex(rgb) {
    return "#" + rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");
}

function syncControls() {
    for (const [id, c] of Object.entries(rangeControls)) {
        $(id).value = state[c.key];
        setOutput(id, state[c.key], c.digits);
    }
    for (const [id, c] of Object.entries(selectControls)) $(id).value = String(state[c.key]);
    for (const [id, c] of Object.entries(checkControls)) $(id).checked = Boolean(state[c.key]);
    $("BrushColour").value = rgbToHex(state.brushColour);
    $("Example").value = exampleId;

    $("Rate").disabled = state.rule !== "heat";
    $("Feed").disabled = state.rule !== "grayScott";
    $("Kill").disabled = state.rule !== "grayScott";
    $("Kernel").disabled = state.view !== "edges";
    $("ButtonStep").disabled = state.running;
    for (const option of $("Format").options) option.disabled = FORMATS[option.value].float && !floatTargets;
}

function afterChange(control) {
    if (control.reset) needsReset = true;
    else if (control.refresh) refreshConfigs();
    updateStatus();
    syncControls();
}

function chooseExample(id) {
    exampleId = id;
    state = { ...baseState, brushColour: [...baseState.brushColour], ...currentExample().preset };
    $("ExampleLook").textContent = currentExample().look;
    needsReset = true;
    updateStatus();
}

function buildMenus() {
    for (const group of GROUPS) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = group;
        for (const example of EXAMPLES.filter((e) => e.group === group)) {
            optgroup.append(new Option(example.label, example.id));
        }
        $("Example").append(optgroup);
    }
    for (const [id, seed] of Object.entries(SEEDS)) $("Seed").append(new Option(seed.label, id));
    for (const [id, rule] of Object.entries(RULES)) $("Rule").append(new Option(rule.label, id));
    for (const [id, format] of Object.entries(FORMATS)) $("Format").append(new Option(format.label, id));
    for (const [id, compare] of Object.entries(COMPARES)) $("Compare").append(new Option(compare.label, id));
}

/** Canvas pixel -> which simulation, which texel, and the clip-space position inside it. */
function locate(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * canvas.width / rect.width;
    const y = (rect.bottom - event.clientY) * canvas.height / rect.height;      // y up, as in WebGL
    const k = viewports().findIndex(([vx, vy, w, h]) => x >= vx && x < vx + w && y >= vy && y < vy + h);
    if (k < 0) return null;
    const [vx, vy, w, h] = viewports()[k];
    const u = (x - vx) / w, v = (y - vy) / h;
    return { sim: k, u, v, texel: [Math.floor(u * state.size), Math.floor(v * state.size)], clip: [2 * u - 1, 2 * v - 1] };
}

function attachControls() {
    for (const [id, c] of Object.entries(rangeControls)) {
        $(id).oninput = (e) => {
            state[c.key] = Number(e.target.value);
            setOutput(id, e.target.value, c.digits);
            afterChange(c);
        };
    }
    for (const [id, c] of Object.entries(selectControls)) {
        $(id).onchange = (e) => {
            state[c.key] = c.numeric ? Number(e.target.value) : e.target.value;
            afterChange(c);
        };
    }
    for (const [id, c] of Object.entries(checkControls)) {
        $(id).onchange = (e) => {
            state[c.key] = e.target.checked;
            afterChange(c);
        };
    }
    $("Example").onchange = (e) => { chooseExample(e.target.value); syncControls(); };
    $("BrushColour").oninput = (e) => { state.brushColour = [1, 3, 5].map((k) => parseInt(e.target.value.slice(k, k + 2), 16) / 255); };
    $("ButtonReset").onclick = () => { needsReset = true; };
    $("ButtonStep").onclick = () => { pendingSteps += 1; };

    // Paint by dragging; hovering shows the value of the texel under the cursor.
    let painting = false;
    canvas.onpointerdown = (e) => { painting = true; canvas.setPointerCapture(e.pointerId); canvas.onpointermove(e); };
    canvas.onpointerup = () => { painting = false; };
    canvas.onpointercancel = () => { painting = false; };
    canvas.onpointermove = (e) => {
        const hit = locate(e);
        if (!hit) { $("Probe").textContent = "Point at the simulation to read a texel."; return; }
        if (painting) paintQueue.push(hit.clip);

        const sim = sims[hit.sim];
        const [i, j] = hit.texel;
        const v = readState(sim, i, j, 1, 1);
        const side = sims.length === 2 ? (hit.sim === 0 ? "left, " : "right, ") : "";
        $("Probe").textContent = `Texel (${i}, ${j}) [${side}${sim.format}]: R ${v[0].toFixed(5)}, G ${v[1].toFixed(5)}, B ${v[2].toFixed(5)}`;
    };
}

// ----------------------------------------------------------------------- main

function makeProgram(vertexSource, fragmentSource, uniformNames, attributeNames = []) {
    const program = initShaders(gl, vertexSource, fragmentSource);
    const uniforms = Object.fromEntries(uniformNames.map((name) => [name, gl.getUniformLocation(program, name)]));
    const attributes = Object.fromEntries(attributeNames.map((name) => [name, gl.getAttribLocation(program, name)]));
    return { program, uniforms, attributes };
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

        floatTargets = Boolean(gl.getExtension("EXT_color_buffer_float"));

        programs.step = makeProgram(sources.fullscreenVert, sources.stepFrag,
            ["uState", "uRule", "uBoundary", "uRate", "uDecay", "uFeed", "uKill", "uDiffU", "uDiffV"]);
        programs.display = makeProgram(sources.fullscreenVert, sources.displayFrag,
            ["uState", "uView", "uChannel", "uKernel", "uGain"]);
        programs.points = makeProgram(sources.pointsVert, sources.pointsFrag,
            ["uPointSize", "uColor", "uRound"], ["aPosition"]);

        pointBuffer = gl.createBuffer();
        brushBuffer = gl.createBuffer();

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
