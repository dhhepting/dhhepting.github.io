#version 300 es

precision highp float;

in vec3 vPosition;
in vec3 vNormal;

uniform vec4 uAmbientProduct, uDiffuseProduct, uSpecularProduct;
uniform vec4 uLightPosition;    // eye coordinates
uniform float uShininess;
uniform bool uUseHalfway;       // true: Blinn-Phong (N.H)   false: Phong (R.E)

// used to draw the small marker that shows where the light is
uniform bool uUnlit;
uniform vec4 uUnlitColor;

out vec4 fColor;

void main()
{
    if (uUnlit) {
        fColor = uUnlitColor;
        return;
    }

    vec3 N = normalize(vNormal);

    // vector from the fragment to the light (point light, w = 1)
    vec3 L = normalize(uLightPosition.xyz - vPosition);

    // the eye is at the origin of eye coordinates
    vec3 E = normalize(-vPosition);

    vec4 ambient = uAmbientProduct;

    float Kd = max(dot(L, N), 0.0);
    vec4 diffuse = Kd * uDiffuseProduct;

    float Ks = 0.0;

    // no highlight on surfaces facing away from the light
    if (dot(L, N) > 0.0) {
        if (uUseHalfway) {
            // halfway vector between light and viewer
            vec3 H = normalize(L + E);
            Ks = pow(max(dot(N, H), 0.0), uShininess);
        } else {
            // reflection of the light vector about the normal
            vec3 R = reflect(-L, N);
            Ks = pow(max(dot(R, E), 0.0), uShininess);
        }
    }

    vec4 specular = Ks * uSpecularProduct;

    fColor = ambient + diffuse + specular;
    fColor.a = 1.0;
}
