#version 300 es

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uTextureMatrix;      // Bias * LightProjection * LightView * Model

out vec3 vWorldPosition;
out vec3 vNormal;
out vec4 vProjTexCoord;           // (s, t, depth, q) as seen by the projector

void main()
{
    vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = mat3(uModelMatrix) * aNormal;     // rotation + uniform scale only
    vProjTexCoord = uTextureMatrix * vec4(aPosition, 1.0);
    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
}
