#version 300 es
// FRAGMENT SHADER -- runs once per pixel the triangle covers.
// v_color is NOT the value from any one vertex: the rasterizer blends the
// three vertex values using this pixel's position inside the triangle.

precision highp float;

in vec3 v_color;
out vec4 outColor;

void main() {
  outColor = vec4(v_color, 1.0);
}
