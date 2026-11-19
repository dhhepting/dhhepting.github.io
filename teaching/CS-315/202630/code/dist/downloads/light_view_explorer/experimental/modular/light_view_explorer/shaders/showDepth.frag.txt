#version 300 es

/* Shows the shadow map: stored depth as grey, stretched over [uLow, uHigh] so that the
   steps of an 8-bit map are visible. */

precision highp float;
precision highp int;

in vec2 vTexCoord;

uniform sampler2D uShadowColor;
uniform sampler2D uShadowDepthRaw;    /* the depth texture through a sampler without comparison */
uniform int uStorage;
uniform float uLow;
uniform float uHigh;

out vec4 fColor;

void main()
{
    float z;
    if (uStorage == 2) z = texture(uShadowDepthRaw, vTexCoord).r;
    else if (uStorage == 1) z = dot(texture(uShadowColor, vTexCoord), vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0));
    else z = texture(uShadowColor, vTexCoord).x;
    float g = (z >= 1.0) ? 1.0 : clamp((z - uLow)/(uHigh - uLow), 0.0, 1.0);
    fColor = vec4(vec3(g), 1.0);
}
