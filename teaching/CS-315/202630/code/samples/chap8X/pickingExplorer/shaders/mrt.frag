#version 300 es

/* The lit image and the ID in one pass, into two colour attachments
   (multiple render targets): no separate pick pass is needed. */

precision highp float;
precision highp int;

in vec3 vNormal;
in vec3 vPosition;
flat in int vFace;

uniform vec3 uColor;
uniform vec3 uLightDirection;
uniform int uObject;
uniform int uPickedObject;
uniform int uPickedFace;

layout(location = 0) out vec4 fColor;
layout(location = 1) out uvec4 fId;

void main()
{
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDirection);
    vec3 E = normalize(-vPosition);
    vec3 H = normalize(L + E);
    float Kd = max(dot(N, L), 0.0);
    float Ks = (Kd > 0.0) ? pow(max(dot(N, H), 0.0), 40.0) : 0.0;

    vec3 color = uColor*(0.25 + 0.75*Kd) + vec3(0.35*Ks);
    if (uObject == uPickedObject && (uPickedFace < 0 || vFace == uPickedFace)) {
        color = mix(color, vec3(1.0, 1.0, 1.0), 0.45);
    }
    fColor = vec4(color, 1.0);
    fId = uvec4(uint(uObject*6 + vFace + 1), 0u, 0u, 0u);
}
