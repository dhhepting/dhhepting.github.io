import Renderer from './renderer.js';
import { setupUI } from './ui.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gl-canvas');
  const renderer = new Renderer(canvas, {
    texSize: 512,
    numParticles: 32,
    diffuse: 4.0,
    particleSize: 10.0,
  });

  setupUI(renderer);
  renderer.start();
});
