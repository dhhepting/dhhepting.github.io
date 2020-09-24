#!/usr/bin/env python3

import sys, os, subprocess
from fileinput import FileInput
import os.path
from datetime import datetime
from pathlib import Path

# arguments to this script:
# - the absolute path to the website's local root directory
if (len(sys.argv) != 2):
  print (sys.argv[0],"must be invoked with \"<path-to-chat-file>\"")
  sys.exit()

# get site directory, make sure it ends with "/"
chatfilepath = sys.argv[1]
og = []
ng = {}
seqnbr = 1
with open(chatfilepath,'r') as cf:
    curr_hm_stamp = ''
    for line in cf:
        colon_idx = 0
        if '(Privately)' in line:
            continue
        else:
            npline = line.split(' ')
            try:
                fp_dt = datetime.strptime(npline[0],'%H:%M:%S\t')
                hm_stamp = fp_dt.strftime('%Hh%M')
            except:
                sys.exit()
            sname = ''
            for i in range(2,len(npline)):
                if (npline[i] != ':'):
                    sname += (' ' + npline[i])
                else:
                    colon_idx = i
                    break
            snamekey = sname.strip()

            if snamekey not in ng:
                ng[snamekey] = seqnbr
                seqnbr += 1
            if snamekey == 'Daryl Hepting':
                person_id = 'DHH'
            else:
                person_id = 'S'+str(ng[snamekey]).zfill(2)
                # "11h09" :
                #   chats:
                #   - persid: DHH
                #     msg: " Greetings."
            if hm_stamp != curr_hm_stamp:
                print(hm_stamp + ': ')
                print('  chats:')
                curr_hm_stamp = hm_stamp
            #print (fp_dt.strftime('%H:%M'),person_id,(' '.join(npline[colon_idx:])).strip(),'<br />')
            print ('  - persid:',person_id)
            print ('    msg: >-')
            print ('     ',(' '.join(npline[colon_idx+1:])).strip())
