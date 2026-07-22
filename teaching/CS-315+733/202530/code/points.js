// points.js (DEPRECATED)
// This file was kept as a fallback but generation now uses
// `points.worker.js`. Importing this file will throw so callers
// are forced to use the worker-based API.

export function generatePointsChunks() {
  throw new Error('generatePointsChunks() is deprecated — use the worker-based API in main.js');
}
