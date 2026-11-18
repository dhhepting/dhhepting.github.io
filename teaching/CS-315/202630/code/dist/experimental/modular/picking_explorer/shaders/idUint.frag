#version 300 es

/* An ID pass into an R32UI integer target: the id is stored exactly, up to 2^32 - 1. */

precision highp float;
precision highp int;

flat in int vFace;

uniform int uObject;

out uvec4 fId;

void main()
{
    fId = uvec4(uint(uObject*6 + vFace + 1), 0u, 0u, 0u);
}
