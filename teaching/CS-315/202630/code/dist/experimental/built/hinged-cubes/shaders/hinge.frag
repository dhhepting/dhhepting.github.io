#version 300 es
precision mediump float;

in vec3 vNormal;
uniform vec4 uColor;
out vec4 fColor;

void main() {
  vec3 n = normalize(vNormal);
  vec3 l = normalize(vec3(0.4, 0.7, 1.0));      // fixed light, view space
  float diffuse = max(dot(n, l), 0.0);
  fColor = vec4(uColor.rgb * (0.30 + 0.70 * diffuse), uColor.a);
}
