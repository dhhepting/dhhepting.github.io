
grep -n 'script' m-textbook/02/triangle_v2.html.bak    # want: an initShaders.js tag
sed -E -f modernize-textbook.sed m-textbook/02/triangle_v2.html.bak \
  | awk '!(/common\/globals\.mjs/ && seen++)' > m-textbook/02/triangle_v2.html
