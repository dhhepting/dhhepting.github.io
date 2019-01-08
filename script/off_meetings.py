#!/usr/bin/env python
import sys, os, datetime, subprocess
from datetime import datetime
from subprocess import Popen, PIPE


SITE_DIR = "/Users/hepting/Sites/dhhepting.github.io/"
MD_ROOT = "teaching/"
HTML_ROOT = "_site/teaching/"
DATA_ROOT = "_data/teaching/meetings/"

# Make sure that script is executed properly: i.e. CS-428+828/201830
if (len(sys.argv) != 2):
	print (sys.argv[0],"must be invoked with <course>/<semester>")
	sys.exit()

reldir = (sys.argv[1]).split('/')
if (len(reldir) != 2):
	print (sys.argv[0],"must be invoked with <course>/<semester>" )
	sys.exit()

off_index_html = os.path.join(os.path.abspath(SITE_DIR+HTML_ROOT),sys.argv[1],"index.html")
grep_html = Popen(("grep", "html", off_index_html), stdout=PIPE)
grep_href = Popen(("grep", "href"), stdin=grep_html.stdout, stdout=PIPE)
outs, errs = grep_href.communicate()
utfout = (outs.decode("utf-8")).split('\n')

nbr_meetings = 0
for line in utfout:
    if len(line) > 0:
        nbr_meetings += 1
m = 0
mtgdatafile = os.path.join(os.path.abspath(SITE_DIR+DATA_ROOT),reldir[0]+"-"+reldir[1]+".csv")
print(mtgdatafile)
with open(mtgdatafile,"w") as mtgdata:
    mtgdata.write("meeting,file\n")
    for line in utfout:
        if len(line) > 0:
            m += 1
            words = line.split('\"')
            mtg_fname = (words[1].split('.'))[0]
            mtgdata.write(str(m).zfill(2) + "," + mtg_fname.split('/')[1] + ".html\n")
            datestr = mtg_fname.split('-',1)
            mtg_dt = datetime.strptime(datestr[1],"%d-%b-%y")
            mfilestr = SITE_DIR + MD_ROOT + sys.argv[1] + "/" + mtg_fname + ".md"
            with open(mfilestr,"w") as mtgfile:
                mtgfile.write("---\n")
                mtgfile.write("title: " + reldir[0] + " (" + reldir[1] + ") Mtg " + str(m) + "\n")
                mtgfile.write("breadcrumb: " + str(m) + " (" + mtg_dt.strftime('%d-%b-%y') + ")\n")
                mtgfile.write("mtg_nbr: " + str(m) + "\n")
                mtgfile.write("total_meet: " + str(nbr_meetings) + "\n")
                mtgfile.write("mtg_date: " + mtg_dt.strftime('%d-%b-%y') + "\n")
                mtgfile.write("layout: bg-image\n")
                mtgfile.write("---\n")
                mtgfile.write("{% include mtg-pagination.html %}\n")
                mtgfile.write("<h1 class=\"text-center\">{{ page.mtg_date }}</h1>\n<hr />\n")
                mtgfile.write("{% include meeting-media.html mtg_media=off_med mtg=page.mtg_nbr %}\n")
