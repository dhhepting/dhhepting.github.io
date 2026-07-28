#!/usr/bin/env python3
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer, LTTextLine
import re
from pathlib import Path
pdf_path = Path('_data/cs280participants.pdf')
lines = []
for page_layout in extract_pages(str(pdf_path)):
    for element in page_layout:
        if isinstance(element, LTTextContainer):
            for text_line in element:
                if isinstance(text_line, LTTextLine):
                    txt = text_line.get_text().strip()
                    if txt:
                        # capture bbox
                        x0, y0, x1, y1 = text_line.bbox
                        lines.append({'text':txt,'x0':x0,'x1':x1,'y0':y0,'y1':y1})
# Count lines containing 'Row E'
row_e_lines = [ln for ln in lines if re.search(r'Row\s*E\b', ln['text'])]
# Count standalone single-letter tokens A-K
single_letter = [ln for ln in lines if re.fullmatch(r"[A-K]", ln['text'])]
# Also search for any token 'E' within lines split into tokens
e_tokens = []
for ln in lines:
    toks = re.findall(r"\b[A-K]\b", ln['text'])
    for t in toks:
        e_tokens.append((ln['text'], t, ln['x0'], ln['y0']))

print('row_e_lines_count=', len(row_e_lines))
print('single_letter_line_count=', len(single_letter))
print("e_token_count_in_lines=", len(e_tokens))
print('\nSample row_e_lines (up to 20):')
for i,ln in enumerate(row_e_lines[:20],1):
    print(i, ln['text'])
print('\nSample single_letter lines (up to 20):')
for i,ln in enumerate(single_letter[:20],1):
    print(i, ln['text'], ln['x0'], ln['y0'])
print('\nSample e_tokens (up to 50):')
for i,et in enumerate(e_tokens[:50],1):
    print(i, et)

# Compare to HTML count
html_path = Path('participants_row_E_names.html')
if html_path.exists():
    html = html_path.read_text(encoding='utf-8')
    li_count = html.count('<li>')
else:
    li_count = None
print('\nRow E HTML <li> count=', li_count)
