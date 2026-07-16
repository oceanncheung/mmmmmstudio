#!/usr/bin/env python3
"""Validate standalone Cargo test mirrors against their canonical sources."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PAGES = {"home": "test.html", "who": "who-test.html", "write": "write-test.html"}
PREFIX = (
    b'<!doctype html><html data-theme="white" data-face="serif" data-scale="m" '
    b'data-shape="straight"><head><meta charset="utf-8"><meta name="viewport" '
    b'content="width=device-width, initial-scale=1, viewport-fit=cover"><title>mms test</title><style>\n'
)


def canonical_bytes(page: str) -> bytes:
    return b"".join(
        (
            PREFIX,
            (ROOT / "tokens.css").read_bytes(),
            b"</style><style>\n",
            (ROOT / "site.css").read_bytes(),
            b"</style></head><body>\n",
            (ROOT / f"{page}.html").read_bytes(),
            b"</body></html>\n",
        )
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pages", nargs="*", choices=tuple(PAGES))
    args = parser.parse_args()
    pages = args.pages or list(PAGES)

    for page in pages:
        mirror = ROOT / PAGES[page]
        actual = mirror.read_bytes()
        expected = canonical_bytes(page)
        if actual != expected:
            limit = min(len(actual), len(expected))
            offset = next((index for index in range(limit) if actual[index] != expected[index]), limit)
            raise AssertionError(
                f"{mirror.name}: canonical drift at byte {offset} "
                f"(actual {len(actual)} bytes, expected {len(expected)} bytes)"
            )
        digest = hashlib.sha256(actual).hexdigest()
        print(f"{mirror.name}: PASS {len(actual)} bytes sha256={digest}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
