#!/usr/bin/env python3
"""Split a TeX file containing \question entries into separate question files.

Usage:
  python3 script/split_tex_to_questionbank.py input.tex [out_dir]

Behavior:
- Scans the input TeX for occurrences of '\\question' and captures each question block
  up to the next '\\question' or end of file.
- For each question, writes a file in the QuestionBank directory (or provided out_dir).
- Filenames use the input file's base name as a prefix, include the question index, and
  a short sanitized snippet of the question stem to help identification.

Example output filename:
  280-mtg-25-2026-q01-what-best-defines-sexual-deepfakes.tex

Files are written but not committed.
"""
import sys
import os
import re
import argparse
import unicodedata


def sanitize_snippet(s, maxlen=40):
    s = unicodedata.normalize('NFKD', s)
    s = s.lower()
    # keep only letters, numbers, spaces
    s = re.sub(r"[^a-z0-9\s-]", '', s)
    s = re.sub(r"\s+", '-', s.strip())
    if len(s) > maxlen:
        s = s[:maxlen].rstrip('-')
    s = s.strip('-')
    if not s:
        s = 'q'
    return s


def extract_questions(tex_text):
    # Split on \question tokens; keep token with following content
    parts = re.split(r'(\\question)', tex_text)
    questions = []
    # parts will be like ['', '\\question', ' text1 ', '\\question', ' text2', ...]
    i = 0
    while i < len(parts):
        if parts[i] == '\\question':
            content = parts[i+1] if i+1 < len(parts) else ''
            # find until next \question -- since split separates tokens, content here is until next token
            questions.append(content.strip())
            i += 2
        else:
            i += 1
    return questions


def get_stem_and_choices(qtext):
    # Attempt to split stem and choices: look for \begin{choices}
    m = re.search(r"\\begin\{choices\}", qtext)
    if m:
        stem = qtext[:m.start()].strip()
        rest = qtext[m.start():].strip()
    else:
        # fallback: first line is stem
        lines = qtext.splitlines()
        stem = lines[0].strip() if lines else ''
        rest = '\n'.join(lines[1:]) if len(lines) > 1 else ''
    return stem, rest


def write_question_file(out_dir, prefix, idx, stem, body):
    snippet = sanitize_snippet(stem)
    fname = f"{prefix}-q{idx:02d}-{snippet}.tex"
    # avoid overly long names
    fname = fname[:120]
    path = os.path.join(out_dir, fname)
    with open(path, 'w', encoding='utf-8') as f:
        # write \question plus stem/body as in original
        content = "\\question " + stem + "\n\n" + body.strip() + "\n"
        f.write(content)
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input', help='Input TeX file to split')
    ap.add_argument('out_dir', nargs='?', help='Output QuestionBank directory (defaults to same folder/QuestionBank)')
    args = ap.parse_args()

    inp = args.input
    if not os.path.isfile(inp):
        print('Input file not found:', inp)
        sys.exit(2)

    base_dir = os.path.dirname(inp)
    basename = os.path.splitext(os.path.basename(inp))[0]
    default_qb = os.path.join(base_dir, 'QuestionBank')
    out_dir = args.out_dir or default_qb
    os.makedirs(out_dir, exist_ok=True)

    tex = open(inp, 'r', encoding='utf-8').read()
    qblocks = extract_questions(tex)
    created = []
    for i, qb in enumerate(qblocks, start=1):
        stem, body = get_stem_and_choices(qb)
        # keep a short stem for naming; use first 6-8 words if stem is long
        short_stem = ' '.join(stem.split()[:8])
        path = write_question_file(out_dir, basename, i, short_stem, body)
        created.append(path)

    print(f'Extracted {len(created)} questions to {out_dir}')
    for p in created[:10]:
        print('  ' + p)


if __name__ == '__main__':
    main()
