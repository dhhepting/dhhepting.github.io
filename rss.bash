grep -n "label\|start\|end\|rows\|slot\|cells\|render\|rowspan\|days" _plugins/../lib/weekly_grid.rb 2>/dev/null | grep -v _site
# (i.e. lib/weekly_grid.rb)
sed -n '1,60p' lib/weekly_grid.rb
