#version 300 es

/* A triangle that covers the viewport, with no vertex data: gl_VertexID 0, 1, 2
   give (-1,-1), (3,-1), (-1,3). vTexCoord runs from 0 to 1 across the viewport. */

out vec2 vTexCoord;

void main()
{
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    vTexCoord = p;
    gl_Position = vec4(2.0*p - 1.0, 0.0, 1.0);
}
