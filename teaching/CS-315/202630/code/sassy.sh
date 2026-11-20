
ls -l assets/css/ _sass/ 2>/dev/null
grep -rn "dhhepting" --include=*.yml --include=Rakefile --include=*.rake --include=*.html --include=*.scss . 2>/dev/null | grep -v _site | head
head -5 _site/assets/css/dhhepting.css
