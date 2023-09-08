#!/usr/bin/env python3
import sys, os, csv, yaml
from datetime import datetime, timedelta
from yaml import SafeDumper

SafeDumper.add_representer(
    type(None),
    lambda dumper, value: dumper.represent_scalar(u'tag:yaml.org,2002:null', '')
  )
SafeDumper.ignore_aliases = lambda *args : True

SITE_DIR = '/Users/hepting/Sites/dhhepting.github.io/'
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
        #print(row)
        if (row['semester'] == reldir[1] and row['id'] == reldir[0]):
            off_found = True
            # load necessary info, if offering not found then quit
            mtgdays = row['mdays'].split(',')
            urcid = 0
            if (row['urc']):
                urcid = row['urc']
            attendid = 0
            if (row['attendance']):
                attendid = row['attendance']

if off_found == False:
    print(sys.argv[0], ':', sys.argv[1], '- course and semester not found in offerings file')
    sys.exit()

# at this point, offering has been found in specified semester, so
# now build list of meeting dates for the offering based on data
# retrieved from offerings.csv and semesters.csv

# create Jekyll-friendly version of course ID
jcrs_id = reldir[0].replace('+','_')

# create data directory for offering: jcrs_id / semester
offdatadir = os.path.abspath(DATA_ROOT + jcrs_id + '/' + reldir[1] + '/')
try:
    os.makedirs(offdatadir)
except OSError as e:
    # path already exists
    pass

# create data files for offering plan and meetings
planfile = offdatadir + '/tstplan.yml'
mtgsfile = offdatadir + '/meetings.csv'
# create Jekyll-friendly version of offering ID
joff_id = jcrs_id + '-' + reldir[1]

# header of plan structure
d = {}
d['offering'] = {}
d['offering']['id'] = joff_id
d['offering']['overview'] = 'Overview'

d['tentsched'] = {}
    # W01:
    # - meets:
    #   - 01_
    #   - 02_
    # - theme:
    # - reading:
    # - topics:
    # - lo:

with open(mtgsfile, newline='') as mtgscsv:
    mtgsreader = csv.DictReader(mtgscsv)
    for row in mtgsreader:
        # plan for each meeting
        meeting = row['meeting'].zfill(2)
        d[meeting] = {}
        d[meeting]['theme'] = None
        # BOK
        e = {}
        e['kaku'] = None
        e['topics'] = None
        e['outcomes'] = None
        d[meeting]['BOK'] = [e]
        # Date
        d[meeting]['date'] = row['date']
        # Outline for Today
        d[meeting]['today'] = []
        # Standard Administration items
        f = {}
        f['Administration'] = []
        g = {}
        date_object = datetime.strptime(row['date'], "%a-%d-%b-%Y")
        g['desc'] = 'Happy ' + (datetime.strftime(date_object,'%A-%d-%b-%Y').split('-'))[0]
        f['Administration'].append(g)
        g = {}
        g['desc'] = 'Attendance'
        g['url'] = 'https://urcourses.uregina.ca/mod/attendance/manage.php?id=' + str(attendid) + '&view=1'
        f['Administration'].append(g)
        g = {}
        g['desc'] = 'Class calendar for today'
        g['url'] = 'https://urcourses.uregina.ca/calendar/view.php?view=day&time=' + str(int(date_object.timestamp())) + '&course=' + str(urcid)
        f['Administration'].append(g)
        g = {}
        g['desc'] = 'Upcoming events'
        g['url'] = 'https://urcourses.uregina.ca/calendar/view.php?view=upcoming&course=' + str(urcid)
        f['Administration'].append(g)
        d[meeting]['today'].append(f)
        # For Next Meeting: add link to meeting response
        f = {}
        f['For Next Meeting'] = []
        g = {}
        g['desc'] = 'Respond to this meeting before 11pm tonight'
        g['url'] = 'https://urcourses.uregina.ca/mod/feedback/view.php?id=' + str(row['response_id'])
        f['For Next Meeting'].append(g)
        d[meeting]['today'].append(f)
try:
    with open(planfile, 'x') as yaml_file:
        yaml.safe_dump(d, yaml_file, default_flow_style=False)
        # plan.yml file now written   
except Exception as e:
    print('plan.yml:',e)
    print(sys.argv[0],': plan.yml exists')

#print(d)
