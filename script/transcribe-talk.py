#!/usr/bin/env python3

import sys, os, subprocess
from fileinput import FileInput
import os.path
from datetime import datetime, timedelta
from pathlib import Path

# arguments to this script:
# - meeting number
# - real time HH:MM when recording starts
# - crs_id/semester of offering
if (len(sys.argv) != 4):
  print (sys.argv[0],"must be invoked with meeting-number, start-time (HH:MM), and crs_id/semester")
  sys.exit()

mtg_nbr = str(sys.argv[1]).zfill(2)

# 5 11:10 CS-428+828/202030
# teaching/CS-428+828/202030/0_nonweb/zoom/talk/05*.srt
# _data/teaching/CS-428_828/202030/transcript/talk/05.yml

TALK_SRC = 'teaching/' + sys.argv[3] + '/0_nonweb/zoom/talk/' + mtg_nbr + '_otter.ai.srt'
print(TALK_SRC)
TALK_DST = '_data/teaching/' + sys.argv[3].replace('+','_') + '/transcript/talk/' + mtg_nbr + '.yml'
print(TALK_DST)
starttime = sys.argv[2].split(':')
std = timedelta(hours=int(starttime[0]),minutes=int(starttime[1]))
atfilepath = sys.argv[2]

with open(TALK_SRC,'r') as atf, open(TALK_DST, 'w') as ydf:
    curr_hm_stamp = ''
    curr_speaker = ''
    new_block = 0
    for line in atf:
        line = line.strip()
        if (len(line)):
            #print(line)
            if '-->' in line:
                #print ('case: -->')
                startstop = line.split(' ')
                #print(startstop)
                #ydf.write(str(startstop) + '\n')
                try:
                    ts0 = std + datetime.strptime(startstop[0],'%H:%M:%S.%f')
                except:
                    ts0 = std + datetime.strptime(startstop[0],'%H:%M:%S,%f')
                if curr_hm_stamp != ts0.strftime('%Hh%M'):
                    new_block = 1
                    ydf.write(ts0.strftime('%Hh%M') + ':\n')
                    ydf.write('  talks:\n')
                    curr_hm_stamp = ts0.strftime('%Hh%M')
            elif ':' in line:
                print ('case: :')
                spoken = line.split(':')
                #print(spoken)
                if new_block == 1 or curr_speaker != spoken[0]:
                    #spkr = 'SSS'
                    #if (spoken[0] == 'Daryl Hepting' or spoken[0] == 'Unknown'):
                    ydf.write('  - persid: ' + spoken[0] + '\n')
                    #else:
                        #ydf.write('  - persid: SSS\n')
                    ydf.write('    msg: >-\n')
                    curr_speaker = spoken[0]
                    #print ('      \"' + spoken[1])
                    #for i in range(2,len(spoken)):
                    #    print ('      ' + spoken[i])
                    new_block = 0
                for i in range(1,len(spoken)):
                    ydf.write ('      ' + spoken[i].strip() + '\n')
            elif len(line.strip().split()) > 1 or not line.isnumeric():
                #print ('case: len(line.strip().split()) > 1 or line.isalpha()')
                if new_block == 1 :#or curr_speaker != spoken[0]:
                    ydf.write('  - persid: ' + spoken[0] + '\n')
                    ydf.write('    msg: >-\n')
                    new_block = 0
                ydf.write ('      ' + line.strip() + '\n')
