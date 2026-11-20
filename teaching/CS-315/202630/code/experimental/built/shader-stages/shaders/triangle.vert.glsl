#version 300 es
// VERTEX SHADER -- runs once per vertex (3 times for this draw call).
// Its job: turn each vertex's attributes into a clip-space position, and
// choose which values (the "out" variables) get handed on to the rasterizer.

layout(location = 0) in vec2 a_position;   // per-vertex input from a buffer
layout(location = 1) in vec3 a_color;      // per-vertex input from a buffer

uniform mat4 u_matrix;                     // same value for every vertex

out vec3 v_color;                          // interpolated across the triangle
out vec3 v_barycentric;                    // 1 at this vertex, 0 at the others

void main() {
  gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);   // required output: clip space

  v_color = a_color;
  v_barycentric = vec3(float(gl_VertexID == 0),
                       float(gl_VertexID == 1),
                       float(gl_VertexID == 2));
}
