# Chapter 6 shading comparisons (WebGL2)

Four two-canvas pages, one set of controls each, plus a difference image and
an informal cost comparison. Built on your Chapter 6 sources.

| Page | Left | Right |
|---|---|---|
| `sphere1-vs-sphere2.html` | shadedSphere1: vertex normals, per-vertex | shadedSphere2: vertex normals, per-fragment |
| `sphere3-vs-sphere4.html` | shadedSphere3: true normals, per-vertex | shadedSphere4: true normals, per-fragment |
| `eyespace-vs-objectspace.html` | shadedSphereEyeSpace | shadedSphereObjectSpace |
| `cube-phong-vs-blinnphong.html` | shadedCubeHalfway as Phong, (R·E)^n | shadedCubeHalfway as modified Blinn-Phong, (N·H)^n′ |

`index.html` lists them.

## Where it goes

Same depth as your chapter samples, which import `../../Common/...`:

    <course root>/
      Common/                 MV.mjs, initShadersJS.mjs   (yours, unchanged)
      <chapter>/Chap6Compare/ this project

Files in `lib/` are one folder deeper, so `lib/common.mjs` imports
`../../../Common/...`. That is the only file that names `Common/`.
Run it with Vite (shaders are imported with `?raw`, like your samples).

## Layout

    lib/CompareApp.mjs      two-canvas harness: shared controls, difference image, cost panel, stress test
    lib/scenes.mjs          sphereScene / cubeScene: defaults, controls, animation, mesh, per-frame uniforms
    lib/frameMath.mjs       cameras, light and eye in eye/object space (no DOM/GL)
    lib/meshes.mjs          subdivided-tetrahedron sphere (vertex or true normals), cube
    lib/LitMeshPane.mjs     one canvas + WebGL2 context + program; finds aPosition/aNormal by name
    lib/costModel.mjs       counts operations in shader source, weights them, prunes known uniform branches
    lib/shaderSources.mjs   ?raw imports of every shader
    shaders/                your shaders, unmodified (see below)
    <page>.mjs/.html        thin page configs

## Source programs and what each page reproduces

* **Shaders:** `perVertexLighting.vert`, `colorPassthrough.frag`,
  `perFragmentLighting.vert/.frag`, `shadedSphereEyeSpace.vert`,
  `shadedSphereObjectSpace.vert` and `shadedCubeHalfway.vert/.frag` are your
  files, byte for byte. The one addition is
  `shadedSphereObjectSpaceLocalViewer.vert`, a copy of the object-space shader
  with one marked line changed (`E = normalize(uEyePosition - aPosition.xyz)`),
  used only when the "exact viewer vector" box is ticked.
* **Spheres:** camera `eye = (R sinθ cosφ, R sinθ sinφ, R cosθ)`, defaults R = 1.5,
  θ = φ = 0, light (1,1,1,0) fixed to the camera, shininess 20, same tetrahedron
  subdivision. Sliders replace the Increase/Decrease buttons. The projection is
  orthographic with ±1.5 extents (the samples use ±3) so the sphere fills more
  of the canvas.
* **Normals:** in your code shadedSphere1/2 use vertex normals and 3/4 use
  face normals, the reverse of the textbook README. The pages follow the code.
* **Eye vs object space:** as written, your two shaders do not give identical
  pictures (object space uses `E = normalize(uEyePosition)`). The local-viewer
  box makes them agree.
* **Cube:** both canvases run `shadedCubeHalfway.vert/.frag` unchanged, with
  `uUseHalfway` = 0 on the left and 1 on the right. The light marker is drawn
  through the same program with `uUnlit`, as in your sample. Fixed perspective
  camera at (0,0,4), fovy 45; orbiting point light; X/Y/Z rotation buttons and
  Toggle rotation; shininess 50; specular (1, 0.8, 0). The "compensate" box (×4)
  is on by default here (your sample defaults it to off).

## The cost panel

*Cost per vertex / per pixel* is read from the shader text itself (see
`costModel.mjs` for the weights). It counts `P * MV * v` as a mat4·mat4 product
plus a mat4·vec4, counts one branch of a simple if/else, and for the cube
shader prunes the `uUseHalfway` and `uUnlit` branches each canvas does not take
(on a copy; the shader is untouched). *Pixels shaded* is measured by reading
the canvas back. *Estimated work* = vertices × vertex cost + pixels × pixel
cost. The stress test redraws each side many times with the depth test off and
waits for the GPU, so it measures wall-clock time per pass. Both are informal.
