#!/bin/bash
# Emit the complete local MM.S stylesheet for Cargo: tokens first, layout second.
# Diagnostics go to stderr so stdout remains safe to pipe into Cargo.
set -euo pipefail
cd "$(dirname "$0")"

token_markers=$(rg -F -c '/* mm.s — design tokens' tokens.css || true)
layout_markers=$(rg -F -c '/* mm.s — layout' site.css || true)
layout_vars=$(rg -F -c -- '--layout-u:' tokens.css || true)
mobile_type_modes=$(rg -F -c 'DEVICE TYPE SCALE' tokens.css || true)
bundle=$(mktemp)
trap 'rm -f "$bundle"' EXIT
cat tokens.css site.css >"$bundle"
open_braces=$(tr -cd '{' <"$bundle" | wc -c | tr -d ' ')
close_braces=$(tr -cd '}' <"$bundle" | wc -c | tr -d ' ')

if [[ "$token_markers" != "1" || "$layout_markers" != "1" ]]; then
  echo "ERROR: expected exactly one token marker and one layout marker" >&2
  exit 1
fi
if [[ "$layout_vars" -lt 2 || "$mobile_type_modes" != "1" ]]; then
  echo "ERROR: required layout or mobile type tokens are missing" >&2
  exit 1
fi
if [[ "$open_braces" != "$close_braces" ]]; then
  echo "ERROR: CSS brace counts differ ($open_braces open, $close_braces close)" >&2
  exit 1
fi

./validate-cargo-payload.sh css "$bundle"

echo "OK: complete CSS bundle; tokens=$token_markers layout=$layout_markers braces=$open_braces" >&2
cat "$bundle"
