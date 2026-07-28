#!/usr/bin/env python3
from pypdf import PdfReader
import re
from pathlib import Path
pdf_path = Path('_data/cs280participants.pdf')
reader = PdfReader(str(pdf_path))
text_pages = [p.extract_text() or '' for p in reader.pages]
lines = [ln.strip() for page in text_pages for ln in page.splitlines() if ln.strip()]
# Count lines where a 'Row X' occurs and row == E
row_e_lines = [ln for ln in lines if re.search(r'Row\s*E\b', ln)]
count_pdf_row_e_lines = len(row_e_lines)
# Count raw occurrences of 'Row E' in whole text
count_pdf_row_e_occ = sum(len(re.findall(r'Row\s*E\b', page)) for page in text_pages)
# Count names on Row E page HTML
html_path = Path('participants_row_E_names.html')
if html_path.exists():
    html = html_path.read_text(encoding='utf-8')
    items = re.findall(r'<li>(.*?)</li>', html, flags=re.S)
    items = [it.strip() for it in items if it.strip()]
    count_html = len(items)
else:
    count_html = None
print(count_pdf_row_e_lines)
print(count_pdf_row_e_occ)
print(count_html)
# optional: print each matched line for inspection
for i,ln in enumerate(row_e_lines, start=1):
    print(f"LINE {i}: {ln}")
