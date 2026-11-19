#version 300 es

/* Shared by every pass: the lit image, the ID passes, and the multiple-render-target pass. */

/* fixed locations, so that one vertex array object works with every program that uses this shader */
layout(location = 0) in vec4 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in float aFace;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uPickMatrix;        /* identity, or a pick matrix that zooms onto one pixel */
uniform mat3 uNormalMatrix;

out vec3 vNormal;
out vec3 vPosition;
flat out int vFace;

void main()
{
    vec4 eye = uModelViewMatrix*aPosition;
    vPosition = eye.xyz;
    vNormal = uNormalMatrix*aNormal;
    vFace = int(aFace + 0.5);
    gl_Position = uPickMatrix*uProjectionMatrix*eye;
}
