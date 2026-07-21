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
"$ROOT/cargo/compose-css-bundle.sh" >/dev/null
python3 "$ROOT/cargo/validate-shared-components.py"
python3 "$ROOT/cargo/validate-test-mirrors.py" home who write

echo "MM.S Phase 2 audit foundation: PASS"
