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

d = {}
""" SITE_DIR = "/Users/hepting/Sites/dhhepting.github.io/"
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
 """
rr = {}
with open(sys.argv[1], newline='') as csvfile:
    reader = csv.DictReader(csvfile)
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

d['concept'] = []
d['difficult'] = []
d['knowmore'] = []

uns = {}
r2rout = {}        
for un in rr:
    q1 = {}
    q1['desc'] = rr[un]['Q01']
    d['concept'].append(q1)
    q2 = {}
    q2['desc'] = rr[un]['Q02']
    d['difficult'].append(q2)
    q3 = {}
    q3['desc'] = rr[un]['Q03']
    d['knowmore'].append(q3)
    # print the 3 responses, see if the student has been 'thoughtful'
    print('---')
    print(un,':')
    print(rr[un]['Q01'])
    print(rr[un]['Q02'])
    print(rr[un]['Q03'])
   
    ir = False
    r2r = False
    quit = False
    while ir == False:
        tfin = input('Thoughtful?:')
        if tfin == 'y' or tfin == 'Y':
            ir = True
        if tfin == 'n' or tfin == 'N':
            uns[un] = 'N'
            ir = True
        if tfin == 'q' or tfin == 'Q':
            ir = True
            quit = True
    while r2r == False:
        r2rin = input('Include in r2r?:')
        if r2rin == 'y' or r2rin == 'Y':
            r2rout[un] = 'Y'
            r2r = True
        if r2rin == 'n' or r2rin == 'N':
            r2r = True
        if r2rin == 'q' or r2rin == 'Q':
            r2r = True
            quit = True
    if quit == True:
        break
print('***')
print('Students with responses that were not thoughtful:')
for i in dict(sorted(uns.items())):
    print (i)
print('Students with responses that warrant responses:')
for i in dict(sorted(uns.items())):
    print (i)