#version 300 es
// Chaos game vertex shader, INSTANCED.
//
// The CPU runs the chaos game once and uploads ONE set of points.
// Here, instance number i (gl_InstanceID) selects a composite transformation
// built from the binary digits of i, most significant digit first:
//
//     id = 0b0011  ->  M = T0 . T0 . T1 . T1      ("0011")
//
// so the digit written leftmost is the outermost map (applied last), exactly
// like the product written out on paper. With uLevels = 4 there are 16 instances,
// 0000 ... 1111. Each instance is a copy of the whole attractor shrunk by
// s^4, so together they redraw the attractor at a finer level of detail.

layout(location = 0) in vec2 aPosition;   // point in world space (shared by every instance)
layout(location = 1) in float aMap;       // 0.0 .. 1.0: colour address of this point

uniform mat3 uView;         // world -> clip
uniform mat3 uMap[2];       // Transformation0 and Transformation1 (3x3, column-major)
uniform int  uLevels;       // number of digits in the instance address (0 = no instancing)
uniform bool uInstanced;    // false for the centre handles
uniform bool uByInstance;   // colour by instance rather than by map choice
uniform float uPointSize;   // device pixels
uniform vec3 uColor0;
uniform vec3 uColor1;

out vec3 vColor;

// the composite matrix for instance `id`: digits read from the most significant end
mat3 instanceMatrix(int id) {
    mat3 M = mat3(1.0);
    for (int k = 7; k >= 0; k--) {
        if (k < uLevels) {
            int bit = (id >> k) & 1;
            M = M * uMap[bit];
        }
    }
    return M;
}

vec3 hue(float h) {
    vec3 k = clamp(abs(fract(h + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
    return 0.85 * k + 0.1;
}

void main() {
    mat3 M = uInstanced ? instanceMatrix(gl_InstanceID) : mat3(1.0);
    vec3 p = uView * (M * vec3(aPosition, 1.0));
    gl_Position = vec4(p.xy, 0.0, 1.0);
    gl_PointSize = uPointSize;

    if (uInstanced && uByInstance) {
        vColor = hue(float(gl_InstanceID) / float(1 << uLevels));
    } else {
        vColor = mix(uColor0, uColor1, aMap);
    }
}
