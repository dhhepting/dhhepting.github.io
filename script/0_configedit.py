#!/usr/bin/env python3

import sys, os, errno #, datetime, subprocess
from datetime import datetime, timedelta
#from subprocess import Popen, PIPE
import csv
import yaml
from yaml import SafeDumper, SafeLoader

SafeDumper.add_representer(
    type(None),
    lambda dumper, value: dumper.represent_scalar(u'tag:yaml.org,2002:null', '')
  )


SITE_DIR = "/Users/hepting/Sites/dhhepting.github.io/"

# Make sure that script is executed properly: i.e. CS-428+828/201830
if (len(sys.argv) != 3):
	print(sys.argv[0], 'must be invoked with <course>/<semester> [+|-]')
	sys.exit()

reldir = (sys.argv[1]).split('/')
if (len(reldir) != 2):
	print(sys.argv[0], 'must be invoked with <course>/<semester> [+|-]')
	sys.exit()

d = {}
config_file = SITE_DIR + '_config.yml'
try:
    with open(config_file, 'r') as yaml_file:
        d = yaml.load(yaml_file, Loader=SafeLoader)
except:
    print(sys.argv[0],': error')
    sys.exit()

if (sys.argv[2] == '+'):
    print('Adding 0_nonweb and 1_offweb exclusions for:', sys.argv[1])
    nonweb = 'teaching/' + sys.argv[1] + '/0_nonweb/'
    if nonweb not in d['exclude']:
        d['exclude'].append(nonweb)
    else:
        print(nonweb,'already excluded')
    offweb = 'teaching/' + sys.argv[1] + '/1_offweb/'
    if offweb not in d['exclude']:
        d['exclude'].append(offweb)
    else:
        print(offweb,'already excluded')
    d['exclude'].sort()
    with open(config_file, 'w') as yaml_file:
        yaml.dump(d, yaml_file, Dumper=SafeDumper, default_flow_style=False)
elif (sys.argv[2] == '-'):
     print('Moving selected contents from', sys.argv[1],'to 1_offweb')

sys.exit()
# find offering indicated by arguments and load meeting days
RESP_SRC = DL_DIR + joff_id + '/' + sys.argv[2].zfill(2) + '.csv'
print(RESP_SRC)
#with open(DL_DIR + sys.argv[2], newline='') as engfile:
with open(RESP_SRC, newline='') as engfile:
    reader = csv.DictReader(engfile)
    for row in reader:
        e = {}
        e['desc'] = row["(response) What is your response to today's meeting?"]
        if "(type) Which type of response are you making?" in row:
            rtype = row["(type) Which type of response are you making?"]
        if "(description) Which description best suits your response?" in row:
            rtype = row["(description) Which description best suits your response?"]
        if (rtype == 'the most important thing that I encountered' or
            rtype == 'the most important thing that I learned'):
            #print('important')
            if 'important' not in d:
                d['important'] = []
            d['important'].append(e)
        if (rtype == 'the most difficult thing for me to understand'):
            if 'difficult' not in d:
                d['difficult'] = []
            d['difficult'].append(e)
        if (rtype == 'the thing about which I would most like to know more'):
            if 'know-more' not in d:
                d['know-more'] = []
            d['know-more'].append(e)
try:
    with open(respfile, 'w') as yaml_file:
        yaml.safe_dump(d, yaml_file, default_flow_style=False)
except:
    print ('exceptions')
