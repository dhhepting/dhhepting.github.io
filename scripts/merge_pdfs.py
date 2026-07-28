#!/usr/bin/env python3
"""
Merge multiple PDFs into a single PDF using pypdf (PdfMerger).
Usage: python3 scripts/merge_pdfs.py out.pdf in1.pdf in2.pdf ...
"""
import sys
from pathlib import Path

if len(sys.argv) < 3:
    print("Usage: merge_pdfs.py out.pdf in1.pdf [in2.pdf ...]")
    raise SystemExit(1)

out = Path(sys.argv[1])
inputs = [Path(p) for p in sys.argv[2:]]

try:
    # Prefer a simple page-by-page merge using pypdf PdfReader/Writer
    from pypdf import PdfReader, PdfWriter
    writer = PdfWriter()
    any_added = False
    for p in inputs:
        if not p.exists():
            print(f"Warning: {p} not found, skipping")
            continue
        reader = PdfReader(str(p))
        for page in reader.pages:
            writer.add_page(page)
            any_added = True
    if not any_added:
        print("No pages added; exiting.")
        raise SystemExit(1)
    with open(out, "wb") as f:
        writer.write(f)
    print(f"Wrote {out}")
except Exception as e:
    # Last-resort: try PyPDF2 PdfFileMerger if available
    try:
        from PyPDF2 import PdfFileMerger
        merger = PdfFileMerger()
        for p in inputs:
            if not p.exists():
                print(f"Warning: {p} not found, skipping")
                continue
            merger.append(str(p))
        with open(out, "wb") as f:
            merger.write(f)
        print(f"Wrote {out} (via PyPDF2)")
    except Exception as e2:
        print("Failed to merge PDFs:", e)
        raise
