#version 300 es

/* bump map vertex shader
 *
 * Based on the bumpMap sample: the light and view vectors are expressed in
 * texture (tangent) space, with axes T (the direction of increasing s),
 * B = cross(N, T) (increasing t) and N (the surface normal).
 *
 * Differences from the sample:
 *  - L and V are NOT normalized here. They are linear in position, so for a
 *    flat quad the interpolated values are exact; the fragment shader
 *    normalizes them.
 *  - the light may be directional (w = 0) as well as a point light (w = 1).
 *  - the texture coordinates are scaled so the texture can be repeated.
 */

in vec2 aTexCoord;
in vec4 aPosition;

out vec3 L; /* light vector in texture-space coordinates */
out vec3 V; /* view vector in texture-space coordinates */
out vec2 vTexCoord;

uniform vec4 uNormal;
uniform vec4 uLightPosition;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;
uniform vec3 uObjTangent; /* tangent vector in object coordinates */
uniform float uTexScale;  /* how many times the texture repeats across the surface */

void main()
{
    gl_Position = uProjectionMatrix*uModelViewMatrix*aPosition;

    vTexCoord = aTexCoord*uTexScale;

    vec3 eyePosition = (uModelViewMatrix*aPosition).xyz;
    vec3 eyeLightPos = (uModelViewMatrix*uLightPosition).xyz;

    /* normal, tangent and binormal in eye coordinates */

    vec3 N = normalize(uNormalMatrix*uNormal.xyz);
    vec3 T = normalize(uNormalMatrix*uObjTangent);
    vec3 B = cross(N, T);

    /* vector to the light: a direction if w = 0, otherwise a position */

    vec3 toLight = (uLightPosition.w == 0.0) ? eyeLightPos : eyeLightPos - eyePosition;

    /* light vector in texture space */

    L.x = dot(T, toLight);
    L.y = dot(B, toLight);
    L.z = dot(N, toLight);

    /* view vector in texture space */

    V.x = dot(T, -eyePosition);
    V.y = dot(B, -eyePosition);
    V.z = dot(N, -eyePosition);
}
