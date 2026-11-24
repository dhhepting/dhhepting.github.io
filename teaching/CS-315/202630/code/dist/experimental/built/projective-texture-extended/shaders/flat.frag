#version 300 es

precision mediump float;

uniform vec4 uColour;
uniform bool uRound;

out vec4 fColor;

void main()
{
    if (uRound && dot(gl_PointCoord - 0.5, gl_PointCoord - 0.5) > 0.25) discard;
    fColor = uColour;
}
