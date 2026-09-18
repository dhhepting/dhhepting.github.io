
# 1. What's the public method actually called? (line 179 assumes `validate`)
grep -n "def " lib/semester_validator.rb | sed -n '1,40p'

# 2. Is line 179 itself *inside* module SemesterData, or outside it?
sed -n '160,185p' lib/semester_validator.rb
