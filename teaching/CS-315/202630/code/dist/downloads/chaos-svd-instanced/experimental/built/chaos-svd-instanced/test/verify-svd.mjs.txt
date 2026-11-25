// node test/verify-svd.mjs  -- no dependencies
import { DRAGON, fromAffine, empathic, svdMap, svd2, chain, mulPoint, mulberry32, makeChoices, chaosGame } from '../ifs.mjs';
import { toVec, fromVec, nextTarget, randomVec, wrapAngles, scaleRange, GROUPS, MIN_CENTRE_DISTANCE, CENTRE_LIMIT, SCALE_LIMITS } from '../explorer.mjs';

let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + msg); };
const rand = mulberry32(12345);
const params = (r) => ({ centre: [r() * 2 - 1, r() * 2 - 1], u: (r() * 2 - 1) * Math.PI, v: (r() * 2 - 1) * Math.PI, s: [0.15 + 0.7 * r(), 0.15 + 0.7 * r()] });

// 1. fixed point, and the singular values of the linear part are exactly s
let eFix = 0, eSv = 0, eRound = 0;
for (let n = 0; n < 2000; n++) {
  const p = params(rand), A = svdMap(p);
  const [fx, fy] = mulPoint(A, p.centre[0], p.centre[1]);
  eFix = Math.max(eFix, Math.hypot(fx - p.centre[0], fy - p.centre[1]));
  const { s } = svd2(A);
  const want = [...p.s].sort((a, b) => b - a);
  eSv = Math.max(eSv, Math.abs(s[0] - want[0]), Math.abs(s[1] - want[1]));
  // reconstruct L = R(phi) diag(s) R(theta) from svd2 and compare entries
  const { phi, theta } = svd2(A);
  const R = (a) => [[Math.cos(a), -Math.sin(a)], [Math.sin(a), Math.cos(a)]];
  const [P, Q] = [R(phi), R(theta)];
  const L = [[0, 0], [0, 0]];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) L[i][j] += P[i][k] * s[k] * Q[k][j];
  eRound = Math.max(eRound, Math.abs(L[0][0] - A[0]), Math.abs(L[0][1] - A[3]), Math.abs(L[1][0] - A[1]), Math.abs(L[1][1] - A[4]));
}
ok(eFix < 1e-12, `centre is the fixed point of its map (2000 random maps, max err ${eFix.toExponential(1)})`);
ok(eSv < 1e-12, `singular values of the linear part equal s0, s1 (max err ${eSv.toExponential(1)})`);
ok(eRound < 1e-12, `U.S.V^T rebuilt from svd2 matches the matrix (max err ${eRound.toExponential(1)})`);

// 2. contractive: |det L| = s0 s1 < 1 and every distance shrinks by at most s_max
let worst = 0;
for (let n = 0; n < 500; n++) {
  const p = params(rand), A = svdMap(p), smax = Math.max(...p.s);
  for (let k = 0; k < 20; k++) {
    const x = [rand() * 4 - 2, rand() * 4 - 2], y = [rand() * 4 - 2, rand() * 4 - 2];
    const a = mulPoint(A, ...x), b = mulPoint(A, ...y);
    worst = Math.max(worst, Math.hypot(a[0] - b[0], a[1] - b[1]) / Math.hypot(x[0] - y[0], x[1] - y[1]) / smax);
  }
}
ok(worst <= 1 + 1e-9, `distances scale by no more than s_max (worst ratio / s_max = ${worst.toFixed(6)})`);

// 3. the dragon is the special case u = theta, v = 0, s0 = s1 = 1/sqrt(2)
let eD = 0;
for (const spec of DRAGON) {
  const t = fromAffine(spec), a = svdMap({ centre: t.centre, u: t.angle, v: 0, s: [t.scale, t.scale] }), b = empathic(t);
  for (let i = 0; i < 9; i++) eD = Math.max(eD, Math.abs(a[i] - b[i]));
}
ok(eD < 1e-12, `"Reset to dragon" parameters reproduce the original dragon matrices (max err ${eD.toExponential(1)})`);

// 4. explorer invariants over many legs
const opts = { amount: 0.35, centres: true, angles: true, scales: true, smin: 0.15, smax: 0.85 };
let ok4 = true, minD = Infinity, sLo = Infinity, sHi = -Infinity, cMax = 0;
for (const amount of [0.1, 0.35, 1]) {
  let v = randomVec(rand, opts);
  for (let n = 0; n < 5000; n++) {
    v = wrapAngles(nextTarget(v, { ...opts, amount }, rand));
    for (const i of GROUPS.scales) { sLo = Math.min(sLo, v[i]); sHi = Math.max(sHi, v[i]); }
    for (const i of GROUPS.centres) cMax = Math.max(cMax, Math.abs(v[i]));
    minD = Math.min(minD, Math.hypot(v[0] - v[6], v[1] - v[7]));
  }
}
ok(sLo >= 0.15 - 1e-12 && sHi <= 0.85 + 1e-12, `15000 legs keep both scales inside [0.15, 0.85] (saw ${sLo.toFixed(3)} .. ${sHi.toFixed(3)})`);
ok(sHi < 1 && sLo > 0, 'scales always contractive: 0 < s_i < 1');
ok(minD >= MIN_CENTRE_DISTANCE - 1e-12 && cMax <= CENTRE_LIMIT + 1e-12, `centres stay in [-1,1]^2 and at least ${MIN_CENTRE_DISTANCE} apart (min gap ${minD.toFixed(3)})`);

// groups switched off stay put
const base = randomVec(rand, opts);
const frozen = nextTarget(base, { ...opts, centres: false, angles: false }, rand);
ok(GROUPS.centres.concat(GROUPS.angles).every((i) => frozen[i] === base[i]) && GROUPS.scales.some((i) => frozen[i] !== base[i]), 'unticked groups (centres, rotations) are left exactly where they are');

// a scale range given with crossed sliders, or beyond the hard limits, is repaired
const [lo, hi] = scaleRange(0.9, 0.02);
ok(lo === SCALE_LIMITS[0] && hi === 0.9, 'crossed / out-of-range scale sliders are sorted and clamped');
const rv = fromVec(toVec(fromVec(base)));
ok(JSON.stringify(rv) === JSON.stringify(fromVec(base)), 'toVec / fromVec round-trip');

// 5. instancing: instance id -> product of T0 / T1 in written order, and copies lie on the attractor
const T = fromVec(randomVec(rand, opts)).map(svdMap);
const inst = (id) => { let M = chain(); for (let k = 3; k >= 0; k--) M = chain(M, T[(id >> k) & 1]); return M; };
let e5 = 0;
for (let id = 0; id < 16; id++) {
  const s = id.toString(2).padStart(4, '0');
  const w = chain(...[...s].map((d) => T[+d]));
  const m = inst(id);
  for (let i = 0; i < 9; i++) e5 = Math.max(e5, Math.abs(m[i] - w[i]));
}
ok(e5 < 1e-12, `16 instance matrices 0000..1111 equal the written products of T0, T1 (max err ${e5.toExponential(1)}), non-uniform maps`);

const N = 300000, choices = makeChoices(N, 2, 3), pos = new Float64Array(2 * N);
const A = fromVec([0, 0, 0.5, 0.2, 0.7, 0.3, 0.8, 0.1, -2.0, 1.0, 0.4, 0.6]).map(svdMap);
const tr = fromVec([0, 0, 0.5, 0.2, 0.7, 0.3, 0.8, 0.1, -2.0, 1.0, 0.4, 0.6]);
chaosGame(A, choices, N, tr[0].centre, pos);
const cell = 0.01, grid = new Set();
for (let i = 0; i < N; i++) grid.add(Math.round(pos[2 * i] / cell) + ',' + Math.round(pos[2 * i + 1] / cell));
let hit = 0, tot = 0;
for (let id = 0; id < 16; id++) {
  let M = chain(); for (let k = 3; k >= 0; k--) M = chain(M, A[(id >> k) & 1]);
  for (let i = 1000; i < 4000; i += 5) {
    const [x, y] = mulPoint(M, pos[2 * i], pos[2 * i + 1]); tot++;
    const ix = Math.round(x / cell), iy = Math.round(y / cell);
    let f = false; for (let dx = -1; dx <= 1 && !f; dx++) for (let dy = -1; dy <= 1; dy++) if (grid.has((ix + dx) + ',' + (iy + dy))) { f = true; break; }
    if (f) hit++;
  }
}
ok(hit / tot > 0.97, `instance copies land on the attractor of a non-uniform pair (${hit}/${tot})`);

console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
