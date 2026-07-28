#!/usr/bin/env bash
# Generate name-only HTMLs, convert each to PDF, and merge into a single PDF.
# Usage: ./scripts/generate_and_merge_names.sh /path/to/pdf output.pdf
set -e
PDF_IN="$1"
OUT_PDF="${2:-participants_names_all.pdf}"
if [ -z "$PDF_IN" ]; then
  echo "Usage: $0 /path/to/participants.pdf [out.pdf]"
  exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
cd "$ROOT_DIR"

# 1) generate HTMLs
python3 "$SCRIPT_DIR/generate_name_lists.py" "$PDF_IN" --outdir . --min-rows 1

# 2) create PDFs for each generated html
PDFS=()
for html in participants_row_*_names.html; do
  if [ ! -f "$html" ]; then
    continue
  fi
  outpdf="${html%.html}.pdf"
  echo "Converting $html -> $outpdf"
  ./generate_pdf.sh "$html" "$outpdf"
  PDFS+=("$outpdf")
done

# 3) merge PDFs
if [ ${#PDFS[@]} -eq 0 ]; then
  echo "No PDFs produced. Exiting."
  exit 1
fi
python3 "$SCRIPT_DIR/merge_pdfs.py" "$OUT_PDF" "${PDFS[@]}"

echo "Merged into $OUT_PDF"
