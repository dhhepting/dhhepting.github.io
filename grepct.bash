grep -n "def self.page_table" -B12 -A45 lib/change_log.rb
grep -n "data\['changes'\]\|data.changes\|site.data\[" _plugins/changes_generator.rb
grep -n "page_table" -B3 -A25 test/change_log_test.rb | head -80
