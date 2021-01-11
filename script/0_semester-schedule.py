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

#nine_hours_from_now = datetime.now() + timedelta(hours=9)
#datetime.datetime(2012, 12, 3, 23, 24, 31, 774118)
#datetime.datetime(tomorrow.year, tomorrow.month, tomorrow.day, 12, 0, 0)

midnight = datetime(
            datetime.now().year,
            datetime.now().month,
            datetime.now().day,
            0, 0, 0)
start_time = midnight + timedelta(hours=8,minutes=30)
end_time = midnight + timedelta(hours=17,minutes=30)
#print(start_time, end_time)
slot_st = start_time
slot_et = slot_st + timedelta(minutes=30)
print(datetime.strftime(slot_st, "%H:%M") + '-' + datetime.strftime(slot_et, "%H:%M"))
while (slot_et < end_time):
    slot_st += timedelta(minutes=30)
    slot_et += timedelta(minutes=30)
    #print(slot_st, slot_et)
    print(datetime.strftime(slot_st, "%H:%M") + '-' + datetime.strftime(slot_et, "%H:%M"))
sys.exit()

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
    with open(planfile, 'x') as yaml_file:
        d = {}
        d['offering'] = {}
        d['offering']['id'] = joff_id
        while (sday <= ced):
            datelist = datetime.strftime(sday,"%a-%d-%b-%Y").split('-')
            if (datelist[0] in mtgdays) and datelist not in ncdlist:
                d[mtgctr] = {}
                e = {}
                e['kaku'] = 'knowledge area / knowledge unit'
                e['topics'] = 'list of topics'
                e['outcomes'] = 'list of outcomes'
                e['notes'] = 'name of webpage with notes'
                d[mtgctr]['BOK'] = [e]
                d[mtgctr]['date'] = '-'.join(datelist)
                d[mtgctr]['theme'] = 'theme'
                mtgctr += 1
            sday = sday + timedelta(days=1)
        d['offering']['meetings'] = mtgctr - 1
        yaml.dump(d, yaml_file, default_flow_style=False)
        try:
            with open(mtgsfile,'w') as mf:
                mf.write('meeting,total_mtgs,date,file\n')
                for mm in range (1, mtgctr):
                    #print(mm)
                    mtg_date = d[mm]['date']
                    mtg_fname = str(mm).zfill(2) + '_' + mtg_date + '.html'
                    mf.write(str(mm).zfill(2) + ',' + str(mtgctr - 1) + ',' + mtg_date + ',' + mtg_fname + '\n')
        except:
            print('exceptions')
except:
    print(sys.argv[0],': plan.yml exists')
