#!/usr/bin/env python3

import sys, os, datetime, re
import pytz
from pytz import timezone

# the 'teaching' website subdirectory will have subdirectories
# for courses and those course subdirectories will have
# subdirectories for semesters.

# the rss feed for a course includes the course directory
# level, non-semester subdirectories, and the current semester
# subdirectory

# arguments to this script:
# - the absolute path to the website's root directory
# - the offering's course/semester (in that form): i.e. CS-428+828/201830
if (len(sys.argv) != 2):
    print (sys.argv[0],"must be invoked with \"<path-to-site-directory>\"")
    sys.exit()

# get site directory, make sure it ends with "/"
sitedir = (sys.argv[1])
if (not sitedir.endswith("/")):
    sitedir += "/"
teachdir = sitedir + 'teaching/'
tdp = teachdir.split('/')
ti = 0
for t in range(len(tdp)):
    #print (t,len(tdp))
    if (tdp[t]=='teaching'):
        ti = t
print('  - teaching/0_nonweb/')
print('  - teaching/1_offweb/')

for root, subdirs, files in os.walk(teachdir):
    for sd in subdirs:

        file_path = os.path.join(root, sd)
        sdp = file_path.split('/')
        if (len(sdp) <= (ti + 1)):
            print('  - ' + file_path[len(sitedir):] + '/0_nonweb/')
            print('  - ' + file_path[len(sitedir):] + '/1_offweb/')
        # elif (len(sdp) >(ti + 1) and len(sdp) <= (ti + 3)):
        elif ('-' in sdp[ti+1] and len(sdp) <= (ti + 3)):
            print('  - ' + file_path[len(sitedir):] + '/0_nonweb/')
            print('  - ' + file_path[len(sitedir):] + '/1_offweb/')
