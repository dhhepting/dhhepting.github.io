import sys
from datetime import datetime

if len(sys.argv) != 2:
    print("Needs 1 argument")
    sys.exit()

with open(sys.argv[1], 'r') as mf:
    for line in mf:
        words = line.split('\"')
        mtg_fname = (words[1].split('.'))[0]
        datestr = mtg_fname.split('-',1)
        mtg_dt = datetime.strptime(datestr[1],"%d-%b-%y")
        print(mtg_dt.strftime('%Y-%m-%d'))
