/* exported initShaders */
//
//  initShaders.js
//

function initShaders (gl, vertexShaderId, fragmentShaderId) {
  let vertShdr, fragShdr

  const vertElem = document.getElementById(vertexShaderId)
  if (!vertElem) {
    window.alert('Unable to load vertex shader ' + vertexShaderId)
    return -1
  } else {
    vertShdr = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vertShdr, vertElem.textContent.replace(/^\s+|\s+$/g, ''))
    gl.compileShader(vertShdr)
    if (!gl.getShaderParameter(vertShdr, gl.COMPILE_STATUS)) {
      const vertMsg = 'Vertex shader failed to compile.  The error log is:' +
      '<pre>' + gl.getShaderInfoLog(vertShdr) + '</pre>'
      window.alert(vertMsg)
      return -1
    }
  }

  const fragElem = document.getElementById(fragmentShaderId)
  if (!fragElem) {
    window.alert('Unable to load vertex shader ' + fragmentShaderId)
    return -1
  } else {
    fragShdr = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fragShdr, fragElem.textContent.replace(/^\s+|\s+$/g, ''))
    gl.compileShader(fragShdr)
    if (!gl.getShaderParameter(fragShdr, gl.COMPILE_STATUS)) {
      const fragMsg = 'Fragment shader failed to compile.  The error log is:' +
      '<pre>' + gl.getShaderInfoLog(fragShdr) + '</pre>'
      window.alert(fragMsg)
      return -1
    }
  }

  const program = gl.createProgram()
  gl.attachShader(program, vertShdr)
  gl.attachShader(program, fragShdr)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const progMsg = 'Shader program failed to link. The error log is:' +
    '<pre>' + gl.getProgramInfoLog(program) + '</pre>'
    window.alert(progMsg)
    return -1
  }
  return program
}
