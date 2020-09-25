#!/usr/bin/env python3
import sys, os, errno #, datetime, subprocess
from datetime import datetime, timedelta
#from subprocess import Popen, PIPE
import csv
import yaml
import collections
import os.path


if (len(sys.argv) != 3):
  print (sys.argv[0],"must be invoked with crs_id/semester and meeting-number")
  sys.exit()

mtg_nbr = str(sys.argv[2]).zfill(2)

CHATTY_SRC = '_data/teaching/' + sys.argv[1].replace('+','_') + '/transcript/chat/' + mtg_nbr + '.yml'
TALKY_SRC = '_data/teaching/' + sys.argv[1].replace('+','_') + '/transcript/talk/' + mtg_nbr + '.yml'
TAGSY_SRC = '_data/teaching/' + sys.argv[1].replace('+','_') + '/transcript/tags/' + mtg_nbr + '.yml'

COMBO_DST = '_data/teaching/' + sys.argv[1].replace('+','_') + '/transcript/' + mtg_nbr + '.yml'

with open(CHATTY_SRC, 'r') as s1:
    try:
        yd1 = yaml.safe_load(s1)
        yod1 = collections.OrderedDict(sorted(yd1.items()))
    except yaml.YAMLError as exc:
        print(exc)
fl1 = []
for k, v in yod1.items():
    if len(fl1) == 0:
        fl1.append(k)
fl1.append(k)
with open(TALKY_SRC, 'r') as s2:
    try:
        yd2 = yaml.safe_load(s2)
        yod2 = collections.OrderedDict(sorted(yd2.items()))
    except yaml.YAMLError as exc:
        print(exc)
fl2 = []
for k, v in yod2.items():
    if len(fl2) == 0:
        fl2.append(k)
fl2.append(k)
if (fl1[0] <= fl2[0]):
    start = fl1[0]
else:
    start = fl2[0]
if (fl1[1] >= fl2[1]):
    end = fl1[1]
else:
    end = fl2[1]
tags_file = 0
if (os.path.isfile(TAGSY_SRC)):
    tags_file = 1
    with open(TAGSY_SRC, 'r') as s3:
        try:
            yd3 = yaml.safe_load(s3)
        except yaml.YAMLError as exc:
            print(exc)
starttime = datetime.strptime(start,'%Hh%M')
endtime = datetime.strptime(end,'%Hh%M')
combo = {}
tags = {}
timestamp = starttime
while (timestamp <= endtime):
    key = datetime.strftime(timestamp,'%Hh%M')
    timestamp += timedelta(minutes=1)
    if key in yd1 or key in yd2:
        combo[key] = {}
        combo[key]['chats'] = []
        if key in yd1:
            combo[key]['chats'] = yd1[key]['chats']
        combo[key]['talks'] = []
        if key in yd2:
            combo[key]['talks'] = yd2[key]['talks']
        if (tags_file):
            combo[key]['tags'] = []
            if key in yd3:
                combo[key]['tags'] = yd3[key]['tags']
        else:
            tags[key] = {}
            tags[key]['tags'] = []
with open(COMBO_DST, 'w') as outfile:
    yaml.dump(combo, outfile, default_flow_style=False)
if not tags_file:
    with open(TAGSY_SRC, 'w') as tagsy:
        yaml.dump(tags, tagsy, default_flow_style=False)
