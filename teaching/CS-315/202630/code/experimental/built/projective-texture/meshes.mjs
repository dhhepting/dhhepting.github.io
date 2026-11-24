"use strict";

import { add3, sub3, norm3, cross3 } from "./vec.mjs";

// Each generator returns triangle lists: { positions, normals } (flat arrays of xyz)

// a rectangle centred at c, spanned by half-edges u and v (normal = u x v)
function pushQuad(pos, nor, c, u, v) {
    const n = norm3(cross3(u, v));
    const p0 = sub3(sub3(c, u), v);
    const p1 = sub3(add3(c, u), v);
    const p2 = add3(add3(c, u), v);
    const p3 = add3(sub3(c, u), v);
    for (const p of [p0, p1, p2, p0, p2, p3]) {
        pos.push(...p);
        nor.push(...n);
    }
}

export function makeCube() {
    const pos = [], nor = [];
    const h = 0.5;
    const faces = [
        [[ h, 0, 0], [0, h, 0], [0, 0, h]],
        [[-h, 0, 0], [0, 0, h], [0, h, 0]],
        [[0,  h, 0], [0, 0, h], [h, 0, 0]],
        [[0, -h, 0], [h, 0, 0], [0, 0, h]],
        [[0, 0,  h], [h, 0, 0], [0, h, 0]],
        [[0, 0, -h], [0, h, 0], [h, 0, 0]]
    ];
    for (const [c, u, v] of faces) pushQuad(pos, nor, c, u, v);
    return { positions: pos, normals: nor };
}

export function makeSphere(stacks = 32, slices = 64, radius = 0.5) {
    const pos = [], nor = [];
    const point = (i, j) => {
        const phi = Math.PI * i / stacks;
        const th = 2 * Math.PI * j / slices;
        return [Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)];
    };
    for (let i = 0; i < stacks; i++) {
        for (let j = 0; j < slices; j++) {
            const a = point(i, j), b = point(i, j + 1), c = point(i + 1, j + 1), d = point(i + 1, j);
            for (const n of [a, b, c, a, c, d]) {
                pos.push(n[0] * radius, n[1] * radius, n[2] * radius);
                nor.push(...n);
            }
        }
    }
    return { positions: pos, normals: nor };
}

export function makeTorus(major = 0.35, minor = 0.16, rings = 64, sides = 32) {
    const pos = [], nor = [];
    const point = (i, j) => {
        const u = 2 * Math.PI * i / rings;
        const v = 2 * Math.PI * j / sides;
        const n = [Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u)];
        const p = [(major + minor * Math.cos(v)) * Math.cos(u), minor * Math.sin(v), (major + minor * Math.cos(v)) * Math.sin(u)];
        return { p, n };
    };
    for (let i = 0; i < rings; i++) {
        for (let j = 0; j < sides; j++) {
            const a = point(i, j), b = point(i + 1, j), c = point(i + 1, j + 1), d = point(i, j + 1);
            for (const q of [a, b, c, a, c, d]) {
                pos.push(...q.p);
                nor.push(...q.n);
            }
        }
    }
    return { positions: pos, normals: nor };
}

export function makeFloor() {
    const pos = [], nor = [];
    pushQuad(pos, nor, [0, 0, 0], [0, 0, 1], [1, 0, 0]);   // unit quad, normal +y
    return { positions: pos, normals: nor };
}
