// Controller: the only module that touches the DOM.
// Dependency direction: main -> scene / sim -> gl-utils.

import { loadShaderSources } from './gl-utils.mjs';
import { DiffusionSim, SHADER_FILES } from './sim.mjs';
import { Scene, SCENE_SHADER_FILES } from './scene.mjs';
import { perspective, lookAt, multiply } from './math.mjs';

const $ = (id) => document.getElementById(id);

const state = {
  shape: 'both',
  exposure: 1.0,
  autoRotate: true,
  paused: false,
  showTexture: true,
  yaw: 0.5,
  pitch: 0.25,
  dist: 6.2,
  angle: 0,
};

function showError(msg) {
  const el = $('error');
  el.textContent = msg;
  el.hidden = false;
}

async function main() {
  const canvas = $('gl');
  const gl = canvas.getContext('webgl2', { antialias: true });
  if (!gl) return showError('WebGL2 is not available in this browser.');

  let sim, scene;
  try {
    const sources = await loadShaderSources([...SHADER_FILES, ...SCENE_SHADER_FILES]);
    sim = new DiffusionSim(gl, sources, { particleSize: 512, trailSize: 512 });
    scene = new Scene(gl, sources);
  } catch (err) {
    console.error(err);
    return showError(err.message);
  }

  // ---- canvas sizing -------------------------------------------------------
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // ---- orbit camera --------------------------------------------------------
  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    state.yaw -= (e.clientX - lastX) * 0.008;
    state.pitch = Math.max(-1.4, Math.min(1.4, state.pitch + (e.clientY - lastY) * 0.008));
    lastX = e.clientX; lastY = e.clientY;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.dist = Math.max(3, Math.min(14, state.dist * Math.exp(e.deltaY * 0.001)));
  }, { passive: false });

  // ---- controls ------------------------------------------------------------
  // Sliders: <input data-target="sim|view" data-key="...">, with a sibling <output>.
  for (const input of document.querySelectorAll('input[type=range]')) {
    const target = input.dataset.target === 'sim' ? sim.params : state;
    const out = input.parentElement.querySelector('output');
    const digits = Number(input.dataset.digits ?? 3);
    const apply = () => {
      target[input.dataset.key] = parseFloat(input.value);
      out.textContent = parseFloat(input.value).toFixed(digits);
    };
    input.value = target[input.dataset.key];
    input.addEventListener('input', apply);
    apply();
  }
  $('shape').value = state.shape;
  $('shape').addEventListener('change', (e) => { state.shape = e.target.value; });
  $('particles').addEventListener('change', (e) => sim.setParticleSize(Number(e.target.value)));
  $('source').addEventListener('change', (e) => sim.reset(e.target.value));
  $('reset').addEventListener('click', () => sim.reset($('source').value));
  $('rotate').addEventListener('change', (e) => { state.autoRotate = e.target.checked; });
  $('pause').addEventListener('change', (e) => { state.paused = e.target.checked; });
  $('texture').addEventListener('change', (e) => { state.showTexture = e.target.checked; });

  // ---- main loop -----------------------------------------------------------
  const stats = $('stats');
  let last = performance.now(), fps = 0, statTimer = 0;

  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    fps = fps ? fps * 0.95 + (1 / Math.max(dt, 1e-4)) * 0.05 : 1 / Math.max(dt, 1e-4);

    resize();
    if (!state.paused) sim.step();
    if (state.autoRotate) state.angle += dt * 0.4;

    const w = canvas.width, h = canvas.height;
    const eye = [
      state.dist * Math.cos(state.pitch) * Math.sin(state.yaw),
      state.dist * Math.sin(state.pitch),
      state.dist * Math.cos(state.pitch) * Math.cos(state.yaw),
    ];
    const viewProj = multiply(
      perspective(Math.PI / 4, w / h, 0.1, 50),
      lookAt(eye, [0, 0, 0], [0, 1, 0]),
    );

    scene.draw({
      trailTexture: sim.trailTexture, shape: state.shape, angle: state.angle,
      viewProj, exposure: state.exposure, width: w, height: h,
    });
    if (state.showTexture) {
      const size = Math.round(Math.min(w, h) * 0.28);
      const pad = Math.round(12 * (window.devicePixelRatio || 1));
      scene.drawPreview({
        trailTexture: sim.trailTexture, exposure: state.exposure,
        x: w - size - pad, y: pad, size,
      });
    }

    if ((statTimer += dt) > 0.5) {
      statTimer = 0;
      stats.textContent =
        `${fps.toFixed(0)} fps · ${sim.particleCount.toLocaleString()} particles · step ${sim.frame}`;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // Handy from the console: demo.sim.readTrailStats(), demo.sim.params, ...
  globalThis.demo = { gl, sim, scene, state };
}

main();
