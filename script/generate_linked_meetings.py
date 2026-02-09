#!/usr/bin/env python3
"""Generate `linked-meetings` for a course offering.

Usage:
  python3 script/generate_linked_meetings.py CS-280/202610 [--homepage-id 9872]

This writes `_data/teaching/CS-280/202610/linked-meetings` using
`_data/teaching/CS-280/202610/meetings.csv` as input.
"""
import argparse
import csv
import html
from pathlib import Path


def short_date(date_str: str) -> str:
    if not date_str:
        return ''
    parts = date_str.split('-')
    if len(parts) >= 3:
        return '-'.join(parts[0:3])
    return date_str


def noneish(v: str) -> bool:
    return v is None or v.strip() == '' or v.strip().lower() == 'none'


def generate(rows, homepage_id=None):
    out = []
    out.append('<h3>Links to Meeting Pages</h3>')
    out.append('<ul>')
    if homepage_id:
        out.append(f'  <li><a href="https://urcourses.uregina.ca/mod/wiki/view.php?pageid={homepage_id}#toc-3" target="_blank">Homepage</a>')
        out.append('  </li>')
        out.append(f'  <li><a href="https://urcourses.uregina.ca/mod/wiki/history.php?pageid={homepage_id}" target="_blank">Homepage History</a>')
        out.append('    <br>')
        out.append('  </li>')
    else:
        out.append('  <li>Homepage</li>')
        out.append('  <li>Homepage History</li>')
    out.append('</ul>')
    out.append('<table>')
    out.append('  <thead>')
    out.append('    <tr>')
    out.append('      <th scope="col">Meeting</th>')
    out.append('      <th scope="col">Editors (ClassWork Group)</th>')
    out.append('      <th scope="col">Page History</th>')
    out.append('    </tr>')
    out.append('  </thead>')
    out.append('  <tbody>')

    for r in rows:
        meeting = r.get('meeting', '').zfill(2)
        date = r.get('date', '')
        file = r.get('file', '')
        wikipage_id = r.get('wikipage_id', '').strip()
        wiki_ed_group = r.get('wiki_ed_group', '')

        date_short = short_date(date)
        meeting_label = f"{date_short} (Mtg {meeting})" if date_short else f"(Mtg {meeting})"

        meeting_cell = ''
        pid = wikipage_id
        if pid and not noneish(pid):
            url_view = f'https://urcourses.uregina.ca/mod/wiki/view.php?pageid={html.escape(pid)}#toc-3'
            meeting_cell = f'<a href="{url_view}" target="_blank">{html.escape(meeting_label)}</a>'
        elif file and not noneish(file):
            meeting_file_esc = html.escape(file)
            meeting_cell = f'<a href="{meeting_file_esc}" target="_blank">{html.escape(meeting_label)}</a>'
        else:
            meeting_cell = html.escape(meeting_label)

        editors_cell = '' if noneish(wiki_ed_group) else html.escape(wiki_ed_group)

        page_history_cell = ''
        if wikipage_id and not noneish(wikipage_id):
            pid = html.escape(wikipage_id)
            url = f'https://urcourses.uregina.ca/mod/wiki/history.php?pageid={pid}'
            page_history_cell = f'<a href="{url}" target="_blank">{url}</a>'

        out.append('    <tr>')
        out.append(f'      <td>{meeting_cell}</td>')
        out.append(f'      <td>{editors_cell}</td>')
        out.append(f'      <td>{page_history_cell}</td>')
        out.append('    </tr>')

    out.append('  </tbody>')
    out.append('</table>')
    out.append('')
    return '\n'.join(out)


def main():
    p = argparse.ArgumentParser(description='Generate linked-meetings from meetings.csv')
    p.add_argument('offering', help='Course offering path like CS-280/202610')
    p.add_argument('--base-dir', default='_data/teaching', help='Base data directory (default: _data/teaching)')
    p.add_argument('--input-name', default='meetings.csv', help='Input CSV file name (default: meetings.csv)')
    p.add_argument('--output-name', default='linked-meetings', help='Output file name (default: linked-meetings)')
    p.add_argument('--homepage-id', help='Optional homepage wiki pageid to link homepage/header')
    args = p.parse_args()

    offering_dir = Path(args.base_dir) / args.offering
    in_path = offering_dir / args.input_name
    out_path = offering_dir / args.output_name

    if not in_path.exists():
        print(f'Error: input file not found: {in_path}')
        raise SystemExit(2)

    rows = []
    with in_path.open(newline='') as fh:
        dr = csv.DictReader(fh)
        for row in dr:
            rows.append(row)

    html_out = generate(rows, homepage_id=args.homepage_id)
    out_path.write_text(html_out, encoding='utf-8')
    print(f'Wrote {out_path} ({len(rows)} rows)')


if __name__ == '__main__':
    main()
