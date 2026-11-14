#version 300 es

/* reflection / refraction fragment shader
 *
 * uShade: 0 mirror                     (reflectionMap)
 *         1 lit surface x environment  (reflectingSphere: vColor*texColor)
 *         2 plastic: lit surface plus a Fresnel-weighted reflection
 *         3 glossy metal: the reflection read from a blurred (mip) level
 *         4 glass: refraction with dispersion, mixed with a Fresnel reflection
 * uView:  0 shaded, 1 the lookup direction as a colour, 2 the normal as a colour,
 *         3 the cube-map face that is hit, in the textbook's six colours
 */

precision highp float;
precision highp int;           /* uniforms shared with the vertex shader must have the same precision */
precision highp samplerCube;

in vec3 vPosEye;
in vec3 vNormalEye;
in vec3 vR;
in vec3 vTr;
in vec3 vTg;
in vec3 vTb;
in vec3 vLit;

uniform samplerCube uEnv;
uniform mat3 uViewRotationInverse;
uniform mat3 uEnvMatrix;
uniform int uSpace;
uniform int uWhere;          /* 0 per vertex, 1 per fragment */
uniform int uShade;
uniform int uView;

uniform vec3 uTint;
uniform float uReflectivity; /* reflectance at normal incidence, for plastic */
uniform float uRoughness;
uniform float uMaxLod;       /* the coarsest mip level of the environment */
uniform float uIor;
uniform float uDispersion;

uniform vec4 uLightPosition;
uniform vec3 uAmbientProduct;
uniform vec3 uDiffuseProduct;
uniform vec3 uSpecularProduct;
uniform float uShininess;

out vec4 fColor;

vec3 lookupDirection(vec3 eyeDirection)
{
    return uEnvMatrix*((uSpace == 1) ? uViewRotationInverse*eyeDirection : eyeDirection);
}

vec3 phong(vec3 pos, vec3 N)
{
    vec3 L = (uLightPosition.w == 0.0) ? normalize(uLightPosition.xyz) : normalize(uLightPosition.xyz - pos);
    vec3 E = -normalize(pos);
    vec3 H = normalize(L + E);

    float Kd = max(dot(L, N), 0.0);
    float Ks = pow(max(dot(N, H), 0.0), uShininess);
    if (dot(L, N) < 0.0) Ks = 0.0;

    return uAmbientProduct + Kd*uDiffuseProduct + Ks*uSpecularProduct;
}

/* Schlick's approximation of the Fresnel reflectance */
float schlick(float f0, float cosTheta)
{
    return f0 + (1.0 - f0)*pow(1.0 - cosTheta, 5.0);
}

vec3 faceColour(vec3 d)
{
    vec3 a = abs(d);
    if (a.x >= a.y && a.x >= a.z) return (d.x > 0.0) ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    if (a.y >= a.z) return (d.y > 0.0) ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 1.0);
    return (d.z > 0.0) ? vec3(1.0, 1.0, 0.0) : vec3(1.0, 0.0, 1.0);
}

void main()
{
    vec3 N = normalize(vNormalEye);
    vec3 R = vR;
    vec3 Tr = vTr;
    vec3 Tg = vTg;
    vec3 Tb = vTb;
    vec3 lit = vLit;

    if (uWhere == 1) {
        /* per fragment: the exact vectors for this pixel (the eye vector is always normalized here) */
        vec3 In = normalize(vPosEye);
        R = lookupDirection(reflect(In, N));
        Tr = lookupDirection(refract(In, N, 1.0/(uIor - uDispersion)));
        Tg = lookupDirection(refract(In, N, 1.0/uIor));
        Tb = lookupDirection(refract(In, N, 1.0/(uIor + uDispersion)));
        lit = phong(vPosEye, N);
    }

    if (uView == 1) { fColor = vec4(0.5*normalize(R) + 0.5, 1.0); return; }
    if (uView == 2) { fColor = vec4(0.5*N + 0.5, 1.0); return; }
    if (uView == 3) { fColor = vec4(faceColour(R), 1.0); return; }

    float cosTheta = clamp(dot(N, -normalize(vPosEye)), 0.0, 1.0);
    vec3 color;

    if (uShade == 0) {
        color = texture(uEnv, R).rgb;
    } else if (uShade == 1) {
        color = lit*texture(uEnv, R).rgb;
    } else if (uShade == 2) {
        color = mix(lit, texture(uEnv, R).rgb, schlick(uReflectivity, cosTheta));
    } else if (uShade == 3) {
        color = uTint*textureLod(uEnv, R, uRoughness*uMaxLod).rgb;
    } else {
        vec3 refracted = vec3(texture(uEnv, Tr).r, texture(uEnv, Tg).g, texture(uEnv, Tb).b)*uTint;
        float f0 = pow((uIor - 1.0)/(uIor + 1.0), 2.0);
        color = mix(refracted, texture(uEnv, R).rgb, schlick(f0, cosTheta));
    }

    fColor = vec4(color, 1.0);
}
