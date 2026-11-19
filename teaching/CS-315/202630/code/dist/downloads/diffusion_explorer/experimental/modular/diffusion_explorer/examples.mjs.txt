// The diffusion explorer's menu, and how a side-by-side comparison splits the
// settings between its two simulations. No DOM, no GL.

export const FORMATS = {
    rgba8: { label: "RGBA8, 8 bits per channel (the samples)", float: false },
    rgba16f: { label: "RGBA16F, half float", float: true },
    rgba32f: { label: "RGBA32F, float", float: true },
};

// Each comparison names what the left and right simulations override; everything
// else is shared, so the two differ in exactly that.
export const COMPARES = {
    off: { label: "Off: one simulation" },
    rule: {
        label: "Textbook 4-neighbour average | 5-point average",
        left: { rule: "average4" }, right: { rule: "average5" },
        note: "Left: the average of the 4 neighbours, as in render3, render4 and particleDiffusion. A texel's new value never depends on its own old value, so the even and odd texels of a checkerboard trade places every step and never mix. Right: the centre is included, which damps that pattern.",
    },
    rate: {
        label: "render5's rate 0.5 | a stable rate 0.2",
        left: { rule: "heat", rate: 0.5 }, right: { rule: "heat", rate: 0.2 },
        note: "Both are u + r(sum of 4 neighbours - 4u). The checkerboard pattern is multiplied by 1 - 8r per step: by -3 at r = 0.5, so it grows, and by -0.6 at r = 0.2, so it decays. Stable needs r <= 0.25. An RGBA8 target clamps the growth to [0, 1], which leaves stripes instead of an explosion.",
    },
    format: {
        label: "RGBA8 | RGBA16F",
        left: { format: "rgba8" }, right: { format: "rgba16f" },
        note: "Same rule, different storage. In 8 bits every step rounds to a multiple of 1/255: small differences stop diffusing, and the total (the mean in the chart) drifts. Half floats keep both.",
    },
    boundary: {
        label: "Clamp to the edge | wrap around",
        left: { boundary: "clamp" }, right: { boundary: "repeat" },
        note: "Left: a texel past the edge reads the edge texel, so nothing flows out. Right: the texture is a torus, so what leaves one side comes back on the other.",
    },
    samplesWrap: {
        label: "render3/render4's alternating wrap | clamp",
        left: { boundary: "alternate" }, right: { boundary: "clamp" },
        note: "render3 and render4 set CLAMP_TO_EDGE on texture2 but leave texture1 at the default REPEAT, and the two take turns as the source. Left: wrap on one step, clamp on the next, as they do. Right: clamp every step. Watch the edges.",
    },
    kernel: {
        label: "Edge kernel: hawaiisobel (1, 3, 1) | Sobel (1, 2, 1)/8",
        left: { view: "edges", kernel: 1 }, right: { view: "edges", kernel: 2 },
        note: "Display only: the same image, two edge detectors. hawaiisobel's weights are (1, 3, 1) and its result is not normalized, so a full step gives 5 and most edges saturate. Sobel's are (1, 2, 1); dividing by 8 makes a full step give 1.",
    },
};

/** The settings each simulation uses: one, or a left and a right. */
export function simConfigs(state) {
    const base = {
        rule: state.rule, rate: state.rate, format: state.format, boundary: state.boundary, decay: state.decay,
        view: state.view, kernel: state.kernel,
    };
    const compare = COMPARES[state.compare];
    if (!compare || state.compare === "off") return [{ side: "all", ...base }];
    return [
        { side: "left", ...base, ...compare.left },
        { side: "right", ...base, ...compare.right },
    ];
}

/** The boundary rule a simulation uses on a given step ("alternate" reproduces render3/render4). */
export const boundaryForStep = (boundary, step) => (boundary === "alternate" ? (step % 2 === 0 ? "repeat" : "clamp") : boundary);

// Every state key a preset may set.
export const PRESET_KEYS = [
    "seed", "size", "rule", "rate", "format", "boundary", "decay", "stepsPerFrame", "running",
    "feed", "kill", "particles", "particleCount", "particleSize", "particleStep", "view", "channel", "kernel", "gain", "compare",
];

export const GROUPS = ["Your samples", "Comparisons", "Beyond the samples"];

export const EXAMPLES = [
    {
        id: "render3", group: "Your samples", label: "render3: the gasket diffuses",
        look: "render3 draws the Sierpinski gasket into a texture once, then averages each texel's 4 neighbours every frame, ping-ponging between two textures. The red channel is 1 everywhere, so only green and blue (the white) spread. Turn the gain up on 'one channel' views to see the faint checkerboard texture in the green channel.",
        preset: { seed: "gasket", size: 1024, rule: "average4", format: "rgba8", boundary: "alternate", view: "stored" },
    },
    {
        id: "render4", group: "Your samples", label: "render4: one triangle, 4-neighbour average",
        look: "render4 is render3 with a single triangle. Its fragment shader computes a threshold and then overwrites it with fColor = t, so the threshold has no effect; that is what runs here.",
        preset: { seed: "triangle", size: 1024, rule: "average4", format: "rgba8", boundary: "alternate", view: "stored" },
    },
    {
        id: "render5", group: "Your samples", label: "render5: the explicit heat step, r = 0.5",
        look: "render5 adds r times the discrete Laplacian. At r = 0.5 the step is unstable; RGBA8 clamps the values to [0, 1], so instead of blowing up the image grows a band of alternating 0/1 stripes along every edge. The comparison shows r = 0.2 beside it.",
        preset: { seed: "triangle", size: 512, rule: "heat", rate: 0.5, format: "rgba8", boundary: "clamp", view: "stored", compare: "rate" },
    },
    {
        id: "particleDiffusion", group: "Your samples", label: "particleDiffusion: random walkers leave trails",
        look: "1000 points take random steps each frame and are drawn into the state, which is then averaged. Half are magenta, half green. The sample's green is (0, 9, 0), clamped to 1 by RGBA8; in a float format it would be 9 times too bright, so this page uses (0, 1, 0).",
        preset: { seed: "empty", size: 1024, rule: "average4", format: "rgba8", boundary: "clamp", particles: true, particleCount: 1000, particleSize: 10, particleStep: 0.01, view: "stored" },
    },
    {
        id: "hatImage", group: "Your samples", label: "hatImage1: sin(r)/r in false colour",
        look: "hatImage1's texture and colour mapping: green folded at 0.5, blue inverted. No simulation runs (rule: none); change the rule to see the hat diffuse.",
        preset: { seed: "hat", size: 256, rule: "none", format: "rgba8", view: "falseColour" },
    },
    {
        id: "hawaii", group: "Your samples", label: "hawaiiImage / hawaiiIsobel: edges of Honolulu",
        look: "The edge detectors of hawaiiImage (central differences x 10) and hawaiiIsobel. The comparison puts hawaiisobel's (1, 3, 1) kernel beside a normalized Sobel. The samples upload the data with row 0 at the bottom, so they show the island upside down; here north is up.",
        preset: { seed: "honolulu", size: 256, rule: "none", format: "rgba8", view: "edges", kernel: 1, compare: "kernel" },
    },
    {
        id: "cmp-checker", group: "Comparisons", label: "One texel: checkerboard flicker",
        look: "A single lit texel. With the 4-neighbour average (left) all its value sits on texels whose i + j has the same parity as the step count: the pattern flips every step and never fills in. With the centre included (right) it spreads into a smooth blob. Step one frame at a time to see it.",
        preset: { seed: "impulse", size: 64, rule: "average4", format: "rgba16f", boundary: "clamp", view: "heat", channel: 0, gain: 40, compare: "rule", running: false },
    },
    {
        id: "cmp-format", group: "Comparisons", label: "8 bits vs half float: where the heat goes",
        look: "A white square diffusing with a stable step. The chart plots the mean of the red channel for both: half floats keep it constant, as diffusion should; 8-bit rounding changes it, and the 8-bit image stops changing once neighbours differ by less than 1/255.",
        preset: { seed: "block", size: 128, rule: "heat", rate: 0.2, format: "rgba8", boundary: "repeat", view: "heat", channel: 0, gain: 4, compare: "format", stepsPerFrame: 10 },
    },
    {
        id: "cmp-boundary", group: "Comparisons", label: "Boundaries: clamp vs wrap",
        look: "Particles near the edges and a stable step. On the right, trails leave one side and re-enter on the other.",
        preset: { seed: "empty", size: 256, rule: "heat", rate: 0.2, format: "rgba16f", decay: 0.995, particles: true, particleCount: 200, particleSize: 4, particleStep: 0.02, view: "stored", compare: "boundary" },
    },
    {
        id: "cmp-samplewrap", group: "Comparisons", label: "render3/render4's mixed wrap modes",
        look: "Left: wrap on even steps, clamp on odd ones, as the two textures of render3 and render4 alternate. Right: clamp always. The red triangle touches the bottom edge, so on the left some of it leaks to the top.",
        preset: { seed: "triangle", size: 256, rule: "average5", format: "rgba16f", view: "stored", compare: "samplesWrap", stepsPerFrame: 4 },
    },
    {
        id: "grayScott", group: "Beyond the samples", label: "Gray-Scott reaction-diffusion",
        look: "Two chemicals: U feeds the reaction U + 2V -> 3V and diffuses twice as fast as V. Feed and kill rates choose the pattern: about (0.055, 0.062) gives spots and worms, (0.035, 0.065) mazes, (0.014, 0.054) moving waves. Needs floats; paint to add V.",
        preset: { seed: "grayScott", size: 256, rule: "grayScott", format: "rgba16f", boundary: "repeat", view: "grayScott", stepsPerFrame: 12, feed: 0.055, kill: 0.062, gain: 1 },
    },
    {
        id: "grayScott8", group: "Beyond the samples", label: "Gray-Scott in RGBA8 vs RGBA16F",
        look: "Many of the reaction's changes per step are smaller than 1/255, so in 8 bits they round away. The 8-bit spots (left) grow more slowly and stay smaller than the half-float ones (right); try other feed and kill rates to see the two diverge further.",
        preset: { seed: "grayScott", size: 256, rule: "grayScott", format: "rgba16f", boundary: "repeat", view: "grayScott", stepsPerFrame: 12, feed: 0.055, kill: 0.062, gain: 1, compare: "format" },
    },
    {
        id: "trails", group: "Beyond the samples", label: "Particle trails that fade",
        look: "The particles of particleDiffusion with a stable 5-point average and a decay factor, so trails fade instead of filling the screen.",
        preset: { seed: "empty", size: 512, rule: "average5", format: "rgba16f", boundary: "repeat", decay: 0.99, particles: true, particleCount: 2000, particleSize: 3, particleStep: 0.008, view: "stored", stepsPerFrame: 1 },
    },
];

export const exampleById = (id) => EXAMPLES.find((e) => e.id === id);
