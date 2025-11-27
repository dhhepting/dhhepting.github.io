#!/usr/bin/env python3
import sys, os, csv, json
from datetime import datetime, timedelta

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
planfile = offdatadir + '/plan.json'
mtgsfile = offdatadir + '/meetings.csv'
# create Jekyll-friendly version of offering ID
joff_id = jcrs_id + '-' + reldir[1]

# plan structure
d = {}
d['offering'] = joff_id
d['overview'] = "1. Overview\n 1. Some detail\n 1. Detail\n"
d['assignments'] = "sample"
# exams
e = []
e.append({})
e[0] = {}
#e[0]['name'] = "Midterm"
#e[0]['date'] = "Thu-29-Feb-2024"
e.append({})
#e[1]['name'] = "Final"
#e[1]['date'] = "Tue-16-Apr-2024"
d['exams'] = e
# weekly schedule
w = []
wkctr = -1
currwk = 0
currwkof = ''
prevwk = 0
prevwkof = ''
with open(mtgsfile, newline='') as mtgscsv:
    mtgsreader = csv.DictReader(mtgscsv)
    for row in mtgsreader:
        if (wkctr == -1):
             d['totwk'] = int(row['total_wks'])
        # plan for each week
        currwk = int(row['week'])
        currwkof = row['week_of']
        if (currwk != prevwk):
            print(currwk,prevwk,'prevwkof',prevwkof)
            if (prevwkof != ''):
                pwodt = datetime.strptime(prevwkof,'%a-%d-%b-%Y')
            for i in range(currwk - prevwk - 1):
                wkctr += 1   
                w.append({}) 
                w[wkctr]['week'] = prevwk + i + 1
                pwodt += timedelta(days=7)
                w[wkctr]['weekof'] = datetime.strftime(pwodt,'%a-%d-%b-%Y')
                w[wkctr]['mtgs'] = []  
            wkctr += 1   
            w.append({}) 
            w[wkctr]['week'] = int(row['week'])
            w[wkctr]['weekof'] = row['week_of']
            w[wkctr]['mtgs'] = []
            w[wkctr]['mtgs'].append(row['file'])
        else:
            w[wkctr]['mtgs'].append(row['file'])
        w[wkctr]['topics'] = 'Topics'
        w[wkctr]['noteworth'] = 'Noteworthy Items'
        prevwk = currwk
        prevwkof = currwkof
        
d['wklysched'] = w
# meetings
m = []
mtgctr = 0
with open(mtgsfile, newline='') as mtgscsv:
    mtgsreader = csv.DictReader(mtgscsv)
    for row in mtgsreader:
        if (mtgctr == 0):
             d['totwk'] = int(row['total_wks'])
             d['totmeet'] = row['total_mtgs']
        # plan for each week
        # plan for each meeting
        m.append({})
        m[mtgctr]['mtgnbr'] = int(row['meeting'])
        m[mtgctr]['week'] = int(row['week'])
        m[mtgctr]['date'] = row['date']
        m[mtgctr]['theme'] = "Theme"
        # Administrative Items (formatted in markdown)
        adminstr = ''
        date_object = datetime.strptime(row['date'], "%a-%d-%b-%Y")
        adminstr += '* Happy ' + (datetime.strftime(date_object,'%A-%d-%b-%Y').split('-'))[0] + '\n'
        adminstr += '* [ACTION: Record your attendance](https://urcourses.uregina.ca/mod/attendance/manage.php?id=' + str(attendid) + '&view=1){:target=\'_blank\'}\n'
        adminstr += '* [Class calendar for today](https://urcourses.uregina.ca/calendar/view.php?view=day&time=' + str(int(date_object.timestamp())) + '&course=' + str(urcid) + '){:target=\'_blank\'}\n'
        adminstr += '* [Upcoming events](https://urcourses.uregina.ca/calendar/view.php?view=upcoming&course=' + str(urcid) + '){:target=\'_blank\'}\n'
        m[mtgctr]['admin'] = adminstr
        #m[mtgctr]['r2r'] = 'Response to responses'
        m[mtgctr]['today'] = ''
        m[mtgctr]['summ'] = ''
        nextstr = ''
        #nextstr += '* [Submit your response to this meeting before 11pm tonight](https://urcourses.uregina.ca/mod/questionnaire/view.php?id=' + str(row['response_id']) + '){:target=\'_blank\'}\n'
        #nextstr += '* [Take quiz before the start of our next meeting](https://urcourses.uregina.ca/mod/quiz/view.php?id=' + str(row['quiz_id']) + '){:target=\'_blank\'}'
        m[mtgctr]['next'] = nextstr
       
        """ 
        # BOK
        e = {}
        e['kaku'] = None
        e['topics'] = None
        e['outcomes'] = None
        d[meeting]['BOK'] = [e]
        """
        pass
        mtgctr += 1

d['meetings'] = m
with open(planfile, 'x') as jsonplan:
    json.dump(d, jsonplan, sort_keys=False, indent=4)