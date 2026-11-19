
find . -path ./node_modules -prune -o -name 'cube.*' -print
find dist -name 'cube.*'
find dist/experimental/modular/ColourCube -maxdepth 2 | head -20
grep -n "shaders/" experimental/modular/ColourCube/*.mjs

