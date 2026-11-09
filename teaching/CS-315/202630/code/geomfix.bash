
for f in m-textbook/09/geometryTest[12].js m-textbook/10/geometryTest[12].js; do
  grep -q 'window.gl' "$f" || perl -pi -e \
    's#^(\s*)(gl = canvas\.getContext\(.*\);)#$1$2\n$1window.gl = gl;  // geometry.js is a classic script and reads the global gl#' "$f"
done
grep -c 'window.gl' m-textbook/09/geometryTest[12].js m-textbook/10/geometryTest[12].js
