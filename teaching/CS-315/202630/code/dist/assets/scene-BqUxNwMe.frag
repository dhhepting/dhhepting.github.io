#version 300 es

precision highp float;
precision highp sampler2DShadow;

in vec3 vWorldPosition;
in vec3 vNormal;
in vec4 vProjTexCoord;

out vec4 fColor;

uniform sampler2D uProjectedTexture;      // the slide (texture unit 0)
uniform sampler2DShadow uShadowMap;       // depth seen by the projector (texture unit 1)

uniform vec3  uLightPosition;
uniform vec3  uLightDirection;            // surface -> light, used by an orthographic projector
uniform bool  uDirectional;
uniform vec3  uCameraPosition;

uniform vec3  uAlbedo;
uniform int   uSurface;                   // 0 plain, 1 floor tiles

uniform vec3  uLightTint;
uniform float uStrength;
uniform float uAmbient;
uniform int   uBlend;                     // 0 spotlight, 1 decal, 2 multiply, 3 additive
uniform int   uWrap;                      // 0 none, 1 clamp, 2 repeat, 3 mirror
uniform bool  uCircular;
uniform float uSoftness;
uniform bool  uShadows;
uniform float uShadowTexel;
uniform int   uDebug;                     // 0 normal, 1 texture coordinates, 2 shadow factor

void main()
{
    vec3 N = normalize(vNormal);
    vec3 L = uDirectional ? uLightDirection : normalize(uLightPosition - vWorldPosition);
    vec3 V = normalize(uCameraPosition - vWorldPosition);
    vec3 H = normalize(L + V);
    float ndl = max(dot(N, L), 0.0);

    vec3 albedo = uAlbedo;
    if (uSurface == 1) {
        vec2 tile = floor(vWorldPosition.xz);
        albedo *= 0.88 + 0.24 * mod(tile.x + tile.y, 2.0);
    }

    // --- where does this fragment fall in the projector's image? ---
    float q = vProjTexCoord.w;
    vec3 p = vProjTexCoord.xyz / q;                       // s, t in [0,1] inside the image; p.z = depth
    bool front = q > 0.0 && p.z >= 0.0 && p.z <= 1.0;    // in front of the projector, inside near/far
    bool inside = all(greaterThanEqual(p.xy, vec2(0.0))) && all(lessThanEqual(p.xy, vec2(1.0)));

    vec4 slide = textureProj(uProjectedTexture, vProjTexCoord);

    float mask = front ? 1.0 : 0.0;
    if (uWrap == 0 && !inside) mask = 0.0;
    if (uCircular) {
        float r = 2.0 * length(p.xy - 0.5);
        mask *= 1.0 - smoothstep(1.0 - max(uSoftness, 0.02), 1.0, r);
    }

    // --- is the light blocked on its way here? (3x3 percentage-closer filtering) ---
    float visibility = 1.0;
    if (uShadows) {
        float sum = 0.0;
        for (int i = -1; i <= 1; i++) {
            for (int j = -1; j <= 1; j++) {
                vec2 offset = vec2(float(i), float(j)) * uShadowTexel;
                sum += texture(uShadowMap, vec3(p.xy + offset, p.z - 0.0006));
            }
        }
        visibility = sum / 9.0;
        if (!inside || !front) visibility = 1.0;
    }

    float reach = mask * visibility;                      // how much of the slide reaches this fragment
    vec3 slideColour = slide.rgb * uLightTint;
    vec3 ambient = uAmbient * albedo * (0.7 + 0.3 * N.y);
    float spec = ndl > 0.0 ? pow(max(dot(N, H), 0.0), 64.0) : 0.0;

    vec3 colour;
    if (uBlend == 0) {
        // spotlight: the projector is the only light and the slide is its colour
        vec3 light = slideColour * uStrength * reach;
        colour = ambient + (albedo * ndl + 0.25 * spec) * light;
    } else {
        // the scene is lit plainly, and the slide is applied on top of that
        vec3 base = ambient + albedo * (0.75 * ndl) + 0.15 * spec;
        float a = clamp(uStrength, 0.0, 1.0) * reach;
        if (uBlend == 1) {                                // decal: slide replaces the surface colour
            vec3 painted = mix(albedo, slideColour, a);
            colour = uAmbient * painted * (0.7 + 0.3 * N.y) + painted * (0.75 * ndl) + 0.15 * spec;
        } else if (uBlend == 2) {                         // multiply: slide darkens / tints the surface
            colour = base * mix(vec3(1.0), slideColour, a);
        } else {                                          // additive: slide adds light
            colour = base + slideColour * uStrength * ndl * reach;
        }
    }

    if (uDebug == 1) {
        colour = vec3(clamp(p.xy, 0.0, 1.0), front ? 0.0 : 1.0) * (inside ? 1.0 : 0.45);
    } else if (uDebug == 2) {
        colour = vec3(visibility) * (ndl > 0.0 ? 1.0 : 0.35);
    }

    fColor = vec4(colour, 1.0);
}
