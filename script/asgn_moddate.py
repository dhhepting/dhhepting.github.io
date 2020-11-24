#!/usr/local/bin/python3

import sys, os, datetime, subprocess
from fileinput import FileInput
import os.path, time
from datetime import datetime, timezone
from pathlib import Path
from pytz import timezone

# arguments to this script:
# - the absolute path to the website's local root directory
if (len(sys.argv) != 2):
  print (sys.argv[0],"must be invoked with \"<path-to-site-directory>\"")
  sys.exit()

# get site directory, make sure it ends with "/"
sitedir = (sys.argv[1])
# print("SITE DIR: ", sitedir)
if (not sitedir.endswith("/")):
  sitedir += "/"
assign_root = sitedir + "_assignments"
#print("ASSIGNMENTS ROOT: ", assign_root)

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
            #print(file_path)
            with open(file_path,'r',encoding='utf-8') as f:
                file_moddate = ""
                #print("scanning file:",f)
                for fline in f:
                    #line = line.decode("utf-8").rstrip().split()
                    line = fline.rstrip().split()
                    if len(line) > 0 and "moddate:" in line[0]:
                        #print(line[0],cur_moddate)
                        if len(line) >= 2:
                            file_moddate = line[1]
                        #print(line[0],file_moddate,cur_moddate,file_moddate != cur_moddate)
                        if file_moddate != cur_moddate:
                            print ("Update ",file_path," : ",file_moddate,cur_moddate)
                            update = 1
            if (update):
                with FileInput(files=[file_path], inplace=True) as f:
                    for fline in f:
                        #line = fline.decode("utf-8").rstrip()
                        line = fline.rstrip()
                        if "moddate:" in line:
                            print("moddate:",cur_moddate)
                        else:
                            print(line)
            #print(time.ctime(os.path.getmtime(file_path)))
