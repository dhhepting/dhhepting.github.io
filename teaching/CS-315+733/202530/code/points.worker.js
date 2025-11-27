// points.worker.js
// Module worker that generates chaos-game points in transferable ArrayBuffers.
import { mat3, vec3, mult } from './MVnew.js';

let cancelled = false;

self.onmessage = function (e) {
  const data = e.data;
  if (!data) return;

  if (data.cmd === 'cancel') {
    cancelled = true;
    return;
  }

  if (data.cmd === 'generate') {
    cancelled = false;
    const count = data.count >>> 0;
    const CHUNK = data.CHUNK || 4096;
    const centres = data.centres; // Float32Array length 6
    const baseColours = data.baseColours; // Float32Array length (ncol*4)
    const xformsFlat = data.xforms; // array of 3 Float32Array/Array (length 9 each)

    // Convert flattened matrices into mat3 objects via mat3(flatArray)
    const xforms = xformsFlat.map(f => mat3(f));

    let i = 0;
    let currx = centres[0];
    let curry = centres[1];
    let newx = currx;
    let newy = curry;
    let xf = 0;
    let mrxf = 0;

    function step() {
      if (cancelled) {
        self.postMessage({ type: 'cancelled' });
        return;
      }
      const end = Math.min(i + CHUNK, count);
      const num = end - i;
      const posBuf = new Float32Array(num * 2);
      const colBuf = new Float32Array(num * 4);
      let idx = 0;
      for (; i < end; ++i) {
        mrxf = xf;
        xf = Math.floor(Math.random() * 3);
        const xfmat = xforms[xf];
        const res = mult(xfmat, vec3(currx, curry, 1.0));
        newx = res[0];
        newy = res[1];
        posBuf[idx * 2] = newx;
        posBuf[idx * 2 + 1] = newy;
        const colourIndex = 1 + (xf * 3 + mrxf);
        const baseIdx = (colourIndex % (baseColours.length / 4)) * 4;
        // copy colour
        colBuf[idx * 4] = baseColours[baseIdx];
        colBuf[idx * 4 + 1] = baseColours[baseIdx + 1];
        colBuf[idx * 4 + 2] = baseColours[baseIdx + 2];
        colBuf[idx * 4 + 3] = baseColours[baseIdx + 3];
        currx = newx;
        curry = newy;
        idx++;
      }

      // send chunk with transferable buffers
      self.postMessage({ type: 'chunk', pos: posBuf.buffer, col: colBuf.buffer, producedSoFar: i }, [posBuf.buffer, colBuf.buffer]);

      if (i < count) {
        // schedule next chunk
        setTimeout(step, 0);
      } else {
        self.postMessage({ type: 'done', total: i });
      }
    }

    // start
    setTimeout(step, 0);
  }
};
