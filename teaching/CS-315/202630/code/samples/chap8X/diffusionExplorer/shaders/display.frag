#version 300 es

/* Shows a state texture.
 *
 * uView: 0 the colours as stored
 *        1 one channel as grey, times uGain
 *        2 one channel through a heat colour map, times uGain
 *        3 the false colours of hatImage1 (green folded, blue inverted)
 *        4 edge strength, with the kernel uKernel, times uGain:
 *            0 central differences x 10, |gx| + |gy|   (hawaiiImage)
 *            1 weights (1, 3, 1), not normalized          (hawaiisobel)
 *            2 Sobel (1, 2, 1)/8
 *            3 Scharr (3, 10, 3)/32
 *        5 Gray-Scott: V (green) through the colour map
 * Values are read with texelFetch, so the display never filters the state.
 */

precision highp float;
precision highp int;

in vec2 vTexCoord;

uniform highp sampler2D uState;
uniform int uView;
uniform int uChannel;
uniform int uKernel;
uniform float uGain;

out vec4 fColor;

ivec2 size;

vec4 at(ivec2 p)
{
    return texelFetch(uState, clamp(p, ivec2(0), size - 1), 0);
}

vec3 heatMap(float t)
{
    t = clamp(t, 0.0, 1.0);
    vec3 a = vec3(0.02, 0.02, 0.10);
    vec3 b = vec3(0.45, 0.05, 0.55);
    vec3 c = vec3(0.95, 0.35, 0.10);
    vec3 d = vec3(1.00, 0.95, 0.60);
    if (t < 0.33) return mix(a, b, t/0.33);
    if (t < 0.66) return mix(b, c, (t - 0.33)/0.33);
    return mix(c, d, (t - 0.66)/0.34);
}

vec3 edges(ivec2 p)
{
    vec4 l = at(p + ivec2(-1, 0)), r = at(p + ivec2(1, 0)), d = at(p + ivec2(0, -1)), u = at(p + ivec2(0, 1));
    vec4 lu = at(p + ivec2(-1, 1)), ru = at(p + ivec2(1, 1)), ld = at(p + ivec2(-1, -1)), rd = at(p + ivec2(1, -1));

    if (uKernel == 0) return (10.0*abs(r - l) + 10.0*abs(u - d)).rgb;

    float w = (uKernel == 1) ? 3.0 : (uKernel == 2) ? 2.0 : 10.0;
    float scale = (uKernel == 1) ? 1.0 : (uKernel == 2) ? 1.0/8.0 : 1.0/32.0;
    float corner = (uKernel == 3) ? 3.0 : 1.0;
    vec4 gx = (w*r + corner*(ru + rd)) - (w*l + corner*(lu + ld));
    vec4 gy = (w*u + corner*(ru + lu)) - (w*d + corner*(rd + ld));
    return scale*sqrt(gx*gx + gy*gy).rgb;
}

void main()
{
    size = textureSize(uState, 0);
    ivec2 p = clamp(ivec2(vTexCoord*vec2(size)), ivec2(0), size - 1);
    vec4 s = at(p);
    float v = s[uChannel];

    vec3 color;
    if (uView == 0) color = s.rgb;
    else if (uView == 1) color = vec3(v*uGain);
    else if (uView == 2) color = heatMap(v*uGain);
    else if (uView == 3) {
        color = s.rgb;
        color.g = (color.g < 0.5) ? 2.0*color.g : 2.0 - 2.0*color.g;
        color.b = 1.0 - color.b;
    }
    else if (uView == 4) color = edges(p)*uGain;
    else color = heatMap(s.g*uGain*2.5);

    fColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
