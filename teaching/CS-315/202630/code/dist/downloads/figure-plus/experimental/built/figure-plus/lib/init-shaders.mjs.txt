// init-shaders.mjs -- compile + link a WebGL2 program from shader *source strings*
// (the same idea as Common/initShadersJS.mjs: no <script> tags, no DOM lookups).

/**
 * Fetch a text file (here: a .vert or .frag) given a URL object.
 * Use with:  loadText(new URL("./shaders/figure.vert", import.meta.url))
 * Vite recognises that exact pattern, copies the file into the build and
 * rewrites the URL, so it works in dev and in the built output.
 */
export async function loadText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url} (${response.status} ${response.statusText})`);
  }
  return response.text();
}

function compile(gl, type, source, label) {
  const shader = gl.createShader(type);
  // "#version 300 es" must be the very first thing in the source, so trim any
  // leading whitespace that a template literal or file might introduce.
  gl.shaderSource(shader, source.trimStart());
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`${label} shader failed to compile:\n${log}`);
  }
  return shader;
}

export function initShadersJS(gl, vertexSource, fragmentSource) {
  const vs = compile(gl, gl.VERTEX_SHADER, vertexSource, "vertex");
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSource, "fragment");

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program failed to link:\n${log}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}
