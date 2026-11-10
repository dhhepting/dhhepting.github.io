
cd /Users/hepting/Sites/hepting-website/dhhepting-rewrite/teaching/CS-315/202630/code
ls samples/IndexedSquare            # confirm there's no shaders/ dir already
git mv public/samples/IndexedSquare/shaders samples/IndexedSquare/shaders
rmdir public/samples/IndexedSquare 2>/dev/null
