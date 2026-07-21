#!/usr/bin/env python3
"""Rebuild Cargo's four-region stylesheet without touching managed fonts.

Usage:
    compose-persisted-css.py PERSISTED_CSS

The output order is always:
    Cargo head + local tokens + Cargo-managed text styles + local site CSS.
"""

from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
TOKEN_MARKER = "/* mm.s — design tokens"
LAYOUT_MARKER = "/* mm.s — layout"
MANAGED_CLASSES = (".mms-mono {", ".mms-sans {", ".mms-gothic {")
MANAGED_COMMENT = (
    "/* Cargo-managed text styles. Edited via the Text Styles panel; "
    "leave in place. */"
)


def require_once(value: str, needle: str, label: str) -> int:
    count = value.count(needle)
    if count != 1:
        raise RuntimeError(f"{label}: expected one occurrence, found {count}")
    return value.index(needle)


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: compose-persisted-css.py PERSISTED_CSS", file=sys.stderr)
        return 2

    persisted = Path(sys.argv[1]).read_text(encoding="utf-8")
    token_start = require_once(persisted, TOKEN_MARKER, "token marker")
    layout_start = require_once(persisted, LAYOUT_MARKER, "layout marker")
    managed_start = require_once(persisted, MANAGED_CLASSES[0], "managed mono class")
    for managed_class in MANAGED_CLASSES[1:]:
        require_once(persisted, managed_class, managed_class)

    if not token_start < managed_start < layout_start:
        raise RuntimeError("persisted CSS regions are not in the expected order")

    head = persisted[:token_start].rstrip()
    managed = persisted[managed_start:layout_start].strip()
    tokens = (ROOT / "tokens.css").read_text(encoding="utf-8").rstrip()
    site = (ROOT / "site.css").read_text(encoding="utf-8").rstrip()

    result = "\n\n".join((head, tokens, MANAGED_COMMENT + "\n" + managed, site)) + "\n"
    sys.stdout.write(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
