// Loads the shader files with fetch(), so the pages work from any web server
// (a plain static host, Vite dev, or a Vite build). Each URL is a literal
// `new URL('...', import.meta.url)`, which also lets Vite find and ship the files.
//
// The files in ../shaders are your own, unmodified, except
// shadedSphereObjectSpaceLocalViewer.vert (one marked line changed).
const SHADER_URLS = {
    'perVertexLighting.vert': new URL('../shaders/perVertexLighting.vert', import.meta.url),
    'colorPassthrough.frag': new URL('../shaders/colorPassthrough.frag', import.meta.url),
    'perFragmentLighting.vert': new URL('../shaders/perFragmentLighting.vert', import.meta.url),
    'perFragmentLighting.frag': new URL('../shaders/perFragmentLighting.frag', import.meta.url),
    'shadedSphereEyeSpace.vert': new URL('../shaders/shadedSphereEyeSpace.vert', import.meta.url),
    'shadedSphereObjectSpace.vert': new URL('../shaders/shadedSphereObjectSpace.vert', import.meta.url),
    'shadedSphereObjectSpaceLocalViewer.vert': new URL('../shaders/shadedSphereObjectSpaceLocalViewer.vert', import.meta.url),
    'shadedCubeHalfway.vert': new URL('../shaders/shadedCubeHalfway.vert', import.meta.url),
    'shadedCubeHalfway.frag': new URL('../shaders/shadedCubeHalfway.frag', import.meta.url),
};

let cached = null;

/** Resolves to { 'name.vert': sourceText, ... } for every shader; fetched once. */
export function loadShaders() {
    cached ??= Promise.all(Object.entries(SHADER_URLS).map(async ([name, url]) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not load shaders/${name} (HTTP ${response.status})`);
        return [name, await response.text()];
    })).then(Object.fromEntries);
    return cached;
}
