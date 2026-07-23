#!/bin/sh
# Validate the MM.S Phase 2 audit foundation without touching Cargo or Figma.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)

"$ROOT/audit/scripts/verify-phase1-baseline.sh"
python3 "$ROOT/audit/scripts/generate-system-inventory.py" --check
python3 "$ROOT/audit/scripts/generate-asset-manifest.py" --check
python3 "$ROOT/audit/scripts/validate-embed-reproducibility.py" --self-test
python3 "$ROOT/audit/scripts/validate-embed-message-protocol.py" --self-test
python3 "$ROOT/audit/scripts/validate-montran-pdf-allowlist.py" --self-test
python3 "$ROOT/audit/scripts/validate-iframe-capability-matrix.py" --self-test
python3 "$ROOT/audit/scripts/validate-public-response-header-policy.py" --self-test
python3 "$ROOT/audit/scripts/validate-low-collection-privacy.py" --self-test
python3 "$ROOT/audit/scripts/validate-third-party-runtime-notices.py" --self-test
python3 "$ROOT/audit/scripts/validate-framer-helper-dependencies.py" --self-test --installed-smoke --online-audit

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
(cd "$ROOT/audit/harness" && npm run media-owner-test)
(cd "$ROOT/audit/harness" && npm run eviive-pair-test)
(cd "$ROOT/audit/harness" && npm run gold-parity-test)
(cd "$ROOT/audit/harness" && npm run river-aria-test)
(cd "$ROOT/audit/harness" && npm run document-language-test)
(cd "$ROOT/audit/harness" && npm run primary-navigation-test)
(cd "$ROOT/audit/harness" && npm run portfolio-media-accessibility-test)
(cd "$ROOT/audit/harness" && npm run swatch-focus-test)
(cd "$ROOT/audit/harness" && npm run touchbaes-readiness-test)
(cd "$ROOT/audit/harness" && npm run interaction-test)
(cd "$ROOT/audit/harness" && npm run montran-pdf-allowlist-test)
(cd "$ROOT/audit/harness" && npm run iframe-capability-test)

"$ROOT/cargo/validate-cargo-payload.sh" bodycopy "$ROOT/cargo/home.html"
"$ROOT/cargo/validate-cargo-payload.sh" bodycopy "$ROOT/cargo/who.html"
"$ROOT/cargo/validate-cargo-payload.sh" bodycopy "$ROOT/cargo/write.html"
"$ROOT/cargo/validate-cargo-payload.sh" head "$ROOT/cargo/site-head.html"
python3 "$ROOT/audit/scripts/validate-media-playback-owner.py"
python3 "$ROOT/audit/scripts/validate-root-runtime-owner.py" --self-test
python3 "$ROOT/audit/scripts/validate-root-runtime-owner.py"
FROZEN_CARGO="$ROOT/docs/audits/2026-07-20T175853-0400-round-80/cargo-draft"
python3 - "$ROOT" "$FROZEN_CARGO" <<'PY'
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(sys.argv[1])
snapshot = Path(sys.argv[2])
manifest_validator = root / "cargo/validate-deployment-manifest.py"
deployment_manifest = json.loads(
    (root / "cargo/deployment-manifest.json").read_text(encoding="utf-8")
)

# The immutable Phase 1 Cargo capture predates the approved 504x504 WTW
# correction. Apply that documented post-Round-80 delta only to an in-memory
# persistence fixture; never rewrite the frozen evidence.
home = (snapshot / "home.bodycopy.html").read_text(encoding="utf-8")
home = home.replace("--asset-w:765.2;--asset-h:765.2", "--asset-w:504;--asset-h:504", 1)


def normalize_eviive_final_pair(match):
    tag = match.group(0)
    tag = tag.replace('data-fit="contain"', 'data-fit="cover"', 1)
    return tag.replace(
        "--asset-w:670;--asset-h:377.593",
        "--asset-w:670;--asset-h:372",
        1,
    )


home, eviive_normalized = re.subn(
    r'<div\b(?=[^>]*\bdata-media-id="eviive-06")[^>]*>',
    normalize_eviive_final_pair,
    home,
    count=1,
)
if eviive_normalized != 1:
    raise SystemExit(
        f"expected one frozen EVIIVE final-pair frame, found {eviive_normalized}"
    )

# The frozen Cargo serializer also emitted three case-duplicate SVG viewBox
# attributes. Current payload validation correctly rejects duplicate names
# before dictionary conversion, so remove only those known duplicates in this
# in-memory historical fixture. The frozen capture remains byte-identical.
home, duplicate_viewboxes = re.subn(
    r'(<svg\b[^>]*\sviewBox="[^"]*")\s+viewbox="[^"]*"',
    r'\1',
    home,
)
if duplicate_viewboxes != 3:
    raise SystemExit(
        f"expected three frozen duplicate SVG viewBox attributes, found {duplicate_viewboxes}"
    )

# The authenticated snapshot was captured after Cargo's runtime had activated
# deferred media and changed loading state. Normalize only that runtime-owned
# state in memory so this fixture exercises the saved bodycopy contract. The
# frozen evidence remains byte-identical and production validation stays strict.
def strip_runtime_media_state(match):
    tag = match.group(0)
    if " data-src=" in tag:
        tag = re.sub(r'\s+src="[^"]*"', "", tag)
    return re.sub(
        r'\s+(?:poster|data-mms-loaded|data-motion-ready|data-mms-source)="[^"]*"',
        "",
        tag,
    )


def strip_river_runtime_state(match):
    tag = re.sub(r'\s+hidden(?:="[^"]*")?', "", match.group(0))
    return re.sub(r'\s+aria-valuenow="[^"]*"', "", tag)


image_index = 0


def restore_image_loading(match):
    global image_index
    tag = re.sub(r'\s+loading="[^"]*"', "", match.group(0))
    value = "eager" if image_index == 0 else "lazy"
    image_index += 1
    if tag.endswith("/>"):
        return f'{tag[:-2]} loading="{value}"/>'
    return f'{tag[:-1]} loading="{value}">'


def normalize_primary_navigation(source):
    source, expanded = re.subn(
        r'<aside class="mms-rail">(.*?)</aside>',
        r'<nav aria-label="Primary" class="mms-rail">\1</nav>',
        source,
        count=1,
        flags=re.DOTALL,
    )
    source, compact = re.subn(
        r'<nav class="mms-mlinks">',
        '<nav aria-label="Primary" class="mms-mlinks">',
        source,
        count=1,
    )
    if expanded != 1 or compact != 1:
        raise SystemExit(
            "could not normalize frozen primary navigation: "
            f"expanded={expanded}, compact={compact}"
        )
    return source


def set_owner_attributes(source, media_id, attributes):
    pattern = re.compile(
        rf'<[a-z][^>]*\bdata-media-id="{re.escape(media_id)}"[^>]*>',
        flags=re.IGNORECASE,
    )

    def update(match):
        tag = match.group(0)
        for name, value in attributes.items():
            tag = re.sub(
                rf'\s+{re.escape(name)}'
                rf'(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+))?',
                "",
                tag,
                flags=re.IGNORECASE,
            )
            tag = f'{tag[:-1]} {name}="{value}">'
        return tag

    updated, count = pattern.subn(update, source, count=1)
    if count != 1:
        raise SystemExit(
            f"could not normalize frozen semantic owner {media_id}: found {count}"
        )
    return updated


def normalize_content_semantics(source, page):
    semantics = deployment_manifest["pages"][page]["content_semantics"]
    decorative = semantics["decorative_native_media"]
    for media_id in decorative["media_ids"]:
        source = set_owner_attributes(
            source,
            media_id,
            {
                "aria-hidden": "true",
                "data-a11y-policy": "decorative",
            },
        )
    for item in semantics["interactive_embeds"]["items"]:
        source = set_owner_attributes(
            source,
            item["media_id"],
            {"data-a11y-policy": "interactive"},
        )

    image_count = 0

    def normalize_image_alt(match):
        nonlocal image_count
        image_count += 1
        tag = re.sub(
            r'\s+alt(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+))?',
            "",
            match.group(0),
            flags=re.IGNORECASE,
        )
        return f'{tag[:-1]} alt="">'

    source = re.sub(r"<img\b[^>]*>", normalize_image_alt, source)
    expected_images = decorative["kind_counts"].get("img", 0)
    if image_count != expected_images:
        raise SystemExit(
            f"could not normalize frozen {page} image semantics: "
            f"expected {expected_images}, found {image_count}"
        )

    figure_labels = [
        item["label"] for item in semantics["named_project_figures"]["items"]
    ]
    figure_index = 0

    def normalize_figure_name(match):
        nonlocal figure_index
        if figure_index >= len(figure_labels):
            raise SystemExit(f"unexpected extra frozen {page} project figure")
        tag = re.sub(
            r'\s+aria-label(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+))?',
            "",
            match.group(0),
            flags=re.IGNORECASE,
        )
        label = figure_labels[figure_index].replace("&", "&amp;").replace('"', "&quot;")
        figure_index += 1
        return f'{tag[:-1]} aria-label="{label}">'

    source = re.sub(
        r'<figure\b(?=[^>]*\bclass="[^"]*\bmms-desc\b[^"]*")[^>]*>',
        normalize_figure_name,
        source,
        flags=re.IGNORECASE,
    )
    if figure_index != len(figure_labels):
        raise SystemExit(
            f"could not normalize frozen {page} figure semantics: "
            f"expected {len(figure_labels)}, found {figure_index}"
        )
    return source


home = re.sub(r'<(?:video|iframe)\b[^>]*>', strip_runtime_media_state, home)
home = re.sub(
    r'<[^>]+\bclass="[^"]*\bmms-river\b[^"]*"[^>]*>',
    strip_river_runtime_state,
    home,
)
home = re.sub(r'<img\b[^>]*>', restore_image_loading, home)
home = normalize_primary_navigation(home)
home = normalize_content_semantics(home, "home")
with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8") as handle:
    handle.write(home)
    handle.flush()
    subprocess.run([sys.executable, str(manifest_validator), "bodycopy", handle.name, "home"], check=True)

for page in ("who", "write"):
    bodycopy = normalize_primary_navigation(
        (snapshot / f"{page}.bodycopy.html").read_text(encoding="utf-8")
    )
    bodycopy = normalize_content_semantics(bodycopy, page)
    with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8") as handle:
        handle.write(bodycopy)
        handle.flush()
        subprocess.run(
            [sys.executable, str(manifest_validator), "bodycopy", handle.name, page],
            check=True,
        )

# The immutable head capture also predates Round 101's visual-neutral document
# language declaration. Add only the reviewed marker and pre-route-gate setter
# to a temporary in-memory fixture; never rewrite the frozen evidence.
head = (snapshot / "site-head.html").read_text(encoding="utf-8")
head = head.replace(
    '<script data-mms-ios-edge-head="49">',
    '<script data-mms-ios-edge-head="49" data-mms-document-language="en">',
    1,
)
head = head.replace(
    "(function () {\n",
    "(function () {\n  document.documentElement.setAttribute('lang', 'en');\n\n",
    1,
)
with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8") as handle:
    handle.write(head)
    handle.flush()
    subprocess.run([sys.executable, str(manifest_validator), "head", handle.name], check=True)
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
import json
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


def alter_eviive_geometry(source):
    updated = source.replace(
        'data-media-id="eviive-06" data-shape-policy="crop" data-fit="cover" '
        'data-mobile-profile="standard" style="--asset-w:670;--asset-h:372"',
        'data-media-id="eviive-06" data-shape-policy="crop" data-fit="cover" '
        'data-mobile-profile="standard" style="--asset-w:670;--asset-h:373"',
        1,
    )
    if updated == source:
        raise SystemExit("could not build negative EVIIVE geometry fixture")
    return updated


def alter_eviive_fit(source):
    updated = source.replace(
        'data-media-id="eviive-06" data-shape-policy="crop" data-fit="cover"',
        'data-media-id="eviive-06" data-shape-policy="crop" data-fit="contain"',
        1,
    )
    if updated == source:
        raise SystemExit("could not build negative EVIIVE fit fixture")
    return updated


def add_live_video_src(source):
    match = re.search(r'<video\b[^>]*\bdata-src="([^"]+)"[^>]*>', source)
    if match is None:
        raise SystemExit("could not build live-video source fixture")
    tag = match.group(0).replace("<video", f'<video src="{match.group(1)}"', 1)
    return source[:match.start()] + tag + source[match.end():]


def add_equal_native_poster(source):
    match = re.search(r'<video\b[^>]*\bdata-poster="([^"]+)"[^>]*>', source)
    if match is None:
        raise SystemExit("could not build native-poster fixture")
    tag = match.group(0).replace("<video", f'<video poster="{match.group(1)}"', 1)
    return source[:match.start()] + tag + source[match.end():]


def add_equal_iframe_poster(source):
    match = re.search(r'<iframe\b[^>]*\bdata-poster="([^"]+)"[^>]*>', source)
    if match is None:
        raise SystemExit("could not build iframe-poster fixture")
    tag = match.group(0).replace("<iframe", f'<iframe poster="{match.group(1)}"', 1)
    return source[:match.start()] + tag + source[match.end():]


def promote_first_iframe(source):
    match = re.search(r'<iframe\b[^>]*\bloading="lazy"[^>]*>', source)
    if match is None:
        raise SystemExit("could not build iframe-loading fixture")
    tag = match.group(0).replace('loading="lazy"', 'loading="eager"', 1)
    return source[:match.start()] + tag + source[match.end():]


def swap_eager_image_identity(source):
    updated = source.replace('loading="eager"', 'loading="__mms_swap__"', 1)
    updated = updated.replace('loading="lazy"', 'loading="eager"', 1)
    return updated.replace('loading="__mms_swap__"', 'loading="lazy"', 1)


def expanded_navigation_as_legacy_aside(source):
    pattern = (
        r'<nav aria-label="Primary" class="mms-rail">'
        r'(.*?)</nav>'
    )
    updated, count = re.subn(
        pattern,
        r'<aside class="mms-rail">\1</aside>',
        source,
        count=1,
        flags=re.DOTALL,
    )
    if count != 1:
        raise SystemExit("could not build legacy expanded-navigation fixture")
    return updated


def duplicate_compact_primary_navigation(source):
    match = re.search(
        r'<nav aria-label="Primary" class="mms-mlinks">.*?</nav>',
        source,
        flags=re.DOTALL,
    )
    if match is None:
        raise SystemExit("could not build duplicate compact-navigation fixture")
    return source[:match.start()] + match.group(0) + "\n" + source[match.start():]


def merge_primary_navigation_classes(source):
    updated = source.replace(
        '<nav aria-label="Primary" class="mms-rail">',
        '<nav aria-label="Primary" class="mms-rail mms-mlinks">',
        1,
    )
    updated, count = re.subn(
        r'<nav aria-label="Primary" class="mms-mlinks">.*?</nav>',
        "",
        updated,
        count=1,
        flags=re.DOTALL,
    )
    if count != 1:
        raise SystemExit("could not build merged navigation-class fixture")
    return updated


def add_serialized_river_scrubber(source):
    updated, count = re.subn(
        r'(<figure\b(?=[^>]*\bclass="[^"]*\bmms-desc\b[^"]*")[^>]*>)',
        r'<div class="mms-river-scrubber"></div>\1',
        source,
        count=1,
        flags=re.IGNORECASE,
    )
    if count != 1:
        raise SystemExit("could not build serialized river-scrubber fixture")
    return updated


def wrap_expanded_primary_navigation(source, opening, closing):
    updated, count = re.subn(
        r'(<nav aria-label="Primary" class="mms-rail">.*?</nav>)',
        opening + r'\1' + closing,
        source,
        count=1,
        flags=re.DOTALL,
    )
    if count != 1:
        raise SystemExit("could not build wrapped primary-navigation fixture")
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
    "wrong EVIIVE final-pair geometry": alter_eviive_geometry(home),
    "wrong EVIIVE final-pair fit": alter_eviive_fit(home),
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
    "unexpected live video source": add_live_video_src(home),
    "persisted loaded marker": home.replace(
        "<video autoplay=", '<video data-mms-loaded="1" autoplay=', 1
    ),
    "persisted ready marker": home.replace(
        "<video autoplay=", '<video data-motion-ready="1" autoplay=', 1
    ),
    "persisted source marker": home.replace(
        "<video autoplay=", '<video data-mms-source="example" autoplay=', 1
    ),
    "persisted native poster": add_equal_native_poster(home),
    "persisted iframe poster": add_equal_iframe_poster(home),
    "persisted child source": home.replace(
        "</video>", '<source src="https://example.invalid/runtime.mp4"></video>', 1
    ),
    "persisted hidden river": home.replace(
        '<div class="mms-river"', '<div class="mms-river" hidden=""', 1
    ),
    "persisted river aria-valuenow": home.replace(
        '<div class="mms-river"', '<div class="mms-river" aria-valuenow="0"', 1
    ),
    "persisted river scrollbar role": home.replace(
        '<div class="mms-river"', '<div class="mms-river" role="scrollbar"', 1
    ),
    "persisted river aria-orientation": home.replace(
        '<div class="mms-river"', '<div class="mms-river" aria-orientation="horizontal"', 1
    ),
    "persisted river aria-valuemin": home.replace(
        '<div class="mms-river"', '<div class="mms-river" aria-valuemin="0"', 1
    ),
    "persisted river aria-valuemax": home.replace(
        '<div class="mms-river"', '<div class="mms-river" aria-valuemax="100"', 1
    ),
    "persisted river aria-valuetext": home.replace(
        '<div class="mms-river"', '<div class="mms-river" aria-valuetext="0% through gallery"', 1
    ),
    "duplicate river class attribute": home.replace(
        '<div class="mms-river"', '<div class="mms-river" class="not-river"', 1
    ),
    "missing native river class": home.replace(
        '<div class="mms-river"', '<div class="not-river"', 1
    ),
    "persisted display-none river": home.replace(
        '<div class="mms-river">', '<div class="mms-river" style="display: none">', 1
    ),
    "runtime image priority drift": home.replace(
        'loading="lazy"', 'loading="eager"', 1
    ),
    "runtime eager-image identity swap": swap_eager_image_identity(home),
    "runtime iframe priority drift": promote_first_iframe(home),
    "runtime video preload drift": home.replace(
        'preload="none"', 'preload="auto"', 1
    ),
    "serialized river scrubber": add_serialized_river_scrubber(home),
    "legacy expanded complementary rail": expanded_navigation_as_legacy_aside(home),
    "missing expanded primary label": home.replace(
        '<nav aria-label="Primary" class="mms-rail">',
        '<nav class="mms-rail">',
        1,
    ),
    "wrong compact primary label": home.replace(
        '<nav aria-label="Primary" class="mms-mlinks">',
        '<nav aria-label="Portfolio" class="mms-mlinks">',
        1,
    ),
    "duplicate compact primary navigation": duplicate_compact_primary_navigation(home),
    "merged responsive navigation classes": merge_primary_navigation_classes(home),
    "expanded primary role override": home.replace(
        '<nav aria-label="Primary" class="mms-rail">',
        '<nav aria-label="Primary" class="mms-rail" role="complementary">',
        1,
    ),
    "primary navigation nested in aside": wrap_expanded_primary_navigation(
        home,
        "<aside>",
        "</aside>",
    ),
    "primary navigation nested in complementary role": wrap_expanded_primary_navigation(
        home,
        '<div role="complementary">',
        "</div>",
    ),
    "primary navigation nested in generic nav": wrap_expanded_primary_navigation(
        home,
        '<nav aria-label="Extra">',
        "</nav>",
    ),
    "primary navigation nested in navigation role": wrap_expanded_primary_navigation(
        home,
        '<div aria-label="Extra" role="navigation">',
        "</div>",
    ),
    "extra sibling navigation": home.replace(
        '<nav aria-label="Primary" class="mms-rail">',
        '<nav aria-label="Extra"><a href="#extra">Extra</a></nav>\n'
        '<nav aria-label="Primary" class="mms-rail">',
        1,
    ),
    "primary navigation aria-labelledby override": home.replace(
        '<nav aria-label="Primary" class="mms-rail">',
        '<nav aria-label="Primary" aria-labelledby="portfolio-label" class="mms-rail">',
        1,
    ),
    "primary navigation popover suppression": home.replace(
        '<nav aria-label="Primary" class="mms-rail">',
        '<nav aria-label="Primary" class="mms-rail" popover="manual">',
        1,
    ),
    "primary navigation hidden ancestor": wrap_expanded_primary_navigation(
        home,
        "<div hidden>",
        "</div>",
    ),
    "primary navigation aria-hidden ancestor": wrap_expanded_primary_navigation(
        home,
        '<div aria-hidden="true">',
        "</div>",
    ),
    "primary navigation inert ancestor": wrap_expanded_primary_navigation(
        home,
        "<div inert>",
        "</div>",
    ),
    "primary navigation display-none ancestor": wrap_expanded_primary_navigation(
        home,
        '<div style="display: none">',
        "</div>",
    ),
    "primary navigation important display-none ancestor": wrap_expanded_primary_navigation(
        home,
        '<div style="display: none !important">',
        "</div>",
    ),
    "primary navigation template ancestor": wrap_expanded_primary_navigation(
        home,
        "<template>",
        "</template>",
    ),
    "primary navigation unexpected direct parent": wrap_expanded_primary_navigation(
        home,
        "<div>",
        "</div>",
    ),
    "legacy all-video playback owner": home + (
        '<script>/*mms-video-autoplay*/document.querySelectorAll("video.mms-video")'
        '.forEach(function(video){video.play()});</script>'
    ),
    "unclosed MM.S root": home.replace(
        "</dialog>\n</div>\n<script>",
        "</dialog>\n<script>",
        1,
    ),
}

source_purity_labels = {
    "persisted loaded marker",
    "persisted ready marker",
    "persisted source marker",
    "persisted native poster",
    "persisted iframe poster",
    "persisted child source",
    "persisted hidden river",
    "persisted river aria-valuenow",
    "persisted river scrollbar role",
    "persisted river aria-orientation",
    "persisted river aria-valuemin",
    "persisted river aria-valuemax",
    "persisted river aria-valuetext",
    "missing native river class",
    "persisted display-none river",
    "runtime image priority drift",
    "runtime eager-image identity swap",
    "runtime iframe priority drift",
    "runtime video preload drift",
    "serialized river scrubber",
    "legacy expanded complementary rail",
    "missing expanded primary label",
    "wrong compact primary label",
    "duplicate compact primary navigation",
    "merged responsive navigation classes",
    "expanded primary role override",
    "primary navigation nested in aside",
    "primary navigation nested in complementary role",
    "primary navigation nested in generic nav",
    "primary navigation nested in navigation role",
    "extra sibling navigation",
    "primary navigation aria-labelledby override",
    "primary navigation popover suppression",
    "primary navigation hidden ancestor",
    "primary navigation aria-hidden ancestor",
    "primary navigation inert ancestor",
    "primary navigation display-none ancestor",
    "primary navigation important display-none ancestor",
    "primary navigation template ancestor",
    "primary navigation unexpected direct parent",
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
    if label in source_purity_labels and "saved-source purity" not in result.stderr:
        raise SystemExit(
            f"source-purity fixture was rejected by an unrelated guard: {label}: {result.stderr}"
        )

language_assignment = "document.documentElement.setAttribute('lang', 'en');"
late_language_head = head.replace(language_assignment + "\n\n", "", 1).replace(
    "if (!isHomepage) return;",
    "if (!isHomepage) return;\n  " + language_assignment,
    1,
)
head_mutations = {
    "external script source": head.replace(
        "<script ", '<script src="https://example.invalid/inert.js" ', 1
    ),
    "inert script type": head.replace(
        "<script ", '<script type="application/json" ', 1
    ),
    "stale edge head": head.replace(
        'data-mms-ios-edge-head="49"', 'data-mms-ios-edge-head="48"', 1
    ),
    "missing language marker": head.replace(
        ' data-mms-document-language="en"', "", 1
    ),
    "wrong language marker": head.replace(
        'data-mms-document-language="en"', 'data-mms-document-language="fr"', 1
    ),
    "comment-only language marker": head.replace(
        ' data-mms-document-language="en"', "", 1
    ).replace(
        "(function () {",
        '/* data-mms-document-language="en" */\n(function () {',
        1,
    ),
    "prefixed language marker attribute": head.replace(
        'data-mms-document-language="en"',
        'data-decoy-data-mms-document-language="en"',
        1,
    ),
    "value-only language marker": head.replace(
        'data-mms-document-language="en"',
        'data-decoy=\'data-mms-document-language="en"\'',
        1,
    ),
    "missing language assignment": head.replace(language_assignment, "", 1),
    "commented language assignment": head.replace(
        language_assignment, "// " + language_assignment, 1
    ),
    "string-literal language assignment": head.replace(
        language_assignment,
        'var inertLanguageSetter = "' + language_assignment + '";',
        1,
    ),
    "block-comment language assignment": head.replace(
        language_assignment,
        "/*\n  " + language_assignment + "\n  */",
        1,
    ),
    "template-literal language assignment": head.replace(
        language_assignment,
        "`\n  " + language_assignment + "\n  `;",
        1,
    ),
    "duplicate language assignment": head.replace(
        language_assignment, language_assignment + "\n  " + language_assignment, 1
    ),
    "language assignment after route gate": late_language_head,
}
for label, payload in head_mutations.items():
    if payload == head:
        raise SystemExit(f"negative fixture did not mutate the head: {label}")
    with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8") as handle:
        handle.write(payload)
        handle.flush()
        result = subprocess.run(
            [str(validator), "head", handle.name],
            capture_output=True,
            text=True,
            check=False,
        )
    if result.returncode == 0:
        raise SystemExit(f"negative deployment fixture unexpectedly passed: {label}")

manifest_validator = root / "cargo/validate-deployment-manifest.py"
manifest = json.loads((root / "cargo/deployment-manifest.json").read_text(encoding="utf-8"))
manifest_mutations = {}
missing_purity = json.loads(json.dumps(manifest))
del missing_purity["pages"]["home"]["source_purity"]
manifest_mutations["missing source-purity contract"] = missing_purity
old_schema = json.loads(json.dumps(manifest))
old_schema["schema_version"] = 1
manifest_mutations["stale manifest schema"] = old_schema
invalid_language = json.loads(json.dumps(manifest))
invalid_language["head"]["document_language"] = "english"
manifest_mutations["invalid document language"] = invalid_language

for label, payload in manifest_mutations.items():
    with tempfile.NamedTemporaryFile("w", suffix=".json", encoding="utf-8") as manifest_handle:
        json.dump(payload, manifest_handle)
        manifest_handle.flush()
        if label == "invalid document language":
            validation_args = [
                sys.executable,
                str(manifest_validator),
                "head",
                str(root / "cargo/site-head.html"),
                "--manifest",
                manifest_handle.name,
            ]
        else:
            validation_args = [
                sys.executable,
                str(manifest_validator),
                "bodycopy",
                str(root / "cargo/home.html"),
                "home",
                "--manifest",
                manifest_handle.name,
            ]
        result = subprocess.run(
            validation_args,
            capture_output=True,
            text=True,
            check=False,
        )
    if result.returncode == 0:
        raise SystemExit(f"negative manifest fixture unexpectedly passed: {label}")

print(
    "Deployment-manifest negative fixtures: PASS "
    f"({len(bodycopy_mutations) + len(head_mutations) + len(manifest_mutations)} rejected)"
)
PY
"$ROOT/cargo/compose-css-bundle.sh" >/dev/null
python3 "$ROOT/cargo/validate-shared-components.py"
python3 "$ROOT/cargo/validate-test-mirrors.py" home who write

# Focused browser lifecycle gate: repeated Cargo root replacement must leave
# one coherent current runtime generation without accumulating owned resources.
npm --prefix "$ROOT/audit/harness" run runtime-root-test

echo "MM.S Phase 2 audit foundation: PASS"
