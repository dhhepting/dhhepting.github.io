// Small WebGL2 helpers. Nothing here touches `document`.

/** Fetch shader sources by file name from ./shaders/. Returns { name: source }. */
export async function loadShaderSources(names) {
  const entries = await Promise.all(
    names.map(async (name) => {
      const url = new URL(`./shaders/${name}`, import.meta.url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load shader ${name}: ${res.status}`);
      return [name, await res.text()];
    }),
  );
  return Object.fromEntries(entries);
}

/** Replace `#pragma include <key>` lines with the matching snippet. */
export function withIncludes(src, includes) {
  return src.replace(/^\s*#pragma include (\w+)\s*$/gm, (_, key) => {
    if (!(key in includes)) throw new Error(`Unknown shader include: ${key}`);
    return includes[key];
  });
}

function compile(gl, type, src, label) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`Shader compile error (${label}):\n${log}`);
  }
  return sh;
}

/** Compile + link a program from source strings (same spirit as initShadersJS). */
export function createProgram(gl, vsSrc, fsSrc, label = 'program') {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc, `${label}.vert`);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc, `${label}.frag`);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`Program link error (${label}):\n${log}`);
  }
  // Cache uniform locations by name.
  const uniforms = {};
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(prog, i);
    uniforms[info.name] = gl.getUniformLocation(prog, info.name);
  }
  return { program: prog, uniforms };
}

export function createTexture(gl, size, { internalFormat, format, type, filter, data = null }) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, size, size, 0, format, type, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  return tex;
}

export function createFramebuffer(gl, tex) {
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error(`Framebuffer incomplete: 0x${status.toString(16)}`);
  }
  return fbo;
}
