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
nngrps = int(nstu/3)
print("nngrps",nngrps)
for i in range(nngrps):
    newgrp[i] = []
#print(newgrp)
nk = 1
stu = 0
for log in oldgrp:
    print ("Old group:",log)
    #ngn = {}
    for m in range(len(log)):
        nk = (nk + 1 + (m * int(nngrps/3))) % nngrps
        for q in range(nngrps):
            nq = (nk + q) % nngrps
            #if nq not in ngn:
                #ngn[nq] = 0
            if (stu < (3 * nngrps)):
                if len(newgrp[nq]) < 3:
                    newgrp[nq].append(log[m])
                    print(log[m], ' into new group ', nq)
                    stu = stu + 1
                    break
            else:
                print("NQ = ",nq)
                newgrp[nq].append(log[m])
                stu = stu + 1
                break
            #print(ngn)
            # else:
            #     nk = (nk + 1) % (nngrps + 1)
            #     if (nk == 0):
            #         nk = 1
        #print (stu,l[m].strip())
    #print(ngn)

#sys.exit(1)
for x in newgrp:
    print(x,newgrp[x])
print ("STU:",stu)
#print(ngn)
sys.exit()
