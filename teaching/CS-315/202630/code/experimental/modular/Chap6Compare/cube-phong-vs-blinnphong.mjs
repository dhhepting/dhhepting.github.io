// shadedCubeHalfway, run twice with its own shader unmodified: uUseHalfway = false
// (Phong, R . E) on the left, uUseHalfway = true (modified Blinn-Phong, N . H) on the right.
import { CompareApp } from './lib/CompareApp.mjs';
import { cubeScene } from './lib/scenes.mjs';

new CompareApp(document.getElementById('app'), {
    title: 'shadedCubeHalfway: Phong vs modified Blinn-Phong',
    summary:
        'Both canvases run your <code>shadedCubeHalfway</code> shaders unchanged, with the same cube, camera, light and marker; only the <code>uUseHalfway</code> uniform differs. ' +
        '<strong>Phong</strong> (left) reflects the light about the normal and compares that with the eye direction, (R·E)<sup>n</sup>. ' +
        '<strong>Modified Blinn-Phong</strong> (right) uses the halfway vector H = normalize(L + E), (N·H)<sup>n′</sup>, with the exponent multiplied by 4 when compensation is on.',
    scene: cubeScene(),
    extraControls: [
        {
            id: 'compensate', type: 'checkbox', value: true,
            label: 'Compensate the Blinn-Phong exponent (n′ = 4n)',
            hint: 'The angle between N and H is about half the angle between R and E, so n′ ≈ 4n gives a comparable highlight. Off: both sides use the same exponent. (Your sample defaults this to off.)',
        },
    ],
    panes: [
        {
            title: 'Phong',
            subtitle: 'uUseHalfway = false: specular = (R · E)^n',
            sources: () => ({ vert: 'shadedCubeHalfway.vert', frag: 'shadedCubeHalfway.frag' }),
            uniforms: () => ({ uUseHalfway: 0 }),
            costConstants: { uUseHalfway: false, uUnlit: false },
        },
        {
            title: 'Modified Blinn-Phong',
            subtitle: 'uUseHalfway = true: specular = (N · H)^n′',
            sources: () => ({ vert: 'shadedCubeHalfway.vert', frag: 'shadedCubeHalfway.frag' }),
            uniforms: (state) => ({ uUseHalfway: 1, uShininess: state.compensate ? 4 * state.shininess : state.shininess }),
            costConstants: { uUseHalfway: true, uUnlit: false },
        },
    ],
    notes: [
        {
            heading: 'What to look for',
            html: `
<ul>
<li><strong>Highlight shape.</strong> When the light grazes a face, the Blinn-Phong highlight stretches into an ellipse while the Phong highlight stays rounder. Lower the light’s elevation or rotate the cube until a face is seen at a grazing angle.</li>
<li><strong>Exponent.</strong> With compensation off, the Blinn-Phong highlight is much larger than the Phong one. With it on they are close near the centre and drift apart toward the edges. The difference image shows where.</li>
<li><strong>Light marker.</strong> The small yellow cube is the point light, drawn by the same shader with <code>uUnlit</code> set. Drag on either canvas to move the light, scroll to change its distance.</li>
</ul>`,
        },
        {
            heading: 'What it costs',
            html: `
<p>Your shader chooses the model with a uniform branch, so both canvases run the same program. The table counts only the branch each canvas takes (it prunes the other branch and the <code>uUnlit</code> branch from a copy of the source; the shader itself is untouched). A uniform branch is coherent across all pixels, so on most GPUs the untaken side costs little at run time.</p>
<p>Counted that way, the two models are almost the same size per pixel: Phong needs <code>reflect</code>, while Blinn-Phong needs one more <code>normalize</code> to build H. Blinn-Phong’s reputation for being cheaper comes from a special case: when the light is directional and the viewer is infinitely far away, L, E and therefore H are the same for every pixel, so H can be computed once on the CPU. Phong cannot do this, because R = reflect(−L, N) depends on N. This scene is not that case. The light is a point light and the camera is a perspective camera, as your sample’s own comment notes, so L and E change from pixel to pixel and both models pay for them per pixel.</p>
<p>The marker cube is drawn the same way on both sides and is not included in the counts.</p>`,
        },
    ],
}).start();
