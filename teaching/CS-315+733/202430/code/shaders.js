export const vertDiffuse = `#version 300 es

in vec2 aPosition1;
in vec2 aTexCoord;

out vec2 vTexCoord;

void main() {
  gl_Position = vec4(aPosition1, 0.0, 1.0);
  vTexCoord = aTexCoord;
}
`;

export const vertPlotter = `#version 300 es

in vec2 aPosition2;
uniform float uPointSize;

void main() {
  gl_PointSize = uPointSize;
  gl_Position = vec4(aPosition2, 0.0, 1.0);
}
`;

export const fragDiffuse = `#version 300 es
precision mediump float;

uniform sampler2D uTextureMap;
uniform float uDistance;
uniform float uScale;

in vec2 vTexCoord;
out vec4 fColor;

void main() {
  float x = vTexCoord.x;
  float y = vTexCoord.y;
  fColor = (texture(uTextureMap, vec2(x + uDistance, y))
            + texture(uTextureMap, vec2(x, y + uDistance))
            + texture(uTextureMap, vec2(x - uDistance, y))
            + texture(uTextureMap, vec2(x, y - uDistance))) / uScale;
}
`;

export const fragPlotter = `#version 300 es
precision mediump float;

out vec4 fColor;
uniform vec4 uColor;

void main() {
  fColor = uColor;
}
`;
