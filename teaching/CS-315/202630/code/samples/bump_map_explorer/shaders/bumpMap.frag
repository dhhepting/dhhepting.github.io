#version 300 es

/* bump map fragment shader
 *
 * The normal texture holds the tangent-space normal in RGB (packed as 0.5*N + 0.5)
 * and the height in A. An optional colour map holds the surface colour.
 *
 * Everything is done in tangent space: the surface is the xy plane, +z is up,
 * +x is the direction of increasing s and +y of increasing t.
 *
 * Material (uMaterial): 0 diffuse + specular, 1 metal (reflects the sky), 2 water.
 * View (uView):
 *   0 shaded                      5 the colour map
 *   1 the flat surface, shaded    6 length of the filtered normal (1 = unit)
 *   2 the normal map              7 light vector in tangent space
 *   3 the height map              8 view vector in tangent space
 *   4 shaded, tinted by mip level
 *
 * A split view (uSplitMode) shades the left of uSplitX with the baseline and the
 * right with the selected option: 1 parallax occlusion vs none, 2 derivative vs
 * stored normals, 3 Toksvig vs none.
 *
 * Height units: uBumpHeight is the height of the surface as a fraction of the
 * width of ONE copy of the texture, the same units the normal map was built in,
 * so repeating the texture shrinks the relief with it.
 */

precision highp float;
precision highp sampler2D;

in vec3 L;          /* vector to the light, tangent space, not normalized */
in vec3 V;          /* vector to the eye, tangent space, not normalized; -V is the fragment's position */
in vec2 vTexCoord;

uniform sampler2D uTexMap;
uniform sampler2D uColorMap;
uniform int uUseColor;
uniform vec3 uSurfaceColor;
uniform float uAmbient;
uniform float uSpecularStrength;
uniform float uShininess;
uniform int uMaterial;
uniform int uView;
uniform float uTexSize;     /* texels along one side of level 0 */
uniform float uTexScale;    /* repeats of the texture across the surface */
uniform float uLodBias;
uniform float uBumpHeight;
uniform int uRelief;        /* 0 none, 1 parallax offset, 2 parallax occlusion */
uniform int uReliefSteps;
uniform int uNormalSource;  /* 0 stored map, 1 derivatives of the height */
uniform int uToksvig;
uniform int uConvention;    /* 0 correct, 1 flipped green, 2 x/y swapped, 3 rotated 90 degrees */
uniform int uSplitMode;
uniform float uSplitX;      /* in pixels */
uniform float uTime;

uniform float uWaterScale1;
uniform float uWaterScale2;
uniform float uWaterLayer2;
uniform float uWaterFresnel;
uniform float uWaterDepth;
uniform float uWaterDistortion;
uniform vec2 uWaterFlow1;
uniform vec2 uWaterFlow2;

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

/* A procedural sky seen along dir (tangent space, +z up), with the sun in the
   direction sunDir. The sun's glint is tighter the larger shin is. */
vec3 skyColor(vec3 dir, vec3 sunDir, float shin)
{
    vec3 d = normalize(dir);
    vec3 horizon = vec3(0.78, 0.86, 0.95);
    vec3 zenith = vec3(0.22, 0.45, 0.85);
    vec3 ground = vec3(0.18, 0.20, 0.22);

    vec3 sky = mix(horizon, zenith, pow(clamp(d.z, 0.0, 1.0), 0.45));
    sky = mix(sky, ground, 1.0 - smoothstep(-0.15, 0.0, d.z));

    float s = max(dot(d, sunDir), 0.0);
    sky += vec3(1.0, 0.92, 0.75)*(pow(s, shin)*3.0*uSpecularStrength + pow(s, 6.0)*0.12);
    return sky;
}

/* The normal-map error modes used to show what a wrong tangent frame does. */
vec3 applyConvention(vec3 n)
{
    if (uConvention == 1) return vec3(n.x, -n.y, n.z);      /* bumpMap.js: the green channel is mirrored */
    if (uConvention == 2) return vec3(n.y, n.x, n.z);
    if (uConvention == 3) return vec3(-n.y, n.x, n.z);      /* bumpMap2.js: the normal is rotated by 90 degrees */
    return n;
}

/* Length of the filtered normal relative to the unfiltered one: 1 where the
   normals agree, smaller where mip levels (or minification) averaged normals
   that point in different directions. Dividing by the level-0 length removes
   the rounding of the 8-bit map, which Toksvig's formula would otherwise amplify. */
float normalLengthRatio(vec2 uv, vec2 gx, vec2 gy)
{
    float l = length(2.0*textureGrad(uTexMap, uv, gx, gy).rgb - 1.0);
    float l0 = length(2.0*textureLod(uTexMap, uv, 0.0).rgb - 1.0);
    return clamp(l/max(l0, 1e-4), 0.0, 1.0);
}

/* Parallax: find where the view ray meets the height field, treating the quad
   as the TOP of a volume of depth uBumpHeight (the units the normal map uses),
   and return the texture coordinate to use there. */
vec2 reliefUV(vec2 uv, vec3 VV, vec2 gx, vec2 gy, int mode)
{
    float h0 = textureGrad(uTexMap, uv, gx, gy).a;

    /* parallax with offset limiting: one extra sample */
    if (mode == 1) return uv - VV.xy*((1.0 - h0)*uBumpHeight);

    /* parallax occlusion: march the ray down through uReliefSteps layers */
    vec2 shift = VV.xy/max(VV.z, 0.05)*uBumpHeight;     /* uv shift at full depth */
    float layerDepth = 1.0/float(uReliefSteps);
    float depth = 0.0;
    float surfaceDepth = 1.0 - h0;
    vec2 cur = uv;
    vec2 prev = uv;
    float prevDepth = 0.0;
    float prevSurface = surfaceDepth;

    for (int i = 0; i < 64; i++) {
        if (i >= uReliefSteps || depth >= surfaceDepth) break;
        prev = cur;
        prevDepth = depth;
        prevSurface = surfaceDepth;
        cur -= shift*layerDepth;
        depth += layerDepth;
        surfaceDepth = 1.0 - textureGrad(uTexMap, cur, gx, gy).a;
    }

    /* interpolate between the last two samples where the ray crosses the surface */
    float after = surfaceDepth - depth;
    float before = prevSurface - prevDepth;
    float w = (after - before == 0.0) ? 0.0 : clamp(after/(after - before), 0.0, 1.0);
    return mix(cur, prev, w);
}

/* Perturb the surface normal from derivatives of the height, with no normal
   map (Mikkelsen, "Bump mapping unparametrized surfaces on the GPU"). In
   tangent space the surface normal is +z and the fragment's position is -V. */
vec3 derivativeNormal(float heightWorld)
{
    vec3 dpdx = dFdx(-V);
    vec3 dpdy = dFdy(-V);
    float dHdx = dFdx(heightWorld);
    float dHdy = dFdy(heightWorld);

    vec3 N = vec3(0.0, 0.0, 1.0);
    vec3 r1 = cross(dpdy, N);
    vec3 r2 = cross(N, dpdx);
    float det = dot(dpdx, r1);
    vec3 grad = sign(det)*(dHdx*r1 + dHdy*r2);
    return normalize(abs(det)*N - grad);
}

/* Water: two scrolling copies of the normal map, at different scales, their
   slopes added; Fresnel-weighted mix of the reflected sky and a refracted floor. */
vec3 waterColor(vec2 gx, vec2 gy, vec3 LL, vec3 VV, bool flatSurface, bool toksvig)
{
    vec2 uv1 = vTexCoord*uWaterScale1 + uTime*uWaterFlow1;
    vec2 uv2 = vTexCoord*uWaterScale2 + uTime*uWaterFlow2;
    vec2 g1x = gx*uWaterScale1;
    vec2 g1y = gy*uWaterScale1;
    vec2 g2x = gx*uWaterScale2;
    vec2 g2y = gy*uWaterScale2;

    vec3 n1 = 2.0*textureGrad(uTexMap, uv1, g1x, g1y).rgb - 1.0;
    vec3 n2 = 2.0*textureGrad(uTexMap, uv2, g2x, g2y).rgb - 1.0;

    /* a normal (nx, ny, nz) has slope (nx/nz, ny/nz); adding height fields adds slopes */
    vec2 slope = n1.xy/max(n1.z, 0.05) + uWaterLayer2*(n2.xy/max(n2.z, 0.05));
    vec3 N = flatSurface ? vec3(0.0, 0.0, 1.0) : normalize(vec3(slope, 1.0));

    float shin = uShininess;
    if (toksvig && !flatSurface) {
        float r = 0.5*(normalLengthRatio(uv1, g1x, g1y) + normalLengthRatio(uv2, g2x, g2y));
        shin *= r/(r + uShininess*(1.0 - r));
    }

    float cosT = max(dot(N, VV), 0.0);
    float F = 0.02 + 0.98*pow(1.0 - cosT, uWaterFresnel);     /* Schlick; 0.02 is the reflectance of water at normal incidence */

    vec3 R = reflect(-VV, N);
    vec3 reflected = skyColor(R, LL, shin);

    /* refraction: where the refracted ray meets a tiled floor uWaterDepth below the surface */
    vec3 T = refract(-VV, N, 1.0/1.33);
    float down = max(-T.z, 0.05);
    vec2 offset = T.xy/down*uWaterDepth + N.xy*uWaterDistortion;
    vec2 floorUV = (vTexCoord/uTexScale + offset)*8.0;
    float tile = mod(floor(floorUV.x) + floor(floorUV.y), 2.0);
    vec3 floorColor = mix(vec3(0.55, 0.62, 0.60), vec3(0.78, 0.82, 0.80), tile);
    vec3 absorb = exp(-uWaterDepth*vec3(2.4, 0.9, 0.55)*2.0/down);        /* Beer-Lambert along the refracted path */
    vec3 deep = vec3(0.01, 0.10, 0.18);
    vec3 refracted = floorColor*absorb + deep*(1.0 - absorb);

    return mix(refracted, reflected, F);
}

void main()
{
    /* texture-coordinate derivatives, taken before any branching; the lod bias scales them */
    vec2 gx = dFdx(vTexCoord)*exp2(uLodBias);
    vec2 gy = dFdy(vTexCoord)*exp2(uLodBias);

    /* in a split view, the right-hand side gets the selected option and the left the baseline */
    bool alt = (uSplitMode == 0) || (gl_FragCoord.x >= uSplitX);
    int relief = (uSplitMode == 1) ? (alt ? uRelief : 0) : uRelief;
    int normalSource = (uSplitMode == 2) ? (alt ? 1 : 0) : uNormalSource;
    bool toksvig = (uSplitMode == 3) ? alt : (uToksvig == 1);

    vec3 LL = normalize(L);
    vec3 VV = normalize(V);

    if (uView == 7) { fColor = vec4(0.5*LL + 0.5, 1.0); return; }
    if (uView == 8) { fColor = vec4(0.5*VV + 0.5, 1.0); return; }

    vec2 uv = vTexCoord;
    if (uMaterial != 2 && relief > 0) uv = reliefUV(vTexCoord, VV, gx, gy, relief);

    vec4 texel = textureGrad(uTexMap, uv, gx, gy);
    vec3 albedo = uSurfaceColor;
    if (uUseColor == 1) albedo *= textureGrad(uColorMap, uv, gx, gy).rgb;

    if (uView == 2) { fColor = vec4(texel.rgb, 1.0); return; }
    if (uView == 3) { fColor = vec4(vec3(texel.a), 1.0); return; }
    if (uView == 5) { fColor = vec4((uUseColor == 1) ? textureGrad(uColorMap, uv, gx, gy).rgb : uSurfaceColor, 1.0); return; }
    if (uView == 6) { float r = normalLengthRatio(uv, gx, gy); fColor = vec4(vec3(r), 1.0); return; }

    bool flatSurface = (uView == 1);

    vec3 color;
    if (uMaterial == 2) {
        color = waterColor(gx, gy, LL, VV, flatSurface, toksvig);
    } else {
        /* the surface normal */
        vec3 stored = normalize(applyConvention(2.0*texel.rgb - 1.0));
        vec3 fromHeight = derivativeNormal(texel.a*uBumpHeight/uTexScale);
        vec3 N = flatSurface ? vec3(0.0, 0.0, 1.0) : ((normalSource == 1) ? fromHeight : stored);

        /* Toksvig: widen the highlight by the normal length lost to filtering */
        float shin = uShininess;
        if (toksvig && normalSource == 0 && !flatSurface) {
            float r = normalLengthRatio(uv, gx, gy);
            shin *= r/(r + uShininess*(1.0 - r));
        }

        if (uMaterial == 1) {
            vec3 R = reflect(-VV, N);
            color = albedo*skyColor(R, LL, shin) + albedo*uAmbient*0.25;
        } else {
            /* light below the horizon of the surface itself lights nothing */
            float above = (LL.z > 0.0) ? 1.0 : 0.0;
            float Kd = max(dot(N, LL), 0.0)*above;
            vec3 H = normalize(LL + VV);
            float Ks = (Kd > 0.0) ? pow(max(dot(N, H), 0.0), shin) : 0.0;
            color = albedo*(uAmbient + Kd) + vec3(Ks*uSpecularStrength);
        }
    }

    if (uView == 4) {
        /* an isotropic estimate of the level of detail the hardware picks */
        float lod = max(log2(max(max(length(gx*uTexSize), length(gy*uTexSize)), 1e-6)), 0.0);
        color *= levelTint[clamp(int(floor(lod)), 0, 9)];
    }

    if (uSplitMode > 0 && abs(gl_FragCoord.x - uSplitX) < 1.0) color = vec3(0.05);

    fColor = vec4(color, 1.0);
}
