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
                print (spoken)
                if new_block == 1 or curr_speaker != spoken[0]:
                    print('  - persid: ',spoken[0])
                    print('    msg: >-')
                    curr_speaker = spoken[0]
                    #print ('      \"' + spoken[1])
                    #for i in range(2,len(spoken)):
                    #    print ('      ' + spoken[i])
                    new_block = 0
                for i in range(1,len(spoken)):
                    print ('      ' + spoken[i])
            elif len(line.strip().split()) > 1:
                print ('      ' + line)
    #print('       \"')
        # colon_idx = 0
        # if '(Privately)' in line:
        #     continue
        # else:
        #     npline = line.split(' ')
        #     try:
        #         fp_dt = datetime.strptime(npline[0],'%H:%M:%S\t')
        #         hm_stamp = fp_dt.strftime('%Hh%M')
        #         # hm_stamp = '"' + fp_dt.strftime('%Hh%M') + '"'
        #     except:
        #         sys.exit()
        #     sname = ''
        #     for i in range(2,len(npline)):
        #         if (npline[i] != ':'):
        #             sname += (' ' + npline[i])
        #         else:
        #             colon_idx = i
        #             break
        #     snamekey = sname.strip()
        #
        #     if snamekey not in ng:
        #         ng[snamekey] = seqnbr
        #         seqnbr += 1
        #     if snamekey == 'Daryl Hepting':
        #         person_id = 'DHH'
        #     else:
        #         person_id = 'S'+str(ng[snamekey]).zfill(2)
        #         # "11h09" :
        #         #   chats:
        #         #   - persid: DHH
        #         #     msg: " Greetings."
        #     if hm_stamp != curr_hm_stamp:
        #         print(hm_stamp + ':\n  chats:')
        #         curr_hm_stamp = hm_stamp
        #     #print (fp_dt.strftime('%H:%M'),person_id,(' '.join(npline[colon_idx:])).strip(),'<br />')
        #     print ('  - persid:',person_id,'\n    msg: "',(' '.join(npline[colon_idx+1:])).strip(),'"')


"""
for l in og:
    ng[l[0]] = []
    ng[l[0]].append(l[len(l)-1].strip())
for l in og:
    mm = 1
    for m in range(1,len(l)-1):
        nk = chr((ord(l[0])-ord('A')+mm)%len(og)+ord('A'))
        #print(l[0],nk,len(ng[nk]),int(ng[nk][0]))
        while (len(ng[nk]) > int(ng[nk][0])):
            mm = mm % len(og) + 1
            nk = chr((ord(l[0])-ord('A')+mm)%len(og)+ord('A'))
            if (nk == l[0]):
                mm = mm % len(og) + 1
                nk = chr((ord(l[0])-ord('A')+mm)%len(og)+ord('A'))
        ng[nk].append(l[m].strip() + '( ' + l[0] + ' )')
        mm = mm % len(og) + 1
        #print(m,mm)

for x in ng:
    print(x,ng[x])
sys.exit()
for root, subdirs, files in os.walk(assign_root):
    for filename in files:
        if (filename != ".DS_Store"):
            file_path = os.path.join(root, filename)
            fp_modtime = time.ctime(os.path.getmtime(file_path))
            fp_dt = datetime.strptime(fp_modtime,'%a %b %d %H:%M:%S %Y')
            cur_moddate = fp_dt.strftime('%d-%b-%Y')
            #
            #print (fp_modtime)
            update = 0
            with open(file_path,'r') as f:
                file_moddate = ""
                for line in f:
                    line = line.rstrip().split()
                    if len(line) > 0 and "moddate:" in line[0]:
                        if len(line) >= 2:
                            file_moddate = line[1]
                            if file_moddate != cur_moddate:
                                print ("Update ",file_path," : ",file_moddate,cur_moddate)
                                update = 1
            if (update):
                with FileInput(files=[file_path], inplace=True) as f:
                    for line in f:
                        line = line.rstrip()
                        if "moddate:" in line:
                            print("moddate:",cur_moddate)
                        else:
                            print(line)
            #print(time.ctime(os.path.getmtime(file_path)))
"""
