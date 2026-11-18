// shadedSphere3 (per-vertex) vs shadedSphere4 (per-fragment).
// As coded in shadedSphere3.mjs / shadedSphere4.mjs, both use TRUE (face)
// normals computed with a cross product, so every triangle is flat.
import { CompareApp } from './lib/CompareApp.mjs';
import { sphereScene } from './lib/scenes.mjs';

new CompareApp(document.getElementById('app'), {
    title: 'shadedSphere3 vs shadedSphere4: per-vertex vs per-fragment shading',
    summary:
        '<strong>shadedSphere3</strong> (left) lights each vertex and interpolates the colour; <strong>shadedSphere4</strong> (right) lights every pixel. ' +
        'Both use each triangle’s true face normal, so every triangle is flat and the sphere looks faceted.',
    scene: sphereScene({ normalMode: 'true' }),
    panes: [
        {
            title: 'shadedSphere3',
            subtitle: 'true normals, per-vertex shading',
            sources: () => ({ vert: 'perVertexLighting.vert', frag: 'colorPassthrough.frag' }),
        },
        {
            title: 'shadedSphere4',
            subtitle: 'true normals, per-fragment shading',
            sources: () => ({ vert: 'perFragmentLighting.vert', frag: 'perFragmentLighting.frag' }),
        },
    ],
    notes: [
        {
            heading: 'What to look for',
            html: `
<p>With true normals the surface is faceted on both sides, because the normal is constant across each triangle. What differs is
<em>where the lighting equation is evaluated</em>.</p>
<ul>
<li><strong>Diffuse term.</strong> With a directional light and a constant face normal, N·L is the same at all three corners, so both sides agree on diffuse.</li>
<li><strong>Specular term.</strong> The halfway vector depends on the direction to the viewer, which changes from pixel to pixel. Per-fragment shading follows that change across the triangle; per-vertex shading can only blend the three corner values, so a highlight that falls between corners is blunted or missed.</li>
<li><strong>Try:</strong> switch the light to <em>Point</em>, raise shininess to 150 or more, and lower the subdivision level to 1 or 2. Then watch the difference image as you drag the view.</li>
</ul>
<p>The cost table shows the trade: per-vertex shading does its work per vertex, per-fragment shading does it per pixel. Raise the subdivision level and watch the balance move.</p>
<p>See the notes on <a href="sphere1-vs-sphere2.html">shadedSphere1 vs 2</a> about the textbook README naming these programs the other way round, and about the per-fragment shader not renormalising its interpolated vectors.</p>`,
        },
    ],
}).start();
