#!/usr/bin/env python3

import sys, os, subprocess
from fileinput import FileInput
import os.path
from datetime import datetime, timedelta
from pathlib import Path

import webvtt

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

d ={}
# try opening summary file for meeting
jcrs_id = reldir[0].replace("+","_")
summdir = os.path.abspath(SITE_DIR + DATA_ROOT + jcrs_id + '/' + reldir[1] + '/summary')
planfile = os.path.abspath(SITE_DIR + DATA_ROOT + jcrs_id + '/' + reldir[1] + '/plan.yml')

try:
    os.makedirs(summdir)
except OSError as e:
    # path already exists
    pass
summfile = summdir + '/' + sys.argv[2].zfill(2) + '.yml'
joff_id = jcrs_id + '-' + reldir[1]
mtg = sys.argv[2]
try:
    with open(summfile, 'x') as yaml_file:
        d['offering'] = {}
        d['offering']['id'] = joff_id
        yaml.safe_dump(d, yaml_file, default_flow_style=False)
except:
    print(sys.argv[0],': ', summfile, 'exists')
    with open(summfile, 'r') as yaml_file:
        d = yaml.safe_load(yaml_file)

try:
    with open(planfile, 'r') as plyaml_file:
        p = yaml.safe_load(plyaml_file)
except:
    pass

# print ('Processing outline for meeting:')
# if 'today' in p[int(sys.argv[2])]:
#     for te in p[int(sys.argv[2])]['today']:
#         if (te not in d):
#             d[te] = []
#             #d[te].append(te)
#             d[te].append(p[int(sys.argv[2])]['today'][te])
# elif 'outline' in p[int(sys.argv[2])]:
#     if ('Outline' not in d):
#         d['Outline'] = []
#         d['Outline'].append(p[int(sys.argv[2])]['outline'])
#     else:
#         print ('\t--> Outline already present.')

ng = {}
seqnbr = 0

SRT_SRC = DL_DIR + joff_id + '/' + sys.argv[2].zfill(2) + '.srt'
#print(VTT_SRC)
print ('Processing audio transcript for meeting:')
if (os.path.isfile(SRT_SRC)):
    if ('Audio-Transcript' not in d):
########
        d['Audio-Transcript'] = []
        ospkr = ''
        msgstr = ''
########
        for caption in webvtt.from_srt(SRT_SRC):
            #print("Caption:",caption)
            txtseg = caption.text.split(':')
            print("txtseg:",txtseg)
            tsl = len(txtseg)
            print("txtseg len:",tsl)
            if (tsl == 1):
                spkr = 'Unknown'
                msg = txtseg[0]
            if (tsl == 2):
                spkr = txtseg[0]
                msg = txtseg[1]
            #print('\tmsg from caption:',msg)
            #print(spkr,ospkr)
            e = {}
            e['desc'] = msg.strip()
            e['persid'] = ""
            d['Audio-Transcript'].append(e)
########
        e = {}
        e['desc'] = msg.strip()
        e['persid'] = ''
        d['Audio-Transcript'].append(e)
    else:
        print ('\t--> Zoom-Audio-Transcript already present.')

with open(summfile, 'w') as yaml_file:
    yaml.safe_dump(d, yaml_file, default_flow_style=False)
