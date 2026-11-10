#version 300 es
precision mediump float;

in vec3 vColor;

uniform bool uRound;        // true for the centre handles: clip the square point to a disc

out vec4 outColor;

void main() {
    if (uRound) {
        vec2 d = gl_PointCoord - vec2(0.5);
        if (dot(d, d) > 0.25) discard;
    }
    outColor = vec4(vColor, 1.0);
}
