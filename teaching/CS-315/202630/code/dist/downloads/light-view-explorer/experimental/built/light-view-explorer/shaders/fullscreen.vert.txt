#version 300 es

/* A triangle that covers the viewport, with no vertex data. */

out vec2 vTexCoord;

void main()
{
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    vTexCoord = p;
    gl_Position = vec4(2.0*p - 1.0, 0.0, 1.0);
}
