#!/usr/bin/env python3
import sys, re

WC = {}
for line in sys.stdin:
    for word in line.split(" "):
        rw = re.sub('[^A-Za-z0-9 ]+','', word)
        lrw = rw.lower()
        if lrw in WC:
            WC[lrw] += 1
        else:
            WC[lrw] = 1

for w in sorted(WC):
    #print "%s: %s" % (key, mydict[key])for w in WC.sorted():
    print(w,WC[w])
print('by value')
for w in sorted(WC, key=WC.get, reverse=True):
    print(w, WC[w])
