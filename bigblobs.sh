# total size of the repo's git history (not working tree)
du -sh .git

# the biggest objects in your history
git rev-list --objects --all \
  | git cat-file --batch-check='%(objecttype) %(objectsize) %(rest)' \
  | awk '/^blob/ {print $2, $3}' | sort -rn | head -20
