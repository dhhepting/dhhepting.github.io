#!/usr/bin/env python3
import sys, os, errno
from datetime import datetime, timedelta
import csv
import yaml
from yaml import SafeDumper

SafeDumper.add_representer(
    type(None),
    lambda dumper, value: dumper.represent_scalar(u'tag:yaml.org,2002:null', '')
  )


SITE_DIR = "/Users/hepting/Sites/dhhepting.github.io/"
DROP_DIR = "/Users/hepting/Dropbox/"
MD_ROOT = "teaching/"
HTML_ROOT = "_site/teaching/"
DATA_ROOT = "_data/teaching/"

# Make sure that script is executed properly: i.e. CS-428+828/201830
if (len(sys.argv) != 2):
	print(sys.argv[0], 'must be invoked with <course>/<semester>')
	sys.exit()

reldir = (sys.argv[1]).split('/')
if (len(reldir) != 2):
	print(sys.argv[0], 'must be invoked with <course>/<semester>')
	sys.exit()

jcrs_id = reldir[0].replace("+","_")
joff_id = jcrs_id + '-' + reldir[1]
RESP_DIR = DROP_DIR + joff_id + '-responses/'
print(RESP_DIR)
sss = {}
for root, dirs, files in os.walk(RESP_DIR):
    for file in files:
        if file.endswith(".csv"):
            rfile = os.path.join(root, file)
            print(rfile)
            mk = file.split(".")[0]
            print(mk)
            with open(rfile, newline='') as rrrfile:
                reader = csv.DictReader(rrrfile)
                for row in reader:
                    #print(row["Email address"])
                    emi = row["Email address"].split("@")[0]
                    if (row["Grades"]):
                        grade = int(row["Grades"])
                        #print(emi)
                        if (emi not in sss):
                            sss[emi] = grade
                        else:
                            sss[emi] += grade
for k in sss:
    print(k,sss[k])
    # if len(sss[k]) > 0:
    #     print (k, len(sss[k]))
    #     #print (sss[k])
    #     for r in sss[k]:
    #         #print (r, len(sss[k]))
    #         print (r,sss[k][r])
    #     print("++++++++++++++++")
"""
        if (row['(description) Which description best suits your response?'] ==
            'the most important thing that I learned'):
            #print('important')
            if 'important' not in d:
                d['important'] = []
            d['important'].append(e)
        if (row['(description) Which description best suits your response?'] ==
            'the most difficult thing for me to understand'):
            if 'difficult' not in d:
                d['difficult'] = []
            d['difficult'].append(e)
        if (row['(description) Which description best suits your response?'] ==
            'the thing about which I would most like to know more'):
            if 'know-more' not in d:
                d['know-more'] = []
            d['know-more'].append(e)
try:
    with open(respfile, 'w') as yaml_file:
        yaml.safe_dump(d, yaml_file, default_flow_style=False)
except:
    print ('exceptions')
"""
