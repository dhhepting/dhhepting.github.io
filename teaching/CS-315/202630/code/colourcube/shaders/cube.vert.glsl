#version 300 es

// One MVP matrix supplied per frame by the host.
uniform mat4 uMVP;

// Per-vertex attributes fed from the VAO.
in vec4 aPosition;
in vec4 aColor;

// Interpolated colour handed to the fragment shader.
out vec4 vColor;

void main() {
  gl_Position = uMVP * aPosition;
  vColor = aColor;
}
