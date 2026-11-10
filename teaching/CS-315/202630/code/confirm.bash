
cd /Users/hepting/Sites/hepting-website/dhhepting-rewrite/teaching/CS-315/202630/code
git ls-files | grep -i 'cube.vert'
ls public 2>/dev/null
grep -rn "public/" samples --include='*.mjs' --include='*.html' | head -20
sed -n '20,40p' samples/ColourCube/main.mjs
