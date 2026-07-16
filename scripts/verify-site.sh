#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

required_files=(
  "index.html"
  "styles.css"
  "assets/podarkino-logo.jpg"
  "assets/tea-sweets.jpg"
  "assets/cozy-interior.jpg"
)

for file in "${required_files[@]}"; do
  if [[ ! -s "$file" ]]; then
    echo "Missing or empty required file: $file" >&2
    exit 1
  fi
done

while IFS= read -r asset; do
  asset="${asset%%\?*}"
  if [[ ! -f "$asset" ]]; then
    echo "Referenced asset is missing: $asset" >&2
    exit 1
  fi
done < <(grep -Eo 'assets/[^"]+' index.html styles.css | cut -d: -f2- | sort -u)

if ! grep -Eq 'href="styles\.css(\?[^\"]*)?"' index.html; then
  echo "index.html does not link styles.css" >&2
  exit 1
fi

if ! grep -q 'hero-logo' styles.css; then
  echo "styles.css does not contain hero logo styles" >&2
  exit 1
fi

if git status --short | grep -E '^( D|D )'; then
  echo "Deleted files are present in git status; inspect before continuing." >&2
  exit 1
fi

echo "Site verification passed."
