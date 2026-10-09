# Vertex and fragment shaders, working together (WebGL2)

Drag the three vertices, change the image size, and hover a pixel to follow one
fragment from the vertex shader's outputs to the color the GPU wrote.

## Run

    npm install
    npm run dev      # then open the printed localhost URL
    npm run build

Shaders live in `src/shaders/*.vert|*.frag` and are imported as strings with
Vite's `?raw` suffix, so there is no inline shader text in the JavaScript.
ES modules need a server; opening `index.html` from `file://` will not work.

## Layout

- `Common/MV.mjs`, `Common/initShadersJS.mjs`  course libraries, unchanged
- `src/ShaderDemo.mjs`  DOM-free renderer (programs via `initShaders`, VAO, buffers, readback)
- `src/main.mjs`        controller: DOM, pointer events, readouts
- `src/overlay.mjs`     2D overlay: grid, handles, hovered-pixel weights
- `src/math.mjs`        CPU mirror of vertex transform and rasterizer interpolation (uses MV.mjs)
- `src/shaders/`        `triangle.vert`, `color.frag`, `barycentric.frag`, `fragcoord.frag`

To share one `Common/` between projects, move it up a level and change the
`../Common/` imports.
