#version 300 es

/* What the light pass stores.
 * uStorage 0: gl_FragCoord.z in the colour channels of an RGBA8 target (shadowMap.js): 256 levels
 *          1: gl_FragCoord.z packed into all four bytes of an RGBA8 target
 *          2: nothing: the depth attachment is a DEPTH_COMPONENT24 texture and holds the depth itself
 */

precision highp float;

uniform int uStorage;

out vec4 fColor;

void main()
{
    float z = gl_FragCoord.z;
    if (uStorage == 1) {
        vec4 v = fract(z*vec4(1.0, 255.0, 65025.0, 16581375.0));
        fColor = v - v.yzww*vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0);
    } else {
        fColor = vec4(z, z, z, 1.0);
    }
}
