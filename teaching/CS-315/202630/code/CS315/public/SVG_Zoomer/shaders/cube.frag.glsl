#version 300 es
precision mediump float;

// Interpolated colour arriving from the vertex shader.
in vec4 vColor;

// The single output colour for this fragment.
out vec4 fragColor;

void main() {
  fragColor = vColor;
}
