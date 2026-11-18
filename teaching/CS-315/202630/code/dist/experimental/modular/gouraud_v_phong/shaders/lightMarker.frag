#version 300 es

precision mediump float;

uniform vec4 uColor;
out vec4 fColor;

void main()
{
    float r = length( gl_PointCoord - 0.5 );
    if( r > 0.5 ) discard;

    // dark rim, coloured centre
    fColor = ( r > 0.36 ) ? vec4(0.0, 0.0, 0.0, 1.0) : uColor;
}
