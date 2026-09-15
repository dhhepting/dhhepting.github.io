// gl-utils.js
// Small, reusable WebGL helpers: fetch shader text, compile, and link.
// None of these touch the DOM, so they stay portable across projects.

export async function loadShaderSource(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to load shader "${url}": ${response.status} ${response.statusText}`
    );
  }
  return response.text();
}

export function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error:\n${log}`);
  }
  return shader;
}

export function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error:\n${log}`);
  }

  // The individual shaders are no longer needed once linked.
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}
