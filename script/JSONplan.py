import json
import re
d = {}
with open('/Users/hepting/Sites/dhhepting.github.io/_data/teaching/CS-280/202410/plan.json','r') as fp:
    d = json.load(fp)
    print(json.dumps(d, sort_keys=False, indent=4))
for m in d['meetings']:
    print('Meeting')
    print(m['next'])
    # re.findall("\d+", just)[0]
    print(re.findall(r'\bf[a-z]*', 'which foot or hand fell fastest'))
    ids = re.findall(r'id=\d+', m['next'])
    print(ids[1])
    (m['next']).replace(ids[1],ids[0])
    print(m['next'])
#print(json.dumps(d, sort_keys=False, indent=4))
#with open('/Users/hepting/Sites/dhhepting.github.io/_data/teaching/newerplan.json','w') as ofp:
    #json.dump(d, ofp, sort_keys=False, indent=4)
