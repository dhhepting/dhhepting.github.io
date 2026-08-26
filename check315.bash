git show HEAD:_data/teaching/all/courses.yml | grep -nE '^- id: CS-315$' \
  || echo "standalone CS-315 is NOT in the committed file"
git show HEAD:_data/teaching/all/courses.yml | grep -n 'CS-315'   # likely shows only CS-315+733
