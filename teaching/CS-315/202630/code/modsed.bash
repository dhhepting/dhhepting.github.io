#for f in m-textbook/*/*.html; do
#  cp "$f" "$f.bak"
#  sed -E -f modernize-textbook.sed "$f" > "$f.tmp" && mv "$f.tmp" "$f"
#done

##!/usr/bin/env bash
#set -euo pipefail
#for f in m-textbook/*/*.html; do
#  b=$(basename "$f" .html)
#  [ -e "$f.bak" ] || cp "$f" "$f.bak"          # first backup = pristine original
#  sed -E -f modernize-textbook.sed \
#      -e "s#<script( type=\"text/javascript\")? src=\"${b}\.js\"></script>#<script type=\"module\" src=\"${b}.js\"></script>#" \
#      "$f.bak" > "$f.tmp" && mv "$f.tmp" "$f"   # always regenerate from the .bak
#done

#!/usr/bin/env bash
set -euo pipefail
for f in m-textbook/*/*.html; do
  b=$(basename "$f" .html)
  js=$b
  case "$b" in                       # pages whose main script isn't <basename>.js
    hawaiiIsobel) js=hawaiisobel ;;
    teapot6)      js=teapot5 ;;
    teapot7)      js=teapot4 ;;
  esac
  [ -e "$f.bak" ] || cp "$f" "$f.bak"
  sed -E -f modernize-textbook.sed \
      -e "s#<script( type=\"text/javascript\")? src=\"${js}\.js\"></script>#<script type=\"module\" src=\"${js}.js\"></script>#" \
      "$f.bak" > "$f.tmp" && mv "$f.tmp" "$f"
done
