
cd /Users/hepting/Sites/hepting-website/dhhepting-rewrite/teaching/CS-315/202630/code
ls public                        # confirm the directory is public/samples, not public/Samples
grep -rlI 'public/Samples/' samples | xargs sed -i '' 's#public/Samples/#public/samples/#g'
grep -rn 'public/' samples --include='*.mjs'   # expect four lines, all lowercase
