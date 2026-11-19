#version 300 es

/* The light pass: the scene seen from the light. */

layout(location = 0) in vec4 aPosition;

uniform mat4 uLightProjectionMatrix;
uniform mat4 uLightViewMatrix;
uniform mat4 uModelMatrix;

void main()
{
    gl_Position = uLightProjectionMatrix*uLightViewMatrix*uModelMatrix*aPosition;
}
