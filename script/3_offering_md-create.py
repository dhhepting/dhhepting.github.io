#!/usr/bin/env python3
import sys, os, errno
from datetime import datetime, timedelta
import csv
import yaml

SITE_DIR = "/Users/hepting/Sites/dhhepting.github.io/"
MD_ROOT = SITE_DIR + "teaching/"
DATA_ROOT = SITE_DIR + "_data/teaching/"

md_template = {
"CS" : """
{%- include meetings/main.html
    tm=page.total_meet
    mn=page.mtg_nbr
    md=page.mtg_date
    ww=page.wiki_id
-%}
""",
"OFF" : """
{%- include offering/main.html
  title=page.title
  mtgs=1
  sched=1
  wkly=1
  code=1
  links=1
  asgns=1
  topics=0
  exams=1
  feedback=0
-%}
""",
"R" : """
{%- include meetings/responses.html -%}
""",
"S" : """
{%- include meetings/summary.html -%}
"""
}

# TODO:
print ('TODO:')
print ('add new directories to ignore in _config.yml')
print ('copy data files from previous offering, like tlo, etc.')
# Make sure that script is executed properly: i.e. CS-428+828/201830
if (len(sys.argv) != 2):
	print (sys.argv[0],"must be invoked with <course>/<semester>")
	sys.exit()

reldir = (sys.argv[1]).split('/')
if (len(reldir) != 2):
	print (sys.argv[0],"must be invoked with <course>/<semester>" )
	sys.exit()

# make the directory for the offering in the markdown (visible) portion of the
# file structure
offdirstr = str(MD_ROOT + sys.argv[1] + '/')
try:
    os.makedirs(offdirstr)
except OSError as e:
    if e.errno == errno.EEXIST and os.path.isdir(offdirstr):
        pass
    else:
        raise
# if successful, make an index.md (to become index.html)
offidxstr = offdirstr + 'index.md'
with open(offidxstr,"w") as offidx:
    offidx.write("---\n")
    # assign name of season based on argument
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
    #offidx.write("{% include offering/main.html %}\n")
    offidx.write(md_template["OFF"])

# create a directory for Meetings
""" mdirstr = offdirstr + 'meetings/'
try:
    os.makedirs(mdirstr)
except OSError as e:
    if e.errno == errno.EEXIST and os.path.isdir(mdirstr):
        pass
    else:
        raise
# if successful, create an index.md file in the offering/meetings directory
midxstr = mdirstr + 'index.md'
with open(midxstr,"w") as mtgidx:
    mtgidx.write("---\n")
    mtgidx.write("title: " + reldir[0] + " (" + reldir[1] + ") Meetings\n")
    mtgidx.write("breadcrumb: Meetings\n")
    mtgidx.write("layout: bg-image\n")
    mtgidx.write("---\n")
    mtgidx.write("{% include offering/mtgs-all.html %}\n")
 """
# use the _data/teaching/<jcrs_id>/<sem>/meetings.csv file to create
# individual meeting files

# create Jekyll-friendly version of course ID
jcrs_id = reldir[0].replace("+","_")

with open(DATA_ROOT + jcrs_id + '/' + reldir[1] + '/meetings.csv', newline='') as mmmfile:
    mmmreader = csv.DictReader(mmmfile)
    for row in mmmreader:
        # generate file names for the meeting, summary, and response files
        #mfilestr = mdirstr + row['file'].replace(".html",".md")
        mfilestr = offdirstr + row['file'].replace(".html",".md")
        #mfilestr = mdirstr + row['file']
        m = row['meeting']
        #rfilestr = mdirstr + str(m).zfill(2) + "_R.md"
        #sfilestr = mdirstr + str(m).zfill(2) + "_S.md"

        mtg_date = row['date']
        nbr_meetings = row['total_mtgs']
        wiki_id = row['wikipage_id']
        resp_id = row['response_id']
        if resp_id == None:
            resp_id = str(0)
        print(mtg_date,nbr_meetings,wiki_id,resp_id)
        # with open(rfilestr,"w") as rmtgfile:
        #     rmtgfile.write("---\n")
        #     rmtgfile.write("title: Responses to Mtg " + str(m) + " &bull; " + reldir[0] +  " (" + reldir[1] + ")\n")
        #     rmtgfile.write("breadcrumb: Responses to Mtg " + str(m) + "\n")
        #     rmtgfile.write("mtg_nbr: " + str(m) + "\n")
        #     rmtgfile.write("layout: bg-image\n")
        #     rmtgfile.write("---\n")
        #     rmtgfile.write(meet_template["R"])
        #
        # with open(sfilestr,"w") as smtgfile:
        #     smtgfile.write("---\n")
        #     smtgfile.write("title: Summary of Mtg " + str(m) + " &bull; " + reldir[0] +  " (" + reldir[1] + ")\n")
        #     smtgfile.write("breadcrumb: Summary of Mtg " + str(m) + "\n")
        #     smtgfile.write("mtg_nbr: " + str(m) + "\n")
        #     smtgfile.write("layout: bg-image\n")
        #     smtgfile.write("---\n")
        #     smtgfile.write(meet_template["S"])
        with open(mfilestr,"w") as mtgfile:
            mtgfile.write("---\n")
            mtgfile.write("title: Mtg " + str(m) + " &bull; " + reldir[0] +  " (" + reldir[1] + ")\n")
            mtgfile.write("breadcrumb: Mtg " + str(m) + " (" + mtg_date + ")\n")
            mtgfile.write("mtg_nbr: " + str(m) + "\n")
            mtgfile.write("total_meet: " + str(nbr_meetings) + "\n")
            mtgfile.write("mtg_date: " + mtg_date + "\n")
            mtgfile.write("wiki_id: " + wiki_id + "\n")
            mtgfile.write("resp_id: " + resp_id + "\n")
            mtgfile.write("layout: bg-image\n")
            mtgfile.write("---\n")
            mtgfile.write(md_template["CS"])

# create a directory for assignments
"""adirstr = offdirstr + 'assignments/'
print(adirstr)
try:
    os.makedirs(adirstr)
except OSError as e:
    if e.errno == errno.EEXIST and os.path.isdir(adirstr):
        pass
    else:
        raise
# if successful, create an index.md file in the offering/assignments directory
aidxstr = adirstr + 'index.md'
with open(aidxstr,"w") as mtgidx:
    mtgidx.write("---\n")
    mtgidx.write("title: " + reldir[0] + " (" + reldir[1] + ") Assignments\n")
    mtgidx.write("breadcrumb: Assignments\n")
    mtgidx.write("layout: bg-image\n")
    mtgidx.write("---\n")
    mtgidx.write("{% include offering/asgn-grid.html %}\n")
"""