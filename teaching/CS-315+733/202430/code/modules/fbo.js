/**
 * Framebuffer Object (FBO) module - manages framebuffer and texture resources
 */

/**
 * Create and configure a framebuffer for offscreen rendering to texture
 * @param {WebGL2RenderingContext} gl
 * @param {number} width - texture width
 * @param {number} height - texture height
 * @param {WebGLTexture} texture - texture to attach to framebuffer
 * @returns {WebGLFramebuffer}
 */
export function createFramebuffer(gl, width, height, texture) {
  const framebuffer = gl.createFramebuffer();
  framebuffer.width = width;
  framebuffer.height = height;

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0
  );

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    console.error(
      `Framebuffer incomplete: ${status}`,
      getFramebufferStatusMessage(status)
    );
    gl.deleteFramebuffer(framebuffer);
    return null;
  }

  // Unbind framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return framebuffer;
}

/**
 * Create a texture for use with framebuffer (offscreen rendering)
 * @param {WebGL2RenderingContext} gl
 * @param {number} width - texture width
 * @param {number} height - texture height
 * @returns {WebGLTexture}
 */
export function createOffscreenTexture(gl, width, height) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Allocate texture memory
  gl.texImage2D(
    gl.TEXTURE_2D,