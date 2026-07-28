#!/usr/bin/env python3
from pypdf import PdfReader
import re
from pathlib import Path
pdf_path = Path('_data/cs280participants.pdf')
reader = PdfReader(str(pdf_path))
lines_all = []
for p in reader.pages:
    txt = p.extract_text() or ''
    # preserve order of tokens/lines
    page_lines = [ln.strip() for ln in txt.splitlines()]
    lines_all.append(page_lines)
# flatten with page separators
flat = []
for pi,pl in enumerate(lines_all, start=1):
    for ln in pl:
        flat.append({'page':pi,'line':ln})
    flat.append({'page':pi,'line':'__PAGE_BREAK__'})

# function to detect group-letter tokens on a line
def is_group_token(s):
    if s is None: return False
    s = s.strip()
    if re.fullmatch(r'[A-K]', s):
        return True
    if re.fullmatch(r'[A-K][\).,]?', s):
        return True
    # also consider single letter with trailing spaces or bracket
    return False

# collect candidate group tokens with context
candidates = []
for i,entry in enumerate(flat):
    ln = entry['line']
    if is_group_token(ln):
        # check for nearby ID (6+ digits) within +/-3 lines
        id_found = None
        name_found = None
        for j in range(max(0,i-4), min(len(flat), i+4)):
            if re.search(r"\d{6,}", flat[j]['line']):
                id_found = re.search(r"(\d{6,})", flat[j]['line']).group(1)
            # capture probable name lines (letters and spaces, not headers)
            if re.search(r"[A-Za-z].* [A-Za-z]", flat[j]['line']):
                # heuristically choose nearest such line to the group token
                if name_found is None:
                    name_found = flat[j]['line']
        candidates.append({'index':i,'page':entry['page'],'line':ln,'id':id_found,'name':name_found})

# count E candidates
count_E = sum(1 for c in candidates if re.fullmatch(r'[Ee]', c['line'].strip() ) or re.fullmatch(r'[Ee][\).,]?', c['line'].strip()))
# For debugging, list all candidates

print('total_group_candidates=', len(candidates))
print('E_candidates=', count_E)
print('\nSample candidates (up to 100):')
for c in candidates[:200]:
    print(c)
# compare to HTML row E count
html_path = Path('participants_row_E_names.html')
if html_path.exists():
    html = html_path.read_text(encoding='utf-8')
    li_count = html.count('<li>')
else:
    li_count = None
print('\nRow E HTML <li> count=', li_count)
