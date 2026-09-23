#!/usr/bin/env python3
"""
import_old_plan.py — carry an old-format plan{.json,.yml} into a new plan.yml

The new plan.yml is AUTHORED: it is never regenerated. So this script only
ever APPENDS one new top-level key (default: mtgs_<old semester>) to the end
of the file. Every existing byte is left untouched, and the result is
re-parsed to prove the original content is unchanged.

Usage:
  python3 import_old_plan.py OLD_PLAN NEW_PLAN [--key mtgs_202430]
                             [--semester 202430] [--out PATH] [--dry-run]

  OLD_PLAN   old-format plan.json or plan.yml (has meetings[].mtgnbr)
  NEW_PLAN   new-format plan.yml to extend
  --out      write the result here instead of updating NEW_PLAN in place
  --dry-run  print the block that would be appended; write nothing

Mapping (old -> new vocabulary):
  mtgnbr                  -> meeting
  date  "Wed-04-Sep-2024" -> date  "2024-09-04" (ISO string; weekday checked)
  theme                   -> theme
  today (markdown list)   -> outline  ([text](url) -> {text, url};
                                       tab-indented bullets -> items:)
  next  (markdown list)   -> for_next_meeting
  r2r                     -> r2r
  wklysched[].noteworth   -> week_notes, on the first meeting of that week
  admin                   -> admin_notes, minus the derivable boilerplate
                             (Happy <day>, Attendance, calendar links)
  "Submit your response" / "Take the quiz" lines
                          -> moodle: {questionnaire: id, quiz: id}
  Template placeholders ("TODAY", "Summary", "Theme", ...) are dropped.
"""
import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

import yaml

PLACEHOLDERS = {"TODAY", "Summary", "Theme", "Topics", "Noteworthy Items",
                "Response to responses", "sample", ""}
IAL = re.compile(r"\[?\{:[^}]*\}")                  # kramdown {:target='_blank'}
LINK = re.compile(r"\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))+)\)")  # allows one level of () in URL
BULLET = re.compile(r"^(\t+| {2,})?\*\s*")
HAPPY = re.compile(r"^Happy (Mon|Tues|Wednes|Thurs|Fri)day$")
MOODLE_LINE = re.compile(r"mod/(questionnaire|quiz)/view\.php\?id=(\d+)")
BOILER_ADMIN = re.compile(r"\[(Attendance|Class calendar for today|Upcoming events)\]")


class ConvertError(Exception):
    pass


# ---------------------------------------------------------------- loading
def strip_trailing_commas(text):
    """Remove ',' before '}' or ']' outside of JSON strings (string-aware)."""
    out, i, in_str, n = [], 0, False, len(text)
    while i < n:
        c = text[i]
        if in_str:
            out.append(c)
            if c == "\\":
                out.append(text[i + 1]); i += 1
            elif c == '"':
                in_str = False
        elif c == '"':
            in_str = True; out.append(c)
        elif c == ",":
            j = i + 1
            while j < n and text[j] in " \t\r\n":
                j += 1
            if j < n and text[j] in "}]":
                i += 1; continue          # drop the dangling comma
            out.append(c)
        else:
            out.append(c)
        i += 1
    return "".join(out)


def load_old(path):
    text = Path(path).read_text(encoding="utf-8")
    fixes = []
    if path.suffix == ".json":
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            repaired = strip_trailing_commas(text)
            try:
                data = json.loads(repaired)
            except json.JSONDecodeError:
                raise ConvertError(f"{path}: invalid JSON ({e}) and "
                                   "trailing-comma repair did not fix it")
            fixes.append(f"repaired invalid JSON (trailing comma near line {e.lineno})")
    else:
        data = yaml.safe_load(text)
    if not isinstance(data, dict) or not isinstance(data.get("meetings"), list):
        keys = list(data) if isinstance(data, dict) else type(data).__name__
        raise ConvertError(f"{path}: expected a mapping with a 'meetings' list; got {keys}")
    return data, fixes


# ---------------------------------------------------------------- markdown
def clean(s):
    return IAL.sub("", s).strip()


def md_item(line):
    """One markdown line -> str or {text, url}."""
    line = clean(line)
    links = LINK.findall(line)
    if len(links) == 1:
        text, url = links[0]
        whole = LINK.sub(lambda m: m.group(1), line).strip()
        return {"text": whole or url, "url": url}
    return line                                   # 0 or 2+ links: keep as-is


def md_list(block):
    """Markdown bullet block -> list of items; indented bullets nest as items:."""
    items = []
    for raw in (block or "").split("\n"):
        if not raw.strip():
            continue
        m = BULLET.match(raw)
        nested = bool(m and m.group(1))
        body = raw[m.end():] if m else raw.strip()
        if not clean(body) or clean(body) in PLACEHOLDERS:
            continue
        item = md_item(body)
        if nested and items:
            parent = items[-1]
            if isinstance(parent, str):
                parent = items[-1] = {"text": parent}
            parent.setdefault("items", []).append(item)
        else:
            items.append(item)
    return items


# ---------------------------------------------------------------- mapping
def iso_date(s, mtg):
    try:
        d = dt.datetime.strptime(s, "%a-%d-%b-%Y").date()
    except (TypeError, ValueError):
        raise ConvertError(f"meeting {mtg}: unparseable date {s!r}")
    return d.isoformat()                          # strptime already checks weekday


def split_next(block):
    moodle, rest = {}, []
    for item in md_list(block):
        url = item.get("url", "") if isinstance(item, dict) else ""
        m = MOODLE_LINE.search(url)
        if m:
            moodle[m.group(1)] = int(m.group(2))
        else:
            rest.append(item)
    return rest, moodle


def admin_notes(block):
    notes = []
    for raw in (block or "").split("\n"):
        body = clean(BULLET.sub("", raw))
        if not body or HAPPY.match(body):
            continue
        if BOILER_ADMIN.search(body):
            leftover = LINK.sub("", body).strip()
            if leftover:
                notes.append(leftover)
            continue
        notes.append(md_item(body))
    return notes


def convert(old, report):
    week_notes = {}
    for w in old.get("wklysched", []):
        notes = md_list(w.get("noteworth"))
        if notes:
            week_notes[w["week"]] = notes

    out, seen_weeks = [], set()
    for m in old["meetings"]:
        n = m.get("mtgnbr")
        if n is None:
            raise ConvertError(f"meeting without 'mtgnbr'; keys: {list(m)}")
        rec = {"meeting": int(n), "date": iso_date(m.get("date"), n)}
        wk = m.get("week")
        if wk is not None:
            rec["week"] = int(wk)
        theme = (m.get("theme") or "").strip()
        if theme and theme not in PLACEHOLDERS:
            rec["theme"] = theme
        if wk in week_notes and wk not in seen_weeks:
            rec["week_notes"] = week_notes[wk]
        seen_weeks.add(wk)
        for key, val in (("admin_notes", admin_notes(m.get("admin"))),
                         ("r2r", md_list(m.get("r2r"))),
                         ("outline", md_list(m.get("today")))):
            if val:
                rec[key] = val
        nxt, moodle = split_next(m.get("next"))
        if nxt:
            rec["for_next_meeting"] = nxt
        if moodle:
            rec["moodle"] = moodle
        dropped = sorted(k for k in m if k not in
                         {"mtgnbr", "date", "week", "theme", "admin", "r2r", "today", "next"})
        if dropped:
            report.append(f"meeting {n}: ignored keys {dropped} "
                          f"(values: {[m[k] for k in dropped]})")
        out.append(rec)

    for k in ("overview", "assignments", "exams", "totwk", "totmeet"):
        if k in old:
            report.append(f"top-level {k!r} not carried: {json.dumps(old[k])[:70]}")
    return out


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[1])
    ap.add_argument("old", type=Path)
    ap.add_argument("new", type=Path)
    ap.add_argument("--key")
    ap.add_argument("--semester")
    ap.add_argument("--out", type=Path)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    old, report = load_old(a.old)
    sem = a.semester or (re.search(r"(\d{6})$", str(old.get("offering", ""))) or [None, None])[1]
    if not sem and not a.key:
        raise ConvertError("cannot infer semester from 'offering'; pass --semester or --key")
    key = a.key or f"mtgs_{sem}"

    new_text = a.new.read_text(encoding="utf-8")
    new_data = yaml.safe_load(new_text)
    if key in new_data:
        raise ConvertError(f"{a.new} already has top-level key {key!r}; refusing to touch it")

    meetings = convert(old, report)
    header = (f"\n# ------------------------------------------------------------------\n"
              f"# Transferred {dt.date.today().isoformat()} by import_old_plan.py from\n"
              f"#   {a.old.name}  (offering: {old.get('offering', '?')})\n"
              f"# Archival: not read by the build. Derivable admin boilerplate\n"
              f"# (attendance / calendar links) was dropped on purpose.\n"
              f"# ------------------------------------------------------------------\n")
    block = yaml.safe_dump({key: meetings}, sort_keys=False, allow_unicode=True,
                           width=4096, default_flow_style=False)
    result = new_text.rstrip("\n") + "\n" + header + block

    # verify: original untouched, new key round-trips exactly
    parsed = yaml.safe_load(result)
    assert result.startswith(new_text.rstrip("\n")), "original bytes changed"
    assert {k: v for k, v in parsed.items() if k != key} == new_data, "original data changed"
    assert parsed[key] == meetings, "appended block did not round-trip"

    print(f"source   : {a.old}  ({old.get('offering', '?')})")
    for r in report:
        print(f"note     : {r}")
    print(f"key      : {key}  ({len(meetings)} meetings, "
          f"{sum('moodle' in m for m in meetings)} with moodle ids, "
          f"{sum('outline' in m for m in meetings)} with outlines)")
    print(f"verified : original {len(new_data)} top-level keys unchanged; block round-trips")
    if a.dry_run:
        print(header + block)
        return
    dest = a.out or a.new
    dest.write_text(result, encoding="utf-8")
    print(f"wrote    : {dest}")


if __name__ == "__main__":
    try:
        main()
    except ConvertError as e:
        sys.exit(f"error: {e}")
