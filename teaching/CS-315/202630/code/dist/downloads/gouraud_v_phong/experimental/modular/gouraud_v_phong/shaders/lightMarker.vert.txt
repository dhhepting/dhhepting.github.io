#version 300 es

// Draws the light as a single round point.

in vec4 aPosition;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform float uPointSize;

void main()
{
    gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;
    gl_PointSize = uPointSize;
}
