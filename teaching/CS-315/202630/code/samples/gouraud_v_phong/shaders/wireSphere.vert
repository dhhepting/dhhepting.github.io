#version 300 es

in vec4 aPosition;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;


void
main()
{
    gl_Position = uProjectionMatrix*uModelViewMatrix*aPosition;
}
