
cd /Users/hepting/Sites/hepting-website/dhhepting-rewrite/teaching/CS-315/202630/code
find . -name 'cube.vert.glsl' -not -path './node_modules/*'
git ls-files | grep -i 'cube.vert'
git status --short | grep -i -E 'public|glsl' | head
git log --oneline --diff-filter=D --name-only -- '*cube.vert.glsl' | head
