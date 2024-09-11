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
if (len(sys.argv) != 3):
	print(sys.argv[0], 'must be invoked with <course>/<semester> <mtg-nbr>')
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
respfile = responsedir + '/' + sys.argv[2].zfill(2) + '.yml'
joff_id = jcrs_id + '-' + reldir[1]

d = {}
try:
    with open(respfile, 'w') as yaml_file:
        d['offering'] = {}
        d['offering']['id'] = joff_id
        yaml.safe_dump(d, yaml_file, default_flow_style=False)
except:
    print(sys.argv[0],': ', respfile, 'exists')
    sys.exit()

# identify source file for responses to meeting
RESP_SRC = DL_DIR + reldir[0] + '-' + reldir[1] + '/' + sys.argv[2].zfill(2) + '.csv'
print(RESP_SRC)

rr = {}
with open(RESP_SRC, newline='') as engfile:
    reader = csv.DictReader(engfile)
    for row in reader:
        # track username only to ensure that their reply gets displayed once
        un = row['Username']
        if un not in rr:
            rr[un] = {}
            rr[un]['count'] = 1
            rr[un]['Q01'] = ''
            rr[un]['Q02'] = ''
            rr[un]['Q03'] = ''
        else:
            rr[un]['count'] += 1
        if 'Q00_concept' in row:
            rr[un]['Q01'] = row['Q00_concept']
        if 'Q01_concept' in row:
            rr[un]['Q01'] = row['Q01_concept']
        if 'Q01_difficult' in row:
            rr[un]['Q02'] = row['Q01_difficult']
        if 'Q02_difficult' in row:
            rr[un]['Q02'] = row['Q02_difficult']
        if 'Q02_knowmore' in row:
            rr[un]['Q03'] = row['Q02_knowmore']
        if 'Q03_knowmore' in row:
            rr[un]['Q03'] = row['Q03_knowmore']

print('Number of respondents',len(rr))

d['important'] = []
d['difficult'] = []
d['know-more'] = []
            
for un in rr:
    print ('user response',rr[un])
    q1 = {}
    q1['desc'] = rr[un]['Q01']
    if len(q1['desc']) > 0:
        d['important'].append(q1)
    q2 = {}
    q2['desc'] = rr[un]['Q02']
    if len(q2['desc']) > 0:
        d['difficult'].append(q2)
    q3 = {}
    q3['desc'] = rr[un]['Q03']
    if len(q3['desc']) > 0:
        d['know-more'].append(q3)
 
try:
    with open(respfile, 'w') as yaml_file:
        yaml.safe_dump(d, yaml_file, default_flow_style=False)
except:
    print ('exceptions')