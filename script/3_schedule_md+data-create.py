#!/usr/bin/env python3
import sys, os, errno
from datetime import datetime, timedelta
import csv
import yaml

SITE_DIR = "/Users/hepting/Sites/dhhepting.github.io/"
MD_ROOT = SITE_DIR + "teaching/"
HTML_ROOT = SITE_DIR + "_site/teaching/"
DATA_ROOT = SITE_DIR + "_data/teaching/"

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
eod = datetime(
            datetime.now().year,
            datetime.now().month,
            datetime.now().day,
            23, 59, 59)
start_time = midnight + timedelta(hours=8,minutes=30)
end_time = midnight + timedelta(hours=17,minutes=30)
slot_st = start_time
slot_et = slot_st + timedelta(minutes=30)
tslots = {}
alldays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
longdays = {
    'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday'
}
tslot = datetime.strftime(midnight, "%H:%M") + '-' + datetime.strftime(start_time, "%H:%M")
tsk = datetime.strftime(midnight, "%H:%M")
tslots[tsk] = {'Times': tslot,
               'Mon': 'E_', 'Tue': 'E_', 'Wed': 'E_',
               'Thu': 'E_', 'Fri': 'E_' }
while (slot_et <= end_time):
    tslot = datetime.strftime(slot_st, "%H:%M") + '-' + datetime.strftime(slot_et, "%H:%M")
    tsk = datetime.strftime(slot_st, "%H:%M")
    tslots[tsk] = {'Times': tslot,
                   'Mon': 'E_', 'Tue': 'E_', 'Wed': 'E_',
                   'Thu': 'E_', 'Fri': 'E_' }
    slot_st += timedelta(minutes=30)
    slot_et += timedelta(minutes=30)
tslot = datetime.strftime(end_time, "%H:%M") + '-' + datetime.strftime(eod, "%H:%M")
tsk = datetime.strftime(end_time, "%H:%M")
tslots[tsk] = {'Times': tslot,
               'Mon': 'E_', 'Tue': 'E_', 'Wed': 'E_',
               'Thu': 'E_', 'Fri': 'E_' }

# find course offerings for indicated semester
with open(DATA_ROOT + 'offerings.csv', newline='') as offfile:
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
semschedmd = MD_ROOT + 'schedule/index.md'
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
    schedmd.write("breadcrumb: Schedule\n")
    schedmd.write("sem: " + currsem + "\n")
    schedmd.write("main_entity: Service\n")
    schedmd.write("officeblocks:\n")
    with open(DATA_ROOT + 'officehrs.csv', newline='') as offile:
        offreader = csv.DictReader(offile)
        for row in offreader:
            if (row['semester'] == currsem):
                offdays = row['days-times'].split(';')
                for o in offdays:
                    print (o)
                    odaze = o.split('=')
                    oday = odaze[0]
                    oslots = odaze[1].split(',')
                    for os in oslots:
                        otimes = os.split('-')
                        schedmd.write("  - day: " + longdays[oday] + "\n")
                        schedmd.write("    open: \"" + otimes[0] + "\"\n")
                        schedmd.write("    close: \"" + otimes[1] + "\"\n")
                        for tk in tslots:
                            if tk >= otimes[0] and tk < otimes[1]:
                                if (tslots[tk])[oday] == 'E_':
                                    (tslots[tk])[oday] = 'O_Office'
                                else:
                                    print('overlap')
    schedmd.write("firstdate: 2022-08-31\n")
    schedmd.write("lastdate: 2022-12-06\n")
    schedmd.write("layout: bg-image\n")
    schedmd.write("---\n")

    with open(DATA_ROOT + 'reserved.csv', newline='') as resfile:
        resreader = csv.DictReader(resfile)
        for row in resreader:
            if (row['semester'] == currsem):
                offdays = row['days-times'].split(';')
                for o in offdays:
                    print (o)
                    odaze = o.split('=')
                    oday = odaze[0]
                    oslots = odaze[1].split(',')
                    for os in oslots:
                        otimes = os.split('-')
                        for tk in tslots:
                            if tk >= otimes[0] and tk < otimes[1]:
                                if (tslots[tk])[oday] == 'E_':
                                    (tslots[tk])[oday] = 'R_Reserved'
                                else:
                                    print('overlap')

    schedmd.write("{% include teaching/semester.html cs=page.sem %}\n")
    schedmd.write("{% include teaching/schedule.html cs=page.sem %}\n")


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
    slot_st = midnight
    while (slot_st < eod):
        tsk = datetime.strftime(slot_st, "%H:%M")
        print(tsk)
        if (tsk in tslots):
            writer.writerow(tslots[tsk])
        slot_st += timedelta(minutes=30)


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
