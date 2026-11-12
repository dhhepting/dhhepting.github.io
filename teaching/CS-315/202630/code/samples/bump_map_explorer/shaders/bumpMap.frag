#version 300 es

/* bump map fragment shader
 *
 * The texture holds the tangent-space normal in RGB (packed as 0.5*N + 0.5)
 * and the height in A.
 *
 * uView: 0 bump-mapped lighting
 *        1 the flat surface, lit the same way (no bump), for comparison
 *        2 the normal map itself (RGB)
 *        3 the height map itself (A)
 *        4 bump-mapped lighting, tinted by the mip level being sampled
 */

precision highp float;

in vec3 L;
in vec3 V;
in vec2 vTexCoord;

uniform sampler2D uTexMap;
uniform vec4 uAmbientProduct;
uniform vec4 uDiffuseProduct;
uniform vec4 uSpecularProduct;
uniform float uShininess;
uniform int uView;
uniform float uTexSize;     /* texels along one side of level 0 */
uniform float uLodBias;

out vec4 fColor;

const vec3 levelTint[10] = vec3[10](
    vec3(1.0, 1.0, 1.0),
    vec3(0.45, 0.65, 1.0),
    vec3(0.45, 1.0, 0.55),
    vec3(1.0, 1.0, 0.35),
    vec3(1.0, 0.65, 0.25),
    vec3(1.0, 0.35, 0.35),
    vec3(0.85, 0.4, 1.0),
    vec3(0.35, 0.9, 0.9),
    vec3(0.6, 0.6, 0.6),
    vec3(0.3, 0.3, 0.3)
);

void main()
{
    vec4 texel = texture(uTexMap, vTexCoord, uLodBias);

    if (uView == 2) { fColor = vec4(texel.rgb, 1.0); return; }
    if (uView == 3) { fColor = vec4(vec3(texel.a), 1.0); return; }

    /* the surface normal in tangent space */

    vec3 NN = (uView == 1) ? vec3(0.0, 0.0, 1.0) : normalize(2.0*texel.xyz - 1.0);
    vec3 LL = normalize(L);
    vec3 VV = normalize(V);
    vec3 H = normalize(LL + VV);

    /* light below the horizon of the surface itself lights nothing */

    float above = (LL.z > 0.0) ? 1.0 : 0.0;

    float Kd = max(dot(NN, LL), 0.0)*above;
    float Ks = (Kd > 0.0) ? pow(max(dot(NN, H), 0.0), uShininess) : 0.0;

    vec3 color = uAmbientProduct.rgb + Kd*uDiffuseProduct.rgb + Ks*uSpecularProduct.rgb;

    if (uView == 4) {
        /* an isotropic estimate of the level of detail the hardware picks */
        vec2 dx = dFdx(vTexCoord*uTexSize);
        vec2 dy = dFdy(vTexCoord*uTexSize);
        float lod = max(log2(max(max(length(dx), length(dy)), 1e-6)), 0.0) + uLodBias;
        color *= levelTint[clamp(int(floor(lod)), 0, 9)];
    }

    fColor = vec4(color, 1.0);
}
