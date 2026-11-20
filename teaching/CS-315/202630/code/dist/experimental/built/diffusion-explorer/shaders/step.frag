#version 300 es

/* One step of the simulation: reads the current state, writes the next.
 *
 * uRule: 0 average of the 4 neighbours   (render3, render4, particleDiffusion)
 *        1 explicit heat step            u + r*(sum of 4 neighbours - 4u)   (render5: r = 0.5)
 *        2 average of centre and 4 neighbours
 *        3 Gray-Scott reaction-diffusion (U in red, V in green, 3x3 Laplacian)
 *        4 none: copy
 *
 * Texels are read with texelFetch, so the boundary rule is explicit (uBoundary:
 * 0 clamp to the edge, 1 wrap around) instead of depending on the sampler.
 * The result is written to the other texture of the pair; an RGBA8 target
 * clamps it to [0, 1] and rounds it to a multiple of 1/255.
 */

precision highp float;
precision highp int;

uniform highp sampler2D uState;
uniform int uRule;
uniform int uBoundary;
uniform float uRate;
uniform float uDecay;
uniform float uFeed;
uniform float uKill;
uniform float uDiffU;
uniform float uDiffV;

out vec4 fColor;

ivec2 size;

vec4 at(ivec2 p)
{
    if (uBoundary == 1) {
        /* neighbours are at most one texel outside, so one add or subtract wraps them */
        if (p.x < 0) p.x += size.x; else if (p.x >= size.x) p.x -= size.x;
        if (p.y < 0) p.y += size.y; else if (p.y >= size.y) p.y -= size.y;
    } else {
        p = clamp(p, ivec2(0), size - 1);
    }
    return texelFetch(uState, p, 0);
}

void main()
{
    size = textureSize(uState, 0);
    ivec2 p = ivec2(gl_FragCoord.xy);

    vec4 c = at(p);
    vec4 sum = at(p + ivec2(1, 0)) + at(p + ivec2(-1, 0)) + at(p + ivec2(0, 1)) + at(p + ivec2(0, -1));

    if (uRule == 3) {
        vec4 diagonals = at(p + ivec2(1, 1)) + at(p + ivec2(1, -1)) + at(p + ivec2(-1, 1)) + at(p + ivec2(-1, -1));
        vec4 lap = -c + 0.2*sum + 0.05*diagonals;
        float u = c.r;
        float v = c.g;
        float uvv = u*v*v;
        fColor = vec4(u + uDiffU*lap.r - uvv + uFeed*(1.0 - u),
                      v + uDiffV*lap.g + uvv - (uFeed + uKill)*v,
                      0.0, 1.0);
        return;
    }

    vec3 next;
    if (uRule == 0) next = sum.rgb/4.0;
    else if (uRule == 1) next = c.rgb + uRate*(sum.rgb - 4.0*c.rgb);
    else if (uRule == 2) next = (c.rgb + sum.rgb)/5.0;
    else next = c.rgb;

    fColor = vec4(next*uDecay, 1.0);
}
