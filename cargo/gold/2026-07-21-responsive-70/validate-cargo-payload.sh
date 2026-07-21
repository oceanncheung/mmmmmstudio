#!/bin/bash
# Reject transfer/runtime residue before MM.S payloads reach Cargo.
# Usage: validate-cargo-payload.sh css|persisted-css|bodycopy|head [file] [expected-page]
# Omit [file], or pass -, to validate stdin (useful after copying CodeMirror).
set -euo pipefail

mode=${1:-}
input=${2:--}
expected_page=${3:-${MMS_EXPECT_PAGE:-}}
if [[ ! "$mode" =~ ^(css|persisted-css|bodycopy|head)$ ]]; then
  echo "usage: $0 css|persisted-css|bodycopy|head [file|-] [expected-page]" >&2
  exit 2
fi

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
if [[ "$input" == "-" ]]; then
  cat >"$tmp"
else
  cp "$input" "$tmp"
fi

if [[ "$mode" == "bodycopy" && -z "$expected_page" && "$input" != "-" ]]; then
  case "$(basename "$input")" in
    home.html|home.template.html|test.html) expected_page=home ;;
    who.html|who.template.html|who-test.html) expected_page=who ;;
    write.html|write.template.html|write-test.html) expected_page=write ;;
  esac
fi
fail() {
  echo "ERROR: $*" >&2
  exit 1
}

if [[ -n "$expected_page" && ! "$expected_page" =~ ^(home|who|write)$ ]]; then
  fail "expected page must be home, who, or write"
fi

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
    if ! python3 - "$tmp" "$expected_page" <<'PY'
from html.parser import HTMLParser
from pathlib import Path
import sys


class WitheredEffectAudit(HTMLParser):
    VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.stack = []
        self.is_write = False
        self.mms_root_pages = []
        self.withered_root_count = 0
        self.paragraphs = []
        self.all_eye_roll_hooks = 0
        self.invalid_eye_roll_hooks = 0

    @staticmethod
    def classes(attrs):
        return set(dict(attrs).get("class", "").split())

    def inside_withered(self):
        return any("mms-writing-withered" in node["classes"] for node in self.stack)

    def current_withered_paragraph(self):
        for node in reversed(self.stack):
            if node.get("withered_paragraph") is not None:
                return node["withered_paragraph"]
        return None

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        attr_map = dict(attrs)
        classes = self.classes(attrs)
        if attr_map.get("data-page") == "write":
            self.is_write = True
        if "mms" in classes:
            self.mms_root_pages.append(attr_map.get("data-page") or "home")
        if "mms-writing-withered" in classes:
            self.withered_root_count += 1
        direct_withered_paragraph = (
            tag == "p"
            and len(self.stack) >= 1
            and self.stack[-1]["tag"] == "div"
            and "mms-writing-plate" in self.stack[-1]["classes"]
            and self.inside_withered()
        )
        paragraph = None
        if direct_withered_paragraph:
            paragraph = {"direct_eye_roll_spans": 0, "outside_text": False}
            self.paragraphs.append(paragraph)
        direct_eye_roll = False
        if attr_map.get("uses") == "eye-roll" and self.inside_withered():
            self.all_eye_roll_hooks += 1
            direct_eye_roll = (
                tag == "span"
                and len(self.stack) >= 2
                and self.stack[-1]["tag"] == "p"
                and self.stack[-1].get("withered_paragraph") is not None
                and self.stack[-2]["tag"] == "div"
                and "mms-writing-plate" in self.stack[-2]["classes"]
            )
            if direct_eye_roll:
                self.stack[-1]["withered_paragraph"]["direct_eye_roll_spans"] += 1
            else:
                self.invalid_eye_roll_hooks += 1
        if tag not in self.VOID_TAGS:
            self.stack.append({
                "tag": tag,
                "classes": classes,
                "withered_paragraph": paragraph,
                "direct_eye_roll": direct_eye_roll,
            })

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag.lower() not in self.VOID_TAGS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        tag = tag.lower()
        while self.stack:
            opened = self.stack.pop()
            if opened["tag"] == tag:
                break

    def handle_data(self, data):
        if not data.strip():
            return
        paragraph = self.current_withered_paragraph()
        if paragraph is None:
            return
        if not any(node.get("direct_eye_roll") for node in self.stack):
            paragraph["outside_text"] = True


audit = WitheredEffectAudit()
audit.feed(Path(sys.argv[1]).read_text(encoding="utf-8"))
expected_page = sys.argv[2]
page_identity_valid = not expected_page or audit.mms_root_pages == [expected_page]
write_contract_applicable = expected_page == "write" or audit.is_write or audit.withered_root_count > 0
write_contract_valid = (
        audit.mms_root_pages == ["write"]
        and audit.withered_root_count == 1
        and len(audit.paragraphs) == 4
        and all(item["direct_eye_roll_spans"] == 1 for item in audit.paragraphs)
        and all(not item["outside_text"] for item in audit.paragraphs)
        and audit.all_eye_roll_hooks == 4
        and audit.invalid_eye_roll_hooks == 0
)
valid = page_identity_valid and (not write_contract_applicable or write_contract_valid)
sys.exit(0 if valid else 1)
PY
    then
      fail "Write must preserve one direct Cargo eye-roll span around each of the four Withered Green paragraphs"
    fi
    python3 "$(dirname "$0")/validate-deployment-manifest.py" bodycopy "$tmp" "$expected_page" \
      || fail "bodycopy does not match the reviewed deployment manifest"
    ;;

  head)
    marker_count=$(MMS_NEEDLE='data-mms-ios-edge-head=' perl -0777 -ne '$n=()=/\Q$ENV{"MMS_NEEDLE"}\E/g; print $n' "$tmp")
    [[ "$marker_count" == "1" ]] || fail "expected one iOS edge-head marker, found $marker_count"
    awk 'length($0) > 500 { bad=1 } END { exit bad ? 0 : 1 }' "$tmp" \
      && fail "head HTML contains a line longer than 500 characters"
    python3 "$(dirname "$0")/validate-deployment-manifest.py" head "$tmp" \
      || fail "head HTML does not match the reviewed deployment manifest"
    ;;
esac

echo "OK: $mode payload is clean" >&2
