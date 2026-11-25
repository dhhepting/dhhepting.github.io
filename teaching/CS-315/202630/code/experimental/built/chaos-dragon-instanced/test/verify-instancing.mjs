// node test/verify-instancing.mjs  -- no dependencies
import { DRAGON, fromAffine, empathic, chain, mulPoint, makeChoices, chaosGame } from '../ifs.mjs';

const T = DRAGON.map((s) => empathic(fromAffine(s)));
let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + msg); };

// CPU twin of the vertex shader's instanceMatrix(): digits from the most significant end
function instanceMatrix(id, levels) {
  let M = chain();
  for (let k = levels - 1; k >= 0; k--) M = chain(M, T[(id >> k) & 1]);
  return M;
}
// the same thing, written as the string product from the brief
function fromString(s) { return chain(...[...s].map((d) => T[+d])); }

let maxErr = 0;
for (let id = 0; id < 16; id++) {
  const s = id.toString(2).padStart(4, '0');
  const a = instanceMatrix(id, 4), b = fromString(s);
  for (let i = 0; i < 9; i++) maxErr = Math.max(maxErr, Math.abs(a[i] - b[i]));
}
ok(maxErr < 1e-12, `16 instance matrices match the written products T_b1.T_b2.T_b3.T_b4 (max err ${maxErr.toExponential(1)})`);

// print a few matrices as [[a b tx],[c d ty]]
for (const s of ['0000', '0001', '0110', '1111']) {
  const m = fromString(s);
  console.log(`  ${s}: [${[m[0], m[3], m[6]].map((v) => v.toFixed(4))}] [${[m[1], m[4], m[7]].map((v) => v.toFixed(4))}]`);
}

// each instance is the attractor shrunk by s^4 = (1/sqrt2)^4 = 1/4
const det = (m) => m[0] * m[4] - m[3] * m[1];
ok(Math.abs(det(fromString('0101')) - 0.0625) < 1e-12, 'linear area factor of each instance is (1/2)^4 = 1/16 (scale 1/4)');

// self-similarity: instance copies of an attractor point are themselves attractor points,
// i.e. they lie where a long chaos-game orbit has points.
const N = 200000;
const mats = T, choices = makeChoices(N, 2, 7), pos = new Float64Array(2 * N);
chaosGame(mats, choices, N, [0, 0], pos);
const cell = 0.01, grid = new Set();
for (let i = 0; i < N; i++) grid.add(Math.round(pos[2 * i] / cell) + ',' + Math.round(pos[2 * i + 1] / cell));
const near = (x, y) => { const ix = Math.round(x / cell), iy = Math.round(y / cell);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (grid.has((ix + dx) + ',' + (iy + dy))) return true; return false; };
let hit = 0, tot = 0;
for (let id = 0; id < 16; id++) {
  const M = instanceMatrix(id, 4);
  for (let i = 1000; i < 3000; i += 7) { const [x, y] = mulPoint(M, pos[2 * i], pos[2 * i + 1]); tot++; if (near(x, y)) hit++; }
}
ok(hit / tot > 0.99, `instance copies land on the attractor (${hit}/${tot} within 1.5 cells of the reference orbit)`);

// the 16 copies tile the attractor without gaps: union covers the reference cells
const cover = new Set();
for (let id = 0; id < 16; id++) { const M = instanceMatrix(id, 4);
  for (let i = 0; i < 20000; i++) { const [x, y] = mulPoint(M, pos[2 * i], pos[2 * i + 1]); cover.add(Math.round(x / 0.02) + ',' + Math.round(y / 0.02)); } }
const ref = new Set(); for (let i = 0; i < N; i++) ref.add(Math.round(pos[2 * i] / 0.02) + ',' + Math.round(pos[2 * i + 1] / 0.02));
let covered = 0; for (const c of ref) if (cover.has(c)) covered++;
ok(covered / ref.size > 0.95, `instances together cover the attractor (${(100 * covered / ref.size).toFixed(1)}% of reference cells)`);

console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
