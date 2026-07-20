#!/bin/bash
# Assembles standalone test pages from tokens.css + site.css and complete
# Cargo bodycopies. Use "all" (or "canonical") to refresh all three mirrors.
set -euo pipefail
cd "$(dirname "$0")"
requested=${1:-home}
case "$requested" in
  home|who|write) pages=("$requested") ;;
  all|canonical) pages=(home who write) ;;
  *) echo "usage: $0 [home|who|write|all|canonical]" >&2; exit 2 ;;
esac

./assemble-named-pages.sh
./validate-cargo-payload.sh head site-head.html
./compose-css-bundle.sh >/dev/null

build_page() {
  local page=$1
  local body="$page.html"
  local output="${page}-test.html"
  if [[ "$page" == "home" ]]; then output="test.html"; fi

  ./validate-cargo-payload.sh bodycopy "$body"
  {
    echo '<!doctype html><html data-theme="white" data-face="serif" data-scale="m" data-shape="straight"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>mms test</title><style>'
    cat tokens.css
    echo '</style><style>'
    cat site.css
    echo '</style></head><body>'
    cat "$body"
    echo '</body></html>'
  } > "$output"
}

for page in "${pages[@]}"; do
  build_page "$page"
done

python3 validate-test-mirrors.py "${pages[@]}"
