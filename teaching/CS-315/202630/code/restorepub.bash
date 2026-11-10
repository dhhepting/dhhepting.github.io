
cd /Users/hepting/Sites/hepting-website/dhhepting-rewrite/teaching/CS-315/202630/code

# 1. See what that commit's parent had under public/
git ls-tree -r --name-only 9f41503c24^ -- CS315/public | head -40

# 2. Restore it, then move it to code/public/ with a lowercase "samples"
git restore --source=9f41503c24^ --staged --worktree -- CS315/public
mkdir -p public
git mv CS315/public/Samples public/samples

# 3. Verify
find public -type f | sort
ls CS315 2>/dev/null    # should be gone or empty
