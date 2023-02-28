"use strict";

var gl;

var theta = 0.0;
var thetaLoc;
var positions = [];
var numTimesToSubdivide = 4;

var delay = 100;
var direction = true;

window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas");
    document.getElementById("delayspan").innerHTML = delay

    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    //
    //  Configure WebGL
    //
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    //  Load shaders and initialize attribute buffers

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);




    var vertices = [
        vec2( -1, -1 ),
        vec2(  0,  0.73 ),
        vec2(  1, -1 )
    ];

    divideTriangle( vertices[0], vertices[1], vertices[2],
                    numTimesToSubdivide);

    // Load the data into the GPU

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    // Associate out shader variables with our data buffer

    var positionLoc = gl.getAttribLocation( program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    thetaLoc = gl.getUniformLocation( program, "uTheta" );

    // Initialize event handlers
    // document.getElementById("Direction").onclick = function () {
    //     direction = !direction;
    // };

    document.getElementById("Controls" ).onclick = function(event) {
        switch(event.target.index) {
          case 0:
            direction = false;
            break;
          case 1:
            direction = true;
            break;
         case 2: //faster
            delay /= 2.0;
            if (delay < 1) {
              delay = 1
            }
            break;
         case 3:
            delay *= 2.0;
            if (delay > 1000) {
              delay = 1000
            }
            break;
       }
       document.getElementById("delayspan").innerHTML = delay
    };

    window.onkeydown = function(event) {
        var key = String.fromCharCode(event.keyCode);
        switch(key) {
          case '0':
            direction = false;
            break;
          case '1':
            direction = true;
            break;
          case '2':
            delay /= 2.0;
            if (delay < 1) {
              delay = 1
            }
            break;

          case '3':
            delay *= 2.0;
            if (delay > 1000) {
              delay = 1000
            }
            break;
        }
        document.getElementById("delayspan").innerHTML = delay
    };
    render();
};

function triangle(a, b, c)
{
    positions.push(a, b, c);
}

function divideTriangle(a, b, c, count)
{
    console.log(count)
    // check for end of recursion

    if ( count === 0 ) {
        triangle(a, b, c);
    }
    else {

        //bisect the sides

        var ab = mix( a, b, 0.5 );
        var ac = mix( a, c, 0.5 );
        var bc = mix( b, c, 0.5 );

        --count;

        // three new triangles

        divideTriangle( a, ab, ac, count );
        divideTriangle( c, ac, bc, count );
        divideTriangle( b, bc, ab, count );
    }
  }

function render()
{
    gl.clear(gl.COLOR_BUFFER_BIT);

    theta += (direction ? 0.1 : -0.1);
    gl.uniform1f(thetaLoc, theta);

    gl.drawArrays(gl.TRIANGLES, 0, positions.length);

    //requestAnimationFrame(render);
    setTimeout(
      function (){requestAnimationFrame(render);}, delay
    //   function (){render();}, delay
    );
    //render();
}
