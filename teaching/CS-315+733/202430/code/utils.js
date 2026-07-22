export function flatten(arr) {
  // arr is an array of arrays (e.g. [[x,y],[x,y],...]) or flat numbers
  if (!Array.isArray(arr)) return new Float32Array([arr]);
  const out = [];
  for (const v of arr) {
    if (Array.isArray(v)) out.push(...v);
    else out.push(v);
  }
  return new Float32Array(out);
}

export function randVec2() {
  return [2.0 * Math.random() - 1.0, 2.0 * Math.random() - 1.0];
}
