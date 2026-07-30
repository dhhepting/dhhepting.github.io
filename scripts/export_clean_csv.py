#!/usr/bin/env python3
import csv
from pathlib import Path
inpath=Path('_data/courseid_39771_all.csv')
out=Path('_data/courseid_39771_all_clean.csv')
rows=[]
with inpath.open(encoding='utf-8', newline='') as f:
    rdr=csv.reader(f)
    hdr=next(rdr)
    # normalize header
    hdr=[h.lstrip('\ufeff').strip().strip('"') for h in hdr]
    for r in rdr:
        if not r:
            continue
        # ensure length
        while len(r)<len(hdr): r.append('')
        rec=dict(zip(hdr,r))
        # skip urstudent
        if 'heptingd+urstudent' in rec.get('Email address',''):
            continue
        first=rec.get('First name','').strip()
        last=rec.get('Last name','').strip()
        if last=='.':
            last=''
        # optionally split overly long first into first/last? keep as-is
        rec['First name']=first
        rec['Last name']=last
        rows.append(rec)
# write
with out.open('w', encoding='utf-8', newline='') as f:
    w=csv.DictWriter(f, fieldnames=hdr)
    w.writeheader()
    for r in rows:
        w.writerow(r)
print('Wrote', out)
