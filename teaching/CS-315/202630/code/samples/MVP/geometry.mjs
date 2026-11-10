// DOM-free mesh builders.
// A mesh is { triangles?, lines? }; each part is { positions, colors } (Float32Array, 3 per vertex).
// Renderer uploads a mesh once and remembers it, so build meshes once, not every frame.

const pack = (verts, colours) => ({
  positions: new Float32Array(verts.flat()),
  colors: new Float32Array(colours.flat()),
});

// A cube centred on the origin, one colour per face (+x red, +y green, +z blue,
// darker for the negative sides) with light edges drawn on top.
export function colouredCube(half = 0.5, edgeColour = [0.92, 0.94, 0.95]) {
  const h = half;
  const corners = [
    [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h],
    [-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h],
  ];
  const faces = [
    { quad: [0, 1, 2, 3], colour: [0.25, 0.45, 0.95] },  // +z
    { quad: [5, 4, 7, 6], colour: [0.12, 0.22, 0.55] },  // -z
    { quad: [1, 5, 6, 2], colour: [0.93, 0.30, 0.30] },  // +x
    { quad: [4, 0, 3, 7], colour: [0.50, 0.14, 0.14] },  // -x
    { quad: [3, 2, 6, 7], colour: [0.30, 0.80, 0.40] },  // +y
    { quad: [4, 5, 1, 0], colour: [0.14, 0.42, 0.20] },  // -y
  ];
  const triVerts = [];
  const triColours = [];
  for (const { quad: [a, b, c, d], colour } of faces) {
    for (const i of [a, b, c, a, c, d]) {
      triVerts.push(corners[i]);
      triColours.push(colour);
    }
  }
  return { triangles: pack(triVerts, triColours), lines: wireCube(half, edgeColour).lines };
}

// The twelve edges of an axis-aligned cube. With half = 1 this is the
// normalized-device-coordinate cube (and, transformed, the camera's view volume).
export function wireCube(half = 1, colour = [0.95, 0.72, 0.29]) {
  const h = half;
  const c = [
    [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h],
    [-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h],
  ];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const verts = edges.flatMap(([a, b]) => [c[a], c[b]]);
  return { lines: pack(verts, verts.map(() => colour)) };
}

// Coordinate axes from the origin: x red, y green, z blue.
export function axes(length = 2) {
  const L = length;
  const verts = [[0, 0, 0], [L, 0, 0], [0, 0, 0], [0, L, 0], [0, 0, 0], [0, 0, L]];
  const colours = [[0.93, 0.30, 0.30], [0.93, 0.30, 0.30], [0.30, 0.80, 0.40], [0.30, 0.80, 0.40], [0.25, 0.45, 0.95], [0.25, 0.45, 0.95]];
  return { lines: pack(verts, colours) };
}
