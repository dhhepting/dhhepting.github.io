#!/usr/bin/env python3

import sys, os, datetime, subprocess
from fileinput import FileInput
import os.path, time
from datetime import datetime, timezone
from pathlib import Path
from pytz import timezone

# arguments to this script:
# - the absolute path to the website's local root directory
if (len(sys.argv) != 2):
  print (sys.argv[0],"must be invoked with \"<path-to-group-file>\"")
  sys.exit()

# get site directory, make sure it ends with "/"
groupfilepath = sys.argv[1]
    with open(groupfilepath,'r') as gf:
        for line in gf:
            print(line.split(,))
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
