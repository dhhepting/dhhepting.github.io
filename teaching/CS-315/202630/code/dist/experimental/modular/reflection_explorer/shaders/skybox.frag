#version 300 es

/* Draws the environment behind everything: each pixel looks up the cube map in
   the direction of its view ray, rotated from eye to world coordinates. */

precision highp float;
precision highp samplerCube;

in vec2 vNdc;

uniform samplerCube uEnv;
uniform mat3 uSkyRotation;      /* eye -> world */
uniform mat3 uEnvMatrix;        /* world -> environment */
uniform float uTanHalfFov;
uniform float uAspect;

out vec4 fColor;

void main()
{
    vec3 eyeDirection = normalize(vec3(vNdc.x*uTanHalfFov*uAspect, vNdc.y*uTanHalfFov, -1.0));
    fColor = vec4(texture(uEnv, uEnvMatrix*(uSkyRotation*eyeDirection)).rgb, 1.0);
}
