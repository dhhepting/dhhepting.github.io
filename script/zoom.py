#!/usr/bin/env python3
import sys, os, errno #, datetime, subprocess
from datetime import datetime, timedelta
#from subprocess import Popen, PIPE
import csv
import glob
import yaml

#tdt = datetime.today().strftime("%d-%b-%y")
#ydt = datetime()
#print ("TODAY: ",tdt)
#print ("NOW: ",datetime.now()) #.strftime("%d-%b-%y"))

SITE_DIR = "/Users/hepting/Sites/dhhepting.github.io/"
MD_ROOT = "teaching/"
HTML_ROOT = "_site/teaching/"
DATA_ROOT = "_data/teaching/"

# Make sure that script is executed properly: i.e. CS-428+828/201830
if (len(sys.argv) < 2):
	print (sys.argv[0],"must be invoked with <participant.csv> files")
	sys.exit()
# find offering indicated by arguments and load meeting days
pfiles = glob.glob('/Users/hepting/Sites/dhhepting.github.io/teaching/CS-428+828/202030/0_nonweb/zoom/reports/*_participants.csv')
emd = {}
for pf in pfiles:
    print(pf)
    with open(pf, newline='') as partfile:
        offreader = csv.DictReader(partfile)
        for row in offreader:
            if row['Name (Original Name)'] not in emd:
                emd[row['Name (Original Name)']] = []
            if row['User Email'] not in emd[row['Name (Original Name)']]:
                emd[row['Name (Original Name)']].append(row['User Email'])#print (row['Name (Original Name)'], row['User Email'], row['Total Duration (Minutes)'])
        #if (row['semester'] == reldir[1] and row['id'] == reldir[0]):
            # load necessary info, if offering not found then quit
for ppp in emd:
    print (ppp,emd[ppp])
