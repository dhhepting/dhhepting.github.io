//
//  initShadersXHR
//  Provides functions to initialize a simple two file shader from
//  external GLSL files loaded with an HTTP Request.
//
//  Alex Clarke 2026:
//  - Based on 8E initShader2.mjs, restructured and modularized on recommendation
//    from Dr. Hepting.
//  - switched from XMLHttpRequest to await/fetch to retrieve files
//

async function initShaders(gl, vShaderName, fShaderName) {
    const program = gl.createProgram();
    const vertexShader = await getShader(gl, vShaderName, gl.VERTEX_SHADER);
    const fragmentShader = await getShader(gl, fShaderName, gl.FRAGMENT_SHADER);

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Program failed to link: ${gl.getProgramInfoLog(program)}`);
    }
    return program;
};

async function getShader(gl, shaderName, type) {
    const shader = gl.createShader(type);
    const shaderScript = await loadShaderSource(shaderName);

    gl.shaderSource(shader, shaderScript);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(`Shader failed to compile: ${gl.getShaderInfoLog(shader)}`);
    }

    return shader;
}

async function loadShaderSource(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to load shader "${url}": ${response.status} ${response.statusText}`
    );
  }
  return response.text();
}

export { initShaders };