head -20 _includes/changes-table.html
grep -rn "changes-table" . --include=*.md --include=*.html --include=*.rb --include=*.yml --exclude-dir=vendor --exclude-dir=_site
grep -n "PAGE_CONTENT" -A8 _plugins/changes_generator.rb | head -40
cat changes.md
diff _includes/changes-table.html _plugins/changes_generator.rb && echo IDENTICAL
