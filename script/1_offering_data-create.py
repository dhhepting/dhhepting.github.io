#!/usr/bin/env python3
import sys, os, errno #, datetime, subprocess
from datetime import datetime, timedelta
#from subprocess import Popen, PIPE
import csv
import yaml
from yaml import SafeDumper
#import yaml

#data = {'deny': None, 'allow': None}

SafeDumper.add_representer(
    type(None),
    lambda dumper, value: dumper.represent_scalar(u'tag:yaml.org,2002:null', '')
  )

#with open('./yadayada.yaml', 'w') as output:
#    yaml.safe_dump(data, output, default_flow_style=False)


#tdt = datetime.today().strftime("%d-%b-%y")
#ydt = datetime()
#print ("TODAY: ",tdt)
#print ("NOW: ",datetime.now()) #.strftime("%d-%b-%y"))

SITE_DIR = "/Users/hepting/Sites/dhhepting.github.io/"
MD_ROOT = "teaching/"
HTML_ROOT = "_site/teaching/"
DATA_ROOT = "_data/teaching/"

meet_template = { "CS" : """
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
</div>"""
}

# Make sure that script is executed properly: i.e. CS-428+828/201830
if (len(sys.argv) != 2):
	print(sys.argv[0], 'must be invoked with <course>/<semester>')
	sys.exit()

reldir = (sys.argv[1]).split('/')
if (len(reldir) != 2):
	print(sys.argv[0], 'must be invoked with <course>/<semester>')
	sys.exit()

# find offering indicated by arguments and load meeting days
with open(SITE_DIR + '_data/teaching/offerings.csv', newline='') as offfile:
    offreader = csv.DictReader(offfile)
    off_found = 0
    for row in offreader:
        if (row['semester'] == reldir[1] and row['id'] == reldir[0]):
            off_found = 1
            # load necessary info, if offering not found then quit
            mtgdays = row['mdays'].split(',')
if off_found == 0:
    print(sys.argv[0], ':', sys.argv[1], '- course and semester not found in offerings file')
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
if sem_found == 0:
    print(sys.argv[0],': semester ' + reldir[1] + ' not found in semesters file')
    sys.exit()

jcrs_id = reldir[0].replace("+","_")
offdatadir = os.path.abspath(SITE_DIR + DATA_ROOT + jcrs_id + '/' + reldir[1] + '/')
try:
    os.makedirs(offdatadir)
except OSError as e:
    # path already exists
    pass
planfile = offdatadir + '/plan.yml'
mtgsfile = offdatadir + '/meetings.csv'
joff_id = jcrs_id + '-' + reldir[1]
mtgctr = 1
try:
    print('PLAN:',planfile)
    with open(planfile, 'x') as yaml_file:
        d = {}
        d['offering'] = {}
        d['offering']['id'] = joff_id
        d['offering']['overview'] = 'Overview'
        while (sday <= ced):
            datelist = datetime.strftime(sday,"%a-%d-%b-%Y").split('-')
            if (datelist[0] in mtgdays) and datelist not in ncdlist:
                d[mtgctr] = {}
                e = {}
                e['kaku'] = None
                e['topics'] = None
                e['outcomes'] = None
                d[mtgctr]['BOK'] = [e]
                d[mtgctr]['date'] = '-'.join(datelist)
                d[mtgctr]['outline'] = None
                d[mtgctr]['theme'] = 'Meeting ' + str(mtgctr) + ' theme'
                d[mtgctr]['notes'] = str(jcrs_id) + '-M' + str(mtgctr).zfill(2)
                mtgctr += 1
            sday = sday + timedelta(days=1)
        d['offering']['meetings'] = mtgctr - 1
        #print(d)
        yaml.safe_dump(d, yaml_file, default_flow_style=False)
        try:
            with open(mtgsfile,'w') as mf:
                mf.write('meeting,total_mtgs,date,file\n')
                for mm in range (1, mtgctr):
                    #print(mm)
                    mtg_date = d[mm]['date']
                    mtg_fname = str(mm).zfill(2) + '_' + mtg_date + '.html'
                    mf.write(
                        str(mm).zfill(2) + ',' +
                        str(mtgctr - 1) + ',' +
                        mtg_date + ',' +
                        mtg_fname + '\n')
        except Exception as e:
            print('exceptions:',e)
except Exception as e:
    print('plan.yml:',e)
    print(sys.argv[0],': plan.yml exists')
