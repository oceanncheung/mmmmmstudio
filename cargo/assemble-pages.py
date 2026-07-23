#!/usr/bin/env python3
"""Assemble Home, Who, and Write from shared Cargo shell partials."""

from __future__ import annotations

import fcntl
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PAGES = {"home": "/", "who": "/who", "write": "/write"}
LOCK_PATH = Path(tempfile.gettempdir()) / "mms-cargo-assemble-pages.lock"


def read(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def replace_once(source: str, marker: str, value: str, *, expected: int = 1) -> str:
    count = source.count(marker)
    if count != expected:
        raise RuntimeError(f"{marker}: expected {expected} occurrence(s), found {count}")
    return source.replace(marker, value)


def bootstrap_home_template() -> None:
    template_path = ROOT / "home.template.html"
    if template_path.exists():
        return

    source = read("home.html")
    substitutions = [
        (r"\A<script id=\"mms-early-viewport-init\">.*?</script>\s*", "<!-- MMS_EARLY_INIT -->\n"),
        (r"<header class=\"mms-mbar\">.*?</header>", "<!-- MMS_MOBILE_HEADER -->"),
        (
            r"<(?:aside|nav)(?=[^>]*\bclass=\"[^\"]*\bmms-rail\b[^\"]*\")[^>]*>.*?</(?:aside|nav)>",
            "<!-- MMS_DESKTOP_NAV -->",
        ),
        (
            r"<nav(?=[^>]*\bclass=\"[^\"]*\bmms-mlinks\b[^\"]*\")[^>]*>.*?</nav>",
            "<!-- MMS_COMPACT_NAV -->",
        ),
        (r"<dialog aria-label=\"site controls\".*?</dialog>", "<!-- MMS_PANEL -->"),
        (
            r"<script>/\* mm\.s control panel.*?</script>\s*\Z",
            "<script>/* MMS_PANEL_JS */</script>\n<!-- MMS_HOME_EXTRAS -->\n",
        ),
    ]
    for pattern, replacement in substitutions:
        source, count = re.subn(pattern, replacement, source, count=1, flags=re.DOTALL)
        if count != 1:
            raise RuntimeError(f"could not bootstrap Home template: {pattern}")

    unresolved_shared = (
        'id="mms-early-viewport-init"',
        'class="mms-mbar"',
        'class="mms-rail"',
        'class="mms-mlinks"',
        'class="mms-panel"',
        "mm.s control panel",
    )
    for fragment in unresolved_shared:
        if fragment in source:
            raise RuntimeError(f"Home template retained shared fragment: {fragment}")

    template_path.write_text(source, encoding="utf-8")
    template_path.chmod(0o644)


def nav_items(current_href: str) -> str:
    nav = read("shared-nav-items.html")
    substitutions = {
        "{{CURRENT_WORK}}": ' aria-current="page"' if current_href == "/" else "",
        "{{CURRENT_WRITE}}": ' aria-current="page"' if current_href == "/write" else "",
        "{{CURRENT_WHO}}": ' aria-current="page"' if current_href == "/who" else "",
    }
    for marker, value in substitutions.items():
        nav = replace_once(nav, marker, value)
    return nav.rstrip()


def render_navigation(partial_name: str, current_href: str) -> str:
    return replace_once(read(partial_name), "<!-- MMS_NAV_ITEMS -->", nav_items(current_href)).rstrip()


def render_page(page: str, current_href: str) -> str:
    source = read(f"{page}.template.html")
    replacements = {
        "<!-- MMS_EARLY_INIT -->": read("shared-early-init.html").rstrip(),
        "<!-- MMS_MOBILE_HEADER -->": read("shared-mobile-header.html").rstrip(),
        "<!-- MMS_DESKTOP_NAV -->": render_navigation("shared-desktop-nav.html", current_href),
        "<!-- MMS_COMPACT_NAV -->": render_navigation("shared-compact-nav.html", current_href),
        "<!-- MMS_DESKTOP_CLOCK -->": read("shared-desktop-clock.html").rstrip(),
        "<!-- MMS_PANEL -->": read("shared-panel.html").rstrip(),
        "/* MMS_PANEL_JS */": read("panel.js").rstrip(),
    }
    for marker, value in replacements.items():
        source = replace_once(source, marker, value)

    if page == "who":
        source = replace_once(source, "<!-- MMS_WHO_INTRO -->", read("who-intro.html").strip(), expected=2)
    if page == "home":
        source = replace_once(source, "<!-- MMS_HOME_EXTRAS -->", read("home-extras.html").rstrip())

    unresolved = re.findall(r"<!-- MMS_[A-Z0-9_]+ -->|/\* MMS_[A-Z0-9_]+ \*/", source)
    if unresolved:
        raise RuntimeError(f"{page}: unresolved assembly markers: {unresolved}")

    return source


def validate_outputs(directory: Path) -> None:
    for page in PAGES:
        subprocess.run(
            [str(ROOT / "validate-cargo-payload.sh"), "bodycopy", str(directory / f"{page}.html")],
            check=True,
        )
    subprocess.run(
        [
            sys.executable,
            str(ROOT / "validate-shared-components.py"),
            "--directory",
            str(directory),
        ],
        check=True,
    )


def restore_file(destination: Path, content: bytes, mode: int) -> None:
    fd, tmp_name = tempfile.mkstemp(prefix=f".{destination.stem}.rollback.", suffix=destination.suffix, dir=ROOT)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(content)
        os.chmod(tmp_name, mode)
        os.replace(tmp_name, destination)
    except Exception:
        try:
            os.unlink(tmp_name)
        except FileNotFoundError:
            pass
        raise


def commit_outputs(staging: Path) -> None:
    backups: dict[str, tuple[bytes, int] | None] = {}
    for page in PAGES:
        destination = ROOT / f"{page}.html"
        backups[page] = (
            (destination.read_bytes(), destination.stat().st_mode & 0o7777)
            if destination.exists()
            else None
        )

    committed_pages: list[str] = []
    try:
        for page in PAGES:
            destination = ROOT / f"{page}.html"
            staged = staging / f"{page}.html"
            staged.chmod(0o644)
            os.replace(staged, destination)
            destination.chmod(0o644)
            committed_pages.append(page)

        validate_outputs(ROOT)
        for page in PAGES:
            mode = (ROOT / f"{page}.html").stat().st_mode & 0o7777
            if mode != 0o644:
                raise RuntimeError(f"{page}.html: expected mode 0644, found {mode:04o}")
    except Exception:
        rollback_errors: list[str] = []
        for page in reversed(committed_pages):
            backup = backups[page]
            destination = ROOT / f"{page}.html"
            try:
                if backup is None:
                    destination.unlink(missing_ok=True)
                else:
                    restore_file(destination, backup[0], backup[1])
            except Exception as rollback_error:
                rollback_errors.append(f"{page}: {rollback_error}")
        if rollback_errors:
            raise RuntimeError("page commit failed and rollback was incomplete: " + "; ".join(rollback_errors))
        raise


def assemble() -> int:
    bootstrap_home_template()
    rendered = {page: render_page(page, current_href) for page, current_href in PAGES.items()}

    with tempfile.TemporaryDirectory(prefix=".mms-pages-", dir=ROOT) as tmp_directory:
        staging = Path(tmp_directory)
        for page, source in rendered.items():
            staged = staging / f"{page}.html"
            staged.write_text(source, encoding="utf-8")
            staged.chmod(0o644)

        validate_outputs(staging)
        commit_outputs(staging)

    print("assembled Home, Who, and Write transactionally (mode 0644)")
    return 0


def main() -> int:
    with LOCK_PATH.open("a+") as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        return assemble()


if __name__ == "__main__":
    raise SystemExit(main())
