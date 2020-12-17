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
        l = line.split(',')
        oldgrp.append(l)
        nstu = nstu + int(l[len(l)-1])
newgrp = {}
nngrps = int(nstu/3)
for i in range(nngrps):
    newgrp[i] = []
#print(newgrp)
nk = 1
stu = 0
for l in oldgrp:
    for m in range(1,len(l)-1):
        mgrp = 0
        nk = (nk + 1 + (m * int(nngrps/3))) % nngrps
        fg = (l[0].replace(' ','-'),l[m].strip())
        for q in range(nngrps):
            nq = (nk + q) % nngrps
            if len(newgrp[nq]) < 3:
                if any(fg[0] in s for s in newgrp[nq]):
                    pass
                    #print(stu,nq,'fail:',fg[0],'--',newgrp[nq])
                    # and fg[0] not in newgrp[nk]):
                else:
                    newgrp[nq].append(fg)
                    #print(stu,nq,'success:',fg[0],'--',newgrp[nq])
                    stu = stu + 1
                    break
            # else:
            #     nk = (nk + 1) % (nngrps + 1)
            #     if (nk == 0):
            #         nk = 1
        #print (stu,l[m].strip())

for x in newgrp:
    print(x,newgrp[x])
sys.exit()
