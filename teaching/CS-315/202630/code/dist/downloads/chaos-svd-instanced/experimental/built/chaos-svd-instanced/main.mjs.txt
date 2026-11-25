// main.mjs -- the controller. The only file that knows about the DOM.
//
//   app.html --> main.mjs --> chaosgame.mjs --> ifs.mjs
//                         \-> explorer.mjs   (the random walk, DOM-free)
//
// Each map is { centre, u, v, s:[s0, s1] }: its fixed point and the SVD of its
// linear part, L = R(u) . diag(s0, s1) . R(-v). See ifs.mjs.

import { initShaders } from '../../../common/initShadersJS.mjs';
import { ChaosGame, MAP_COLOURS } from './chaosgame.mjs';
import { DRAGON, fromAffine, toAffine, svd2 } from './ifs.mjs';
import {
  toVec, fromVec, nextTarget, randomVec, wrapAngles, lerpVec, smoothstep, scaleRange, SCALE_LIMITS,
} from './explorer.mjs';

const id = (name) => document.getElementById(name);
const DEG = 180 / Math.PI;

// The dragon, re-described: map k has centre c_k, U = R(theta_k), V = I, S = s I.
const DRAGON_TRANSFORMS = DRAGON.map((spec) => {
  const t = fromAffine(spec);
  return { centre: t.centre, u: t.angle, v: 0, s: [t.scale, t.scale] };
});

const PICK_RADIUS_CSS_PX = 14;

// One slider per parameter of a map. Angles are shown in degrees.
const ROWS = [
  { label: 'centre x', min: -1.5, max: 1.5, step: 0.001, digits: 3, get: (t) => t.centre[0], set: (t, x) => { t.centre[0] = x; } },
  { label: 'centre y', min: -1.5, max: 1.5, step: 0.001, digits: 3, get: (t) => t.centre[1], set: (t, x) => { t.centre[1] = x; } },
  { label: 'U: rotation u', min: -180, max: 180, step: 0.5, digits: 1, unit: '°', get: (t) => wrapDeg(t.u * DEG), set: (t, x) => { t.u = x / DEG; } },
  { label: 'V: rotation v', min: -180, max: 180, step: 0.5, digits: 1, unit: '°', get: (t) => wrapDeg(t.v * DEG), set: (t, x) => { t.v = x / DEG; } },
  { label: 'S: scale s0', min: SCALE_LIMITS[0], max: SCALE_LIMITS[1], step: 0.005, digits: 3, get: (t) => t.s[0], set: (t, x) => { t.s[0] = x; } },
  { label: 'S: scale s1', min: SCALE_LIMITS[0], max: SCALE_LIMITS[1], step: 0.005, digits: 3, get: (t) => t.s[1], set: (t, x) => { t.s[1] = x; } },
];

function wrapDeg(d) {
  return ((((d + 180) % 360) + 360) % 360) - 180;
}

let game;
let ui;
let rafId = 0;
let last = 0;
let dragging = -1;            // index of the centre being dragged, or -1

// exploration state: glide from `from` to `to`; leg runs 0 -> 1
let from = null;
let to = null;
let leg = 0;

// ------------------------------------------------------------------- setup

async function loadText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function cssColour([r, g, b]) {
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
}

function buildMapUI() {
  const host = id('maps');
  const maps = [];
  for (let i = 0; i < 2; i++) {
    const fs = document.createElement('fieldset');
    const legend = document.createElement('legend');
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = cssColour(MAP_COLOURS[i]);
    legend.append(sw, `Map ${i}`);
    fs.append(legend);

    const rows = ROWS.map((row) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'range';
      input.min = row.min;
      input.max = row.max;
      input.step = row.step;
      const out = document.createElement('output');
      label.append(row.label + ' ', input, out);
      fs.append(label);
      return { row, input, out };
    });
    const readout = document.createElement('pre');
    fs.append(readout);
    host.append(fs);
    maps.push({ rows, readout });
  }
  return maps;
}

function cacheControls() {
  const g = id;
  return {
    canvas: g('gl-canvas'),
    maps: buildMapUI(),
    explore: g('explore'),
    leg: g('leg'), legOut: g('leg-out'),
    adventure: g('adventure'), adventureOut: g('adventure-out'),
    smin: g('smin'), sminOut: g('smin-out'),
    smax: g('smax'), smaxOut: g('smax-out'),
    exCentres: g('ex-centres'), exAngles: g('ex-angles'), exScales: g('ex-scales'),
    jump: g('jump'), reset: g('reset'),
    count: g('count'), countOut: g('count-out'),
    psize: g('psize'), psizeOut: g('psize-out'),
    levels: g('levels'), levelsOut: g('levels-out'),
    depth: g('depth'), depthOut: g('depth-out'),
    byInstance: g('by-instance'),
    showCentres: g('show-centres'),
    autofit: g('autofit'),
    reroll: g('reroll'),
    status: g('status'),
  };
}

// ---------------------------------------------------------------- readouts

function fmt(v, digits = 3, width = 7) {
  let s = v.toFixed(digits);
  if (s.startsWith('-') && Number(s) === 0) {
    s = s.slice(1);
  }
  return s.padStart(width);
}

function readoutText(i) {
  const t = game.getTransforms()[i];
  const [[a, b, tx], [c, d, ty]] = toAffine(game.getMatrix(i));
  return [
    `c = (${fmt(t.centre[0], 3, 0)}, ${fmt(t.centre[1], 3, 0)})`,
    `U = R(${fmt(wrapDeg(t.u * DEG), 1, 0)}°)  V = R(${fmt(wrapDeg(t.v * DEG), 1, 0)}°)  S = diag(${fmt(t.s[0], 3, 0)}, ${fmt(t.s[1], 3, 0)})`,
    'A = T(c) U S Vᵀ T(−c)',
    `  = [${fmt(a)} ${fmt(b)} ${fmt(tx)} ]`,
    `    [${fmt(c)} ${fmt(d)} ${fmt(ty)} ]`,
  ].join('\n');
}

function syncUI() {
  const ts = game.getTransforms();
  for (let i = 0; i < 2; i++) {
    for (const { row, input, out } of ui.maps[i].rows) {
      const x = row.get(ts[i]);
      input.value = x;
      out.textContent = x.toFixed(row.digits) + (row.unit ?? '');
    }
    ui.maps[i].readout.textContent = readoutText(i);
  }
}

function syncSettingsOutputs() {
  ui.legOut.textContent = `${Number(ui.leg.value).toFixed(1)} s`;
  ui.adventureOut.textContent = Number(ui.adventure.value).toFixed(2);
  ui.sminOut.textContent = Number(ui.smin.value).toFixed(2);
  ui.smaxOut.textContent = Number(ui.smax.value).toFixed(2);
  ui.countOut.textContent = Number(ui.count.value).toLocaleString();
  ui.psizeOut.textContent = Number(ui.psize.value).toFixed(1);
  const n = Number(ui.depth.value);
  ui.depthOut.textContent = `${n} (${2 ** n} colours)`;
  const L = Number(ui.levels.value);
  ui.levelsOut.textContent = `${L} (${2 ** L} instances)`;
}

function updateStatus() {
  const n = Number(ui.count.value);
  const k = game.instanceCount;
  ui.status.textContent =
    `${n.toLocaleString()} points generated once on the CPU (${game.lastGenerateMs.toFixed(1)} ms), ` +
    `drawn in ${k} instance${k === 1 ? '' : 's'} = ${(n * k).toLocaleString()} points on screen.`;
}

// -------------------------------------------------------------- exploration

function exploreOptions(amount = Number(ui.adventure.value)) {
  const [smin, smax] = scaleRange(Number(ui.smin.value), Number(ui.smax.value));
  return {
    amount,
    centres: ui.exCentres.checked,
    angles: ui.exAngles.checked,
    scales: ui.exScales.checked,
    smin,
    smax,
  };
}

// begin a new leg from wherever the maps are right now
function startLeg() {
  from = wrapAngles(toVec(game.getTransforms()));
  to = nextTarget(from, exploreOptions(), Math.random);
  leg = 0;
}

function advanceExploration(dt) {
  if (!from) {
    startLeg();
  }
  leg += dt / Math.max(0.1, Number(ui.leg.value));
  game.setTransforms(fromVec(lerpVec(from, to, smoothstep(leg))));
  if (leg >= 1) {
    from = wrapAngles(to);
    to = nextTarget(from, exploreOptions(), Math.random);
    leg = 0;
  }
  syncUI();
}

function setVec(vec) {
  game.setTransforms(fromVec(wrapAngles(vec)));
  from = null;
  syncUI();
}

// ----------------------------------------------------------------- editing

// the person changed something by hand: any glide in progress restarts from there
function userEdited() {
  from = null;
  syncUI();
}

function userSetCentre(i, x, y) {
  game.setCentre(i, x, y);
  userEdited();
}

// ----------------------------------------------------------------- pointer

function pointerUV(ev) {
  const r = ui.canvas.getBoundingClientRect();
  return {
    u: Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)),
    v: Math.min(1, Math.max(0, 1 - (ev.clientY - r.top) / r.height)),
    rect: r,
  };
}

function pickCentre(u, v, rect) {
  if (!ui.showCentres.checked) {
    return -1;
  }
  const [x0] = game.worldAt(0, 0.5);
  const [x1] = game.worldAt(1, 0.5);
  const radius = PICK_RADIUS_CSS_PX * ((x1 - x0) / rect.width);
  const [wx, wy] = game.worldAt(u, v);

  let best = -1;
  let bestD = radius * radius;
  game.getTransforms().forEach((t, i) => {
    const dx = t.centre[0] - wx;
    const dy = t.centre[1] - wy;
    const d = dx * dx + dy * dy;
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

function onPointerDown(ev) {
  const { u, v, rect } = pointerUV(ev);
  const i = pickCentre(u, v, rect);
  if (i < 0) {
    return;
  }
  dragging = i;
  ui.canvas.setPointerCapture(ev.pointerId);
  ui.canvas.style.cursor = 'grabbing';
  const [x, y] = game.worldAt(u, v);
  userSetCentre(i, x, y);
}

function onPointerMove(ev) {
  const { u, v, rect } = pointerUV(ev);
  if (dragging >= 0) {
    const [x, y] = game.worldAt(u, v);
    userSetCentre(dragging, x, y);
  } else {
    ui.canvas.style.cursor = pickCentre(u, v, rect) >= 0 ? 'grab' : 'default';
  }
}

function onPointerUp(ev) {
  if (dragging < 0) {
    return;
  }
  dragging = -1;
  if (ui.canvas.hasPointerCapture(ev.pointerId)) {
    ui.canvas.releasePointerCapture(ev.pointerId);
  }
  ui.canvas.style.cursor = 'default';
}

// ------------------------------------------------------------------ wiring

function wireControls() {
  for (let i = 0; i < 2; i++) {
    for (const { row, input } of ui.maps[i].rows) {
      input.addEventListener('input', () => {
        const ts = game.getTransforms();
        row.set(ts[i], Number(input.value));
        game.setTransforms(ts);
        userEdited();
      });
    }
  }

  ui.explore.addEventListener('change', () => { from = null; });
  for (const el of [ui.leg, ui.adventure, ui.smin, ui.smax]) {
    el.addEventListener('input', syncSettingsOutputs);
  }
  for (const el of [ui.exCentres, ui.exAngles, ui.exScales, ui.smin, ui.smax, ui.adventure]) {
    el.addEventListener('change', () => { from = null; });
  }

  ui.jump.addEventListener('click', () => {
    const { smin, smax } = exploreOptions();
    setVec(randomVec(Math.random, { smin, smax }));
  });
  ui.reset.addEventListener('click', () => {
    game.setTransforms(DRAGON_TRANSFORMS);
    from = null;
    syncUI();
  });

  ui.count.addEventListener('input', () => {
    game.setCount(Number(ui.count.value));
    syncSettingsOutputs();
  });
  ui.psize.addEventListener('input', () => {
    game.setPointSize(Number(ui.psize.value));
    syncSettingsOutputs();
  });
  ui.levels.addEventListener('input', () => {
    game.setLevels(Number(ui.levels.value));
    syncSettingsOutputs();
    updateStatus();
  });
  ui.depth.addEventListener('input', () => {
    game.setColourDepth(Number(ui.depth.value));
    syncSettingsOutputs();
  });
  ui.byInstance.addEventListener('change', () => {
    game.setColourByInstance(ui.byInstance.checked);
  });
  ui.showCentres.addEventListener('change', () => {
    game.setShowCentres(ui.showCentres.checked);
  });
  ui.reroll.addEventListener('click', () => {
    game.reroll((Math.random() * 4294967296) >>> 0);
  });

  ui.canvas.addEventListener('pointerdown', onPointerDown);
  ui.canvas.addEventListener('pointermove', onPointerMove);
  ui.canvas.addEventListener('pointerup', onPointerUp);
  ui.canvas.addEventListener('pointercancel', onPointerUp);
}

function observeCanvasSize(canvas) {
  const ro = new ResizeObserver((entries) => {
    const entry = entries[0];
    const dpr = window.devicePixelRatio || 1;
    const dpBox = entry.devicePixelContentBoxSize?.[0];
    let w;
    let h;
    if (dpBox) {
      w = dpBox.inlineSize;
      h = dpBox.blockSize;
    } else {
      const cb = entry.contentBoxSize?.[0];
      w = Math.round((cb ? cb.inlineSize : entry.contentRect.width) * dpr);
      h = Math.round((cb ? cb.blockSize : entry.contentRect.height) * dpr);
    }
    game.resize(w, h, dpr);
  });

  try {
    ro.observe(canvas, { box: 'device-pixel-content-box' });
  } catch {
    ro.observe(canvas); // Safari: option unsupported, fall back
  }
}

// ---------------------------------------------------------------- the view

// Glide the window toward the attractor's bounding box. The centres are
// fixed points, so they lie on the attractor and stay in view too.
function followAttractor(dt) {
  if (!ui.autofit.checked || dragging >= 0) {
    return;
  }
  const b = game.bounds;
  if (!Number.isFinite(b.x0)) {
    return;
  }
  const target = {
    cx: (b.x0 + b.x1) / 2,
    cy: (b.y0 + b.y1) / 2,
    half: Math.max(0.05, 0.56 * Math.max(b.x1 - b.x0, b.y1 - b.y0)),
  };
  const v = game.getView();
  const k = 1 - Math.exp(-dt * 6);
  const next = {
    cx: v.cx + (target.cx - v.cx) * k,
    cy: v.cy + (target.cy - v.cy) * k,
    half: v.half + (target.half - v.half) * k,
  };
  if (Math.abs(next.cx - v.cx) + Math.abs(next.cy - v.cy) + Math.abs(next.half - v.half) > 1e-5) {
    game.setView(next);
  }
}

// -------------------------------------------------------------- render loop

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  if (ui.explore.checked && dragging < 0) {
    advanceExploration(dt);
  }

  if (game.render()) {
    updateStatus();
  }
  followAttractor(dt);
  rafId = requestAnimationFrame(frame);
}

async function init() {
  ui = cacheControls();

  const gl = ui.canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2.0 is not available');
    return;
  }

  const [vertexSource, fragmentSource] = await Promise.all([
    loadText(new URL('./shaders/chaos.vert.glsl', import.meta.url)),
    loadText(new URL('./shaders/chaos.frag.glsl', import.meta.url)),
  ]);
  const program = initShaders(gl, vertexSource, fragmentSource);

  game = new ChaosGame(gl, program);
  game.setTransforms(DRAGON_TRANSFORMS);

  const dpr = window.devicePixelRatio || 1;
  const rect = ui.canvas.getBoundingClientRect();
  game.resize(Math.round(rect.width * dpr), Math.round(rect.height * dpr), dpr);

  game.setCount(Number(ui.count.value));
  game.setPointSize(Number(ui.psize.value));
  game.setColourDepth(Number(ui.depth.value));
  game.setLevels(Number(ui.levels.value));
  game.setColourByInstance(ui.byInstance.checked);
  game.setShowCentres(ui.showCentres.checked);

  // page.html#explore starts with exploration already running
  ui.explore.checked = location.hash === '#explore';

  syncUI();
  syncSettingsOutputs();
  wireControls();
  observeCanvasSize(ui.canvas);

  last = performance.now();
  rafId = requestAnimationFrame(frame);
}

init().catch((err) => {
  console.error(err);
  alert(err.message);
});
