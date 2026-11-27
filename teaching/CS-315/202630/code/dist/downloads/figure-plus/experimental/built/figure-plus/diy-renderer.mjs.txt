// diy-renderer.mjs -- the textbook's raw WebGL2 drawing code for the figure:
// one cube vertex buffer, one model-view uniform updated per body part,
// 6 TRIANGLE_FANs per cube. Shaders come from separate .vert/.frag files.

import { vec4, mat4, mult, translate, scale, ortho, flatten } from "./lib/mv.mjs";
import { initShadersJS, loadText } from "./lib/init-shaders.mjs";
import { PARTS, traverseFigure } from "./figure-model.mjs";

// Unit cube centred on the origin (the book's `vertices`).
const vertices = [
  vec4(-0.5, -0.5, 0.5, 1.0),
  vec4(-0.5, 0.5, 0.5, 1.0),
  vec4(0.5, 0.5, 0.5, 1.0),
  vec4(0.5, -0.5, 0.5, 1.0),
  vec4(-0.5, -0.5, -0.5, 1.0),
  vec4(-0.5, 0.5, -0.5, 1.0),
  vec4(0.5, 0.5, -0.5, 1.0),
  vec4(0.5, -0.5, -0.5, 1.0),
];

// Six quads (4 vertices each => 24 vertices, drawn as 6 TRIANGLE_FANs).
function buildCubePoints() {
  const points = [];
  const quad = (a, b, c, d) => points.push(vertices[a], vertices[b], vertices[c], vertices[d]);
  quad(1, 0, 3, 2);
  quad(2, 3, 7, 6);
  quad(3, 0, 4, 7);
  quad(6, 5, 1, 2);
  quad(4, 5, 6, 7);
  quad(5, 4, 0, 1);
  return points;
}

function hexToRgba(hex, a = 1) {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255, a];
}

const TEXTBOOK_RED = [1, 0, 0, 1];
const OUTLINE = [0.1, 0.1, 0.1, 1];

/**
 * Create the DIY renderer on a canvas. Async only because the shaders are
 * fetched as files.
 *
 * Options you can change at any time on the returned object:
 *   partColours : false = the book's flat red, true = a colour per body part
 *   outlines    : draw dark edges around each face
 */
export async function createDiyRenderer(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) throw new Error("WebGL 2.0 isn't available");

  const [vertexSource, fragmentSource] = await Promise.all([
    loadText(new URL("./shaders/figure.vert", import.meta.url)),
    loadText(new URL("./shaders/figure.frag", import.meta.url)),
  ]);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  // Push filled faces slightly back so outlines drawn on the same plane win.
  gl.enable(gl.POLYGON_OFFSET_FILL);
  gl.polygonOffset(1, 1);

  const program = initShadersJS(gl, vertexSource, fragmentSource);
  gl.useProgram(program);

  const modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
  const projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
  const colorLoc = gl.getUniformLocation(program, "uColor");

  const projectionMatrix = ortho(-10.0, 10.0, -10.0, 10.0, -10.0, 10.0);
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mat4()));

  const vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(buildCubePoints()), gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, "aPosition");
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  // The book's torso(), head(), leftUpperArm() ... were ten near-identical
  // functions. One function + the PARTS table does the same job:
  //   instanceMatrix = modelView * translate(0, h/2, 0) * scale(w, h, d)
  function drawPart(partName, modelViewMatrix) {
    const [w, h, d] = PARTS[partName].size;
    let instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * h, 0.0));
    instanceMatrix = mult(instanceMatrix, scale(w, h, d));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));

    gl.uniform4fv(colorLoc, api.partColours ? hexToRgba(PARTS[partName].color) : TEXTBOOK_RED);
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);

    if (api.outlines) {
      gl.uniform4fv(colorLoc, OUTLINE);
      for (let i = 0; i < 6; i++) gl.drawArrays(gl.LINE_LOOP, 4 * i, 4);
    }
  }

  const api = {
    partColours: true,
    outlines: true,
    gl,
    render() {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      traverseFigure((id, partName, modelViewMatrix) => drawPart(partName, modelViewMatrix));
    },
    dispose() {
      gl.deleteBuffer(vBuffer);
      gl.deleteProgram(program);
    },
  };
  return api;
}
