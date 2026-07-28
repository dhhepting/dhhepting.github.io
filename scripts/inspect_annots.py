#!/usr/bin/env python3
from pypdf import PdfReader
from pathlib import Path
pdf_path = Path('_data/cs280participants.pdf')
reader = PdfReader(str(pdf_path))
for i,p in enumerate(reader.pages, start=1):
    ann = p.get('/Annots')
    print(f'Page {i} annots:', type(ann), 'len' if ann else None)
    if ann:
        for a in ann:
            obj = a.get_object()
            keys = list(obj.keys())
            print('  Annot keys:', keys)
            for k in keys:
                try:
                    v = obj.get(k)
                    print('    ', k, '->', v)
                except Exception as e:
                    print('    ', k, '-> error', e)
