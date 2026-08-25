git rev-list --objects --all \
  | git cat-file --batch-check='%(objecttype) %(objectsize) %(rest)' \
  | awk '/^blob/ {print $2, $3}' | sort -rn | head -15 \
  | awk '{ printf "%.1f MB\t%s\n", $1/1048576, $2 }'
