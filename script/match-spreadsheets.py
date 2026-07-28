#!/usr/bin/env python3

from pathlib import Path
import csv
import os
import runpy
import sys
import tempfile


SCRIPT_NAME = "match_scantron_to_moodle.py"
ENV_TARGET = "MATCH_SCANTRON_TO_MOODLE_TARGET"

# normalized-key -> canonical header
HEADER_ALIASES = {
    "id": "ID",
    "idnumber": "ID",
    "studentid": "ID",
    "studentnumber": "ID",

    "firstname": "First Name",
    "first": "First Name",
    "givenname": "First Name",

    "lastname": "Last Name",
    "last": "Last Name",
    "surname": "Last Name",
    "familyname": "Last Name",
}

SOFT_COLUMNS = ["ID", "First Name", "Last Name"]


def _norm_key(s: str) -> str:
    return "".join(ch for ch in s.lower() if ch.isalnum())


def _find_target_script() -> Path | None:
    env = os.environ.get(ENV_TARGET)
    if env:
        p = Path(env).expanduser().resolve()
        if p.exists() and p.is_file() and p != Path(__file__).resolve():
            return p

    search_roots = [
        Path.cwd().resolve(),
        Path(__file__).resolve().parent,
    ]

    checked = set()
    for root in search_roots:
        for base in [root, *root.parents]:
            if base in checked:
                continue
            checked.add(base)
            candidate = base / "script" / SCRIPT_NAME
            if candidate.exists() and candidate.is_file() and candidate.resolve() != Path(__file__).resolve():
                return candidate.resolve()

    return None


def _normalize_csv_headers(src: Path, dst: Path) -> None:
    with src.open("r", newline="", encoding="utf-8-sig") as f_in:
        reader = csv.DictReader(f_in)
        original_fields = reader.fieldnames or []

        rename = {}
        existing = set(original_fields)
        for h in original_fields:
            canonical = HEADER_ALIASES.get(_norm_key(h))
            if canonical and canonical not in existing and canonical not in rename.values():
                rename[h] = canonical

        final_fields = [rename.get(h, h) for h in original_fields]
        for col in SOFT_COLUMNS:
            if col not in final_fields:
                final_fields.append(col)

        with dst.open("w", newline="", encoding="utf-8") as f_out:
            writer = csv.DictWriter(f_out, fieldnames=final_fields, extrasaction="ignore")
            writer.writeheader()

            for row in reader:
                new_row = {}
                for k, v in row.items():
                    new_row[rename.get(k, k)] = v
                for col in SOFT_COLUMNS:
                    new_row.setdefault(col, "")
                writer.writerow(new_row)


def _prepare_argv(argv: list[str], tmpdir: Path) -> list[str]:
    # Assumes first two positional args are scantron + moodle CSVs.
    out = argv[:]
    for idx in (1, 2):
        if idx >= len(out):
            continue
        token = out[idx]
        if token.startswith("-"):
            continue
        p = Path(token).expanduser()
        if p.exists() and p.is_file() and p.suffix.lower() == ".csv":
            dst = tmpdir / p.name
            _normalize_csv_headers(p, dst)
            out[idx] = str(dst)
    return out


def main():
    target = _find_target_script()

    with tempfile.TemporaryDirectory(prefix="scantron_match_") as tdir:
        tmpdir = Path(tdir)
        sys.argv = _prepare_argv(sys.argv, tmpdir)

        if target is not None:
            runpy.run_path(str(target), run_name="__main__")
            return

        # Module fallback if script path isn't found.
        try:
            runpy.run_module("script.match_scantron_to_moodle", run_name="__main__")
        except Exception as ex:
            print(
                "Error: could not locate moved script.\n"
                f"Set {ENV_TARGET}=/absolute/path/to/script/{SCRIPT_NAME}\n"
                f"Details: {ex}",
                file=sys.stderr,
            )
            sys.exit(2)


if __name__ == "__main__":
    main()