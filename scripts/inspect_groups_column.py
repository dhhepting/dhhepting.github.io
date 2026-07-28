#!/usr/bin/env python3
"""Inspect PDF with pdfplumber to find the Groups column and count 'E' entries."""
import pdfplumber
import re
from pathlib import Path
pdf_path = Path('_data/cs280participants.pdf')
with pdfplumber.open(pdf_path) as pdf:
    group_tokens = []
    samples = []
    for pi, page in enumerate(pdf.pages, start=1):
        words = page.extract_words(use_text_flow=True)
        # normalize words: each is dict with text,x0,x1,top,bottom
        # find candidate single-letter group tokens A-K
        for w in words:
            text = w['text'].strip()
            if re.fullmatch(r'[A-K]', text):
                # find nearby tokens on same line (y ranges overlap)
                y0 = float(w['top'])
                y1 = float(w['bottom'])
                # neighbors within vertical tolerance
                neighbors = [nw for nw in words if abs(float(nw['top'])-y0) < 3]
                # try to detect an ID among neighbors
                id_found = None
                name_left = ''
                for n in neighbors:
                    if re.fullmatch(r"\d{6,}", n['text']):
                        id_found = n['text']
                # build a rough name by taking tokens to left of id if present
                if id_found:
                    # tokens left of id on same line
                    tokens_left = [n for n in neighbors if float(n['x1']) < float([t for t in neighbors if t['text']==id_found][0]['x0'])]
                    tokens_left = sorted(tokens_left, key=lambda t: float(t['x0']))
                    name_left = ' '.join(t['text'] for t in tokens_left)
                group_tokens.append({'page':pi,'text':text,'x0':w['x0'],'x1':w['x1'],'top':w['top'],'bottom':w['bottom'],'id':id_found,'name_left':name_left})
                if len(samples) < 50:
                    samples.append((pi,text, w['top'], w['x0'], id_found, name_left))
    # count E tokens
    count_E = sum(1 for g in group_tokens if g['text']=='E')
    # fallback: also count occurrences of single-letter tokens matching [A-K] regardless of id
    count_all_letters = len(group_tokens)

print('detected_letter_tokens_total=', count_all_letters)
print('detected_E_tokens=', count_E)
print('\nSample detections (up to 50):')
for s in samples:
    print(s)

# Compare to HTML Row E list
html_path = Path('participants_row_E_names.html')
if html_path.exists():
    html = html_path.read_text(encoding='utf-8')
    li_count = html.count('<li>')
else:
    li_count = None
print('\nRow E HTML <li> count=', li_count)
