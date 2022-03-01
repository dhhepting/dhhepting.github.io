#!/usr/bin/env python3
import sys, re, csv

sed = {}
u1d = {}
u2d = {}
u3d = {}
allu = {}
reader = csv.DictReader(sys.stdin)
for row in reader:
    se = row["(SE) Which search engine did you use?"]
    if se in sed:
        sed[se] += 1
    else:
        sed[se] = 1
    url1 = row["(url-1) URL for 1st result"]
    if url1 in u1d:
        u1d[url1] += 1
    else:
        u1d[url1] = 1
    if url1 in allu:
        allu[url1] += 1
    else:
        allu[url1] = 1
    url2 = row["(url-2) URL for 2nd result"]
    if url2 in u2d:
        u2d[url2] += 1
    else:
        u2d[url2] = 1
    if url2 in allu:
        allu[url2] += 1
    else:
        allu[url2] = 1
    url3 = row["(url-3) URL for 3rd result"]
    if url3 in u3d:
        u3d[url3] += 1
    else:
        u3d[url3] = 1
    if url3 in allu:
        allu[url3] += 1
    else:
        allu[url3] = 1

# for w in sorted(sed):
#     print(w,sed[w])
#print('by value')
for w in sorted(sed, key=sed.get, reverse=True):
    print(w, sed[w])
for w in sorted(allu, key=allu.get, reverse=True):
    print(w, allu[w])
# for w in sorted(u1d, key=u1d.get, reverse=True):
#     print(w, u1d[w])
# for w in sorted(u2d, key=u2d.get, reverse=True):
#     print(w, u2d[w])
# for w in sorted(u3d, key=u3d.get, reverse=True):
#     print(w, u3d[w])
