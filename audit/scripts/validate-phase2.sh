#!/bin/sh
# Validate the MM.S Phase 2 audit foundation without touching Cargo or Figma.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)

"$ROOT/audit/scripts/verify-phase1-baseline.sh"
python3 "$ROOT/audit/scripts/generate-system-inventory.py" --check
python3 "$ROOT/audit/scripts/generate-asset-manifest.py" --check

python3 - "$ROOT" <<'PY'
import json
import py_compile
import sys
import tempfile
from pathlib import Path

root = Path(sys.argv[1])

json_paths = [
    root / "audit/inventory/system-inventory.json",
    *sorted((root / "audit/assets").glob("*.json")),
    *sorted((root / "audit/contracts").glob("*.json")),
    *sorted((root / "audit/findings").rglob("*.json")),
    *sorted((root / "audit/harness/schemas").glob("*.json")),
]
for path in json_paths:
    json.loads(path.read_text(encoding="utf-8"))

for path in sorted((root / "audit/scripts").glob("*.py")):
    with tempfile.NamedTemporaryFile(suffix=".pyc") as compiled:
        py_compile.compile(str(path), cfile=compiled.name, doraise=True)

print(f"Phase 2 JSON/Python syntax: PASS ({len(json_paths)} JSON files)")
PY

for source in "$ROOT"/audit/harness/src/*.mjs; do
  node --check "$source"
done
node "$ROOT/audit/harness/src/cli.mjs" --validate-config >/dev/null
echo "Phase 2 harness configuration: PASS"

"$ROOT/cargo/validate-cargo-payload.sh" bodycopy "$ROOT/cargo/home.html"
"$ROOT/cargo/validate-cargo-payload.sh" bodycopy "$ROOT/cargo/who.html"
"$ROOT/cargo/validate-cargo-payload.sh" bodycopy "$ROOT/cargo/write.html"
"$ROOT/cargo/validate-cargo-payload.sh" head "$ROOT/cargo/site-head.html"
FROZEN_CARGO="$ROOT/docs/audits/2026-07-20T175853-0400-round-80/cargo-draft"
python3 - "$ROOT" "$FROZEN_CARGO" <<'PY'
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(sys.argv[1])
snapshot = Path(sys.argv[2])
manifest_validator = root / "cargo/validate-deployment-manifest.py"

# The immutable Phase 1 Cargo capture predates the approved 504x504 WTW
# correction. Apply that documented post-Round-80 delta only to an in-memory
# persistence fixture; never rewrite the frozen evidence.
home = (snapshot / "home.bodycopy.html").read_text(encoding="utf-8")
home = home.replace("--asset-w:765.2;--asset-h:765.2", "--asset-w:504;--asset-h:504", 1)
with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8") as handle:
    handle.write(home)
    handle.flush()
    subprocess.run([sys.executable, str(manifest_validator), "bodycopy", handle.name, "home"], check=True)

for page in ("who", "write"):
    subprocess.run(
        [sys.executable, str(manifest_validator), "bodycopy", str(snapshot / f"{page}.bodycopy.html"), page],
        check=True,
    )
subprocess.run([sys.executable, str(manifest_validator), "head", str(snapshot / "site-head.html")], check=True)
print("Cargo-serialized deployment-manifest fixtures: PASS")
PY
python3 - "$ROOT" <<'PY'
import re
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(sys.argv[1])
validator = root / "cargo/validate-cargo-payload.sh"
source = (root / "cargo/write.html").read_text(encoding="utf-8")
mutations = {
    "route marker and effect removed": re.sub(
        r'<span uses="eye-roll">(.*?)</span>',
        r'\1',
        source.replace('data-page="write"', 'data-page="writex"', 1),
        flags=re.DOTALL,
    ),
    "Withered section removed": re.sub(
        r'<article class="mms-writing-piece mms-writing-withered".*?</article>',
        '',
        source,
        count=1,
        flags=re.DOTALL,
    ),
    "paragraph text outside hook": source.replace(
        '<span uses="eye-roll">To think of something solid',
        'outside <span uses="eye-roll">To think of something solid',
        1,
    ),
}
for label, payload in mutations.items():
    with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8") as handle:
        handle.write(payload)
        handle.flush()
        result = subprocess.run(
            [str(validator), "bodycopy", handle.name, "write"],
            capture_output=True,
            text=True,
            check=False,
        )
    if result.returncode == 0:
        raise SystemExit(f"negative Withered Green fixture unexpectedly passed: {label}")
print(f"Withered Green negative fixtures: PASS ({len(mutations)} rejected)")
PY
python3 - "$ROOT" <<'PY'
import re
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(sys.argv[1])
validator = root / "cargo/validate-cargo-payload.sh"
home = (root / "cargo/home.html").read_text(encoding="utf-8")
head = (root / "cargo/site-head.html").read_text(encoding="utf-8")


def remove_band(source, band):
    pattern = rf'<section class="mms-band" data-band="{re.escape(band)}"[^>]*>.*?</section>'
    updated, count = re.subn(pattern, "", source, count=1, flags=re.DOTALL)
    if count != 1:
        raise SystemExit(f"could not build negative fixture for band {band}")
    return updated


def alter_wtw_geometry(source):
    pattern = r'(<div[^>]*data-media-id="wtw-02"[^>]*style=")([^"]*)(")'

    def update(match):
        style = match.group(2).replace("--asset-w:504", "--asset-w:505", 1)
        return match.group(1) + style + match.group(3)

    updated, count = re.subn(pattern, update, source, count=1)
    if count != 1:
        raise SystemExit("could not build negative WTW geometry fixture")
    return updated


bodycopy_mutations = {
    "stale runtime": home.replace("responsive-70", "responsive-69"),
    "missing WTW frame": re.sub(
        r'<div[^>]*data-media-id="wtw-02"[^>]*>.*?</div>',
        "",
        home,
        count=1,
        flags=re.DOTALL,
    ),
    "missing V7 band": remove_band(home, "v7"),
    "missing Touchbaes band": remove_band(home, "touchbaes"),
    "wrong WTW geometry": alter_wtw_geometry(home),
    "stale V7 embed": home.replace(
        "Z3031274916472238420423367767865",
        "Z0000000000000000000000000000000",
    ),
    "stale Touchbaes embed": home.replace(
        "E3031754669080377521238157342521",
        "E0000000000000000000000000000000",
    ),
    "stale Montran embed": home.replace(
        "U3034412351395654863674388559673",
        "U0000000000000000000000000000000",
    ),
    "missing image source": home.replace(
        ' src="https://freight.cargo.site/w/3600/q/90/i/T3029359532540439699946090313529/eviive-sequence-3-retina.jpg"',
        "",
        1,
    ),
    "stale video source": home.replace(
        "W3028308513949149028916421769017",
        "W0000000000000000000000000000000",
        1,
    ),
    "unexpected live iframe source": home.replace(
        '<iframe class="mms-img mms-cup"',
        '<iframe src="https://example.invalid/" class="mms-img mms-cup"',
        1,
    ),
    "unclosed MM.S root": home.replace(
        "</dialog>\n</div>\n<script>",
        "</dialog>\n<script>",
        1,
    ),
}

for label, payload in bodycopy_mutations.items():
    if payload == home:
        raise SystemExit(f"negative fixture did not mutate Home: {label}")
    with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8") as handle:
        handle.write(payload)
        handle.flush()
        result = subprocess.run(
            [str(validator), "bodycopy", handle.name, "home"],
            capture_output=True,
            text=True,
            check=False,
        )
    if result.returncode == 0:
        raise SystemExit(f"negative deployment fixture unexpectedly passed: {label}")

stale_head = head.replace('data-mms-ios-edge-head="49"', 'data-mms-ios-edge-head="48"')
if stale_head == head:
    raise SystemExit("negative fixture did not mutate the head marker")
with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8") as handle:
    handle.write(stale_head)
    handle.flush()
    result = subprocess.run(
        [str(validator), "head", handle.name],
        capture_output=True,
        text=True,
        check=False,
    )
if result.returncode == 0:
    raise SystemExit("negative deployment fixture unexpectedly passed: stale head")

print(f"Deployment-manifest negative fixtures: PASS ({len(bodycopy_mutations) + 1} rejected)")
PY
"$ROOT/cargo/compose-css-bundle.sh" >/dev/null
python3 "$ROOT/cargo/validate-shared-components.py"
python3 "$ROOT/cargo/validate-test-mirrors.py" home who write

echo "MM.S Phase 2 audit foundation: PASS"
