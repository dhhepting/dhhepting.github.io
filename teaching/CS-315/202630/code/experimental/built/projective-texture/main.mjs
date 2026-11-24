import { mult, translate, scalem, rotateX, rotateY, rotateZ, lookAt, perspective, ortho,
         radians, flatten, vec3 } from "../../../common/MV.mjs";
import { initShaders } from '../../../common/initShadersJS.mjs';xd
import { add3, sub3, mul3, cross3, norm3 } from "./vec.mjs";
import { TEX_SIZE, newTexCanvas, TEXTURE_MAKERS } from "./textures.mjs";
import { makeCube, makeSphere, makeTorus, makeFloor } from "./meshes.mjs";

import sceneVert from "./shaders/scene.vert?raw";
import sceneFrag from "./shaders/scene.frag?raw";
import flatVert from "./shaders/flat.vert?raw";
import flatFrag from "./shaders/flat.frag?raw";

// ---------------------------------------------------------------------------
// Projective texture mapping -- the enriched version
//
// A "slide projector" shines a texture onto the scene.  The projector is a
// camera: it has its own view matrix (lookAt) and projection matrix
// (perspective or orthographic).  For every vertex we compute
//
//     texture coordinate = Bias * P_light * V_light * M * position
//
// where Bias maps clip space [-1,1] to texture space [0,1].  The result is a
// homogeneous (s, t, depth, q) coordinate; textureProj() divides by q.
//
// Beyond the original example this version adds:
//   * a choice of procedurally generated textures (and your own image)
//   * colour: coloured light, coloured materials, four ways to blend the slide
//   * several objects and a floor to catch the projection
//   * shadows from a depth map rendered from the projector's point of view
//     (the depth map is itself a projective texture, using the same matrix)
//   * a visible projector frustum, orbit camera, and debug views
//
// Matrix helpers come from ./common/MV.mjs; shaders are separate .vert/.frag files.
// ---------------------------------------------------------------------------

const SHADOW_SIZE = 2048;                // size of the shadow (depth) map
const SCENE_CENTRE = [0.0, -0.3, 0.0];   // what the projector and camera look at
const FLOOR_Y = -1.3;

let canvas;
let gl;

let sceneProgram;                        // lit, textured, shadowed surfaces
let flatProgram;                         // flat colour: shadow pass, frustum, light marker
let sceneLoc = {};
let flatLoc = {};

let meshes = {};                         // cube, sphere, torus, floor
let lineVAO, lineBuffer;                 // frustum lines + light marker
const textures = [];                    // { name, canvas, button }
let projTexture;                         // texture unit 0: the slide
let shadowTexture, shadowFBO;            // texture unit 1: depth seen by the projector
let anisoExt = null;
let biasMatrix;                          // built in init (needs MV.js)

// cube rotation axis and angle (as in the original)
const xAxis = 0;
const yAxis = 1;
const zAxis = 2;
let axis = xAxis;
const theta = [-30, -45, 0];

let flag = false;                        // rotate objects
let lflag = true;                        // rotate light source
const deltaAngle = 0.5;

// orbit camera (drag to orbit, wheel to zoom)
const CAMERA_DEFAULTS = { yaw: 28, pitch: 26, dist: 10.5 };
const camera = Object.assign({}, CAMERA_DEFAULTS);

// every user-adjustable option lives here; the controls in the HTML are
// bound to these keys with their data-param attribute
const DEFAULTS = {
    texture: 0,
    blend: 0,              // 0 spotlight, 1 decal, 2 multiply, 3 additive
    strength: 1.0,
    tint: "#ffffff",
    filter: "mipmap",      // nearest, linear, mipmap
    wrap: 0,               // 0 none (border), 1 clamp, 2 repeat, 3 mirror
    circular: false,
    softness: 0.25,

    projection: "perspective",
    fov: 40,
    azimuth: 35,
    elevation: 48,
    distance: 5.5,
    roll: 0,
    spin: false,

    scene: "all",          // cube, sphere, torus, all
    floor: true,
    material: "pastel",
    ambient: 0.14,
    shadows: true,
    shadowSoftness: 1.5,

    showFrustum: true,
    showLight: true,
    debug: 0               // 0 normal, 1 texture coordinates, 2 shadow factor
};
const params = Object.assign({}, DEFAULTS);

// surface colours: [cube, sphere, torus, floor]
const MATERIALS = {
    pastel:    [[0.95, 0.78, 0.62], [0.65, 0.90, 0.80], [0.85, 0.70, 0.95], [0.62, 0.68, 0.78]],
    saturated: [[1.00, 0.55, 0.15], [0.10, 0.75, 0.70], [0.85, 0.20, 0.60], [0.35, 0.40, 0.55]],
    white:     [[0.90, 0.90, 0.90], [0.90, 0.90, 0.90], [0.90, 0.90, 0.90], [0.75, 0.75, 0.75]],
    black:     [[0.04, 0.04, 0.04], [0.04, 0.04, 0.04], [0.04, 0.04, 0.04], [0.06, 0.06, 0.06]]
};

function buildTextures() {
    for (const [name, draw] of TEXTURE_MAKERS) {
        const c = newTexCanvas();
        draw(c.getContext("2d"));
        addTexture(name, c);
    }
}

function addTexture(name, c) {
    const holder = document.getElementById("TextureChoices");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "thumb";
    button.title = name;
    button.setAttribute("aria-label", name);
    const t = document.createElement("canvas");
    t.width = 64;
    t.height = 64;
    t.getContext("2d").drawImage(c, 0, 0, 64, 64);
    button.appendChild(t);
    const index = textures.length;
    button.onclick = () => selectTexture(index);
    holder.appendChild(button);
    textures.push({ name, canvas: c, button });
}

function selectTexture(index) {
    params.texture = index;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, projTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);      // so the slide is upright for the projector
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textures[index].canvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    applyTextureState();
    textures.forEach((t, i) => t.button.classList.toggle("on", i === index));
    const label = document.getElementById("TextureName");
    if (label) label.textContent = textures[index].name;
}

// copy an uploaded image into a square texture (centre crop)
function loadUserImage(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
        const c = newTexCanvas();
        const side = Math.min(img.width, img.height);
        c.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side,
                                     0, 0, TEX_SIZE, TEX_SIZE);
        URL.revokeObjectURL(url);
        addTexture(file.name, c);
        selectTexture(textures.length - 1);
    };
    img.src = url;
}

// filtering and wrap modes live in the texture object
function applyTextureState() {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, projTexture);

    const filters = {
        nearest: [gl.NEAREST, gl.NEAREST],
        linear:  [gl.LINEAR, gl.LINEAR],
        mipmap:  [gl.LINEAR_MIPMAP_LINEAR, gl.LINEAR]
    };
    const [minFilter, magFilter] = filters[params.filter];
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    if (anisoExt) {
        gl.texParameterf(gl.TEXTURE_2D, anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, params.filter === "mipmap" ? 8 : 1);
    }

    const wrapMode = [gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.REPEAT, gl.MIRRORED_REPEAT][params.wrap];
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode);
}

function createMesh({ positions, normals }) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    for (const [location, data] of [[0, positions], [1, normals]]) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);
    return { vao, count: positions.length / 3 };
}

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------


function locate(program, names) {
    const out = {};
    for (const name of names) out[name] = gl.getUniformLocation(program, name);
    return out;
}

function init() {
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL 2.0 isn't available");
        return;
    }

    gl.enable(gl.DEPTH_TEST);
    anisoExt = gl.getExtension("EXT_texture_filter_anisotropic");

    biasMatrix = mult(translate(0.5, 0.5, 0.5), scalem(0.5, 0.5, 0.5));

    //
    //  Load shaders and look up their uniforms
    //
    sceneProgram = initShaders(gl, sceneVert, sceneFrag);
    flatProgram = initShaders(gl, flatVert, flatFrag);

    sceneLoc = locate(sceneProgram, [
        "uModelMatrix", "uViewMatrix", "uProjectionMatrix", "uTextureMatrix",
        "uProjectedTexture", "uShadowMap",
        "uLightPosition", "uLightDirection", "uDirectional", "uCameraPosition",
        "uAlbedo", "uSurface", "uLightTint", "uStrength", "uAmbient",
        "uBlend", "uWrap", "uCircular", "uSoftness",
        "uShadows", "uShadowTexel", "uDebug"
    ]);
    flatLoc = locate(flatProgram, ["uMVP", "uColour", "uPointSize", "uRound"]);

    gl.useProgram(sceneProgram);
    gl.uniform1i(sceneLoc.uProjectedTexture, 0);
    gl.uniform1i(sceneLoc.uShadowMap, 1);

    meshes = { cube: createMesh(makeCube()), sphere: createMesh(makeSphere()), torus: createMesh(makeTorus()), floor: createMesh(makeFloor()) };

    // 13 line segments (frustum + axis) followed by 1 point (the light)
    lineVAO = gl.createVertexArray();
    gl.bindVertexArray(lineVAO);
    lineBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 27 * 3 * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // the slide
    projTexture = gl.createTexture();
    buildTextures();
    selectTexture(params.texture);

    // the shadow map: a depth-only render from the projector
    shadowTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, shadowTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SHADOW_SIZE, SHADOW_SIZE, 0,
                  gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    shadowFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowTexture, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.error("shadow framebuffer is incomplete");
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    wireControls();
    render();
}

// ---------------------------------------------------------------------------
// user interface
// ---------------------------------------------------------------------------

function readControl(el) {
    if (el.type === "checkbox") return el.checked;
    if (el.type === "range" || el.dataset.number !== undefined) return Number(el.value);
    return el.value;
}

function writeControl(el, value) {
    if (el.type === "checkbox") el.checked = value;
    else el.value = value;
    const out = el.closest("label") && el.closest("label").querySelector("output");
    if (out) {
        const digits = el.dataset.digits !== undefined ? Number(el.dataset.digits) : 0;
        out.textContent = Number(value).toFixed(digits) + (el.dataset.unit || "");
    }
}

function syncControls() {
    for (const el of document.querySelectorAll("[data-param]")) {
        writeControl(el, params[el.dataset.param]);
    }
    for (const [id, on] of [["ButtonX", axis === xAxis], ["ButtonY", axis === yAxis], ["ButtonZ", axis === zAxis],
                            ["ButtonT", flag], ["ButtonL", lflag]]) {
        const b = document.getElementById(id);
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", String(on));
    }
}

function wireControls() {
    for (const el of document.querySelectorAll("[data-param]")) {
        el.addEventListener("input", () => {
            const key = el.dataset.param;
            params[key] = readControl(el);
            writeControl(el, params[key]);
            if (key === "filter" || key === "wrap") applyTextureState();
        });
    }

    // cube and light rotation: the original buttons
    document.getElementById("ButtonX").onclick = function () { axis = xAxis; syncControls(); };
    document.getElementById("ButtonY").onclick = function () { axis = yAxis; syncControls(); };
    document.getElementById("ButtonZ").onclick = function () { axis = zAxis; syncControls(); };
    document.getElementById("ButtonT").onclick = function () { flag = !flag; syncControls(); };
    document.getElementById("ButtonL").onclick = function () { lflag = !lflag; syncControls(); };

    document.getElementById("ButtonReset").onclick = function () {
        Object.assign(params, DEFAULTS);
        Object.assign(camera, CAMERA_DEFAULTS);
        theta[0] = -30; theta[1] = -45; theta[2] = 0;
        axis = xAxis; flag = false; lflag = true;
        syncControls();
        selectTexture(params.texture);
    };

    const file = document.getElementById("TextureFile");
    document.getElementById("ButtonUpload").onclick = () => file.click();
    file.onchange = () => { if (file.files[0]) loadUserImage(file.files[0]); file.value = ""; };

    // orbit camera
    let dragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener("pointerdown", (e) => {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add("dragging");
    });
    canvas.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        camera.yaw -= (e.clientX - lastX) * 0.4;
        camera.pitch = Math.min(85, Math.max(-5, camera.pitch + (e.clientY - lastY) * 0.4));
        lastX = e.clientX; lastY = e.clientY;
    });
    const stop = () => { dragging = false; canvas.classList.remove("dragging"); };
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        camera.dist = Math.min(16, Math.max(3.5, camera.dist * Math.exp(e.deltaY * 0.001)));
    }, { passive: false });

    syncControls();
}

// ---------------------------------------------------------------------------
// the projector, the scene and the two render passes
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// view and projection matrices for the light, plus the matrix that
// takes a world-space point to (s, t, depth, q) texture coordinates
function computeLight() {
    const az = radians(params.azimuth);
    const el = radians(params.elevation);
    const d = params.distance;
    const pos = [SCENE_CENTRE[0] + d * Math.cos(el) * Math.cos(az),
                 SCENE_CENTRE[1] + d * Math.sin(el),
                 SCENE_CENTRE[2] + d * Math.cos(el) * Math.sin(az)];

    const fwd = norm3(sub3(SCENE_CENTRE, pos));
    const right0 = norm3(cross3(fwd, [0, 1, 0]));
    const up0 = cross3(right0, fwd);
    const r = radians(params.roll);                       // roll = turn the slide in the projector
    const up = add3(mul3(up0, Math.cos(r)), mul3(right0, Math.sin(r)));
    const right = norm3(cross3(fwd, up));

    const near = 0.5;
    const far = d + 8.0;
    const perspectiveLight = params.projection === "perspective";
    const half = Math.tan(radians(params.fov / 2));
    const proj = perspectiveLight
        ? perspective(params.fov, 1.0, near, far)
        : ortho(-d * half, d * half, -d * half, d * half, near, far);

    const view = lookAt(vec3(...pos), vec3(...SCENE_CENTRE), vec3(...up));
    const textureMatrix = mult(biasMatrix, mult(proj, view));      // still to be multiplied by the model matrix

    return { pos, fwd, right, up, half, near, far, perspectiveLight, view, proj, textureMatrix };
}

function sceneObjects() {
    const R = mult(rotateX(theta[xAxis]), mult(rotateY(theta[yAxis]), rotateZ(theta[zAxis])));
    const colours = MATERIALS[params.material];
    const place = (x, y, z, s) => mult(translate(x, y, z), mult(R, scalem(s, s, s)));

    const objects = [];
    if (params.floor) {
        objects.push({ mesh: meshes.floor, albedo: colours[3], surface: 1,
                       model: mult(translate(0, FLOOR_Y, 0), scalem(6, 1, 6)) });
    }
    if (params.scene === "cube")   objects.push({ mesh: meshes.cube,   albedo: colours[0], surface: 0, model: place(0, 0, 0, 1.5) });
    if (params.scene === "sphere") objects.push({ mesh: meshes.sphere, albedo: colours[1], surface: 0, model: place(0, 0, 0, 1.6) });
    if (params.scene === "torus")  objects.push({ mesh: meshes.torus,  albedo: colours[2], surface: 0, model: place(0, 0, 0, 1.8) });
    if (params.scene === "all") {
        objects.push({ mesh: meshes.cube,   albedo: colours[0], surface: 0, model: place(-1.3, -0.35, 0.4, 1.0) });
        objects.push({ mesh: meshes.sphere, albedo: colours[1], surface: 0, model: place( 1.3, -0.25, 0.3, 1.3) });
        objects.push({ mesh: meshes.torus,  albedo: colours[2], surface: 0, model: place( 0.0, -0.20, -1.5, 1.5) });
    }
    return objects;
}

function animate() {
    // if flag true increase cube rotation
    if (flag) theta[axis] += 0.5;

    if (lflag) {
        params.azimuth = (params.azimuth + deltaAngle) % 360;
        writeControl(document.querySelector('[data-param="azimuth"]'), params.azimuth);
    }
    if (params.spin) {
        params.roll += 0.6;
        if (params.roll > 180) params.roll -= 360;
        writeControl(document.querySelector('[data-param="roll"]'), params.roll);
    }
}

function shadowPass(light, objects) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFBO);
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.useProgram(flatProgram);
    gl.colorMask(false, false, false, false);
    gl.enable(gl.POLYGON_OFFSET_FILL);                  // push depth away to avoid shadow acne
    gl.polygonOffset(2.0, 4.0);

    const lightVP = mult(light.proj, light.view);
    for (const o of objects) {
        if (o.surface === 1) continue;                  // the floor does not cast shadows
        gl.uniformMatrix4fv(flatLoc.uMVP, false, flatten(mult(lightVP, o.model)));
        gl.bindVertexArray(o.mesh.vao);
        gl.drawArrays(gl.TRIANGLES, 0, o.mesh.count);
    }

    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.colorMask(true, true, true, true);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function cameraMatrices() {
    const yaw = radians(camera.yaw);
    const pitch = radians(camera.pitch);
    const eye = [SCENE_CENTRE[0] + camera.dist * Math.cos(pitch) * Math.sin(yaw),
                 SCENE_CENTRE[1] + camera.dist * Math.sin(pitch),
                 SCENE_CENTRE[2] + camera.dist * Math.cos(pitch) * Math.cos(yaw)];
    const view = lookAt(vec3(...eye), vec3(...SCENE_CENTRE), vec3(0, 1, 0));
    const proj = perspective(40, canvas.width / canvas.height, 0.1, 60);
    return { eye, view, proj };
}

function scenePass(light, objects, cam) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.07, 0.08, 0.11, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(sceneProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, projTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, shadowTexture);

    gl.uniformMatrix4fv(sceneLoc.uViewMatrix, false, flatten(cam.view));
    gl.uniformMatrix4fv(sceneLoc.uProjectionMatrix, false, flatten(cam.proj));
    gl.uniform3fv(sceneLoc.uCameraPosition, cam.eye);

    gl.uniform3fv(sceneLoc.uLightPosition, light.pos);
    gl.uniform3fv(sceneLoc.uLightDirection, mul3(light.fwd, -1));
    gl.uniform1i(sceneLoc.uDirectional, light.perspectiveLight ? 0 : 1);
    gl.uniform3fv(sceneLoc.uLightTint, hexToRgb(params.tint));
    gl.uniform1f(sceneLoc.uStrength, params.strength);
    gl.uniform1f(sceneLoc.uAmbient, params.ambient);
    gl.uniform1i(sceneLoc.uBlend, params.blend);
    gl.uniform1i(sceneLoc.uWrap, params.wrap);
    gl.uniform1i(sceneLoc.uCircular, params.circular ? 1 : 0);
    gl.uniform1f(sceneLoc.uSoftness, params.softness);
    gl.uniform1i(sceneLoc.uShadows, params.shadows ? 1 : 0);
    gl.uniform1f(sceneLoc.uShadowTexel, params.shadowSoftness / SHADOW_SIZE);
    gl.uniform1i(sceneLoc.uDebug, params.debug);

    for (const o of objects) {
        gl.uniformMatrix4fv(sceneLoc.uModelMatrix, false, flatten(o.model));
        gl.uniformMatrix4fv(sceneLoc.uTextureMatrix, false, flatten(mult(light.textureMatrix, o.model)));
        gl.uniform3fv(sceneLoc.uAlbedo, o.albedo);
        gl.uniform1i(sceneLoc.uSurface, o.surface);
        gl.bindVertexArray(o.mesh.vao);
        gl.drawArrays(gl.TRIANGLES, 0, o.mesh.count);
    }
    gl.bindVertexArray(null);
}

// the projector's frustum and a dot where the light is
function drawLightGizmos(light, cam) {
    const corners = (z) => {
        const h = light.perspectiveLight ? z * light.half : params.distance * light.half;
        const c = add3(light.pos, mul3(light.fwd, z));
        const r = mul3(light.right, h), u = mul3(light.up, h);
        return [sub3(sub3(c, r), u), sub3(add3(c, r), u), add3(add3(c, r), u), add3(sub3(c, r), u)];
    };
    const zNear = light.near + 0.1;
    const zFar = params.distance + 1.5;
    const n = corners(zNear), f = corners(zFar);

    const verts = [];
    for (let k = 0; k < 4; k++) verts.push(...n[k], ...n[(k + 1) % 4]);   // near rectangle
    for (let k = 0; k < 4; k++) verts.push(...f[k], ...f[(k + 1) % 4]);   // far rectangle
    for (let k = 0; k < 4; k++) verts.push(...n[k], ...f[k]);             // edges
    verts.push(...light.pos, ...SCENE_CENTRE);                            // optical axis
    verts.push(...light.pos);                                             // the light itself

    gl.useProgram(flatProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(verts));
    gl.uniformMatrix4fv(flatLoc.uMVP, false, flatten(mult(cam.proj, cam.view)));
    gl.bindVertexArray(lineVAO);

    const tint = hexToRgb(params.tint);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (params.showFrustum) {
        gl.uniform1i(flatLoc.uRound, 0);
        gl.uniform1f(flatLoc.uPointSize, 1.0);
        gl.uniform4f(flatLoc.uColour, 1.0, 0.85, 0.3, 0.85);
        gl.drawArrays(gl.LINES, 0, 26);
    }
    if (params.showLight) {
        gl.uniform1i(flatLoc.uRound, 1);
        gl.uniform1f(flatLoc.uPointSize, 16.0);
        gl.uniform4f(flatLoc.uColour, 0.4 + 0.6 * tint[0], 0.4 + 0.6 * tint[1], 0.4 + 0.6 * tint[2], 1.0);
        gl.drawArrays(gl.POINTS, 26, 1);
    }
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
}

function render() {
    animate();

    const light = computeLight();
    const objects = sceneObjects();
    const cam = cameraMatrices();

    if (params.shadows) shadowPass(light, objects);
    scenePass(light, objects, cam);
    drawLightGizmos(light, cam);

    requestAnimationFrame(render);
}

init();
