#!/usr/bin/env python3
"""Fail closed if the removed all-video autoplay owner returns."""

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
payload_path = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else None
if len(sys.argv) > 2:
    raise SystemExit("usage: validate-media-playback-owner.py [bodycopy.html]")
HOME = (payload_path or (ROOT / "cargo/home.html")).read_text(encoding="utf-8")
PANEL = HOME if payload_path else (ROOT / "cargo/panel.js").read_text(encoding="utf-8")
EXTRAS = None if payload_path else (ROOT / "cargo/home-extras.html").read_text(encoding="utf-8")

if (EXTRAS and "mms-video-autoplay" in EXTRAS) or "mms-video-autoplay" in HOME:
    raise SystemExit("media playback ownership: FAIL (legacy autoplay marker returned)")
if EXTRAS and re.search(r"\bsetInterval\s*\(", EXTRAS):
    raise SystemExit("media playback ownership: FAIL (Home extras owns an interval)")

query_pattern = re.compile(
    r"querySelectorAll\s*\(\s*(['\"])(?P<selector>.*?)\1\s*\)",
    re.DOTALL,
)
sources = [("bodycopy", HOME)]
if EXTRAS:
    sources.insert(0, ("Home extras", EXTRAS))
for source_name, source in sources:
    for match in query_pattern.finditer(source):
        selector = re.sub(r"\s+", " ", match.group("selector")).strip()
        unbounded_video_query = (
            "mms-video" in selector and "[data-" not in selector
        ) or bool(re.search(r"(?:^|[\s,>+~])video(?:$|[\s,.#:>+~])", selector) and "[" not in selector)
        if unbounded_video_query:
            raise SystemExit(
                f"media playback ownership: FAIL ({source_name} has unbounded video selector {selector!r})"
            )

required = {
    "deferred-media initializer": "function startDeferredMedia()",
    "observer-owned activation": "function setMediaActive(element, active)",
    "near-media observer": "var mediaObserver = new IntersectionObserver",
    "bounded resume selector": '.mms video[data-mms-loaded="1"]',
}
for label, signature in required.items():
    if signature not in PANEL:
        raise SystemExit(f"media playback ownership: FAIL ({label} missing)")

print("Media playback ownership: PASS (observer is the sole Home video owner)")
