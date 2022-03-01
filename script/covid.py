#!/usr/bin/env python3
import sys, re, csv

sed = {}
u1d = {}
u2d = {}
u3d = {}
allu = {}
reader = csv.DictReader(sys.stdin)
print ('COMMENTS')
for row in reader:
    se = row["(SEMH) Which search engine gave you the most helpful answer"]
    if se in sed:
        sed[se] += 1
    else:
        sed[se] = 1
    url1 = row["(MHU) URL of most helpful result"]
    if url1 in u1d:
        u1d[url1] += 1
    else:
        u1d[url1] = 1
    # if url1 in allu:
    #     allu[url1] += 1
    # else:
    #     allu[url1] = 1
    url2 = row["(SC) Comment  comment about your experience conducting this search and the helpfulness of the results found."]
    ww = url2.split()
    for x in ww:
        w = x.replace("&#039;","'").replace("&amp;quot;","\"")
        wx = re.sub('-\.,\'\"\(\)!', '', w)
        wy = wx.lower().replace(".","").replace(",","").replace("'s","").replace("\"","").replace("`","")
        if wy in u2d:
            u2d[wy] += 1
        else:
            u2d[wy] = 1
    # if url2 in allu:
    #     allu[url2] += 1
    # else:
    #     allu[url2] = 1
    # url3 = row["(url-3) URL for 3rd result"]
    # if url3 in u3d:
    #     u3d[url3] += 1
    # else:
    #     u3d[url3] = 1
    # if url3 in allu:
    #     allu[url3] += 1
    # else:
    #     allu[url3] = 1

# for w in sorted(sed):
#     print(w,sed[w])
#print('by value')
print ('SEARCH ENGINE MOST HELPFUL')
for w in sorted(sed, key=sed.get, reverse=True):
    print(w, sed[w])
# for w in sorted(allu, key=allu.get, reverse=True):
#     print(w, allu[w])
print ('URL MOST HELPFUL')
for w in sorted(u1d, key=u1d.get, reverse=True):
    print(w, u1d[w])
print ('COMMENT WORDS')
for w in sorted(u2d, key=u2d.get, reverse=True):
    print(w)
# for w in sorted(u3d, key=u3d.get, reverse=True):
#     print(w, u3d[w])
