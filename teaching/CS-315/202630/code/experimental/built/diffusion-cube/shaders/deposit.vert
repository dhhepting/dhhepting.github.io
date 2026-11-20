#version 300 es
precision highp float;
precision highp int;

// One point per particle: fetch its position from the particle texture and
// splat it into the trail field.

uniform sampler2D uPos;
uniform int uPosSize;
uniform float uPointSize;

void main() {
    ivec2 c = ivec2(gl_VertexID % uPosSize, gl_VertexID / uPosSize);
    vec2 p = texelFetch(uPos, c, 0).xy;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    gl_PointSize = uPointSize;
}
