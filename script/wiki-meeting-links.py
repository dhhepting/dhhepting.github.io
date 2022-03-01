#!/usr/bin/env python3
import sys, os, errno
from datetime import datetime, timedelta
import csv
import yaml

SITE_DIR = "/Users/hepting/Sites/dhhepting.github.io/"
MD_ROOT = "teaching/"
DATA_ROOT = "_data/teaching/"

# Make sure that script is executed properly: i.e. CS-428+828/201830
if (len(sys.argv) != 2):
	print (sys.argv[0],"must be invoked with <course>/<semester>")
	sys.exit()

reldir = (sys.argv[1]).split('/')
if (len(reldir) != 2):
	print (sys.argv[0],"must be invoked with <course>/<semester>" )
	sys.exit()

jcrs_id = reldir[0].replace("+","_")

with open(SITE_DIR + DATA_ROOT + jcrs_id + '/' + reldir[1] + '/meetings.csv', newline='') as mmmfile:
    mmmreader = csv.DictReader(mmmfile)
    for row in mmmreader:
        # generate file names for the meeting, summary, and response files
        print('[[',row['file'].replace(".html",""),']]')
