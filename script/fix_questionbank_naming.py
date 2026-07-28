#!/usr/bin/env python3
"""Fix QuestionBank filenames: add stem snippet and NOANSWER marker when missing.

Usage: python3 script/fix_questionbank_naming.py --dir PATH [--dry-run] [--words N]

For each .tex file in the directory, if the filename lacks a stem snippet after the
question index (e.g., '-q01-...'), the script extracts a short snippet from the
question stem and renames the file to include it. If the file contains no '\\CorrectChoice',
the script appends '-NOANSWER' to the filename. Default is dry-run; use --apply to perform renames.
"""
import os
import re
import argparse
import unicodedata


def sanitize_snippet(s, maxlen=40):
    s = unicodedata.normalize('NFKD', s)
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s-]", '', s)
    s = re.sub(r"\s+", '-', s.strip())
    if len(s) > maxlen:
        s = s[:maxlen].rstrip('-')
    s = s.strip('-')
    if not s:
        s = 'q'
    return s


def find_stem_in_file(path):
    try:
        txt = open(path, 'r', encoding='utf-8').read()
    except Exception:
        return ''
    # try to find \question followed by text on same line
    m = re.search(r"\\\\question\s*(.*)", txt)
    if m:
        stem = m.group(1).strip()
        if stem:
            return stem
    # fallback: take first non-empty line after \question
    parts = re.split(r"\\\\question", txt)
    if len(parts) < 2:
        return ''
    after = parts[1]
    for line in after.splitlines():
        s = line.strip()
        if s:
            return s
    return ''


def has_correct_choice(path):
    try:
        txt = open(path, 'r', encoding='utf-8').read()
        return '\\CorrectChoice' in txt
    except Exception:
        return False


def next_available_name(dirpath, base):
    # if base exists, append numeric suffix
    if not os.path.exists(os.path.join(dirpath, base)):
        return base
    stem, ext = os.path.splitext(base)
    i = 1
    while True:
        candidate = f"{stem}-{i}{ext}"
        if not os.path.exists(os.path.join(dirpath, candidate)):
            return candidate
        i += 1


def process_dir(dirpath, apply=False, words=6):
    renamed = []
    for fn in sorted(os.listdir(dirpath)):
        if not fn.endswith('.tex'):
            continue
        path = os.path.join(dirpath, fn)
        m = re.match(r'(.+?-q(\d{1,3}))(?:-(.*))?\.tex$', fn)
        if not m:
            # filename doesn't match expected pattern; skip
            continue
        prefix_part = m.group(1)  # e.g., 280-mtg-25-2026-q01
        existing_tail = m.group(3)  # None or text
        need_snippet = not existing_tail
        stem_snippet = ''
        if need_snippet:
            stem_text = find_stem_in_file(path)
            # take first N words
            short = ' '.join(stem_text.split()[:words])
            stem_snippet = sanitize_snippet(short)
        # check correct choice
        has_correct = has_correct_choice(path)
        noanswer_suffix = '' if has_correct else 'NOANSWER'

        new_base = prefix_part
        if stem_snippet:
            new_base = f"{new_base}-{stem_snippet}"
        if noanswer_suffix:
            new_base = f"{new_base}-{noanswer_suffix}"
        new_base = new_base + '.tex'

        if fn == new_base:
            continue

        new_base = next_available_name(dirpath, new_base)
        old_path = path
        new_path = os.path.join(dirpath, new_base)
        renamed.append((old_path, new_path))
        if apply:
            os.rename(old_path, new_path)

    return renamed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', required=True, help='QuestionBank directory to process')
    ap.add_argument('--apply', action='store_true', help='Perform renames (default: dry-run)')
    ap.add_argument('--words', type=int, default=6, help='Number of words to use for snippet')
    args = ap.parse_args()

    renamed = process_dir(args.dir, apply=args.apply, words=args.words)
    if not renamed:
        print('No files to rename')
        return
    print('Proposed renames:')
    for old, new in renamed:
        print(f"{os.path.basename(old)} -> {os.path.basename(new)}")
    if args.apply:
        print('\nRenames applied')
    else:
        print('\nDry-run: use --apply to perform renames')


if __name__ == '__main__':
    main()
