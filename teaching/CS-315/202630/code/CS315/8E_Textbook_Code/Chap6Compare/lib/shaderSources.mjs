// Shader sources imported as strings with Vite's ?raw suffix, the same way the
// chapter samples load theirs. The files in ../shaders are your own, unmodified,
// except shadedSphereObjectSpaceLocalViewer.vert (one marked line changed).
import perVertexLightingVert from '../shaders/perVertexLighting.vert?raw';
import colorPassthroughFrag from '../shaders/colorPassthrough.frag?raw';
import perFragmentLightingVert from '../shaders/perFragmentLighting.vert?raw';
import perFragmentLightingFrag from '../shaders/perFragmentLighting.frag?raw';
import eyeSpaceVert from '../shaders/shadedSphereEyeSpace.vert?raw';
import objectSpaceVert from '../shaders/shadedSphereObjectSpace.vert?raw';
import objectSpaceLocalViewerVert from '../shaders/shadedSphereObjectSpaceLocalViewer.vert?raw';
import cubeHalfwayVert from '../shaders/shadedCubeHalfway.vert?raw';
import cubeHalfwayFrag from '../shaders/shadedCubeHalfway.frag?raw';

export const SHADERS = {
    'perVertexLighting.vert': perVertexLightingVert,
    'colorPassthrough.frag': colorPassthroughFrag,
    'perFragmentLighting.vert': perFragmentLightingVert,
    'perFragmentLighting.frag': perFragmentLightingFrag,
    'shadedSphereEyeSpace.vert': eyeSpaceVert,
    'shadedSphereObjectSpace.vert': objectSpaceVert,
    'shadedSphereObjectSpaceLocalViewer.vert': objectSpaceLocalViewerVert,
    'shadedCubeHalfway.vert': cubeHalfwayVert,
    'shadedCubeHalfway.frag': cubeHalfwayFrag,
};
