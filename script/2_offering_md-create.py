#!/usr/bin/env python3
import sys, os, errno #, datetime, subprocess
from datetime import datetime, timedelta
#from subprocess import Popen, PIPE
import csv
import yaml

#tdt = datetime.today().strftime("%d-%b-%y")
#ydt = datetime()
#print ("TODAY: ",tdt)
#print ("NOW: ",datetime.now()) #.strftime("%d-%b-%y"))

SITE_DIR = "/Users/hepting/Sites/dhhepting.github.io/"
MD_ROOT = "teaching/"
#HTML_ROOT = "_site/teaching/"
DATA_ROOT = "_data/teaching/"

meet_template = { "old" : """
{% include meetings/pagination.html tm=page.total_meet cm=page.mtg_nbr %}
<div class="card">
    <div class="card card-header lightcthru">
        <h1>
            {{ page.mtg_date | date: '%a-%d-%b-%Y' }}
        </h1>
    </div>
    <div class="card card-body">
        {% include meetings/plan.html mtg=page.mtg_nbr %}

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
</div>""",
"CS" : """
{%- include meetings/main.html
    tm=page.total_meet
    mn=page.mtg_nbr
    md=page.mtg_date
-%}
"""
}

# Make sure that script is executed properly: i.e. CS-428+828/201830
if (len(sys.argv) != 2):
	print (sys.argv[0],"must be invoked with <course>/<semester>")
	sys.exit()

reldir = (sys.argv[1]).split('/')
if (len(reldir) != 2):
	print (sys.argv[0],"must be invoked with <course>/<semester>" )
	sys.exit()

# make all the directories on the markdown (visible) side
offdirstr = str(SITE_DIR + MD_ROOT + sys.argv[1] + '/')
try:
    os.makedirs(offdirstr)
except OSError as e:
    if e.errno == errno.EEXIST and os.path.isdir(offdirstr):
        pass
    else:
        raise
offidxstr = offdirstr + 'index.md'
with open(offidxstr,"w") as offidx:
    offidx.write("---\n")
    #print(reldir[1][-2:])
    semsea = "None"
    if (reldir[1][-2:] == "10"):
        semsea = "Winter"
    elif (reldir[1][-2:] == "20"):
        semsea = "Spring/Summer"
    elif (reldir[1][-2:] == "30"):
        semsea = "Fall"
    offidx.write("title: " + reldir[0].replace('-',' ') + " in " + semsea + " " + reldir[1][0:4] + "\n")
    offidx.write("breadcrumb: " + reldir[1] + "\n")
    offidx.write("sem: " + reldir[1] + "\n")
    offidx.write("layout: bg-image\n")
    offidx.write("---\n")
    offidx.write("{% include offering/main.html %}\n")

mdirstr = offdirstr + 'meetings/'
try:
    os.makedirs(offdirstr)
except OSError as e:
    if e.errno == errno.EEXIST and os.path.isdir(offdirstr):
        pass
    else:
        raise

midxstr = mdirstr + 'index.md'
with open(midxstr,"w") as mtgidx:
    mtgidx.write("---\n")
    mtgidx.write("title: " + reldir[0] + " (" + reldir[1] + ") Meetings\n")
    mtgidx.write("breadcrumb: Meetings\n")
    mtgidx.write("layout: bg-image\n")
    mtgidx.write("---\n")
    mtgidx.write("{% include offering/mtgs-grid.html %}\n")

with open(SITE_DIR + DATA_ROOT + reldir[0].replace('+', '_') + '/' + reldir[1] + '/meetings.csv', newline='') as mmmfile:
    mmmreader = csv.DictReader(mmmfile)
    for row in mmmreader:
        #print(row['file'])
        mfilestr = mdirstr + row['file'].replace(".html",".md")
        m = row['meeting']
        tm = row['total_mtgs']
        #print((row['file']).split('_','.'))
        mtg_date = row['date']
        nbr_meetings = tm
        with open(mfilestr,"w") as mtgfile:
            mtgfile.write("---\n")
            mtgfile.write("title: Mtg " + str(m) + " &bull; " + reldir[0] +  " (" + reldir[1] + ")\n")
            mtgfile.write("breadcrumb: " + str(m) + " (" + mtg_date + ")\n")
            mtgfile.write("mtg_nbr: " + str(m) + "\n")
            mtgfile.write("total_meet: " + str(nbr_meetings) + "\n")
            mtgfile.write("mtg_date: " + mtg_date + "\n")
            mtgfile.write("layout: bg-image\n")
            mtgfile.write("---\n")
            mtgfile.write(meet_template["CS"])
