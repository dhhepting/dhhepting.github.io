#!/usr/bin/env python3
import sys, os, errno #, datetime, subprocess
from datetime import datetime, timedelta
#from subprocess import Popen, PIPE
import csv
import yaml
from yaml import SafeDumper

SafeDumper.add_representer(
    type(None),
    lambda dumper, value: dumper.represent_scalar(u'tag:yaml.org,2002:null', '')
  )


SITE_DIR = "/Users/hepting/Sites/dhhepting.github.io/"
DL_DIR = "/Users/hepting/Downloads/"
MD_ROOT = "teaching/"
HTML_ROOT = "_site/teaching/"
DATA_ROOT = "_data/teaching/"

# Make sure that script is executed properly: i.e. CS-428+828/201830
if (len(sys.argv) != 4):
	print(sys.argv[0], 'must be invoked with <course>/<semester> <csv-file> <mtg-nbr>')
	sys.exit()

reldir = (sys.argv[1]).split('/')
if (len(reldir) != 2):
	print(sys.argv[0], 'must be invoked with <course>/<semester>')
	sys.exit()

# try opening response file for meeting
jcrs_id = reldir[0].replace("+","_")
responsedir = os.path.abspath(SITE_DIR + DATA_ROOT + jcrs_id + '/' + reldir[1] + '/responses')
try:
    os.makedirs(responsedir)
except OSError as e:
    # path already exists
    pass
respfile = responsedir + '/' + sys.argv[3].zfill(2) + '.yml'
joff_id = jcrs_id + '-' + reldir[1]
d = {}
try:
    with open(respfile, 'x') as yaml_file:
        d['offering'] = {}
        d['offering']['id'] = joff_id
        d['last_ts_read'] = 0
        d['raw'] = []
        d['cooked'] = []
        yaml.safe_dump(d, yaml_file, default_flow_style=False)
except:
    print(sys.argv[0],': ', respfile, 'exists')
    with open(respfile, 'r') as yaml_file:
        d = yaml.safe_load(yaml_file)
# find offering indicated by arguments and load meeting days
with open(DL_DIR + sys.argv[2], newline='') as engfile:
    reader = csv.DictReader(engfile)
    off_found = 0
    for row in reader:
        if int(row['modified']) > int(d['last_ts_read']):
            d['last_ts_read'] = row['modified']
            e = {}
            e['desc'] = row['message']
            #print (e)
            if (d['raw'] == None):
                d['raw'] = []
            d['raw'].append(e)

        #print(row['modified'],row['message'])
        #if (row['semester'] == reldir[1] and row['id'] == reldir[0]):
        #    off_found = 1
            # load necessary info, if offering not found then quit
        #    mtgdays = row['mdays'].split(',')
#sys.exit()

try:
    with open(respfile, 'w') as yaml_file:
        yaml.safe_dump(d, yaml_file, default_flow_style=False)
except:
    print ('exceptions')
sys.exit()

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
