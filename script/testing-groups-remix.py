#!/usr/bin/env python3

import sys, os, datetime, subprocess
from fileinput import FileInput
import os.path
from pathlib import Path
from random import randrange
import re

# argument to this script:
# - path to group file
# the group file is copied and pasted from the Group Overview in UR Courses
# it will look like this:
# Project 01<tab>Student1 (123456789, em1@uregina.ca),
#   Student2 (234567890, em2@uregina.ca),
#   Student3 (345678901, em3@uregina.ca),
#   Student4 (456789012, em4@uregina.ca)<tab>4
if (len(sys.argv) != 2):
  print (sys.argv[0],"must be invoked with \"<path-to-group-file>\"")
  sys.exit()

groupfilepath = sys.argv[1]
oldgrp = []
nstu = 0
with open(groupfilepath,'r') as gf:
    for line in gf:
        # strip newline
        l = line.strip('\n')
        # remove student numbers (9 digits followed by ', ') and split on tabs
        ll = (re.sub(r"\d{9}, ", "", l)).split('\t')
        # ll[0] has group name (can be disregarded)
        # ll[1] has group members separated by commas
        # ll[2] has number of group members
        lll = ll[1].split(',')
        print(lll)
        oldgrp.append(lll)
        nstu = nstu + int(ll[2])
#sys.exit()

print(oldgrp)
print (nstu)
newgrp = {}
ngn = {}
nngrps = int(nstu/3)
print("nngrps",nngrps)
for i in range(nngrps):
    newgrp[i] = []
    ngn[i] = []
#print(newgrp)
nk = 0
stu = 0
og = 0
for log in oldgrp:
    #print ('Old group:',log, og)
    for m in range(len(log)):
        grp = False
        for q in range(nngrps):
            nk = (nk + m + q) % nngrps
            if og not in ngn[nk] and len(ngn[nk]) < 3:
                ngn[nk].append(og)
                newgrp[nk].append(log[m])
                #print(log[m], ' into new group ', nk)
                stu = stu + 1
                grp = True
                break
        #print (grp,nk)
        if (grp == False):
            for q in range(nngrps):
                #nk = (nk + q) % nngrps
                nk = q
                if og not in ngn[nk] and len(ngn[nk]) < 3:
                    ngn[nk].append(og)
                    newgrp[nk].append(log[m])
                    print(log[m], ' into new group ', nk)
                    stu = stu + 1
                    grp = True
                    break
        if (grp == False):
            for q in range(nngrps):
                #nk = (nk + q) % nngrps
                nk = q
                if og not in ngn[nk] and len(ngn[nk]) == 3:
                    ngn[nk].append(og)
                    newgrp[nk].append(log[m])
                    print(log[m], ' into new group of 4', nk)
                    stu = stu + 1
                    grp = True
                    break
    og = og + 1
for x in newgrp:
    print(x,newgrp[x])
print ("STU:",stu)
sum = 0
for x in ngn:
    print(x,ngn[x])
    sum = sum + len(ngn[x])
    print(x,len(ngn[x]),sum)

sys.exit()
