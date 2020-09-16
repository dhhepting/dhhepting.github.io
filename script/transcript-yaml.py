#!/usr/bin/env python3
import sys, os, errno #, datetime, subprocess
from datetime import datetime, timedelta
#from subprocess import Popen, PIPE
import csv
import yaml
import collections

with open(sys.argv[1], 'r') as stream1:
    try:
        yd1 = yaml.safe_load(stream1)
        yod1 = collections.OrderedDict(sorted(yd1.items()))
    except yaml.YAMLError as exc:
        print(exc)
print(sys.argv[1])
fl1 = []
for k, v in yod1.items():
    if len(fl1) == 0:
        fl1.append(k)
fl1.append(k)
with open(sys.argv[2], 'r') as stream2:
    try:
        yd2 = yaml.safe_load(stream2)
        yod2 = collections.OrderedDict(sorted(yd2.items()))
    except yaml.YAMLError as exc:
        print(exc)
print(sys.argv[2])
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
starttime = datetime.strptime(start,'%Hh%M')
endtime = datetime.strptime(end,'%Hh%M')
combo = {}
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
with open('test.yml', 'w') as outfile:
    yaml.dump(combo, outfile, default_flow_style=False)
