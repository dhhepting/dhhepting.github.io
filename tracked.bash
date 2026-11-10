
git ls-files Users CD315 | wc -l        # see how many tracked files
git rm -r --cached Users CD315          # untrack (keeps local copies)
# or: git rm -r Users CD315             # delete outright
