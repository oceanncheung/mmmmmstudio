#!/usr/bin/env python3
"""Guard shared MM.S shell parity across generated Cargo bodycopies."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PAGES = {"home": "/", "who": "/who", "write": "/write"}


def read(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def read_page(directory: Path, name: str) -> str:
    return (directory / name).read_text(encoding="utf-8")


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def extract(source: str, pattern: str, label: str) -> str:
    matches = re.findall(pattern, source, flags=re.DOTALL)
    if len(matches) != 1:
        raise AssertionError(f"{label}: expected one match, found {len(matches)}")
    return matches[0]


def canonical_nav(partial_name: str, current_href: str) -> str:
    nav = read("shared-nav-items.html")
    replacements = {
        "{{CURRENT_WORK}}": ' aria-current="page"' if current_href == "/" else "",
        "{{CURRENT_WRITE}}": ' aria-current="page"' if current_href == "/write" else "",
        "{{CURRENT_WHO}}": ' aria-current="page"' if current_href == "/who" else "",
    }
    for marker, value in replacements.items():
        nav = nav.replace(marker, value)
    partial = read(partial_name).replace("<!-- MMS_NAV_ITEMS -->", nav.rstrip())
    return normalize(partial)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--directory",
        type=Path,
        default=ROOT,
        help="directory containing generated home.html, who.html, and write.html",
    )
    args = parser.parse_args(argv)
    output_directory = args.directory.resolve()

    expected = {
        "early": normalize(read("shared-early-init.html")),
        "header": normalize(read("shared-mobile-header.html")),
        "clock": normalize(read("shared-desktop-clock.html")),
        "panel": normalize(read("shared-panel.html")),
        "runtime": read("panel.js").strip(),
    }
    who_intro = normalize(read("who-intro.html"))

    for page, current_href in PAGES.items():
        source = read_page(output_directory, f"{page}.html")
        early = extract(source, r"(<script id=\"mms-early-viewport-init\">.*?</script>)", f"{page} early init")
        header = extract(source, r"(<header class=\"mms-mbar\">.*?</header>)", f"{page} mobile header")
        desktop = extract(
            source,
            r"(<nav(?=[^>]*\bclass=\"[^\"]*\bmms-rail\b[^\"]*\")[^>]*>.*?</nav>)",
            f"{page} desktop nav",
        )
        compact = extract(
            source,
            r"(<nav(?=[^>]*\bclass=\"[^\"]*\bmms-mlinks\b[^\"]*\")[^>]*>.*?</nav>)",
            f"{page} compact nav",
        )
        clock = extract(source, r"(<div class=\"mms-clock js-clock\" id=\"mms-clock\">.*?</div>)", f"{page} desktop clock")
        panel = extract(source, r"(<dialog aria-label=\"site controls\".*?</dialog>)", f"{page} panel")
        runtime = extract(source, r"<script>(/\* mm\.s control panel.*?)</script>", f"{page} runtime").strip()

        assert normalize(early) == expected["early"], f"{page}: early init drift"
        assert normalize(header) == expected["header"], f"{page}: mobile header drift"
        assert normalize(desktop) == canonical_nav("shared-desktop-nav.html", current_href), f"{page}: desktop nav drift"
        assert normalize(compact) == canonical_nav("shared-compact-nav.html", current_href), f"{page}: compact nav drift"
        assert normalize(clock) == expected["clock"], f"{page}: desktop clock drift"
        assert normalize(panel) == expected["panel"], f"{page}: panel drift"
        assert runtime == expected["runtime"], f"{page}: panel runtime drift"
        legacy_site_attribute = "data-mms-" + "home"
        assert legacy_site_attribute not in source, f"{page}: legacy site attribute remains"
        assert source.count("data-mms-site") == 1, f"{page}: expected one data-mms-site attribute"

        current_links = re.findall(r"<a\s+([^>]*aria-current=\"page\"[^>]*)>", source)
        assert len(current_links) == 2, f"{page}: expected two current-page links, found {len(current_links)}"
        for attrs in current_links:
            href = re.search(r'href="([^"]+)"', attrs)
            assert href and href.group(1) == current_href, f"{page}: wrong aria-current target"

        panel_source = normalize(panel)
        assert not re.search(r"--dot-(?:bg|center):\s*#[0-9A-Fa-f]{3,8}", panel_source), f"{page}: raw panel swatch color"

        if page == "who":
            assert normalize(source).count(who_intro) == 2, "who: intro source did not assemble twice"
        if page == "home":
            assert normalize(read("home-extras.html")) in normalize(source), "home: Home-only runtime extras drift"
        else:
            assert "mms-tweezer-overlay" not in source, f"{page}: Home-only runtime leaked into named page"

    print("shared component parity: PASS (Home, Who, Write)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as error:
        print(f"shared component parity: FAIL: {error}", file=sys.stderr)
        raise SystemExit(1)
