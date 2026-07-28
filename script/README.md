# generate_linked_meetings.py

Small helper to generate a completed `linked-meetings` HTML fragment for a
course offering from a `meetings.csv` file.

Location
- Script: `script/generate_linked_meetings.py`
- Reads/writes under `_data/teaching/<COURSE>/<OFFERING>/` (e.g. `CS-280/202610`).

Usage

From the repository root:

```bash
python3 script/generate_linked_meetings.py CS-280/202610 --homepage-id 9872
```

Options
- `offering` (positional): path under `_data/teaching`, e.g. `CS-280/202610`.
- `--base-dir`: base data directory (default: `_data/teaching`).
- `--input-name`: input CSV filename (default: `meetings.csv`).
- `--output-name`: output filename to write (default: `linked-meetings`).
- `--homepage-id`: optional wiki page id for the homepage link header.

What it does
- Reads `meetings.csv` and writes `linked-meetings` HTML fragment.
- Meeting links use the `wikipage_id` column to build
  `https://urcourses.uregina.ca/mod/wiki/view.php?pageid=<id>#toc-3`.
- Falls back to the `file` column when `wikipage_id` is missing.

Example

```bash
cd /path/to/repo
python3 script/generate_linked_meetings.py CS-280/202610 --homepage-id 9872
# writes _data/teaching/CS-280/202610/linked-meetings
```

Notes
- Run from the repo root so relative `_data/teaching` resolves correctly.
- The script is intentionally minimal and depends only on the Python stdlib.
