// The light-view explorer's menu and comparisons. No DOM, no GL.

export const STORAGE_INDEX = { oneChannel: 0, packed: 1, depthTexture: 2 };
export const PROJECTOR_INDEX = { off: 0, correct: 1, sample: 2 };

export const COMPARES = {
    off: { label: "Off" },
    storage: {
        label: "Depth in one 8-bit channel | a 24-bit depth texture",
        left: { storage: "oneChannel" }, right: { storage: "depthTexture" },
        note: "Left: shadowMap.js stores gl_FragCoord.z in an RGBA8 colour: 256 depth levels, about 0.03 world units apart at the cube. Right: a DEPTH_COMPONENT24 depth texture, compared in hardware. Set the bias to 0 to see the difference.",
    },
    packed: {
        label: "One 8-bit channel | depth packed into 4 bytes",
        left: { storage: "oneChannel" }, right: { storage: "packed" },
        note: "Both use an RGBA8 colour target. Left: the depth in one channel. Right: split over all four bytes, about 32 bits of precision, the usual trick before depth textures.",
    },
    bias: {
        label: "Bias 0 | the chosen bias",
        left: { bias: 0 }, right: {},
        note: "Left: no bias: each surface's own depth, rounded, is compared with itself, and about half the comparisons fail (shadow acne). Right: the bias chosen below. Too much bias detaches shadows from their objects (peter panning).",
    },
    pcf: {
        label: "One sample | 5 × 5 percentage-closer filtering",
        left: { pcf: 0 }, right: { pcf: 2 },
        note: "Left: one comparison per fragment, so the shadow edge follows the shadow map's texels. Right: the average of 25 comparisons around it, which softens the edge. (Averaging depths instead, then comparing once, would be wrong.)",
    },
    projector: {
        label: "projectiveTexture.js's projector | the correct projector",
        left: { projector: "sample" }, right: { projector: "correct" },
        note: "Left: as projectiveTexture.js: 0.5*clip.xyz + 0.5, then textureProj divides by the third component, not by w, and the projector sits at normalize(lightPosition), 1 unit from the origin. Right: divide by w, then map [-1, 1] to [0, 1], from the light's real position. Only the right one shows the circular slide undistorted.",
    },
};

export function configsFor(state) {
    const base = { storage: state.storage, bias: state.bias, slopeBias: state.slopeBias, pcf: state.pcf, projector: state.projector };
    if (state.compare === "off" || !COMPARES[state.compare]) return [{ side: "all", ...base }];
    const c = COMPARES[state.compare];
    return [{ side: "left", ...base, ...c.left }, { side: "right", ...base, ...c.right }];
}

export const PRESET_KEYS = ["storage", "bias", "slopeBias", "pcf", "mapSize", "shadows", "sampleShading", "ambient", "projector", "floor", "triangle", "view", "inset", "compare",
    "sampleCamera", "cameraAzimuth", "cameraElevation", "cameraDistance", "sampleLight", "lightAzimuth", "lightElevation", "lightDistance", "orbitLight", "rotate"];

export const GROUPS = ["Your samples", "Shadow maps", "Projected textures"];

export const EXAMPLES = [
    {
        id: "shadowMap", group: "Your samples", label: "shadowMap: a cube and a triangle",
        look: "shadowMap.js: the scene is drawn from the light into a texture that keeps each pixel's depth; then from the camera, where each fragment is moved into the light's view and compared with the stored depth. Shadowed fragments are black, lit ones keep their colour, and there is no floor, so the only shadow is the triangle's, on the cube.",
        preset: { storage: "oneChannel", bias: 0.005, sampleShading: true, floor: false, sampleCamera: true, sampleLight: true, inset: true, rotate: false },
    },
    {
        id: "shadowMapFloor", group: "Your samples", label: "shadowMap with a floor and lighting",
        look: "The same light and storage, with a floor to catch the shadows and diffuse lighting, so shadowed surfaces are dark rather than black and back faces are not mistaken for shadow. Rotate the cube.",
        preset: { storage: "oneChannel", bias: 0.005, floor: true, sampleLight: true, rotate: true },
    },
    {
        id: "projectiveTexture", group: "Your samples", label: "projectiveTexture: the slide projector",
        look: "projectiveTexture.js projects a checkerboard disc from a light onto the cube. Left: its maths. Right: the correct projection, which keeps the disc circular and the checks square on the floor.",
        preset: { projector: "sample", compare: "projector", shadows: false, sampleLight: false, lightAzimuth: 30, lightElevation: 40, lightDistance: 4.5, floor: true, inset: false },
    },
    {
        id: "acne", group: "Shadow maps", label: "Shadow acne, and why 8 bits makes it worse",
        look: "With no bias, every lit surface tests its own depth against a rounded copy of itself, so about half the tests fail and the surface is striped. The 8-bit map (left) rounds to 1/255, so its stripes are wide; the 24-bit depth texture (right) rounds far less. Show 'depth from the light minus stored depth' to see the rounding.",
        preset: { compare: "storage", bias: 0, floor: true, sampleLight: true },
    },
    {
        id: "bias", group: "Shadow maps", label: "Bias: acne vs peter panning",
        look: "Left: bias 0. Right: a large bias (0.03): the acne is gone, but shadows now start some way from the objects that cast them. Slope-scaled bias grows with the angle between the surface and the light, so flat-on surfaces need less.",
        preset: { compare: "bias", bias: 0.03, storage: "depthTexture", floor: true, sampleLight: true },
    },
    {
        id: "packed", group: "Shadow maps", label: "Packing depth into 4 bytes",
        look: "Before depth textures, depth was split over the four bytes of an RGBA8 colour: about 32 bits of precision in a colour target. The inset shows the packed map decoded.",
        preset: { compare: "packed", bias: 0.0005, floor: true, sampleLight: true },
    },
    {
        id: "pcf", group: "Shadow maps", label: "Soft edges: percentage-closer filtering",
        look: "A 256 × 256 shadow map makes blocky shadow edges (left). Comparing at 25 points and averaging the results softens them (right).",
        preset: { compare: "pcf", mapSize: 256, storage: "depthTexture", bias: 0.003, floor: true, sampleLight: false, lightAzimuth: 40, lightElevation: 45, lightDistance: 5, orbitLight: true },
    },
    {
        id: "lightView", group: "Shadow maps", label: "The shadow map itself",
        look: "What the light pass stores, seen from the light. The 8-bit map shows bands, each one depth level.",
        preset: { view: "lightDepth", storage: "oneChannel", floor: true, sampleLight: true, rotate: true },
    },
    {
        id: "projector", group: "Projected textures", label: "Projector and shadows together",
        look: "The slide is projected from the light, and the shadow map stops it where something is in the way: the cube casts a shadow in the projected image.",
        preset: { projector: "correct", storage: "depthTexture", bias: 0.003, pcf: 1, floor: true, sampleLight: false, lightAzimuth: 25, lightElevation: 50, lightDistance: 4.5, orbitLight: true, ambient: 0.25 },
    },
];

export const exampleById = (id) => EXAMPLES.find((e) => e.id === id);
