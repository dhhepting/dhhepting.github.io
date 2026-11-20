#version 300 es
precision highp float;
precision highp int;

// One fragment per particle. State texel: xy = position in [0,1) uv space.

uniform sampler2D uPos;
uniform sampler2D uTrail;
uniform vec2 uTrailTexel;
uniform float uSigma;   // Brownian step size (uv / step)
uniform float uChemo;   // +: climb trail gradient, -: flee it
uniform uint uFrame;

out vec4 outState;

uint pcg(uint v) {
    uint s = v * 747796405u + 2891336453u;
    uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
    return (w >> 22u) ^ w;
}

vec2 rand2(uvec2 id) {
    uint a = pcg(id.x ^ pcg(id.y ^ pcg(uFrame)));
    uint b = pcg(a ^ 0x9E3779B9u);
    return vec2(float(a), float(b)) * (1.0 / 4294967295.0);
}

// Box-Muller: two uniforms -> two independent standard normals.
vec2 gaussian(vec2 u) {
    float r = sqrt(-2.0 * log(max(u.x, 1e-6)));
    float t = 6.28318530718 * u.y;
    return r * vec2(cos(t), sin(t));
}

void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    vec2 p = texelFetch(uPos, c, 0).xy;

    vec2 walk = gaussian(rand2(uvec2(c))) * uSigma;

    // Relative gradient of the trail field (central differences, 2 texels wide).
    vec2 dx = vec2(uTrailTexel.x * 2.0, 0.0);
    vec2 dy = vec2(0.0, uTrailTexel.y * 2.0);
    float here = texture(uTrail, p).r;
    vec2 g = vec2(texture(uTrail, p + dx).r - texture(uTrail, p - dx).r,
                  texture(uTrail, p + dy).r - texture(uTrail, p - dy).r);
    vec2 rel = g / (here * 2.0 + 0.02);
    float len = length(rel);
    if (len > 1.0) rel /= len;
    vec2 drift = uChemo * uSigma * 3.0 * rel;

    p = fract(p + walk + drift);
    outState = vec4(p, 0.0, 1.0);
}
