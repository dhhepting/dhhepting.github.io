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

# Make sure that script is executed properly: i.e. 201830
if (len(sys.argv) != 2):
    print(sys.argv[0], 'must be invoked with <semester>')
    sys.exit()
currsem = sys.argv[1]
#nine_hours_from_now = datetime.now() + timedelta(hours=9)
#datetime.datetime(2012, 12, 3, 23, 24, 31, 774118)
#datetime.datetime(tomorrow.year, tomorrow.month, tomorrow.day, 12, 0, 0)

# make time slots for semester schedule, indicate all as empty (E_)
midnight = datetime(
            datetime.now().year,
            datetime.now().month,
            datetime.now().day,
            0, 0, 0)
start_time = midnight + timedelta(hours=8,minutes=30)
end_time = midnight + timedelta(hours=17,minutes=30)
slot_st = start_time
slot_et = slot_st + timedelta(minutes=30)
tslots = {}
alldays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
while (slot_et <= end_time):
    tslot = datetime.strftime(slot_st, "%H:%M") + '-' + datetime.strftime(slot_et, "%H:%M")
    tsk = datetime.strftime(slot_st, "%H:%M")
    tslots[tsk] = {'Times': tslot,
                   'Mon': 'E_', 'Tue': 'E_', 'Wed': 'E_',
                   'Thu': 'E_', 'Fri': 'E_', 'Sat': 'E_' }
    slot_st += timedelta(minutes=30)
    slot_et += timedelta(minutes=30)

# find course offerings for indicated semester
with open(SITE_DIR + '_data/teaching/offerings.csv', newline='') as offfile:
    offreader = csv.DictReader(offfile)
    semoff_found = 0
    for row in offreader:
        if (row['semester'] == currsem):
            semoff_found = 1
            crsid = row['id']
            mtgdays = row['mdays'].split(',')
            mtgtimes = row['times'].split('-')
            for tk in tslots:
                if tk >= mtgtimes[0] and tk < mtgtimes[1]:
                    for i in range(len(mtgdays)):
                        if (tslots[tk])[mtgdays[i]] == 'E_':
                            (tslots[tk])[mtgdays[i]] = 'C_' + crsid
if semoff_found == 0:
    print(sys.argv[0], ':', 'no offerings found for this semester.')
    sys.exit()

# add office hours

# add extra meetings

# switch 'E_' (empty) to 'B_' (busy)

for tk in tslots:
    for i in range(len(alldays)):
        if (tslots[tk])[alldays[i]] == 'E_':
            (tslots[tk])[alldays[i]] = 'B_'

# write out semester schedule data as csv
#  /Users/hepting/Sites/dhhepting.github.io/_data/teaching/schedule/s201830.csv
semschedstr = SITE_DIR + '_data/teaching/schedule/s' + sys.argv[1] + '.csv'
with open(semschedstr, 'w', newline='') as csvfile:
    fieldnames = ['Times','Mon','Tue','Wed','Thu','Fri','Sat']
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

    writer.writeheader()
    slot_st = start_time
    slot_et = slot_st + timedelta(minutes=30)
    while (slot_st < end_time):
        tsk = datetime.strftime(slot_st, "%H:%M")
        writer.writerow(tslots[tsk])
        slot_st += timedelta(minutes=30)
        #slot_et += timedelta(minutes=30)

semschedmd = SITE_DIR + MD_ROOT + 'schedule/' + sys.argv[1] + '.md'
with open(semschedmd,"w") as schedmd:
    schedmd.write("---\n")
    semsea = "None"
    if (sys.argv[1][-2:] == "10"):
        semsea = "Winter"
    elif (sys.argv[1][-2:] == "20"):
        semsea = "Spring/Summer"
    elif (sys.argv[1][-2:] == "30"):
        semsea = "Fall"
    schedmd.write("title: " + semsea + sys.argv[1][0:4] + "Schedule\n")
    #schedmd.write("breadcrumb: " + reldir[1] + "\n")
    #offidx.write("sem: " + reldir[1] + "\n")
    schedmd.write("layout: bg-image\n")
    schedmd.write("---\n")
    schedmd.write("{% include schedule.html %}\n")

# if offering is found, use semester data to make meetings list
"""
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
"""
