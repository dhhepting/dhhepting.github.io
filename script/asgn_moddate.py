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
  print (sys.argv[0],"must be invoked with \"<path-to-site-directory>\"")
  sys.exit()

# get site directory, make sure it ends with "/"
sitedir = (sys.argv[1])
print("SITE DIR: ", sitedir)
if (not sitedir.endswith("/")):
  sitedir += "/"
assign_root = sitedir + "_assignments"
print("ASSIGNMENTS ROOT: ", assign_root)

for root, subdirs, files in os.walk(assign_root):
    for filename in files:
        if (filename != ".DS_Store"):
            file_path = os.path.join(root, filename)
            fp_modtime = time.ctime(os.path.getmtime(file_path))
            fp_dt = datetime.strptime(fp_modtime,'%a %b %d %H:%M:%S %Y')
            fp_moddate = fp_dt.strftime('%d-%b-%Y')
            with FileInput(files=[file_path], inplace=True) as f:
                for line in f:
                    line = line.rstrip()
                    if "moddate:" in line:
                        line = "moddate: " + fp_moddate
                    print(line)
