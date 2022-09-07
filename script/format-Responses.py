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
#print (respfile)
#print (joff_id)
d = {}
try:
    with open(respfile, 'x') as yaml_file:
        d['offering'] = {}
        d['offering']['id'] = joff_id
        yaml.safe_dump(d, yaml_file, default_flow_style=False)
except:
    print(sys.argv[0],': ', respfile, 'exists')
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
        #rtype = row["(type) Which type of response are you making?"]
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
