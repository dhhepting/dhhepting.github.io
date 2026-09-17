// cube.js
// A DOM-free renderer for a unit colour cube. It knows only about `gl` and a
// linked `program`; the controller (main.js) owns the canvas, the render loop,
// and all matrix math. Dependency flows controller -> renderer only.
//
// Two draw modes share one set of eight coloured vertices:
//   'solid' - the filled colour cube (12 triangles).
//   'edges' - the 12 edges as colour ramps, plus the black->white body
//             diagonal, which reads as a greyscale (achromatic) axis.

export class Cube {
  constructor(gl, program) {
    this.gl = gl;
    this.program = program;

    // The 8 corners of the UNIT cube in [0, 1]^3.
    //
    // colour === position: a corner at (x, y, z) is coloured (r, g, b) =
    // (x, y, z), so the palette falls out of the geometry with no lookup:
    //
    //   0 (0,0,0) black          4 (0,0,1) blue
    //   1 (1,0,0) red            5 (1,0,1) magenta  (red + blue)
    //   2 (1,1,0) yellow (r+g)   6 (1,1,1) white    (red + green + blue)
    //   3 (0,1,0) green          7 (0,1,1) cyan     (green + blue)
    //
    // Note the complementary pairs sit across the body diagonal:
    //   red(1) <-> cyan(7),  green(3) <-> magenta(5),  blue(4) <-> yellow(2),
    //   black(0) <-> white(6). That is the RGB <-> CMY relationship.
    const positions = new Float32Array([
      0, 0, 0, // 0 black
      1, 0, 0, // 1 red
      1, 1, 0, // 2 yellow
      0, 1, 0, // 3 green
      0, 0, 1, // 4 blue
      1, 0, 1, // 5 magenta
      1, 1, 1, // 6 white
      0, 1, 1, // 7 cyan
    ]);

    // Colours are, by construction, identical to the positions. We upload the
    // same data as an explicit colour attribute so the shader stays general
    // (it does not assume colour == position).
    const colors = positions;

    // --- Solid: 12 triangles (2 per face). Left unculled and depth-tested,
    // so every face shows regardless of winding. ---
    const solidIndices = new Uint16Array([
      0, 1, 5, 0, 5, 4, // bottom  (y = 0)
      3, 7, 6, 3, 6, 2, // top     (y = 1)
      4, 5, 6, 4, 6, 7, // front   (z = 1)
      1, 0, 3, 1, 3, 2, // back    (z = 0)
      1, 2, 6, 1, 6, 5, // right   (x = 1)
      0, 4, 7, 0, 7, 3, // left    (x = 0)
    ]);

    // --- Edges: the 12 edges of the cube as line pairs. Each edge is a colour
    // ramp between its two corners. The three edges leaving black (0) are the
    // pure R/G/B axes; the three edges reaching white (6) are the C/M/Y axes. ---
    const edgeIndices = new Uint16Array([
      0, 1, 1, 2, 2, 3, 3, 0, // bottom face loop (z = 0)
      4, 5, 5, 6, 6, 7, 7, 4, // top face loop    (z = 1)
      0, 4, 1, 5, 2, 6, 3, 7, // the four verticals
    ]);

    // --- Diagonal: black (0,0,0) to white (1,1,1). Colour interpolates as
    // (t, t, t), i.e. a pure greyscale ramp -- the HSB brightness axis and the
    // K (black) channel of CMYK. ---
    const diagonalIndices = new Uint16Array([0, 6]);

    // Attribute / uniform locations, looked up once.
    this.positionLoc = gl.getAttribLocation(program, 'aPosition');
    this.colorLoc = gl.getAttribLocation(program, 'aColor');
    this.mvpLoc = gl.getUniformLocation(program, 'uMVP');

    // Shared vertex data: uploaded once, referenced by every VAO below.
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    // One self-contained VAO per primitive set. Each wires the shared
    // position/colour buffers plus its own element (index) buffer.
    this.solid = this._makeIndexedVao(positionBuffer, colorBuffer, solidIndices);
    this.edges = this._makeIndexedVao(positionBuffer, colorBuffer, edgeIndices);
    this.diagonal = this._makeIndexedVao(positionBuffer, colorBuffer, diagonalIndices);
  }

  // Build a VAO that binds the shared attribute buffers and its own index
  // buffer. Returns { vao, count } for drawElements.
  _makeIndexedVao(positionBuffer, colorBuffer, indices) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(this.positionLoc);
    gl.vertexAttribPointer(this.positionLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.enableVertexAttribArray(this.colorLoc);
    gl.vertexAttribPointer(this.colorLoc, 3, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    return { vao, count: indices.length };
  }

  // Draw the cube with the supplied model-view-projection matrix.
  // mode is 'solid' (filled faces) or 'edges' (wireframe + grey diagonal).
  draw(mvp, mode = 'solid') {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.mvpLoc, false, mvp);

    if (mode === 'edges') {
      gl.bindVertexArray(this.edges.vao);
      gl.drawElements(gl.LINES, this.edges.count, gl.UNSIGNED_SHORT, 0);

      gl.bindVertexArray(this.diagonal.vao);
      gl.drawElements(gl.LINES, this.diagonal.count, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.bindVertexArray(this.solid.vao);
      gl.drawElements(gl.TRIANGLES, this.solid.count, gl.UNSIGNED_SHORT, 0);
    }

    gl.bindVertexArray(null);
  }
}
