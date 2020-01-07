#!/usr/bin/env python3
import sys, os, datetime, subprocess, errno
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

# calendar card is created first, so get meeting file names from there
off_index_html = os.path.join(os.path.abspath(SITE_DIR+HTML_ROOT),sys.argv[1],"index.html")
grep_html = Popen(("grep", "html", off_index_html), stdout=PIPE)
grep_href = Popen(("grep", "href=\"meetings"), stdin=grep_html.stdout, stdout=PIPE)
outs, errs = grep_href.communicate()
utfout = (outs.decode("utf-8")).split('\n')

nbr_meetings = 0
for line in utfout:
    if len(line) > 0:
        nbr_meetings += 1
m = 0
mtgdatafile = os.path.join(os.path.abspath(SITE_DIR+DATA_ROOT),reldir[0]+"-"+reldir[1]+".csv")
mtgdatafile = mtgdatafile.replace("+","_")
print(mtgdatafile)
mdirstr = str(SITE_DIR + MD_ROOT + sys.argv[1] + "/meetings")
try:
    os.makedirs(mdirstr)
except OSError as e:
    if e.errno == errno.EEXIST and os.path.isdir(mdirstr):
        pass
    else:
        raise
with open(SITE_DIR + MD_ROOT + sys.argv[1] + "/meetings/index.md","w") as mtgidx:
    mtgidx.write("---\n")
    mtgidx.write("title: " + reldir[0] + " (" + reldir[1] + ") Meetings\n")
    mtgidx.write("breadcrumb: Meetings\n")
    mtgidx.write("layout: bg-image\n")
    mtgidx.write("---\n")
    mtgidx.write("#" + reldir[0] + " (" + reldir[1] + ") Meetings\n")
    mtgidx.write("{% include meetings/index-table.html %}\n")
with open(mtgdatafile,"w") as mtgdata:
    mtgdata.write("meeting,file\n")
    for line in utfout:
        if len(line) > 0:
            m += 1
            words = line.split('\"')
            #sys.exit()
            mtg_fname = (words[1].split('.'))[0]
            mtgdata.write(str(m).zfill(2) + "," + mtg_fname.split('/')[1] + ".html\n")
            datestr = mtg_fname.split('_',1)
            #print("Meeting file name: ",mtg_fname)
            try:
                #print("TRYING")
                mtg_dt = datetime.strptime(datestr[1],"%d-%b-%y")
                print (mtg_dt)
                mfilestr = SITE_DIR + MD_ROOT + sys.argv[1] + "/" + mtg_fname + ".md"
                #print(mfilestr)
                with open(mfilestr,"w") as mtgfile:
                    mtgfile.write("---\n")
                    mtgfile.write("title: Mtg " + str(m) + reldir[0] +  " (" + reldir[1] + ")\n")
                    mtgfile.write("breadcrumb: " + str(m) + " (" + mtg_dt.strftime('%d-%b-%y') + ")\n")
                    mtgfile.write("mtg_nbr: " + str(m) + "\n")
                    mtgfile.write("total_meet: " + str(nbr_meetings) + "\n")
                    mtgfile.write("mtg_date: " + mtg_dt.strftime('%d-%b-%y') + "\n")
                    mtgfile.write("layout: bg-image\n")
                    mtgfile.write("focus:\n")
                    mtgfile.write("- ka:\n")
                    mtgfile.write("  ku:\n")
                    mtgfile.write("---\n")
                    #mtgfile.writelines(str(i) + "\n" for i in range(1, 6))
                    mtgfile.write("{% include meetings/pagination.html %}\n")
                    mtgfile.write("<h1 class=\"text-center\">{{ page.mtg_date }}</h1>\n<hr />\n")
                    mtgfile.write("### Administration\n")
                    mtgfile.write("\n")
                    mtgfile.write("### Questions?\n")
                    mtgfile.write("\n")
                    mtgfile.write("### Outline for Today\n")
                    mtgfile.write("\n")
                    mtgfile.write("{% include meetings/topics.html %}\n")
                    mtgfile.write("\n")
                    mtgfile.write("{% include meetings/outcomes.html %}\n")
                    mtgfile.write("\n")
                    mtgfile.write("### To Do\n")
                    mtgfile.write("\n")
                    mtgfile.write("<hr />\n")
                    mtgfile.write("{% include meetings/media.html mtg_media=off_med mtg=page.mtg_nbr %}\n")


                    #mtgfile.write("{% include meeting-media.html mtg_media=off_med mtg=page.mtg_nbr %}\n")
            except:
                pass
