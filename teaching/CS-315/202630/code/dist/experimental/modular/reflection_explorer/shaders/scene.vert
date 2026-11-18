#version 300 es

/* Draws the small coloured spheres that orbit the reflecting object. */

in vec4 aPosition;
in vec3 aNormal;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;

out vec3 vNormalEye;

void main()
{
    vNormalEye = normalize(uNormalMatrix*aNormal);
    gl_Position = uProjectionMatrix*uModelViewMatrix*aPosition;
}
