#!/usr/bin/env python3
"""
Parse _data/courseid_39771_participants.pdf and generate a separate HTML sign-in sheet
for each Row (A..K). Filters out any entry whose email contains 'heptingd+urstudent'.
Each sheet will show up to 15 rows (filled with blank rows if fewer entries).
"""
from pathlib import Path
import re
import argparse
from pypdf import PdfReader

# CLI args: optional PDF path, output dir, and minimum rows per sheet
parser = argparse.ArgumentParser(description='Generate per-row participant HTML sheets from a PDF')
parser.add_argument('pdf', nargs='?', default='_data/courseid_39771_participants.pdf',
                    help='path to participants PDF (default: _data/courseid_39771_participants.pdf)')
parser.add_argument('--outdir', '-o', default='.', help='output directory for generated HTML files')
parser.add_argument('--min-rows', '-m', type=int, default=15, help='minimum number of rows per sheet')
args = parser.parse_args()

PDF = Path(args.pdf)
OUTDIR = Path(args.outdir)
ROWS = [chr(c) for c in range(ord('A'), ord('K')+1)]
MIN_ROWS = args.min_rows

if not PDF.exists():
    raise SystemExit(f"PDF not found: {PDF}")

OUTDIR.mkdir(parents=True, exist_ok=True)

text_pages = []
reader = PdfReader(str(PDF))
for p in reader.pages:
    text_pages.append(p.extract_text() or "")
text = "\n\n".join(text_pages)

lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

entries_by_row = {r: [] for r in ROWS}

for ln in lines:
    # Expect lines like: First Last ... ID email ... Row X
    if 'Row ' not in ln:
        continue
    # filter out header/footer lines
    if ln.lower().startswith('first name'):
        continue
    # skip TCPDF footer
    if 'Powered by TCPDF' in ln:
        continue
    # find email
    parts = ln.split()
    email_idx = None
    id_idx = None
    row_letter = None
    for i, tok in enumerate(parts):
        if '@' in tok:
            email_idx = i
        if re.fullmatch(r"\d{6,}", tok):
            id_idx = i
    # find 'Row <letter>' token
    m = re.search(r'Row\s*([A-K])', ln)
    if m:
        row_letter = m.group(1)
    if email_idx is None or id_idx is None or row_letter is None:
        continue
    email = parts[email_idx]
    # filter out unwanted addresses
    if 'heptingd+urstudent' in email:
        continue
    idnum = parts[id_idx]
    # all tokens before id_idx are name tokens; first token is first name, rest is last name
    name_tokens = parts[:id_idx]
    if len(name_tokens) == 0:
        continue
    first = name_tokens[0]
    last = ' '.join(name_tokens[1:]) if len(name_tokens) > 1 else ''
    entries_by_row.setdefault(row_letter, []).append((first, last, idnum))

# HTML page template (single page per file)
BASE_CSS = '''<style>
  @page { size: A4 portrait; margin: 10mm; }
  html,body{height:100%;margin:0;padding:0;font-family: Arial, Helvetica, sans-serif;color:#000}
  .page{width:210mm;height:297mm;box-sizing:border-box;padding:15mm}
  h1{font-size:22pt;margin:0 0 8pt 0}
  table{width:100%;border-collapse:collapse;border:0;table-layout:fixed}
  thead th{border-bottom:1px solid #000;padding:6px 8px;text-align:left;font-size:12pt}
  tbody tr{border-bottom:1px dashed #666}
  td{padding:8px;font-size:11pt;vertical-align:middle}
  .col-first{width:28%}
  .col-last{width:28%}
  .col-id{width:22%}
  .col-sign{width:22%}
</style>'''

for row in ROWS:
    entries = entries_by_row.get(row, [])
    rows_needed = max(MIN_ROWS, len(entries))
    html = ["<!doctype html>", "<html lang=\"en\">", "<head>", "  <meta charset=\"utf-8\">", f"  <title>Row {row} sign-in</title>", BASE_CSS, "</head>", "<body>", "<div class=\"page\">", f"  <h1>Row {row}</h1>", "  <table>", "    <thead>", "      <tr>", "        <th class=\"col-first\">First name</th>", "        <th class=\"col-last\">Last name</th>", "        <th class=\"col-id\">ID number</th>", "        <th class=\"col-sign\">Signature</th>", "      </tr>", "    </thead>", "    <tbody>"]
    # add actual entries
    for (first, last, idnum) in entries:
        html.append(f"      <tr><td>{first}</td><td>{last}</td><td>{idnum}</td><td></td></tr>")
    # pad with blank rows
    for i in range(rows_needed - len(entries)):
        html.append("      <tr><td></td><td></td><td></td><td></td></tr>")
    html.extend(["    </tbody>", "  </table>", "</div>", "</body>", "</html>"])
    outpath = OUTDIR / f"participants_row_{row}.html"
    outpath.write_text('\n'.join(html), encoding='utf-8')
    print(f"Wrote {outpath}")

print('Done')
