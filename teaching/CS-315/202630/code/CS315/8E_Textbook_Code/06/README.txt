Chapter 6 Programs

wireSphere: wire frame of recursively generated sphere

shadedCube: rotating cube with modified Phong shading

shadedSphere1: shaded sphere using true normals and per vertex shading

shadedSphere2: shaded sphere using true normals and per fragment shading

shadedSphere3: shaded sphere using vertex normals and per vertex shading

shadedSphere4: shaded sphere using vertex normals and per fragment shading

shadedSphereEyeSpace and shadedSphereObjectSpace show how lighting computations can be carried out in these spaces

----
Modernized layout (ES modules + shared shaders)

Each program is <name>.html + <name>.mjs. Shared code and shaders:
  ../../Common/MV.mjs, ../../Common/initShadersJS.mjs   (matrix/vector library, shader loader)
  shaders/*.vert, shaders/*.frag                         (shared by several programs)

Shader files are imported as text with Vite's "?raw" suffix, so serve/build
with Vite (npm run dev); they will not load from file:// or a plain static server.

Shared shaders:
  colorPassthrough.frag       shadedCube, shadedCube2, shadedSphere1, shadedSphere3,
                              shadedSphereEyeSpace, shadedSphereObjectSpace
  perVertexLighting.vert      shadedSphere1, shadedSphere3
  perFragmentLighting.vert    shadedSphere2, shadedSphere4
  perFragmentLighting.frag    shadedSphere2, shadedSphere4
  black.frag, wireSphere.vert                 wireSphere
  shadedCube.vert, shadedCube2.vert, shadedSphereEyeSpace.vert,
  shadedSphereObjectSpace.vert                 one program each
