
mkdir -p _data/teaching/CS-315/202630 teaching/CS-315/202630
cp _data/teaching/CS-280/202610/offering.yml _data/teaching/CS-315/202630/offering.yml
# edit: mdays, times, location, zoom_id for 315; confirm semester 202630
printf -- '---\nlayout: offering\n---\n' > teaching/CS-315/202630/index.md   # stub; match your real offering layout
printf -- '---\nlayout: course\n---\n'   > teaching/CS-315/index.md          # course landing, if 315 has none yet
bundle exec rake structure:validate      # semesters + teaching data + offering index, all at once
git add -A && git commit -m "Add CS-315/202630 offering scaffold"
