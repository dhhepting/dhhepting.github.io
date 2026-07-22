#!/usr/bin/env python3
"""De-identify and simplify blog/archive text files.

Removes posting date/time lines, author names and initials, UI artifacts
and reduces repetitive sentences. Supports preview and in-place modes.

Usage:
  python3 script/deidentify_posts.py path/to/file --preview
  python3 script/deidentify_posts.py path/to/file --inplace
"""
import argparse
import os
import re
import sys


def parse_args():
    p = argparse.ArgumentParser(description='De-identify and simplify posts')
    p.add_argument('input', help='Input text/markdown file')
    p.add_argument('--inplace', action='store_true', help='Write de-identified file next to original with .deid suffix')
    p.add_argument('--preview', action='store_true', help='Print de-identified output to stdout instead of writing')
    return p.parse_args()


# Patterns for lines to remove entirely
WEEKDAY = r'(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)'
DATE_TIME_RE = re.compile(rf'^\s*{WEEKDAY},\s+\d{{1,2}}\s+\w+\s+\d{{4}},\s+\d{{1,2}}:\d{{2}}\s*(?:AM|PM)?\s*$', re.I)
UI_ARTIFACTS_RE = re.compile(r'^(?:Permalink|Edit|Delete|Add your comment|Total visits|Visible to participants|Completion requirements|Edited by)\b', re.I)
TAGS_RE = re.compile(r'^Tags?:', re.I)
BYLINE_RE = re.compile(r'^by\s+.+$', re.I)
INITIALS_RE = re.compile(r'^[A-Z]{1,3}\s*$')
AUTHOR_NAME_LINE = re.compile(r'^[A-Z][a-z]+(?:[ \-][A-Z][a-z]+){0,3}$')


def normalize_whitespace(text):
    # collapse multiple blank lines to two
    return re.sub(r'\n{3,}', '\n\n', text)


def split_into_paragraphs(text):
    # paragraphs are blocks separated by two or more newlines
    return re.split(r'\n\s*\n', text)


def dedupe_sentences_in_paragraph(p):
    # split into sentences, remove repeated sentences while preserving order
    parts = re.split(r'(?<=[.!?])\s+', p.strip())
    seen = set()
    out = []
    for s in parts:
        key = s.strip().lower()
        if not key:
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(s.strip())
    return ' '.join(out)


def deidentify_text(raw):
    lines = raw.splitlines()
    kept_lines = []
    skip_next_blank = False

    for i, ln in enumerate(lines):
        s = ln.strip()
        # remove explicit UI artifacts and tags
        if not s:
            kept_lines.append('')
            continue
        if UI_ARTIFACTS_RE.match(s):
            continue
        if TAGS_RE.match(s):
            continue
        if DATE_TIME_RE.match(s):
            continue
        if BYLINE_RE.match(s):
            # remove lines like 'by Jacob Goodpipe'
            continue
        if INITIALS_RE.match(s):
            # remove initials-only lines like 'DS'
            continue
        if AUTHOR_NAME_LINE.match(s):
            # likely an author name on its own line; drop it
            continue

        # remove inline 'by <name>' fragments that appear at line ends
        ln2 = re.sub(r'\bby\s+[A-Z][\w\- ]{1,60}$', '', ln)

        # remove inline editor stamps like 'Edited by Name, Wednesday, 14 January 2026, 2:57 PM'
        ln2 = re.sub(r'(?i)Edited by[^\n]*', '', ln2)

        # remove common UI fragments that may occur inline
        ln2 = re.sub(r'\bVisible to participants\b', '', ln2, flags=re.I)

        kept_lines.append(ln2.rstrip())

    # rejoin and normalize paragraphs
    text = '\n'.join(kept_lines)
    text = normalize_whitespace(text)

    paragraphs = split_into_paragraphs(text)
    processed_paras = []
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
        # If paragraph looks like a short single-sentence or list, keep as-is
        if len(p) < 200 and p.count('.') <= 1:
            # dedupe exact consecutive repeated lines
            lines_in_p = p.splitlines()
            new_lines = []
            prev = None
            for L in lines_in_p:
                if L.strip() == prev:
                    continue
                prev = L.strip()
                new_lines.append(L)
            processed_paras.append('\n'.join(new_lines))
            continue

        # long paragraph: remove repeated sentences
        processed_paras.append(dedupe_sentences_in_paragraph(p))

    out = '\n\n'.join(processed_paras)
    # final whitespace normalization
    out = normalize_whitespace(out).strip() + '\n'
    # Collapse blocks like:
    # AA\nTitle line\nDate line\nby Name\nVisible to participants... -> keep only Title line
    # Use a conservative pattern: initials (1-3 caps) + title (short) followed by 1-3 lines that include 'by' or a weekday or 'Visible'
    blk_pattern = re.compile(
        r'(?m)^[A-Z]{1,3}\s*$\n(?P<title>[^\n]{3,120})\n(?:(?:.*(?:by\s+.+|Visible to participants|'+WEEKDAY+').*\n){1,3})',
        re.IGNORECASE,
    )
    out = blk_pattern.sub(lambda m: m.group('title') + '\n', out)

    return out


def main():
    args = parse_args()
    if not os.path.isfile(args.input):
        print('Input file not found:', args.input, file=sys.stderr)
        sys.exit(2)

    with open(args.input, 'r', encoding='utf-8') as fh:
        raw = fh.read()

    out = deidentify_text(raw)

    # Heuristic: within the first window of lines, keep only the course header
    # and the immediately following title (e.g., "CS-280 (Hepting-202610)" and
    # "ClassWork Group Blog"). This collapses site navigation noise at top.
    LINES_WINDOW = 16
    COURSE_RE = re.compile(r'\b[A-Z]{2,4}-\d{3}\b')
    lines = out.splitlines()
    window_n = min(len(lines), LINES_WINDOW)
    header_idx = None
    for i in range(window_n):
        if COURSE_RE.search(lines[i]):
            header_idx = i
            break
    if header_idx is not None:
        keep = set([header_idx, header_idx + 1])
        new_window = []
        for i in range(window_n):
            if i in keep and i < len(lines):
                new_window.append(lines[i])
            else:
                # remove this line (skip)
                continue
        # reconstruct lines: new window + remaining lines after window
        lines = new_window + lines[window_n:]
        out = '\n'.join(lines).strip() + '\n'

    # Ensure probable post titles start on their own line preceded by a blank line.
    def is_title_candidate(l):
        # short line, starts with capital letter, no terminal punctuation
        if not l:
            return False
        if len(l) > 80:
            return False
        if re.search(r'[\.\?\!:]$', l.strip()):
            return False
        if not re.match(r'^[A-Z][A-Za-z0-9\-\'\u2019\(\)\.,& ]*$', l):
            return False
        # avoid lines that are just a single uppercase token like 'DS' (initials)
        if re.match(r'^[A-Z]{1,4}$', l.strip()):
            return False
        # look okay
        return True

    lines = out.splitlines()
    new_lines = []
    for i, ln in enumerate(lines):
        if i > 0 and is_title_candidate(ln) and lines[i-1].strip() != '':
            # insert a blank line before this title candidate
            new_lines.append('')
        new_lines.append(ln)
    out = '\n'.join(new_lines).strip() + '\n'

    if args.preview or not args.inplace:
        # print preview to stdout
        print(out)

    if args.inplace:
        outpath = args.input + '.deid'
        with open(outpath, 'w', encoding='utf-8') as fh:
            fh.write(out)
        print('Wrote de-identified file to', outpath, file=sys.stderr)


if __name__ == '__main__':
    main()
