
# every directory that has tracked files but no index.html or index.md
for d in $(git ls-files | sed 's:/[^/]*$::' | sort -u); do
  case "$d" in teaching*|assets*) 
    if [ -z "$(git ls-files "$d/index.html" "$d/index.md")" ]; then
      echo "no index: $d"
    fi ;;
  esac
done
