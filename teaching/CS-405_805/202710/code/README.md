# CS 405/805 – Code (term 202710)

One tree for in-class examples across renderers.

```
code/
├── setup.sh            # clone + build pbrt-v4 (and scenes) into third_party/
├── serve.sh            # local web server for the WebGL2 examples
├── pbrt/
│   ├── render.sh       # render any .pbrt file -> output/
│   └── examples/NN-name/scene.pbrt
├── webgl2/
│   ├── index.html      # lists examples
│   ├── lib/gl-utils.js # shader/program helpers shared by all examples
│   └── examples/NN-name/index.html
├── others/             # anything else (three.js, Python, GLSL, ...)
├── shared/assets/      # meshes, textures, HDRIs used by more than one renderer
├── third_party/        # pbrt-v4 clone (git-ignored)
└── output/             # rendered images (git-ignored)
```

## pbrt (pbrt-v4)

```
./setup.sh                      # once; needs git, cmake, C++17 compiler
./pbrt/render.sh pbrt/examples/01-sphere/scene.pbrt
```

## WebGL2

```
./serve.sh                      # http://localhost:8000/webgl2/
```

Serve over HTTP (not file://) so shaders, meshes and textures in `shared/assets` load.

## Conventions

- Examples are numbered `NN-name/` and self-contained; common code goes in `webgl2/lib` or `shared/`.
- When the same idea exists in two renderers, give the folders the same name (e.g. `pbrt/examples/01-sphere`, `webgl2/examples/01-sphere`) so they can be compared.
