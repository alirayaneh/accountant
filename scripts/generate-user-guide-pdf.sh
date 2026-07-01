#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GUIDE_DIR="$ROOT/docs/user-guide"
MD="$GUIDE_DIR/amoza-accountant-guide-fa.md"
PDF="$GUIDE_DIR/amoza-accountant-guide-fa.pdf"

if [[ ! -f "$MD" ]]; then
  echo "Error: guide not found at $MD" >&2
  exit 1
fi

echo "Generating PDF from $MD ..."

if command -v pandoc >/dev/null 2>&1 && command -v xelatex >/dev/null 2>&1; then
  if pandoc "$MD" \
    -o "$PDF" \
    --pdf-engine=xelatex \
    -V mainfont="Vazirmatn" \
    -V dir=rtl \
    -V lang=fa \
    -V geometry:margin=2cm \
    --resource-path="$GUIDE_DIR" 2>/dev/null; then
    echo "PDF generated with pandoc+xelatex: $PDF"
    exit 0
  fi
  echo "pandoc+xelatex failed, trying Chrome fallback..." >&2
fi

node "$ROOT/scripts/md-to-pdf-chrome.js"

if [[ -f "$PDF" ]]; then
  echo "Done: $PDF"
else
  echo "Error: PDF generation failed" >&2
  exit 1
fi
