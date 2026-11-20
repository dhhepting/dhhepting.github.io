// The explorer's menu. Each example names a height-field source (heightFields.mjs),
// optionally overrides that source's parameters, and carries a preset: the state
// (camera, light, shading, texture parameters) that shows it off. Choosing an
// example resets everything to the page's defaults and then applies the preset.
//
// The explorer is about what a normal field does to shading, so every entry is a
// surface you can recognise or a technique with its own failure mode. Perlin noise
// is deliberately not an entry: it is only the generator behind the water.

export const GROUPS = ["Your samples", "Water", "Surfaces", "Terrain", "Techniques", "Chapter 7 textures", "Test patterns"];

// Every state key a preset may set.
export const PRESET_KEYS = [
    "textureSize", "bump", "normalMethod", "edgeMode",
    "minFilter", "magFilter", "wrapS", "wrapT", "generateMipmaps", "maxLevel", "lodBias", "anisotropy", "repeat",
    "viewMode", "projection", "radius", "cameraAzimuth", "cameraElevation", "orbitCamera",
    "lightType", "lightAzimuth", "lightElevation", "lightDistance", "orbitLight",
    "ambient", "specularStrength", "shininess", "surfaceColor",
    "material", "useColorMap", "relief", "reliefSteps", "normalSource", "toksvig", "convention", "splitMode", "splitX",
    "waterScale1", "waterScale2", "waterLayer2", "waterSpeed", "waterAnimate", "waterFresnel", "waterDepth", "waterDistortion",
];

const ch7 = {
    bump: 0.0, viewMode: 5, minFilter: "NEAREST_MIPMAP_LINEAR", magFilter: "NEAREST", surfaceColor: [1, 1, 1],
    orbitLight: false, cameraElevation: 40, specularStrength: 0.2, ambient: 0.4, lightType: "directional", lightElevation: 60, lightAzimuth: 30,
};

export const EXAMPLES = [
    // ------------------------------------------------------------------ your samples
    {
        id: "square", group: "Your samples", label: "Raised square (bumpMap)", source: "square",
        look: "The raised square from bumpMap. The quad is flat; only the normals differ. Lower the light's elevation and let it orbit: each edge of the square lights up when the light is on its side.",
        preset: { bump: 0.004, normalMethod: "forward", edgeMode: "clamp", specularStrength: 0.0, surfaceColor: [0.7, 0.7, 0.7], lightType: "point", lightElevation: 35, orbitLight: true },
    },
    {
        id: "honolulu", group: "Your samples", label: "Honolulu terrain (bumpMap2)", source: "honolulu",
        look: "The height data from bumpMap2. Try the light elevation and the bump height, then see the Terrain group for the same data drawn as a map.",
        preset: { bump: 0.3, normalMethod: "forward", useColorMap: false, specularStrength: 0.0, surfaceColor: [0.7, 0.7, 0.7], lightType: "point", lightElevation: 35, orbitLight: true },
    },

    // ------------------------------------------------------------------------ water
    {
        id: "water", group: "Water", label: "Water (two scrolling layers)", source: "water",
        look: "Two copies of one tileable normal map, at different scales, scrolling in different directions. Their slopes are added, then the normal drives Fresnel-weighted reflection of a procedural sky (with the sun as the light) over a refracted pool floor. Raise the camera to see the Fresnel effect fade; lower it to see the sky take over.",
        preset: {
            material: "water", bump: 0.4, repeat: 1, projection: "perspective", radius: 2.0, cameraElevation: 32, cameraAzimuth: 0,
            lightType: "directional", lightAzimuth: 180, lightElevation: 22, orbitLight: false, shininess: 350, specularStrength: 1.0,
            anisotropy: 16, waterAnimate: true,
        },
    },

    // --------------------------------------------------------------------- surfaces
    {
        id: "text", group: "Surfaces", label: "Embossed or engraved text", source: "text",
        look: "A typed word becomes the height map. Change the text, the bevel and raised vs cut-in; compare forward, central and Sobel normals at the letter edges.",
        preset: { bump: 0.02, textureSize: 512, normalMethod: "sobel", useColorMap: true, surfaceColor: [1, 1, 1], specularStrength: 0.6, shininess: 60, lightType: "point", lightElevation: 40, orbitLight: true },
    },
    {
        id: "bricks", group: "Surfaces", label: "Brick wall (colour map + bump)", source: "bricks",
        look: "A colour map and a normal map built from the same height field. Switch Show to the colour map or to the normal map to see how little each carries alone: a bump with no colour is grey, and colour with no normals is flat.",
        preset: { bump: 0.02, useColorMap: true, surfaceColor: [1, 1, 1], specularStrength: 0.08, shininess: 20, lightType: "point", lightElevation: 35, orbitLight: true },
    },
    {
        id: "hammered", group: "Surfaces", label: "Hammered metal", source: "hammered",
        look: "Dents reflecting a procedural sky. With a high shininess the sun glints only where a dent's normal bisects the view and the light, so each dent sparkles in turn as the light moves.",
        preset: { material: "metal", bump: 0.1, useColorMap: true, surfaceColor: [1, 1, 1], shininess: 140, specularStrength: 1.0, lightType: "directional", lightElevation: 40, orbitLight: true, ambient: 0.15 },
    },
    {
        id: "golf", group: "Surfaces", label: "Golf ball dimples", source: "dimples",
        look: "Concave spherical dimples on a hexagonal lattice. Compare a raking light with an overhead one: dimples show as shaded crescents.",
        preset: { bump: 0.05, useColorMap: true, surfaceColor: [1, 1, 1], specularStrength: 0.5, shininess: 70, lightType: "directional", lightElevation: 30, orbitLight: true },
    },
    {
        id: "weave", group: "Surfaces", label: "Fabric weave", source: "weave",
        look: "A plain weave: warp and weft threads alternate over and under. Fine, regular detail, so it is also a good test of minification. Lower the camera and compare the filters.",
        preset: { bump: 0.04, useColorMap: true, surfaceColor: [1, 1, 1], specularStrength: 0.15, shininess: 25, repeat: 2, cameraElevation: 45, lightType: "directional", lightElevation: 45, orbitLight: true, anisotropy: 8 },
    },
    {
        id: "corrugated", group: "Surfaces", label: "Corrugated sheet metal", source: "waves", params: { waves: 7, angle: 0 },
        look: "Large ridges with steep slopes. Bump mapping fakes the shading but not the silhouette: look along the ridges at a low camera angle and the edge of the quad stays straight.",
        preset: { material: "metal", bump: 0.07, useColorMap: true, surfaceColor: [1, 1, 1], shininess: 60, specularStrength: 0.8, cameraElevation: 30, lightType: "directional", lightElevation: 45, orbitLight: true, ambient: 0.2 },
    },

    // ----------------------------------------------------------------------- terrain
    {
        id: "hillshade", group: "Terrain", label: "Honolulu as a hillshaded map", source: "honolulu",
        look: "The same data seen from above with a directional light from the north-west at 45 degrees, the cartographic convention. The light elevation sets the contrast, and the bump height acts as vertical exaggeration.",
        preset: {
            bump: 0.35, useColorMap: true, surfaceColor: [1, 1, 1], projection: "ortho", radius: 1.7, cameraElevation: 89, cameraAzimuth: 0,
            lightType: "directional", lightAzimuth: 225, lightElevation: 45, orbitLight: false, specularStrength: 0.0, ambient: 0.2,
        },
    },

    // -------------------------------------------------------------------- techniques
    {
        id: "parallax", group: "Techniques", label: "Bump vs parallax (brick wall at a grazing angle)", source: "bricks",
        look: "Left of the divider: bump mapping. Right: parallax occlusion mapping with the same heights. Bump mapping changes the lighting but not what hides what; parallax shifts the texture with the viewpoint, so mortar joints close up at a grazing angle. Drag the divider with Compare position, and orbit the camera.",
        preset: {
            bump: 0.06, useColorMap: true, surfaceColor: [1, 1, 1], specularStrength: 0.05, shininess: 20, cameraElevation: 24, radius: 1.8,
            relief: 2, reliefSteps: 32, splitMode: 1, splitX: 0.5, lightType: "directional", lightElevation: 50, orbitLight: false, lightAzimuth: 20,
        },
    },
    {
        id: "derivative", group: "Techniques", label: "Derivative bump mapping vs a stored normal map", source: "studs", params: { cells: 4 },
        look: "Left: the normal comes from the stored normal map. Right: it is computed from screen-space derivatives of the height (Mikkelsen's formulation), with no tangent-space normals. The derivative version needs no normal map but shows blocky shading where the 64-texel texture is magnified.",
        preset: {
            textureSize: 64, bump: 0.08, minFilter: "LINEAR_MIPMAP_LINEAR", magFilter: "LINEAR", cameraElevation: 55, radius: 1.8,
            normalSource: 1, splitMode: 2, splitX: 0.5, specularStrength: 0.3, shininess: 40, lightType: "directional", lightElevation: 40, orbitLight: true,
        },
    },
    {
        id: "toksvig", group: "Techniques", label: "Mipmapped normals and specular aliasing", source: "hammered", params: { cells: 32 },
        look: "A fine, shiny normal map seen at a low angle. Mip levels average the normals, which shortens them, so a minified surface should look rougher; on the left it does not and the sun glint sparkles or is too tight. On the right the Toksvig correction widens the highlight by the lost normal length. Orbit the light and watch the left side shimmer. The view 'normal length' shows the shortening directly.",
        preset: {
            material: "metal", bump: 0.15, repeat: 3, useColorMap: true, surfaceColor: [1, 1, 1], shininess: 220, specularStrength: 1.0, cameraElevation: 16, radius: 4.0,
            splitMode: 3, splitX: 0.5, anisotropy: 8, lightType: "directional", lightElevation: 35, orbitLight: true, ambient: 0.1,
        },
    },
    {
        id: "frame", group: "Techniques", label: "Tangent-frame debugging", source: "text", params: { text: "RF", bevel: 0.012, mode: "emboss" },
        look: "An asymmetric word shows which way the light really comes from. The normal-map convention is set to a flipped green channel, which is the error bumpMap.js makes; the 'rotate 90 degrees' setting is the error bumpMap2.js makes. Set it back to Correct and compare. The views 'light in tangent space' and 'view in tangent space' show the vectors the shader works with.",
        preset: { bump: 0.03, textureSize: 512, normalMethod: "sobel", convention: 1, useColorMap: true, surfaceColor: [1, 1, 1], specularStrength: 0.0, lightType: "directional", lightAzimuth: 90, lightElevation: 30, orbitLight: false, cameraElevation: 60 },
    },

    // ------------------------------------------------------------ chapter 7 textures
    {
        id: "ch7-checker", group: "Chapter 7 textures", label: "Checkerboard (textureCubev2)", source: "checker", params: { cells: 8, softness: 0 },
        look: "The 64 × 64 checkerboard of textureCubev2, with its NEAREST magnification. Shown as a colour map; switch Show to the lit view and raise the bump height to use the same pattern as relief.",
        preset: { ...ch7, textureSize: 64 },
    },
    {
        id: "ch7-stripes", group: "Chapter 7 textures", label: "Two striped textures multiplied (textureCube3)", source: "stripeGrid", params: { checks: 64 },
        look: "textureCube3 multiplies a texture of horizontal stripes by one of vertical stripes (here the product is precomputed). 64 stripes on a 256-texel texture is fine detail: lower the camera and compare NEAREST_MIPMAP_LINEAR with LINEAR_MIPMAP_LINEAR.",
        preset: { ...ch7, textureSize: 256, cameraElevation: 25 },
    },
    {
        id: "ch7-chirp", group: "Chapter 7 textures", label: "sin(0.1 · i · j) pattern (textureCube4)", source: "chirp", params: { rate: 0.1 },
        look: "The second texture of textureCube4. Its frequency grows with i and j until it exceeds what 256 texels can represent, so the texture itself aliases before any filtering happens. Change the rate and the texture size.",
        preset: { ...ch7, textureSize: 256 },
    },
    {
        id: "ch7-checker-chirp", group: "Chapter 7 textures", label: "Checkerboard × sin pattern (textureCube4)", source: "checkerChirp", params: { checks: 8, rate: 0.1 },
        look: "textureCube4 multiplies its 8 × 8 checkerboard by the sin pattern. The product is shown as one texture.",
        preset: { ...ch7, textureSize: 256 },
    },
    {
        id: "ch7-slice", group: "Chapter 7 textures", label: "Slice of the 3D sphere texture (texture3D3)", source: "slice3d", params: { slice: 0.0 },
        look: "texture3D3 fills a 3D texture with a sphere, green at the centre and red at the edge, and shows three slices. This is one slice, as a colour map and as a height field (a crater). Move the slice with the slider.",
        preset: { ...ch7, textureSize: 128, bump: 0.0, minFilter: "LINEAR_MIPMAP_LINEAR", magFilter: "LINEAR" },
    },

    // --------------------------------------------------------------- test patterns
    {
        id: "waves", group: "Test patterns", label: "Sine waves", source: "waves", params: { waves: 6, angle: 30 },
        look: "A single frequency: the cleanest test for mip fading and for how the filters treat fine detail.",
        preset: { bump: 0.05, useColorMap: false, surfaceColor: [0.7, 0.7, 0.7], specularStrength: 0.2, lightType: "point", lightElevation: 35, orbitLight: true },
    },
    {
        id: "ripples", group: "Test patterns", label: "Ripples", source: "ripples", params: { rings: 12 },
        look: "Concentric rings: slopes in every direction, so every light direction lights some part. The pattern does not tile, so repeating it shows seams.",
        preset: { bump: 0.05, useColorMap: false, surfaceColor: [0.7, 0.7, 0.7], specularStrength: 0.3, lightType: "point", lightElevation: 35, orbitLight: true },
    },
    {
        id: "studs", group: "Test patterns", label: "Studs (hemispheres)", source: "studs", params: { cells: 5 },
        look: "Raised hemispheres. The shaded side faces away from the light.",
        preset: { bump: 0.05, useColorMap: false, surfaceColor: [0.7, 0.7, 0.7], specularStrength: 0.3, lightType: "point", lightElevation: 35, orbitLight: true },
    },
];

export const exampleById = (id) => EXAMPLES.find((e) => e.id === id);
