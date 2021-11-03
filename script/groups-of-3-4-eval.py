#!/usr/bin/env python3

import sys, os, datetime, subprocess
from fileinput import FileInput
import os.path
from pathlib import Path
from random import randrange


# argument to this script:
# - path to group file
if (len(sys.argv) != 2):
  print (sys.argv[0],"must be invoked with \"<path-to-group-file>\"")
  sys.exit()

groupfilepath = sys.argv[1]
oldgrp = []
nstu = 0
with open(groupfilepath,'r') as gf:
    for line in gf:
        l = line.strip('\n')
        ll = l.split('\t')
        #print(ll)
        #print(line)
        #print(ll[1])
        #print(ll[2])
        lll = ll[1].split(',')
        #print(lll)
        oldgrp.append(lll)
        nstu = nstu + int(ll[2])

#print(oldgrp)
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
    print ("Line from old group:",log)
    ngn = {}
    for m in range(len(log)):
        nk = (nk + 1 + (m * int(nngrps/3))) % nngrps
        for q in range(nngrps):
            nq = (nk + q) % nngrps
            if nq not in ngn:
                ngn[nq] = 0
                print("new group:",stu,nstu,m,nq)
                if (stu < 3 * nngrps):
                    if len(newgrp[nq]) < 3:
                        newgrp[nq].append(log[m])
                        stu = stu + 1
                        break
                else:
                    print("NQ = ",nq)
                    newgrp[nq].append(log[m])
                    stu = stu + 1
                    break
            # else:
            #     nk = (nk + 1) % (nngrps + 1)
            #     if (nk == 0):
            #         nk = 1
        #print (stu,l[m].strip())
    print(ngn)
print ("STU:",stu)
#sys.exit(1)
for x in newgrp:
    print(x,newgrp[x])
sys.exit()
