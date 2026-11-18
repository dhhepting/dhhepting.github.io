#version 300 es
precision highp float;

// Flat view of the raw trail texture (the "unwrapped" field), drawn with quad.vert.

in vec2 vUV;

uniform sampler2D uTrail;
uniform float uExposure;

out vec4 outColor;

#pragma include colormap

void main() {
    outColor = vec4(shadeConcentration(texture(uTrail, vUV).r, uExposure), 1.0);
}
