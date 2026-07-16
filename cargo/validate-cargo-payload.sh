#!/bin/bash
# Reject transfer/runtime residue before MM.S payloads reach Cargo.
# Usage: validate-cargo-payload.sh css|persisted-css|bodycopy|head [file]
# Omit [file], or pass -, to validate stdin (useful after copying CodeMirror).
set -euo pipefail

mode=${1:-}
input=${2:--}
if [[ ! "$mode" =~ ^(css|persisted-css|bodycopy|head)$ ]]; then
  echo "usage: $0 css|persisted-css|bodycopy|head [file|-]" >&2
  exit 2
fi

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
if [[ "$input" == "-" ]]; then
  cat >"$tmp"
else
  cp "$input" "$tmp"
fi

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

iconv -f UTF-8 -t UTF-8 "$tmp" >/dev/null 2>&1 || fail "payload is not valid UTF-8"
perl -0777 -ne 'exit(index($_, "\0") >= 0 ? 0 : 1)' "$tmp" && fail "payload contains a NUL byte"
perl -0777 -ne 'exit(/(?:â|ï¿½|Ã.)/ ? 0 : 1)' "$tmp" && fail "payload contains mojibake"
perl -0777 -ne 'exit(/[A-Za-z0-9+\/]{300,}={0,2}/ ? 0 : 1)' "$tmp" && fail "payload contains a Base64-like run of 300+ characters"

case "$mode" in
  css|persisted-css)
    awk 'length($0) > 500 { print NR ":" length($0); bad=1 } END { exit bad ? 0 : 1 }' "$tmp" \
      | grep -q . && fail "CSS contains a line longer than 500 characters"
    perl -0777 -ne 'exit(/(?:TextDecoder|atob\(|innerHTML|responsive-[0-9]+)/ ? 0 : 1)' "$tmp" \
      && fail "CSS contains transfer or bodycopy runtime residue"

    token_count=$(MMS_NEEDLE='/* mm.s — design tokens' perl -0777 -ne '$n=()=/\Q$ENV{"MMS_NEEDLE"}\E/g; print $n' "$tmp")
    layout_count=$(MMS_NEEDLE='/* mm.s — layout' perl -0777 -ne '$n=()=/\Q$ENV{"MMS_NEEDLE"}\E/g; print $n' "$tmp")
    layout_var_count=$(MMS_NEEDLE='--layout-u:' perl -0777 -ne '$n=()=/\Q$ENV{"MMS_NEEDLE"}\E/g; print $n' "$tmp")
    [[ "$token_count" == "1" ]] || fail "expected one design-token region, found $token_count"
    [[ "$layout_count" == "1" ]] || fail "expected one layout region, found $layout_count"
    [[ "$layout_var_count" == "2" ]] || fail "expected two --layout-u definitions, found $layout_var_count"

    open_braces=$(tr -cd '{' <"$tmp" | wc -c | tr -d ' ')
    close_braces=$(tr -cd '}' <"$tmp" | wc -c | tr -d ' ')
    [[ "$open_braces" == "$close_braces" ]] || fail "CSS brace counts differ ($open_braces/$close_braces)"

    if [[ "$mode" == "persisted-css" ]]; then
      managed_comment_count=$(MMS_NEEDLE='/* Cargo-managed text styles.' perl -0777 -ne '$n=()=/\Q$ENV{"MMS_NEEDLE"}\E/g; print $n' "$tmp")
      [[ "$managed_comment_count" == "1" ]] \
        || fail "expected one canonical Cargo-managed text-style comment, found $managed_comment_count"
      perl -0777 -ne 'exit(/@font-face\. Edited via the Text Styles/ ? 0 : 1)' "$tmp" \
        && fail "managed text-style comment is malformed"
      for face in mono sans gothic; do
        face_count=$(MMS_NEEDLE="--text-style: \"mms $face\"" perl -0777 -ne '$n=()=/\Q$ENV{"MMS_NEEDLE"}\E/g; print $n' "$tmp")
        [[ "$face_count" == "1" ]] || fail "expected one managed mms $face block, found $face_count"
      done
    fi
    ;;

  bodycopy)
    root_count=$(MMS_NEEDLE='<div class="mms"' perl -0777 -ne '$n=()=/\Q$ENV{"MMS_NEEDLE"}\E/g; print $n' "$tmp")
    [[ "$root_count" == "1" ]] || fail "expected one .mms root, found $root_count"
    marker_count=$(perl -0777 -ne '$n=()=/responsive-[0-9]+/g; print $n' "$tmp")
    marker_versions=$(perl -0777 -ne 'while(/(responsive-[0-9]+)/g){$v{$1}=1} print scalar keys %v' "$tmp")
    [[ "$marker_count" == "2" && "$marker_versions" == "1" ]] \
      || fail "expected one responsive runtime marker repeated twice"
    if ! python3 - "$tmp" <<'PY'
from html.parser import HTMLParser
from pathlib import Path
import sys

class VideoTextAudit(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.depth = 0
        self.bad = []
    def handle_starttag(self, tag, attrs):
        if tag.lower() == "video":
            self.depth += 1
    def handle_endtag(self, tag):
        if tag.lower() == "video" and self.depth:
            self.depth -= 1
    def handle_data(self, data):
        if self.depth and data.strip():
            self.bad.append(data.strip())

audit = VideoTextAudit()
audit.feed(Path(sys.argv[1]).read_text(encoding="utf-8"))
sys.exit(1 if audit.bad else 0)
PY
    then
      fail "video element contains stray literal text"
    fi
    perl -0777 -ne 'exit(/<div\s+id="mms-tw-rig"\s+style=/ ? 0 : 1)' "$tmp" \
      && fail "Touchbaes rig contains serialized runtime positioning"
    perl -0777 -ne 'exit(/viewBox="[^"]+"\s+viewbox=/ ? 0 : 1)' "$tmp" \
      && fail "SVG contains duplicate viewBox/viewbox attributes"
    perl -0777 -ne 'exit(/(?:TextDecoder|atob\()/ ? 0 : 1)' "$tmp" \
      && fail "bodycopy contains transfer-decoder residue"
    ;;

  head)
    marker_count=$(MMS_NEEDLE='data-mms-ios-edge-head=' perl -0777 -ne '$n=()=/\Q$ENV{"MMS_NEEDLE"}\E/g; print $n' "$tmp")
    [[ "$marker_count" == "1" ]] || fail "expected one iOS edge-head marker, found $marker_count"
    awk 'length($0) > 500 { bad=1 } END { exit bad ? 0 : 1 }' "$tmp" \
      && fail "head HTML contains a line longer than 500 characters"
    ;;
esac

echo "OK: $mode payload is clean" >&2
