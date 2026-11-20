#version 300 es

/* Particles and the paint brush, drawn as points into the state texture. */

in vec2 aPosition;

uniform float uPointSize;

void main()
{
    gl_PointSize = uPointSize;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
