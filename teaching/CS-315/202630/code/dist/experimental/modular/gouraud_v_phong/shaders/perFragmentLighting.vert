#version 300 es

in vec4 aPosition;
in vec4 aNormal;
out vec3 N, L, E;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec4 uLightPosition;
uniform mat3 uNormalMatrix;

void main()
{
    vec3 pos = (uModelViewMatrix *aPosition).xyz;

    // check for directional light

    if(uLightPosition.w == 0.0) L = normalize(uLightPosition.xyz);
    else L = normalize( uLightPosition.xyz - pos );

    E =  -normalize(pos);
    N = normalize( uNormalMatrix*aNormal.xyz);

    gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;

}
