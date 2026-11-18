#version 300 es

/* A full-screen triangle with no vertex data: gl_VertexID 0, 1, 2 give
   (-1,-1), (3,-1), (-1,3), which covers the screen. */

out vec2 vNdc;

void main()
{
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    vNdc = p*2.0 - 1.0;
    gl_Position = vec4(vNdc, 1.0, 1.0);
}
