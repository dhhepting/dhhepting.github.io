#version 300 es
precision highp float;

// Diffusion + decay of the trail field (reads one ping-pong texture, writes the other).
// The texture uses REPEAT wrapping, so the field is a torus.

uniform sampler2D uTrail;
uniform vec2 uTexel;
uniform float uDiffuse;   // 0..1: how far to move toward the blurred value
uniform float uDecay;     // per-step multiplier

out vec4 outColor;

void main() {
    vec2 uv = gl_FragCoord.xy * uTexel;
    vec2 t = uTexel;

    float c  = texture(uTrail, uv).r;
    float n  = texture(uTrail, uv + vec2(0.0,  t.y)).r;
    float s  = texture(uTrail, uv + vec2(0.0, -t.y)).r;
    float e  = texture(uTrail, uv + vec2( t.x, 0.0)).r;
    float w  = texture(uTrail, uv + vec2(-t.x, 0.0)).r;
    float ne = texture(uTrail, uv + vec2( t.x,  t.y)).r;
    float nw = texture(uTrail, uv + vec2(-t.x,  t.y)).r;
    float se = texture(uTrail, uv + vec2( t.x, -t.y)).r;
    float sw = texture(uTrail, uv + vec2(-t.x, -t.y)).r;

    // 3x3 binomial kernel [1 2 1; 2 4 2; 1 2 1] / 16
    float blur = (4.0 * c + 2.0 * (n + s + e + w) + (ne + nw + se + sw)) / 16.0;
    float v = mix(c, blur, uDiffuse) * uDecay;
    outColor = vec4(v, 0.0, 0.0, 1.0);
}
