#!/usr/bin/env python3
"""
Generate name-only HTML poster pages per Row from the participants PDF.
Creates files `participants_row_{A..K}_names.html` with an H1 and a large-name list.
Sorts entries by first name and filters out emails containing 'heptingd+urstudent'.
Usage:
  python3 scripts/generate_name_lists.py /path/to/pdf --outdir ./ --min-rows 1
"""
from pathlib import Path
import re
import argparse
from pypdf import PdfReader

parser = argparse.ArgumentParser(description='Generate name-only HTML pages per Row')
parser.add_argument('pdf', nargs='?', default='_data/courseid_39771_participants.pdf')
parser.add_argument('--outdir', '-o', default='.', help='output directory')
parser.add_argument('--min-rows', '-m', type=int, default=1, help='minimum number of name lines (will pad)')
args = parser.parse_args()
PDF = Path(args.pdf)
OUTDIR = Path(args.outdir)
ROWS = [chr(c) for c in range(ord('A'), ord('K')+1)]
MIN_ROWS = args.min_rows

if not PDF.exists():
    raise SystemExit(f"PDF not found: {PDF}")
OUTDIR.mkdir(parents=True, exist_ok=True)

reader = PdfReader(str(PDF))
text_pages = [p.extract_text() or "" for p in reader.pages]
text = "\n\n".join(text_pages)
lines = [ln.rstrip() for ln in text.splitlines()]

# Pre-process lines to merge wrapped name lines: if a line contains an ID
# but the name appears on preceding lines (without an ID), merge them.
clean_lines = []
for i, ln in enumerate(lines):
    s = ln.strip()
    if not s:
        continue
    # Skip header/footer artifacts
    if s.lower().startswith('first name') or 'powered by tcpdf' in s.lower():
        continue
    # If this line already contains an ID, attempt to merge preceding name lines
    if re.search(r"\d{6,}", s):
        # collect any immediately preceding non-ID, non-Row lines that look like name fragments
        name_parts = []
        j = i - 1
        while j >= 0:
            prev = lines[j].strip()
            if not prev:
                j -= 1
                continue
            # stop if previous line contains an ID or the word 'Row' (likely different entry)
            if re.search(r"\d{6,}", prev) or re.search(r'Row\s*[A-K]', prev):
                break
            # heuristics: accept lines that look like names (letters, spaces, punctuation)
            if re.search(r"[A-Za-z]", prev):
                name_parts.insert(0, prev)
                j -= 1
                continue
            break
        if name_parts:
            merged = ' '.join(name_parts + [s])
            clean_lines.append(merged)
            continue
    clean_lines.append(s)

entries_by_row = {r: [] for r in ROWS}
for ln in clean_lines:
    if 'Row ' not in ln:
        continue
    m = re.search(r'Row\s*([A-K])', ln)
    if not m:
        continue
    row_letter = m.group(1)
    parts = ln.split()
    # find id and email positions
    email_idx = None
    id_idx = None
    for i, tok in enumerate(parts):
        if '@' in tok:
            email_idx = i
        if re.fullmatch(r"\d{6,}", tok):
            id_idx = i
    if id_idx is None:
        # skip lines we cannot anchor with an ID
        continue
    email = parts[email_idx] if email_idx is not None else ''
    if 'heptingd+urstudent' in email:
        continue
    name_tokens = parts[:id_idx]
    # remove trailing punctuation-only tokens
    name_tokens = [t for t in name_tokens if re.search(r"[A-Za-z]", t)]
    if not name_tokens:
        # leave placeholder for missing name
        entries_by_row.setdefault(row_letter, []).append(('', ''))
        continue
    first = name_tokens[0]
    last = ' '.join(name_tokens[1:]) if len(name_tokens) > 1 else ''
    entries_by_row.setdefault(row_letter, []).append((first, last))

# Create name-only pages
for row in ROWS:
    entries = entries_by_row.get(row, [])
    # sort by first name
    entries.sort(key=lambda x: x[0].lower())
    # pad to at least MIN_ROWS
    if len(entries) < MIN_ROWS:
        entries += [('', '')] * (MIN_ROWS - len(entries))
    # Build HTML: letter size, heading, list, JS to scale font to fit
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
    /* Larger, prominent heading */
    h1{{text-align:left;margin:0 0 0.25in 0;font-size:28pt;font-weight:700}}
    /* Left-justified list aligned to left column; allow vertical centering of the block */
    ul.name-list{{list-style:none;padding:0;margin:0;flex:1;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;max-width:100%}}
    /* Names left-justified with extra vertical padding to space lines */
    ul.name-list li{{width:100%;text-align:left;line-height:1.0;padding:0.06in 0;overflow:hidden}}
</style>
</head>
<body>
<div class="page">
    <h1>CS 280 Midterm Seating - Row {row}</h1>
  <ul class="name-list" id="names">
'''
    for (first, last) in entries:
        fullname = (first + ' ' + last).strip()
        html += f'    <li>{fullname}</li>\n'
    html += '''  </ul>
</div>
<script>
    // Scale the font size so all names fill available page height.
    (function(){
    const list = document.getElementById('names');
    const items = Array.from(list.children).filter(li=>li.textContent.trim().length>0);
    if(items.length===0){ items.push(list.children[0]); }
    const page = document.querySelector('.page');
    const headingH = document.querySelector('h1').offsetHeight;
    // available height for names (px)
    const avail = page.clientHeight - headingH - 12; 
    // compute font size so each name line (including padding) fits: use 95% of per-line space
    let perLine = Math.floor(avail / items.length);
    let font = Math.floor(perLine * 0.95);
    // clamp to reasonable bounds
    if(font < 10) font = 10;
    if(font > 400) font = 400;
    items.forEach(li=>{ li.style.fontSize = font + 'px'; });
})();
</script>
</body>
</html>'''
    outpath = OUTDIR / f"participants_row_{row}_names.html"
    outpath.write_text(html, encoding='utf-8')
    print(f"Wrote {outpath}")

print('Done')

# --- completeness check: re-parse PDF lines to produce a report of any parsed participants
all_parsed = []
for ln in lines:
    if 'Row ' not in ln:
        continue
    if ln.lower().startswith('first name'):
        continue
    if 'Powered by TCPDF' in ln:
        continue
    parts = ln.split()
    email_idx = None
    id_idx = None
    for i, tok in enumerate(parts):
        if '@' in tok:
            email_idx = i
        if re.fullmatch(r"\d{6,}", tok):
            id_idx = i
    m = re.search(r'Row\s*([A-K])', ln)
    if not m:
        continue
    row_letter = m.group(1)
    if email_idx is None or id_idx is None:
        continue
    email = parts[email_idx]
    idnum = parts[id_idx]
    name_tokens = parts[:id_idx]
    if not name_tokens:
        continue
    first = name_tokens[0]
    last = ' '.join(name_tokens[1:]) if len(name_tokens) > 1 else ''
    all_parsed.append({'first': first, 'last': last, 'id': idnum, 'email': email, 'row': row_letter, 'line': ln})

# Build set of names actually included in outputs
included = set()
for row in ROWS:
    for (first, last) in entries_by_row.get(row, []):
        if (first or last):
            included.add((first.strip(), last.strip()))

missing = []
for p in all_parsed:
    if 'heptingd+urstudent' in p['email']:
        continue
    key = (p['first'].strip(), p['last'].strip())
    if key == ('',''):
        continue
    if key not in included:
        missing.append(p)

report_path = OUTDIR / 'participants_missing_names.txt'
with open(report_path, 'w', encoding='utf-8') as f:
    if not missing:
        f.write('All parsed participants are present in generated outputs.\n')
    else:
        f.write('Missing participants (parsed from PDF but not present in outputs):\n')
        for p in missing:
            f.write(f"{p['first']} {p['last']} | {p['id']} | {p['email']} | Row {p['row']} -- {p['line']}\n")

print(f'Wrote completeness report: {report_path} ({len(missing)} missing)')
