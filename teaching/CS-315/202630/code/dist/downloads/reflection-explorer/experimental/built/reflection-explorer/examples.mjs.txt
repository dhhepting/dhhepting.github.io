// The explorer's menu. Each example is a preset: the state (shape, environment,
// material, reflection settings, camera, comparison) that shows one idea. Choosing
// an example resets everything to the page's defaults and then applies the preset.

export const GROUPS = ["Your samples", "Environments and materials", "Comparisons"];

// Every state key a preset may set.
export const PRESET_KEYS = [
    "shape", "subdivisions", "rotX", "rotY", "rotZ", "spin", "spinAxis", "spinSpeed",
    "material", "tint", "reflectivity", "roughness", "ior", "dispersion", "shininess", "ambient",
    "lightFixedToCamera", "lightAzimuth", "lightElevation",
    "environment", "envSize", "envFilter", "envRotation", "envSource", "dynamicSize", "showObjects", "objectSpeed",
    "space", "where", "eyeNormalized", "normalMatrixMode", "skybox",
    "projection", "radius", "cameraAzimuth", "cameraElevation", "orbitCamera", "viewMode", "compare", "splitX",
];

// What the textbook samples do: six solid 1 x 1 faces, NEAREST filtering, vectors computed per vertex, no background.
const sample = {
    environment: "sixColours", envFilter: "NEAREST", material: "mirror", where: "vertex", skybox: false,
    showObjects: false, radius: 3.6, cameraElevation: 0, cameraAzimuth: 0,
};

export const EXAMPLES = [
    // ------------------------------------------------------------------ your samples
    {
        id: "reflectionMap", group: "Your samples", label: "reflectionMap: a spinning cube, six colours",
        look: "The cube of reflectionMap.js. Each face reflects the colour of the cube-map face its reflection vector points at. Computed per vertex with the raw eye vector, the vector is exact on a flat face. (The sample draws this through an orthographic projection with the eye one unit away, which the reflection maths does not assume; here the camera is a perspective camera.) Set Show to 'cube face hit' on any environment to see the same thing.",
        preset: { ...sample, shape: "cube", spin: true, spinAxis: "x", spinSpeed: 60, eyeNormalized: false, space: "world" },
    },
    {
        id: "reflectionMap2", group: "Your samples", label: "reflectionMap2: a sphere and its normal matrix",
        look: "The sphere of reflectionMap2.js, with the normalized eye vector. The sample uploads transpose(normalMatrix(modelView)), the inverse of the right matrix, so as it rotates its normals no longer follow its surface (19° off at 10° of rotation, 57° at 30°). Left: the sample's matrix. Right: the correct one. Rotation is on; a rotating mirror ball should look the same throughout.",
        preset: { ...sample, shape: "sphere", subdivisions: 5, spin: true, spinAxis: "x", spinSpeed: 40, eyeNormalized: true, normalMatrixMode: "sample", compare: "normalMatrix", space: "world" },
    },
    {
        id: "reflectingCube", group: "Your samples", label: "reflectingCube: an orbiting camera",
        look: "The cube of reflectingCube.js seen from a camera that orbits. The sample looks the cube map up with the reflection vector in EYE coordinates, but a cube map is fixed in the WORLD. Left: as the sample does it, the six colours stay glued to the camera. Right: rotated into world coordinates, they stay put as you orbit.",
        preset: { ...sample, shape: "cube", orbitCamera: true, cameraElevation: 20, space: "eye", compare: "space", eyeNormalized: false },
    },
    {
        id: "reflectingSphere", group: "Your samples", label: "reflectingSphere: lit surface × environment",
        look: "reflectingSphere.js multiplies a per-vertex Phong colour by the environment colour (a lit surface \u00d7 the cube map). Right: that product. Left: a pure mirror, for comparison. The sample also looks the cube map up in eye coordinates, so as the camera orbits the colours stay glued to it: choose 'Reflection vector in eye space | world space' under Compare to see that. Lower the subdivision count to see per-vertex lighting and reflection facet.",
        preset: { ...sample, shape: "sphere", subdivisions: 3, material: "litEnv", tint: [1.0, 0.8, 0.0], shininess: 20, ambient: 0.2, lightFixedToCamera: true, orbitCamera: true, cameraElevation: 20, space: "eye", compare: "shading" },
    },

    // --------------------------------------------------------- environments and materials
    {
        id: "mirror-sky", group: "Environments and materials", label: "Mirror sphere in a sky",
        look: "A perfect mirror in an environment with something to see: a sky with a sun. The background is the same cube map, so you can check that the reflection is the right way round. Drag to orbit, and try Show → 'cube face hit'.",
        preset: { shape: "sphere", subdivisions: 5, environment: "sky", envFilter: "LINEAR", material: "mirror", where: "fragment", skybox: true, orbitCamera: true, radius: 4.2, cameraElevation: 12 },
    },
    {
        id: "chrome-studio", group: "Environments and materials", label: "Chrome torus in a studio",
        look: "A torus has curvature of every sign, which stretches and folds the reflection. The studio's softboxes make the distortion easy to read. Roughness blurs the reflection by reading a coarser mip level of the cube map.",
        preset: { shape: "torus", environment: "studio", envFilter: "LINEAR_MIPMAP_LINEAR", material: "glossy", tint: [0.92, 0.92, 0.96], roughness: 0.06, where: "fragment", skybox: true, spin: true, spinAxis: "x", spinSpeed: 25, radius: 3.6, cameraElevation: 15 },
    },
    {
        id: "gold-roughness", group: "Environments and materials", label: "Brushed gold: roughness from mip levels",
        look: "Left: a pure mirror. Right: glossy metal, which looks the cube map up at a blurred mip level chosen by the roughness. The blur comes from the cube map's own mipmaps, which average the environment, a plausible stand-in for the integral over the surface's microfacets.",
        preset: { shape: "sphere", subdivisions: 5, environment: "studio", envFilter: "LINEAR_MIPMAP_LINEAR", material: "glossy", tint: [1.0, 0.78, 0.34], roughness: 0.35, where: "fragment", skybox: true, compare: "shading", radius: 4.2, cameraElevation: 10, orbitCamera: true },
    },
    {
        id: "plastic-room", group: "Environments and materials", label: "Red plastic in a room",
        look: "Plastic is a lit surface with a weak, Fresnel-weighted reflection: nearly nothing head-on (4%), almost a mirror at grazing angles. Look at the rim of the torus. The reflectivity slider sets the head-on reflectance.",
        preset: { shape: "torus", environment: "room", envFilter: "LINEAR", material: "plastic", tint: [0.85, 0.12, 0.10], reflectivity: 0.05, shininess: 80, where: "fragment", skybox: true, lightFixedToCamera: false, lightAzimuth: 30, lightElevation: 55, spin: true, spinAxis: "y", spinSpeed: 25, radius: 3.8, cameraElevation: 25 },
    },
    {
        id: "glass-room", group: "Environments and materials", label: "Glass with dispersion",
        look: "Glass refracts with Snell's law and reflects with Fresnel weights. Each colour channel uses a slightly different index (red lowest, blue highest), so the colours separate at the edges of the image. The sphere is refracted once at its front surface only; a real glass ball bends the light again on the way out.",
        preset: { shape: "sphere", subdivisions: 5, environment: "room", envFilter: "LINEAR", material: "glass", tint: [1, 1, 1], ior: 1.5, dispersion: 0.04, where: "fragment", skybox: true, orbitCamera: true, radius: 4.0, cameraElevation: 10 },
    },
    {
        id: "flat-mirror", group: "Environments and materials", label: "A flat mirror",
        look: "On a flat surface the normal never changes, so the reflection vector depends only on where you look from, and the reflected image is the room seen from a mirrored viewpoint. Orbit the camera.",
        preset: { shape: "plane", environment: "room", envFilter: "LINEAR", material: "mirror", where: "vertex", skybox: true, radius: 3.4, cameraElevation: 10, cameraAzimuth: 25, orbitCamera: true },
    },
    {
        id: "orientation", group: "Environments and materials", label: "Orientation test (labelled faces)",
        look: "Every face of this environment is labelled and carries an arrow marking 'up'. Seen in the background, the labels are upright. In the sphere's reflection they are mirrored, as in any mirror. Use it to check that an environment is the right way round before trusting a reflection.",
        preset: { shape: "sphere", subdivisions: 5, environment: "orientation", envSize: 256, envFilter: "LINEAR", material: "mirror", where: "fragment", skybox: true, radius: 4.2, cameraElevation: 10, cameraAzimuth: 0 },
    },
    {
        id: "dynamic", group: "Environments and materials", label: "Dynamic environment: reflecting nearby objects",
        look: "Four spheres orbit the mirror. A fixed cube map cannot show them, because it was made without them. Left: a static environment. Right: a cube map re-rendered six times every frame from the mirror's position. Real-time reflection of moving objects costs six extra scene renders per frame.",
        preset: { shape: "sphere", subdivisions: 5, environment: "sky", envFilter: "LINEAR", material: "mirror", where: "fragment", skybox: true, showObjects: true, objectSpeed: 1, compare: "environment", envSource: "static", radius: 5.2, cameraElevation: 14 },
    },

    // -------------------------------------------------------------------- comparisons
    {
        id: "cmp-space", group: "Comparisons", label: "Eye space vs world space, in a real environment",
        look: "The orbiting-camera samples look the cube map up in eye coordinates. With a recognisable room the problem is obvious: left, the room turns with the camera instead of staying where it is. The centre of the sphere shows the +Z face for every camera position.",
        preset: { shape: "sphere", subdivisions: 5, environment: "room", envFilter: "LINEAR", material: "mirror", where: "fragment", skybox: true, space: "eye", compare: "space", orbitCamera: true, radius: 4.2, cameraElevation: 12 },
    },
    {
        id: "cmp-where", group: "Comparisons", label: "Per vertex vs per fragment (a coarse sphere)",
        look: "Reflection vectors computed at the vertices and interpolated (left) against recomputed for every pixel (right). On a coarse sphere the per-vertex version cuts corners badly: at level 0 the error is over 100°. Raise the subdivision level and watch the two converge (about 0.1° by level 5).",
        preset: { shape: "sphere", subdivisions: 2, environment: "room", envFilter: "LINEAR", material: "mirror", skybox: true, compare: "where", where: "vertex", spin: true, spinAxis: "y", spinSpeed: 20, radius: 4.0, cameraElevation: 10 },
    },
    {
        id: "cmp-eyevector", group: "Comparisons", label: "Raw vs normalized eye vector (a cube)",
        look: "reflectionMap1 reflects the raw eye vector; reflectionMap2 normalizes it first. On a flat face reflection is linear in position, so interpolating the raw per-vertex vectors is exactly right; normalizing first breaks the linearity and bends the reflection. The closer the camera, the bigger the difference.",
        preset: { shape: "cube", environment: "checker", envFilter: "LINEAR", material: "mirror", skybox: false, compare: "eyeVector", where: "vertex", spin: true, spinAxis: "y", spinSpeed: 20, radius: 2.3, cameraElevation: 20 },
    },
    {
        id: "cmp-filter", group: "Comparisons", label: "NEAREST vs LINEAR on 1 × 1 faces",
        look: "The samples' cube maps have six 1 × 1 faces. With NEAREST the sphere is six flat patches. With LINEAR the six colours blend smoothly, because cube-map filtering works across the faces.",
        preset: { shape: "sphere", subdivisions: 5, environment: "sixColours", envFilter: "LINEAR", material: "mirror", where: "fragment", skybox: false, compare: "filter", radius: 3.6, cameraElevation: 15 },
    },
    {
        id: "cmp-material", group: "Comparisons", label: "Mirror vs plastic",
        look: "The same sphere in the same sky, as a pure mirror (left) and as plastic (right): a lit surface plus a reflection weighted by the Fresnel term. Change the material to compare mirror against glossy metal or glass.",
        preset: { shape: "sphere", subdivisions: 5, environment: "sky", envFilter: "LINEAR", material: "plastic", tint: [0.15, 0.4, 0.85], reflectivity: 0.05, shininess: 80, where: "fragment", skybox: true, compare: "shading", lightFixedToCamera: false, lightAzimuth: 35, lightElevation: 45, radius: 4.2, cameraElevation: 15 },
    },
];

export const exampleById = (id) => EXAMPLES.find((e) => e.id === id);
