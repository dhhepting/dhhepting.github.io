#!/usr/bin/env python3
import sys, os, csv
from datetime import datetime, timedelta
from ics import Calendar, Event
import arrow

SITE_DIR = '/Users/hepting/Sites/dhhepting.github.io/'
MD_ROOT = SITE_DIR + "teaching/"
DATA_ROOT = SITE_DIR + '_data/teaching/'

# Make sure that script is executed properly: i.e. CS-428+828/201830
if (len(sys.argv) != 2):
	print(sys.argv[0], 'must be invoked with <course>/<semester>')
	sys.exit()

reldir = (sys.argv[1]).split('/')
if (len(reldir) != 2):
	print(sys.argv[0], 'must be invoked with <course>/<semester>')
	sys.exit()

# find offering indicated by arguments and load meeting days
with open(DATA_ROOT + 'offerings.csv', newline='') as offfile:
    offreader = csv.DictReader(offfile)
    off_found = False
    for row in offreader:
        if (row['semester'] == reldir[1] and row['id'] == reldir[0]):
            off_found = True
            # load necessary info, if offering not found then quit
            times = row['times'].split('-')
            location = row['location']
            if (location == "Remote"):
                location = row['zoom']
            print('start',times[0])
            print('end',times[1])
            print('location', location)
            print('final-exam',row['final-exam'])
    
if off_found == False:
    print(sys.argv[0], ':', sys.argv[1], '- course and semester not found in offerings file')
    sys.exit()

# at this point, offering has been found in specified semester, so
# now use the list of meeting dates (meetings.csv) for this offering 
# to create calendar events in ICS format

# create Jekyll-friendly version of course ID
jcrs_id = reldir[0].replace('+','_')
# create Jekyll-friendly version of offering ID
off_id = reldir[0] + '-' + reldir[1]
# create data directory for offering: jcrs_id / semester
offdatadir = os.path.abspath(DATA_ROOT + jcrs_id + '/' + reldir[1] + '/')

mtgsfile = offdatadir + '/meetings.csv'      
c = Calendar()

# read meeting  details from meetings.csv
with open(mtgsfile, 'r', newline='') as mtgscsv:
    mtgsreader = csv.DictReader(mtgscsv)
    for row in mtgsreader:
        estart = row['date'] + 'T' + times[0] + ':00-06:00'
        eend = row['date'] + 'T' + times[1] + ':00-06:00'
        astart = arrow.get(estart, 'ddd-DD-MMM-YYYYThh:mm:ssZZ')
        aend = arrow.get(eend, 'ddd-DD-MMM-YYYYThh:mm:ssZZ')
        e = Event()
        e.name = off_id + '-' + str(row['meeting']).zfill(2)
        e.begin = astart
        e.end = aend
        c.events.add(e)
mtgcal = MD_ROOT + reldir[0] + '/' + reldir[1] + '/meetings.ics'
print('writing',mtgcal)
with open(mtgcal, 'w') as f:
    f.writelines(c.serialize_iter())