#version 300 es

/* Diffuse lighting from the light, shadowed through the shadow map, plus the slide
 * projected from the light (projectiveTexture.js).
 *
 * uStorage: how the shadow map holds depth (see depth.frag). 0 and 1 read a colour
 *   texture and compare in the shader; 2 uses a depth texture through a shadow
 *   sampler, which compares in hardware and, with LINEAR filtering, blends 2 x 2 results.
 * Lit when (fragment depth - bias) <= stored depth: shadowMap.js's
 *   "shadowCoord.z < depth + 0.005".
 * uProjector: 0 off, 1 correct (divide by w), 2 as projectiveTexture.js
 *   (0.5*clip.xyz + 0.5, then textureProj divides by the third component).
 */

precision highp float;
precision highp int;
precision highp sampler2DShadow;

in vec3 vColor;
in vec3 vNormal;
in vec3 vWorld;
in vec4 vLightClip;
in vec4 vProjectorClip;

uniform sampler2D uShadowColor;
uniform sampler2DShadow uShadowDepth;
uniform sampler2D uSlide;
uniform int uStorage;
uniform int uShadows;
uniform float uBias;
uniform int uSlopeBias;
uniform int uPcf;              /* kernel radius in texels: 0, 1 (3 x 3) or 2 (5 x 5) */
uniform float uMapSize;
uniform vec3 uLightPosition;
uniform float uAmbient;
uniform int uProjector;
uniform int uSampleShading;    /* shadowMap.js: the surface colour, or black in shadow, no lighting */
uniform int uView;             /* 0 shaded, 1 the shadow test only, 2 depth from the light minus stored depth */

out vec4 fColor;

float storedDepth(vec2 uv)
{
    vec4 s = texture(uShadowColor, uv);
    if (uStorage == 1) return dot(s, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0));
    return s.x;
}

/* 1 = lit, 0 = in shadow */
float visibility(vec3 shadowCoord, float bias)
{
    float lit = 0.0;
    float count = 0.0;
    for (int dy = -2; dy <= 2; dy++) {
        for (int dx = -2; dx <= 2; dx++) {
            if (abs(dx) > uPcf || abs(dy) > uPcf) continue;
            vec2 uv = shadowCoord.xy + vec2(dx, dy)/uMapSize;
            if (uStorage == 2) lit += texture(uShadowDepth, vec3(uv, shadowCoord.z - bias));
            else lit += (shadowCoord.z - bias <= storedDepth(uv)) ? 1.0 : 0.0;
            count += 1.0;
        }
    }
    return lit/count;
}

void main()
{
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightPosition - vWorld);
    float cosTheta = dot(N, L);
    if (!gl_FrontFacing) { N = -N; cosTheta = -cosTheta; }    /* the triangle and floor are seen from both sides */

    /* rescale from [-1, 1] to [0, 1] after the perspective divide */
    vec3 shadowCoord = 0.5*vLightClip.xyz/vLightClip.w + 0.5;
    bool insideMap = all(greaterThanEqual(shadowCoord, vec3(0.0))) && all(lessThanEqual(shadowCoord, vec3(1.0)));

    float bias = uBias;
    if (uSlopeBias == 1) bias *= clamp(sqrt(max(1.0 - cosTheta*cosTheta, 0.0))/max(cosTheta, 0.05), 1.0, 10.0);

    float lit = (uShadows == 1 && insideMap) ? visibility(shadowCoord, bias) : 1.0;

    if (uView == 2) {
        float difference = shadowCoord.z - storedDepth(shadowCoord.xy);
        fColor = vec4(clamp(vec3(0.5) + vec3(difference, -difference, 0.0)*200.0, 0.0, 1.0), 1.0);
        return;
    }
    if (uView == 1) { fColor = vec4(vec3(lit), 1.0); return; }

    vec3 color;
    if (uSampleShading == 1) {
        color = vColor*lit;
    } else {
        float diffuse = max(cosTheta, 0.0)*lit;
        color = vColor*(uAmbient + (1.0 - uAmbient)*diffuse);
    }

    if (uProjector > 0) {
        vec4 slide;
        if (uProjector == 2) {
            vec3 coord = 0.5*vProjectorClip.xyz + 0.5;
            slide = textureProj(uSlide, coord);
        } else {
            vec2 uv = 0.5*vProjectorClip.xy/vProjectorClip.w + 0.5;
            bool ahead = vProjectorClip.w > 0.0 && all(greaterThanEqual(uv, vec2(0.0))) && all(lessThanEqual(uv, vec2(1.0)));
            slide = ahead ? texture(uSlide, uv) : vec4(0.0);
        }
        /* the projector adds light where the slide is white and the surface faces it */
        color += 0.8*slide.rgb*max(cosTheta, 0.0)*lit*vColor;
    }

    fColor = vec4(color, 1.0);
}
