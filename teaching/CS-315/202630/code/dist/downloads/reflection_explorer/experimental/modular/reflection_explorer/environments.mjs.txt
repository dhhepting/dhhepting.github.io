// Procedural cube-map environments, and the cube-map face conventions they depend on.
// Nothing here touches the DOM or WebGL, so it can be tested without a browser.
//
// Faces are numbered like TEXTURE_CUBE_MAP_POSITIVE_X + i:
//   0 +X, 1 -X, 2 +Y, 3 -Y, 4 +Z, 5 -Z.
// A direction picks a face and a position (s, t) on it by the OpenGL ES 3.0
// table (spec section 3.8.x, "Cube map texture selection"):
//
//   major axis   sc    tc    ma          s = (sc/|ma| + 1)/2,  t = (tc/|ma| + 1)/2
//   +x           -rz   -ry   rx          t = 0 is the FIRST row of the uploaded image
//   -x           +rz   -ry   rx
//   +y           +rx   +rz   ry
//   -y           +rx   -rz   ry
//   +z           +rx   -ry   rz
//   -z           -rx   -ry   rz

export const FACE_NAMES = ["+X", "-X", "+Y", "-Y", "+Z", "-Z"];

// the six colours of the textbook samples (reflectionMap.js, reflectingCube.js, ...)
export const FACE_COLOURS = [
    [1, 0, 0],      // +X red
    [0, 1, 0],      // -X green
    [0, 0, 1],      // +Y blue
    [0, 1, 1],      // -Y cyan
    [1, 1, 0],      // +Z yellow
    [1, 0, 1],      // -Z magenta
];

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
const mix3 = (a, b, t) => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])];
const scale3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoothstep = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

/** Which face a direction hits, and where on it: { face, s, t } with s, t in [0, 1]. */
export function directionToFace(d) {
    const [x, y, z] = d;
    const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
    let face, sc, tc, ma;
    if (ax >= ay && ax >= az) {
        ma = ax;
        if (x > 0) { face = 0; sc = -z; tc = -y; } else { face = 1; sc = z; tc = -y; }
    } else if (ay >= az) {
        ma = ay;
        if (y > 0) { face = 2; sc = x; tc = z; } else { face = 3; sc = x; tc = -z; }
    } else {
        ma = az;
        if (z > 0) { face = 4; sc = x; tc = -y; } else { face = 5; sc = -x; tc = -y; }
    }
    return { face, s: 0.5 * (sc / ma + 1), t: 0.5 * (tc / ma + 1) };
}

/** The inverse: the (unnormalized) direction through position (s, t) of a face. */
export function faceDirection(face, s, t) {
    const sc = 2 * s - 1;
    const tc = 2 * t - 1;
    switch (face) {
        case 0: return [1, -tc, -sc];
        case 1: return [-1, -tc, sc];
        case 2: return [sc, 1, tc];
        case 3: return [sc, -1, -tc];
        case 4: return [sc, -tc, 1];
        default: return [-sc, -tc, -1];
    }
}

// The view of each face from INSIDE the cube: forward, up, and right = forward x up.
// (Images stored in a cube map look mirrored from inside a right-handed world, so
// painted environments are drawn in this view and resampled into texel order.)
const FORWARD = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const UP = [[0, 1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [0, 1, 0], [0, 1, 0]];

export function faceBasis(face) {
    return { forward: FORWARD[face], up: UP[face], right: cross(FORWARD[face], UP[face]) };
}

/** Where a direction falls on a face as seen from inside: (x, y) in [-1, 1], x to the right, y up. */
export function directionToView(face, d) {
    const { forward, up, right } = faceBasis(face);
    const k = dot(d, forward);
    return { x: dot(d, right) / k, y: dot(d, up) / k };
}

/** Rendering a face into a framebuffer: the direction to look and the up vector (lookAt, 90 degree fov). */
export const FACE_RENDER_VIEWS = [
    { direction: [1, 0, 0], up: [0, -1, 0] },
    { direction: [-1, 0, 0], up: [0, -1, 0] },
    { direction: [0, 1, 0], up: [0, 0, 1] },
    { direction: [0, -1, 0], up: [0, 0, -1] },
    { direction: [0, 0, 1], up: [0, -1, 0] },
    { direction: [0, 0, -1], up: [0, -1, 0] },
];

// ---------------------------------------------------------------- environments
//
// color(d): the colour seen in direction d (unit vector, +y up), as [r, g, b] in 0..1.
// paint(ctx, face, n): for painted environments, draws the face as seen from inside.

const sunDirection = norm([0.55, 0.42, -0.72]);

function skyColor(d) {
    const e = d[1];
    let c;
    if (e >= 0) c = mix3([0.80, 0.88, 0.97], [0.15, 0.38, 0.85], Math.pow(e, 0.5));
    else c = mix3([0.55, 0.52, 0.46], [0.22, 0.20, 0.18], Math.min(1, -e * 3));
    const cosSun = dot(d, sunDirection);
    const glow = Math.pow(Math.max(cosSun, 0), 40) * 0.35 + Math.pow(Math.max(cosSun, 0), 6) * 0.08;
    c = add3(c, scale3([1.0, 0.9, 0.7], glow));
    return mix3(c, [1.0, 0.97, 0.85], smoothstep(Math.cos(3.5 * Math.PI / 180), Math.cos(2.0 * Math.PI / 180), cosSun));
}

function studioColor(d) {
    const [x, y, z] = d;
    let c = y < 0 ? mix3([0.10, 0.10, 0.11], [0.04, 0.04, 0.05], Math.min(1, -y * 2)) : [0.05, 0.05, 0.06];
    if (y > 0.72 && Math.abs(x) < 0.5 && Math.abs(z) < 0.5) c = [1.0, 1.0, 1.0];                         // big overhead softbox
    if (x < -0.62 && Math.abs(y) < 0.5 && Math.abs(z) < 0.22) c = [1.0, 0.86, 0.68];                      // warm strip on the left
    if (x > 0.62 && Math.abs(y) < 0.5 && Math.abs(z) < 0.22) c = [0.70, 0.86, 1.0];                       // cool strip on the right
    if (z < -0.7 && Math.abs(x) < 0.12 && y > -0.3 && y < 0.6) c = [1.0, 1.0, 1.0];                       // rim light behind
    return c;
}

// A room around the viewer: x in [-3, 3], y in [-1.2, 2.2], z in [-3, 3].
function roomColor(d) {
    const planes = [
        [d[0] > 0 ? 3 / d[0] : -3 / d[0], "x"],
        [d[1] > 0 ? 2.2 / d[1] : -1.2 / d[1], "y"],
        [d[2] > 0 ? 3 / d[2] : -3 / d[2], "z"],
    ].filter(([t]) => Number.isFinite(t) && t > 0);
    const [t, axis] = planes.reduce((best, p) => (p[0] < best[0] ? p : best));
    const p = scale3(d, t);

    if (axis === "y" && d[1] < 0) {                                                                       // floor: checkerboard
        const tile = (Math.floor(p[0]) + Math.floor(p[2])) & 1;
        return tile ? [0.86, 0.86, 0.80] : [0.10, 0.10, 0.12];
    }
    if (axis === "y") return (Math.abs(p[0]) < 1.2 && Math.abs(p[2]) < 1.2) ? [1.0, 1.0, 0.94] : [0.80, 0.80, 0.78];   // ceiling with a light panel
    if (axis === "x") return d[0] > 0 ? [0.72, 0.30, 0.28] : [0.30, 0.56, 0.36];                         // red and green walls
    if (d[2] > 0) {                                                                                       // the wall with a window
        const inWindow = Math.abs(p[0]) < 1.3 && p[1] > 0.1 && p[1] < 1.8;
        if (inWindow) {
            const bar = Math.abs(p[0]) < 0.05 || Math.abs(p[1] - 0.95) < 0.05;
            return bar ? [0.25, 0.22, 0.2] : [0.72, 0.88, 1.0];
        }
        return [0.84, 0.74, 0.58];
    }
    return [0.56, 0.62, 0.72];
}

function checkerColor(d) {
    const { face, s, t } = directionToFace(d);
    const cell = (Math.floor(s * 8) + Math.floor(t * 8)) & 1;
    return scale3(FACE_COLOURS[face], cell ? 1.0 : 0.3);
}

function paintOrientation(ctx, face, n) {
    const base = FACE_COLOURS[face].map((c) => c * 0.5);
    ctx.fillStyle = `rgb(${base.map((c) => Math.round(255 * c)).join(",")})`;
    ctx.fillRect(0, 0, n, n);

    ctx.strokeStyle = "rgba(255,255,255,0.35)";                                                          // a grid of eighths
    ctx.lineWidth = Math.max(1, n / 128);
    for (let k = 1; k < 8; k++) {
        ctx.beginPath(); ctx.moveTo(k * n / 8, 0); ctx.lineTo(k * n / 8, n); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, k * n / 8); ctx.lineTo(n, k * n / 8); ctx.stroke();
    }
    ctx.strokeStyle = "#fff";                                                                             // the face border
    ctx.lineWidth = Math.max(2, n / 40);
    ctx.strokeRect(0, 0, n, n);

    ctx.fillStyle = "#fff";                                                                               // the face name, upright and unmirrored as seen from inside
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.round(n * 0.34)}px sans-serif`;
    ctx.fillText(FACE_NAMES[face], n / 2, n / 2);

    ctx.beginPath();                                                                                      // an arrow marking "up" in this view
    ctx.moveTo(n / 2, n * 0.06); ctx.lineTo(n * 0.42, n * 0.18); ctx.lineTo(n * 0.58, n * 0.18); ctx.closePath();
    ctx.fill();
}

export const ENVIRONMENTS = {
    sixColours: {
        label: "Six colours (the textbook samples)",
        fixedSize: 1,
        color: (d) => FACE_COLOURS[directionToFace(d).face],
    },
    orientation: { label: "Orientation test (labelled faces)", paint: paintOrientation },
    sky: { label: "Sky and sun", color: skyColor },
    studio: { label: "Studio softboxes", color: studioColor },
    room: { label: "Room with a window", color: roomColor },
    checker: { label: "Checker box", color: checkerColor },
};

export const environmentSize = (id, requested) => ENVIRONMENTS[id].fixedSize ?? requested;

/**
 * The six faces of an environment as RGBA bytes, in the texel order OpenGL expects
 * (row 0 is t = 0). tools.createCanvas(n) is needed for painted environments only.
 */
export function generateFaces(id, n, tools = {}) {
    const env = ENVIRONMENTS[id];
    const size = environmentSize(id, n);
    const faces = [];

    for (let face = 0; face < 6; face++) {
        const pixels = new Uint8Array(size * size * 4);
        let painted = null;
        if (env.paint) {
            const surface = tools.createCanvas(size);
            const ctx = surface.getContext("2d");
            env.paint(ctx, face, size);
            painted = ctx.getImageData(0, 0, size, size).data;
        }

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const d = faceDirection(face, (col + 0.5) / size, (row + 0.5) / size);
                const k = 4 * (row * size + col);
                if (painted) {
                    const { x, y } = directionToView(face, d);
                    const px = Math.min(size - 1, Math.max(0, Math.floor((x + 1) / 2 * size)));
                    const py = Math.min(size - 1, Math.max(0, Math.floor((1 - y) / 2 * size)));
                    const q = 4 * (py * size + px);
                    pixels[k] = painted[q]; pixels[k + 1] = painted[q + 1]; pixels[k + 2] = painted[q + 2];
                } else {
                    const c = env.color(norm(d));
                    pixels[k] = Math.round(255 * clamp01(c[0]));
                    pixels[k + 1] = Math.round(255 * clamp01(c[1]));
                    pixels[k + 2] = Math.round(255 * clamp01(c[2]));
                }
                pixels[k + 3] = 255;
            }
        }
        faces.push(pixels);
    }
    return { faces, size };
}

/** CPU lookup with NEAREST filtering, as the GPU does it. */
export function sampleFaces(faces, size, d) {
    const { face, s, t } = directionToFace(d);
    const col = Math.min(size - 1, Math.floor(s * size));
    const row = Math.min(size - 1, Math.floor(t * size));
    const k = 4 * (row * size + col);
    return [faces[face][k], faces[face][k + 1], faces[face][k + 2]];
}

/**
 * A face as seen from inside (n x n RGBA, x to the right, y up on screen), for the
 * unfolded preview. Resamples the stored texels through the face basis.
 */
export function viewImage(faces, size, face, n) {
    const out = new Uint8Array(n * n * 4);
    const { forward, up, right } = faceBasis(face);
    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            const x = 2 * (col + 0.5) / n - 1;
            const y = 1 - 2 * (row + 0.5) / n;
            const d = [0, 1, 2].map((i) => forward[i] + x * right[i] + y * up[i]);
            const c = sampleFaces(faces, size, d);
            const k = 4 * (row * n + col);
            out[k] = c[0]; out[k + 1] = c[1]; out[k + 2] = c[2]; out[k + 3] = 255;
        }
    }
    return out;
}
