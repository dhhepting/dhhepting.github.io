// zoomer.mjs
// A DOM-free renderer that draws one texture across a full-canvas quad and can
// magnify it toward a focus point. It knows only about `gl` and a linked
// `program`; the controller (main.mjs) owns the canvas, the render loop, and
// all of the SVG rasterization. Dependency flows controller -> renderer only,
// so this file never touches `document`.
//
// The same Zoomer drives BOTH panels in the demo -- identical geometry,
// identical shader. The only differences are the texture handed to setTexture()
// and the filter chosen in the constructor:
//
//   sharp panel   LINEAR filter, texture re-rasterized from the SVG each frame
//                 at display resolution -> stays crisp at any zoom.
//   frozen panel  NEAREST filter, texture rasterized ONCE at N x N and never
//                 refreshed -> its texels grow into visible blocks on zoom.

export class Zoomer {
  // filter is gl.NEAREST or gl.LINEAR, applied to both min and mag.
  constructor(gl, program, filter = gl.LINEAR) {
    this.gl = gl;
    this.program = program;
    this.filter = filter;

    // Attribute / uniform locations, looked up once.
    this.positionLoc = gl.getAttribLocation(program, 'aPosition');
    this.texCoordLoc = gl.getAttribLocation(program, 'aTexCoord');
    this.centerLoc = gl.getUniformLocation(program, 'uCenter');
    this.zoomLoc = gl.getUniformLocation(program, 'uZoom');
    this.imageLoc = gl.getUniformLocation(program, 'uImage');

    // One quad as a triangle strip: interleaved [clipX, clipY, u, v] per vertex.
    // Texcoords put (0,0) at the image's TOP-left so screen-up == image-up,
    // which makes the focus point and mouse clicks line up without any flips.
    //
    //   (-1, 1) uv(0,0) ---- ( 1, 1) uv(1,0)
    //      |                     |
    //   (-1,-1) uv(0,1) ---- ( 1,-1) uv(1,1)
    const vertices = new Float32Array([
      -1, -1, 0, 1, // bottom-left
       1, -1, 1, 1, // bottom-right
      -1,  1, 0, 0, // top-left
       1,  1, 1, 0, // top-right
    ]);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const stride = 4 * Float32Array.BYTES_PER_ELEMENT; // 4 floats per vertex
    gl.enableVertexAttribArray(this.positionLoc);
    gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.texCoordLoc);
    gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, stride,
      2 * Float32Array.BYTES_PER_ELEMENT);

    gl.bindVertexArray(null);

    // The texture. Filter and wrap are fixed here; the pixels arrive later via
    // setTexture(). CLAMP_TO_EDGE so sampling just past an edge repeats the
    // border rather than wrapping around.
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Remembered so a same-size refresh can reuse the allocation (see below).
    this._texWidth = 0;
    this._texHeight = 0;
  }

  // Swap the filter at runtime (used to show that LINEAR only blurs the frozen
  // blocks -- it cannot invent detail that was never rasterized).
  setFilter(filter) {
    const gl = this.gl;
    this.filter = filter;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  }

  // Upload pixels from `source` (a canvas, ImageBitmap, or ImageData supplied
  // by the controller -- decoding is the controller's job, not ours).
  //
  // When the dimensions match the previous upload we reuse the existing storage
  // with texSubImage2D instead of reallocating with texImage2D. The sharp panel
  // re-uploads a fixed-size texture every frame, so avoiding a per-frame
  // reallocation keeps that hot path cheap.
  setTexture(source) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    if (source.width === this._texWidth && source.height === this._texHeight) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      this._texWidth = source.width;
      this._texHeight = source.height;
    }
  }

  // Draw the quad, magnifying `zoom`x toward `center` ([u, v] in [0,1]).
  // Pass zoom = 1 to draw the texture as-is (the sharp panel does this, because
  // its zoom is already baked into the pixels it just rasterized).
  draw(zoom, center) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniform1f(this.zoomLoc, zoom);
    gl.uniform2f(this.centerLoc, center[0], center[1]);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.imageLoc, 0);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }
}
