import json
d = {}
with open('/Users/hepting/Sites/dhhepting.github.io/_data/teaching/newplan.json','r') as fp:
    d = json.load(fp)
    print(json.dumps(d, sort_keys=False, indent=4))

with open('/Users/hepting/Sites/dhhepting.github.io/_data/teaching/newerplan.json','w') as ofp:
    json.dump(d, ofp, sort_keys=False, indent=4)
