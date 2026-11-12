#version 300 es

// DERIVED FROM perFragmentLighting.frag. The only change is that N, L and E are
// renormalized before use.
//
// Interpolating unit vectors gives vectors shorter than 1 between the vertices.
// When the vertex normals point in quite different directions (as on a coarse
// mesh of a curved surface) the interpolated normal can be well under unit
// length, and pow(dot(N, H), shininess) then collapses toward zero, so the
// specular highlight disappears.

precision mediump float;

uniform vec4 uAmbientProduct;
uniform vec4 uDiffuseProduct;
uniform vec4 uSpecularProduct;
uniform float uShininess;

in vec3 N, L, E;
out vec4 fColor;

void main()
{
    vec3 n = normalize( N );
    vec3 l = normalize( L );
    vec3 e = normalize( E );

    vec3 H = normalize( l + e );
    vec4 ambient = uAmbientProduct;

    float Kd = max( dot(l, n), 0.0 );
    vec4  diffuse = Kd*uDiffuseProduct;

    float Ks = pow( max(dot(n, H), 0.0), uShininess );
    vec4  specular = Ks * uSpecularProduct;

    if( dot(l, n) < 0.0 ) specular = vec4(0.0, 0.0, 0.0, 1.0);

    fColor = ambient + diffuse +specular;
    fColor.a = 1.0;
}
