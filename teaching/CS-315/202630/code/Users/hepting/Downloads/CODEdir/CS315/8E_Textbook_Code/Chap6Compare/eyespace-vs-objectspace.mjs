// shadedSphereEyeSpace vs shadedSphereObjectSpace: the same per-vertex
// lighting (vertex normals), computed in two different coordinate systems.
import { CompareApp } from './lib/CompareApp.mjs';
import { sphereScene } from './lib/scenes.mjs';

new CompareApp(document.getElementById('app'), {
    title: 'shadedSphereEyeSpace vs shadedSphereObjectSpace: lighting in two spaces',
    summary:
        'Both canvases use per-vertex lighting with vertex normals and a light given in object coordinates. <strong>EyeSpace</strong> (left) transforms the ' +
        'vertex, the normal and the light into eye coordinates for every vertex. <strong>ObjectSpace</strong> (right) has the CPU supply the eye position ' +
        'in object coordinates, so the vertex shader lights the raw vertex data with no per-vertex transforms.',
    scene: sphereScene({
        normalMode: 'vertex',
        defaults: { subdiv: 4, lightFrame: 'world', lightType: 'point', lightX: 2, lightY: 2, lightZ: 2, orbit: true },
    }),
    extraControls: [
        {
            id: 'exactViewer', type: 'checkbox', value: false,
            label: 'Use the exact viewer vector in object space',
            hint: 'Your shadedSphereObjectSpace.vert uses E = normalize(uEyePosition), which treats the viewer as infinitely far away. On: E = normalize(uEyePosition − aPosition), which makes the picture match the eye-space version.',
        },
    ],
    panes: [
        {
            title: 'shadedSphereEyeSpace',
            subtitle: 'lighting computed in eye space',
            lightSpace: 'object',
            sources: () => ({ vert: 'shadedSphereEyeSpace.vert', frag: 'colorPassthrough.frag' }),
        },
        {
            title: 'shadedSphereObjectSpace',
            subtitle: 'lighting computed in object space',
            lightSpace: 'object',
            sources: (state) => ({
                vert: state.exactViewer ? 'shadedSphereObjectSpaceLocalViewer.vert' : 'shadedSphereObjectSpace.vert',
                frag: 'colorPassthrough.frag',
            }),
        },
    ],
    notes: [
        {
            heading: 'What to look for',
            html: `
<p>Lighting is geometry: it does not matter which coordinate system the dot products are done in, as long as every vector is expressed in the same one. So any difference between the two pictures should come from something other than the choice of space.</p>
<ul>
<li><strong>As your programs are written, the pictures differ.</strong> The eye-space shader computes the viewer vector from each vertex to the eye, <code>E = −normalize(pos)</code>. The object-space shader uses <code>E = normalize(uEyePosition)</code>, one direction for the whole sphere. The difference image shows where that approximation matters; it is largest when R is small (the eye is close to the sphere).</li>
<li><strong>Tick the checkbox</strong> and the object-space side uses the exact per-vertex viewer vector (one marked line changed in a copy of your shader). The difference image should then stay essentially black: differences of 1/255 or so are rounding.</li>
<li><strong>Work done.</strong> Eye space multiplies the light, the normal and the position by the model-view matrix in the vertex shader, for every vertex. Object space needs no per-vertex transforms for lighting; the cost is a little CPU work per frame to bring the eye and light into object coordinates. Both shaders still pay for <code>uProjectionMatrix * uModelViewMatrix * aPosition</code>, which the cost table counts as a mat4·mat4 product followed by a mat4·vec4.</li>
<li><strong>Try:</strong> tick <em>Spin the object</em> and the CPU recomputes the object-space light each frame. With the checkbox on, the two sides still agree.</li>
</ul>`,
        },
    ],
}).start();
