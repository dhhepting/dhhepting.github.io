//
//  uofrGraphics.mjs
//
//  Created by Alex Clarke on 2013-05-02 as a modern GL replacement of some beginner friendly
//  functionality found in GLUT library. Some function names and code are borrowed from 
//  GLUT/freeglut
//
//  Ported to Javascript/WebGL from C++/OpenGL on 2016-01-11
//
//  Minor updates 2019-01-17
//      - Wire Sphere and Cube Added
//      - Colour Attribute enabled - no more static colour because of performance issues on some Macs
//      - Compatibility with Angel's 2017 MVnew.js fixed
//
// Minor updates 2020-01-14
//      - drawQuad performance improved
//          -  added preallocation of fixed storage location for quad data
//          -  added inline flattening of vertex data to storage
//          -  switched from subBufferData to bufferData to load quad vertices
//          -  switched to STREAM_DRAW instead of STATIC_DRAW
//
//      - added flatten4x4 to optimize flattening of 4x4 matrices
//
// WebGL2 Updates 2020-02-28
//      - added vertex array objects to simplify mixing urgl code with external data buffers
//        ie: no more need to rebind external buffers after draw calls
//
// Minor update 2020-01-17
//      - added sin/cos precalculation to Sphere functions
//          - caused slight hit to performance, probably due to object member lookup
//          - TODO: switch to arrays
//          - TODO: performance hit from flatten - use pre-flattened arrays? DONE!
//
// Torus and Preallocation 2024-08-14 -- 2024-09-05
//       - Major performance improvement by updating only colours if that's all that changed
//       - Major performance improvement by calculating exact float32 array size instead of pushing Array() elements requiring a flatten step
//       - added Torus based on freeglut method - ported from C with some modifications
//       - converted uofGraphics to a class
//       - added basic JSDoc headers for main public methods
//
//  Minor update 2025-09-19 (by Tirth Acharya)
//      -small bug on wireframe color definition.  Noted around line 874
// 
// Alex revision 2026-08 -- 2026-09
// General notes:
//       - modularized as part of modernization and node.js/Vite environment migration
//       - improved efficiency of drawQuad by 30% by reusing buffer instead of reallocating for every quad
//         (permitted switch from STATIC_DRAW to DYNAMIC_DRAW)
//


// Declare a uofrGraphics object where it can be reached by all functions that need it
// ie. globally or at the module level. eg.
// let urgl;
///
// The uofrGraphics constructor depends on a valid rendering context, and must not be used until there is
// a valid GL Context.
// eg. after these lines in the init function:
//      gl = canvas.getContext('webgl2');
//      if (!gl) alert("WebGL 2.0 isn't available");
//
// Then you construct urgl like this:
//      urgl = new uofrGraphics(gl);
//
// If your page has multiple canvases, you need a uofrGraphics object for each canvas since it sets and saves 
// some per/canvas state when binding buffers.


// uofrGraphics Functions:
//      constructor
//      connectShader
//      setDrawColour
//      drawSolidSphere
//      drawWireSphere
//      drawSolidCube
//      drawWireCube
//      drawQuad
//
//  Other Utility Functions:
//      flatten4x4

import * as MV from "../Common/MV.mjs";

// uofrGraphics object constructor
// I am not a javascript programmer.
// This is likely very ugly.
export class uofrGraphics {
    /**
     * Construct a uofrGraphics object and provide it with avalid  gl context so gl calls can be made.
     * @param {WebGLRenderingContext} inGL 
     * @throws Will throw an error if no valid webgl2 rendering context object provided.
     */
    constructor(inGL) {
        if (arguments.length == 0 || !inGL || !(inGL instanceof WebGL2RenderingContext) ) {
            throw new Error("You must provide a valid webgl2 rendering context argument to construct a uofrGraphics object.");
        }

        else {
            this.gl = inGL;
        }
        this.shaderProgram = 0;
        this.positionAttribLoc = -1;
        this.normalAttribLoc = -1;
        this.colourAttribLoc = -1;
        this.colour = MV.vec4(0);
        this.lastCubeSize = 0;
        this.lastWireCubeSize = 0;

        this.lastSphereSlices = 0;
        this.lastSphereStacks = 0;
        this.lastSphereRadius = 0;
        this.sphereVerts = 0;

        this.sphereColour = MV.vec4(0);
        this.wireSphereColour = MV.vec4(0);
        this.cubeColour = MV.vec4(0);
        this.wireCubeColour = MV.vec4(0);

        this.lastWireSphereSlices = 0;
        this.lastWireSphereStacks = 0;
        this.lastWireSphereRadius = 0;
        this.wireSphereVerts = 0;
        this.quadData = new Float32Array(48);


        this.primitive = this.gl.TRIANGLES;

        this.vao = this.gl.createVertexArray();
        this.external_vao = 0;

        this.cubeVerts =
            [
                [0.5, 0.5, 0.5, 1], //0
                [0.5, 0.5, -0.5, 1], //1
                [0.5, -0.5, 0.5, 1], //2
                [0.5, -0.5, -0.5, 1], //3
                [-0.5, 0.5, 0.5, 1], //4
                [-0.5, 0.5, -0.5, 1], //5
                [-0.5, -0.5, 0.5, 1], //6
                [-0.5, -0.5, -0.5, 1] //7
            ];

        this.cubeFullVerts = //36 vertices total
            [
                this.cubeVerts[0], this.cubeVerts[4], this.cubeVerts[6], //front
                this.cubeVerts[6], this.cubeVerts[2], this.cubeVerts[0],
                this.cubeVerts[1], this.cubeVerts[0], this.cubeVerts[2], //right
                this.cubeVerts[2], this.cubeVerts[3], this.cubeVerts[1],
                this.cubeVerts[5], this.cubeVerts[1], this.cubeVerts[3], //back
                this.cubeVerts[3], this.cubeVerts[7], this.cubeVerts[5],
                this.cubeVerts[4], this.cubeVerts[5], this.cubeVerts[7], //left
                this.cubeVerts[7], this.cubeVerts[6], this.cubeVerts[4],
                this.cubeVerts[4], this.cubeVerts[0], this.cubeVerts[1], //top
                this.cubeVerts[1], this.cubeVerts[5], this.cubeVerts[4],
                this.cubeVerts[6], this.cubeVerts[7], this.cubeVerts[3], //bottom
                this.cubeVerts[3], this.cubeVerts[2], this.cubeVerts[6]
            ];

        this.wireCubeFullVerts = //36 vertices total
            [
                this.cubeVerts[0], this.cubeVerts[4], this.cubeVerts[6], //front
                this.cubeVerts[2], this.cubeVerts[0], this.cubeVerts[6],

                this.cubeVerts[4], this.cubeVerts[5], this.cubeVerts[7], //left
                this.cubeVerts[6], this.cubeVerts[4], this.cubeVerts[7],

                this.cubeVerts[5], this.cubeVerts[1], this.cubeVerts[3], //back
                this.cubeVerts[7], this.cubeVerts[5], this.cubeVerts[3],

                this.cubeVerts[1], this.cubeVerts[0], this.cubeVerts[2], //left
                this.cubeVerts[3], this.cubeVerts[1], this.cubeVerts[2],

                this.cubeVerts[0], this.cubeVerts[1], this.cubeVerts[5], //top
                this.cubeVerts[4], this.cubeVerts[0], this.cubeVerts[5],

                this.cubeVerts[7], this.cubeVerts[3], this.cubeVerts[2], //bottom
                this.cubeVerts[6], this.cubeVerts[7], this.cubeVerts[2]
            ];

        this.right = [1.0, 0.0, 0.0, 0.0];
        this.left = [-1.0, 0.0, 0.0, 0.0];
        this.top = [0.0, 1.0, 0.0, 0.0];
        this.bottom = [0.0, -1.0, 0.0, 0.0];
        this.front = [0.0, 0.0, 1.0, 0.0];
        this.back = [0.0, 0.0, -1.0, 0.0];

        this.cubeNormsArray =
            [
                this.front, this.front, this.front, this.front, this.front, this.front,
                this.right, this.right, this.right, this.right, this.right, this.right,
                this.back, this.back, this.back, this.back, this.back, this.back,
                this.left, this.left, this.left, this.left, this.left, this.left,
                this.top, this.top, this.top, this.top, this.top, this.top,
                this.bottom, this.bottom, this.bottom, this.bottom, this.bottom, this.bottom
            ];

        this.wireCubeNormsArray =
            [
                this.front, this.front, this.front, this.front, this.front, this.front,
                this.left, this.left, this.left, this.left, this.left, this.left,
                this.back, this.back, this.back, this.back, this.back, this.back,
                this.right, this.right, this.right, this.right, this.right, this.right,
                this.top, this.top, this.top, this.top, this.top, this.top,
                this.bottom, this.bottom, this.bottom, this.bottom, this.bottom, this.bottom
            ];

        //size of cube vertex data is 36 verts * 4 coordinates = 144
        this.cubeData = new Float32Array(432); //144 * 3
        for (let i = 0; i < this.cubeNormsArray.length; i++) {
            this.cubeData[i * 4 + 144] = this.cubeNormsArray[i][0];
            this.cubeData[i * 4 + 145] = this.cubeNormsArray[i][1];
            this.cubeData[i * 4 + 146] = this.cubeNormsArray[i][2];
            this.cubeData[i * 4 + 147] = 0.0;

        }
        this.cubeVertSize = 144 * 4;
        this.cubeNormalSize = 144 * 4;

        this.cubeBuffer = 0;
        this.cubeWireBuffer = 0;
        this.sphereBuffer = 0;
        this.wireSphereBuffer = 0;
        this.quadBuffer = this.gl.createBuffer();
        // All quads have same size - 4 vertices, 4 components, 4 bytes, 3 attributes
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.quadBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, 4*4*4*3, this.gl.DYNAMIC_DRAW);

    }
    //connectShader
    //  Purpose: get vertex attribute entry points of a shader ("in" type variables)
    //  Preconditions:
    //     shaderProgram - the index number of a valid compiled shader program
    //
    //     positionAttribName - the name of the vertex position input as it appears
    //                          in the shader's code. The input MUST be of type vec4
    //                          If the name is "stub" it will be
    //                          silently ignored.
    //
    //     normalAttribName - the name of the vertex normal input as it appears
    //                        in the shader's code. The input MUST be of type vec4.
    //                        If the name is "stub" it will be
    //                        silently ignored.
    //
    //     colourAttribName - the name of the colour position input as it appears
    //                        in the shader's code. The input MUST be of type vec4.
    //                        If the name is "stub" it will be
    //                        silently ignored.
    //
    // PostConditions:
    //     the locations for the three attribute names will be retrieved and stored
    //     in corresponding *AttribLoc index variable for use when drawing.
    //     If any of the names were NULL pointers or were invalid names, the error
    //     is silently ignored.
    /**
     * Connect input attributes of a shader program to uofrGraphics object
     * Colour, normal and position data will all be sent as vec4 type.
     * @param {*} shaderProgram - shader program to connect
     * @param {string} positionAttribName - name of vertex position attribute
     * @param {string} normalAttribName - name of normal attribute
     * @param {string} colourAttribName - name of colour attribute
     */
    connectShader(shaderProgram, positionAttribName,
        normalAttribName, colourAttribName) {
        this.shaderProgram = shaderProgram;
        this.positionAttribLoc = this.normalAttribLoc = this.colourAttribLoc = -1;

        if (positionAttribName != "stub")
            this.positionAttribLoc = this.gl.getAttribLocation(shaderProgram, positionAttribName);
        if (normalAttribName != "stub")
            this.normalAttribLoc = this.gl.getAttribLocation(shaderProgram, normalAttribName);
        if (colourAttribName != "stub")
            this.colourAttribLoc = this.gl.getAttribLocation(shaderProgram, colourAttribName);
    }
    //setDrawColour
    //  Purpose: set a colour with which to draw primitives
    //  Preconditions:
    //     The incoming colour should be a vec4
    //     The value of each channel should be normalized, ie. lie between 0 and 1
    //     with 0 being the darkest and 1 being the brightest.
    //
    // Postconditions:
    //     Local variable colour, a vec 4, is set to the incoming colour.
    //     It will be used as the constant colour for subsequent draw operations.
    /**
     * Sets the colour that objects will be drawn with.
     * The value of each channel should be normalized, ie. lie between 0 and 1
     * with 0 being the darkest and 1 being the brightest.
     * 
     * Channels are vec3(red, green, blue, alpha)
     * 
     * alpha is used for blending and is typically set to 1 if blending is not desired. 
     * (blending is more complicated than it sounds and is not covered in CS315)
     * @param {vec4} colour 
     */
    setDrawColour(colour) {
        this.colour = colour;
    }
    //drawSolidSphere
    //  Purpose: draw a sphere with solid filled polygons.
    //           loosely based on code from freeglut project.
    //
    //  Preconditions:
    //     radius: should be a positive value indicating the desired radius of the
    //             sphere
    //     slices: should be a positive value indicating how many "slices" you see
    //             if you view the sphere from the top.
    //     stacks: should be a positive value indicating how many layers there are
    //             between the top and bottom of the sphere.
    //
    //  Postconditions:
    //     the vertices for the sphere are drawn in GL_TRIANGLES mode with the
    //     desired number of stacks and slices. The sphere has radius "radius" and
    //     is centered at (0,0,0).
    //     The vertices are stored in WebGL buffers that are managed by this function.
    //     The sphere's buffers are connected to the shader program.
    //     The shader program's colour is set to a constant value.
    //
    /**
     * Draws a solid sphere. Data is buffered and stored between calls. It is fastest to call identical sphere
     * and use transformations and shader arguments to change size and appearance. 
     *      
     * Changing colour only changes colour using the same memory and is fast. 
     * 
     * Changing radius, slices or stacks requires reallocation and recompute. Can be slow.
     * @param {number} radius - radius of sphere
     * @param {number} slices - number of subdivisions around the Z axis (similar to lines of longitude)
     * @param {number} stacks - number of subdivisions along the Z axis (similar to lines of latitude)
     * @returns 
     */
    drawSolidSphere(radius, slices, stacks) {
        this.external_vao = this.gl.getParameter(this.gl.VERTEX_ARRAY_BINDING);
        this.gl.bindVertexArray(this.vao);

        //Generate a new sphere ONLY if necessary - not the same dimesions as last time
        if (this.lastSphereSlices != slices || this.lastSphereStacks != stacks || this.lastSphereRadius != radius) {
            this.sphereColour = this.colour;
            this.lastSphereSlices = slices;
            this.lastSphereStacks = stacks;
            this.lastSphereRadius = radius;
            let phiStep = 360.0 / slices;
            let rhoStep = 180.0 / stacks;
            //allocate new memory
            let vertsArray = new Float32Array((stacks - 1) * slices * 4 * 3 * 2)
            let normsArray = new Float32Array((stacks - 1) * slices * 4 * 3 * 2);
            let colsArray = new Float32Array((stacks - 1) * slices * 4 * 3 * 2)

            let i = 0;
            //Calculate sin/cos slices for one stack
            let sliceVals = [];
            for (let s = 0; s <= slices; s++) {
                let t = 0;
                //Triangle:
                // v1 * (v3)
                //    |
                //    |
                // v2 *--* v4
                //v1
                sliceVals[s] = { sin: Math.sin(MV.radians(phiStep * s)), cos: Math.cos(MV.radians(phiStep * s)) };
            }

            let nextStack = { sin: 0, cos: 1 };
            let thisStack;
            let t = 0;
            thisStack = nextStack;
            nextStack = { sin: Math.sin(MV.radians(rhoStep * (t + 1))), cos: Math.cos(MV.radians(rhoStep * (t + 1))) };

            //Top (Special because v2 and v3 are always both 0,0)
            let idx = 0;
            for (let s = 0; s < slices; s++) {
                //Triangle:
                // v1 * (v3)
                //    |\
                //    | \
                // v2 *--* v4
                //v1
                normsArray[idx++] = sliceVals[s].cos * thisStack.sin;
                normsArray[idx++] = sliceVals[s].sin * thisStack.sin;
                normsArray[idx++] = thisStack.cos;
                normsArray[idx++] = 0.0;

                //v2
                normsArray[idx++] = sliceVals[s].cos * nextStack.sin;
                normsArray[idx++] = sliceVals[s].sin * nextStack.sin;
                normsArray[idx++] = nextStack.cos;
                normsArray[idx++] = 0.0;

                //v4
                normsArray[idx++] = sliceVals[s + 1].cos * nextStack.sin;
                normsArray[idx++] = sliceVals[s + 1].sin * nextStack.sin;
                normsArray[idx++] = nextStack.cos;
                normsArray[idx++] = 0.0;
            }

            //Body of sphere
            for (t = 1; t < stacks - 1; t++) {

                thisStack = nextStack;
                nextStack = { sin: Math.sin(MV.radians(rhoStep * (t + 1))), cos: Math.cos(MV.radians(rhoStep * (t + 1))) };

                for (let s = 0; s < slices; s++) {
                    //Triangle 1:
                    // v1 *  * v3
                    //    |\
                    //    | \
                    // v2 *__* v4
                    //v1
                    normsArray[idx++] = sliceVals[s].cos * thisStack.sin;
                    normsArray[idx++] = sliceVals[s].sin * thisStack.sin;
                    normsArray[idx++] = thisStack.cos;
                    normsArray[idx++] = 0.0;

                    //v2
                    normsArray[idx++] = sliceVals[s].cos * nextStack.sin;
                    normsArray[idx++] = sliceVals[s].sin * nextStack.sin;
                    normsArray[idx++] = nextStack.cos;
                    normsArray[idx++] = 0.0;

                    //v4
                    normsArray[idx++] = sliceVals[s + 1].cos * nextStack.sin;
                    normsArray[idx++] = sliceVals[s + 1].sin * nextStack.sin;
                    normsArray[idx++] = nextStack.cos;
                    normsArray[idx++] = 0.0;


                    //Triangle 2:
                    // v1 *--* v3
                    //     \ |
                    //      \|
                    // v2 *  * v4
                    //v4
                    normsArray[idx++] = sliceVals[s + 1].cos * nextStack.sin;
                    normsArray[idx++] = sliceVals[s + 1].sin * nextStack.sin;
                    normsArray[idx++] = nextStack.cos;
                    normsArray[idx++] = 0.0;


                    //v3
                    normsArray[idx++] = sliceVals[s + 1].cos * thisStack.sin;
                    normsArray[idx++] = sliceVals[s + 1].sin * thisStack.sin;
                    normsArray[idx++] = thisStack.cos;
                    normsArray[idx++] = 0.0;

                    //v1
                    normsArray[idx++] = sliceVals[s].cos * thisStack.sin;
                    normsArray[idx++] = sliceVals[s].sin * thisStack.sin;
                    normsArray[idx++] = thisStack.cos;
                    normsArray[idx++] = 0.0;

                }
            }


            //Bottom (Special because v2 and v4 are always both 180,180)
            thisStack = nextStack;
            nextStack = { sin: Math.sin(MV.radians(rhoStep * (t + 1))), cos: Math.cos(MV.radians(rhoStep * (t + 1))) };

            for (let s = 0; s < slices; s++) {
                //Triangle:
                // v1 *--* v3
                //    | /
                //    |/
                // v2 *  * v4
                //v1
                normsArray[idx++] = sliceVals[s].cos * thisStack.sin;
                normsArray[idx++] = sliceVals[s].sin * thisStack.sin;
                normsArray[idx++] = thisStack.cos;
                normsArray[idx++] = 0.0;

                //v2
                normsArray[idx++] = sliceVals[s].cos * nextStack.sin;
                normsArray[idx++] = sliceVals[s].sin * nextStack.sin;
                normsArray[idx++] = nextStack.cos;
                normsArray[idx++] = 0.0;

                //v3
                normsArray[idx++] = sliceVals[s + 1].cos * thisStack.sin;
                normsArray[idx++] = sliceVals[s + 1].sin * thisStack.sin;
                normsArray[idx++] = thisStack.cos;
                normsArray[idx++] = 0.0;
            }
            this.sphereVertNum = normsArray.length;
            for (let s = 0; s < this.sphereVertNum; s++) {
                vertsArray[s] = normsArray[s] * radius;
                if (s % 4 == 3) {
                    vertsArray[s] = 1.0;
                    colsArray[s - 3] = this.colour[0];
                    colsArray[s - 2] = this.colour[1];
                    colsArray[s - 1] = this.colour[2];
                    colsArray[s - 0] = this.colour[3];
                }
            }

            this.sphereVerts = this.sphereVertNum / 4;

            if (this.sphereBuffer != 0) {
                this.gl.deleteBuffer(this.sphereBuffer);
            }
            this.sphereBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphereBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.sphereVerts * 4 * 4 * 3, this.gl.DYNAMIC_DRAW);

            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, vertsArray);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, this.sphereVerts * 4 * 4, normsArray);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, this.sphereVerts * 4 * 4 * 2, colsArray);
        }

        else if (!MV.equal(this.sphereColour, this.colour)) {
            this.sphereColour = this.colour;
            let colsArray = new Float32Array((stacks - 1) * slices * 4 * 3 * 2);
            for (let s = 0; s < this.sphereVertNum; s += 4) {
                colsArray[s + 0] = this.colour[0];
                colsArray[s + 1] = this.colour[1];
                colsArray[s + 2] = this.colour[2];
                colsArray[s + 3] = this.colour[3];
            }
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphereBuffer);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, this.sphereVerts * 4 * 4 * 2, colsArray);
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphereBuffer);
        //connect position and normal arrays to shader
        if (this.positionAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.positionAttribLoc);
            this.gl.vertexAttribPointer(this.positionAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, 0);
        }

        if (this.normalAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.normalAttribLoc);
            this.gl.vertexAttribPointer(this.normalAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, this.sphereVerts * 4 * 4);
        }

        if (this.colourAttribLoc != -1) {
            //set a constant colour
            this.gl.enableVertexAttribArray(this.colourAttribLoc);
            this.gl.vertexAttribPointer(this.colourAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, this.sphereVerts * 4 * 4 * 2);
        }

        this.gl.drawArrays(this.primitive, 0, this.sphereVerts);


        this.gl.bindVertexArray(this.external_vao);
    }
    //drawSolidCube
    //  Purpose: draw a cube in filled polygon style.
    //  Preconditions:
    //     size: should be a positive value indicating the dimension of one edge of
    //           the cube
    //
    //  Postconditions:
    //     The vertices for the cube are drawn in GL_TRIANGLES mode.
    //     The cube has sides that measure size units and it centered at (0,0,0).
    //     Data for 36 vertices and normals is stored in OpenGL buffers.
    //     The cube's buffers are connected to the shader program.
    //     The vertex program's colour is set to a constant value.
    /**
     * Draws a solid cube
     * @param {number} size - side length of cube
     * @returns 
     */
    drawSolidCube(size) {
        this.external_vao = this.gl.getParameter(this.gl.VERTEX_ARRAY_BINDING);
        this.gl.bindVertexArray(this.vao);

        //Generate a new cube ONLY if necessary - not the same dimesions as last time
        if (!MV.equal(this.cubeColour, this.colour) || this.lastCubeSize != size) {
            this.cubeColour = this.colour;
            this.lastCubeSize = size;
            for (let i = 0; i < 36; i++) {
                let b = i * 4;
                //vertices packed at start of array                
                this.cubeData[0 + b] = this.cubeFullVerts[i][0] * size;
                this.cubeData[1 + b] = this.cubeFullVerts[i][1] * size;
                this.cubeData[2 + b] = this.cubeFullVerts[i][2] * size;
                this.cubeData[3 + b] = 1.0;

                //normals already packed in constructor

                //colours come after both. Size of cube vertex + normal data is 36 verts * 8 = 288
                this.cubeData[288 + b] = this.cubeColour[0];
                this.cubeData[289 + b] = this.cubeColour[1];
                this.cubeData[290 + b] = this.cubeColour[2];
                this.cubeData[291 + b] = this.cubeColour[3];
            }

            if (this.cubeBuffer != 0) {
                this.gl.deleteBuffer(this.cubeBuffer);
            }
            this.cubeBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.cubeData, this.gl.STATIC_DRAW);
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeBuffer);

        //connect position and normal arrays to shader
        if (this.positionAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.positionAttribLoc);
            this.gl.vertexAttribPointer(this.positionAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, 0);
        }

        if (this.normalAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.normalAttribLoc);
            this.gl.vertexAttribPointer(this.normalAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, this.cubeVertSize);
        }

        if (this.colourAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.colourAttribLoc);
            this.gl.vertexAttribPointer(this.colourAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, this.cubeVertSize + this.cubeNormalSize);
        }

        this.gl.drawArrays(this.primitive, 0, 36);

        this.gl.bindVertexArray(this.external_vao);
    }
    //drawQuad
    //  Purpose: draw a quadrilateral in filled polygon style.
    //  Preconditions:
    //     v1, v2, v3, v4: are vertices that are arranged in "counter clockwise"
    //                     order. The quadrilateral is assumed to be flat.
    //
    //  Postconditions:
    //     The vertices for the quadrilateral are drawn in GL_TRIANGLES mode.
    //     One normal is calculated from three of the vertices.
    //     Data for 6 vertices are stored in WebGL buffers.
    //     The quad's vertex buffer is bound to the shader program
    //     The vertex program's normal and colour entry points are
    //     set to a constant value.
    /**
     * Draw a quadrilateral with the four vertices. 
     * 
     * Should be specified in counter clockwise order. 
     * 
     * The vertices are expected to be co-planar to within floating point error.
     * @param {(vec2|vec3|vec4)} v1 
     * @param {(vec2|vec3|vec4)} v2 
     * @param {(vec2|vec3|vec4)} v3 
     * @param {(vec2|vec3|vec4)} v4 
     */
    drawQuad(v1, v2, v3, v4) {
        this.external_vao = this.gl.getParameter(this.gl.VERTEX_ARRAY_BINDING);
        this.gl.bindVertexArray(this.vao);

        v1 = MV.vec4(v1);
        v2 = MV.vec4(v2);
        v3 = MV.vec4(v3);
        v4 = MV.vec4(v4);
        let dv1 = MV.subtract(v3, v2);
        let dv2 = MV.subtract(v1, v2);
        let n = MV.vec4(MV.normalize(MV.cross(dv1, dv2), true),0);

        let c = this.colour;
        let v = [v4, v1, v3, v2, n, n, n, n, c, c, c, c];

        //Skip expensive flatten call
        for (let i = 0, j = 0; i < v.length; i++, j += 4) {
            this.quadData[j + 0] = v[i][0];
            this.quadData[j + 1] = v[i][1];
            this.quadData[j + 2] = v[i][2];
            this.quadData[j + 3] = v[i][3];
        }

        // Reuse the existing buffer - should be allocated DYNAMIC_DRAW in constructor
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.quadData);
        
        //connect position and normal arrays to shader
        if (this.positionAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.positionAttribLoc);
            this.gl.vertexAttribPointer(this.positionAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, 0);
        }

        if (this.normalAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.normalAttribLoc);
            this.gl.vertexAttribPointer(this.normalAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, 4 * 4 * 4);
        }

        if (this.colourAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.colourAttribLoc);
            this.gl.vertexAttribPointer(this.colourAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, 4 * 4 * 4 * 2);
        }

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

        this.gl.bindVertexArray(this.external_vao);

    }
    //drawWireSphere
    //  Purpose: draw a sphere with wire polygons.
    //           loosely based on code from freeglut project
    //
    //  Preconditions:
    //     radius: should be a positive value indicating the desired radius of the
    //             sphere
    //     slices: should be a positive value indicating how many "slices" you see
    //             if you view the sphere from the top.
    //     stacks: should be a positive value indicating how many layers there are
    //             between the top and bottom of the sphere.
    //
    //  Postconditions:
    //     the vertices for the sphere are drawn in GL_LINES mode with the
    //     desired number of stacks and slices. The sphere has radius "radius" and
    //     is centered at (0,0,0).
    //     The vertices are stored in WebGL buffers that are managed by this function.
    //     The sphere's buffers are connected to the shader program.
    //     The shader program's colour is set to a constant value.
    //
    /**
     * Draws a wire sphere. Data is buffered and stored between calls. It is fastest to call identical sphere
     * and use transformations and shader arguments to change size and appearance. 
     *      
     * Changing colour only changes colour using the same memory and is fast. 
     * 
     * Changing radius, slices or stacks requires reallocation and recompute. Can be slow.
     * @param {number} radius - radius of sphere
     * @param {number} slices - number of subdivisions around the Z axis (similar to lines of longitude)
     * @param {number} stacks - number of subdivisions along the Z axis (similar to lines of latitude)
     * @returns 
     */
    drawWireSphere(radius, slices, stacks) {
        this.external_vao = this.gl.getParameter(this.gl.VERTEX_ARRAY_BINDING);
        this.gl.bindVertexArray(this.vao);

        //Generate a new sphere ONLY if necessary - not the same dimesions as last time
        if (this.lastWireSphereSlices != slices ||
            this.lastWireSphereStacks != stacks ||
            this.lastWireSphereRadius != radius) {
            this.wireSphereColour = this.colour;
            this.lastWireSphereSlices = slices;
            this.lastWireSphereStacks = stacks;
            this.lastWireSphereRadius = radius;
            let phiStep = 360.0 / slices;
            let rhoStep = 180.0 / stacks;

            //allocate new memory
            this.wireSphereVertNum = (stacks - 2) * slices * 4 * 4 + slices * 4 * 6;
            let vertsArray = new Float32Array(this.wireSphereVertNum);
            let normsArray = new Float32Array(this.wireSphereVertNum);
            let colsArray = new Float32Array(this.wireSphereVertNum);
            let i = 0;

            //Calculate sin/cos slices for one stack
            let sliceVals = [];
            for (let s = 0; s <= slices; s++) {
                let t = 0;
                //Triangle:
                // v1 * (v3)
                //    |
                //    |
                // v2 *--* v4
                //v1
                sliceVals[s] = { sin: Math.sin(MV.radians(phiStep * s)), cos: Math.cos(MV.radians(phiStep * s)) };
            }

            //Top (Special because v1 and v3 are always both 0,0)
            //Missing side handled by neighboring triangle
            let nextStack = { sin: 0, cos: 1 };
            let thisStack;
            let t = 0;
            thisStack = nextStack;
            nextStack = { sin: Math.sin(MV.radians(rhoStep * (t + 1))), cos: Math.cos(MV.radians(rhoStep * (t + 1))) };
            let idx = 0;
            for (let s = 0; s < slices; s++) {
                //Triangle:
                // v1 * (v3)
                //    |
                //    |
                // v2 *--* v4
                //v1
                normsArray[idx++] = sliceVals[s].sin * thisStack.sin;
                normsArray[idx++] = sliceVals[s].cos * thisStack.sin;
                normsArray[idx++] = thisStack.cos;
                normsArray[idx++] = 0.0;

                //v2
                normsArray[idx++] = sliceVals[s].sin * nextStack.sin;
                normsArray[idx++] = sliceVals[s].cos * nextStack.sin;
                normsArray[idx++] = nextStack.cos;
                normsArray[idx++] = 0.0;

                //v4
                normsArray[idx++] = sliceVals[s + 1].sin * nextStack.sin;
                normsArray[idx++] = sliceVals[s + 1].cos * nextStack.sin;
                normsArray[idx++] = nextStack.cos;
                normsArray[idx++] = 0.0;

            }

            //Body of sphere
            for (t = 1; t < stacks - 1; t++) {
                thisStack = nextStack;
                nextStack = { sin: Math.sin(MV.radians(rhoStep * (t + 1))), cos: Math.cos(MV.radians(rhoStep * (t + 1))) };

                for (let s = 0; s < slices; s++) {
                    //Four lines to draw the two triangles - missing side handled by next pass through loop:
                    //Almost LINE_STRIP ready...
                    // v1 *--* v3
                    //    |\
                    //    | \
                    // v2 *--* v4
                    //v1
                    normsArray[idx++] = sliceVals[s].sin * thisStack.sin;
                    normsArray[idx++] = sliceVals[s].cos * thisStack.sin;
                    normsArray[idx++] = thisStack.cos;
                    normsArray[idx++] = 0.0;


                    //v2
                    normsArray[idx++] = sliceVals[s].sin * nextStack.sin;
                    normsArray[idx++] = sliceVals[s].cos * nextStack.sin;
                    normsArray[idx++] = nextStack.cos;
                    normsArray[idx++] = 0.0;


                    //v4
                    normsArray[idx++] = sliceVals[s + 1].sin * nextStack.sin;
                    normsArray[idx++] = sliceVals[s + 1].cos * nextStack.sin;
                    normsArray[idx++] = nextStack.cos;
                    normsArray[idx++] = 0.0;


                    //v1
                    normsArray[idx++] = sliceVals[s].sin * thisStack.sin;
                    normsArray[idx++] = sliceVals[s].cos * thisStack.sin;
                    normsArray[idx++] = thisStack.cos;
                    normsArray[idx++] = 0.0;

                }
            }


            //Bottom (Special because v2 and v4 are always both 180,180)
            thisStack = nextStack;
            nextStack = { sin: Math.sin(MV.radians(rhoStep * (t + 1))), cos: Math.cos(MV.radians(rhoStep * (t + 1))) };

            for (let s = 0; s < slices; s++) {
                //Triangle:
                // v1 *  * v3
                //    | /
                //    |/
                // v2 *  * v4
                //v1
                normsArray[idx++] = sliceVals[s].sin * thisStack.sin;
                normsArray[idx++] = sliceVals[s].cos * thisStack.sin;
                normsArray[idx++] = thisStack.cos;
                normsArray[idx++] = 0.0;

                //v2
                normsArray[idx++] = sliceVals[s].sin * nextStack.sin;
                normsArray[idx++] = sliceVals[s].cos * nextStack.sin;
                normsArray[idx++] = nextStack.cos;
                normsArray[idx++] = 0.0;

                //v3
                normsArray[idx++] = sliceVals[s + 1].sin * thisStack.sin;
                normsArray[idx++] = sliceVals[s + 1].cos * thisStack.sin;
                normsArray[idx++] = thisStack.cos;
                normsArray[idx++] = 0.0;
            }

            for (let s = 0; s < this.wireSphereVertNum; s++) {
                vertsArray[s] = normsArray[s] * radius;
                if (s % 4 == 3) {
                    vertsArray[s] = 1.0;
                    colsArray[s - 3] = this.colour[0];
                    colsArray[s - 2] = this.colour[1];
                    colsArray[s - 1] = this.colour[2];
                    colsArray[s - 0] = this.colour[3];
                }
            }

            this.wireSphereVerts = this.wireSphereVertNum / 4;

            if (this.wireSphereBuffer != 0) {
                this.gl.deleteBuffer(this.wireSphereBuffer);
            }
            this.wireSphereBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.wireSphereBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.wireSphereVerts * 4 * 4 * 3, this.gl.STATIC_DRAW);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, vertsArray);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, this.wireSphereVerts * 4 * 4, normsArray);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, this.wireSphereVerts * 4 * 4 * 2, colsArray);
        }
        else if (!MV.equal(this.wireSphereColour, this.colour)) {
            this.wireSphereColour = this.colour;
            let colsArray = new Float32Array((stacks - 2) * slices * 4 * 4 + slices * 4 * 6);
            for (let s = 0; s < this.wireSphereVertNum; s += 4) {
                colsArray[s + 0] = this.colour[0];
                colsArray[s + 1] = this.colour[1];
                colsArray[s + 2] = this.colour[2];
                colsArray[s + 3] = this.colour[3];
            }
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.wireSphereBuffer);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, this.wireSphereVerts * 4 * 4 * 2, colsArray);
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.wireSphereBuffer);
        //connect position and normal arrays to shader
        if (this.positionAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.positionAttribLoc);
            this.gl.vertexAttribPointer(this.positionAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, 0);
        }

        if (this.normalAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.normalAttribLoc);
            this.gl.vertexAttribPointer(this.normalAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, this.wireSphereVerts * 4 * 4);
        }

        if (this.colourAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.colourAttribLoc);
            this.gl.vertexAttribPointer(this.colourAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, this.wireSphereVerts * 4 * 4 * 2);
        }

        this.gl.drawArrays(this.gl.LINE_STRIP, 0, this.wireSphereVerts);
        this.gl.bindVertexArray(this.external_vao);
    }

    //drawWireCube
    //  Purpose: draw a cube in filled polygon style.
    //  Preconditions:
    //     size: should be a positive value indicating the dimension of one edge of
    //           the cube
    //
    //  Postconditions:
    //     The vertices for the cube are drawn in GL_LINES mode.
    //     The cube has sides that measure size units and is centered at (0,0,0).
    //     Data for 30 vertices and normals is stored in OpenGL buffers.
    //     The cube's buffers are connected to the shader program.
    //     The vertex program's colour is set to a constant value.
    /**
     * Draws a wire cube
     * @param {number} size - side length of cube
     * @returns 
     */
    drawWireCube(size) {
        this.external_vao = this.gl.getParameter(this.gl.VERTEX_ARRAY_BINDING);
        this.gl.bindVertexArray(this.vao);

        //Generate a new cube ONLY if necessary - not the same dimesions as last time
        if (!MV.equal(this.sphereColour, this.colour) || this.lastWireCubeSize != size) {
            this.wireCubeColour = this.colour;
            this.lastWireCubeSize = size;
            let vertsArray = [];
            let colsArray = [];
            for (let i = 0; i < 36; i++) {

                vertsArray.push([this.wireCubeFullVerts[i][0] * size, this.wireCubeFullVerts[i][1] * size, this.wireCubeFullVerts[i][2] * size, 1.0]);
                colsArray.push(this.colour);
            }

            if (this.cubeWireBuffer != 0) {
                this.gl.deleteBuffer(this.cubeWireBuffer);
            }
            this.cubeWireBuffer = this.gl.createBuffer();
            let flatVerts = new Float32Array(flatten(vertsArray));
            let flatNorms = new Float32Array(flatten(this.wireCubeNormsArray));
            let flatCols = new Float32Array(flatten(colsArray));
            this.cubeVertSize = flatVerts.byteLength;
            this.cubeNormalSize = flatCols.byteLength;

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeWireBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.cubeVertSize + this.cubeNormalSize + flatCols.byteLength, this.gl.STATIC_DRAW);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, flatVerts);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, this.cubeVertSize, flatNorms);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, this.cubeVertSize + this.cubeNormalSize, flatCols);
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeWireBuffer);

        //connect position and normal arrays to shader
        if (this.positionAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.positionAttribLoc);
            this.gl.vertexAttribPointer(this.positionAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, 0);
        }

        if (this.normalAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.normalAttribLoc);
            this.gl.vertexAttribPointer(this.normalAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, this.cubeVertSize);
        }

        if (this.colourAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.colourAttribLoc);
            this.gl.vertexAttribPointer(this.colourAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, this.cubeVertSize + this.cubeNormalSize);
        }

        this.gl.drawArrays(this.gl.LINE_LOOP, 0, 36);

        this.gl.bindVertexArray(this.external_vao);

    }


    // make Circle Table
    // based on fghCircleTale from freeglut fg_geometry.c
    makeCircleTable(n, halfCircle)
    {
        let i;
    
        /* Table size, the sign of n flips the circle direction */
        const size = Math.abs(n);
    
        /* Determine the angle between samples */
        const angle = (halfCircle?1:2)*Math.PI/( ( n == 0 ) ? 1 : n );
    
        /* Allocate memory for n samples, plus duplicate of first entry at the end */
        let tables = {
            sin: new Float32Array(4*(size+1)),
            cos: new Float32Array(4*(size+1))
        };
        
 
        /* Compute cos and sin around the circle */
        tables.sin[0] = 0.0;
        tables.cos[0] = 1.0;
    
        for (i=1; i<size; i++)
        {
            tables.sin[i] = Math.sin(angle*i);
            tables.cos[i] = Math.cos(angle*i);
        }
    
    
        if (halfCircle)
        {
            tables.sin[size] =  0.0;  /* sin PI */
            tables.cos[size] = -1.0;  /* cos PI */
        }
        else
        {
            /* Last sample is duplicate of the first (sin or cos of 2 PI) */
            tables.sin[size] = tables.sin[0];
            tables.cos[size] = tables.cos[0];
        }
        return tables;
    }    

    //Make Torus Data
    //Based on fghGenerateTorus from freeglut fg_geometry.c
    makeTorusData( iradius, oradius, nSides, nRings)
    {
        
        let torus = {};
        let i, j;
    
        
        /* number of unique vertices */
        if (nSides<2 || nRings<2)
        {
            /* nothing to generate */
            torus.vertSize = 0;
            console.log("Torus has insufficient sides to be rendered");
            return torus;
        }
        torus.vertSize = nSides * nRings;
            
            
        /* precompute values on unit circle */
        let {sin: spsi, cos: cpsi} = this.makeCircleTable(nRings,false);
        let {sin: sphi, cos: cphi} = this.makeCircleTable(-nSides,false);
        
    
        /* Allocate vertex and normal buffers */
        torus.vertices = new Float32Array(torus.vertSize*4);
        torus.normals  = new Float32Array(torus.vertSize*4);

        /* rotate circle1 around circle2 */
        let offset = 0;
        for( j=0; j<nRings; j++ )
        {
            for( i=0; i<nSides; i++ )
            {
                offset = 4 * ( j * nSides + i ) ;
    
                torus.vertices[offset  ] = cpsi[j] * ( oradius + cphi[i] * iradius ) ;
                torus.vertices[offset+1] = spsi[j] * ( oradius + cphi[i] * iradius ) ;
                torus.vertices[offset+2] =                       sphi[i] * iradius  ;
                torus.vertices[offset+3] = 1.0;
                torus.normals[offset  ]  = cpsi[j] * cphi[i] ;
                torus.normals[offset+1]  = spsi[j] * cphi[i] ;
                torus.normals[offset+2]  =           sphi[i] ;
                torus.normals[offset+3] = 0.0;
            }
        }
        return torus;
    }
    
    // Modified from freeglut source: https://github.com/freeglut/freeglut/blob/master/src/fg_geometry.c
    /**
     * Draws a wire torus. Data is buffered and stored between calls. Cheapest to call identical torus. 
     *      
     * Changing colour only changes colour using the same memory and is fast. 
     * 
     * Changing iradius, oradius, nSides or nRings requires
     * reallocation and recompute. Can be slow.
     * @param {number} iradius - inner radius of torus
     * @param {number} oradius - outer radius of torus
     * @param {number} nSides - number of sides of each radial section
     * @param {number} nRings - number of radial divisions for the torus
     * @returns 
     */
    drawWireTorus( iradius, oradius, nSides, nRings )
    {
        this.external_vao = this.gl.getParameter(this.gl.VERTEX_ARRAY_BINDING);
        this.gl.bindVertexArray(this.vao);

        //Generate a new torus ONLY if necessary - not the same dimesions as last time
        if (this.lastWireTorus_iradius != iradius ||
            this.lastWireTorus_oradius != oradius ||
            this.lastWireTorus_nSides != nSides   || 
            this.lastWireTorus_nRings != nRings     ) {

            this.lastWireTorusColour = this.colour;
            this.lastWireTorus_iradius = iradius;
            this.lastWireTorus_oradius = oradius;
            this.lastWireTorus_nSides = nSides;
            this.lastWireTorus_nRings = nRings;

            let i,j,idx;

            /* Generate vertices and normals */
            let {vertices, normals, vertSize} = this.makeTorusData(iradius,oradius,nSides,nRings);

            
            /* Assign colours */
            let colours = new Float32Array(vertSize*4);
            for (i = 0; i < vertSize*4; i+=4)
            {
                colours[i+0] = this.lastWireTorusColour[0];
                colours[i+1] = this.lastWireTorusColour[1];
                colours[i+2] = this.lastWireTorusColour[2];
                colours[i+3] = this.lastWireTorusColour[3];
            }

            /* nothing to draw */
            if (vertSize==0)
                return;

            /* First, generate vertex index arrays for drawing with glDrawElements
            * We have a bunch of line_loops to draw each side, and a
            * bunch for each ring.
            */

            this.torusRingIdx = new Uint16Array(nRings*nSides);
            this.torusWireSideIdx = new Uint16Array(nSides*nRings);


            /* generate for each ring */
            for( j=0,idx=0; j<nRings; j++ )
                for( i=0; i<nSides; i++, idx++ )
                    this.torusRingIdx[idx] = j * nSides + i;

            /* generate for each side */
            for( i=0,idx=0; i<nSides; i++ )
                for( j=0; j<nRings; j++, idx++ )
                    this.torusWireSideIdx[idx] = j * nSides + i;

            /* configure buffers */
            if (this.torusWireBuffer != 0) {
                this.gl.deleteBuffer(this.torusWireBuffer);
                this.gl.deleteBuffer(this.torusWireRingIdxBuffer);
                this.gl.deleteBuffer(this.torusWireSideIdxBuffer);

            }
            this.torusWireVertSize = vertSize;
            this.torusWireDataBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.torusWireDataBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, vertSize*4*4*3, this.gl.STATIC_DRAW);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, vertices);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, vertSize*4*4, normals);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, vertSize*4*4*2, colours);

            this.torusWireRingIdxBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.torusWireRingIdxBuffer);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.torusRingIdx, this.gl.STATIC_DRAW);

            this.torusWireSideIdxBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.torusWireSideIdxBuffer);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.torusWireSideIdx, this.gl.STATIC_DRAW);


        }
        else if (!MV.equal(this.lastWireTorusColour, this.colour)) {
            this.lastWireTorusColour = this.colour;
            let colsArray = new Float32Array(this.torusWireVertSize*4);
            for (let s = 0; s < this.torusWireVertSize; s += 4) {
                colsArray[s + 0] = this.colour[0];
                colsArray[s + 1] = this.colour[1];
                colsArray[s + 2] = this.colour[2];
                colsArray[s + 3] = this.colour[3];
            }
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.torusWireDataBuffer);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, this.torusWireVertSize*4*4*2, colsArray);
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.torusWireDataBuffer);

        //connect position and normal arrays to shader
        if (this.positionAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.positionAttribLoc);
            this.gl.vertexAttribPointer(this.positionAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, 0);
        }

        if (this.normalAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.normalAttribLoc);
            this.gl.vertexAttribPointer(this.normalAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, this.torusWireVertSize*4*4);
        }

        if (this.colourAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.colourAttribLoc);
            this.gl.vertexAttribPointer(this.colourAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, this.torusWireVertSize*4*4*2);
        }

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.torusWireRingIdxBuffer);
        for (let i = 0; i < nRings; i++) {
            this.gl.drawElements(this.gl.LINE_LOOP, nSides, this.gl.UNSIGNED_SHORT,i*nSides*2);
        }

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.torusWireSideIdxBuffer);
        for (let i = 0; i < nSides; i++) {
            this.gl.drawElements(this.gl.LINE_LOOP, nRings, this.gl.UNSIGNED_SHORT,i*nRings*2);
        }

        this.gl.bindVertexArray(this.external_vao);
    }

    /**
     * Draws a solid torus. Data is buffered and stored between calls. It is fastest to call identical torus. 
     *      
     * Changing colour only changes colour using the same memory and is fast. 
     * 
     * Changing iradius, oradius, nSides or nRings requires reallocation and recompute. Can be slow.
     * @param {number} iradius - inner radius of torus
     * @param {number} oradius - outer radius of torus
     * @param {number} nSides - number of sides of each radial section
     * @param {number} nRings - number of radial divisions for the torus
     * @returns 
     */
    drawSolidTorus( iradius, oradius, nSides, nRings )
    {
        this.external_vao = this.gl.getParameter(this.gl.VERTEX_ARRAY_BINDING);
        this.gl.bindVertexArray(this.vao);

        //Generate a new torus ONLY if necessary - not the same dimesions as last time
        if (this.lastSolidTorus_iradius != iradius ||
            this.lastSolidTorus_oradius != oradius ||
            this.lastSolidTorus_nSides != nSides   || 
            this.lastSolidTorus_nRings != nRings     ) {

            this.lastSolidTorusColour = this.colour;
            this.lastSolidTorus_iradius = iradius;
            this.lastSolidTorus_oradius = oradius;
            this.lastSolidTorus_nSides = nSides;
            this.lastSolidTorus_nRings = nRings;

            let i,j,idx;

            /* Generate vertices and normals */
            let {vertices, normals, vertSize} = this.makeTorusData(iradius,oradius,nSides,nRings);

            
            /* Assign colours */
            let colours = new Float32Array(vertSize*4);
            for (i = 0; i < vertSize*4; i+=4)
            {
                colours[i+0] = this.lastSolidTorusColour[0];
                colours[i+1] = this.lastSolidTorusColour[1];
                colours[i+2] = this.lastSolidTorusColour[2];
                colours[i+3] = this.lastSolidTorusColour[3];
            }

            /* nothing to draw */
            if (vertSize==0)
                return;

            /* First, generate vertex index arrays for drawing with glDrawElements
            * We have a bunch of line_loops to draw each side, and a
            * bunch for each ring.
            */

            let torusStripIdx = new Uint16Array((nRings+1)*2*nSides*2);


            for( i=0, idx=0; i<nSides; i++ )
            {
                let ioff = 1;
                if (i==nSides-1)
                    ioff = -i;

                for( j=0; j<nRings; j++, idx+=2 )
                {
                    let offset = j * nSides + i;
                    torusStripIdx[idx  ] = offset;
                    torusStripIdx[idx+1] = offset + ioff;
                }
                /* repeat first to close off shape */
                torusStripIdx[idx  ] = i;
                torusStripIdx[idx+1] = i + ioff;
                idx +=2;
            }            

            /* configure buffers */
            if (this.torusSolidDataBuffer != 0) {
                this.gl.deleteBuffer(this.torusSolidDataBuffer);
                this.gl.deleteBuffer(this.torusSolidStripIdxBuffer);

            }
            this.torusSolidVertSize = vertSize;
            this.torusSolidDataBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.torusSolidDataBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, vertSize*4*4*3, this.gl.STATIC_DRAW);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, vertices);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, vertSize*4*4, normals);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, vertSize*4*4*2, colours);


            this.torusSolidStripIdxBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.torusSolidStripIdxBuffer);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, torusStripIdx, this.gl.STATIC_DRAW);


        }
        else if (!MV.equal(this.lastSolidTorusColour, this.colour)) {
            this.lastSolidTorusColour = this.colour;
            let colsArray = new Float32Array(this.torusSolidVertSize*4);
            for (let s = 0; s < this.wireSphereVertNum; s += 4) {
                colsArray[s + 0] = this.colour[0];
                colsArray[s + 1] = this.colour[1];
                colsArray[s + 2] = this.colour[2];
                colsArray[s + 3] = this.colour[3];
            }
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.torusSolidDataBuffer);
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, this.torusSolidVertSize*4*4*2, colsArray);
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.torusSolidDataBuffer);

        //connect position and normal arrays to shader
        if (this.positionAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.positionAttribLoc);
            this.gl.vertexAttribPointer(this.positionAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, 0);
        }

        if (this.normalAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.normalAttribLoc);
            this.gl.vertexAttribPointer(this.normalAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, this.torusSolidVertSize*4*4);
        }

        if (this.colourAttribLoc != -1) {
            this.gl.enableVertexAttribArray(this.colourAttribLoc);
            this.gl.vertexAttribPointer(this.colourAttribLoc, 4, this.gl.FLOAT, this.gl.FALSE, 0, this.torusSolidVertSize*4*4*2);
        }

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.torusSolidStripIdxBuffer);
        for (let i = 0; i < nSides; i++) {
            this.gl.drawElements(this.gl.TRIANGLE_STRIP, (nRings+1)*2, this.gl.UNSIGNED_SHORT,(nRings+1)*2*i*2);
        }

        this.gl.bindVertexArray(this.external_vao);
    }
}



/**
 * Quickly flatten a 4x4 matrix
 * 
 * Warning: parameter checking is not robust!
 * Warning: reference to internal data is returned - do not save
 * @param { (MV.mat4) } m 
 * @returns { Array(16) }
 */
let matFloats = new Float32Array(4 * 4);
export function flatten4x4(m) {
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            matFloats[i * 4 + j] = m[i][j];
        }
    }
    return matFloats;
}

