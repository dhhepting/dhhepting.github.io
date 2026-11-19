#version 300 es
precision highp float;

in vec3 vNormal;
in vec2 vUV;

uniform sampler2D uTrail;
uniform float uExposure;
uniform vec3 uLightDir;   // world space, normalized, pointing toward the light

out vec4 outColor;

#pragma include colormap

void main() {
    float v = texture(uTrail, vUV).r;
    vec3 albedo = shadeConcentration(v, uExposure);
    float diffuse = max(dot(normalize(vNormal), uLightDir), 0.0);
    float light = 0.45 + 0.75 * diffuse;
    outColor = vec4(albedo * light, 1.0);
}
