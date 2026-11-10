#version 300 es
// One vertex shader serves every canvas on the page.
//
//   uStage     object -> whichever space this canvas is showing
//              (M, V*M, P*V*M ... composed in JavaScript, see pipeline.mjs)
//   uObserver  a fixed "overview" camera used to look at that space;
//              the identity matrix on the final-image canvas
//   uDivide    true: divide by w here, so clip space can be drawn as the
//              cube it becomes (the stage canvases). false: leave it to the
//              GPU, exactly as a normal program would (final image).

in vec3 aPosition;
in vec3 aColor;

uniform mat4 uStage;
uniform mat4 uObserver;
uniform bool uDivide;

out vec3 vColor;

void main() {
  vec4 p = uStage * vec4(aPosition, 1.0);
  if (uDivide) {
    p = vec4(p.xyz / p.w, 1.0);
  }
  gl_Position = uObserver * p;
  vColor = aColor;
}
