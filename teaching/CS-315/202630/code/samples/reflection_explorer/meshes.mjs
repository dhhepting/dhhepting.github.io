// Mesh generators: non-indexed triangles, positions and unit normals as vec3.
// No DOM, no GL.

export const MAX_SUBDIVISIONS = 6;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
const midpointOnSphere = (a, b) => normalize([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);

function pack(triangles) {
    // triangles: array of [[p, n], [p, n], [p, n]]
    const positions = new Float32Array(triangles.length * 9);
    const normals = new Float32Array(triangles.length * 9);
    triangles.forEach((original, t) => {
        // wind every triangle so that its geometric normal agrees with its shading normals (the outward side)
        const g = cross(sub(original[1][0], original[0][0]), sub(original[2][0], original[0][0]));
        const n = original.reduce((s, [, q]) => [s[0] + q[0], s[1] + q[1], s[2] + q[2]], [0, 0, 0]);
        const triangle = (g[0] * n[0] + g[1] * n[1] + g[2] * n[2] < 0) ? [original[0], original[2], original[1]] : original;
        triangle.forEach(([p, n], k) => {
            positions.set(p, t * 9 + k * 3);
            normals.set(n, t * 9 + k * 3);
        });
    });
    return { positions, normals, vertexCount: triangles.length * 3, triangleCount: triangles.length };
}

/** Axis-aligned cube, 12 triangles, flat outward normals (reflectingCube.js, reflectionMap.js). */
export function buildCube(h = 0.7) {
    const faces = [
        { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
        { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
        { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] },
        { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
        { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
        { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] },
    ];
    const triangles = [];
    for (const { n, u, v } of faces) {
        const corner = (su, sv) => [0, 1, 2].map((k) => h * (n[k] + su * u[k] + sv * v[k]));
        const quad = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
        for (const [a, b, c] of [[0, 1, 2], [0, 2, 3]]) triangles.push([quad[a], quad[b], quad[c]].map((p) => [p, n]));
    }
    return { name: "cube", ...pack(triangles) };
}

// The tetrahedron the textbook starts from.
const TETRA = [[0, 0, -1], [0, 0.942809, 0.333333], [-0.816497, -0.471405, 0.333333], [0.816497, -0.471405, 0.333333]];

/** Recursively subdivided tetrahedron projected onto the unit sphere; each vertex's normal is its position. */
export function buildSphere(levels) {
    const triangles = [];
    const divide = (a, b, c, count) => {
        if (count > 0) {
            const ab = midpointOnSphere(a, b), ac = midpointOnSphere(a, c), bc = midpointOnSphere(b, c);
            divide(a, ab, ac, count - 1); divide(ab, b, bc, count - 1); divide(bc, c, ac, count - 1); divide(ab, bc, ac, count - 1);
        } else {
            triangles.push([a, b, c].map((p) => [p, p]));
        }
    };
    const [a, b, c, d] = TETRA;
    divide(a, b, c, levels); divide(d, c, b, levels); divide(a, d, b, levels); divide(a, c, d, levels);
    return { name: "sphere", ...pack(triangles) };
}

/** A torus around the y axis: ring radius R, tube radius r, smooth normals. */
export function buildTorus(R = 0.68, r = 0.32, ringSegments = 56, tubeSegments = 28) {
    const point = (i, j) => {
        const phi = 2 * Math.PI * (i % ringSegments) / ringSegments;
        const theta = 2 * Math.PI * (j % tubeSegments) / tubeSegments;
        const n = [Math.cos(theta) * Math.cos(phi), Math.sin(theta), Math.cos(theta) * Math.sin(phi)];
        return [[(R + r * Math.cos(theta)) * Math.cos(phi), r * Math.sin(theta), (R + r * Math.cos(theta)) * Math.sin(phi)], n];
    };
    const triangles = [];
    for (let i = 0; i < ringSegments; i++) {
        for (let j = 0; j < tubeSegments; j++) {
            const a = point(i, j), b = point(i + 1, j), c = point(i + 1, j + 1), d = point(i, j + 1);
            triangles.push([a, b, c], [a, c, d]);
        }
    }
    return { name: "torus", ...pack(triangles) };
}

/** A flat square mirror in the xy plane, facing +z. */
export function buildPlane(h = 1.0) {
    const n = [0, 0, 1];
    const [a, b, c, d] = [[-h, -h, 0], [h, -h, 0], [h, h, 0], [-h, h, 0]];
    return { name: "plane", ...pack([[a, b, c], [a, c, d]].map((t) => t.map((p) => [p, n]))) };
}

export function buildMesh(shape, subdivisions) {
    if (shape === "cube") return buildCube();
    if (shape === "torus") return buildTorus();
    if (shape === "plane") return buildPlane();
    return buildSphere(subdivisions);
}
