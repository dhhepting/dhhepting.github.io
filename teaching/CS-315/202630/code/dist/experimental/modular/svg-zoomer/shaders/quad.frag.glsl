#version 300 es
precision mediump float;

// Interpolated (and already zoomed) texcoord from the vertex shader.
in vec2 vTexCoord;

// The image being zoomed. Whether this looks crisp or blocky under
// magnification is decided by the texture itself (its resolution) and its
// sampling filter (NEAREST vs LINEAR) -- both set on the host side, not here.
uniform sampler2D uImage;

out vec4 fragColor;

void main() {
  fragColor = texture(uImage, vTexCoord);
}
