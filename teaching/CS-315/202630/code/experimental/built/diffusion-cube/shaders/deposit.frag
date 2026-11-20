#version 300 es
precision highp float;

uniform float uDeposit;
out vec4 outColor;

void main() {
    outColor = vec4(uDeposit, 0.0, 0.0, 1.0); // additive blend (ONE, ONE)
}
