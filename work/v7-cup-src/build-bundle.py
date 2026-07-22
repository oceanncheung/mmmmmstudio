#!/usr/bin/env python3
"""Build the approved self-contained V7 cup embed deterministically."""

import argparse
import base64
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parent


def replace_once(document: str, old: str, new: str, label: str) -> str:
    count = document.count(old)
    if count != 1:
        raise SystemExit(f"ABORT: pattern {label!r} found {count} times (expected 1)")
    return document.replace(old, new)


def build(output: Path) -> None:
    document = (ROOT / "index.html").read_text(encoding="utf-8")
    styles = (ROOT / "styles.css").read_text(encoding="utf-8")
    three = (ROOT / "vendor/three.min.js").read_text(encoding="utf-8")
    main = (ROOT / "src/main.js").read_text(encoding="utf-8")
    texture = (
        'window.CUP_WRAP_DATA_URI = "data:image/png;base64,'
        + base64.b64encode((ROOT / "assets/cup-wrap.png").read_bytes()).decode("ascii")
        + '";\n'
    )

    # These separators intentionally preserve the approved Freight artifact's
    # historical whitespace so recovery is byte-for-byte, not merely semantic.
    document = replace_once(
        document,
        '<link rel="stylesheet" href="./styles.css" />',
        "<style>\n\n\n" + styles + "\n</style>",
        "stylesheet",
    )
    document = replace_once(
        document,
        '<script src="./vendor/three.min.js"></script>',
        "<script>\n" + three + "\n</script>",
        "Three.js",
    )
    document = replace_once(
        document,
        '<script data-mms-inline="cup-texture"></script>',
        "<script>\n" + texture + "\n</script>",
        "cup texture",
    )
    document = replace_once(
        document,
        '<script src="./src/main.js"></script>',
        "<script>\n" + main + "\n</script>",
        "V7 runtime",
    )

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(document.encode("utf-8"))
    print(f"built {output}: {output.stat().st_size} bytes")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "coffee-cup-bundle.html",
        help="output bundle path",
    )
    return parser.parse_args()


if __name__ == "__main__":
    build(parse_args().output.resolve())
