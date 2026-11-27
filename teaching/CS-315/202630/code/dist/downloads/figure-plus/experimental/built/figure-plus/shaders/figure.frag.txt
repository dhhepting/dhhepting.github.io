#version 300 es

precision mediump float;

// The textbook version hard-codes red. A uniform lets us keep that as the
// default while also drawing per-part colours and dark outlines.
uniform vec4 uColor;

out vec4 fColor;

void main()
{
    fColor = uColor;
}
