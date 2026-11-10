//////////////////////////////////////////////////////////////////////////////
//
//  MV.js
//
//////////////////////////////////////////////////////////////////////////////

// Alex revision Aug-Sept 2024
// General notes:
//  - var has been replaced with let to prevent hoisting and modifying global variables
//  - ECMASCRIPT 6 forbids implicit declaration of variables, so I've added declarations
//    where they were missing
//  - added function headers to help with tooltips when coding
//  - misc other bug fixes. Some functions returned corrupted arrays, crashed on seemingly
//    innocent inputs, or provided subtly wrong results.
//    - most of these types of fixes are documented with inline comments.
//  - added JSDoc headers to most library functions
//
// Alex revision Aug 2026
// General notes:
//  - modularized as part of modernization and node.js/Vite environment migration

//----------------------------------------------------------------------------

//
// Helper Functions
//

/**
 * Factory that returns Float32Arrays enhanced with a push function.
 * Performance Caveat: Push is O(n)
 * Used for Chapter 10 particle system.
 * @param {Number} size
 */
export function MVbuffer(size) {
  let b = {};
  b.buf = new Float32Array(size);
  b.index = 0;
  b.push = function (x) {
    for (let i = 0; i < x.length; i++) {
      b.buf[b.index + i] = x[i];
    }
    b.index += x.length;
    b.type = '';
  }
  return b;
}


/**
 * Returns true if the argument v is one of the library's vector types
 * @param {(vec2 | vec3 | vec4)} v
 * @returns {boolean}
 */
export function isVector(v) {
  if (typeof (v) == "object" && 'type' in v) // prevent hard to debug warning if v not from library
    if (v.type == "vec2" || v.type == "vec3" || v.type == "vec4") return true;
  return false;
}


/**
 * Returns true if the argument v is one of the library's matrix types
 * @param {(mat2 | mat3 | mat4)} v
 * @returns {boolean}
 */
// isMatrix
// Returns true if the argument v is one of the library's Matrix types
export function isMatrix(v) {
  if (typeof (v) == "object" && 'type' in v) // prevent hard to debug warning if v not from library
    if (v.type == "mat2" || v.type == "mat3" || v.type == "mat4") return true;
  return false;
}

/**
 * Returns argument degrees converted to radians 
 * for use with Math library trig functions.
 * @param {number} degrees 
 * @returns {number}
 */
export function radians(degrees) {
  return degrees * Math.PI / 180.0;
}

//----------------------------------------------------------------------------

/**
 * Returns an array of four 4D arrays, useful for representing control points
 * of a rectangular Bezier spline patch
 * Used in Chapter11's teapot1 sample
 * @returns { Array<Array<number>(4)>(4) }
 */
export function patch() {
  let out = new Array(4);
  for (let i = 0; i < 4; i++) out[i] = new Array(4);
  out.type = "patch";
  return out;
}

/**
 * Returns a 4 element array, useful for representing a control point for a spline patch
 * Unused in sample code - likely originally intended for use with patch() 
 * which could be considered an array of four curves
 * @returns { Array<number>(4)}
 */
export function curve() {
  let out = new Array(4);
  out.type = "curve";
  return out;
}



//
//  Vector Constructors
//

/**
 * @typedef {Object} vec2
 */
/**
 * Construct a vec2
 * 
 * Takes 0, 1, or 2 arguments
 *  0: returned vector is (0, 0)
 *  1: { vec2 | vec3 | vec4 } first two elements are used
 *  1: { number } returned vector is (arg, arg)
 *  2: { number, number } returned vector is (arg1, arg2)
 * @returns { vec2 }
 */
export function vec2() {
  let out = new Array(2);
  out.type = 'vec2';

  switch (arguments.length) {
    case 0:
      out[0] = 0.0;
      out[1] = 0.0;
      break;
    case 1:
      //Alex: incorrect bracketing of isVector() argument list
      //      fixed broken rejection of copy of vec2 and vec3... WHY????
      //      also added conversion of single scalar to vector
      if (isVector(arguments[0])) {
        out[0] = arguments[0][0];
        out[1] = arguments[0][1];
      } else if (typeof (arguments[0] === 'number')) {
        out[0] = arguments[0];
        out[1] = arguments[0];
      } else {
        throw new Error("vec2: Single argument constructor must receive a vec2, vec3, vec4 or number")
      }

      break;

    case 2:
      if (typeof (arguments[0] === 'number' && typeof (arguments[1] === 'number'))) {
        out[0] = arguments[0];
        out[1] = arguments[1];
      } else {
        throw new Error("vec2: Two argument constructor must receive two numbers");
      }
      break;
    default:
      throw new Error("vec2: Too many arguments");
  }
  return out;
}


/**
 * @typedef {Object} vec3
 */
/**
 * Construct a vec3 
 * 
 * Takes 0, 1, 2 or 3 arguments
 *  0: returned vector is (0, 0, 0)
 *  1: { vec2 | vec3 | vec4 } first three elements are used, padded with 0 if needed
 *  1: { number } returned vector is (arg, arg, arg)
 *  2: { vec2, number } returned vector is (arg1[0], arg1[1], arg2)
 *  3: { number, number, number } returned vector is (arg1, arg2, arg3)
 * @returns {vec3}
 */
export function vec3() {
  let out = new Array(3);
  out.type = 'vec3';

  switch (arguments.length) {
    case 0:
      out[0] = 0.0;
      out[1] = 0.0;
      out[2] = 0.0;
      return out;
    case 1:
      // Alex: Allow vec3 constructor to convert other combinations of 
      //      vector types scalars to vec3
      if (arguments[0].type == "vec3" || arguments[0].type == "vec4") {
        out[0] = arguments[0][0];
        out[1] = arguments[0][1];
        out[2] = arguments[0][2];
        return out;
      } else if (arguments[0].type == "vec2") {
        out[0] = arguments[0][0];
        out[1] = arguments[0][1];
        out[2] = 0;

      } else if (typeof (arguments[0]) === 'number') {
        out[0] = arguments[0];
        out[1] = arguments[0];
        out[2] = arguments[0];
      } else {
        throw new Error("vec3: one argument constructor must provide a vec3 or vec4")
      }
    case 2:
      if (arguments[0].type == "vec2" && !isVector(arguments[1])) {
        out[0] = arguments[0][0];
        out[1] = arguments[0][1];
        out[2] = arguments[0][2];
        return out;
      } else {
        throw new Error("vec3: two argument constructor must provide vec2, scalar")
      }


    case 3:
      if (typeof (arguments[0] === 'number' && typeof (arguments[1] === 'number') && typeof (arguments[2] === 'number'))) {
        out[0] = arguments[0];
        out[1] = arguments[1];
        out[2] = arguments[2];
      }
      else {
        throw new Error("vec3: Three argument constructor must provide three numbers");
      }
      return out;
    default:
      throw new Error("vec3: Too many arguments");
  }

  return out;
}

/**
 * @typedef {Object} vec4
 */
/**
 * Construct a vec4 
 * 
 * Takes 0, 1, 2 or 4 arguments
 * - 0: returned vector is (0, 0, 0, 0)
 * - 1: { vec2 | vec3 | vec4 } all available elements used, padded with z=0, w=1 if needed
 * - 1: { scalar } returned vector is (arg, arg, arg, 1)
 * - 2: { vec3, number } returned vector is (arg1[0], arg1[1], arg1[2], arg2)
 * - 4: { number, number, number, number } returned vector is (arg1, arg2, arg3, arg4)
 @returns {vec4}
*/
export function vec4() {
  let out = new Array(4);
  out.type = 'vec4';
  switch (arguments.length) {

    case 0:

      out[0] = 0.0;
      out[1] = 0.0;
      out[2] = 0.0;
      out[3] = 0.0;
      return out;

    case 1:
      if (isVector(arguments[0])) {
        if (arguments[0].type == "vec4") {
          out[0] = arguments[0][0];
          out[1] = arguments[0][1];
          out[2] = arguments[0][2];
          out[3] = arguments[0][3];
          return out;
        } //fixed mis-nested if/else - vec3 is a type of vector!
        else if (arguments[0].type == "vec3") {
          out[0] = arguments[0][0];
          out[1] = arguments[0][1];
          out[2] = arguments[0][2];
          out[3] = 1.0;
          return out;
        }
        else { //vec2
          //Alex: the original code here would (and did!) crash because
          //      it tries to find z and w components on types that may not have them!
          out[0] = arguments[0][0];
          out[1] = arguments[0][1];
          out[2] = 0.0;
          out[3] = 1.0;
          return out;
        }
      } else if (typeof (arguments[0]) === 'number') {
        out[0] = arguments[0];
        out[1] = arguments[0];
        out[2] = arguments[0];
        out[3] = 1.0;
        return out;
      } else if ((arguments[0] instanceof Array || argument[0] instanceof Float32Array) && arguments[0].length == 4) {
        //Alex: the textbook code that would have handled non-vec* type arrays used to assume the argument had correct length/type
        //      this is slightly more robust
        out[0] = arguments[0][0];
        out[1] = arguments[0][1];
        out[2] = arguments[0][2];
        out[3] = arguments[0][3];
        return out;
      } else {
        throw new Error("vec4: single argument constructor must provide one of vec2, vec3, vec4, Array of length 3, Float32Array of length 4 or single scalar")
      }


    case 2:
      //Alex: 
      // Original only had this (needed for easy quaternion multiplication)
      // Added a version to append a number to the end of a vec3 to promote it to a vec4
      // usually to add homogeneous coordinate, eg:
      // let 3DVector = vec3(4,5,6);
      // let 4DVector = vec4(3DVector,1); // 4DVector is [4,5,6,1]
      if (typeof (arguments[0]) == 'number' && arguments[1].type == 'vec3') {
        out[0] = arguments[0];
        out[1] = arguments[1][0];
        out[2] = arguments[1][1];
        out[3] = arguments[1][2];
        return out;
      } else if (arguments[0].type == 'vec3' && typeof (arguments[1]) == 'number') {
        out[0] = arguments[0][0];
        out[1] = arguments[0][1];
        out[2] = arguments[0][2];
        out[3] = arguments[1];
        return out;
      } else {
        throw new Error("vec4: two argument constructor must provide (vec3, scalar)")
      }


    case 4:

      //Alex: original if here was pure garbage. Why check for single argument in 4 argument code?
      //Alex: for speed only typecheck first argument
      if (typeof (arguments[0]) == 'number') {
        out[0] = arguments[0];
        out[1] = arguments[1];
        out[2] = arguments[2];
        out[3] = arguments[3];
        return out;
      }

    // case 3 was pure nonsense - covered in case 1
    default:
      throw new Error("vec4: wrong arguments");
  }
}

//----------------------------------------------------------------------------
//
//  Matrix Constructors
//

/**
 * @typedef {Object} mat2
 */
/**
 * Construct a 2x2 matrix
 * 
 * Takes 0, 1 or 4 arguments
 *  - 0:  returns identity matrix
 *  - 1:  {mat2 | Array<number>(4)} returns a copy of the argument
 *  - 9: initializes matrix from arguments in row major order
 * @returns {mat2} 
 */
export function mat2() {
  let out = new Array(2);
  out[0] = new Array(2);
  out[1] = new Array(2);

  switch (arguments.length) {
    case 0:
      out[0][0] = out[3] = 1.0;
      out[1] = out[2] = 0.0;
      break;
    case 1:
      if (arguments[0].type == 'mat2') {
        out[0][0] = arguments[0][0][0];
        out[0][1] = arguments[0][0][1];
        out[1][0] = arguments[0][1][0];
        out[1][1] = arguments[0][1][1];
      } else if (arguments[0].length == 4) {
        out[0][0] = arguments[0][0];
        out[0][1] = arguments[0][1];
        out[1][0] = arguments[0][2];
        out[1][1] = arguments[0][3];
      } else {
        throw new Error("mat2: single argument constructor requires same size matrix as argument")
      }

      break;

    case 4:
      //for speed, only typecheck first argument
      if (typeof (arguments[0]) == 'number') {
        out[0][0] = arguments[0];
        out[0][1] = arguments[1];
        out[1][0] = arguments[2];
        out[1][1] = arguments[3];
      }
      break;
    default:
      throw new Error("mat2: wrong arguments");
  }
  out.type = 'mat2';

  return out;
}

//----------------------------------------------------------------------------

/**
 * @typedef {Object} mat3
 */
/**
 * Construct a 3x3 matrix
 * 
 * Takes 0, 1 or 9 arguments
 *  - 0:  returns identity matrix
 *  - 1:  {mat3 | Array<number>(9)} returns a copy of the argument
 *  - 9: initializes matrix from arguments in row major order
 * @returns {mat3} 
 */
export function mat3() {
  // v = _argumentsToArray( arguments );

  let out = new Array(3);
  out[0] = new Array(3);
  out[1] = new Array(3);
  out[2] = new Array(3);

  switch (arguments.length) {
    case 0:
      out[0][0] = out[1][1] = out[2][2] = 1.0;
      out[0][1] = out[0][2] = out[1][0] = out[1][2] = out[2][0] = out[2][1] = 0.0;
      break;
    case 1:
      // Alex: Original looped i at both levels... duh
      //       also code failed if attempting to copy a mat3()
      // Author added fix in 2022
      if (arguments[0].type == 'mat3') {
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            out[i][j] = arguments[0][i][j];
          }
        }
        break;
      } else if (arguments[0].length == 9) {
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
          out[i][j] = arguments[0][3 * i + j];
        }
        break;
      }
      else {
        throw new Error("mat3: single argument to copy constructor must be mat3 or 9 element array")
      }

    case 9:
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        out[i][j] = arguments[3 * i + j];
      }
      break;
    default:
      throw new Error("mat3: wrong arguments");
  }
  out.type = 'mat3';

  return out;
}


//----------------------------------------------------------------------------


/**
 * @typedef {Object} mat4
 */
/**
 * Construct a 4x4 matrix
 * 
 * Takes 0, 1, 4 or 16 arguments
 *  - 0:  returns identity matrix
 *  - 1:  {mat4 | Array(16)} returns a copy of the argument
 *  - 4:  {vec4, vec4, vec4, vec4} returns matrix with rows loaded from arguments
 *  - 16: initializes matrix from arguments in row major order
 * @returns {mat4} 
 */
export function mat4() {
  //let v = _argumentsToArray( arguments );
  let out = new Array(4);
  out[0] = new Array(4);
  out[1] = new Array(4);
  out[2] = new Array(4);
  out[3] = new Array(4);

  switch (arguments.length) {
    case 0:
      out[0][0] = out[1][1] = out[2][2] = out[3][3] = 1.0;
      out[0][1] = out[0][2] = out[0][3] = out[1][0] = out[1][2] = out[1][3] = out[2][0] = out[2][1]
        = out[2][3] = out[3][0] = out[3][1] = out[3][2] = 0.0;

      break;

    case 1:
      // Alex: Original looped i at both levels... duh
      //       Author added fix in 2022
      //       Original treated mat44 as 1D array... would work in C++ but
      //       shouldn't work in Javascript and it didn't. Kept old code for
      //       use with 1D, 16 element array
      if (arguments[0].type == "mat4") {
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < 4; j++)
            out[i][j] = arguments[0][i][j];
      } else if (arguments[0].length == 16) {
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          out[i][j] = arguments[0][4 * i + j];
        }
      } else {
        throw new Error("mat4: single argument to copy constructor must be mat4 or 16 element array")
      }
      break;

    case 4:
      for (let i = 0; i < 4; i++) {
        //Alex: made type checking more robust
        if (arguments[i].type != "vec4")
          throw new Error("mat4: argument" + i + " not a vec4 in 4 argument constructor")
        for (let j = 0; j < 4; j++)
          out[i][j] = arguments[i][j];
      }
      break;
    case 16:
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        out[i][j] = arguments[4 * i + j];
      }
      break;
    default:
      throw new Error("mat4: incorrect arguments. Must provideone of: \n\t - no argument (for identity matrix)\n\t - one 1D array or mat4\n\t - 4 vec4\n\t - 16 scalars")
  }
  out.type = 'mat4';

  return out;
}

//----------------------------------------------------------------------------
//
//  Generic Mathematical Operations for Vectors and Matrices
//

/**
 * returns true if both arguments have identical type, size and values
 * @param { (mat2|mat3|mat3|vec2|vec3|vec4) } u 
 * @param { (mat2|mat3|mat3|vec2|vec3|vec4) } v 
 * @throws Will throw an error if arguments are not both library mat* or vec* type
 * @throws Will throw an error if argument types do not match
 * @returns { boolean }
 */
export function equal(u, v) {
  if (!((isMatrix(u) || isVector(u)) && (isMatrix(v) || isVector(v))))
    throw new Error("equal(): at least one input not a vec or mat");
  if (u.type != v.type)
    throw new Error("equal(): types different");

  if (isMatrix(u)) {
    for (let i = 0; i < u.length; ++i) for (let j = 0; j < u.length; ++j)
      if (u[i][j] !== v[i][j]) return false;
    return true;
  }

  if (isVector(u)) {
    for (let i = 0; i < u.length; ++i)
      if (u[i] !== v[i]) return false;
    return true;
  }
}



//----------------------------------------------------------------------------

/**
 * Returns the component-wise sum of two same size vectors or matrices
 * @param { (mat2|mat3|mat3|vec2|vec3|vec4) } u 
 * @param { (mat2|mat3|mat3|vec2|vec3|vec4) } v 
 * @throws Will throw an error if arguments are not both library mat* or vec* type
 * @throws Will throw an error if argument types do not match
 * @returns { (mat2|mat3|mat3|vec2|vec3|vec4) }
 */
export function add(u, v) {
  if (!((isMatrix(u) || isVector(u)) && (isMatrix(v) || isVector(v))))
    throw new Error("add(): at least one input not a vec or mat");
  if (u.type != v.type)
    throw new Error("add(): trying to add different types");

  if (isVector(u)) {
    let result = new Array(u.length);
    result.type = u.type;
    for (let i = 0; i < u.length; i++) {
      result[i] = u[i] + v[i];
    }
    return result;
  }

  if (isMatrix(u)) {
    let result;
    if (u.type == 'mat2') result = mat2();
    if (u.type == 'mat3') result = mat3();
    if (u.type == 'mat4') result = mat4();
    for (let i = 0; i < u.length; i++) for (let j = 0; j < u.length; j++) {
      result[i][j] = u[i][j] + v[i][j];
    }
    return result;
  }
}

//----------------------------------------------------------------------------

/**
 * Returns the component-wise difference of two same size vectors or matrices
 * @param { (mat2|mat3|mat3|vec2|vec3|vec4) } u 
 * @param { (mat2|mat3|mat3|vec2|vec3|vec4) } v 
 * @throws Will throw an error if arguments are not both library mat* or vec* type
 * @throws Will throw an error if argument types do not match
 * @returns { (mat2|mat3|mat3|vec2|vec3|vec4) }
 */
export function subtract(u, v) {
  if (!((isMatrix(u) || isVector(u)) && (isMatrix(v) || isVector(v))))
    throw new Error("subtract(): at least one input not a vec or mat");
  if (u.type != v.type) {
    throw new Error("subtract(): trying to subtract different types");
  }
  let result;
  if (isVector(u)) {
    if (u.type == 'vec2') result = vec2();
    if (u.type == 'vec3') result = vec3();
    if (u.type == 'vec4') result = vec4();
    result.type = u.type;
    for (let i = 0; i < u.length; i++) {
      result[i] = u[i] - v[i];
    }
    return result;
  }
  if (isMatrix(u)) {
    if (u.type == 'mat2') result = mat2();
    if (u.type == 'mat3') result = mat3();
    if (u.type == 'mat4') result = mat4();
    for (let i = 0; i < u.length; i++) for (let j = 0; j < u.length; j++) {
      result[i][j] = u[i][j] - v[i][j];
    }
    return result;
  }
}

//----------------------------------------------------------------------------
/**
 * Returns the component-wise product of two same size vectors or matrices
 * 
 * or if u is a number, multiplies components of v by that number
 * 
 * or if u is a matrix and v is a compatible length vector, multiplies the vector by the matrix
 * @param { (number|mat2|mat3|mat3|vec2|vec3|vec4) } u 
 * @param { (mat2|mat3|mat3|vec2|vec3|vec4) } v 
 * @throws Will throw an error if arguments are not both library matrix or vector types
 * @throws Will throw an error if argument types do not match
 * @returns { (mat2|mat3|mat3|vec2|vec3|vec4) }
 */
export function mult(u, v) {
  let result; //Alex: result was not declared in original, 
  if (typeof (u) == "number") {

    if (isVector(v)) {
      result = new Array(v.length);
      result.type = v.type;
      for (let i = 0; i < v.length; i++) {
        result[i] = u * v[i];
      }
      return result;
    }
    if (isMatrix(v)) { //Alex: sanity test omitted in original
      if (v.type = 'mat2') result = mat2();
      if (v.type = 'mat3') result = mat3();
      if (v.type = 'mat4') result = mat4();
      //Alex: Code to scale matrices not provided in original
      for (let i = 0; i < v.length; i++) {
        for (let j = 0; j < v.length; j++) {
          result[i][j] = u * v[i][j];
        }
      }
      return result;
    }
  }

  if (u.type == 'mat2' && v.type == 'vec2') {
    result = vec2();
    for (let i = 0; i < 2; i++) {
      result[i] = 0.0;
      for (let k = 0; k < 2; k++) result[i] += u[i][k] * v[k];
    }
    return result;
  }

  if (u.type == 'mat3' && v.type == 'vec3') {
    result = vec3();
    for (let i = 0; i < 3; i++) {
      result[i] = 0.0;
      for (let k = 0; k < 3; k++) result[i] += u[i][k] * v[k];
    }
    return result;
  }

  if (u.type == 'mat4' && v.type == 'vec4') {
    result = vec4();
    for (let i = 0; i < 4; i++) {
      result[i] = 0.0;
      for (let k = 0; k < 4; k++) result[i] += u[i][k] * v[k];
    }
    return result;
  }

  if (u.type == 'mat2' && v.type == 'mat2') {
    result = mat2();
    for (let i = 0; i < 2; i++) for (j = 0; j < 2; j++) {
      result[i][j] = 0.0;
      for (let k = 0; k < 2; k++) result[i][j] += u[i][k] * v[k][j];
    }
    return result;
  }

  if (u.type == 'mat3' && v.type == 'mat3') {
    result = mat3();
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      result[i][j] = 0.0;
      for (let k = 0; k < 3; k++) result[i][j] += u[i][k] * v[k][j];
    }
    return result;
  }

  if (u.type == 'mat4' && v.type == 'mat4') {
    result = mat4();
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      result[i][j] = 0.0;
      for (let k = 0; k < 4; k++) result[i][j] += u[i][k] * v[k][j];
    }
    return result;
  }

  if (u.type == 'vec3' && v.type == 'vec3') {
    let result = vec3(u[0] * v[0], u[1] * v[1], u[2] * v[2]);
    return result;
  }

  if (u.type == 'vec4' && v.type == 'vec4') {
    let result = vec4(u[0] * v[0], u[1] * v[1], u[2] * v[2], u[3] * v[3]);
    return result;
  }
  if (u.type == 'vec2' && v.type == 'vec2') { //Alex: vec2 path not provided in original
    let result = vec3(u[0] * v[0], u[1] * v[1], u[2] * v[2]);
    return result;
  }

  throw new Error("mult(): trying to mult incompatible types");
}



//----------------------------------------------------------------------------
//
//  Basic Transformation Matrix Generators
//

/**
 * translate
 * Returns a 2D (mat3) or 3D (mat4) translaton matrix based on arguments
 * Does not type check arguments
 * @param { number } x 
 * @param { number } y 
 * @param { number } [z] - z parameter is omitted if 2D translation matrix is desired
 * @throws Will throw an error if given the wrong number of argumants
 * @returns { mat3|mat4 }
 */
export function translate(x, y, z) {
  if (arguments.length != 2 && arguments.length != 3) {
    throw new Error("translate(): \n\twrong number of arguments\n\trequires 2 arguments 2D translation or 3 arguments for 3D translation matrix");
  }
  let result;
  if (arguments.length == 2) {
    result = mat3();
    result[0][2] = x;
    result[1][2] = y;

    return result;
  }
  result = mat4();

  result[0][3] = x;
  result[1][3] = y;
  result[2][3] = z;

  return result;

}


//----------------------------------------------------------------------------
/**
 * Rotate
 * Returns a 3D (mat4) matrix that rotates by angle degrees about axis
 * Takes 2 or 4 arguments:
 *  - 2: { number, (Array<number>3|vec3), number} angle, axis
 *  - 4: { number, number, number, number} angle, x, y, z
 * @throws Will throw an error if given the wrong number of arguments
 * @throws Will throw an error if it cannot interpret or convert arguments after angle as a vec3
 * @returns { mat3|mat4 }
 */
export function rotate(angle, axis) {
  if (arguments.length == 1) {
    console.warn("2D Rotation Matrix requested. Is this intended?");
    let t = radians(angle);
    const c = Math.cos(t);
    const s = Math.sin(t);
    return mat3(
      c, -s, 0,
      s, c, 0,
      0, 0, 1,
    );
  }

  if (arguments.length != 2 && arguments.length != 4) throw new Error("rotate(): requires 2 or 4 arguments");

  if (typeof (axis) == "Array" && axis.length == 3) {
    axis = vec3(axis[0], axis[1], axis[2]);
  }

  if (arguments.length == 4) {
    axis = vec3(arguments[1], arguments[2], arguments[3]);
  }

  if (axis.type != 'vec3') throw new Error("rotate: cannot interpret arguments after angle as a vec3 axis");

  let v = normalize(axis);

  let x = v[0];
  let y = v[1];
  let z = v[2];

  let c = Math.cos(radians(angle));
  let omc = 1.0 - c;
  let s = Math.sin(radians(angle));

  let result = mat4(
    x * x * omc + c, x * y * omc + z * s, x * z * omc - y * s, 0.0,
    x * y * omc - z * s, y * y * omc + c, y * z * omc + x * s, 0.0,
    x * z * omc + y * s, y * z * omc - x * s, z * z * omc + c, 0.0,
    0.0, 0.0, 0.0, 1.0
  );
  return result;
}


/**
 * rotateX
 * Returns a 3D rotation matrix that rotates by theta degrees about X
 * @param {number} theta 
 * @returns {mat4} 
 */
export function rotateX(theta) {
  let c = Math.cos(radians(theta));
  let s = Math.sin(radians(theta));
  let rx = mat4(1.0, 0.0, 0.0, 0.0,
    0.0, c, -s, 0.0,
    0.0, s, c, 0.0,
    0.0, 0.0, 0.0, 1.0);
  return rx;
}

/**
 * rotateY
 * Returns a 3D rotation matrix that rotates by theta degrees about Y
 * @param {number} theta 
 * @returns {mat4} 
 */
function rotateY(theta) {
  let c = Math.cos(radians(theta));
  let s = Math.sin(radians(theta));
  let ry = mat4(c, 0.0, s, 0.0,
    0.0, 1.0, 0.0, 0.0,
    -s, 0.0, c, 0.0,
    0.0, 0.0, 0.0, 1.0);
  return ry;
}

/**
 * rotateZ
 * Returns a 3D rotation matrix that rotates by theta degrees about Z
 * @param {number} theta 
 * @returns {mat4} 
 */
export function rotateZ(theta) {
  let c = Math.cos(radians(theta));
  let s = Math.sin(radians(theta));
  let rz = mat4(c, -s, 0.0, 0.0,
    s, c, 0.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0);
  return rz;
}
//----------------------------------------------------------------------------


/**
 * scale
 * Returns a 3D scaling matrix based on x, y and z scaling parameters
 * Some legacy textbook code uses this function to scale a vector. Please use mult instead.
 * @param {number} x 
 * @param {number} y 
 * @param {number} z 
 * @throws Will throw an error if given wrong number of arguments 
 * @returns {mat4} 
 */
export function scale(x, y, z) {
  if (arguments.length == 2)
    // legacy code - see 09/geometryTest2.js, 10/geometryTest2.js, 10/particleSystem.js, 10/particleSystem2.js
    // should use mult
    if (isVector(arguments[1])) {
      console.warn("Legacy code - use mult to scale vectors instead");
      result = new Array(arguments[1].length);
      result.type = arguments[1].type;
      for (let i = 0; i < arguments[1].length; i++)
        result[i] = arguments[0] * arguments[1][i];
      return result;
    }
    else
    // end legacy code
    {
      console.warn("2D Scaling Matrix requested. Is this intended?");
      let result = mat3();
      result[0][0] = x;
      result[1][1] = y;
      return result;
    }

  if (arguments.length == 3) {

    let result = mat4();
    result[0][0] = x;
    result[1][1] = y;
    result[2][2] = z;
    result[3][3] = 1.0;
    return result;
  }

  throw new Error("scale: wrong arguments");

}



//----------------------------------------------------------------------------
//
//  ModelView Matrix Generators
//

/**
 * lookAt
 * Returns a 3D view matrix that points from eye position toward at position
 * with up direction adjusted to be perpendicular to eye->at vector
 * Warning: behavious undefined if eye->at and up are co-linear
 * @param { vec3 } eye 
 * @param { vec3 } at 
 * @param { vec3 } up 
 * @returns { mat4 }
 */
export function lookAt(eye, at, up) {
  if (eye.type != 'vec3') {
    throw new Error("lookAt(): first parameter [eye] must be an a vec3");
  }

  if (at.type != 'vec3') {
    throw new Error("lookAt(): first parameter [at] must be an a vec3");
  }

  if (up.type != 'vec3') {
    throw new Error("lookAt(): first parameter [up] must be an a vec3");
  }

  if (equal(eye, at)) {
    return mat4();
  }

  let v = normalize(subtract(at, eye));  // view direction vector
  let n = normalize(cross(v, up));       // perpendicular vector
  let u = normalize(cross(n, v));        // "new" up vector
  v = negate(v);

  let result = mat4(
    n[0], n[1], n[2], -dot(n, eye),
    u[0], u[1], u[2], -dot(u, eye),
    v[0], v[1], v[2], -dot(v, eye),
    0.0, 0.0, 0.0, 1.0
  );

  return result;
}

//----------------------------------------------------------------------------
//
//  Projection Matrix Generators
//

/**
 * ortho
 * Returns a 3D orthographic projection matrix based on rectangular prism bounded by arguments
 * @param { number } left 
 * @param { number } right 
 * @param { number } bottom 
 * @param { number } top 
 * @param { number } near 
 * @param { number } far 
 * @throws Will throw an error if incorrect number of arguments provided
 * @throws Will throw an error if opposite sides of rectangular prism are equal
 * @returns { mat4 }
 */
export function ortho(left, right, bottom, top, near, far) {
  if (arguments.length != 6) { throw new Error("ortho(): wrong number of arguments"); }
  if (left == right) { throw new Error("ortho(): left and right are equal"); }
  if (bottom == top) { throw new Error("ortho(): bottom and top are equal"); }
  if (near == far) { throw new Error("ortho(): near and far are equal"); }

  let w = right - left;
  let h = top - bottom;
  let d = far - near;

  let result = mat4();

  result[0][0] = 2.0 / w;
  result[1][1] = 2.0 / h;
  result[2][2] = -2.0 / d;

  result[0][3] = -(left + right) / w;
  result[1][3] = -(top + bottom) / h;
  result[2][3] = -(near + far) / d;
  result[3][3] = 1.0;

  return result;
}

//----------------------------------------------------------------------------

/**
 * perspective
 * Returns a 3D perspective transformation matrix
 *  - fovy: field of view in y direction in degrees
 *  - aspect: ratio of (x field of view) / (y field of view)
 *  - near: near clipping distance
 *  - far: far clipping distance
 * @param { number } fovy 
 * @param { number } aspect 
 * @param { number } near 
 * @param { number } far 
 * @throws Will throw an error if provided wrong number of arguments
 * @returns 
 */
export function perspective(fovy, aspect, near, far) {
  if (arguments.length != 4) { throw new Error("perspective(): wrong number of arguments"); }

  let f = 1.0 / Math.tan(radians(fovy) / 2);
  let d = far - near;

  let result = mat4();
  result[0][0] = f / aspect;
  result[1][1] = f;
  result[2][2] = -(near + far) / d;
  result[2][3] = -2 * near * far / d;
  result[3][2] = -1;
  result[3][3] = 0.0;

  return result;
}

//----------------------------------------------------------------------------
//
//  Matrix Functions
//

/**
 * transpose
 * Transposes the elements of argument m
 * @param { (vec2|vec3|vec4|patch) } m 
 * @throws Will throw an error if argument cannot be transposed
 * @returns { (vec2|vec3|vec4|patch) }
 */
export function transpose(m) {
  if (typeof (m) == "object" && 'type' in m) {

    if (m.type == 'patch') {
      let out = patch()
      for (let i = 0; i < 4; i++) out[i] = new Array(4);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) out[i][j] = m[j][i];
      return out;
    }
    let result;
    switch (m.type) {
      case 'mat2':
        result = mat2(m[0][0], m[1][0],
          m[0][1], m[1][1]
        );
        return result;
        break;

      case 'mat3':
        result = mat3(m[0][0], m[1][0], m[2][0],
          m[0][1], m[1][1], m[2][1],
          m[0][2], m[1][2], m[2][2]
        );
        return result;
        break;

      case 'mat4':

        result = mat4(m[0][0], m[1][0], m[2][0], m[3][0],
          m[0][1], m[1][1], m[2][1], m[3][1],
          m[0][2], m[1][2], m[2][2], m[3][2],
          m[0][3], m[1][3], m[2][3], m[3][3]
        );

        return result;
        break;

      default: throw new Error("transpose(): trying to transpose non-matrix type ") + m.type;
    }
  }
  throw new Error("transpose(): cannot transpose arguments of type ") + typeof (m);
}


//----------------------------------------------------------------------------
//
//  Vector Functions
//

/**
 * dot
 * Returns the dot product of the arguments.
 * @param { (vec2|vec3|vec4) } u 
 * @param { (vec2|vec3|vec4) } v 
 * @throws Will throw an error if the arguments are not library vectors
 * @returns { number }
 */
export function dot(u, v) {
  if (!isVector(u) || !isVector(v)) { //Alex: checking both arguments library function instead of checking type on one only
    throw new Error("dot(): at least one argument is not a vector from this library");
  }
  if (u.type != v.type) {
    throw new Error("dot(): argument types are not the same");
  }

  let sum = 0.0;
  for (let i = 0; i < u.length; i++) {
    sum += u[i] * v[i];
  }
  return sum;
}

//----------------------------------------------------------------------------
/**
 * negate
 * Returns a same size vector containing negations of components of argument
 * @param { (vec2|vec3|vec4) } u 
 * @throws Will throw an error if the argument is not a library vector
 * @returns { (vec2|vec3|vec4) }
 */
export function negate(u) {
  if (!isVector(u)) { //Alex: checking both arguments library function instead of checking type 
    throw new Error("negate(): not a vector ");
  }
  let result = new Array(u.length);
  result.type = u.type;
  for (let i = 0; i < u.length; ++i) {
    result[i] = -u[i];
  }
  return result;
}

//----------------------------------------------------------------------------
/**
 * cross
 * Returns the cross product of the arguments.
 * Ignores homogenous coordinate if provided vec4 and returns vec3.
 * @param { (vec3|vec4) } u 
 * @param { (vec3|vec4) } v 
 * @throws Will throw an error if the arguments are not matched vec3 or vec4
 * @returns { vec3 }
 */
export function cross(u, v) {
  if (isVector(u) && isVector(v)) {
    if (u.type == 'vec3' && v.type == 'vec3') {
      let result = vec3(
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
      );
      return result;
    }
    //Alex: require both arguments be vec4 - original code only checked
    //      second argument... twice. Duh!
    if (u.type == 'vec4' && v.type == 'vec4') {
      let result = vec3(
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
      );
      return result;
    }
  }
  throw new Error("cross: types aren't matched vec3 or vec4");
}

//----------------------------------------------------------------------------
/**
 * length
 * Returns Euclidean norm of the argument.
 * @param { (vec2|vec3|vec4) } u 
 * @throws Will throw error if argument is not a library vector 
 * @returns 
 */
export function length(u) {
  return Math.sqrt(dot(u, u));
}

//----------------------------------------------------------------------------

/**
 * normalize
 * normalize u
 * excludes homogeneous coordinate of vec3 or vec4 if excludeLastComponent is true
 * @param { (vec2|vec3|vec4) } u 
 * @param { boolean } [excludeLastComponent=false]
 * @throws Will throw an error if the argument is not a library vector type
 * @returns { (vec2|vec3|vec4) }
 */
export function normalize(u, excludeLastComponent = false) {
  // Alex: switched type test to isVector 
  //       - custom test provided by original misses vec2 and crashes if u is
  //         not a textbook type!
  if (isVector(u)) {
    switch (u.type) {
      case 'vec2':
        let len = Math.sqrt(u[0] * u[0] + u[1] * u[1]);
        let result = vec2(u[0] / len, u[1] / len);
        return result;
        break;
      case 'vec3':
        if (excludeLastComponent) {
          let len = Math.sqrt(u[0] * u[0] + u[1] * u[1]);
          let result = vec3(u[0] / len, u[1] / len, u[2]);
          return result;
          break;
        } else {
          let len = Math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
          let result = vec3(u[0] / len, u[1] / len, u[2] / len);
          return result;
          break;
        }
      case 'vec4':
        if (excludeLastComponent) {
          let len = Math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
          let result = vec4(u[0] / len, u[1] / len, u[2] / len, u[3]);
          return result;
          break;
        } else {
          let len = Math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2] + u[3] * u[3]);
          let result = vec4(u[0] / len, u[1] / len, u[2] / len, u[3] / len);
          return result;
          break;
        }
    }
  }
  throw new Error("normalize(): not a recognized vector type")
}

//----------------------------------------------------------------------------

/**
 * mix
 * 
 * Mixes u and v according to value of s 
 * ie: (1-s)\*u + s\*v
 *  - if s is 0, result is u
 *  - if s is 1, result is v
 *  - if s is between 0 and 1, result is between u and v
 * @param { (number|Array<number>) } u 
 * @param { (number|Array<number>) } v 
 * @param { (number|Array<number>) } s 
 * @throws Will throw error if s is not a number
 * @throws Will throw error if u and v are different lengths
 * @returns 
 */
export function mix(u, v, s) {
  if (typeof (s) !== "number") {
    throw new Error("mix: the last paramter " + s + " must be a number");
  }
  if (typeof (u) == 'number' && typeof (v) == 'number') {
    return (1.0 - s) * u + s * v;
  }

  if (u.length != v.length) {

    throw new Error("vector dimension mismatch");
  }

  let result = new Array(u.length);
  for (let i = 0; i < u.length; ++i) {
    result[i] = (1.0 - s) * u[i] + s * v[i];
  }
  result.type = u.type;
  return result;
}

//----------------------------------------------------------------------------
//
// Vector and Matrix utility functions
//

/**
 * Converts vector, matrix or arrays of vectors into a 1D Float32Array
 * suitable for use with WebGL data buffers.
 * 
 * Warning: parameter checking is not robust!
 * @param { (vec*|mat*|Array<float>|Array<vec*>|Array<mat*>) } v 
 * @returns { }
 */
export function flatten(v) {
  // Alex: At least one sample, 07/texture3D3.html, tries to flatten a scalar.
  //       That sample does not include flatten.js which has a fix.
  //       Fixing the scalar problem only reveals other problems with the slide x control in that sample.
  //       So I'm adding a throw to signal that the code may have deeper problems than a conversion can fix.
  //       Sigh.
  if (!Array.isArray(v)) { throw new Error("flatten(): argument is not an array, vector or matrix and cannot be flattened") }

  if (isVector(v)) {
    let floats = new Float32Array(v.length)
    for (let i = 0; i < v.length; i++) floats[i] = v[i];
    return floats;
  }

  if (isMatrix(v)) {

    let floats = new Float32Array(v.length * v.length);
    for (let i = 0; i < v.length; i++) for (let j = 0; j < v.length; j++) {
      floats[i * v.length + j] = v[j][i];
    }
    return floats;
  }

  if (typeof (v[0]) == 'number') {
    let floats = new Float32Array(v.length);

    for (let i = 0; i < v.length; i++)
      floats[i] = v[i];

    return floats;
  }

  let floats = new Float32Array(v.length * v[0].length);

  for (let i = 0; i < v.length; i++) for (let j = 0; j < v[0].length; j++) {
    floats[i * v[0].length + j] = v[i][j];
  }
  return floats;
}

//
//----------------------------------------------------------------------------


function cut(a) {
  return Math.round(a * 1000) / 1000;
}

/**
 * Prints a matrix or patch, floating point numbers rounded to 3 place.
 * 
 * @param { (mat*|patch) } m
 * @returns { }
 */
export function printm(m) {
  switch (m.type) {
    case 'mat2':
      console.log(cut(m[0][0]), cut(m[0][1]));
      console.log(cut(m[1][0]), cut(m[1][1]));
      break;
    case 'mat3':
      console.log(cut(m[0][0]), cut(m[0][1]), cut(m[0][2]));
      console.log(cut(m[1][0]), cut(m[1][1]), cut(m[1][2]));
      console.log(cut(m[2][0]), cut(m[2][1]), cut(m[2][2]));
      break;
    case 'mat4':
      console.log(cut(m[0][0]), cut(m[0][1]), cut(m[0][2]), cut(m[0][3]));
      console.log(cut(m[1][0]), cut(m[1][1]), cut(m[1][2]), cut(m[1][3]));
      console.log(cut(m[2][0]), cut(m[2][1]), cut(m[2][2]), cut(m[2][3]));
      console.log(cut(m[3][0]), cut(m[3][1]), cut(m[3][2]), cut(m[3][3]));
      break;
    case 'patch':
      for (let i = 0; i < 4; i++)
        console.log(m[i][0], m[i][1], m[i][2], m[i][3]);
      break;
    default: throw new Error("printm: not a matrix");
  }
}
// determinants

function det2(m) {

  return m[0][0] * m[1][1] - m[0][1] * m[1][0];

}

function det3(m) {
  let d = m[0][0] * m[1][1] * m[2][2]
    + m[0][1] * m[1][2] * m[2][0]
    + m[0][2] * m[2][1] * m[1][0]
    - m[2][0] * m[1][1] * m[0][2]
    - m[1][0] * m[0][1] * m[2][2]
    - m[0][0] * m[1][2] * m[2][1]
    ;
  return d;
}

function det4(m) {
  let m0 = [
    vec3(m[1][1], m[1][2], m[1][3]),
    vec3(m[2][1], m[2][2], m[2][3]),
    vec3(m[3][1], m[3][2], m[3][3])
  ];
  let m1 = [
    vec3(m[1][0], m[1][2], m[1][3]),
    vec3(m[2][0], m[2][2], m[2][3]),
    vec3(m[3][0], m[3][2], m[3][3])
  ];
  let m2 = [
    vec3(m[1][0], m[1][1], m[1][3]),
    vec3(m[2][0], m[2][1], m[2][3]),
    vec3(m[3][0], m[3][1], m[3][3])
  ];
  let m3 = [
    vec3(m[1][0], m[1][1], m[1][2]),
    vec3(m[2][0], m[2][1], m[2][2]),
    vec3(m[3][0], m[3][1], m[3][2])
  ];
  return m[0][0] * det3(m0) - m[0][1] * det3(m1)
    + m[0][2] * det3(m2) - m[0][3] * det3(m3);

}

/**
 * Calculates the determinant of a matrix.
 * 
 * @param { (mat*) } m
 * @returns { (number) }
 */
export function det(m) {
  if (!isMatrix(m)) throw ("det: m not a matrix");
  if (m.length == 2) return det2(m);
  if (m.length == 3) return det3(m);
  if (m.length == 4) return det4(m);
}


//---------------------------------------------------------

// inverses

function inverse2(m) {
  let a = mat2();
  let d = det2(m);
  a[0][0] = m[1][1] / d;
  a[0][1] = -m[0][1] / d;
  a[1][0] = -m[1][0] / d;
  a[1][1] = m[0][0] / d;
  return a;
}

function inverse3(m) {
  let a = mat3();
  let d = det3(m);

  let a00 = [
    vec2(m[1][1], m[1][2]),
    vec2(m[2][1], m[2][2])
  ];
  let a01 = [
    vec2(m[1][0], m[1][2]),
    vec2(m[2][0], m[2][2])
  ];
  let a02 = [
    vec2(m[1][0], m[1][1]),
    vec2(m[2][0], m[2][1])
  ];
  let a10 = [
    vec2(m[0][1], m[0][2]),
    vec2(m[2][1], m[2][2])
  ];
  let a11 = [
    vec2(m[0][0], m[0][2]),
    vec2(m[2][0], m[2][2])
  ];
  let a12 = [
    vec2(m[0][0], m[0][1]),
    vec2(m[2][0], m[2][1])
  ];
  let a20 = [
    vec2(m[0][1], m[0][2]),
    vec2(m[1][1], m[1][2])
  ];
  let a21 = [
    vec2(m[0][0], m[0][2]),
    vec2(m[1][0], m[1][2])
  ];
  let a22 = [
    vec2(m[0][0], m[0][1]),
    vec2(m[1][0], m[1][1])
  ];

  a[0][0] = det2(a00) / d;
  a[0][1] = -det2(a10) / d;
  a[0][2] = det2(a20) / d;
  a[1][0] = -det2(a01) / d;
  a[1][1] = det2(a11) / d;
  a[1][2] = -det2(a21) / d;
  a[2][0] = det2(a02) / d;
  a[2][1] = -det2(a12) / d;
  a[2][2] = det2(a22) / d;

  return a;

}

function inverse4(m) {
  let a = mat4();
  let d = det4(m);

  let a00 = [
    vec3(m[1][1], m[1][2], m[1][3]),
    vec3(m[2][1], m[2][2], m[2][3]),
    vec3(m[3][1], m[3][2], m[3][3])
  ];
  let a01 = [
    vec3(m[1][0], m[1][2], m[1][3]),
    vec3(m[2][0], m[2][2], m[2][3]),
    vec3(m[3][0], m[3][2], m[3][3])
  ];
  let a02 = [
    vec3(m[1][0], m[1][1], m[1][3]),
    vec3(m[2][0], m[2][1], m[2][3]),
    vec3(m[3][0], m[3][1], m[3][3])
  ];
  let a03 = [
    vec3(m[1][0], m[1][1], m[1][2]),
    vec3(m[2][0], m[2][1], m[2][2]),
    vec3(m[3][0], m[3][1], m[3][2])
  ];
  let a10 = [
    vec3(m[0][1], m[0][2], m[0][3]),
    vec3(m[2][1], m[2][2], m[2][3]),
    vec3(m[3][1], m[3][2], m[3][3])
  ];
  let a11 = [
    vec3(m[0][0], m[0][2], m[0][3]),
    vec3(m[2][0], m[2][2], m[2][3]),
    vec3(m[3][0], m[3][2], m[3][3])
  ];
  let a12 = [
    vec3(m[0][0], m[0][1], m[0][3]),
    vec3(m[2][0], m[2][1], m[2][3]),
    vec3(m[3][0], m[3][1], m[3][3])
  ];
  let a13 = [
    vec3(m[0][0], m[0][1], m[0][2]),
    vec3(m[2][0], m[2][1], m[2][2]),
    vec3(m[3][0], m[3][1], m[3][2])
  ];
  let a20 = [
    vec3(m[0][1], m[0][2], m[0][3]),
    vec3(m[1][1], m[1][2], m[1][3]),
    vec3(m[3][1], m[3][2], m[3][3])
  ];
  let a21 = [
    vec3(m[0][0], m[0][2], m[0][3]),
    vec3(m[1][0], m[1][2], m[1][3]),
    vec3(m[3][0], m[3][2], m[3][3])
  ];
  let a22 = [
    vec3(m[0][0], m[0][1], m[0][3]),
    vec3(m[1][0], m[1][1], m[1][3]),
    vec3(m[3][0], m[3][1], m[3][3])
  ];
  let a23 = [
    vec3(m[0][0], m[0][1], m[0][2]),
    vec3(m[1][0], m[1][1], m[1][2]),
    vec3(m[3][0], m[3][1], m[3][2])
  ];

  let a30 = [
    vec3(m[0][1], m[0][2], m[0][3]),
    vec3(m[1][1], m[1][2], m[1][3]),
    vec3(m[2][1], m[2][2], m[2][3])
  ];
  let a31 = [
    vec3(m[0][0], m[0][2], m[0][3]),
    vec3(m[1][0], m[1][2], m[1][3]),
    vec3(m[2][0], m[2][2], m[2][3])
  ];
  let a32 = [
    vec3(m[0][0], m[0][1], m[0][3]),
    vec3(m[1][0], m[1][1], m[1][3]),
    vec3(m[2][0], m[2][1], m[2][3])
  ];
  let a33 = [
    vec3(m[0][0], m[0][1], m[0][2]),
    vec3(m[1][0], m[1][1], m[1][2]),
    vec3(m[2][0], m[2][1], m[2][2])
  ];



  a[0][0] = det3(a00) / d;
  a[0][1] = -det3(a10) / d;
  a[0][2] = det3(a20) / d;
  a[0][3] = -det3(a30) / d;
  a[1][0] = -det3(a01) / d;
  a[1][1] = det3(a11) / d;
  a[1][2] = -det3(a21) / d;
  a[1][3] = det3(a31) / d;
  a[2][0] = det3(a02) / d;
  a[2][1] = -det3(a12) / d;
  a[2][2] = det3(a22) / d;
  a[2][3] = -det3(a32) / d;
  a[3][0] = -det3(a03) / d;
  a[3][1] = det3(a13) / d;
  a[3][2] = -det3(a23) / d;
  a[3][3] = det3(a33) / d;

  return a;
}

/**
 * Calculates the inverse of the given matrix.
 * 
 * @param { (mat*) } m
 * @returns { (mat*) }
 */
export function inverse(m) {
  if (!isMatrix(m)) throw ("inverse: m not a matrix");
  if (m.length == 2) return inverse2(m);
  if (m.length == 3) return inverse3(m);
  if (m.length == 4) return inverse4(m);
}

//---------------------------------------------------------

// normal matrix

/**
 * Calculates the inverse transpose of the given mat4 matrix 
 * for use in transforming vec3 normals.
 * 
 * @param { (mat4) } m
 * @returns { (mat3) }
 */
export function normalMatrix(m, flag) {
  if (m.type != 'mat4') throw new Error("normalMatrix: input not a mat4");
  let a = inverse(transpose(m));
  if (arguments.length == 1 && flag == false) return a;

  let b = mat3();
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) b[i][j] = a[i][j];

  return b;
}


