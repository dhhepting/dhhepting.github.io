#!/usr/bin/env bash
# Generate PDFs for each participants_row_*.html using the helper generate_pdf.sh
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
cd "$ROOT_DIR"

for html in participants_row_?.html; do
  if [ -f "$html" ]; then
    outpdf="${html%.html}.pdf"
    ./generate_pdf.sh "$html" "$outpdf" || {
      echo "Failed to create $outpdf - check Chrome path or print manually from a browser."
    }
  fi
done

echo "All done."
