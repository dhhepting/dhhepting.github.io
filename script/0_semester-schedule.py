#!/usr/bin/env python3
import sys, os, errno
from datetime import datetime, timedelta
import csv
from pathlib import Path

SITE_DIR = '/Users/hepting/Sites/dhhepting.github.io/'
MD_ROOT = SITE_DIR + 'teaching/'
DATA_ROOT = SITE_DIR + '_data/teaching/'

alldays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
longdays = {
    'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday'
}
# Make sure that script is executed properly: i.e. 201830
if (len(sys.argv) != 2):
    print(sys.argv[0], 'must be invoked with <semester>')
    sys.exit()
currsem = sys.argv[1]

# create directory in DATA_ROOT for <currsem>
Path(DATA_ROOT + currsem).mkdir(parents=True, exist_ok=True)

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

while (slot_et <= end_time):
    tslot = datetime.strftime(slot_st, '%H:%M') + '-' + datetime.strftime(slot_et, '%H:%M')
    tsk = datetime.strftime(slot_st, '%H:%M')
    tslots[tsk] = {'Times': tslot,
                   'Mon': 'E_', 'Tue': 'E_', 'Wed': 'E_',
                   'Thu': 'E_', 'Fri': 'E_' }
    slot_st += timedelta(minutes=30)
    slot_et += timedelta(minutes=30)

# find start and end dates for indicated semester
# if offering is found, use semester data to make meetings list
semstart = ''
semend = ''
with open(DATA_ROOT + 'semesters.csv', newline='') as semfile:
    semreader = csv.DictReader(semfile)
    sem_found = False
    for row in semreader:
        if (row['semester'] == currsem):
            sem_found = True
            semstart = datetime.strptime(row['term-start'], '%d-%b-%y')
            semend = datetime.strptime(row['class-end'], '%d-%b-%y')
            
# find course offerings for indicated semester
with open(DATA_ROOT + 'offerings.csv', newline='') as offfile:
    offreader = csv.DictReader(offfile)
    semoff_found = False
    for row in offreader:
        if (row['semester'] == currsem):
            semoff_found = True
            print('... processing offerings.csv')
            crsid = row['id']
            if crsid != 'sabbatical':
                mtgdays = row['mdays'].split(',')
                mtgtimes = row['times'].split('-')
                for tk in tslots:
                    if tk >= mtgtimes[0] and tk < mtgtimes[1]:
                        for i in range(len(mtgdays)):
                            if (tslots[tk])[mtgdays[i]] == 'E_':
                                (tslots[tk])[mtgdays[i]] = 'C_' + crsid
if semoff_found == False:
    print(sys.argv[0], ': no offerings found for this semester.')
    sys.exit()

# write markdown file that includes office hours
semschedmd = MD_ROOT + 'schedule/index.md'

# add office hours
with open(DATA_ROOT + 'officehrs.csv', newline='') as ohrsfile, open(semschedmd,'w') as schedmd:
    schedmd.write('---\n')
    semname = 'None'
    if (sys.argv[1][-2:] == '10'):
        semname = 'Winter'
    elif (sys.argv[1][-2:] == '20'):
        semname = 'Spring/Summer'
    elif (sys.argv[1][-2:] == '30'):
        semname = 'Fall'
    schedmd.write('title: ' + semname + ' ' + sys.argv[1][0:4] + ' Schedule\n')
    schedmd.write('breadcrumb: Schedule\n')
    schedmd.write('sem: ' + currsem + '\n')
    schedmd.write('main_entity: Service\n')
    schedmd.write('officeblocks:\n')
    ohrsreader = csv.DictReader(ohrsfile)
    semoff_found = False
    for row in ohrsreader:
        if (row['semester'] == currsem):
            semoff_found = True
            print('... processing officehrs.csv')
            if (row['days-times'] != ''):
                daystimes = row['days-times'].split(';')
                for odt in daystimes:
                    oday = odt.split('=')[0]
                    otimes = odt.split('=')[1].split(',')
                    for ots in otimes:
                        otr = ots.split('-')
                        for tk in tslots:
                            if tk >= otr[0] and tk <= otr[1]:
                                if (tslots[tk])[oday] == 'E_':
                                    (tslots[tk])[oday] = 'O_'
                        schedmd.write('  - day: ' + longdays[oday] + '\n')
                        schedmd.write('    open: \'' + otr[0] + '\'\n')
                        schedmd.write('    close: \'' + otr[1] + '\'\n')
    schedmd.write('officezoom:' + row['zoom'] + '\n')
    schedmd.write('firstdate: ' + datetime.strftime(semstart, '%Y-%m-%d') + '\n')
    schedmd.write('lastdate: ' + datetime.strftime(semend, '%Y-%m-%d') + '\n')
    schedmd.write('layout: bg-image\n')
    schedmd.write('---\n')
    #schedmd.write('{% include schedule.html %}\n')
    schedmd.write('{% include teaching/semester.html cs=page.sem %}\n')
    schedmd.write('{% include teaching/schedule.html cs=page.sem %}\n')

# add reserved times for prep and meetings
with open(DATA_ROOT + 'reserved.csv', newline='') as resfile:
    resreader = csv.DictReader(resfile)
    #semester,days-times,zoom
    semoff_found = False
    for row in resreader:
        if (row['semester'] == currsem):
            semoff_found = True
            print('... processing reserved.csv')
            if (row['days-times'] != ''):
                daystimes = row['days-times'].split(';')
                for rdt in daystimes:
                    rday = rdt.split('=')[0]
                    rtimes = rdt.split('=')[1].split(',')
                    for rts in rtimes:
                        rtr = rts.split('-')
                        for tk in tslots:
                            if tk >= rtr[0] and tk < rtr[1]:
                                if (tslots[tk])[rday] == 'E_':
                                    (tslots[tk])[rday] = 'R_'

# switch 'E_' (empty) to 'B_' (busy)
for tk in tslots:
    for i in range(len(alldays)):
        if (tslots[tk])[alldays[i]] == 'E_':
            (tslots[tk])[alldays[i]] = 'B_'

# write out semester schedule data to DATA_ROOT/<currsem>/schedule.csv
semschedstr = DATA_ROOT + currsem + '/schedule.csv'
with open(semschedstr, 'w', newline='') as csvfile:
    fieldnames = ['Times','Mon','Tue','Wed','Thu','Fri']
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()
    slot_st = start_time
    slot_et = slot_st + timedelta(minutes=30)
    while (slot_st < end_time):
        tsk = datetime.strftime(slot_st, '%H:%M')
        writer.writerow(tslots[tsk])
        slot_st += timedelta(minutes=30)
