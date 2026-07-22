export function setupUI(renderer) {
  // Minimal UI: Play/Pause and a diffusion slider
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '10px';
  container.style.top = '10px';
  container.style.background = 'rgba(255,255,255,0.8)';
  container.style.padding = '8px';
  container.style.borderRadius = '6px';
  container.style.fontFamily = 'sans-serif';
  container.style.zIndex = 1000;

  const playBtn = document.createElement('button');
  playBtn.textContent = 'Pause';
  playBtn.addEventListener('click', () => {
    if (renderer._running) {
      renderer.stop();
      playBtn.textContent = 'Play';
    } else {
      renderer.start();
      playBtn.textContent = 'Pause';
    }
  });
  container.appendChild(playBtn);

  const diffLabel = document.createElement('label');
  diffLabel.style.marginLeft = '8px';
  diffLabel.textContent = ' Diffuse: ';
  container.appendChild(diffLabel);

  const diffInput = document.createElement('input');
  diffInput.type = 'range';
  diffInput.min = 1;
  diffInput.max = 20;
  diffInput.value = renderer.diffuse;
  diffInput.step = 0.1;
  diffInput.addEventListener('input', () => {
    renderer.setDiffuse(parseFloat(diffInput.value));
  });
  container.appendChild(diffInput);

  // Debug toggle
  const debugLabel = document.createElement('label');
  debugLabel.style.marginLeft = '8px';
  debugLabel.textContent = ' Debug: ';
  container.appendChild(debugLabel);

  const debugInput = document.createElement('input');
  debugInput.type = 'checkbox';
  debugInput.addEventListener('change', () => {
    renderer.setDebug(debugInput.checked);
  });
  container.appendChild(debugInput);
  document.body.appendChild(container);
}

