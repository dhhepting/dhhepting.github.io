#!/usr/bin/env python3

import sys, os, datetime, subprocess
from fileinput import FileInput
import os.path
from pathlib import Path
from random import randrange


# arguments to this script:
# - the absolute path to the website's local root directory
if (len(sys.argv) != 2):
  print (sys.argv[0],"must be invoked with \"<path-to-group-file>\"")
  sys.exit()

# get site directory, make sure it ends with "/"
groupfilepath = sys.argv[1]
og = []
nstu = 0
with open(groupfilepath,'r') as gf:
    for line in gf:
        l = line.split(',')
        og.append(l)
        nstu = nstu + int(l[len(l)-1])
ng = {}
grp = int(nstu/3)
for i in range(grp):
    ng[i+1] = []
nk = 1
stu = 0
for l in og:
    for m in range(1,len(l)-1):
        mgrp = 0
        nk = (nk + 1 + int(grp/3) + randrange(3)) % (grp + 1)
        if (nk == 0):
            nk = 1
        fg = '(' + l[0] + ')'
        for q in range(grp):
            if (len(ng[nk]) < 3 and fg not in ng[nk]):
                ng[nk].append(fg)
                stu = stu + 1
                break
            else:
                nk = (nk + 1) % (grp + 1)
                if (nk == 0):
                    nk = 1
        print (stu,nstu,l[m])

for x in ng:
    print(x,ng[x])
sys.exit()
