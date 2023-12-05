/* eslint-disable require-jsdoc */

'use strict';

function cube(s) {
  const data = {};

  let size;
  if (!s) {
    size = 0.5;
  } else {
    size = s / 2.0;
  }

  const cubeVertices = [
    [-size, -size, size, 1.0],
    [-size, size, size, 1.0],
    [size, size, size, 1.0],
    [size, -size, size, 1.0],
    [-size, -size, -size, 1.0],
    [-size, size, -size, 1.0],
    [size, size, -size, 1.0],
    [size, -size, -size, 1.0],
  ];

  const cubeFaceNormals = [
    [0, 0, 1],
    [1, 0, 0],
    [0, -1, 0],
    [0, 1, 0],
    [0, 0, -1],
    [-1, 0, 0],
  ];

  const cubeIndices = [
    [1, 0, 3, 2],
    [2, 3, 7, 6],
    [3, 0, 4, 7],
    [6, 5, 1, 2],
    [4, 5, 6, 7],
    [5, 4, 0, 1],
  ];

  const cubeVertexColors = [
    [0.0, 0.0, 0.0, 1.0], // black
    [1.0, 0.0, 0.0, 1.0], // red
    [1.0, 1.0, 0.0, 1.0], // yellow
    [0.0, 1.0, 0.0, 1.0], // green
    [0.0, 0.0, 1.0, 1.0], // blue
    [1.0, 0.0, 1.0, 1.0], // magenta
    [0.0, 1.0, 1.0, 1.0], // cyan
    [1.0, 1.0, 1.0, 1.0], // white
  ];

  const cubeElements = [
    1, 0, 3,
    3, 2, 1,

    2, 3, 7,
    7, 6, 2,

    3, 0, 4,
    4, 7, 3,

    6, 5, 1,
    1, 2, 6,

    4, 5, 6,
    6, 7, 4,

    5, 4, 0,
    0, 1, 5,
  ];

  const cubeTexElements = [
    1, 0, 3,
    3, 2, 1,

    1, 0, 3,
    3, 2, 1,

    0, 1, 2,
    2, 3, 0,

    2, 1, 0,
    0, 3, 2,

    3, 2, 1,
    1, 0, 3,

    2, 3, 0,
    0, 1, 2,
  ];

  const cubeNormalElements = [
    0, 0, 0,
    0, 0, 0,
    1, 1, 1,
    1, 1, 1,
    2, 2, 2,
    2, 2, 2,
    3, 3, 3,
    3, 3, 3,
    4, 4, 4,
    4, 4, 4,
    5, 5, 5,
    5, 5, 5,

  ];

  const faceTexCoord = [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 0],
  ];

  const cubeTriangleVertices = [];
  const cubeTriangleVertexColors = [];
  const cubeTriangleFaceColors = [];
  const cubeTextureCoordinates = [];
  const cubeTriangleNormals = [];

  for (let i = 0; i < cubeElements.length; i++) {
    cubeTriangleVertices.push(cubeVertices[cubeElements[i]]);
    cubeTriangleVertexColors.push(cubeVertexColors[cubeElements[i]]);
    cubeTextureCoordinates.push(faceTexCoord[cubeTexElements[i]]);
    cubeTriangleNormals.push(cubeFaceNormals[cubeNormalElements[i]]);
  }

  for (let i = 0; i < cubeElements.length; i++) {
    cubeTriangleFaceColors[i] = cubeVertexColors[1 + Math.floor((i / 6))];
  }

  function scale(sx, sy, sz) {
    for (let i = 0; i < cubeVertices.length; i++) {
      cubeVertices[i][0] *= sx;
      cubeVertices[i][1] *= sy;
      cubeVertices[i][2] *= sz;
    };
  }

  function radians(degrees) {
    return degrees * Math.PI / 180.0;
  }

  function rotate(angle, axis) {
    const d = Math.sqrt(
        axis[0] * axis[0] +
        axis[1] * axis[1] +
        axis[2] * axis[2],
    );
    const x = axis[0] / d;
    const y = axis[1] / d;
    const z = axis[2] / d;
    const c = Math.cos(radians(angle));
    const omc = 1.0 - c;
    const s = Math.sin(radians(angle));
    const mat = [
      [x * x * omc + c,
        x * y * omc - z * s,
        x * z * omc + y * s],
      [x * y * omc + z * s,
        y * y * omc + c,
        y * z * omc - x * s],
      [x * z * omc - y * s,
        y * z * omc + x * s,
        z * z * omc + c],
    ];
    for (let i = 0; i < cubeVertices.length; i++) {
      const t = [0, 0, 0];
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          t[j] += mat[j][k] * cubeVertices[i][k];
        }
      }
      for (let j = 0; j < 3; j++) {
        cubeVertices[i][j] = t[j];
      }
    }
  }

  function translate(x, y, z) {
    for (let i = 0; i < cubeVertices.length; i++) {
      cubeVertices[i][0] += x;
      cubeVertices[i][1] += y;
      cubeVertices[i][2] += z;
    };
  }

  data.Indices = cubeIndices;
  data.VertexColors = cubeVertexColors;
  data.Vertices = cubeVertices;
  data.Elements = cubeElements;
  data.TextureCoordinates = cubeTextureCoordinates;
  data.TriangleVertices = cubeTriangleVertices;
  data.TriangleVertexColors = cubeTriangleVertexColors;
  data.TriangleFaceColors = cubeTriangleFaceColors;
  data.TriangleNormals = cubeTriangleNormals;
  data.translate = translate;
  data.scale = scale;
  data.rotate = rotate;

  return data;
}
