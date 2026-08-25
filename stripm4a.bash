
# strip the .m4a files remaining in history (answer Y to the continuation prompt)
git filter-repo --path-glob '*.m4a' --invert-paths --force

# reclaim the freed space
git reflog expire --expire=now --all
git gc --prune=now --aggressive
du -sh .git
