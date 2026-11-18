#version 300 es

precision mediump float;

uniform vec4 uColor;
uniform int uRound;

out vec4 fColor;

void main()
{
    if (uRound == 1 && length(gl_PointCoord - 0.5) > 0.5) discard;
    fColor = uColor;
}
