ls _site/teaching/CS-180/            # which semester dirs were built?
ls teaching/CS-180/ teaching/CS-180/202710/ 2>&1
grep -rn "offering/main" . --include=*.html --include=*.md --include=*.rb -l | grep -v _site
grep -n "exclude\|teaching" _config.yml
