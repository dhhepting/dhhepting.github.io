#version 300 es

/* The camera pass: each vertex also goes through the light's and the projector's
   matrices, so the fragment shader can look itself up in the shadow map and the slide. */

layout(location = 0) in vec4 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec3 aColor;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uLightViewMatrix;
uniform mat4 uLightProjectionMatrix;
uniform mat4 uProjectorViewMatrix;
uniform mat4 uProjectorProjectionMatrix;

out vec3 vColor;
out vec3 vNormal;            /* world coordinates */
out vec3 vWorld;
out vec4 vLightClip;         /* clip coordinates as seen from the light */
out vec4 vProjectorClip;     /* clip coordinates as seen from the projector */

void main()
{
    vec4 world = uModelMatrix*aPosition;
    vWorld = world.xyz;
    vNormal = mat3(uModelMatrix)*aNormal;        /* rotations and a uniform scale only */
    vColor = aColor;
    vLightClip = uLightProjectionMatrix*uLightViewMatrix*world;
    vProjectorClip = uProjectorProjectionMatrix*uProjectorViewMatrix*world;
    gl_Position = uProjectionMatrix*uViewMatrix*world;
}
