#version 300 es

/* The lit image: per-fragment Blinn-Phong, with the picked object and face highlighted. */

precision highp float;
precision highp int;

in vec3 vNormal;
in vec3 vPosition;
flat in int vFace;

uniform vec3 uColor;
uniform vec3 uLightDirection;    /* eye coordinates, towards the light */
uniform int uObject;
uniform int uPickedObject;       /* -1 for none */
uniform int uPickedFace;         /* -1 for the whole object */

out vec4 fColor;

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
}
