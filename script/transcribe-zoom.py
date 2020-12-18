#!/usr/bin/env python3

import sys, os, subprocess
from fileinput import FileInput
import os.path
import pytz
from datetime import datetime
from pathlib import Path


est = pytz.timezone('US/Eastern')
utc = pytz.utc
fmt = '%Y-%m-%d %H:%M:%S %Z%z'

fn = 'GMT20201124-172548_HCC-Mtg-22.m4a'
print(fn)
print(fn[3:7])
print(fn[7:9])
print(fn[9:11])
winter = datetime(int(fn[3:7]),int(fn[7:9]),int(fn[9:11]), 18, 0, 0, tzinfo=utc)
summer = datetime(2016, 7, 24, 18, 0, 0, tzinfo=utc)

print (winter.strftime(fmt))
print (summer.strftime(fmt))

print (winter.astimezone(est).strftime(fmt))
print (summer.astimezone(est).strftime(fmt))

sys.exit()
# arguments to this script:
# - the absolute path to the website's local root directory
if (len(sys.argv) != 3):
  print (sys.argv[0],"must be invoked with \"<crs_id>/<crs_sem>\" and meeting number")
  sys.exit()
mtg_nbr = str(sys.argv[2]).zfill(2)
# get site directory, make sure it ends with "/"
CHAT_SRC = 'teaching/' + sys.argv[1] + '/0_nonweb/zoom/chat/' + mtg_nbr + '_saved_chat.txt'
print(CHAT_SRC)
CHAT_DST = '_data/teaching/' + sys.argv[1].replace('+','_') + '/transcript/chat/' + mtg_nbr + '.yml'
print(CHAT_DST)

og = []
ng = {}
seqnbr = 1

with open(CHAT_SRC,'r') as ctf, open(CHAT_DST, 'w') as ydf:
    curr_hm_stamp = ''
    hm_stamp = ''
    failed = 0
    for line in ctf:
        #llr = ll.replace('\r','')
        #line = llr.replace('\n','')
        colon_idx = 0
        if '(Privately)' in line:
            continue
        else:
            # if (failed):
            #     print(line)
            #     failed = 0
            npline = line.split(' ')
            try:
                fp_dt = datetime.strptime(npline[0],'%H:%M:%S\t')
                hm_stamp = fp_dt.strftime('%Hh%M')
                #print(hm_stamp)
            except:
                print("FAILING",fp_dt,hm_stamp,npline,line)
                #print(npline)
                #failed = 1
                #sys.exit()
            sname = ''
            for i in range(2,len(npline)):
                if (npline[i] != ':'):
                    sname += (' ' + npline[i])
                else:
                    colon_idx = i
                    #print(colon_idx)
                    break
            snamekey = sname.strip()

            if snamekey not in ng:
                ng[snamekey] = seqnbr
                seqnbr += 1
            if snamekey == 'Daryl Hepting':
                person_id = 'DHH'
            else:
                person_id = 'S'+str(ng[snamekey]).zfill(2)
            if hm_stamp != curr_hm_stamp:
                ydf.write(hm_stamp + ':\n')
                ydf.write('  chats:\n')
                curr_hm_stamp = hm_stamp
            #print (fp_dt.strftime('%H:%M'),person_id,(' '.join(npline[colon_idx:])).strip(),'<br />')
            ydf.write ('  - persid: ' + person_id + '\n')
            ydf.write ('    msg: >-\n')
            #print((' '.join(npline[colon_idx+1:])).strip())
            #print(npline)
            ydf.write ('     ' + (' '.join(npline[colon_idx+1:])).strip() + '\n')
