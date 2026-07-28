#!/usr/bin/env python3
"""Regenerate the questions block in the split LaTeX to include all QuestionBank .tex files.

Usage: python3 script/refresh_split_inputs.py split.tex QuestionBank_dir
"""
import sys
import os


def gather_inputs(qdir):
    files = [f for f in os.listdir(qdir) if f.endswith('.tex')]
    files.sort()
    # produce LaTeX \input lines without extension
    lines = []
    for f in files:
        name = os.path.splitext(f)[0]
        lines.append(f"\\input{{QuestionBank/{name}}}")
    return lines


def replace_block(split_path, qdir):
    with open(split_path, 'r', encoding='utf-8') as f:
        txt = f.read()

    start = txt.find('\n\begin{questions}')
    if start == -1:
        start = txt.find('\begin{questions}')
    if start == -1:
        raise SystemExit('cannot find \begin{questions} in ' + split_path)
    # find the matching \end{questions}
    end = txt.find('\n\end{questions}', start)
    if end == -1:
        end = txt.find('\end{questions}', start)
    if end == -1:
        raise SystemExit('cannot find \end{questions} in ' + split_path)

    pre = txt[:start]
    post = txt[end+len('\n\end{questions}'):] if txt.startswith('\n', end) else txt[end+len('\end{questions}'):]

    inputs = gather_inputs(qdir)
    body = '\n\begin{questions}\n\n'
    # add a section break/title if desired
    body += '% Auto-generated inputs below\n'
    for line in inputs:
        body += line + '\n\n'
    body += '\n\end{questions}'

    with open(split_path, 'w', encoding='utf-8') as f:
        f.write(pre + body + post)


def main():
    if len(sys.argv) < 3:
        print('Usage: refresh_split_inputs.py split.tex QuestionBank_dir')
        raise SystemExit(2)
    split = sys.argv[1]
    qdir = sys.argv[2]
    replace_block(split, qdir)
    print('Updated', split)


if __name__ == '__main__':
    main()
