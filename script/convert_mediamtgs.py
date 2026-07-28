#!/usr/bin/env python3
"""
convert_mediamtgs.py

Read a course media CSV and produce a meeting media text file
(e.g. _data/teaching/CS-428/202610/mediamtgs/m02.txt).

Usage examples:
python3 convert_mediamtgs.py --meet 2 --class CS-428 --semester 202610
python3 convert_mediamtgs.py --meet 2 --class CS-428 --semester 202610 \
    --infile _data/teaching/CS-428/202610/media.csv \
    --out _data/teaching/CS-428/202610/mediamtgs/m02.txt
"""
import argparse
import csv
import os
import re
import subprocess
import sys
from collections import OrderedDict

THUMB_RE = re.compile(r'(?:[_\-](?:tn|thumb))$', re.IGNORECASE)
DIGIT_RE = re.compile(r'\d+')

def strip_ext(name: str) -> str:
    return name.rsplit('.', 1)[0]

def is_thumb(filename: str) -> bool:
    return bool(THUMB_RE.search(strip_ext(filename)))

def base_name(filename: str) -> str:
    return THUMB_RE.sub('', strip_ext(filename))

def read_media_csv(path: str):
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if not row:
                continue
            # allow header row like: meet,file,URL
            if row[0].strip().lower() == 'meet' and len(row) >= 3:
                continue
            yield row

def numeric_key_from_base(base: str):
    parts = DIGIT_RE.findall(base)
    if parts:
        return tuple(int(p) for p in parts)
    # fallback: keep non-numeric bases at the end, using the base string
    return (float('inf'), base)

def convert(infile: str, meet: str, outpath: str):
    meet_str = str(int(meet)) if meet is not None else ''
    meet_key = meet_str.zfill(2)
    print(infile)
    groups = OrderedDict()  # base -> {'thumb': url, 'full': url}
    for row in read_media_csv(infile):
        if len(row) < 3:
            continue
        row_meet = row[0].strip()
        filename = row[1].strip()
        url = row[2].strip()
        if not filename or not url:
            continue
        # match meet number: accept '2' vs '02'
        if row_meet.zfill(2) != meet_key:
            continue
        base = base_name(filename)
        if base not in groups:
            groups[base] = {'thumb': None, 'full': None}
        if is_thumb(filename):
            groups[base]['thumb'] = url
        else:
            groups[base]['full'] = url

    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    # sort bases numerically by extracted digit groups
    sorted_bases = sorted(groups.keys(), key=numeric_key_from_base)
    
    # collect warnings about missing thumbnail or fullsize images
    warnings = []
    for base in sorted_bases:
        items = groups[base]
        if items.get('thumb') and not items.get('full'):
            warnings.append(f"WARNING: {base} has thumbnail but no full-size image")
        elif items.get('full') and not items.get('thumb'):
            warnings.append(f"WARNING: {base} has full-size image but no thumbnail")
    
    with open(outpath, 'w', encoding='utf-8', newline='\n') as out:
        for base in sorted_bases:
            items = groups[base]
            label = f"Mtg {base}"
            if items.get('thumb'):
                out.write(f"* {{{{{items['thumb']} | {label} Thumbnail}}}}\n")
            if items.get('full'):
                out.write(f"[[{items['full']} | {label} Full Size]]\n")

    return warnings

def default_paths(course: str, semester: str, meet: str):
    infile = os.path.join("_data", "teaching", course, semester, "media.csv")
    outdir = os.path.join("_data", "teaching", course, semester, "mediamtgs")
    outname = f"m{str(int(meet)).zfill(2)}.txt"
    outfile = os.path.join(outdir, outname)
    return infile, outfile

def main():
    p = argparse.ArgumentParser(description="Convert media.csv -> meeting mediamtgs/mNN.txt")
    p.add_argument('--meet', required=True, help="meeting number (e.g. 2)")
    p.add_argument('--class', dest='course', required=True, help="course directory (e.g. CS-428)")
    p.add_argument('--semester', required=True, help="semester directory (e.g. 202610)")
    p.add_argument('--infile', help="input CSV (default derived from class+semester)")
    p.add_argument('--out', help="output txt file (default derived from class+semester)")
    args = p.parse_args()

    infile = args.infile
    out = args.out
    if not infile or not out:
        default_in, default_out = default_paths(args.course, args.semester, args.meet)
        infile = infile or default_in
        out = out or default_out
    # If media CSV doesn't exist, run sharemedia.py to attempt to create it
    workspace_root = os.getcwd()
    def run_sharemedia():
        share_cmd = [sys.executable, os.path.join("script", "sharemedia.py"), workspace_root, os.path.join(args.course, args.semester), str(args.meet)]
        print(f"Running sharemedia to populate media CSV: {' '.join(share_cmd)}")
        try:
            proc = subprocess.run(share_cmd, check=False, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            print(proc.stdout)
            return proc.returncode == 0
        except Exception as e:
            print(f"Error running sharemedia.py: {e}")
            return False

    if not os.path.exists(infile):
        print(f"Input file not found: {infile} — attempting to run sharemedia.py to create it")
        run_sharemedia()
        if not os.path.exists(infile):
            raise SystemExit(f"Input file not found after running sharemedia: {infile}")

    # If media.csv exists but contains no entries for the requested meeting, run sharemedia.py to refresh
    def media_has_meet_entries(path, meet):
        key = str(int(meet)).zfill(2)
        try:
            for row in read_media_csv(path):
                if len(row) >= 3:
                    row_meet = str(row[0]).strip().zfill(2)
                    if row_meet == key:
                        return True
        except Exception:
            return False
        return False

    if not media_has_meet_entries(infile, args.meet):
        print(f"No entries for meet {args.meet} in {infile} — running sharemedia.py to refresh media.csv")
        run_sharemedia()
        # re-check
        if not media_has_meet_entries(infile, args.meet):
            print(f"Warning: still no entries for meet {args.meet} after running sharemedia.py")

    warnings = convert(infile, args.meet, out)
    print(f"Wrote {out}")

    if warnings:
        for w in warnings:
            print(w)
        # attempt to repair missing thumbnails by running sharemedia.py
        print("Running sharemedia.py to attempt to complete missing media pairs...")
        workspace_root = os.getcwd()
        share_cmd = [sys.executable, os.path.join("script", "sharemedia.py"), workspace_root, os.path.join(args.course, args.semester), str(args.meet)]
        try:
            proc = subprocess.run(share_cmd, check=False, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            print(proc.stdout)
        except Exception as e:
            print(f"Error running sharemedia.py: {e}")

        # re-run conversion to pick up any newly-created thumbnails
        print("Re-running conversion to update mediamtgs after sharemedia run...")
        warnings2 = convert(infile, args.meet, out)
        print(f"Wrote {out} (after sharemedia)")
        if warnings2:
            for w in warnings2:
                print(w)

if __name__ == "__main__":
    main()