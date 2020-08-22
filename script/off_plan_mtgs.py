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

# find offering indicated by arguments and load meeting days
with open(SITE_DIR + '_data/teaching/course_offerings.csv', newline='') as offfile:
    offreader = csv.DictReader(offfile)
    off_found = 0
    for row in offreader:
        if (row['semester'] == reldir[1] and row['id'] == reldir[0]):
            off_found = 1
            # load necessary info, if offering not found then quit
            mtgdays = row['mdays'].split(',')
if off_found == 0:
    sys.exit()

# if offering is found, use semester data to make meetings list
with open(SITE_DIR + '_data/teaching/semesters.csv', newline='') as semfile:
    semreader = csv.DictReader(semfile)
    sem_found = 0
    for row in semreader:
        if (row['semester'] == reldir[1]):
            sem_found = 1
            # find out no-class-days first
            ncd = row['no-class-days'].split(',')
            ncdlist = []
            for dd in ncd:
                ncdate = datetime.strptime(dd, "%d-%b-%y")
                ncdlist.append(datetime.strftime(ncdate,"%a-%d-%b-%Y").split('-'))
            # get term-start and class-end dates
            sday = datetime.strptime(row['term-start'], "%d-%b-%y")
            ced = datetime.strptime(row['class-end'], "%d-%b-%y")
            break
if off_found == 0:
    sys.exit()

joff_id = reldir[0] + "-" + reldir[1]
joff_id = joff_id.replace("+","_")
planfile = os.path.abspath(SITE_DIR + DATA_ROOT + joff_id + "/plan.yml")
mtgctr = 1
d = {}
d['offering'] = {}
d['offering']['id'] = joff_id
while (sday <= ced):
    datelist = datetime.strftime(sday,"%a-%d-%b-%Y").split('-')
    if (datelist[0] in mtgdays) and datelist not in ncdlist:
        #mtgwriter.writerow({'meeting': str(mtgctr).zfill(2), 'date': '-'.join(datelist)})
        d[mtgctr] = {}
        e = {}
        e['kaku'] = 'HCI/Foundations'
        e['topics'] = 'list of topics'
        e['outcomes'] = 'list of outcomes'
        e['notes'] = 'name of webpage with notes'
        d[mtgctr]['BOK'] = [e]
        d[mtgctr]['date'] = '-'.join(datelist)
        d[mtgctr]['theme'] = 'Human Computer Communication'
        mtgctr += 1
    sday = sday + timedelta(days=1)
with open(planfile, 'w') as yaml_file:
    yaml.dump(d, yaml_file, default_flow_style=False)
nbr_meetings = mtgctr - 1

# for mt in meet_template:
#     print(meet_template[mt])

midxstr = SITE_DIR + MD_ROOT + sys.argv[1] + "/meetings/index.md"
print (midxstr)
with open(midxstr,"w") as mtgidx:
    mtgidx.write("---\n")
    mtgidx.write("title: " + reldir[0] + " (" + reldir[1] + ") Meetings\n")
    mtgidx.write("breadcrumb: Meetings\n")
    mtgidx.write("layout: bg-image\n")
    mtgidx.write("---\n")
    mtgidx.write("# " + reldir[0] + " (" + reldir[1] + ") Meetings\n")
    mtgidx.write("{% include meetings/index-table.html %}\n")

mdirstr = str(SITE_DIR + MD_ROOT + sys.argv[1] + "/meetings/")
try:
    os.makedirs(mdirstr)
except OSError as e:
    if e.errno == errno.EEXIST and os.path.isdir(mdirstr):
        pass
    else:
        raise

with open(planfile, 'r') as stream:
    try:
        yamldict = yaml.safe_load(stream)
    except yaml.YAMLError as exc:
        print(exc)
for uu in yamldict:
    if ('date' in yamldict[uu]):
    #print (uu,yamldict[uu]['date'])
        m = uu
        mtg_date = yamldict[uu]['date']
        mtg_fname = str(m).zfill(2) + '_' + mtg_date

        mfilestr = SITE_DIR + MD_ROOT + sys.argv[1] + "/meetings/" + mtg_fname + ".md"
        print(mfilestr)
        with open(mfilestr,"w") as mtgfile:
            mtgfile.write("---\n")
            mtgfile.write("title: Mtg " + str(m) + " &bull; " + reldir[0] +  " (" + reldir[1] + ")\n")
            mtgfile.write("breadcrumb: " + str(m) + " (" + mtg_date + ")\n")
            mtgfile.write("mtg_nbr: " + str(m) + "\n")
            mtgfile.write("total_meet: " + str(nbr_meetings) + "\n")
            mtgfile.write("mtg_date: " + mtg_date + "\n")
            mtgfile.write("layout: bg-image\n")
            mtgfile.write("focus:\n")
            mtgfile.write("- ka:\n")
            mtgfile.write("  ku:\n")
            mtgfile.write("---\n")
            mtgfile.write("{% include meetings/pagination.html tm=page.total_meet cm=page.mtg_nbr %}")
        # mtgfile.write(meet_template["CS-205"])
            # except:
            #     pass
# m = 0
# mtgdata.write("meeting,file\n")
# for line in utfout:
#     if len(line) > 0:
#         m += 1
#         words = line.split('\"')
#         #sys.exit()
#         mtg_fname = (words[1].split('.'))[0]
#         mtgdata.write(str(m).zfill(2) + "," + mtg_fname.split('/')[1] + ".html\n")
#         datestr = mtg_fname.split('_',1)
#         print("Meeting file name: ",mtg_fname)
        #try:
            #print("TRYING")
            #print(datestr[1])
            #mtg_dt = datetime.strptime(datestr[1],"%d-%b-%y")
            #print(mtg_dt)
            #print(tdt)
            #print(datetime.strptime(tdt,"%d-%b-%y"))
            #print(mtg_dt >= datetime.today())
            #if mtg_dt > datetime.today():
                #print (datetime.today.strftime("%d-%b-%y"))
                #print(SITE_DIR + MD_ROOT + sys.argv[1] + "/" + mtg_fname + ".md")
