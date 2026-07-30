#!/usr/bin/env python3
"""Read CSV (courseid_39771_all.csv) and regenerate participants_row_{A..K}.html and participants_row_{A..K}_names.html
Usage: python3 scripts/apply_csv_to_pages.py courseid_39771_all.csv
"""
import csv
import re
from pathlib import Path
import sys

csv_path = Path(sys.argv[1]) if len(sys.argv)>1 else Path('courseid_39771_all.csv')
OUTDIR = Path('.')
ROWS = [chr(c) for c in range(ord('A'), ord('K')+1)]
entries_by_row = {r: [] for r in ROWS}

with csv_path.open(newline='', encoding='utf-8') as f:
    rdr = csv.reader(f)
    # parse header and normalize field names (strip BOM, surrounding quotes, whitespace)
    raw_header = next(rdr)
    norm_header = []
    for h in raw_header:
        if h is None:
            norm_header.append('')
            continue
        hh = h.strip()
        # remove BOM if present
        hh = hh.lstrip('\ufeff')
        # strip surrounding quotes
        if hh.startswith('"') and hh.endswith('"'):
            hh = hh[1:-1]
        norm_header.append(hh.strip())
    for row in rdr:
        if not row:
            continue
        # build dict mapping
        rec = {k: (v.strip() if v is not None else '') for k, v in zip(norm_header, row)}
        email = rec.get('Email address','') or rec.get('Email','') or ''
        if 'heptingd+urstudent' in email:
            continue
        groups = rec.get('Groups','')
        m = re.search(r'Row\s*([A-K])', groups)
        if not m:
            continue
        r = m.group(1)
        first = (rec.get('First name','') or '').strip()
        last = (rec.get('Last name','') or '').strip()
        idnum = (rec.get('ID number','') or '').strip()
        entries_by_row.setdefault(r,[]).append({'first':first,'last':last,'id':idnum,'email':email})

# Write table pages
for row in ROWS:
    entries = entries_by_row.get(row, [])
    # keep original order from CSV
    # build table HTML
    html = []
    html.append('<!doctype html>')
    html.append('<html lang="en">')
    html.append('<head>')
    html.append('  <meta charset="utf-8">')
    html.append(f'  <title>Row {row} sign-in</title>')
    html.append('<style>')
    html.append('  @page { size: A4 portrait; margin: 10mm; }')
    html.append('  html,body{height:100%;margin:0;padding:0;font-family: Arial, Helvetica, sans-serif;color:#000}')
    html.append('  .page{width:210mm;height:297mm;box-sizing:border-box;padding:15mm}')
    html.append('  h1{font-size:22pt;margin:0 0 8pt 0}')
    html.append('  table{width:100%;border-collapse:collapse;border:0;table-layout:fixed}')
    html.append('  thead th{border-bottom:1px solid #000;padding:6px 8px;text-align:left;font-size:12pt}')
    html.append('  tbody tr{border-bottom:1px dashed #666}')
    html.append('  td{padding:8px;font-size:11pt;vertical-align:middle}')
    html.append('  .col-first{width:28%}')
    html.append('  .col-last{width:28%}')
    html.append('  .col-id{width:22%}')
    html.append('  .col-sign{width:22%}')
    html.append('</style>')
    html.append('</head>')
    html.append('<body>')
    html.append('<div class="page">')
    html.append(f'  <h1>Row {row}</h1>')
    html.append('  <table>')
    html.append('    <thead>')
    html.append('      <tr>')
    html.append('        <th class="col-first">First name</th>')
    html.append('        <th class="col-last">Last name</th>')
    html.append('        <th class="col-id">ID number</th>')
    html.append('        <th class="col-sign">Signature</th>')
    html.append('      </tr>')
    html.append('    </thead>')
    html.append('    <tbody>')
    for e in entries:
        f = e['first'] if e['first'] else '.'
        l = e['last'] if e['last'] else ''
        idn = e['id'] if e['id'] else ''
        html.append(f'      <tr><td>{f}</td><td>{l}</td><td>{idn}</td><td></td></tr>')
    # pad to 15 rows
    for _ in range(max(0,15-len(entries))):
        html.append('      <tr><td></td><td></td><td></td><td></td></tr>')
    html.append('    </tbody>')
    html.append('  </table>')
    html.append('</div>')
    html.append('</body>')
    html.append('</html>')
    out = OUTDIR / f'participants_row_{row}.html'
    out.write_text('\n'.join(html), encoding='utf-8')
    print('Wrote', out)

# Write name-only pages (sorted by first name)
for row in ROWS:
    entries = entries_by_row.get(row, [])
    names = [(e['first'], e['last']) for e in entries]
    names = sorted(names, key=lambda x: x[0].lower() if x[0] else '')
    # build html
    html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CS 280 Midterm Seating - Row {row}</title>
<style>
    @page {{ size: Letter portrait; margin: 0.5in; }}
    html,body{{height:100%;margin:0;padding:0;font-family: Arial, Helvetica, sans-serif;color:#000}}
    .page{{box-sizing:border-box;padding:0.5in;height:100vh;display:flex;flex-direction:column}}
    h1{{text-align:left;margin:0 0 0.25in 0;font-size:28pt;font-weight:700}}
    ul.name-list{{list-style:none;padding:0;margin:0;flex:1;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;max-width:100%}}
    ul.name-list li{{width:100%;text-align:left;line-height:1.0;padding:0.06in 0;overflow:hidden}}
</style>
</head>
<body>
<div class="page">
    <h1>CS 280 Midterm Seating - Row {row}</h1>
  <ul class="name-list" id="names">
'''
    for first,last in names:
        # prefer "First Last" but avoid placeholder dot in last name
        if first and last and last != '.':
            fullname = f"{first} {last}"
        elif first:
            fullname = first
        elif last and last != '.':
            fullname = last
        else:
            fullname = '.'
        html += f'    <li>{fullname}</li>\n'
    html += '''  </ul>
</div>
<script>
    (function(){
    const list = document.getElementById('names');
    const items = Array.from(list.children).filter(li=>li.textContent.trim().length>0);
    if(items.length===0){ items.push(list.children[0]); }
    const page = document.querySelector('.page');
    const headingH = document.querySelector('h1').offsetHeight;
    const avail = page.clientHeight - headingH - 12; 
    let perLine = Math.floor(avail / items.length);
    let font = Math.floor(perLine * 0.95);
    if(font < 10) font = 10;
    if(font > 400) font = 400;
    items.forEach(li=>{ li.style.fontSize = font + 'px'; });
})();
</script>
</body>
</html>'''
    out = OUTDIR / f'participants_row_{row}_names.html'
    out.write_text(html, encoding='utf-8')
    print('Wrote', out)

print('Done')
