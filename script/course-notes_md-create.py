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
MD_ROOT = "_notes/"
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
course = ''
nbr_meetings = 0
if (len(sys.argv) != 3):
	print (sys.argv[0],"must be invoked with <course> <nbr_meetings>")
	sys.exit()
else:
    course = sys.argv[1]
    nbr_meetings = int(sys.argv[2])

#reldir = (sys.argv[1]).split('/')
# if (len(reldir) != 2):
# 	print (sys.argv[0],"must be invoked with <course> <nbr_meetings>" )
# 	sys.exit()

# make all the directories on the markdown (visible) side
notesdirstr = str(SITE_DIR + MD_ROOT) #+ '/')
try:
    os.makedirs(notesdirstr)
except OSError as e:
    if e.errno == errno.EEXIST and os.path.isdir(notesdirstr):
        pass
    else:
        raise

for m in range(1,nbr_meetings+1):
    notefile = notesdirstr + course + '-M' + str(m).zfill(2) + '.md'
    mtitle = course.replace('-',' ') + ' Meeting ' + str(m)
    try:
        with open(notefile,'x') as mtgnote:
            mtgnote.write("---\n")
            mtgnote.write('title: ' + mtitle + '\n')
            mtgnote.write('breadcrumb: ' + mtitle + '\n')
            mtgnote.write("layout: notes-default\n")
            mtgnote.write("---\n")
            mtgnote.write("# {{ page.title }}\n")
    except Exception as e:
        pass
