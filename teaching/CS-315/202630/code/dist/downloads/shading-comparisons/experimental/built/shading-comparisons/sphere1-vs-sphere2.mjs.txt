// shadedSphere1 (per-vertex) vs shadedSphere2 (per-fragment).
// As coded in shadedSphere1.mjs / shadedSphere2.mjs, both use VERTEX normals
// (each vertex's normal is its own position on the unit sphere).
import { CompareApp } from './lib/CompareApp.mjs';
import { sphereScene } from './lib/scenes.mjs';

new CompareApp(document.getElementById('app'), {
    title: 'shadedSphere1 vs shadedSphere2: per-vertex vs per-fragment shading',
    summary:
        '<strong>shadedSphere1</strong> (left) evaluates the lighting equation once per vertex and interpolates the resulting colour. ' +
        '<strong>shadedSphere2</strong> (right) interpolates the normal, light and eye vectors and evaluates the equation at every pixel. ' +
        'Both use vertex normals: each vertex carries the sphere’s own surface normal there, so the surface looks smooth.',
    scene: sphereScene({ normalMode: 'vertex' }),
    panes: [
        {
            title: 'shadedSphere1',
            subtitle: 'vertex normals, per-vertex shading',
            sources: () => ({ vert: 'perVertexLighting.vert', frag: 'colorPassthrough.frag' }),
        },
        {
            title: 'shadedSphere2',
            subtitle: 'vertex normals, per-fragment shading',
            sources: () => ({ vert: 'perFragmentLighting.vert', frag: 'perFragmentLighting.frag' }),
        },
    ],
    notes: [
        {
            heading: 'What to look for',
            html: `
<p>This is the pair where the gap is easiest to see, because the normal changes smoothly across each triangle.</p>
<ul>
<li><strong>Per-vertex (left)</strong> computes N·L and N·H only at the corners. Between corners it can only blend colours, so the specular highlight is smeared across triangles and its edges follow the triangle layout. It can vanish entirely if no corner lies inside it.</li>
<li><strong>Per-fragment (right)</strong> interpolates the normal, renormalises it, and evaluates the equation per pixel, giving a round highlight at any subdivision level.</li>
<li><strong>Try:</strong> subdivision 1–2 with shininess 100 or more, then drag to rotate. Compare how the highlight moves on each side.</li>
<li>Raise the subdivision level: the left side converges toward the right, because smaller triangles mean the corners sample the surface more densely. That convergence costs vertices instead of pixels.</li>
</ul>
<p><strong>A note on names.</strong> The textbook README describes shadedSphere1/2 as using <em>true</em> normals and shadedSphere3/4 as using <em>vertex</em> normals. The code in your <code>shadedSphere1.mjs</code> and <code>shadedSphere2.mjs</code> sets each normal to the vertex position, which is a vertex normal, and 3/4 compute face normals with a cross product. These pages follow the code.</p>
<p><strong>Another difference to know about.</strong> Your <code>perFragmentLighting.frag</code> uses the interpolated N, L and E as they arrive, without renormalising them. That saves three <code>normalize</code> calls per pixel (see the cost table), but interpolated unit vectors are slightly shorter than unit length between the vertices, so the right-hand picture differs a little from the left for that reason as well as for where the equation is evaluated. Subdivide more and that effect shrinks.</p>`,
        },
    ],
}).start();
