#version 300 es

// A full-canvas quad that samples a texture. The zoom is done ENTIRELY in
// texture-coordinate space here: we keep the geometry fixed at the screen edges
// and instead choose WHICH part of the texture each corner reads from.

in vec2 aPosition;   // clip space, the four corners at (+/-1, +/-1)
in vec2 aTexCoord;   // [0,1], with (0,0) at the image's top-left

uniform vec2  uCenter; // focus point to zoom toward, in texcoord space
uniform float uZoom;   // magnification: 1.0 = whole image, 2.0 = half the image, ...

out vec2 vTexCoord;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);

  // Magnify about uCenter. At zoom Z we want to see a 1/Z-sized window centred
  // on the focus, stretched to fill the canvas. So each corner's texcoord is
  // pulled toward the focus by the factor 1/Z:
  //
  //     sampled = focus + (corner - focus) / Z
  //
  // Z = 1 leaves texcoords untouched (the whole image); larger Z samples a
  // smaller neighbourhood of uCenter -> the image appears magnified.
  vTexCoord = uCenter + (aTexCoord - uCenter) / uZoom;
}
