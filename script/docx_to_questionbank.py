#!/usr/bin/env python3
"""Extract MCQs from a .docx and write LaTeX question files.

Usage: python3 script/docx_to_questionbank.py input.docx output_dir base_name

Example: python3 script/docx_to_questionbank.py "cs280 mcqs.docx" \
    _data/teaching/CS-280/202610/QuestionBank missing-mid-2026
"""
import sys
import os
import re
import unicodedata
import zipfile
import xml.etree.ElementTree as ET


def docx_paragraphs(path):
    with zipfile.ZipFile(path) as z:
        with z.open('word/document.xml') as f:
            tree = ET.parse(f)
    root = tree.getroot()
    # Namespaces
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    paras = []
    for p in root.findall('.//w:p', ns):
        texts = [t.text for t in p.findall('.//w:t', ns) if t.text]
        txt = ''.join(texts).strip()
        if txt:
            paras.append(txt)
    return paras


def is_option_line(s):
    return bool(re.match(r'^[A-Ea-e]\b[\).:\s]|^[A-Ea-e][\.]\s|^[a-e][\)]', s))


def normalize_option_line(s):
    # Remove leading option marker like 'A.', 'a)', 'B ' etc
    # If the first two chars are letters (e.g., 'Apocalypse'), it's not a marker
    if len(s) > 1 and s[0].isalpha() and s[1].isalpha():
        return None, s
    m = re.match(r'^([A-Ea-e])\s*[\).:\-]?\s*(.*)', s)
    if m:
        return m.group(1).upper(), m.group(2).strip()
    # fallback: first char letter
    # No explicit letter marker found; treat whole string as the option text
    return None, s


def parse_paragraphs(paras):
    blocks = []
    i = 0
    while i < len(paras):
        p = paras[i]
        # detect question start
        if re.match(r'^(?:Question[:\s]|Q[:\-\s]|Q\d|Q\.)', p, re.I) or p.endswith('?'):
            # gather question and following option lines
            stem = p
            i += 1
            options = []
            trailer = []
            while i < len(paras):
                q = paras[i]
                # If option lines are explicitly lettered, use that
                if is_option_line(q):
                    options.append(q)
                    i += 1
                    continue
                # If options are unlabeled (common in exported quizzes), accept the next 2-6 lines
                # as options until we hit a new question (line ending with '?') or a 'Correct' trailer.
                if not q.endswith('?') and not re.match(r'^(?:Question[:\s]|Q[:\-\s]|Q\d|Q\.)', q, re.I):
                    # heuristic: take unlabeled option lines up to 6 entries
                    # but stop if we see a trailer like 'Correct answer'
                    if re.search(r'correct|ans(wer)?\b', q, re.I):
                        trailer.append(q)
                        i += 1
                        continue
                    # treat as option
                    options.append(q)
                    i += 1
                    # If we've accumulated 6 options, break out to avoid runaway
                    if len(options) >= 6:
                        break
                    continue
                # lines like 'Correct answer: B' or 'Answer: B' or 'CORRECT: c'
                if re.search(r'correct|ans(wer)?\b', q, re.I):
                    trailer.append(q)
                    i += 1
                    continue
                # if next paragraph looks like a new question, break
                if re.match(r'^(?:Question[:\s]|Q[:\-\s]|Q\d|Q\.)', q, re.I) or q.endswith('?'):
                    break
                # Sometimes options are lowercase letters 'a) ...' without marker detected
                if re.match(r'^[a-e]\)', q, re.I):
                    options.append(q)
                    i += 1
                    continue
                # otherwise stop gathering
                break
            blocks.append({'stem': stem, 'options': options, 'trailer': trailer})
        else:
            i += 1
    return blocks


def find_correct_letters(options, trailer):
    # search for inline markers in options first
    correct = set()
    cleaned_opts = []
    for idx, opt in enumerate(options):
        letter, text = normalize_option_line(opt)
        # assign sequential letters if options were unlabeled
        if letter is None:
            letter = chr(ord('A') + idx)
        # detect '(Correct' or 'Correct Answer' inside option
        if re.search(r'correct', text, re.I):
            correct.add(letter)
            # remove marker
            text = re.sub(r'\(?[Cc]orrect[^)\n]*\)?', '', text).strip(' .:;')
        cleaned_opts.append((letter, text))

    # if trailer contains a 'Correct' line with a letter, parse
    for t in trailer:
        m = re.search(r'([A-Ea-e])\b', t)
        if m:
            correct.add(m.group(1).upper())
        else:
            # maybe spelled like 'Correct answer: B. EVALUATE...'
            m2 = re.search(r'Correct\s*[:\-]?\s*([A-Ea-e])', t, re.I)
            if m2:
                correct.add(m2.group(1).upper())

    return cleaned_opts, sorted(correct)


def latex_escape(s):
    if not s:
        return s
    # normalize unicode to NFKC and replace common typographic chars
    s = unicodedata.normalize('NFKC', s)
    # common replacements for typographic punctuation
    typ_map = {
        '\u2018': "'",  # left single quote
        '\u2019': "'",  # right single quote
        '\u201c': '"',  # left double quote
        '\u201d': '"',  # right double quote
        '\u2013': '-',   # en dash
        '\u2014': '--',  # em dash
        '\u2026': '...', # ellipsis
        '\u00b0': '\\degree{}',
    }
    for k, v in typ_map.items():
        s = s.replace(k, v)

    # replace backslash first with textbackslash
    s = s.replace('\\', r'\\textbackslash{}')
    # common LaTeX special characters (single backslash escapes)
    subs = {
        '%': r'\\%',
        '&': r'\\&',
        '#': r'\\#',
        '_': r'\\_',
        '{': r'\\{',
        '}': r'\\}',
        '$': r'\\$',
        '~': r'\\textasciitilde{}',
        '^': r'\\^{}',
    }
    for k, v in subs.items():
        s = s.replace(k, v)
    # collapse excessive whitespace
    s = re.sub(r"\s+", ' ', s).strip()
    return s


def write_latex_files(blocks, out_dir, base_name, start_idx=1):
    os.makedirs(out_dir, exist_ok=True)
    idx = start_idx
    created = []
    for b in blocks:
        if len(b['options']) < 2:
            continue
        cleaned_opts, correct = find_correct_letters(b['options'], b['trailer'])
        fname = f"{base_name}-q{idx:03d}.tex"
        path = os.path.join(out_dir, fname)
        with open(path, 'w') as f:
            stem = latex_escape(b['stem'].strip())
            f.write('\\question ' + stem + '\n')
            f.write('\\begin{choices}\n')
            for letter, text in cleaned_opts:
                text = latex_escape(text)
                if letter in correct:
                    f.write('\\CorrectChoice ' + text + '\n')
                else:
                    f.write('\\choice ' + text + '\n')
            f.write('\\end{choices}\n')
        created.append(path)
        idx += 1
    return created


def next_start_index(out_dir, base_name):
    # find existing files base_name-qNNN.tex and return next index
    m = re.compile(re.escape(base_name) + r'-q(\d{3})\.tex$')
    maxn = 0
    if os.path.isdir(out_dir):
        for fn in os.listdir(out_dir):
            mm = m.search(fn)
            if mm:
                n = int(mm.group(1))
                if n > maxn:
                    maxn = n
    return maxn + 1


def main():
    if len(sys.argv) < 4:
        print('Usage: docx_to_questionbank.py input.docx output_dir base_name')
        sys.exit(2)
    inp = sys.argv[1]
    out_dir = sys.argv[2]
    base = sys.argv[3]
    paras = docx_paragraphs(inp)
    blocks = parse_paragraphs(paras)
    start = next_start_index(out_dir, base)
    created = write_latex_files(blocks, out_dir, base, start)
    print(f'Created {len(created)} files in {out_dir}')
    for c in created[:10]:
        print('  ' + c)


if __name__ == '__main__':
    main()
