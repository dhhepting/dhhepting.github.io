#!/usr/bin/env python3
from pypdf import PdfReader
from pathlib import Path
pdf_path = Path('_data/cs280participants.pdf')
reader = PdfReader(str(pdf_path))
print('num pages=', len(reader.pages))
for i,p in enumerate(reader.pages, start=1):
    print(f'--- page {i} keys:')
    try:
        for k in p.keys():
            print('   ',k)
        ann = p.get('/Annots')
        print('  /Annots ->', type(ann), ann)
    except Exception as e:
        print('  error reading page keys:', e)

# check for AcroForm
try:
    af = reader.trailer['/Root'].get('/AcroForm')
    print('AcroForm:', af)
except Exception as e:
    print('No AcroForm or error:', e)
