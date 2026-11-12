import { vec3, vec4, mult, lookAt, perspective, normalMatrix, flatten } from '../../common/MV.mjs';
import { initShaders } from '../../common/initShadersJS.mjs';

// Shader files are fetched (not imported with ?raw) so that this page also works
// when it is served as-is, without a bundler.
const shaderURLs = {
    perVertexVert: new URL('./shaders/perVertexLighting.vert', import.meta.url),
    colorPassthroughFrag: new URL('./shaders/colorPassthrough.frag', import.meta.url),
    perFragmentVert: new URL('./shaders/perFragmentLighting.vert', import.meta.url),
    perFragmentFrag: new URL('./shaders/perFragmentLighting.frag', import.meta.url),
    perFragmentNormalizedFrag: new URL('./shaders/perFragmentLightingNormalized.frag', import.meta.url),
    wireVert: new URL('./shaders/wireSphere.vert', import.meta.url),
    blackFrag: new URL('./shaders/black.frag', import.meta.url),
    markerVert: new URL('./shaders/lightMarker.vert', import.meta.url),
    markerFrag: new URL('./shaders/lightMarker.frag', import.meta.url),
};

let shaderSources;
let panes = [];

const canvasSize = 560;

// The triangle sits at the origin; the camera is on +z looking down -z.
const eyeDistance = 3.0;
const fovy = 40.0;
const near = 0.1;
const far = 20.0;

const eye = vec3(0.0, 0.0, eyeDistance);
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

// An equilateral triangle with circumradius 1.
const triangleVertices = [
    [0.0, 1.0, 0.0],
    [-Math.sqrt(3.0) / 2.0, -0.5, 0.0],
    [Math.sqrt(3.0) / 2.0, -0.5, 0.0],
];
const vertexNames = ["A", "B", "C"];

// Same light and material as the shadedSphere samples.
const lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
const lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
const lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

const materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
const materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
const materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);

const ambientProduct = mult(lightAmbient, materialAmbient);
const diffuseProduct = mult(lightDiffuse, materialDiffuse);
const specularProduct = mult(lightSpecular, materialSpecular);

const markerColor = vec4(0.1, 0.8, 1.0, 1.0);

// Things the controls change.
let shininess = 100.0;
let curvature = 0.9;          // how far the vertex normals tilt outward
let lightDistance = 0.8;      // distance of the light from a preset point
let lightMode = "centre";     // "A", "B", "C", "centre" or "free"
let placement = "mirror";     // "mirror" or "above"
let freeLight = vec3(0.0, 0.0, 0.8);
let showEdges = true;
let showLabels = true;
let renormalize = true;       // right-hand canvas: renormalize N, L, E per fragment

let needsRedraw = true;

// ---------------------------------------------------------------- small maths

const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit3 = (a) => mul3(a, 1.0 / Math.hypot(a[0], a[1], a[2]));

const modelViewMatrix = lookAt(eye, at, up);
const projectionMatrix = perspective(fovy, 1.0, near, far);
const nMatrix = normalMatrix(modelViewMatrix, true);

// ------------------------------------------------------------------- geometry

// Vertex normals tilt outward from the centre, as on a curved surface.
function vertexNormals() {
    return triangleVertices.map((p) => unit3([p[0] * curvature, p[1] * curvature, 1.0]));
}

function anchorPoint(name) {
    return name === "centre" ? [0.0, 0.0, 0.0] : triangleVertices[vertexNames.indexOf(name)];
}

function anchorNormal(name) {
    const n = vertexNormals();
    if (name === "centre") return unit3(add3(add3(n[0], n[1]), n[2]));
    return n[vertexNames.indexOf(name)];
}

// The direction from a surface point to the light that puts the specular peak
// exactly on that point for this viewer: E reflected about N, L = 2(N.E)N - E.
function mirrorDirection(point, normal) {
    const E = unit3(sub3([eye[0], eye[1], eye[2]], point));
    return unit3(sub3(mul3(normal, 2.0 * dot3(normal, E)), E));
}

function currentLight() {
    if (lightMode === "free") return [freeLight[0], freeLight[1], freeLight[2]];

    const point = anchorPoint(lightMode);
    const direction = (placement === "above")
        ? [0.0, 0.0, 1.0]
        : mirrorDirection(point, anchorNormal(lightMode));
    return add3(point, mul3(direction, lightDistance));
}

// -------------------------------------------------- what the shaders compute
//
// A CPU copy of the lighting maths in perVertexLighting.vert and
// perFragmentLighting(.vert/.frag), used only for the table of numbers.
// Everything is in eye coordinates; the light is a point light (w = 1).

function vertexVectors(i, lightWorld) {
    const pos = mult(modelViewMatrix, vec4(...triangleVertices[i], 1.0));
    const lightEye = mult(modelViewMatrix, vec4(...lightWorld, 1.0));
    const p = [pos[0], pos[1], pos[2]];
    const n = vertexNormals()[i];
    const nEye = [0, 1, 2].map((r) => nMatrix[r][0] * n[0] + nMatrix[r][1] * n[1] + nMatrix[r][2] * n[2]);
    return {
        L: unit3(sub3([lightEye[0], lightEye[1], lightEye[2]], p)),
        E: unit3(mul3(p, -1.0)),
        N: unit3(nEye),
    };
}

function specularTerm(N, L, E, normalizeFirst) {
    if (normalizeFirst) { N = unit3(N); L = unit3(L); E = unit3(E); }
    const H = unit3(add3(L, E));
    if (dot3(L, N) < 0.0) return 0.0;
    return Math.pow(Math.max(dot3(N, H), 0.0), shininess);
}

// Gouraud: the equation runs at the three vertices; the result is blended.
function gouraudAtVertices(lightWorld) {
    return [0, 1, 2].map((i) => {
        const v = vertexVectors(i, lightWorld);
        return specularTerm(v.N, v.L, v.E, false);
    });
}

// Phong: N, L and E (each computed at the vertices) are blended with
// barycentric weights, then the equation runs at the point.
function phongAt(weights, lightWorld) {
    const v = [0, 1, 2].map((i) => vertexVectors(i, lightWorld));
    const blend = (key) => [0, 1, 2].map((c) =>
        weights[0] * v[0][key][c] + weights[1] * v[1][key][c] + weights[2] * v[2][key][c]);
    return specularTerm(blend("N"), blend("L"), blend("E"), renormalize);
}

// ------------------------------------------------------------------- GL panes

function makeProgram(gl, vertexSource, fragmentSource, uniformNames) {
    const program = initShaders(gl, vertexSource, fragmentSource);
    const loc = {};
    for (const name of uniformNames) loc[name] = gl.getUniformLocation(program, name);
    return { program, loc };
}

const litUniforms = ["uModelViewMatrix", "uProjectionMatrix", "uNormalMatrix",
    "uAmbientProduct", "uDiffuseProduct", "uSpecularProduct", "uLightPosition", "uShininess"];

function setLitProgram(pane, vertexSource, fragmentSource) {
    pane.lit = makeProgram(pane.gl, vertexSource, fragmentSource, litUniforms);
}

function createPane(canvasId, vertexSource, fragmentSource) {
    const canvas = document.getElementById(canvasId);
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const gl = canvas.getContext("webgl2");
    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    // The depth test stays off: there is one triangle, and the light marker is
    // drawn last so it is never hidden by it.

    const pane = {
        canvas,
        gl,
        positionBuffer: gl.createBuffer(),
        normalBuffer: gl.createBuffer(),
        markerBuffer: gl.createBuffer(),
        lit: null,
        wire: makeProgram(gl, shaderSources.wireVert, shaderSources.blackFrag,
            ["uModelViewMatrix", "uProjectionMatrix"]),
        marker: makeProgram(gl, shaderSources.markerVert, shaderSources.markerFrag,
            ["uModelViewMatrix", "uProjectionMatrix", "uPointSize", "uColor"]),
    };
    setLitProgram(pane, vertexSource, fragmentSource);

    const positionsArray = triangleVertices.map((p) => vec4(p[0], p[1], p[2], 1.0));
    gl.bindBuffer(gl.ARRAY_BUFFER, pane.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

    return pane;
}

function bindAttribute(gl, program, name, buffer) {
    const location = gl.getAttribLocation(program, name);
    if (location < 0) return -1;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(location, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location);
    return location;
}

function drawPane(pane, lightWorld) {
    const { gl } = pane;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // normals are vectors (w = 0)
    const normalsArray = vertexNormals().map((n) => vec4(n[0], n[1], n[2], 0.0));
    gl.bindBuffer(gl.ARRAY_BUFFER, pane.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.DYNAMIC_DRAW);

    // the lit triangle
    const lit = pane.lit;
    gl.useProgram(lit.program);
    gl.uniformMatrix4fv(lit.loc.uModelViewMatrix, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(lit.loc.uProjectionMatrix, false, flatten(projectionMatrix));
    gl.uniformMatrix3fv(lit.loc.uNormalMatrix, false, flatten(nMatrix));
    gl.uniform4fv(lit.loc.uAmbientProduct, ambientProduct);
    gl.uniform4fv(lit.loc.uDiffuseProduct, diffuseProduct);
    gl.uniform4fv(lit.loc.uSpecularProduct, specularProduct);
    gl.uniform4fv(lit.loc.uLightPosition, mult(modelViewMatrix, vec4(...lightWorld, 1.0)));
    gl.uniform1f(lit.loc.uShininess, shininess);

    const litAttributes = [
        bindAttribute(gl, lit.program, "aPosition", pane.positionBuffer),
        bindAttribute(gl, lit.program, "aNormal", pane.normalBuffer),
    ];
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    litAttributes.forEach((a) => { if (a >= 0) gl.disableVertexAttribArray(a); });

    // the outline
    if (showEdges) {
        const wire = pane.wire;
        gl.useProgram(wire.program);
        gl.uniformMatrix4fv(wire.loc.uModelViewMatrix, false, flatten(modelViewMatrix));
        gl.uniformMatrix4fv(wire.loc.uProjectionMatrix, false, flatten(projectionMatrix));
        const a = bindAttribute(gl, wire.program, "aPosition", pane.positionBuffer);
        gl.drawArrays(gl.LINE_LOOP, 0, 3);
        gl.disableVertexAttribArray(a);
    }

    // the light
    const marker = pane.marker;
    gl.useProgram(marker.program);
    gl.uniformMatrix4fv(marker.loc.uModelViewMatrix, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(marker.loc.uProjectionMatrix, false, flatten(projectionMatrix));
    gl.uniform1f(marker.loc.uPointSize, 20.0);
    gl.uniform4fv(marker.loc.uColor, markerColor);
    gl.bindBuffer(gl.ARRAY_BUFFER, pane.markerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten([vec4(...lightWorld, 1.0)]), gl.DYNAMIC_DRAW);
    const m = bindAttribute(gl, marker.program, "aPosition", pane.markerBuffer);
    gl.drawArrays(gl.POINTS, 0, 1);
    gl.disableVertexAttribArray(m);
}

// ------------------------------------------------------------------------ UI

const $ = (id) => document.getElementById(id);
const fmt = (x) => x.toFixed(3);

function tableRow(label, gouraud, phong, strong) {
    const cell = (value, cls) =>
        `<td class="num"><span>${fmt(value)}</span>` +
        `<div class="bar"><span class="${cls}" style="width:${Math.min(100, value * 100).toFixed(1)}%"></span></div></td>`;
    return `<tr><th scope="row" style="font-weight:${strong ? 700 : 500}">${label}</th>` +
        `${cell(gouraud, "l")}${cell(phong, "r")}</tr>`;
}

function updateReadout(lightWorld) {
    const atVertices = gouraudAtVertices(lightWorld);
    const gouraudCentre = (atVertices[0] + atVertices[1] + atVertices[2]) / 3.0;   // weights 1/3 each
    const phongCentre = phongAt([1 / 3, 1 / 3, 1 / 3], lightWorld);

    // Brightest specular anywhere on the triangle. Gouraud blends linearly, so
    // its maximum is at a vertex.
    let phongMax = 0.0;
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
        for (let j = 0; j <= steps - i; j++) {
            const a = i / steps;
            const b = j / steps;
            phongMax = Math.max(phongMax, phongAt([a, b, 1.0 - a - b], lightWorld));
        }
    }
    const gouraudMax = Math.max(...atVertices);

    $("readout").innerHTML =
        vertexNames.map((name, i) =>
            tableRow(`At vertex ${name}`, atVertices[i], phongAt(i === 0 ? [1, 0, 0] : i === 1 ? [0, 1, 0] : [0, 0, 1], lightWorld))).join("") +
        tableRow("At the centre of the triangle", gouraudCentre, phongCentre, true) +
        tableRow("Brightest point on the triangle", gouraudMax, phongMax, true);

    $("verdict").textContent = (phongMax - gouraudMax > 0.1)
        ? `Phong finds a highlight of ${fmt(phongMax)} that Gouraud cannot show: the brightest vertex only reaches ${fmt(gouraudMax)}. ` +
          `The highlight falls between the vertices, where Gouraud only has the three vertex values to blend.`
        : (gouraudMax - phongMax > 0.1)
            ? `Phong's highlight is only ${fmt(phongMax)}, much dimmer than the ${fmt(gouraudMax)} at a vertex. ` +
              (renormalize ? "" : "The fragment shader is not renormalizing N, L and E, and the interpolated normal is shorter than 1, which flattens pow(N.H, shininess). ") +
              "Tick the renormalize box to restore it."
            : `Here the highlight is at, or close to, a vertex, so the two models agree (Gouraud ${fmt(gouraudMax)}, Phong ${fmt(phongMax)}). ` +
              "Move the light toward the middle of the triangle.";
}

function updateLabels() {
    const tags = document.querySelectorAll(".tag");
    tags.forEach((tag) => { tag.hidden = !showLabels; });
    if (!showLabels) return;

    document.querySelectorAll(".wrap").forEach((wrap) => {
        wrap.querySelectorAll(".tag").forEach((tag, i) => {
            const clip = mult(projectionMatrix, mult(modelViewMatrix, vec4(...triangleVertices[i], 1.0)));
            const push = 1.12;     // nudge outward so the label does not cover the vertex
            const x = clip[0] / clip[3] * push;
            const y = clip[1] / clip[3] * push;
            tag.style.left = `${(x * 0.5 + 0.5) * 100}%`;
            tag.style.top = `${(1.0 - (y * 0.5 + 0.5)) * 100}%`;
        });
    });
}

function setSlider(id, value, digits) {
    $(id).value = value;
    $(`${id}Out`).textContent = Number(value).toFixed(digits);
}

function syncControls(lightWorld) {
    ["A", "B", "C", "Centre"].forEach((name) => {
        $(`Button${name}`).setAttribute("aria-pressed", String(lightMode === name.toLowerCase() || lightMode === name));
    });
    $("Placement").value = placement;
    setSlider("Distance", lightDistance, 2);
    setSlider("Shininess", shininess, 0);
    setSlider("Curvature", curvature, 2);
    setSlider("LightX", lightWorld[0], 2);
    setSlider("LightY", lightWorld[1], 2);
    setSlider("LightZ", lightWorld[2], 2);
    $("Edges").checked = showEdges;
    $("Labels").checked = showLabels;
    $("Renormalize").checked = renormalize;
}

function goFree() {
    if (lightMode !== "free") {
        const light = currentLight();
        freeLight = vec3(light[0], light[1], light[2]);
        lightMode = "free";
    }
}

function changed() { needsRedraw = true; }

function attachControls() {
    $("ButtonA").onclick = () => { lightMode = "A"; changed(); };
    $("ButtonB").onclick = () => { lightMode = "B"; changed(); };
    $("ButtonC").onclick = () => { lightMode = "C"; changed(); };
    $("ButtonCentre").onclick = () => { lightMode = "centre"; changed(); };

    $("Placement").onchange = (e) => {
        placement = e.target.value;
        if (lightMode === "free") lightMode = "centre";
        changed();
    };
    $("Distance").oninput = (e) => {
        lightDistance = Number(e.target.value);
        if (lightMode === "free") lightMode = "centre";
        changed();
    };
    $("Shininess").oninput = (e) => { shininess = Number(e.target.value); changed(); };
    $("Curvature").oninput = (e) => { curvature = Number(e.target.value); changed(); };

    $("LightX").oninput = (e) => { goFree(); freeLight[0] = Number(e.target.value); changed(); };
    $("LightY").oninput = (e) => { goFree(); freeLight[1] = Number(e.target.value); changed(); };
    $("LightZ").oninput = (e) => { goFree(); freeLight[2] = Number(e.target.value); changed(); };

    $("Edges").onchange = (e) => { showEdges = e.target.checked; changed(); };
    $("Labels").onchange = (e) => { showLabels = e.target.checked; changed(); };

    // The right-hand canvas can run your perFragmentLighting.frag as it is, or a
    // copy that renormalizes N, L and E.
    $("Renormalize").onchange = (e) => {
        renormalize = e.target.checked;
        setLitProgram(panes[1], shaderSources.perFragmentVert,
            renormalize ? shaderSources.perFragmentNormalizedFrag : shaderSources.perFragmentFrag);
        changed();
    };

    // Dragging on either canvas moves the light in the plane at its current depth.
    for (const pane of panes) {
        let dragging = false;

        const move = (event) => {
            const rect = pane.canvas.getBoundingClientRect();
            const ndcX = ((event.clientX - rect.left) / rect.width) * 2.0 - 1.0;
            const ndcY = 1.0 - ((event.clientY - rect.top) / rect.height) * 2.0;
            goFree();
            const depth = eyeDistance - freeLight[2];       // camera to the light's plane
            const half = Math.tan(fovy * Math.PI / 360.0) * depth;
            freeLight[0] = Math.max(-3.0, Math.min(3.0, ndcX * half));
            freeLight[1] = Math.max(-3.0, Math.min(3.0, ndcY * half));
            changed();
        };

        pane.canvas.onpointerdown = (e) => { dragging = true; pane.canvas.setPointerCapture(e.pointerId); move(e); };
        pane.canvas.onpointermove = (e) => { if (dragging) move(e); };
        pane.canvas.onpointerup = () => { dragging = false; };
        pane.canvas.onpointercancel = () => { dragging = false; };
    }
}

function addLabels() {
    document.querySelectorAll(".wrap").forEach((wrap) => {
        vertexNames.forEach((name) => {
            const tag = document.createElement("span");
            tag.className = "tag";
            tag.textContent = name;
            wrap.append(tag);
        });
    });
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
        shaderSources = await loadShaderSources();

        panes = [
            // left: your per-vertex shaders (Gouraud)
            createPane("gl-canvas-gouraud", shaderSources.perVertexVert, shaderSources.colorPassthroughFrag),
            // right: your per-fragment shaders (Phong), with the renormalizing fragment shader
            createPane("gl-canvas-phong", shaderSources.perFragmentVert, shaderSources.perFragmentNormalizedFrag),
        ];

        addLabels();
        attachControls();
        render();
    } catch (error) {
        console.error(error);
        const box = $("fatal");
        box.hidden = false;
        box.textContent = `Could not start: ${error.message}`;
    }
}

function render() {
    if (needsRedraw) {
        const lightWorld = currentLight();
        panes.forEach((pane) => drawPane(pane, lightWorld));
        syncControls(lightWorld);
        updateLabels();
        updateReadout(lightWorld);
        needsRedraw = false;
    }

    requestAnimationFrame(render);
}

init();
