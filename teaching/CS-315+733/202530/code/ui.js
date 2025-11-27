// ui.js
// Small UI binder for the demo. Exposes wiring helpers and simple read helpers.

export function bindUI() {
  const nbrInput = document.getElementById('nbr-points');
  const nbrRange = document.getElementById('nbr-points-range');
  const generatedCountEl = document.getElementById('generated-count');
  const generationStatusEl = document.getElementById('generation-status');
  const applyBtn = document.getElementById('apply');
  const resetBtn = document.getElementById('reset');

  // keep synced
  if (nbrInput && nbrRange) {
    nbrInput.addEventListener('input', () => { nbrRange.value = nbrInput.value; });
    nbrRange.addEventListener('input', () => { nbrInput.value = nbrRange.value; });
  }

  function readCentres() {
    return [
      [parseFloat(document.getElementById('v0-xpos').value), parseFloat(document.getElementById('v0-ypos').value)],
      [parseFloat(document.getElementById('v1-xpos').value), parseFloat(document.getElementById('v1-ypos').value)],
      [parseFloat(document.getElementById('v2-xpos').value), parseFloat(document.getElementById('v2-ypos').value)],
    ];
  }

  function readRotations() {
    return [
      parseFloat(document.getElementById('v0-rot').value),
      parseFloat(document.getElementById('v1-rot').value),
      parseFloat(document.getElementById('v2-rot').value),
    ];
  }

  function readCount() {
    return Math.max(0, Math.floor(Number(nbrInput.value)));
  }

  return {
    elements: { nbrInput, nbrRange, generatedCountEl, generationStatusEl, applyBtn, resetBtn },
    readCentres,
    readRotations,
    readCount,
  };
}
