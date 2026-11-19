import { clipToDisplay } from './math.mjs';

// All overlay drawing happens in a fixed logical space; CSS scales it.
export const DISPLAY_SIZE = 480;
export const HANDLE_RADIUS = 10;

const css = ([r, g, b]) =>
  `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;

/** Draws the pixel grid, triangle outline, hovered pixel and vertex handles. */
export function drawOverlay(ctx, state) {
  const { resolution, clipPositions, colors, hovered, weights, showGrid, showWeights } = state;
  const S = DISPLAY_SIZE;
  const cell = S / resolution;
  const pts = clipPositions.map((p) => clipToDisplay(p, S));

  ctx.clearRect(0, 0, S, S);

  if (showGrid && cell >= 8) {
    ctx.strokeStyle = 'rgb(255 255 255 / 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < resolution; i++) {
      ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, S);
      ctx.moveTo(0, i * cell); ctx.lineTo(S, i * cell);
    }
    ctx.stroke();
  }

  // The exact triangle the vertex shader produced.
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = 'rgb(255 255 255 / 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  if (hovered) {
    const cx = (hovered.ix + 0.5) * cell;
    const cy = (hovered.iy + 0.5) * cell;

    // Lines from the pixel center to each vertex; thicker = larger weight.
    if (showWeights && weights && weights.every((w) => w >= 0)) {
      pts.forEach(([x, y], i) => {
        ctx.strokeStyle = css(colors[i]);
        ctx.lineWidth = 1 + weights[i] * 9;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
      });
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(hovered.ix * cell, hovered.iy * cell, cell, cell);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  pts.forEach(([x, y], i) => {
    ctx.fillStyle = css(colors[i]);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`v${i}`, x, y - HANDLE_RADIUS - 6);
  });
}
