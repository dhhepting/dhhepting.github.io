#!/usr/bin/env python3
import json
import re
from pathlib import Path

in_path = Path(__file__).parents[1] / "_data" / "teaching" / "CS-280" / "202410" / "plan.json"
out_path = Path(__file__).parents[1] / "_data" / "teaching" / "CS-280" / "202410" / "plan_creole.md"

def convert_md_to_creole(md_text):
    if not md_text:
        return ''
    lines = md_text.splitlines()
    # detect any explicit list marker
    has_list = any(re.match(r"^\s*([*+-]|\d+\.)\s+", l) for l in lines)
    out_lines = []
    if not has_list:
        # single list item
        out_lines.append('* ' + md_text.strip())
        return '\n'.join(out_lines)

    for line in lines:
        if not line.strip():
            out_lines.append('')
            continue
        m = re.match(r"^([ \t]*)([*+-])\s+(.*)$", line)
        if m:
            indent = m.group(1)
            content = m.group(3)
            level = indent.count('\t') + (len(indent.replace('\t','')) // 4)
            out_lines.append('*' * (level + 1) + ' ' + content)
            continue
        m = re.match(r"^([ \t]*)(\d+)\.\s+(.*)$", line)
        if m:
            indent = m.group(1)
            content = m.group(3)
            level = indent.count('\t') + (len(indent.replace('\t','')) // 4)
            out_lines.append('#' * (level + 1) + ' ' + content)
            continue
        # fallback: treat as top-level list item
        out_lines.append('* ' + line.strip())
    return '\n'.join(out_lines)


def main():
    data = json.loads(in_path.read_text())
    meetings = data.get('meetings', [])
    parts = []
    parts.append('# CS-280 202410 — Plan converted to Creole\n')
    for m in meetings:
        mtgnbr = m.get('mtgnbr')
        date = m.get('date','')
        theme = m.get('theme','')
        parts.append(f'== Meeting {mtgnbr}: {date} — {theme} ==\n')
        # Today
        today = m.get('today','')
        if today:
            parts.append('=== Today ===')
            parts.append(convert_md_to_creole(today))
        else:
            parts.append('=== Today ===')
            parts.append('*')
        parts.append('')
        # Next
        nxt = m.get('next','')
        if nxt:
            parts.append('=== Next ===')
            parts.append(convert_md_to_creole(nxt))
        else:
            parts.append('=== Next ===')
            parts.append('*')
        parts.append('\n')

    out_path.write_text('\n'.join(parts))
    print(f'Wrote {out_path}')

if __name__ == '__main__':
    main()
