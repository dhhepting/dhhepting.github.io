#!/usr/bin/env python3
"""
Create HTML and PDF signout sheets and name-only sheets from _data/courseid_39772_rows.yml

Outputs (example):
  participants_row_A.html
  participants_row_A.pdf
  participants_row_A_names.html
  participants_row_A_names.pdf

Requires: ./generate_pdf.sh (uses Google Chrome headless)
"""
from pathlib import Path
import yaml
import subprocess
import sys
import re

ROOT = Path(__file__).resolve().parents[1]
YAML_PATH = ROOT / '_data' / 'courseid_39772_rows.yml'
OUT_DIR = ROOT

if not YAML_PATH.exists():
    print(f"YAML not found: {YAML_PATH}")
    sys.exit(2)

with open(YAML_PATH, 'r', encoding='utf-8') as f:
    data = yaml.safe_load(f)

ROWS = sorted(data.keys())

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

NAME_CSS = '''<style>
    @page { size: Letter portrait; margin: 0.5in; }
    html,body{height:100%;margin:0;padding:0;font-family: Arial, Helvetica, sans-serif;color:#000}
    .page{box-sizing:border-box;padding:0.5in;height:100vh;display:flex;flex-direction:column}
    h1{text-align:left;margin:0 0 0.25in 0;font-size:28pt;font-weight:700}
    ul.name-list{list-style:none;padding:0;margin:0;flex:1;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;max-width:100%}
    ul.name-list li{width:100%;text-align:left;line-height:1.0;padding:0.06in 0;overflow:hidden}
</style>'''


def make_signout_html(row, members):
    rows_needed = max(15, len(members))
    html = ["<!doctype html>", "<html lang=\"en\">", "<head>", "  <meta charset=\"utf-8\">", f"  <title>Row {row} sign-in</title>", BASE_CSS, "</head>", "<body>", "<div class=\"page\">", f"  <h1>Row {row}</h1>", "  <table>", "    <thead>", "      <tr>", "        <th class=\"col-first\">First name</th>", "        <th class=\"col-last\">Last name</th>", "        <th class=\"col-id\">ID number</th>", "        <th class=\"col-sign\">Signature</th>", "      </tr>", "    </thead>", "    <tbody>"]
    for m in members:
        first = (m.get('first_name') or '').strip()
        last = (m.get('last_name') or '').strip()
        idnum = (m.get('id') or '').strip()
        html.append(f"      <tr><td>{first}</td><td>{last}</td><td>{idnum}</td><td></td></tr>")
    for i in range(rows_needed - len(members)):
        html.append("      <tr><td></td><td></td><td></td><td></td></tr>")
    html.extend(["    </tbody>", "  </table>", "</div>", "</body>", "</html>"])
    return '\n'.join(html)


def make_name_html(row, members):
    # sort by first name
    names = [((m.get('first_name') or '').strip() + ' ' + (m.get('last_name') or '').strip()).strip() for m in members]
    names = [n for n in names if n]
    if not names:
        names = ['']
    html = ["<!doctype html>", "<html lang=\"en\">", "<head>", "  <meta charset=\"utf-8\">", f"  <title>Row {row} names</title>", NAME_CSS, "</head>", "<body>", "<div class=\"page\">", f"  <h1>Row {row}</h1>", "  <ul class=\"name-list\">"]
    for n in names:
        html.append(f"    <li>{n}</li>")
    html.extend(["  </ul>", "</div>", "</body>", "</html>"])
    return '\n'.join(html)


def safe_row_name(r):
    return re.sub(r"[^A-Za-z0-9_-]", "_", str(r))


def run_pdf(html_path, pdf_path):
    script = str(ROOT / 'generate_pdf.sh')
    if not Path(script).exists():
        print(f"generate_pdf.sh not found: {script}")
        return False
    cmd = [script, str(html_path), str(pdf_path)]
    print('Running:', ' '.join(cmd))
    subprocess.run(cmd, check=True)
    return True


for row in ROWS:
    members = data.get(row) or []
    safe = safe_row_name(row)
    # signout
    html = make_signout_html(row, members)
    html_path = OUT_DIR / f"participants_row_{safe}.html"
    html_path.write_text(html, encoding='utf-8')
    pdf_path = OUT_DIR / f"participants_row_{safe}.pdf"
    try:
        run_pdf(html_path, pdf_path)
    except subprocess.CalledProcessError:
        print(f"Failed to create PDF for {row}")

    # name-only
    name_html = make_name_html(row, members)
    name_html_path = OUT_DIR / f"participants_row_{safe}_names.html"
    name_html_path.write_text(name_html, encoding='utf-8')
    name_pdf_path = OUT_DIR / f"participants_row_{safe}_names.pdf"
    try:
        run_pdf(name_html_path, name_pdf_path)
    except subprocess.CalledProcessError:
        print(f"Failed to create name-only PDF for {row}")

print('Done')
