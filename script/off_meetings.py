#!/usr/bin/env python3
import sys, os, datetime, subprocess, errno
from datetime import datetime
from subprocess import Popen, PIPE

#tdt = datetime.today().strftime("%d-%b-%y")
#ydt = datetime()
#print ("TODAY: ",tdt)
#print ("NOW: ",datetime.now()) #.strftime("%d-%b-%y"))

SITE_DIR = "/Users/hepting/Sites/dhhepting.github.io/"
MD_ROOT = "teaching/"
HTML_ROOT = "_site/teaching/"
DATA_ROOT = "_data/teaching/meetings/"

meet_template = { "CS-205" : """
{% include meetings/pagination.html %}
<div class="card">
  <h1 class="text-center card-header lightcthru">
    {{ page.mtg_date | date: '%a-%d-%b-%Y' }}
  </h1>
  <div class="card-body">
    {% include meetings/focus.html %}

    {% include meetings/admin-0-open.html %}
    {% include meetings/ul-1-close.html %}

    {% include meetings/quest-0-open.html %}
    {% include meetings/ul-1-close.html %}

    {% include meetings/outline-0-open.html %}
    {% include meetings/ul-1-close.html %}

    {% include meetings/concluding-0-open.html %}
    {% include meetings/ul-1-close.html %}

    {% include meetings/annotations.html %}

    {% include meetings/media.html mtg_media=joff_id mtg=page.mtg_nbr %}
  </div>
</div>"""
}

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
#print(utfout)
for line in utfout:
    if len(line) > 0:
        nbr_meetings += 1
m = 0
mtgdatafile = os.path.join(os.path.abspath(SITE_DIR+DATA_ROOT),reldir[0]+"-"+reldir[1]+".csv")
mtgdatafile = mtgdatafile.replace("+","_")
#print("MDF: ",mtgdatafile)
#for mt in meet_template:
#    print(meet_template[mt])
#sys.exit()
mdirstr = str(SITE_DIR + MD_ROOT + sys.argv[1] + "/meetings")
try:
    os.makedirs(mdirstr)
except OSError as e:
    if e.errno == errno.EEXIST and os.path.isdir(mdirstr):
        pass
    else:
        raise
midxstr = SITE_DIR + MD_ROOT + sys.argv[1] + "/meetings/index.md"
print (midxstr)
with open(midxstr,"w") as mtgidx:
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
                #print(datestr[1])
                mtg_dt = datetime.strptime(datestr[1],"%d-%b-%y")
                #print(mtg_dt)
                #print(tdt)
                #print(datetime.strptime(tdt,"%d-%b-%y"))
                #print(mtg_dt >= datetime.today())
                if mtg_dt > datetime.today():
                    #print (datetime.today.strftime("%d-%b-%y"))
                    #print(SITE_DIR + MD_ROOT + sys.argv[1] + "/" + mtg_fname + ".md")
                    mfilestr = SITE_DIR + MD_ROOT + sys.argv[1] + "/" + mtg_fname + ".md"
                    #print(mfilestr)
                    with open(mfilestr,"w") as mtgfile:
                        mtgfile.write("---\n")
                        mtgfile.write("title: Mtg " + str(m) + " &bull; " + reldir[0] +  " (" + reldir[1] + ")\n")
                        mtgfile.write("breadcrumb: " + str(m) + " (" + mtg_dt.strftime('%d-%b-%y') + ")\n")
                        mtgfile.write("mtg_nbr: " + str(m) + "\n")
                        mtgfile.write("total_meet: " + str(nbr_meetings) + "\n")
                        mtgfile.write("mtg_date: " + mtg_dt.strftime('%d-%b-%y') + "\n")
                        mtgfile.write("layout: bg-image\n")
                        mtgfile.write("focus:\n")
                        mtgfile.write("- ka:\n")
                        mtgfile.write("  ku:\n")
                        mtgfile.write("---\n")
                        mtgfile.write(meet_template["CS-205"])
            except:
                pass
