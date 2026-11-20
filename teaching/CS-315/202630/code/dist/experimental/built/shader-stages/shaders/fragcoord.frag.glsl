#version 300 es
// FRAGMENT SHADER -- ignores the vertex data and uses gl_FragCoord, the
// pixel's own window position (supplied by the rasterizer, with the origin
// at the bottom-left and values at pixel centers, e.g. 0.5, 1.5, ...).
// Red grows to the right, green grows upward.

precision highp float;

uniform vec2 u_resolution;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  outColor = vec4(uv, 0.0, 1.0);
}
