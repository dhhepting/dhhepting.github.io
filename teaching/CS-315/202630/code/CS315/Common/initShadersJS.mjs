//
//  initShadersJS
//  Provides functions to initialize a simple two file shader from
//  JavaScript strings
//
//  Alex Clarke 2026:
//  - Based on 8E initShader2.js, restructured and modularized by request of Dr. Hepting
//

function initShaders( gl, vertexShaderString, fragmentShaderString )
{
    const program = gl.createProgram();
    let vertexShader;
    vertexShader = getShader(gl, vertexShaderString, gl.VERTEX_SHADER);
    const fragmentShader = getShader(gl, fragmentShaderString, gl.FRAGMENT_SHADER);

    gl.attachShader( program, vertexShader );
    gl.attachShader( program, fragmentShader );
    gl.linkProgram( program );

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Program failed to link: ${gl.getProgramInfoLog(program)}`);
    }

    return program;
}

function getShader(gl, shaderString, type) {
    const shader = gl.createShader(type);
    if (typeof(shaderString) != "string") {
        throw new Error(`Could not find shader source: ${shaderId}`);
    }
    gl.shaderSource(shader, shaderString.replace(/^\s+|\s+$/g, '' ));
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(`Shader failed to compile: ${gl.getShaderInfoLog(shader)}`);
    }

    return shader;
}

export { initShaders };