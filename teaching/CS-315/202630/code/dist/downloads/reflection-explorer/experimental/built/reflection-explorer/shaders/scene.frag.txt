#version 300 es

precision highp float;

in vec3 vNormalEye;

uniform vec3 uColor;
uniform vec3 uLightDirection;    /* eye coordinates, unit length, towards the light */

out vec4 fColor;

void main()
{
    float Kd = max(dot(normalize(vNormalEye), uLightDirection), 0.0);
    fColor = vec4(uColor*(0.35 + 0.65*Kd), 1.0);
}
