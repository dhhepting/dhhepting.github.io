---
layout: bg-image
---
<html>

<script id="vertex-shader" type="x-shader/x-vertex">
#version 300 es

in vec4 aPosition;

void main()
{
  gl_Position = aPosition;
}
</script>

<script id="fragment-shader" type="x-shader/x-fragment">
#version 300 es

precision mediump float;

out vec4  fColor;

void main()
{
    fColor = vec4( 1.0, 0.1, 0.1, 0.5 );
}
</script>

<script type="text/javascript" src="common/initShaders.js"></script>
<script type="text/javascript" src="triangle.js"></script>

<div class="container">
<canvas id="gl-canvas" width="640" height="360"> </canvas>
</div>
</html>
