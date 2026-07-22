export default class PingPongFBO {
  constructor(gl, size, internalFormat = gl.RGBA, format = gl.RGBA, type = gl.UNSIGNED_BYTE) {
    this.gl = gl;
    this.size = size;
    this.texTarget = gl.TEXTURE_2D;
    this.attachment = gl.COLOR_ATTACHMENT0;
    this.level = 0;

    // Create two textures for ping-pong
    this.textures = [gl.createTexture(), gl.createTexture()];
    for (const tex of this.textures) {
      gl.bindTexture(this.texTarget, tex);
      gl.texImage2D(this.texTarget, this.level, internalFormat, size, size, 0, format, type, null);
      gl.texParameteri(this.texTarget, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(this.texTarget, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(this.texTarget, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(this.texTarget, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    // single framebuffer we will attach textures to
    this.framebuffer = gl.createFramebuffer();
    this.readIndex = 0;
    this.writeIndex = 1;
  }

  bindForWrite() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, this.attachment, this.texTarget, this.textures[this.writeIndex], this.level);
  }

  bindForRead(textureUnit = 0) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(this.texTarget, this.textures[this.readIndex]);
  }

  swap() {
    [this.readIndex, this.writeIndex] = [this.writeIndex, this.readIndex];
  }

  getReadTexture() {
    return this.textures[this.readIndex];
  }

  getWriteTexture() {
    return this.textures[this.writeIndex];
  }
}
