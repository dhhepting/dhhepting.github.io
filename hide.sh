#!/usr/bin/env bash
# hide.sh -- make a single assignment (or any front-matter document) invisible
# on the site by setting `published: false` in its front matter, and record the
# action in a backlog file for later cleanup.
#
# This is a TACTICAL stopgap for the upgrade-2026 work: it gets a problematic
# assignment off the built site without reorganizing the _assignments
# collection. The file stays where it is and stays in the collection; Jekyll
# simply doesn't build it. Reversible with `unhide`.
#
# Usage:
#   ./hide.sh _assignments/CS-405_805/I02_revisit_DT_12m.md "links to retired code"
#   ./hide.sh --unhide _assignments/CS-405_805/I02_revisit_DT_12m.md
#
# After running: rebuild with `bundle exec rake`. The page drops from the site.

set -euo pipefail

BACKLOG="ASSIGNMENTS-BACKLOG.md"

# --- parse args -------------------------------------------------------------
UNHIDE=0
if [ "${1:-}" = "--unhide" ]; then
  UNHIDE=1
  shift
fi

FILE="${1:-}"
REASON="${2:-}"

if [ -z "$FILE" ]; then
  echo "usage: $0 [--unhide] <path/to/file.md> [reason]" >&2
  exit 1
fi
if [ ! -d .git ]; then
  echo "run this from the root of your repo" >&2
  exit 1
fi
if [ ! -f "$FILE" ]; then
  echo "no such file: $FILE" >&2
  exit 1
fi
if ! head -1 "$FILE" | grep -q '^---'; then
  echo "$FILE has no YAML front matter (first line isn't ---); refusing to edit" >&2
  exit 1
fi

# --- unhide path ------------------------------------------------------------
if [ "$UNHIDE" -eq 1 ]; then
  if grep -q '^published: false' "$FILE"; then
    # remove the exact line we added
    grep -v '^published: false$' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"
    echo "unhidden: $FILE  (published: false removed)"
    echo "next: bundle exec rake   # the page returns to the site"
  else
    echo "no 'published: false' line found in $FILE -- nothing to undo"
  fi
  exit 0
fi

# --- hide path --------------------------------------------------------------
if grep -q '^published: false' "$FILE"; then
  echo "already hidden: $FILE (published: false already present)"
  exit 0
fi

# Insert `published: false` on the line immediately after the opening `---`,
# so it lands inside the front-matter block regardless of what else is there.
awk 'NR==1 && /^---/ {print; print "published: false"; next} {print}' \
    "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

echo "hidden: $FILE  (published: false added)"

# --- record in the backlog --------------------------------------------------
if [ ! -f "$BACKLOG" ]; then
  {
    echo "# Assignments backlog"
    echo
    echo "Assignments hidden from the site as tactical stopgaps during the"
    echo "upgrade-2026 work, to be properly addressed when the _assignments"
    echo "collection is reorganized. Each entry: what was hidden, why, when."
    echo
    echo "| date | file | reason |"
    echo "| --- | --- | --- |"
  } > "$BACKLOG"
fi

printf '| %s | `%s` | %s |\n' \
  "$(date +%Y-%m-%d)" "$FILE" "${REASON:-"(no reason given)"}" >> "$BACKLOG"

echo "logged to: $BACKLOG"
echo "next: bundle exec rake   # rebuild; the page drops from the site"
