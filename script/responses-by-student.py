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
DL_DIR = "/Users/hepting/Downloads/"
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
RESP_DIR = DL_DIR + joff_id + '/'
sss = {}
for root, dirs, files in os.walk(RESP_DIR):
    for file in files:
        if file.endswith(".csv"):
            rfile = os.path.join(root, file)
            mk = file.split(".")[0]
            with open(rfile, newline='') as rrrfile:
                reader = csv.DictReader(rrrfile)
                print('DDD',mk,reader.fieldnames)
                for row in reader:
                    #print(row)
                    #print(row["Email address"])
                    #emi = row["Email address"].split("@")[0]
                    #emi = row["Username"]
                    emi = row["Full name"]
                    #print(emi)
                    if (emi not in sss):
                        sss[emi] = {}
                    if (mk not in sss[emi]):
                        sss[emi][mk] = {}
                    if "Q01" not in sss[emi][mk]:
                        if "Q01_Concept" in row and len(row["Q01_Concept"]) > 0:
                            sss[emi][mk]["Q01"] = row["Q01_Concept"]
                    if "Q02" not in sss[emi][mk]:
                        if "Q02_Difficulty" in row and len(row["Q02_Difficulty"]) > 0:
                            sss[emi][mk]["Q02"] = row["Q02_Difficulty"]
                    if "Q03" not in sss[emi][mk]:
                        if "Q03_Knowmore" in row and len(row["Q03_Knowmore"]) > 0:
                            sss[emi][mk]["Q03"] = row["Q03_Knowmore"]
for k in sss:
    if len(sss[k]) > 0:
        print (k, len(sss[k]))
        bymeeting = dict(sorted(sss[k].items()))
        #for r in sss[k]:
        for r in bymeeting:
            #for t in sss[k][r]:
            for t in bymeeting[r]:
                print (k,r,t,bymeeting[r][t])
            print(k,"++++++++++++++++")
"""
        if (row['(description) Which description best suits your response?'] ==
            'the most impor]tant thing that I learned'):
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
