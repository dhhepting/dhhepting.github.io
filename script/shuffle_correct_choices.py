#!/usr/bin/env python3
"""Shuffle correct choices across question inputs.

Usage: python3 script/shuffle_correct_choices.py input.tex --out-dir tmp_dir [--questions 1-10,12] [--seed N]

If --questions is omitted, all input questions are processed. The script creates a temporary
directory next to the input file (or `--out-dir`) containing modified question files and
writes a modified LaTeX main file named `<input>-shuffled.tex` in the same directory as the input.

Behavior:
- Finds all `\input{...}` occurrences in the main file and processes them in order.
- For each targeted question file, randomly permutes the choices so the `\CorrectChoice` moves.
- Ensures no two adjacent processed questions have the same correct-choice letter (A-E). If a
  permutation would create a duplicate with the previous question, it retries (bounded attempts).
"""
import argparse
import os
import re
import shutil
import random
import tempfile
from datetime import datetime


def find_input_paths(tex_text):
    # find \input{path} statements (not \include)
    return re.findall(r"\\input\{([^}]+)\}", tex_text)


def parse_choices_block(text):
    m = re.search(r"\\begin\{choices\}(.*?)\\end\{choices\}", text, re.S)
    if not m:
        return None, None, None
    block = m.group(1)
    # find lines starting with \choice or \CorrectChoice
    items = re.findall(r"(\\CorrectChoice|\\choice)\s+(.*?)(?=(?:\\CorrectChoice|\\choice|$))", block, re.S)
    # items is list of (marker, text)
    return m.start(1), m.end(1), items


def write_modified_question(orig_path, out_path, new_items, before, after):
    # read orig file and replace the choices block content between before..after with new content
    s = open(orig_path, 'r', encoding='utf-8').read()
    new_block = '\\begin{choices}\n'
    for marker, text in new_items:
        new_block += f"{marker} {text.strip()}\n"
    new_block += '\\end{choices}\n'
    # assemble new text
    new_s = s[:before] + new_block + s[after:]
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(new_s)


def choose_permutation(items, prev_correct_idx, max_attempts=100):
    n = len(items)
    indices = list(range(n))
    for attempt in range(max_attempts):
        perm = indices[:]
        random.shuffle(perm)
        # determine new index of the originally-correct item
        orig_correct_idx = next((i for i,(m,t) in enumerate(items) if m=='\\CorrectChoice'), 0)
        new_correct_idx = perm.index(orig_correct_idx)
        if prev_correct_idx is None or new_correct_idx != prev_correct_idx:
            # build new items in permuted order, mark correct
            new_items = []
            for new_pos,i in enumerate(perm):
                marker = '\\CorrectChoice' if new_pos==new_correct_idx else '\\choice'
                new_items.append((marker, items[i][1]))
            return new_items, new_correct_idx
    # fallback: don't permute
    orig_correct_idx = next((i for i,(m,t) in enumerate(items) if m=='\\CorrectChoice'), 0)
    new_items = []
    for i,(m,t) in enumerate(items):
        new_items.append((m,t))
    return new_items, orig_correct_idx


def process_questions(input_tex, questions=None, out_dir=None, seed=None):
    random.seed(seed)
    with open(input_tex, 'r', encoding='utf-8') as f:
        tex = f.read()
    input_paths = find_input_paths(tex)
    base_dir = os.path.dirname(input_tex)
    # resolve relative paths
    resolved = []
    for p in input_paths:
        candidate = os.path.normpath(os.path.join(base_dir, p))
        if os.path.isfile(candidate):
            resolved.append(candidate)
            continue
        # try with .tex extension
        if os.path.isfile(candidate + '.tex'):
            resolved.append(candidate + '.tex')
            continue
        # try stripping leading './'
        if p.startswith('./') and os.path.isfile(os.path.join(base_dir, p[2:])):
            resolved.append(os.path.join(base_dir, p[2:]))
            continue
        # otherwise append candidate (may not exist)
        resolved.append(candidate)

    # if questions arg given, parse indices (1-based)
    target_set = None
    if questions:
        target_set = set()
        parts = questions.split(',')
        for part in parts:
            part = part.strip()
            if '-' in part:
                a,b = part.split('-',1)
                target_set.update(range(int(a), int(b)+1))
            else:
                target_set.add(int(part))

    # prepare out_dir
    if out_dir is None:
        ts = datetime.now().strftime('%Y%m%d-%H%M%S')
        out_dir = os.path.join(base_dir, f'tmp_questions_{ts}')
    os.makedirs(out_dir, exist_ok=True)

    prev_correct_idx = None
    created = []
    for idx, orig in enumerate(resolved, start=1):
        do_process = (target_set is None) or (idx in target_set)
        if not os.path.isfile(orig):
            continue
        if not do_process:
            continue
        s = open(orig, 'r', encoding='utf-8').read()
        cbeg, cend, items = parse_choices_block(s)
        if items is None or len(items) < 2:
            # nothing to do; copy file
            outp = os.path.join(out_dir, os.path.basename(orig))
            shutil.copyfile(orig, outp)
            created.append(outp)
            continue
        # choose permutation avoiding previous correct index
        new_items, new_correct_idx = choose_permutation(items, prev_correct_idx)
        prev_correct_idx = new_correct_idx
        outp = os.path.join(out_dir, os.path.basename(orig))
        # compute absolute positions for before/after in original content
        # find begin/end positions using regex to allow replacements
        m = re.search(r"(?s)\\begin\{choices\}(.*?)\\end\{choices\}", s)
        if m:
            before = m.start()
            after = m.end()
            write_modified_question(orig, outp, new_items, before, after)
            created.append(outp)
        else:
            shutil.copyfile(orig, outp)
            created.append(outp)

    # create modified main tex replacing inputs for processed files
    new_tex = tex
    for p in input_paths:
        abs_p = os.path.normpath(os.path.join(base_dir, p))
        outp = os.path.join(out_dir, os.path.basename(abs_p))
        if os.path.exists(outp):
            # replace the path in the tex with the relative path to outp
            rel = os.path.relpath(outp, base_dir)
            new_tex = new_tex.replace(f"\\input{{{p}}}", f"\\input{{{rel}}}")

    out_main = os.path.join(base_dir, os.path.splitext(os.path.basename(input_tex))[0] + '-shuffled.tex')
    with open(out_main, 'w', encoding='utf-8') as f:
        f.write(new_tex)

    return out_main, out_dir, created


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input_tex')
    ap.add_argument('--questions', help='Comma-separated list or ranges (1-based) of question indices to process, e.g. 1-10,12')
    ap.add_argument('--out-dir', help='Directory to place modified question files (defaults to tmp in same folder)')
    ap.add_argument('--seed', type=int, help='Random seed')
    args = ap.parse_args()
    out_main, out_dir, created = process_questions(args.input_tex, questions=args.questions, out_dir=args.out_dir, seed=args.seed)
    print('Wrote modified main:', out_main)
    print('Wrote', len(created), 'modified question files to', out_dir)


if __name__ == '__main__':
    main()
