#version 300 es

/* An ID pass into an RGBA8 colour target.
 *
 * uMethod 0: the six face colours of pickCube (c[1] ... c[6]); the object is lost.
 *         1: id = object*6 + face + 1, split into the red, green and blue bytes.
 * uVisualize 1: draw for people instead: ids as distinct colours (for the "pick buffer" view).
 */

precision highp float;
precision highp int;

flat in int vFace;

uniform int uObject;
uniform int uMethod;
uniform int uVisualize;

out vec4 fColor;

const vec3 faceColours[6] = vec3[6](
    vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), vec3(0.0, 0.0, 1.0),
    vec3(1.0, 1.0, 0.0), vec3(0.0, 1.0, 1.0), vec3(1.0, 0.0, 1.0));

vec3 hashColour(int id)
{
    /* a well-spread colour per id, so neighbouring ids look different */
    float h = fract(float(id)*0.618034);
    vec3 k = clamp(abs(fract(h + vec3(0.0, 2.0/3.0, 1.0/3.0))*6.0 - 3.0) - 1.0, 0.0, 1.0);
    return mix(vec3(0.25), k, 0.85);
}

void main()
{
    int id = uObject*6 + vFace + 1;

    if (uMethod == 0) { fColor = vec4(faceColours[vFace], 1.0); return; }
    if (uVisualize == 1) { fColor = vec4(hashColour(id), 1.0); return; }

    /* n/255.0 is stored by an RGBA8 target as exactly n */
    fColor = vec4(float(id & 255), float((id >> 8) & 255), float((id >> 16) & 255), 255.0)/255.0;
}
