echo "grep:"
grep -n "filter" .github/workflows/*.yml     # expect 3 lines: filter: blob:none
echo "git status:"
git status --short .github/workflows
