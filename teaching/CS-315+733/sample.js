
/** Creates a program from 2 shaders.
*
* @param {!WebGLRenderingContext} gl The WebGL context.
* @param {!WebGLShader} vertexShader A vertex shader.
* @param {!WebGLShader} fragmentShader A fragment shader.
* @return {!WebGLProgram} A program.
*/

function createProgram(gl, vertexShader, fragmentShader) {
  // create a program.
  const program = gl.createProgram();

  // attach the shaders.
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  // link the program.
  gl.linkProgram(program);

  // Check if it linked.
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
    // something went wrong with the link; get the error
    const e = new Error('program failed to link:' +
        gl.getProgramInfoLog(program));
    throw e;
  }

  return program;
};
