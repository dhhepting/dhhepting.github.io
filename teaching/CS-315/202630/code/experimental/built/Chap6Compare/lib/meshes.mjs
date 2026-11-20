// Mesh generators (typed arrays, non-indexed triangles). No DOM, no GL.
//
// normalMode 'true'   -> each triangle carries its own face normal
//                        (flat normals, constant across the triangle);
// normalMode 'vertex' -> each vertex carries the normal of the surface it
//                        approximates (for the unit sphere: its own position),
//                        which interpolates to a smooth-looking surface.

// Same tetrahedron the textbook starts from.
const TETRA = [
    [0.0, 0.0, -1.0],
    [0.0, 0.942809, 0.333333],
    [-0.816497, -0.471405, 0.333333],
    [0.816497, -0.471405, 0.333333],
];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (v) => {
    const len = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / len, v[1] / len, v[2] / len];
};
const midpointOnSphere = (a, b) => normalize([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);

export const MAX_SUBDIVISIONS = 8;

/** Recursively subdivided tetrahedron projected onto the unit sphere. */
export function buildSphere(levels, normalMode) {
    const triangleCount = 4 * 4 ** levels;
    const positions = new Float32Array(triangleCount * 9);
    const normals = new Float32Array(triangleCount * 9);
    let at = 0;

    const emit = (a, b, c) => {
        let faceNormal = null;
        if (normalMode === 'true') {
            faceNormal = normalize(cross(sub(c, a), sub(b, a)));
            // Make the face normal point away from the sphere's centre
            // whatever the winding of this particular triangle is.
            if (dot(faceNormal, [a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]]) < 0) {
                faceNormal = faceNormal.map((x) => -x);
            }
        }
        for (const p of [a, b, c]) {
            const n = faceNormal ?? p;
            positions[at] = p[0]; positions[at + 1] = p[1]; positions[at + 2] = p[2];
            normals[at] = n[0]; normals[at + 1] = n[1]; normals[at + 2] = n[2];
            at += 3;
        }
    };

    const divide = (a, b, c, count) => {
        if (count > 0) {
            const ab = midpointOnSphere(a, b);
            const ac = midpointOnSphere(a, c);
            const bc = midpointOnSphere(b, c);
            divide(a, ab, ac, count - 1);
            divide(ab, b, bc, count - 1);
            divide(bc, c, ac, count - 1);
            divide(ab, bc, ac, count - 1);
        } else {
            emit(a, b, c);
        }
    };

    const [a, b, c, d] = TETRA;
    divide(a, b, c, levels);
    divide(d, c, b, levels);
    divide(a, d, b, levels);
    divide(a, c, d, levels);

    return { name: 'sphere', positions, normals, vertexCount: triangleCount * 3, triangleCount };
}

/** Axis-aligned cube, 12 triangles, flat face normals. */
export function buildCube(halfSize = 0.5) {
    const faces = [
        { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
        { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
        { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] },
        { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
        { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
        { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] },
    ];
    const positions = new Float32Array(6 * 6 * 3);
    const normals = new Float32Array(6 * 6 * 3);
    let at = 0;
    for (const { n, u, v } of faces) {
        const corner = (su, sv) => [0, 1, 2].map((k) => halfSize * (n[k] + su * u[k] + sv * v[k]));
        const quad = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
        for (const i of [0, 1, 2, 0, 2, 3]) {
            const p = quad[i];
            positions[at] = p[0]; positions[at + 1] = p[1]; positions[at + 2] = p[2];
            normals[at] = n[0]; normals[at + 1] = n[1]; normals[at + 2] = n[2];
            at += 3;
        }
    }
    return { name: 'cube', positions, normals, vertexCount: 36, triangleCount: 12 };
}
