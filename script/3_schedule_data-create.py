#!/usr/bin/env python3
import sys, os, errno
from datetime import datetime, timedelta
import csv
import yaml

SITE_DIR = "/Users/hepting/Sites/dhhepting.github.io/"
MD_ROOT = "teaching/"
HTML_ROOT = "_site/teaching/"
DATA_ROOT = "_data/teaching/"

# Make sure that script is executed properly: i.e. 201830
if (len(sys.argv) != 2):
    print(sys.argv[0], 'must be invoked with <semester>')
    sys.exit()
currsem = sys.argv[1]

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
alldays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
while (slot_et <= end_time):
    tslot = datetime.strftime(slot_st, "%H:%M") + '-' + datetime.strftime(slot_et, "%H:%M")
    tsk = datetime.strftime(slot_st, "%H:%M")
    tslots[tsk] = {'Times': tslot,
                   'Mon': 'E_', 'Tue': 'E_', 'Wed': 'E_',
                   'Thu': 'E_', 'Fri': 'E_' }
    slot_st += timedelta(minutes=30)
    slot_et += timedelta(minutes=30)

# find course offerings for indicated semester
with open(SITE_DIR + DATA_ROOT + 'offerings.csv', newline='') as offfile:
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
    schedmd.write("title: " + semsea + " " + sys.argv[1][0:4] + " Schedule\n")
    schedmd.write("breadcrumb: " + currsem + "\n")
    schedmd.write("sem: " + currsem + "\n")
    schedmd.write("main_entity: Service\n")
    schedmd.write("officeblocks:\n")
    with open(SITE_DIR + DATA_ROOT + 'semesters.csv', newline='') as semfile:
        semreader = csv.DictReader(semfile)
        for row in semreader:
            if (row['semester'] == currsem):
                offdays = row['office-hours'].split(';')
                for o in offdays:
                    oslot = o.split(',')
                    oday = oslot[0]
                    otimes = oslot[1].split('-')

                    for tk in tslots:
                        if tk >= otimes[0] and tk < otimes[1]:
                            if (tslots[tk])[oday] == 'E_':
                                (tslots[tk])[oday] = 'O_'
                                print ("officeblocks")
                            else:
                                print('overlap')

    schedmd.write("layout: bg-image\n")
    schedmd.write("---\n")
    schedmd.write("{% include teaching/semester.html %}\n")
    schedmd.write("{% include teaching/schedule.html %}\n")


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
    fieldnames = ['Times','Mon','Tue','Wed','Thu','Fri']
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

    writer.writeheader()
    slot_st = start_time
    slot_et = slot_st + timedelta(minutes=30)
    while (slot_st < end_time):
        tsk = datetime.strftime(slot_st, "%H:%M")
        writer.writerow(tslots[tsk])
        slot_st += timedelta(minutes=30)
        #slot_et += timedelta(minutes=30)


# officeblocks:
#   - day: Monday
#     open: "12:30:00"
#     close: "14:30:00"
#   - day: Tuesday
#     open: "15:30:00"
#     close: "16:30:00"
#   - day: Wednesday
#     open: "12:30:00"
#     close: "14:30:00"
#   - day: Thursday
#     open: "15:30:00"
#     close: "16:30:00"
# officezoom: https://uregina-ca.zoom.us/j/95236861406?pwd=UmE0RjhIMnNCSnV1TlBDc0dKOEhOUT09
