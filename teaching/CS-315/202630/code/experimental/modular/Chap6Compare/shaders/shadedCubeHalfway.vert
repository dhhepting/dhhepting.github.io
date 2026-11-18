#version 300 es

in vec4 aPosition;
in vec3 aNormal;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;

// eye-space position and normal, interpolated for per-fragment lighting
out vec3 vPosition;
out vec3 vNormal;

void main()
{
    vec4 pos = uModelViewMatrix * aPosition;

    vPosition = pos.xyz;
    vNormal = uNormalMatrix * aNormal;

    gl_Position = uProjectionMatrix * pos;
}
