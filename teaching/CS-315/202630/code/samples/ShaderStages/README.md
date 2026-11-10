# ShaderStages (WebGL2): see vertex and fragment shaders working together

Drag the three vertices, change the image size, and hover a pixel to follow one
fragment from the vertex shader's outputs to the color the GPU wrote.

## Run

    npm install
    npm run dev      # then open the printed localhost URL
    npm run build

Shaders live in `./shaders/*.vert.glsl|*.frag.glsl` and are fetched as strings, so there is no inline shader text in the JavaScript.
ES modules need a server; opening `app.html` from `file://` will not work.

## Layout

- `../../Common/MV.mjs`, `../../Common/initShadersJS.mjs`  course libraries, unchanged
- `./ShaderDemo.mjs`  DOM-free renderer (programs via `initShaders`, VAO, buffers, readback)
- `./main.mjs`        controller: DOM, pointer events, readouts
- `./overlay.mjs`     2D overlay: grid, handles, hovered-pixel weights
- `./math.mjs`        CPU mirror of vertex transform and rasterizer interpolation (uses MV.mjs)
- `./shaders/`        `triangle.vert.glsl`, `color.frag.glsl`, `barycentric.frag.glsl`, `fragcoord.frag..glsl`

`../../Common/` is shared between projects.
