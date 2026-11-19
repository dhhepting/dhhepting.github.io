
mdfind -name triangle.vert.glsl
git log --all --oneline --name-status -- '*triangle.vert.glsl' | head
git status --ignored --short | head -20
