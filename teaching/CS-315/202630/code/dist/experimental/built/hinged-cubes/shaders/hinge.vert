#version 300 es
in vec4 aPosition;
in vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

out vec3 vNormal;   // view-space normal

void main() {
  // Model is rotation-only (no non-uniform scale), so mat3(modelView) is a valid normal matrix.
  vNormal = mat3(uView * uModel) * aNormal;
  gl_Position = uProjection * uView * uModel * aPosition;
}
