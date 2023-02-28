#!/usr/bin/env python3
import sys, os, errno #, datetime, subprocess
from datetime import datetime, timedelta
import csv
import yaml
from yaml import SafeDumper

SafeDumper.add_representer(
    type(None),
    lambda dumper, value: dumper.represent_scalar(u'tag:yaml.org,2002:null', '')
  )
SafeDumper.ignore_aliases = lambda *args : True

SITE_DIR = '/Users/hepting/Sites/dhhepting.github.io/'
MD_ROOT = SITE_DIR + 'teaching/'
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
            off_found = 1
            # load necessary info, if offering not found then quit
            mtgdays = row['mdays'].split(',')
            urcid = 0
            if (row['urc']):
                urcid = row['urc']
            attendid = 0
            if (row['attendance']):
                attendid = row['attendance']
            wikifmid = 0
            if (row['wiki']):
                wikifmid = row['wiki']

if off_found == 0:
    print(sys.argv[0], ':', sys.argv[1], '- course and semester not found in offerings file')
    sys.exit()

# if offering is found, use semester data to make meetings list
with open(SITE_DIR + DATA_ROOT + 'semesters.csv', newline='') as semfile:
    semreader = csv.DictReader(semfile)
    sem_found = 0
    for row in semreader:
        if (row['semester'] == reldir[1]):
            sem_found = 1
            # get term-start and class-end dates
            tsd = datetime.strptime(row['term-start'], '%d-%b-%y')
            ced = datetime.strptime(row['class-end'], '%d-%b-%y')
            # get no-class-days
            ncd = row['no-class-days'].split(',')
            ncdlist = []
            for dd in ncd:
                ncdate = datetime.strptime(dd, '%d-%b-%y')
                ncdlist.append(datetime.strftime(ncdate,'%a-%d-%b-%Y').split('-'))
            break

if sem_found == 0:
    print(sys.argv[0],': semester ' + reldir[1] + ' not found in semesters file')
    sys.exit()

# at this point, offering has been found in specified semester, so
# now build list of meeting dates for the offering based on data
# retrieved from offerings.csv and semesters.csv

# create Jekyll-friendly version of course ID
jcrs_id = reldir[0].replace('+','_')

# create data directory for offering: jcrs_id / semester
offdatadir = os.path.abspath(SITE_DIR + DATA_ROOT + jcrs_id + '/' + reldir[1] + '/')
try:
    os.makedirs(offdatadir)
except OSError as e:
    # path already exists
    pass

# create data files for offering plan and meetings
planfile = offdatadir + '/plan.yml'
mtgsfile = offdatadir + '/meetings.csv'
# create Jekyll-friendly version of offering ID
joff_id = jcrs_id + '-' + reldir[1]


# start meeting counter at 1
mtgctr = 1
try:
    with open(planfile, 'x') as yaml_file:
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

        sday = tsd
        while (sday <= ced):
            datelist = datetime.strftime(sday,'%a-%d-%b-%Y').split('-')
            dayname = (datetime.strftime(sday,'%A-%d-%b-%Y').split('-'))[0]
            #print (dayname)
            if (datelist[0] in mtgdays) and datelist not in ncdlist:
                d[mtgctr] = {}
                e = {}
                e['kaku'] = None
                e['topics'] = None
                e['outcomes'] = None
                d[mtgctr]['BOK'] = [e]
                d[mtgctr]['date'] = '-'.join(datelist)
                #d[mtgctr]['timestamp'] = int(sday.timestamp())
                f = {}
                f['Administration'] = []
                g = {}
                g['desc'] = 'Happy ' + dayname
                f['Administration'].append(g)
                g = {}
                g['desc'] = 'Attendance'
                g['url'] = 'https://urcourses.uregina.ca/mod/attendance/manage.php?id=' + str(attendid) + '&view=1'
                f['Administration'].append(g)
                g = {}
                g['desc'] = 'Class calendar for today'
                g['url'] = 'https://urcourses.uregina.ca/calendar/view.php?view=day&time=' + str(int(sday.timestamp())) + '&course=' + str(urcid)
                f['Administration'].append(g)
                g = {}
                g['desc'] = 'Upcoming events'
                g['url'] = 'https://urcourses.uregina.ca/calendar/view.php?view=upcoming&course=' + str(urcid)
                f['Administration'].append(g)
                d[mtgctr]['today'] = [f]
                #d[mtgctr]['theme'] = 'Meeting ' + str(mtgctr) + ' theme'
                d[mtgctr]['theme'] = None
                #d[mtgctr]['notes'] = str(jcrs_id) + '-M' + str(mtgctr).zfill(2)
                mtgctr += 1
            sday = sday + timedelta(days=1)
        d['offering']['meetings'] = mtgctr - 1
        yaml.safe_dump(d, yaml_file, default_flow_style=False)
        # template plan.yml file now written

        # now write out meetings.csv file with meeting datelist
        # use mtgctr set in plan.yml loop
        try:
            print ('mtgctr', mtgctr)
            with open(mtgsfile,'w') as mf:
                mf.write('meeting,total_mtgs,date,file,wikipage_id\n')
                for mm in range (1, mtgctr):
                    print ('mm', type(mm), mm)
                    mtg_date = d[mm]['date']
                    # create HTML filename for each meeting
                    mtg_fname = str(mm).zfill(2) + '_' + mtg_date + '.html'
                    #print ('before write')
                    mf.write(
                        str(mm).zfill(2) + ',' +
                        str(mtgctr - 1) + ',' +
                        mtg_date + ',' +
                        mtg_fname + ',' +
                        #str(int(wikifmid) + mm - 1) + '\n')
                        'wiki\n')
                    #print ('after write')
        except Exception as e:
            print('meetings.csv:',e)

        # now write out assignments.csv file -- only the headings
        # and a sample entry line that will be ignored in other processing
        asgnfile = offdatadir + '/assignments.csv'
        print('about to try:', asgnfile)
        try:
            with open(asgnfile,'w') as af:
                af.write('aid,title,marks,lms_discuss,lms_submit,duedate\n')
                #mf.write('\#P_UNDERSTAND,'Understand Your Project',10,1241916,613230,22-Oct-2020\n')
        except Exception as e:
            print('assignments.csv:',e)

except Exception as e:
    print('plan.yml:',e)
    print(sys.argv[0],': plan.yml exists')
