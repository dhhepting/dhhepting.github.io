#version 300 es

// DERIVED FROM shadedSphereObjectSpace.vert (one line changed, marked below).
// The original uses E = normalize(uEyePosition), i.e. a viewer infinitely far away.
// This variant uses the exact vector from the vertex to the eye, so its picture matches
// the eye-space version.

in vec4 aPosition;
in vec4 aNormal;

out vec4 vColor;


uniform vec4 uAmbientProduct, uDiffuseProduct, uSpecularProduct;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec4 uLightPosition;
uniform float uShininess;
uniform vec3 uEyePosition;


void
main()
{
    vec3 L;
    if(uLightPosition.w == 0.0)  L = normalize(uLightPosition.xyz);
    else  L = normalize((uLightPosition - aPosition).xyz);


    vec3 E = normalize(uEyePosition - aPosition.xyz);   // <- the changed line

    vec3 H = normalize(L + E);


    // Transform vertex normal into eye coordinates

    vec3 N = normalize(aNormal.xyz);

    // Compute terms in the illumination equation
    vec4 ambient = uAmbientProduct;

    float Kd = max( dot(L, N), 0.0 );
    vec4  diffuse = Kd*uDiffuseProduct;

    float Ks = pow( max(dot(N, H), 0.0), uShininess );
    vec4  specular = Ks * uSpecularProduct;

    if( dot(L, N) < 0.0 ) {
        specular = vec4(0.0, 0.0, 0.0, 1.0);
    }

    gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;

    vColor = ambient + diffuse +specular;

    vColor.a = 1.0;
}
