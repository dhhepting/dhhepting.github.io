#version 300 es

// assume both position and normal are in homogeneous form

in vec4 aPosition;
in vec4 aNormal;

out vec4 vColor;

uniform vec4 uAmbientProduct, uDiffuseProduct, uSpecularProduct;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec4 uLightPosition;
uniform float uShininess;
uniform mat3 uNormalMatrix;


void
main()
{

    // pos is vertex position in eye coordinates

    vec3 pos = (uModelViewMatrix * aPosition).xyz;

    // vector from vertex position to light source

    vec3 L;

    // check for directional light

    if(uLightPosition.w == 0.0) L = normalize(uLightPosition.xyz);
    else L = normalize( uLightPosition.xyz - pos );

    // Because the eye point the is at the orgin
    // the vector from the vertex position to the eye is

    vec3 E = -normalize(pos);

    // halfway vector

    vec3 H = normalize(L + E);

    // Transform vertex normal into eye coordinates

    vec3 N = normalize( uNormalMatrix*aNormal.xyz);


    // Compute terms in the illumination equation
    vec4 ambient = uAmbientProduct;

    float Kd = max( dot(L, N), 0.0 );
    vec4 diffuse = Kd*uDiffuseProduct;

    float Ks = pow( max(dot(N, H), 0.0), uShininess );
    vec4 specular = Ks * uSpecularProduct;

    if( dot(L, N) < 0.0 ) {
          specular = vec4(0.0, 0.0, 0.0, 1.0);
    }

    gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;

    vColor = ambient + diffuse +specular;

    vColor.a = 1.0;
}
