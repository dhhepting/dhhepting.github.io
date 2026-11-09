
for f in m-textbook/09/three*.html; do
  sed -E 's#src="\.\./\.\./three\.js-master/build/three\.js"#src="../../common/three-r124.min.js"#' \
    "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done

