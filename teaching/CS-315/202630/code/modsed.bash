for f in m-textbook/*/*.html; do
  cp "$f" "$f.bak"
  sed -E -f modernize-textbook.sed "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done
