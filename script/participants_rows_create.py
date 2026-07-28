#!/usr/bin/env python3
"""
Generate per-row participant lists and signout sheets from a participants CSV.

Defaults:
  input: _data/courseid_39772_participants.csv
  outputs:
    - _data/courseid_39772_rows.yml  (YAML mapping row -> participants)
    - participants_rows/<ROW>.md      (markdown signout sheet per row)

Usage:
  python3 script/participants_rows_create.py
  python3 script/participants_rows_create.py --input path/to.csv --outdir participants_rows
"""
import csv
import re
import argparse
import os
import sys

try:
    import yaml
except Exception:
    yaml = None


ROW_RE = re.compile(r"Midterm Row\s*([A-Za-z0-9]+)", re.IGNORECASE)


def extract_midterm_row(groups_field):
    if not groups_field:
        return None
    # try common separators
    for part in re.split(r"[;|]", groups_field):
        m = ROW_RE.search(part)
        if m:
            return m.group(1)
    for part in groups_field.split(","):
        m = ROW_RE.search(part)
        if m:
            return m.group(1)
    m = ROW_RE.search(groups_field)
    return m.group(1) if m else None


def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    return rows


def group_by_row(rows):
    by_row = {}
    for r in rows:
        groups = r.get("Groups") or r.get("Groups ") or r.get("Groups\r") or ""
        row = extract_midterm_row(groups)
        if not row:
            row = "Unassigned"
        if row not in by_row:
            by_row[row] = []
        by_row[row].append({
            "first_name": (r.get("First name","") or "").strip(),
            "last_name": (r.get("Last name","") or "").strip(),
            "id": r.get("ID number","") or "",
            "email": r.get("Email address","") or "",
            "groups": groups,
        })
    for k in by_row:
        by_row[k].sort(key=lambda p: (p.get("last_name",""), p.get("first_name","")))
    return by_row


def write_yaml(by_row, outpath):
    if yaml:
        with open(outpath, "w", encoding="utf-8") as f:
            yaml.safe_dump(by_row, f, sort_keys=True, allow_unicode=True)
    else:
        # fallback: write a simple YAML-like file
        with open(outpath, "w", encoding="utf-8") as f:
            for row, members in sorted(by_row.items()):
                f.write(f"{row}:\n")
                for m in members:
                    f.write(f"  - first_name: \"{m['first_name']}\"\n")
                    f.write(f"    last_name: \"{m['last_name']}\"\n")
                    f.write(f"    id: \"{m['id']}\"\n")
                    f.write(f"    email: \"{m['email']}\"\n")


def write_markdown_sheets(by_row, outdir, title_prefix="Midterm Row"):
    os.makedirs(outdir, exist_ok=True)
    for row, members in sorted(by_row.items()):
        safe_row = re.sub(r"[^A-Za-z0-9_-]", "_", str(row))
        fname = os.path.join(outdir, f"participants_row_{safe_row}.md")
        with open(fname, "w", encoding="utf-8") as f:
            f.write(f"# {title_prefix} {row} — Signout Sheet\n\n")
            f.write("| Seat | Name | ID | Email | Sign-out |\n")
            f.write("|---:|---|---|---|---|\n")
            for i, p in enumerate(members, start=1):
                name = f"{p.get('first_name','')} {p.get('last_name','')}".strip()
                # ensure pipes in fields are escaped
                name = name.replace("|", "\\|")
                email = (p.get('email','') or '').replace("|", "\\|")
                f.write(f"| {i} | {name} | {p.get('id','')} | {email} |  |\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", "-i", default="_data/courseid_39772_participants.csv")
    parser.add_argument("--yaml", "-y", default="_data/courseid_39772_rows.yml")
    parser.add_argument("--outdir", "-o", default="participants_rows")
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Input file not found: {args.input}")
        sys.exit(2)

    rows = read_csv(args.input)
    by_row = group_by_row(rows)
    write_yaml(by_row, args.yaml)
    write_markdown_sheets(by_row, args.outdir)
    print(f"Wrote YAML: {args.yaml}")
    print(f"Wrote markdown sheets into: {args.outdir}/")


if __name__ == "__main__":
    main()
