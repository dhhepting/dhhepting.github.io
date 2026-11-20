#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUV;

uniform mat4 uModel;
uniform mat4 uViewProj;

out vec3 vNormal;
out vec2 vUV;

void main() {
    vNormal = mat3(uModel) * aNormal;   // rotation + translation only, no non-uniform scale
    vUV = aUV;
    gl_Position = uViewProj * uModel * vec4(aPosition, 1.0);
}
