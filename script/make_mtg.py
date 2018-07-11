#!/usr/bin/env python
import sys, os, datetime

TEACH_DIR = "/Users/hepting/Sites/dhhepting.github.io/teaching/"

# Make sure that script is executed properly: i.e. cs428+828/201830
if (len(sys.argv) != 3):
	print (sys.argv[0],"must be invoked with <course>/<semester> <nbr meetings>")
	sys.exit()

reldir = (sys.argv[1]).split('/')
if (len(reldir) != 2):
	print (sys.argv[0],"must be invoked with <course>/<semester>" )
	sys.exit()
nbr_meetings = int(sys.argv[2])

crs_meet_dir = os.path.join(os.path.abspath(TEACH_DIR),sys.argv[1])

for m in range(nbr_meetings):
	mfilestr = str(crs_meet_dir) + "/meetings/" + str(m+1).zfill(2) + ".md"
	print(mfilestr)
	with open(mfilestr,"w") as mtgfile:
		mtgfile.write("---\n")
		mtgfile.write("title: CS 428+828 (201830) Meetings\n")
		mtgfile.write("breadcrumb: XX\n")
		mtgfile.write("total_meet: 37\n")
		mtgfile.write("---\n")
		mtgfile.write("{% include meeting.html %}\n")
		mtgfile.write("{% include meeting-media.html mtg_media=off_med mtg=crs_mps %}\n")
