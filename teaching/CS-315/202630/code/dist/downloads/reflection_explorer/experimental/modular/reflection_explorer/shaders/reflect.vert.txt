#version 300 es

/* reflection / refraction vertex shader
 *
 * One shader that can behave like the vertex shaders of reflectionMap,
 * reflectionMap1, reflectionMap2, reflectingCube and reflectingSphere, selected
 * by uniforms so that the page can draw the same object twice under two
 * different settings.
 *
 *   uSpace          0: the reflection vector stays in EYE coordinates, as in the
 *                      orbiting-camera samples
 *                   1: it is rotated into WORLD coordinates, where a cube map lives
 *   uEyeNormalized  0: reflect(eyePos, N)             (reflectionMap, reflectionMap1)
 *                   1: reflect(normalize(eyePos), N)  (reflectionMap2)
 *
 * The vectors are computed here for every vertex and interpolated. With
 * uWhere = 1 the fragment shader recomputes them for every pixel instead.
 */

in vec4 aPosition;
in vec3 aNormal;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;
uniform mat3 uViewRotationInverse;   /* eye -> world */
uniform mat3 uEnvMatrix;             /* world -> environment: rotates the environment */
uniform int uSpace;
uniform int uEyeNormalized;
uniform float uIor;
uniform float uDispersion;

/* the Phong model of reflectingSphere */
uniform vec4 uLightPosition;         /* eye coordinates; w = 0 for a directional light */
uniform vec3 uAmbientProduct;
uniform vec3 uDiffuseProduct;
uniform vec3 uSpecularProduct;
uniform float uShininess;

out vec3 vPosEye;
out vec3 vNormalEye;
out vec3 vR;         /* the reflection vector, as the cube map will be looked up */
out vec3 vTr;        /* refracted vectors for the red, green and blue channels */
out vec3 vTg;
out vec3 vTb;
out vec3 vLit;       /* per-vertex lighting */

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

void main()
{
    gl_Position = uProjectionMatrix*uModelViewMatrix*aPosition;

    vec3 pos = (uModelViewMatrix*aPosition).xyz;       /* vertex position in eye coordinates */
    vec3 N = normalize(uNormalMatrix*aNormal);

    vec3 I = (uEyeNormalized == 1) ? normalize(pos) : pos;
    vR = lookupDirection(reflect(I, N));

    /* the incident direction is normalized for refraction; the red channel bends least */
    vec3 In = normalize(pos);
    vTr = lookupDirection(refract(In, N, 1.0/(uIor - uDispersion)));
    vTg = lookupDirection(refract(In, N, 1.0/uIor));
    vTb = lookupDirection(refract(In, N, 1.0/(uIor + uDispersion)));

    vPosEye = pos;
    vNormalEye = N;
    vLit = phong(pos, N);
}
