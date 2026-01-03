/**
 * Shader module - defines and compiles WebGL shaders
 */

export const shaderSources = {
  diffuse: {
    vertex: `#version 300 es
in vec2 aPosition1;
in vec2 aTexCoord;

out vec2 vTexCoord;

void main()
{
    gl_Position = vec4(aPosition1, 0.0, 1.0);
    vTexCoord = aTexCoord;
}`,
    fragment: `#version 300 es
precision mediump float;

uniform sampler2D uTextureMap;
uniform float uDistance;
uniform float uScale;

in vec2 vTexCoord;
out vec4 fColor;

void main()
{
    float x = vTexCoord.x;
    float y = vTexCoord.y;
    // to get fragment colour, sum the samples of the texture at
    // coordinates (x,y) +/- uDistance then divide by uScale
    fColor = (texture(uTextureMap, vec2(x + uDistance, y))
                + texture(uTextureMap, vec2(x, y + uDistance))
                + texture(uTextureMap, vec2(x - uDistance, y))
                + texture( uTextureMap, vec2(x, y - uDistance)))
                / uScale;
}`,
  },
  plotter: {
    vertex: `#version 300 es
in  vec2 aPosition2;
uniform float uPointSize;

void main()
{
    gl_PointSize = uPointSize;
    gl_Position = vec4(aPosition2, 0.0, 1.0);
}`,
    fragment: `#version 300 es
precision mediump float;

out vec4 fColor;

uniform vec4 uColor;
void
main()
{
    fColor = uColor;
}`,
  },
};

/**
 * Compile a single shader
 * @param {WebGL2RenderingContext} gl
 * @param {string} source - shader source code
 * @param {number} type - gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @returns {WebGLShader}
 */
function compileShader(gl, source, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Link a shader program from vertex and fragment shaders
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLShader} vertexShader
 * @param {WebGLShader} fragmentShader
 * @returns {WebGLProgram}
 */
function linkProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program linking error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/**
 * Create and link a complete shader program
 * @param {WebGL2RenderingContext} gl
 * @param {string} vertexSource
 * @param {string} fragmentSource
 * @returns {WebGLProgram}
 */
export function createShaderProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

  if (!vertexShader || !fragmentShader) {
    return null;
  }

  const program = linkProgram(gl, vertexShader, fragmentShader);

  // Clean up individual shaders after linking
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}
