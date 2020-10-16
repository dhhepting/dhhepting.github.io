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
HTML_ROOT = "_site/teaching/"
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
{%
    include meetings/pagination.html
    tm=page.total_meet
    cm=page.mtg_nbr
%}
<div class="card">
    <div class="card card-header lightcthru">
      <h1>
        {{ page.mtg_date | date: '%a-%d-%b-%Y' }}
      </h1>
    </div>
    <div class="card card-body">
      {% include meetings/upcoming.html %}

      {% include meetings/review.html mtg=page.mtg_nbr %}

      {% include meetings/plan.html mtg=page.mtg_nbr %}
      <hr /><hr />
      {% include meetings/annotations.html %}

      {% include meetings/media.html mtg=page.mtg_nbr %}

      {% include meetings/transcript-card.html mtg=page.mtg_nbr %}
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

mdirstr = str(SITE_DIR + MD_ROOT + sys.argv[1] + "/meetings/")
try:
    os.makedirs(mdirstr)
except OSError as e:
    if e.errno == errno.EEXIST and os.path.isdir(mdirstr):
        pass
    else:
        raise

midxstr = SITE_DIR + MD_ROOT + sys.argv[1] + "/meetings/index.md"
with open(midxstr,"w") as mtgidx:
    mtgidx.write("---\n")
    mtgidx.write("title: " + reldir[0] + " (" + reldir[1] + ") Meetings\n")
    mtgidx.write("breadcrumb: Meetings\n")
    mtgidx.write("layout: bg-image\n")
    mtgidx.write("---\n")
    mtgidx.write("{% include offering/mtgs-table.html %}\n")

jcrs_id = reldir[0].replace("+","_")
planfile = os.path.abspath(SITE_DIR + DATA_ROOT + jcrs_id + '/' + reldir[1] + "/plan.yml")
mtgsfile = os.path.abspath(SITE_DIR + DATA_ROOT + jcrs_id + '/' + reldir[1] + "/meetings.csv")
# meeting,file
# 01,01_07-Jan-20.html
with open(planfile, 'r') as stream, open(mtgsfile,'w') as mf:
    try:
        yamldict = yaml.safe_load(stream)
    except yaml.YAMLError as exc:
        print(exc)
nbr_meetings = 0
with open(mtgsfile,'w') as mf:
    for uu in yamldict:
        if ('id' in yamldict[uu]):
            mf.write('meeting,file\n')
            #print (uu,yamldict[uu]['meetings'])
            nbr_meetings = yamldict[uu]['meetings']
        if ('date' in yamldict[uu]):
            #print (uu,yamldict[uu]['date'])
            m = uu
            mtg_date = yamldict[uu]['date']
            mtg_fname = str(m).zfill(2) + '_' + mtg_date
            mf.write(str(m).zfill(2) + ',' + mtg_fname + '.html\n')
            mfilestr = SITE_DIR + MD_ROOT + sys.argv[1] + "/meetings/" + mtg_fname + ".md"
            #print(mfilestr)
            with open(mfilestr,"w") as mtgfile:
                mtgfile.write("---\n")
                mtgfile.write("title: Mtg " + str(m) + " &bull; " + reldir[0] +  " (" + reldir[1] + ")\n")
                mtgfile.write("breadcrumb: " + str(m) + " (" + mtg_date + ")\n")
                mtgfile.write("mtg_nbr: " + str(m) + "\n")
                mtgfile.write("total_meet: " + str(nbr_meetings) + "\n")
                mtgfile.write("mtg_date: " + mtg_date + "\n")
                mtgfile.write("layout: bg-image\n")
                #mtgfile.write("focus:\n")
                #mtgfile.write("- ka:\n")
                #mtgfile.write("  ku:\n")
                mtgfile.write("---\n")
                mtgfile.write(meet_template["CS"])
