#!/usr/bin/env bash
# Helper to generate a PDF from .html on macOS
# Requires Google Chrome (or Chromium) installed.
# Usage: ./generate_pdf.sh participants_sheet.html participants_sheet.pdf

INFILE="${1:-participants_sheet.html}"
OUTFILE="${2:-participants_sheet.pdf}"

CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ ! -f "$CHROME_PATH" ]; then
  echo "Google Chrome not found at $CHROME_PATH"
  echo "You can print the HTML from any browser to PDF, or install Chrome and re-run."
  exit 1
fi

"$CHROME_PATH" --headless --disable-gpu --no-sandbox --print-to-pdf="$OUTFILE" "file://$(pwd)/$INFILE"

echo "Wrote $OUTFILE"