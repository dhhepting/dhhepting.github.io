#version 300 es
// FRAGMENT SHADER -- shows the blend weights themselves.
// v_barycentric is (1,0,0) at vertex 0, (0,1,0) at vertex 1, (0,0,1) at
// vertex 2. Everywhere else it holds how much of each vertex a pixel gets.
// Red = vertex 0's weight, green = vertex 1's, blue = vertex 2's.

precision highp float;

in vec3 v_barycentric;
out vec4 outColor;

void main() {
  outColor = vec4(v_barycentric, 1.0);
}
