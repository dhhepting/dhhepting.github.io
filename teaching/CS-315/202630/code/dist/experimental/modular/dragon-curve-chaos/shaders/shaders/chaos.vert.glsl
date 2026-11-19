#version 300 es
// Chaos game vertex shader: one vertex per point, drawn with gl.POINTS.

layout(location = 0) in vec2 aPosition;   // point in world space
layout(location = 1) in float aMap;       // 0.0 or 1.0: which transformation made this point

uniform mat3 uView;         // world -> clip
uniform float uPointSize;   // device pixels
uniform vec3 uColor0;
uniform vec3 uColor1;

out vec3 vColor;

void main() {
    vec3 p = uView * vec3(aPosition, 1.0);
    gl_Position = vec4(p.xy, 0.0, 1.0);
    gl_PointSize = uPointSize;
    vColor = mix(uColor0, uColor1, aMap);
}
