#!/usr/bin/env python3
from pathlib import Path
pdf = Path('_data/cs280participants.pdf')
data = pdf.read_bytes()
# count raw byte occurrences of 'Row E'
count_bytes = data.count(b'Row E')
# count occurrences of 'Row E' case-sensitive in UTF-8-decoded text fallback
try:
    text = data.decode('utf-8', errors='ignore')
    count_text = text.count('Row E')
except:
    count_text = None
# count li in HTML
html_path = Path('participants_row_E_names.html')
if html_path.exists():
    html = html_path.read_text(encoding='utf-8')
    li_count = html.count('<li>')
else:
    li_count = None
print(count_bytes)
print(count_text)
print(li_count)
