{ cat m-textbook/09/vertices.js
  printf '\n// expose as globals for the unmodified textbook scripts\nglobalThis.vertices = vertices;\nglobalThis.numTeapotVertices = numTeapotVertices;\n'
} > common/vertices.mjs
node --check common/vertices.mjs
