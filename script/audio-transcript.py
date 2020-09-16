#!/usr/bin/env python3

import sys, os, subprocess
from fileinput import FileInput
import os.path
from datetime import datetime, timedelta
from pathlib import Path

# arguments to this script:
# - the absolute path to the website's local root directory
print(sys.argv)
if (len(sys.argv) != 3):
  print (sys.argv[0],"must be invoked with start-time (HH:MM) and \"<path-to-transcript>\"")
  sys.exit()

# get site directory, make sure it ends with "/"
#print(sys.argv[1])
starttime = sys.argv[1].split(':')
#print (starttime)
std = timedelta(hours=int(starttime[0]),minutes=int(starttime[1]))
#print(std)
atfilepath = sys.argv[2]
og = []
ng = {}
seqnbr = 1
#print('---')
#print('---')
with open(atfilepath,'r') as atf:
    curr_hm_stamp = ''
    curr_speaker = ''
    new_block = 0
    for line in atf:
        line = line.strip()
        if (len(line)):
            if '-->' in line:
                startstop = line.split(' ')
                #print(startstop[0],startstop[2])
                try:
                    ts0 = std + datetime.strptime(startstop[0],'%H:%M:%S.%f')
                except:
                    ts0 = std + datetime.strptime(startstop[0],'%H:%M:%S,%f')
                #ts1 = datetime.strptime(startstop[2],'%H:%M:%S.%f')
                if curr_hm_stamp != ts0.strftime('%Hh%M'):
                    new_block = 1
                    #if (curr_hm_stamp != ''):
                    #    print('       \"')
                    print(ts0.strftime('%Hh%M') + ':')
                    print('  talks:')
                    curr_hm_stamp = ts0.strftime('%Hh%M')
            elif ':' in line:
                spoken = line.split(':')
                #print (spoken)
                if new_block == 1 or curr_speaker != spoken[0]:
                    if (spoken[0] == 'Daryl Hepting' or spoken[0] == 'Unknown'):
                        print('  - persid:','DHH')
                    else:
                        print('  - persid:','SSS')
                    print('    msg: >-')
                    curr_speaker = spoken[0]
                    #print ('      \"' + spoken[1])
                    #for i in range(2,len(spoken)):
                    #    print ('      ' + spoken[i])
                    new_block = 0
                for i in range(1,len(spoken)):
                    print ('      ' + spoken[i])
            elif len(line.strip().split()) > 1:
                if new_block == 1 :#or curr_speaker != spoken[0]:
                    print('  - persid:','DHH')
                    print('    msg: >-')
                    new_block = 0
                print ('      ' + line)
