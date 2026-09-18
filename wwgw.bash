
# what weekly_grid writes (key + row/cell shape) and what wklysched meetings look like
grep -n "site.data\|node\[" _plugins/weekly_grid_generator.rb | grep -v _site
grep -n "site.data\|node\[\|'url'\|\"url\"\|mtgs_by_day\|weekof" _plugins/weekly_schedule_generator.rb | grep -v _site
