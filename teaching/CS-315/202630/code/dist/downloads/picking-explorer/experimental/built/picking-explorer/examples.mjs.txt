// The picking explorer's menu. Each preset sets the state that shows one idea.

export const METHODS = {
    faceColours: { label: "Six face colours, as pickCube (RGBA8)", gpu: true },
    idRGBA8: { label: "Object and face id in the RGB bytes (RGBA8)", gpu: true },
    idUint: { label: "Object and face id in an integer target (R32UI)", gpu: true },
};

export const PRESET_KEYS = ["scene", "method", "strategy", "depth", "region", "coords", "when", "view", "rotate", "axis", "spinSpeed", "azimuth", "elevation", "distance"];

export const GROUPS = ["Your samples", "What goes wrong", "Better ways"];

// The samples' own pages put the canvas 8 px from the corner; on this page their window-coordinate
// formula would miss by far more, so only the "Window vs canvas coordinates" example uses it.
const sample = { scene: "single", method: "faceColours", strategy: "separate", depth: false, region: "full", coords: "canvas", when: "click", view: "scene", rotate: true, distance: 3.2, elevation: 0, azimuth: 0 };

export const EXAMPLES = [
    {
        id: "pickCube", group: "Your samples", label: "pickCube: six face colours",
        look: "As pickCube does it: on a click, draw each face in its own flat colour into an off-screen framebuffer, read the one pixel under the mouse, and decide which colour it is. The result table shows what the samples would print. Show the pick buffer to see what is read.",
        preset: { ...sample },
    },
    {
        id: "pickCube2", group: "Your samples", label: "pickCube2: face names that are wrong",
        look: "pickCube2 prints a face name (front, back, ...) instead of a colour, but its table of names does not match colorCube(): it calls the front face 'right', the right face 'top', and only 'bottom' is correct. The result table shows its answer beside the face that was really clicked.",
        preset: { ...sample, rotate: false },
    },
    {
        id: "pickCube3", group: "Your samples", label: "pickCube3: the pick colour is only a key",
        look: "pickCube3 names the face by the colour it is DRAWN in, which differs from the colour it is PICKED in (the front face is picked as red and drawn red; the right face is picked as green but drawn yellow). That indirection is the point: a pick colour is an id, not something to look at.",
        preset: { ...sample, rotate: false, view: "pickBuffer" },
    },
    {
        id: "offset", group: "What goes wrong", label: "Window vs canvas coordinates",
        look: "The samples use x = clientX and y = canvas.height − clientY, which are window coordinates. On their bare pages the canvas sits 8 px from the corner, so the pick lands 8 px off; on this page, with the canvas further in and scaled by CSS, it lands far off. The cross marks where you clicked, the circle where the pixel was actually read.",
        preset: { ...sample, rotate: false, coords: "sample", view: "scene" },
    },
    {
        id: "nodepth", group: "What goes wrong", label: "Overlapping cubes, no depth buffer",
        look: "The samples' pick framebuffer has no depth buffer. One convex cube with back faces culled never overlaps itself, so it works. With several cubes, whichever is drawn LAST wins, not the nearest. Click where cubes overlap and compare with the ray cast; tick the depth buffer to fix it. Show the pick buffer to see the draw order.",
        preset: { scene: "stack", method: "idRGBA8", strategy: "separate", depth: false, region: "full", coords: "canvas", when: "click", view: "pickBuffer", rotate: false, distance: 6, elevation: 12, azimuth: 20 },
    },
    {
        id: "nobject", group: "What goes wrong", label: "Face colours cannot tell objects apart",
        look: "Six colours name six faces of one cube. With several cubes, a red pixel is the front face of SOME cube. Encode the object too: the next examples do.",
        preset: { scene: "stack", method: "faceColours", strategy: "separate", depth: true, region: "full", coords: "canvas", when: "hover", view: "pickBuffer", rotate: false, distance: 6, elevation: 12, azimuth: 20 },
    },
    {
        id: "rgba8", group: "Better ways", label: "Ids in the colour bytes",
        look: "object × 6 + face + 1, split over the red, green and blue bytes: 16.7 million ids in an ordinary RGBA8 target. Writing n/255 into an 8-bit channel reads back as exactly n.",
        preset: { scene: "stack", method: "idRGBA8", strategy: "separate", depth: true, region: "full", coords: "canvas", when: "hover", view: "scene", rotate: true, spinSpeed: 15, distance: 6, elevation: 12, azimuth: 20 },
    },
    {
        id: "uint", group: "Better ways", label: "Integer ids (R32UI)",
        look: "WebGL2 can render to integer textures: the fragment shader writes a uint, and readPixels with RGBA_INTEGER returns it unchanged. No packing, no rounding.",
        preset: { scene: "stack", method: "idUint", strategy: "separate", depth: true, region: "full", coords: "canvas", when: "hover", view: "scene", rotate: true, spinSpeed: 15, distance: 6, elevation: 12, azimuth: 20 },
    },
    {
        id: "pixel", group: "Better ways", label: "A 1 × 1 pick buffer and a pick matrix",
        look: "Only one pixel is ever read, so render only that pixel: a 1 × 1 framebuffer, and a matrix after the projection that blows the pixel under the mouse up to fill clip space (what gluPickMatrix did). Same answer, a fraction of the fill.",
        preset: { scene: "stack", method: "idUint", strategy: "separate", depth: true, region: "pixel", coords: "canvas", when: "hover", view: "scene", rotate: true, spinSpeed: 15, distance: 6, elevation: 12, azimuth: 20 },
    },
    {
        id: "mrt", group: "Better ways", label: "Ids in the main pass (multiple render targets)",
        look: "The scene is drawn once into a framebuffer with two colour attachments: the lit image and the ids. The image is copied to the screen with blitFramebuffer, and a pick just reads the id attachment of the frame already drawn: no extra pass.",
        preset: { scene: "stack", method: "idUint", strategy: "mrt", depth: true, region: "full", coords: "canvas", when: "hover", view: "scene", rotate: true, spinSpeed: 15, distance: 6, elevation: 12, azimuth: 20 },
    },
];

export const exampleById = (id) => EXAMPLES.find((e) => e.id === id);
