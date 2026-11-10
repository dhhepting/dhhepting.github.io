import { vec2, vec3, add, mult, flatten } from '../../Common/MV.mjs';
import { initShaders } from '../../Common/initShadersJS.mjs';

const numPositions = 5000;
const positions = [];

const canvas = document.getElementById('gl-canvas');
const gl = canvas.getContext('webgl2');
if (!gl) {
    alert("WebGL 2.0 isn't available");
    throw new Error("WebGL 2.0 isn't available");
}

//
//  Initialize our data for the Sierpinski Gasket
//

// First, initialize the corners of our gasket with three positions.

const vertices = [
    vec2(-1, -1),
    vec2(0, 1),
    vec2(1, -1)
];
    // Next, generate the rest of the points, by first finding a random position
    //  within our gasket boundary.  We use Barycentric coordinates
    //  (simply the weighted average of the corners) to find the position

    let coeffs = vec3(Math.random(), Math.random(), Math.random());


    let a = mult(coeffs[0], vertices[0]);
    let b = mult(coeffs[1], vertices[1]);
    let c = mult(coeffs[2], vertices[2]);

    let p = add(a, add(b, c));

    // Add our randomly chosen position into our array of positions
    positions.push(p);

    for (let i = 0; positions.length < numPositions; ++i) {
        let j = Math.floor(3*Math.random());

        p = add(positions[i], vertices[j]);
        p = mult(0.5, p);
        positions.push(p);
    }

    //
    //  Configure WebGL
    //
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    
    //  Load shaders (fetched from the .glsl files beside this file)
    //  and initialize attribute buffers
    
    async function fetchText(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
        return response.text();
    }
    
    const [vertexSource, fragmentSource] = await Promise.all([
        fetchText(new URL('./shaders/vshader21.glsl', import.meta.url)),
        fetchText(new URL('./shaders/fshader21.glsl', import.meta.url)),
    ]);
    
    const program = initShaders(gl, vertexSource, fragmentSource);
    gl.useProgram(program);
    
    // Load the data into the GPU
    
    const bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
    
    // Associate out shader variables with our data buffer
    
    const positionLoc = gl.getAttribLocation(program, 'aPosition');
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);
    
    render();
    
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, positions.length);
    }