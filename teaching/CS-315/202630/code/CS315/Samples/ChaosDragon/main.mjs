// main.mjs -- the controller. The only file that knows about the DOM.
//
//   app.html --> main.mjs --> chaosgame.mjs --> ifs.mjs
//
// Shaders are fetched as text and compiled with the course's
// Common/initShadersJS.mjs. The matrix maths lives in ifs.mjs and uses
// Float64Array, because the chaos-game loop multiplies a point by a 3x3
// matrix up to 400 000 times per frame.

import { initShaders } from '../../Common/initShadersJS.mjs';
import { ChaosGame, MAP_COLOURS } from './chaosgame.mjs';
import { DRAGON, fromAffine, toAffine } from './ifs.mjs';

const id = (name) => document.getElementById(name);

// The dragon's two maps, re-described from their own centres:
//   map 0: centre (0, 0),     s = 1/sqrt(2), theta =  45 degrees
//   map 1: centre (0.6, 0.2), s = 1/sqrt(2), theta = 135 degrees
const DRAGON_TRANSFORMS = DRAGON.map((spec) => fromAffine(spec));

// How the centres drift when "Wander" is on: each centre traces a
// Lissajous loop about its own home position.
const WANDER = [
  { fx: 1.0, fy: 0.8, phase: 0.0 },
  { fx: 0.9, fy: 1.3, phase: 1.7 },
];

const PICK_RADIUS_CSS_PX = 14;

let game;
let ui;
let rafId = 0;
let last = 0;
let wanderPhase = 0;
let dragging = -1;               // index of the centre being dragged, or -1
const home = [[0, 0], [0, 0]];   // where each centre would sit if wander offset were zero

// ------------------------------------------------------------------- setup


async function loadText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function cacheControls() {
  return {
    canvas: id('gl-canvas'),
    c: [
      { x: id('c0x'), y: id('c0y'), xOut: id('c0x-out'), yOut: id('c0y-out'), readout: id('readout0'), swatch: id('swatch0') },
      { x: id('c1x'), y: id('c1y'), xOut: id('c1x-out'), yOut: id('c1y-out'), readout: id('readout1'), swatch: id('swatch1') },
    ],
    wander: id('wander'),
    amplitude: id('amplitude'),
    amplitudeOut: id('amplitude-out'),
    speed: id('speed'),
    speedOut: id('speed-out'),
    count: id('count'),
    countOut: id('count-out'),
    psize: id('psize'),
    psizeOut: id('psize-out'),
    depth: id('depth'),
    depthOut: id('depth-out'),
    showCentres: id('show-centres'),
    reroll: id('reroll'),
    reset: id('reset'),
    status: id('status'),
  };
}

function cssColour([r, g, b]) {
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
}

// ---------------------------------------------------------- moving centres

const pub = import.meta.env
  ? './'        // Vite dev/build: shaders sit beside the page
  : new URL(/* @vite-ignore */ '../../public/Samples/ChaosDragon/', import.meta.url).href;  // raw copy


function wanderOffset(i) {
  const w = WANDER[i];
  const a = Number(ui.amplitude.value);
  return [
    a * Math.cos(w.fx * wanderPhase + w.phase),
    a * Math.sin(w.fy * wanderPhase + w.phase),
  ];
}

// home = centre - offset, so that wandering resumes from wherever the centre
// is right now (no jump).
function setHome(i) {
  const [x, y] = game.getTransforms()[i].centre;
  const [ox, oy] = wanderOffset(i);
  home[i] = [x - ox, y - oy];
}

// The person moved a centre (drag or slider).
function userSetCentre(i, x, y) {
  game.setCentre(i, x, y);
  setHome(i);
  syncUI();
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
  const deg = (t.angle * 180) / Math.PI;
  return [
    `c = (${fmt(t.centre[0], 3, 0)}, ${fmt(t.centre[1], 3, 0)})   s = ${fmt(t.scale, 4, 0)}   \u03b8 = ${fmt(deg, 1, 0)}\u00b0`,
    'A = T(c) R(\u03b8) S(s) T(\u2212c)',
    `  = [${fmt(a)} ${fmt(b)} ${fmt(tx)} ]`,
    `    [${fmt(c)} ${fmt(d)} ${fmt(ty)} ]`,
  ].join('\n');
}

function syncUI() {
  const ts = game.getTransforms();
  for (let i = 0; i < 2; i++) {
    const [x, y] = ts[i].centre;
    ui.c[i].x.value = x;
    ui.c[i].y.value = y;
    ui.c[i].xOut.textContent = x.toFixed(3);
    ui.c[i].yOut.textContent = y.toFixed(3);
    ui.c[i].readout.textContent = readoutText(i);
  }
}

function syncSettingsOutputs() {
  ui.amplitudeOut.textContent = Number(ui.amplitude.value).toFixed(3);
  ui.speedOut.textContent = Number(ui.speed.value).toFixed(2);
  ui.countOut.textContent = Number(ui.count.value).toLocaleString();
  ui.psizeOut.textContent = Number(ui.psize.value).toFixed(1);
  const n = Number(ui.depth.value);
  ui.depthOut.textContent = `${n} (${2 ** n} colours)`;
}

function updateStatus() {
  const n = Number(ui.count.value).toLocaleString();
  ui.status.textContent =
    `${n} points, each one a 3\u00d73 matrix times the previous point. ` +
    `Generated in ${game.lastGenerateMs.toFixed(1)} ms.`;
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

// Index of the centre under the pointer, or -1
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
    const move = () => userSetCentre(i, Number(ui.c[i].x.value), Number(ui.c[i].y.value));
    ui.c[i].x.addEventListener('input', move);
    ui.c[i].y.addEventListener('input', move);
  }

  ui.wander.addEventListener('change', () => {
    if (ui.wander.checked) {
      setHome(0);
      setHome(1);
    }
  });
  ui.amplitude.addEventListener('input', syncSettingsOutputs);
  ui.speed.addEventListener('input', syncSettingsOutputs);

  ui.count.addEventListener('input', () => {
    game.setCount(Number(ui.count.value));
    syncSettingsOutputs();
  });
  ui.psize.addEventListener('input', () => {
    game.setPointSize(Number(ui.psize.value));
    syncSettingsOutputs();
  });
  ui.depth.addEventListener('input', () => {
    game.setColourDepth(Number(ui.depth.value));
    syncSettingsOutputs();
  });
  ui.showCentres.addEventListener('change', () => {
    game.setShowCentres(ui.showCentres.checked);
  });

  ui.reroll.addEventListener('click', () => {
    game.reroll((Math.random() * 4294967296) >>> 0);
  });
  ui.reset.addEventListener('click', () => {
    game.setTransforms(DRAGON_TRANSFORMS);
    setHome(0);
    setHome(1);
    syncUI();
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

// -------------------------------------------------------------- render loop

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  if (ui.wander.checked) {
    wanderPhase += dt * Number(ui.speed.value);
    for (let i = 0; i < 2; i++) {
      if (i === dragging) {
        continue;
      }
      const [ox, oy] = wanderOffset(i);
      game.setCentre(i, home[i][0] + ox, home[i][1] + oy);
    }
    syncUI();
  }

  if (game.render()) {
    updateStatus();
  }
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
    loadText(new URL('./shaders/chaos.vert', import.meta.url)),
    loadText(new URL('./shaders/chaos.frag', import.meta.url)),
  ]);
  const program = initShaders(gl, vertexSource, fragmentSource);

  game = new ChaosGame(gl, program);
  game.setTransforms(DRAGON_TRANSFORMS);

  const dpr = window.devicePixelRatio || 1;
  const rect = ui.canvas.getBoundingClientRect();
  game.resize(Math.round(rect.width * dpr), Math.round(rect.height * dpr), dpr);

  // The sliders reach exactly as far as the window the renderer shows.
  const [xMin, yMin] = game.worldAt(0, 0);
  const [xMax, yMax] = game.worldAt(1, 1);
  for (let i = 0; i < 2; i++) {
    ui.c[i].x.min = xMin.toFixed(2);
    ui.c[i].x.max = xMax.toFixed(2);
    ui.c[i].y.min = yMin.toFixed(2);
    ui.c[i].y.max = yMax.toFixed(2);
    ui.c[i].swatch.style.background = cssColour(MAP_COLOURS[i]);
  }

  game.setCount(Number(ui.count.value));
  game.setPointSize(Number(ui.psize.value));
  game.setColourDepth(Number(ui.depth.value));
  game.setShowCentres(ui.showCentres.checked);

  setHome(0);
  setHome(1);
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
