#!/usr/bin/env python3

import sys, os, subprocess
from fileinput import FileInput
import os.path
import pytz
from datetime import datetime
#from pathlib import Path


ltz = pytz.timezone('America/Regina')
utc = pytz.utc
fmt = '%Y-%m-%d %H:%M:%S %Z%z'

fn = 'GMT20210415-171531_Recording_as_1920x1080.mp4'
fn = 'GMT20210415-190009_Recording_as_868x720.mp4'
zYYYY = int(fn[3:7])
zmm = int(fn[7:9])
zdd = int(fn[9:11])
zHH = int(fn[12:14])
zMM = int(fn[14:16])
zSS = int(fn[16:18])

if (fn[0:3] == 'GMT'):
    filetime_utc = datetime(zYYYY, zmm, zdd, zHH, zMM, zSS, tzinfo=utc)
    filetime_local = filetime_utc.astimezone(ltz) #ltz.localize(filetime)
    #filetime.replace()
    #print (filetime.strftime(fmt))
    #filetime_local = filetime_utc.astimezone(local)
    #print (filetime_utc.astimezone(local).strftime(fmt))
    print (filetime_local.strftime(fmt))
    #class_start = ltz.localize(datetime(zYYYY, zmm, zdd, 11, 30))
    #print (class_start.strftime(fmt))
    #td = filetime_local - class_start
    #print(td)
#print(str(delta))
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

fn = 'GMT20210415-171531_Recording_as_1920x1080.mp4'
fnp = fn.split('-')
print(fnp)
