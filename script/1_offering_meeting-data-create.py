#!/usr/bin/env python3
import sys, os, csv
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
        if (row['semester'] == reldir[1] and row['id'] == reldir[0]):
            off_found = True
            # load necessary info, if offering not found then quit
            mtgdays = row['mdays'].split(',')
    
if off_found == False:
    print(sys.argv[0], ':', sys.argv[1], '- course and semester not found in offerings file')
    sys.exit()

# if offering is found, use semester data to make meetings list
with open(DATA_ROOT + 'semesters.csv', newline='') as semfile:
    semreader = csv.DictReader(semfile)
    sem_found = False
    for row in semreader:
        if (row['semester'] == reldir[1]):
            sem_found = True
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

if sem_found == False:
    print(sys.argv[0],': semester ' + reldir[1] + ' not found in semesters file')
    sys.exit()

# at this point, offering has been found in specified semester, so
# now build list of meeting dates for the offering based on data
# retrieved from offerings.csv and semesters.csv

# create Jekyll-friendly version of course ID
jcrs_id = reldir[0].replace('+','_')
# create Jekyll-friendly version of offering ID
joff_id = jcrs_id + '-' + reldir[1]

# create data directory for offering: jcrs_id / semester
offdatadir = os.path.abspath(DATA_ROOT + jcrs_id + '/' + reldir[1] + '/')
try:
    os.makedirs(offdatadir)
except OSError as e:
    # path already exists
    pass

# create data file for meetings
mtgsfile = offdatadir + '/testmeetings.csv'

# start meeting counter at 1, count total meetings and save the dates
mtgdates = {}
mtgctr = 1
sday = tsd
while (sday <= ced):
    datelist = datetime.strftime(sday,'%a-%d-%b-%Y').split('-')
    dayname = (datetime.strftime(sday,'%A-%d-%b-%Y').split('-'))[0]
    if (datelist[0] in mtgdays) and datelist not in ncdlist:
        mtgdates[mtgctr] = '-'.join(datelist)
        mtgctr += 1
    sday = sday + timedelta(days=1)

tot_mtgs = mtgctr - 1       

# write meeting file details into meetings.csv
try:
    with open(mtgsfile, 'w', newline='') as mtgscsv:
        fieldnames = ['meeting','total_mtgs','date','file','wikipage_id','response_id']
        mtgswriter = csv.DictWriter(mtgscsv, fieldnames=fieldnames)
        mtgswriter.writeheader()
        for mm in range(1,mtgctr):
            mtg_date = mtgdates[mm]
            mtg_fname = str(mm).zfill(2) + '_' + mtg_date + '.html'
            mtgswriter.writerow({
                'meeting' : str(mm).zfill(2),
                'total_mtgs' : tot_mtgs,
                'date' : mtg_date, 
                'file' : mtg_fname})
except Exception as e:
    print('meetings.csv:',e)