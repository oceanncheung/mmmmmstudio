#!/usr/bin/env python3
"""Generate the MM.S Phase 2 system inventory from the frozen Round 80 baseline.

The generator is deliberately read-only outside ``audit/inventory``. It uses
only Python's standard library, sorts every collection, and records unresolved
platform facts explicitly instead of filling evidence gaps with assumptions.
"""

from __future__ import annotations

import argparse
import ast
import csv
import hashlib
import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Callable, Iterable
from urllib.parse import urlparse


GENERATOR_VERSION = "1.3.0"
DEFAULT_BASELINE = "docs/audits/2026-07-20T175853-0400-round-80"
BASELINE_MANIFEST_SHA256 = "efe8a99a378e769db0fd4cf1fbc10033096673d66a5acce00192f1b7198983a6"
BASELINE_MANIFEST_ENTRIES = 122


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def normal_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def relative_path(path: Path, root: Path) -> str:
    return str(path.resolve().relative_to(root.resolve()))


def verify_baseline_manifest(baseline_root: Path, repository_root: Path) -> dict[str, Any]:
    """Fail closed unless the complete frozen Phase 1 tree matches its root manifest."""
    manifest_path = baseline_root / "SHA256SUMS"
    if not manifest_path.is_file():
        raise RuntimeError("Frozen baseline is missing SHA256SUMS")
    manifest_sha = sha256(manifest_path)
    if manifest_sha != BASELINE_MANIFEST_SHA256:
        raise RuntimeError(
            f"Frozen baseline manifest hash is {manifest_sha}, expected {BASELINE_MANIFEST_SHA256}"
        )

    entries: list[tuple[str, str]] = []
    seen_paths: set[str] = set()
    for line_number, line in enumerate(manifest_path.read_text(encoding="utf-8").splitlines(), 1):
        match = re.fullmatch(r"([0-9a-f]{64})  \./(.+)", line)
        if not match:
            raise RuntimeError(f"Malformed SHA256SUMS line {line_number}")
        expected, relative = match.groups()
        relative_posix = Path(relative).as_posix()
        if relative_posix in seen_paths:
            raise RuntimeError(f"Duplicate SHA256SUMS entry: {relative_posix}")
        if Path(relative_posix).is_absolute() or ".." in Path(relative_posix).parts:
            raise RuntimeError(f"Unsafe SHA256SUMS path: {relative_posix}")
        seen_paths.add(relative_posix)
        entries.append((relative_posix, expected))

    if len(entries) != BASELINE_MANIFEST_ENTRIES:
        raise RuntimeError(
            f"Frozen baseline manifest has {len(entries)} entries, expected {BASELINE_MANIFEST_ENTRIES}"
        )

    verified_bytes = 0
    baseline_resolved = baseline_root.resolve()
    for relative, expected in entries:
        candidate = (baseline_root / relative).resolve()
        try:
            candidate.relative_to(baseline_resolved)
        except ValueError as error:
            raise RuntimeError(f"SHA256SUMS entry escapes baseline root: {relative}") from error
        if not candidate.is_file():
            raise RuntimeError(f"SHA256SUMS entry is missing or not a file: {relative}")
        actual = sha256(candidate)
        if actual != expected:
            raise RuntimeError(
                f"SHA256SUMS mismatch for {relative}: {actual}, expected {expected}"
            )
        verified_bytes += candidate.stat().st_size

    return {
        "manifest": relative_path(manifest_path, repository_root),
        "manifest_sha256": manifest_sha,
        "expected_manifest_sha256": BASELINE_MANIFEST_SHA256,
        "entry_count": len(entries),
        "expected_entry_count": BASELINE_MANIFEST_ENTRIES,
        "verified_bytes": verified_bytes,
        "all_entries_verified": True,
    }


class Node:
    def __init__(self, tag: str, attrs: dict[str, str], parent: "Node | None" = None):
        self.tag = tag
        self.attrs = attrs
        self.parent = parent
        self.children: list[Node | str] = []

    @property
    def classes(self) -> set[str]:
        return set(self.attrs.get("class", "").split())

    def text(self) -> str:
        parts: list[str] = []
        for child in self.children:
            parts.append(child if isinstance(child, str) else child.text())
        return normal_text(" ".join(parts))

    def descendants(self, predicate: Callable[["Node"], bool]) -> list["Node"]:
        found: list[Node] = []
        for child in self.children:
            if isinstance(child, str):
                continue
            if predicate(child):
                found.append(child)
            found.extend(child.descendants(predicate))
        return found


class TreeParser(HTMLParser):
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("document", {})
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Node(tag.lower(), {key: value or "" for key, value in attrs}, self.stack[-1])
        self.stack[-1].children.append(node)
        if tag.lower() not in self.VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag.lower() not in self.VOID:
            self.stack.pop()

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return

    def handle_data(self, data: str) -> None:
        if data:
            self.stack[-1].children.append(data)


def parse_html(value: str) -> Node:
    parser = TreeParser()
    parser.feed(value)
    parser.close()
    return parser.root


def by_class(node: Node, class_name: str) -> list[Node]:
    return node.descendants(lambda item: class_name in item.classes)


def by_tag(node: Node, *tags: str) -> list[Node]:
    wanted = set(tags)
    return node.descendants(lambda item: item.tag in wanted)


def js_array(source: str, name: str) -> list[str]:
    match = re.search(rf"var\s+{re.escape(name)}\s*=\s*(\[[^;]+\])", source)
    if not match:
        raise ValueError(f"Missing JavaScript array {name}")
    result = ast.literal_eval(match.group(1))
    if not isinstance(result, list) or not all(isinstance(item, str) for item in result):
        raise ValueError(f"Invalid JavaScript array {name}")
    return result


def style_value(style: str, custom_property: str) -> str | None:
    match = re.search(rf"(?:^|;)\s*{re.escape(custom_property)}\s*:\s*([^;]+)", style)
    return match.group(1).strip() if match else None


def media_source(node: Node) -> str | None:
    return node.attrs.get("data-src") or node.attrs.get("src") or None


def page_structure(page_name: str, bodycopy_path: Path, root_path: Path) -> dict[str, Any]:
    source = bodycopy_path.read_text(encoding="utf-8")
    root = parse_html(source)

    def describe_media(container: Node) -> dict[str, Any]:
        rendered = container
        if container.tag not in {"img", "video", "iframe"}:
            candidates = container.descendants(lambda item: item.tag in {"img", "video", "iframe"})
            rendered = candidates[0] if candidates else container
        return {
            "id": container.attrs.get("data-media-id"),
            "tag": rendered.tag,
            "slot": rendered.attrs.get("data-slot") or container.attrs.get("data-slot") or None,
            "shape_policy": container.attrs.get("data-shape-policy"),
            "fit": container.attrs.get("data-fit"),
            "mobile_profile": container.attrs.get("data-mobile-profile") or rendered.attrs.get("data-mobile-profile"),
            "asset_width": style_value(container.attrs.get("style", ""), "--asset-w") or style_value(rendered.attrs.get("style", ""), "--asset-w"),
            "asset_height": style_value(container.attrs.get("style", ""), "--asset-h") or style_value(rendered.attrs.get("style", ""), "--asset-h"),
            "source": media_source(rendered),
            "poster": rendered.attrs.get("data-poster") or rendered.attrs.get("poster") or None,
            "fallback_mp4": rendered.attrs.get("data-mp4") or None,
            "loading": rendered.attrs.get("loading") or rendered.attrs.get("preload") or None,
            "motion_priority": rendered.attrs.get("data-motion-priority") or None,
            "embed_kind": rendered.attrs.get("data-embed-kind") or None,
        }

    tags = Counter(node.tag for node in root.descendants(lambda _: True))
    anchors = by_tag(root, "a")
    nav_links = sorted(
        {
            (anchor.text(), anchor.attrs.get("href", ""), anchor.attrs.get("aria-current") == "page")
            for anchor in anchors
            if anchor.attrs.get("href")
        },
        key=lambda item: (item[1], item[0]),
    )
    panels = by_class(root, "mms-panel")
    panel = panels[0] if panels else None
    summary: dict[str, Any] = {
        "source": str(bodycopy_path.resolve().relative_to(root_path.resolve())),
        "bytes": bodycopy_path.stat().st_size,
        "sha256": sha256(bodycopy_path),
        "tag_counts": dict(sorted(tags.items())),
        "navigation_links": [
            {"label": label, "href": href, "current": current}
            for label, href, current in nav_links
        ],
        "shell": {
            "mobile_header": len(by_class(root, "mms-mbar")),
            "desktop_rail": len(by_class(root, "mms-rail")),
            "compact_navigation": len(by_class(root, "mms-mlinks")),
            "clock_instances": len(by_class(root, "js-clock")),
            "introduction_instances": len(by_class(root, "mms-intro")),
            "control_panel_instances": len(panels),
            "wordmark_home_links": sum(
                1 for anchor in anchors
                if "wordmark" in anchor.classes and anchor.attrs.get("href") == "/"
            ),
        },
        "control_panel": {
            "element": panel.tag if panel else None,
            "id": panel.attrs.get("id") if panel else None,
            "aria_modal": panel.attrs.get("aria-modal") if panel else None,
            "open_in_source": panel is not None and "open" in panel.attrs,
            "theme_buttons": len(panel.descendants(lambda item: "data-theme-set" in item.attrs)) if panel else 0,
            "face_buttons": len(panel.descendants(lambda item: "data-face-set" in item.attrs)) if panel else 0,
            "shape_buttons": len(panel.descendants(lambda item: "data-shape-set" in item.attrs)) if panel else 0,
            "scale_sliders": len(panel.descendants(lambda item: item.attrs.get("id") == "mms-scale")) if panel else 0,
        },
        "media_contracts": [
            describe_media(item)
            for item in root.descendants(lambda node: bool(node.attrs.get("data-media-id")))
        ],
    }

    if page_name == "home":
        bands: list[dict[str, Any]] = []
        for section in root.descendants(lambda item: item.tag == "section" and "data-band" in item.attrs):
            media_nodes = section.descendants(lambda item: bool(item.attrs.get("data-media-id")))
            descriptions = [item for item in by_class(section, "mms-desc")]
            desc = descriptions[0] if descriptions else None
            title_groups = by_class(desc, "title-group") if desc else []
            paragraphs = by_tag(desc, "p") if desc else []
            links = by_tag(desc, "a") if desc else []
            media = [describe_media(container) for container in media_nodes]
            bands.append({
                "id": section.attrs["data-band"],
                "offset": section.attrs.get("data-offset"),
                "project_heading": title_groups[0].text() if title_groups else None,
                "paragraphs": [item.text() for item in paragraphs],
                "links": [{"label": item.text(), "href": item.attrs.get("href")} for item in links],
                "media_count": len(media),
                "media": media,
            })
        summary["showcase_bands"] = bands
        summary["showcase_band_count"] = len(bands)
        summary["showcase_media_count"] = sum(item["media_count"] for item in bands)
    elif page_name == "write":
        articles = by_tag(root, "article")
        summary["writing"] = {
            "container_aria_label": (by_class(root, "mms-writing")[0].attrs.get("aria-label") if by_class(root, "mms-writing") else None),
            "piece_count": len(articles),
            "pieces": [
                {
                    "classes": sorted(article.classes),
                    "title": (by_tag(article, "h1")[0].text() if by_tag(article, "h1") else None),
                }
                for article in articles
            ],
        }
    elif page_name == "who":
        people = [item for item in by_tag(root, "article") if "mms-person" in item.classes]
        summary["people"] = [
            {
                "name": (by_tag(person, "h1")[0].text() if by_tag(person, "h1") else None),
                "contact_links": [
                    {"label": link.text(), "href": link.attrs.get("href")}
                    for link in by_tag(person, "a")
                ],
                "media_ids": sorted(
                    item.attrs["data-media-id"]
                    for item in person.descendants(lambda node: "data-media-id" in node.attrs)
                ),
            }
            for person in people
        ]
    return summary


def url_origins(root: Path, page_structures: dict[str, dict[str, Any]], extra_sources: Iterable[Path]) -> list[dict[str, Any]]:
    locations: dict[str, set[str]] = {}
    url_pattern = re.compile(r"(?:https?|mailto):[^\s\"'<>\\)]+")
    for page in page_structures.values():
        source_path = root / page["source"]
        source = source_path.read_text(encoding="utf-8")
        for value in url_pattern.findall(source):
            parsed = urlparse(value)
            origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.netloc else f"{parsed.scheme}:"
            locations.setdefault(origin, set()).add(relative_path(source_path, root))
    for path in extra_sources:
        source = path.read_text(encoding="utf-8", errors="replace")
        for value in url_pattern.findall(source):
            parsed = urlparse(value)
            origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.netloc else f"{parsed.scheme}:"
            locations.setdefault(origin, set()).add(str(path.resolve().relative_to(root.resolve())))
    return [
        {"origin": origin, "observed_in": sorted(values)}
        for origin, values in sorted(locations.items())
    ]


def origin_boundaries(observed: list[dict[str, Any]]) -> list[dict[str, Any]]:
    observed_by_origin = {item["origin"]: item["observed_in"] for item in observed}
    definitions = [
        {
            "origin": "https://mmmmm.studio",
            "classification": "first-party-document",
            "runtime_role": ["published HTML document", "navigation targets", "site metadata and RSS"],
            "executes_code": True,
            "data_exchange": "same-origin page navigation and document/runtime loading",
            "fallback": "captured Cargo page bodycopy is the reconstruction source; no offline application fallback",
        },
        {
            "origin": "https://cargo.site",
            "classification": "platform-vendor-identity",
            "runtime_role": ["Cargo 3 service vendor represented by the frozen site identity"],
            "executes_code": False,
            "data_exchange": "no direct request to this origin was observed in the frozen documents",
            "fallback": "not applicable; concrete runtime resources use Cargo's build, type, static, API, and Freight origins",
        },
        {
            "origin": "https://freight.cargo.site",
            "classification": "platform-cdn-and-cross-origin-embed",
            "runtime_role": ["images", "video", "posters", "PDF", "V7/Touchbaes/Montran iframes"],
            "executes_code": True,
            "data_exchange": "media GETs, PDF range requests, and iframe postMessage contracts",
            "fallback": "video and iframe posters remain visible; Montran records a full-download fallback when range loading fails",
        },
        {
            "origin": "https://static.cargo.site",
            "classification": "platform-static",
            "runtime_role": ["Cargo-managed static UI and favicon assets"],
            "executes_code": False,
            "data_exchange": "read-only asset GETs",
            "fallback": "browser default presentation if a non-essential platform asset is unavailable",
        },
        {
            "origin": "https://build.cargo.site",
            "classification": "platform-frontend-stylesheet",
            "runtime_role": ["Cargo frontend CSS loaded by each published document"],
            "executes_code": False,
            "data_exchange": "read-only cross-origin stylesheet GET",
            "fallback": "the captured document still contains MM.S global CSS and bodycopy, but Cargo shell presentation may degrade",
        },
        {
            "origin": "https://type.cargo.site",
            "classification": "platform-font-cdn",
            "runtime_role": ["Cargo-managed webfont files referenced by published @font-face rules"],
            "executes_code": False,
            "data_exchange": "read-only cross-origin font GETs",
            "fallback": "captured CSS font-family fallback stacks apply if a font file is unavailable",
        },
        {
            "origin": "https://api.cargo.site",
            "classification": "operational-api-not-page-runtime",
            "runtime_role": ["authenticated Cargo capture and deployment readback"],
            "executes_code": False,
            "data_exchange": "editor/API operations outside the published page runtime",
            "fallback": "manual authenticated Cargo editor workflow",
        },
        {
            "origin": "https://abcdinamo.com",
            "classification": "font-license-attribution-comment",
            "runtime_role": ["provider URL present only in captured CSS license comments"],
            "executes_code": False,
            "data_exchange": "none during page runtime; the literal is documentation, not a fetched resource",
            "fallback": "not applicable",
        },
        {
            "origin": "http://www.webtype.com",
            "classification": "font-license-attribution-comment",
            "runtime_role": ["provider URL present only in captured CSS license comments"],
            "executes_code": False,
            "data_exchange": "none during page runtime; the literal is documentation, not a fetched resource",
            "fallback": "not applicable",
        },
        {
            "origin": "mailto:",
            "classification": "external-protocol-handler",
            "runtime_role": ["contact action"],
            "executes_code": False,
            "data_exchange": "delegates to the visitor's configured mail client",
            "fallback": "addresses remain visible in the page copy",
        },
    ]
    outbound = {
        "https://eviive.ch",
        "https://ellacportfolio.com",
        "https://www.touchbaes.ca",
        "https://www.travisleung.com",
        "https://www.linkedin.com",
    }
    for origin in sorted(outbound):
        definitions.append({
            "origin": origin,
            "classification": "outbound-navigation",
            "runtime_role": ["project or profile destination"],
            "executes_code": False,
            "data_exchange": "ordinary visitor-initiated navigation; destination behavior is out of scope",
            "fallback": "linked label remains readable if navigation fails",
        })
    for item in definitions:
        item["observed_in"] = observed_by_origin.get(item["origin"], [])
        item["evidence_status"] = "observed in frozen capture" if item["observed_in"] else "classified contract; URL not found by literal scan"
    classified = {item["origin"] for item in definitions}
    unclassified = sorted(set(observed_by_origin) - classified)
    if unclassified:
        raise RuntimeError("Observed origins lack boundary classifications: " + ", ".join(unclassified))
    return definitions


def dependency_inventory(root: Path, embed_manifest: dict[str, Any]) -> list[dict[str, Any]]:
    entries_by_kind = {entry["kind"]: entry for entry in embed_manifest["entries"]}
    notice_contract_path = root / "audit/contracts/third-party-runtime-notices.json"
    notice_path = root / "THIRD_PARTY_NOTICES.md"
    if not notice_contract_path.is_file() or not notice_path.is_file():
        raise RuntimeError("Tracked third-party runtime notice evidence is missing")
    notice_contract = load_json(notice_contract_path)
    if notice_contract.get("schema_version") != 1 or notice_contract.get("issue") != "MMS-AUD-039":
        raise RuntimeError("Third-party runtime notice contract identity is invalid")
    notice_components = {
        component["id"]: component for component in notice_contract.get("components", [])
    }
    if set(notice_components) != {"stpageflip", "pdfjs", "three-js"}:
        raise RuntimeError("Third-party runtime notice component set is incomplete")
    three_manifest_version = str(entries_by_kind["v7-cup"].get("version", "unresolved"))
    if three_manifest_version != "three-r160":
        raise RuntimeError("Frozen V7 revision no longer matches the Three.js notice record")
    notice_evidence = "audit/contracts/third-party-runtime-notices.json and THIRD_PARTY_NOTICES.md"
    pdf = notice_components["pdfjs"]
    pageflip = notice_components["stpageflip"]
    three = notice_components["three-js"]
    return [
        {
            "name": "Cargo 3",
            "version": "Cargo3",
            "license": "hosted platform; license not represented in repository",
            "delivery": "page rendering, editor sanitization, site configuration",
            "origin": "https://cargo.site",
            "capabilities": ["custom HTML", "global CSS", "page bodycopy", "Cargo custom elements"],
            "evidence": "cargo-draft/identity.json",
        },
        {
            "name": "Cargo frontend stylesheet",
            "version": "cbf2d0 capture path; package version unresolved",
            "license": "hosted platform; license not represented in repository",
            "delivery": "published-document stylesheet loaded from Cargo's build origin",
            "origin": "https://build.cargo.site",
            "capabilities": ["Cargo document shell", "platform components", "base responsive presentation"],
            "evidence": "docs/audits/2026-07-20T175853-0400-round-80/public/home.html",
        },
        {
            "name": "Cargo Freight",
            "version": "platform-managed",
            "license": "hosted platform; asset rights are not captured by the CDN response",
            "delivery": "images, video, posters, PDF, and self-contained embeds",
            "origin": "https://freight.cargo.site",
            "capabilities": ["immutable media delivery", "responsive image renditions", "HTTP range requests for PDF"],
            "evidence": "freight/asset-manifest.csv and public header probes",
        },
        {
            "name": "PDF.js",
            "version": pdf["version"],
            "license": "Apache-2.0; retained vendor notices and complete tracked package license",
            "delivery": "tracked vendor source used by the Montran reconstruction path",
            "origin": "self-contained Freight embed",
            "capabilities": ["PDF parsing", "range transport", "canvas page rendering"],
            "evidence": notice_evidence,
        },
        {
            "name": "StPageFlip",
            "version": pageflip["version"],
            "license": "MIT; complete upstream package license retained in tracked notice record",
            "delivery": "tracked vendor source used by the Montran reconstruction path",
            "origin": "self-contained Freight embed",
            "capabilities": ["desktop fold", "drag and tap page turning", "page shadow"],
            "evidence": notice_evidence,
        },
        {
            "name": "Three.js",
            "version": f"{three['version']} (r160)",
            "license": "MIT; retained vendor banner and complete tracked package license",
            "delivery": "tracked vendor source used by the V7 reconstruction path",
            "origin": "self-contained Freight embed",
            "capabilities": ["WebGL rendering", "GLTF loading", "animation loop"],
            "evidence": notice_evidence,
        },
        {
            "name": "Touchbaes game runtime",
            "version": str(entries_by_kind["touchbaes"].get("version")),
            "license": "not captured in the frozen embed manifest",
            "delivery": "active version identity captured in the frozen embed manifest",
            "origin": "self-contained Freight embed",
            "capabilities": ["pointer and touch drag", "responsive size reporting", "visibility and mode messages"],
            "evidence": "docs/audits/2026-07-20T175853-0400-round-80/local/embed-manifest.json",
        },
        {
            "name": "Cargo-hosted fonts",
            "version": "platform-managed",
            "license": "provider attribution comments are captured; complete license texts are not",
            "delivery": "Cargo-managed @font-face rules and font files",
            "origin": "https://type.cargo.site",
            "capabilities": ["Cargo Diatype", "Cargo Marist", "Gaisyr Semi-Mono", "TeX Gyre Heros Condensed", "UnifrakturMaguntia"],
            "evidence": "docs/audits/2026-07-20T175853-0400-round-80/public/home.html and cargo-draft/global.css",
        },
    ]


def figma_design_source(baseline_root: Path, baseline: dict[str, Any], root: Path) -> dict[str, Any]:
    figma_root = baseline_root / "figma"
    collections = load_json(figma_root / "variable-collections.json")
    components = load_json(figma_root / "components.json")
    references = load_json(figma_root / "reference-nodes.json")
    file_record = load_json(figma_root / "file.json")
    variable_categories: list[dict[str, Any]] = []
    for path in sorted((figma_root / "variables").glob("*.json")):
        records = load_json(path)
        variable_categories.append({
            "category": path.stem,
            "count": len(records),
            "source": relative_path(path, root),
        })
    variable_count = sum(item["count"] for item in variable_categories)
    if len(collections) != 6 or variable_count != 119 or len(components) != 71 or len(references) != 8:
        raise RuntimeError("Frozen Figma system counts drifted from 6 collections / 119 variables / 71 components / 8 endpoints")
    collection_inventory = [
        {
            "id": item["id"],
            "name": item["name"],
            "variable_count": len(item["variableIds"]),
            "modes": [mode["name"] for mode in item["modes"]],
        }
        for item in collections
    ]
    return {
        "file_name": baseline["figma"]["file_name"],
        "file_key": baseline["figma"]["file_key"],
        "capture_mode": baseline["figma"]["capture_mode"],
        "page_count": len(file_record["pages"]),
        "pages": file_record["pages"],
        "collection_count": len(collections),
        "collections": collection_inventory,
        "variable_count": variable_count,
        "variable_categories": variable_categories,
        "component_and_component_set_count": len(components),
        "reference_endpoint_count": len(references),
        "reference_endpoints": references,
        "capture_limitation": {
            "condition": "full-file and full Home-page traversal exceeded the Figma bridge request window and returned HTTP 504",
            "retained_scope": "approved Home endpoints and screenshots, variables, components, and the other page inventories",
            "unavailable_scope": "complete full Home tree",
            "source": relative_path(figma_root / "README.md", root),
        },
        "evidence": {
            "collections": relative_path(figma_root / "variable-collections.json", root),
            "components": relative_path(figma_root / "components.json", root),
            "reference_nodes": relative_path(figma_root / "reference-nodes.json", root),
            "screenshots": relative_path(figma_root / "screenshots", root),
        },
    }


def cargo_override_contracts(global_css: str, root: Path, global_css_path: Path) -> dict[str, Any]:
    evidence = relative_path(global_css_path, root)
    required_markers = [
        "html[data-mms-site] .page-layout",
        "html[data-theme] .page-layout { max-width: none !important; }",
        "html[data-theme] .page-content { padding: 0 !important; }",
        "html[data-theme] bodycopy { max-width: none !important; }",
        "html[data-theme] .page.pinned { display: none !important; }",
        "Cargo mobile-offset neutralizer",
    ]
    missing = [marker for marker in required_markers if marker not in global_css]
    if missing:
        raise RuntimeError("Frozen Cargo override contract is missing: " + ", ".join(missing))
    return {
        "wrapper_stack": [".page", ".page-layout", ".page-content", "bodycopy", ".mms"],
        "contracts": [
            {
                "name": "wrapper_transparency",
                "selectors": ["html[data-mms-site] .page", "html[data-mms-site] .page-layout", "html[data-mms-site] .page-content", "html[data-mms-site] bodycopy"],
                "behavior": "Cargo wrappers remain transparent so the MM.S composition and edge-to-edge media own the visible surface",
                "ordering_or_risk": "must remain scoped to data-mms-site; an opaque wrapper breaks iOS edge content",
                "evidence": evidence,
            },
            {
                "name": "layout_width_and_padding",
                "selectors": ["html[data-theme] .page-layout", "html[data-theme] .page-content"],
                "behavior": "removes Cargo max-width and page-content padding",
                "ordering_or_risk": "uses !important to override Cargo template geometry",
                "evidence": evidence,
            },
            {
                "name": "bodycopy_width",
                "selectors": ["html[data-theme] bodycopy"],
                "behavior": "removes Cargo bodycopy max-width so the internal responsive grid owns width",
                "ordering_or_risk": "must be paired with the scoped .mms reset rather than a global content reset",
                "evidence": evidence,
            },
            {
                "name": "pinned_page_suppression",
                "selectors": ["html[data-theme] .page.pinned"],
                "behavior": "hides Cargo's pinned duplicate page surface",
                "ordering_or_risk": "removing this may expose a second page layer",
                "evidence": evidence,
            },
            {
                "name": "compact_dialog_portal",
                "selectors": ["dialog.mms-panel"],
                "behavior": "the one non-modal dialog is moved under body in compact mode so fixed positioning is not trapped by transformed Cargo wrappers, then restored to the expanded rail",
                "ordering_or_risk": "the placeholder preserves the source slot and control state; cloning the dialog would duplicate IDs and preferences",
                "evidence": "docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/home.bodycopy.html",
            },
            {
                "name": "mobile_offset_neutralizer",
                "selectors": [".mms", ".mms *", ".mms-rail", ".mms-panel", ".mms-main", ".mms-river", ".mms-desc"],
                "behavior": "reasserts owned margins and padding after Cargo's generated #mobile-offset-styles clones",
                "ordering_or_risk": "the neutralizer is intentionally the final general spacing section and requires !important because Cargo injects clones after the stylesheet",
                "evidence": evidence,
            },
        ],
    }


def browser_capability_map(home_source: str, global_css: str, head_source: str, embeds: dict[str, Any]) -> list[dict[str, Any]]:
    body_evidence = "docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/home.bodycopy.html"
    css_evidence = "docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/global.css"
    head_evidence = "docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/site-head.html"
    embed_evidence = "docs/audits/2026-07-20T175853-0400-round-80/local/embed-manifest.json"

    def record(name: str, markers: list[tuple[str, str]], use: str, fallback: str, evidence: list[str]) -> dict[str, Any]:
        missing = [marker for marker, source in markers if marker not in source]
        return {
            "capability": name,
            "detected_in_frozen_payload": not missing,
            "use": use,
            "fallback": fallback,
            "missing_evidence_markers": missing,
            "evidence": evidence,
        }

    embed_kinds = {entry["kind"] for entry in embeds["entries"]}
    if embed_kinds != {"v7-cup", "touchbaes", "montran-booklet"}:
        raise RuntimeError(f"Unexpected frozen embed kinds: {sorted(embed_kinds)}")
    return [
        record("CSS Grid, Flexbox, clamp, and sticky positioning", [("display: grid", global_css), ("position: sticky", global_css), ("clamp(", global_css)], "responsive shell, bands, panels, and fluid grid", "no polyfill captured; unsupported browsers receive normal CSS cascade where declarations are ignored", [css_evidence]),
        record("native horizontal overflow and touch panning", [("overflow-x: auto", global_css), ("touch-action: pan-x pan-y", global_css), ("-webkit-overflow-scrolling: touch", global_css)], "portfolio rivers remain natively scrollable by touch and trackpad", "desktop scrubbers add pointer and keyboard scrolling; native overflow remains the base interaction", [css_evidence, body_evidence]),
        record("HTMLDialogElement non-modal show/close", [("panel.show()", home_source), ("panel.close()", home_source)], "one control panel moves between compact body portal and expanded rail", "no dialog polyfill is captured; the source open attribute preserves expanded initial visibility but compact behavior requires dialog methods", [body_evidence]),
        record("localStorage", [("localStorage.getItem", home_source), ("localStorage.setItem", home_source)], "persists theme, typeface, scale, and shape", "all storage access is guarded by try/catch and defaults remain available", [body_evidence]),
        record("sessionStorage", [("sessionStorage.getItem", home_source), ("sessionStorage.setItem", home_source)], "avoids repeating the prior startup sequence signature", "try/catch makes signature persistence optional; a new sequence is still generated", [body_evidence]),
        record("cryptographic random values", [("window.crypto.getRandomValues", home_source), ("Math.random()", home_source)], "randomizes startup combinations", "explicit Math.random fallback", [body_evidence]),
        record("matchMedia, reduced motion, and Save-Data", [("prefers-reduced-motion: reduce", home_source), ("navigator.connection", home_source)], "selects compact/fine-pointer behavior and skips startup motion for user or network preference", "absent APIs evaluate as not reduced and not Save-Data; core content remains available", [body_evidence, css_evidence]),
        record("requestAnimationFrame", [("window.requestAnimationFrame || function", home_source), ("callback(Date.now()); }, 16", home_source)], "startup hard-cut paint confirmation and scrubber synchronization", "explicit 16 ms setTimeout fallback for the startup controller; no general animation polyfill captured", [body_evidence]),
        record("IntersectionObserver", [("'IntersectionObserver' in window", home_source), ("deferredMedia.forEach(function (element) { setMediaActive(element, true); });", home_source)], "prewarms rivers and activates deferred video/iframe sources near the viewport", "explicit eager activation of every deferred element when unavailable", [body_evidence]),
        record("ResizeObserver", [("'ResizeObserver' in window", home_source), ("window.addEventListener('resize'", home_source)], "updates scrubbers, Montran map fit, and compact header measurements", "load/resize/orientation listeners and scheduled measurements are retained; no ResizeObserver polyfill captured", [body_evidence]),
        record("muted inline autoplay and posters", [("playsinline", home_source), ("data-poster", home_source), ("video.play()", home_source)], "plays motion inline on iOS while preserving a static first frame until readiness", "play rejection is caught and the poster/background remains visible", [body_evidence]),
        record("visibility lifecycle", [("visibilitychange", home_source), ("__mmsEmbedVisibility", home_source)], "pauses/resumes video and notifies iframe motion when the page or media is not visible", "if messaging is unavailable, posters and document content remain; iframe internal motion control is not guaranteed", [body_evidence]),
        record("validated iframe postMessage", [("event.source !== frame.contentWindow", home_source), ("event.origin !== expectedOrigin", home_source)], "accepts ready messages from the expected V7, Touchbaes, and Montran frame", "iframe posters remain until a valid ready message; frozen Round 80 V7 and Touchbaes child/outbound paths still include wildcard targets", [body_evidence, embed_evidence]),
        record("WebGL embed", [("v7-cup", json.dumps(embeds, sort_keys=True))], "renders the V7 Three.js cup inside a cross-origin Freight iframe", "static iframe poster remains until the validated ready signal; no alternate live renderer captured", [embed_evidence]),
        record("PDF canvas and HTTP range transport", [("FreightRangeTransport", json.dumps(embeds, sort_keys=True)), ("render_width_limit", json.dumps(embeds, sort_keys=True))], "renders the Montran booklet selectively inside a Freight iframe", "the frozen manifest records range transport and a 1600 px ceiling but does not prove the active full-download fallback; the poster/loader is the captured parent fallback", [embed_evidence, "work/montran-direct-pdf-v10-src/vendor/pdf.min.mjs"]),
        record("viewport-fit and safe-area environment variables", [("viewport-fit=cover", head_source), ("env(safe-area-inset-top)", global_css), ("env(safe-area-inset-bottom)", global_css)], "allows content bleed while protecting compact header and panel controls on iOS", "regular viewport padding and a 1 px sampler minimum apply when safe-area values resolve to zero", [head_evidence, css_evidence]),
        record("Pointer Events and keyboard control", [("pointerdown", home_source), ("keydown", home_source), ("ArrowLeft", home_source), ("ArrowRight", home_source)], "drag/tap interactions plus scrubber arrows, page keys, Home, and End", "native river scrolling remains available where custom pointer handling does not own the gesture", [body_evidence]),
    ]


def build_inventory(root: Path, baseline_root: Path) -> dict[str, Any]:
    manifest_integrity = verify_baseline_manifest(baseline_root, root)
    baseline = load_json(baseline_root / "baseline.json")
    if baseline.get("status") != "complete" or baseline.get("phase") != 1:
        raise RuntimeError("The requested baseline is not a completed Phase 1 capture")

    page_records = {item["slug"]: item for item in load_json(baseline_root / "cargo-draft/pages.json")}
    identity = load_json(baseline_root / "cargo-draft/identity.json")
    public = load_json(baseline_root / "public/public-baseline.json")
    embeds = load_json(baseline_root / "local/embed-manifest.json")
    home_source_path = baseline_root / "cargo-draft/home.bodycopy.html"
    home_source = home_source_path.read_text(encoding="utf-8")
    global_css_path = baseline_root / "cargo-draft/global.css"
    global_css = global_css_path.read_text(encoding="utf-8")
    complete_css_path = baseline_root / "local/complete-css-bundle.css"
    head_path = baseline_root / "cargo-draft/site-head.html"
    head = head_path.read_text(encoding="utf-8")

    page_structures = {
        page: page_structure(page, baseline_root / f"cargo-draft/{page}.bodycopy.html", root)
        for page in ("home", "write", "who")
    }
    axes = {
        "theme": js_array(home_source, "THEMES"),
        "typeface": js_array(home_source, "FACES"),
        "scale": js_array(home_source, "SCALES"),
        "image_shape": js_array(home_source, "SHAPES"),
    }
    state_count = 1
    for values in axes.values():
        state_count *= len(values)

    freight_rows = list(csv.DictReader((baseline_root / "freight/asset-manifest.csv").open(encoding="utf-8", newline="")))
    freight_kind_counts = Counter(row["kind"] for row in freight_rows)
    managed_font_matches = re.findall(
        r'\.mms-(mono|sans|gothic)\s*\{[^}]*--text-style:\s*"([^"]+)";[^}]*font-family:\s*([^;]+);',
        global_css,
        flags=re.S,
    )

    pages: dict[str, Any] = {}
    for page_name in ("home", "write", "who"):
        public_page = public["pages"][page_name]
        pages[page_name] = {
            "cargo": page_records[page_name],
            "public_route": {
                "url": public_page["requested_url"],
                "effective_url": public_page["effective_url"],
                "http_status": public_page["http_status"],
                "redirect_count": public_page["redirect_count"],
                "document_title": public_page["document_title"],
                "metadata": public_page["meta"],
                "canonical_urls": public_page["canonical_urls"],
                "utf8_replacement_chars": public_page["utf8_replacement_chars"],
            },
            "structure": page_structures[page_name],
        }

    preview_count_match = re.search(r"var\s+PREVIEW_COUNT\s*=\s*(\d+)", home_source)
    preview_hold_match = re.search(r"var\s+PREVIEW_HOLD_MS\s*=\s*(\d+)", home_source)
    runtime_markers = re.findall(r"responsive-\d+", home_source)
    runtime_marker_counts = dict(sorted(Counter(runtime_markers).items()))
    shared_runtime = next(iter(runtime_marker_counts)) if len(runtime_marker_counts) == 1 else None
    head_marker_match = re.search(r'data-mms-ios-edge-head=["\']([^"\']+)', head)
    head_marker = head_marker_match.group(1) if head_marker_match else None
    home_media = [item for band in page_structures["home"]["showcase_bands"] for item in band["media"]]
    home_tag_counts = dict(sorted(Counter(item["tag"] for item in home_media).items()))
    shape_policy_counts = dict(sorted(Counter(item["shape_policy"] or "unclassified" for item in home_media).items()))
    unique_media_ids = len({item["id"] for item in home_media if item["id"]})
    dependencies = dependency_inventory(root, embeds)
    design_source = figma_design_source(baseline_root, baseline, root)
    override_contracts = cargo_override_contracts(global_css, root, global_css_path)
    capability_map = browser_capability_map(home_source, global_css, head, embeds)
    public_html_paths = [baseline_root / f"public/{page}.html" for page in ("home", "write", "who")]
    if not all(path.is_file() for path in public_html_paths):
        raise RuntimeError("Frozen public HTML evidence is incomplete")
    observed_origins = url_origins(
        root,
        page_structures,
        [
            global_css_path,
            head_path,
            baseline_root / "cargo-draft/identity.json",
            baseline_root / "cargo-draft/pages.json",
            baseline_root / "public/public-baseline.json",
            *public_html_paths,
        ],
    )

    inventory: dict[str, Any] = {
        "schema_version": 1,
        "generator": {
            "version": GENERATOR_VERSION,
            "script": "audit/scripts/generate-system-inventory.py",
            "determinism": "no wall-clock fields; sorted output; complete manifest-verified Phase 1 evidence plus tracked vendor and notice inputs only",
            "fresh_clone_contract": "does not read ignored active bundles or mutable cargo/*.css/html/js runtime mirrors",
        },
        "baseline": {
            "id": baseline["baseline_id"],
            "captured_at": baseline["capture_completed_at"],
            "stable_reference": baseline["repository"]["stable_reference"],
            "stable_commit": baseline["repository"]["stable_reference_commit"],
            "protected_reference": baseline["repository"]["protected_historical_reference"],
            "protected_commit": baseline["repository"]["protected_historical_commit"],
            "source_precedence": baseline["source_precedence"],
            "evidence_root": str(baseline_root.relative_to(root)),
            "manifest_integrity": manifest_integrity,
        },
        "design_source": design_source,
        "pages": pages,
        "shared_system": {
            "navigation": {
                "surfaces": ["compact in-flow/sticky navigation", "expanded left rail", "wordmark home link"],
                "canonical_targets": sorted(
                    {link["href"] for page in page_structures.values() for link in page["navigation_links"]}
                ),
                "email_recipients": ["ocean@mmmmm.studio", "alvis@mmmmm.studio"],
            },
            "clock": {
                "instances_per_page": {name: page["shell"]["clock_instances"] for name, page in page_structures.items()},
                "runtime": "the frozen Cargo bodycopy runtime updates every .js-clock element",
            },
            "introduction": {
                "instances_per_page": {name: page["shell"]["introduction_instances"] for name, page in page_structures.items()},
                "compact_contract": "intro and compact links share the introduction wrapper and release beneath following content",
                "expanded_contract": "introduction and clock occupy the sticky head while showcase content scrolls",
            },
            "control_panel": {
                "shared_dialog_id": "mms-panel",
                "compact": "non-modal persistent viewport tray portaled to body",
                "expanded": "left-rail panel restored to its source slot",
                "state_persistence": ["mms-theme", "mms-face", "mms-scale", "mms-shape"],
            },
            "state_axes": {
                **axes,
                "combination_count": state_count,
                "defaults": {"theme": "white", "typeface": "serif", "scale": "m", "image_shape": "straight"},
                "startup_preview": {
                    "preview_cuts": int(preview_count_match.group(1)) if preview_count_match else None,
                    "hold_ms_per_cut": int(preview_hold_match.group(1)) if preview_hold_match else None,
                    "total_preview_ms": (int(preview_count_match.group(1)) * int(preview_hold_match.group(1))) if preview_count_match and preview_hold_match else None,
                    "transition": "hard cuts; final stored/default state restored after preview",
                    "evidence": relative_path(home_source_path, root),
                },
            },
            "runtime": {
                "shared_marker": shared_runtime,
                "marker_counts": runtime_marker_counts,
                "head_marker": head_marker,
                "source": relative_path(home_source_path, root),
            },
        },
        "media_and_embeds": {
            "home": {
                "showcase_bands": page_structures["home"]["showcase_band_count"],
                "media_items": len(home_media),
                "unique_media_ids": unique_media_ids,
                "tag_counts": home_tag_counts,
                "shape_policy_counts": shape_policy_counts,
            },
            "video_runtime": {
                "home_video_count": home_tag_counts.get("video", 0),
                "poster_count": sum(1 for band in page_structures["home"]["showcase_bands"] for item in band["media"] if item["poster"]),
                "critical_count": sum(1 for band in page_structures["home"]["showcase_bands"] for item in band["media"] if item["motion_priority"] == "critical"),
                "near_count": sum(1 for band in page_structures["home"]["showcase_bands"] for item in band["media"] if item["motion_priority"] == "near"),
                "alpha_fallback_count": sum(1 for band in page_structures["home"]["showcase_bands"] for item in band["media"] if item["fallback_mp4"]),
                "behavior": ["IntersectionObserver deferred sources", "poster retained until media ready", "muted inline autoplay", "visibility pause/resume"],
            },
            "embeds": embeds["entries"],
            "iframe_messaging": {
                "ready_contracts": [entry["ready_message"] for entry in embeds["entries"]],
                "frozen_parent_validation": "Round 80 validates expected frame windows and applicable origins/kinds, but predates protocol-v1 opt-in",
                "frozen_wildcard_messages_observed": ["generic V7/Touchbaes visibility", "Touchbaes mode", "V7 ready", "Touchbaes ready/size/tweezer"],
                "prepared_local_parent": "Round 93 targets exact derived child origins and carries kind/protocolVersion; present malformed protocol attributes fail closed; this code is not deployed",
                "prepared_successors": "audit/contracts/embed-message-protocol-candidates.json",
            },
            "freight_baseline": {
                "underlying_objects": len(freight_rows),
                "kind_counts": dict(sorted(freight_kind_counts.items())),
                "all_http_200": all(row["http_status"] == "200" for row in freight_rows),
                "all_sha256_present": all(bool(row["sha256"]) for row in freight_rows),
                "manifest": str((baseline_root / "freight/asset-manifest.csv").relative_to(root)),
            },
        },
        "cargo_platform": {
            "site": identity,
            "global_css": {
                "bytes": global_css_path.stat().st_size,
                "sha256": sha256(global_css_path),
                "complete_local_bundle_bytes": complete_css_path.stat().st_size,
                "complete_local_bundle_sha256": sha256(complete_css_path),
                "managed_font_blocks": [
                    {"class": f"mms-{kind}", "text_style": text_style, "font_family": normal_text(family)}
                    for kind, text_style, family in managed_font_matches
                ],
                "template_override_contracts": [
                    selector for selector in [
                        "html[data-theme] .page-layout",
                        "html[data-theme] .page-content",
                        "html[data-theme] .page",
                        "html[data-theme] body",
                    ] if selector in global_css
                ],
                "required_deploy_composer": "cargo/compose-css-bundle.sh",
            },
            "override_contracts": override_contracts,
            "custom_head": {
                "bytes": head_path.stat().st_size,
                "sha256": sha256(head_path),
                "marker": head_marker,
                "viewport_fit_cover": "viewport-fit=cover" in head,
                "removes_theme_color": 'meta[name="theme-color"]' in head,
                "removes_apple_standalone_status_meta": "apple-mobile-web-app-status-bar-style" in head and "apple-mobile-web-app-capable" in head,
            },
            "routing_and_metadata": {
                "homepage_id": identity["homepage_id"],
                "routes_captured": ["/", "/write", "/who"],
                "captured_route_redirects": {name: pages[name]["public_route"]["redirect_count"] for name in pages},
                "canonical_links": {name: pages[name]["public_route"]["canonical_urls"] for name in pages},
                "favicon": identity["favicon_url"],
                "rss": identity["rss_url"],
                "robots_meta_in_captured_pages": {
                    name: bool(re.search(r'<meta[^>]+name=["\']robots["\']', (baseline_root / f"public/{name}.html").read_text(encoding="utf-8", errors="replace"), re.I))
                    for name in pages
                },
                "redirect_rules": "not captured in Phase 1",
                "robots_txt_behavior": "not captured in Phase 1",
                "sitemap_behavior": "not captured in Phase 1",
                "page_settings_beyond captured API summary": "not captured in Phase 1",
            },
        },
        "dependencies": dependencies,
        "browser_capabilities": capability_map,
        "observed_origins": observed_origins,
        "origin_boundaries": origin_boundaries(observed_origins),
        "operations": {
            "canonical_sources": [
                "cargo/tokens.css", "cargo/site.css", "cargo/panel.js", "cargo/site-head.html",
                "cargo/home.template.html", "cargo/who.template.html", "cargo/write.template.html",
            ],
            "build": [
                {"command": "python3 cargo/assemble-pages.py", "purpose": "generate named-page bodycopy from templates and shared partials"},
                {"command": "bash cargo/compose-css-bundle.sh", "purpose": "compose the complete tokens.css plus site.css payload"},
                {"command": "python3 cargo/compose-persisted-css.py PERSISTED_CSS", "purpose": "splice the preserved Cargo head, local tokens, all three Cargo-managed text-style blocks, and local site CSS with strict marker/order checks"},
                {"command": "bash cargo/assemble-test.sh", "purpose": "assemble the deterministic Home test mirror"},
                {"command": "bash cargo/assemble-named-pages.sh", "purpose": "assemble named-page test mirrors"},
                {"command": "bash cargo/build-motion-posters.sh", "purpose": "build motion posters"},
            ],
            "deployment_helpers": [
                {
                    "command": "python3 cargo/upload-cargo-assets.py FILE [FILE ...]",
                    "purpose": "manual authenticated Dia/Cargo drag-and-drop upload plus Freight resource probe",
                    "side_effect": "writes to Cargo/Freight; never run during read-only audit",
                },
            ],
            "validation": [
                "bash cargo/validate-cargo-payload.sh",
                "python3 cargo/validate-shared-components.py",
                "python3 cargo/validate-test-mirrors.py",
            ],
            "deployment_contract": [
                "edit canonical local sources first",
                "deploy complete composed CSS while preserving Cargo head and all three managed font blocks",
                "replace complete bodycopy with UTF-8-safe innerHTML plus bubbling InputEvent",
                "save where required, reload Cargo, and verify persistence",
                "publication is separate and requires explicit authorization",
            ],
            "backup_and_rollback": [
                "current gold-2026-07-21-responsive-70 Git reference and cargo/gold/2026-07-21-responsive-70",
                "protected round-69-gold Git reference and cargo/gold/round-69",
                "round-80-stable Git reference and docs/versioning/ROUND-80-STABLE.md",
                str(baseline_root.relative_to(root)),
                "cargo/DEPLOY.md round ledger",
            ],
            "documentation": [
                "CLAUDE.md", "HANDOFF-CODEX.md", "VERSIONING.md", "cargo/PLAYBOOK.md",
                "cargo/DEPLOY.md", "cargo/GOLD-BASELINE.md", "cargo/GAME-VIDEO-STATUS.md",
                "docs/versioning/ROUND-80-STABLE.md",
            ],
        },
        "evidence_gaps": [
            {
                "area": "Cargo platform configuration",
                "missing": ["redirect rules", "robots.txt behavior", "sitemap behavior", "complete page-design settings", "social-preview configuration provenance"],
                "next_evidence": "authenticated read-only Cargo settings capture plus public endpoint probes",
            },
            {
                "area": "Third-party provenance",
                "missing": ["Cargo-hosted font versions and licenses", "license/owner metadata for every portfolio asset"],
                "next_evidence": "Cargo font-license evidence and an asset provenance manifest",
            },
            {
                "area": "Reproducible embeds",
                "missing": ["tracked V7 source/build command", "tracked Montran v17 behavior matching the active bundle"],
                "next_evidence": "promote exact active sources and add deterministic bundle tests after audit approval",
            },
            {
                "area": "Rendered media requirements",
                "missing": ["measured maximum render size by viewport/state", "DPR coverage", "verified transparency intent for every object", "source-file ownership mapping"],
                "next_evidence": "Phase 2 browser harness output plus the separate asset manifest",
            },
        ],
    }

    if state_count != 240:
        raise RuntimeError(f"State axis inventory is {state_count}, expected 240")
    if page_structures["home"]["showcase_band_count"] != 13:
        raise RuntimeError("Home showcase band count drifted from 13")
    if page_structures["home"]["showcase_media_count"] != 68:
        raise RuntimeError("Home media count drifted from 68")
    if shared_runtime != baseline["cargo"]["runtime_marker"]:
        raise RuntimeError("Runtime marker mismatch inside frozen baseline")
    if head_marker != "49":
        raise RuntimeError(f"Frozen head marker is {head_marker}, expected 49")
    if not all(item["detected_in_frozen_payload"] for item in capability_map):
        missing = [item["capability"] for item in capability_map if not item["detected_in_frozen_payload"]]
        raise RuntimeError("Browser capability evidence markers missing: " + ", ".join(missing))
    return inventory


def markdown(inventory: dict[str, Any]) -> str:
    lines = [
        "# MM.S system inventory",
        "",
        f"Generated deterministically from Phase 1 baseline `{inventory['baseline']['id']}` and Round 80 stable source. This is an inventory, not a findings or remediation report.",
        "",
        "## Baseline contract",
        "",
        f"- Stable reference: `{inventory['baseline']['stable_reference']}` at `{inventory['baseline']['stable_commit']}`.",
        f"- Protected reference: `{inventory['baseline']['protected_reference']}` at `{inventory['baseline']['protected_commit']}`.",
        f"- Evidence root: `{inventory['baseline']['evidence_root']}`.",
        f"- Root manifest: {inventory['baseline']['manifest_integrity']['entry_count']} of {inventory['baseline']['manifest_integrity']['expected_entry_count']} entries verified; SHA-256 `{inventory['baseline']['manifest_integrity']['manifest_sha256']}`.",
        "- External systems were read-only during capture; this generator performs no network or platform writes.",
        "",
        "## Figma design source",
        "",
        f"The read-only `{inventory['design_source']['file_name']}` capture (`{inventory['design_source']['file_key']}`) contains **{inventory['design_source']['collection_count']} variable collections**, **{inventory['design_source']['variable_count']} variables**, **{inventory['design_source']['component_and_component_set_count']} component/component-set records**, and **{inventory['design_source']['reference_endpoint_count']} approved reference endpoints**.",
        "",
        "| Collection | Modes | Variables |",
        "|---|---|---:|",
    ]
    for collection in inventory["design_source"]["collections"]:
        lines.append(f"| {collection['name']} | {', '.join(collection['modes'])} | {collection['variable_count']} |")
    lines.extend([
        "",
        "| Endpoint | Node | Size | Layout |",
        "|---|---|---|---|",
    ])
    for endpoint in inventory["design_source"]["reference_endpoints"]:
        lines.append(f"| {endpoint['name']} | `{endpoint['id']}` | {endpoint['width']} x {endpoint['height']} | {endpoint['layoutMode']} |")
    lines.extend([
        "",
        f"Capture limitation: {inventory['design_source']['capture_limitation']['condition']}. The inventory retains {inventory['design_source']['capture_limitation']['retained_scope']}; the unavailable scope is the {inventory['design_source']['capture_limitation']['unavailable_scope']}.",
        "",
        "## Pages and shared shell",
        "",
        "| Page | Public route | Cargo page ID | Primary content |",
        "|---|---|---|---|",
    ])
    for name in ("home", "write", "who"):
        page = inventory["pages"][name]
        structure = page["structure"]
        if name == "home":
            content = f"{structure['showcase_band_count']} showcase bands, {structure['showcase_media_count']} media items"
        elif name == "write":
            content = f"{structure['writing']['piece_count']} writing pieces"
        else:
            content = f"{len(structure['people'])} founder profiles"
        lines.append(f"| {name.title()} | `{page['public_route']['effective_url']}` | `{page['cargo']['id']}` | {content} |")
    lines.extend([
        "",
        "Every page includes the compact header, expanded rail, compact navigation, live clocks, and the shared non-modal control panel. Both wordmark surfaces link to `/`.",
        "",
        "## Home showcase bands",
        "",
        "| Order | Band | Project heading | Media | Policies |",
        "|---:|---|---|---:|---|",
    ])
    for index, band in enumerate(inventory["pages"]["home"]["structure"]["showcase_bands"], 1):
        policies = Counter(item["shape_policy"] or "unclassified" for item in band["media"])
        policy_text = ", ".join(f"{key} {value}" for key, value in sorted(policies.items()))
        lines.append(f"| {index} | `{band['id']}` | {band['project_heading'] or '--'} | {band['media_count']} | {policy_text} |")
    axes = inventory["shared_system"]["state_axes"]
    lines.extend([
        "",
        "## State system and startup",
        "",
        f"The control state is `{len(axes['theme'])}` themes x `{len(axes['typeface'])}` typefaces x `{len(axes['scale'])}` scales x `{len(axes['image_shape'])}` shapes = **{axes['combination_count']}** combinations.",
        "",
        f"- Themes: `{', '.join(axes['theme'])}`.",
        f"- Typefaces: `{', '.join(axes['typeface'])}`.",
        f"- Scales: `{', '.join(axes['scale'])}`.",
        f"- Shapes: `{', '.join(axes['image_shape'])}`.",
        f"- Fresh default: `{axes['defaults']}`.",
        f"- Startup: {axes['startup_preview']['preview_cuts']} hard cuts x {axes['startup_preview']['hold_ms_per_cut']} ms = {axes['startup_preview']['total_preview_ms']} ms, then exact stored/default restoration.",
        f"- Frozen runtime marker: `{inventory['shared_system']['runtime']['shared_marker']}` ({inventory['shared_system']['runtime']['marker_counts']}); head marker `{inventory['shared_system']['runtime']['head_marker']}`.",
        "",
        "## Media and embeds",
        "",
        f"Home owns {inventory['media_and_embeds']['home']['media_items']} media items: {inventory['media_and_embeds']['home']['tag_counts']}. The frozen Freight manifest covers {inventory['media_and_embeds']['freight_baseline']['underlying_objects']} underlying objects and records SHA-256 for every response.",
        "",
        "| Embed | Active version | Delivery | Reproducible from tracked source | Ready contract |",
        "|---|---|---|---|---|",
    ])
    for embed in inventory["media_and_embeds"]["embeds"]:
        lines.append(
            f"| {embed['kind']} | {embed.get('version', '--')} | `{embed['freight_url']}` | {str(embed['reproducible_from_tracked_source']).lower()} | `{json.dumps(embed['ready_message'], sort_keys=True)}` |"
        )
    lines.extend([
        "",
        "Video delivery uses deferred sources, posters, muted inline autoplay, proximity preloading, and visibility pausing. The frozen Round 80 V7/Touchbaes bridge still includes wildcard child and outbound paths. Round 93 prepares exact-target parent messaging plus hash-locked protocol-v1 child successors, but none is promoted until both Freight URLs and the Cargo parent can switch atomically.",
        "",
        "## Cargo platform and metadata",
        "",
        f"- Site ID `{inventory['cargo_platform']['site']['id']}`, Cargo version `{inventory['cargo_platform']['site']['version']}`, domain `{inventory['cargo_platform']['site']['domain']}`, homepage `{inventory['cargo_platform']['site']['homepage_id']}`.",
        f"- Global CSS: {inventory['cargo_platform']['global_css']['bytes']:,} bytes, SHA-256 `{inventory['cargo_platform']['global_css']['sha256']}`.",
        f"- Deterministic local CSS bundle: {inventory['cargo_platform']['global_css']['complete_local_bundle_bytes']:,} bytes, SHA-256 `{inventory['cargo_platform']['global_css']['complete_local_bundle_sha256']}`.",
        f"- Cargo-managed font blocks: {len(inventory['cargo_platform']['global_css']['managed_font_blocks'])}; these are preserved rather than generated by the local CSS composer.",
        "- Custom head enforces `viewport-fit=cover` and removes theme-color and Apple standalone/status metadata.",
        "- All three captured public routes returned 200 with zero redirects and no canonical link elements. robots.txt, sitemap, redirect rules, and complete page settings were not part of Phase 1 and remain explicit evidence gaps.",
        "",
        "### Cargo override contracts",
        "",
        "| Contract | Selectors | Required behavior |",
        "|---|---|---|",
    ])
    for contract in inventory["cargo_platform"]["override_contracts"]["contracts"]:
        lines.append(f"| {contract['name']} | `{', '.join(contract['selectors'])}` | {contract['behavior']} |")
    lines.extend([
        "",
        "The neutralized Cargo wrapper stack is `.page > .page-layout > .page-content > bodycopy > .mms`. The compact dialog is portaled outside transformed wrappers, pinned duplicates are suppressed, and the mobile-offset neutralizer must stay after general spacing rules.",
        "",
        "## Browser capabilities and fallbacks",
        "",
        "| Capability | Captured use | Fallback |",
        "|---|---|---|",
    ])
    for item in inventory["browser_capabilities"]:
        lines.append(f"| {item['capability']} | {item['use']} | {item['fallback']} |")
    lines.extend([
        "",
        "## Runtime origin boundaries",
        "",
        "| Origin | Classification | Runtime role | Frozen evidence |",
        "|---|---|---|---|",
    ])
    for item in inventory["origin_boundaries"]:
        evidence = ", ".join(f"`{path}`" for path in item["observed_in"]) or "classified contract; no literal URL observed"
        lines.append(f"| `{item['origin']}` | {item['classification']} | {', '.join(item['runtime_role'])} | {evidence} |")
    lines.extend([
        "",
        "## Third-party and platform dependencies",
        "",
        "| Dependency | Version | License evidence | Capability |",
        "|---|---|---|---|",
    ])
    for item in inventory["dependencies"]:
        lines.append(f"| {item['name']} | {item['version']} | {item['license']} | {', '.join(item['capabilities'])} |")
    lines.extend([
        "",
        "## Build, deployment, and recovery",
        "",
    ])
    for item in inventory["operations"]["build"]:
        lines.append(f"- `{item['command']}`: {item['purpose']}.")
    for item in inventory["operations"]["deployment_helpers"]:
        lines.append(f"- `{item['command']}`: {item['purpose']}. Side effect: {item['side_effect']}.")
    lines.extend([
        "",
        "Deployment remains manual and Cargo-specific: compose the complete CSS, preserve the Cargo head and three managed font blocks, replace the complete bodycopy with the UTF-8-safe innerHTML + bubbling InputEvent method, save, reload, and verify persistence. Publication is a separate action requiring explicit authorization.",
        "",
        "The default preservation and rollback target is gold-2026-07-21-responsive-70. Historical recovery evidence remains layered through immutable Round 69 gold, Round 80 stable, the hashed Phase 1 baseline, and the deployment ledger.",
        "",
        "## Evidence gaps",
        "",
    ])
    for gap in inventory["evidence_gaps"]:
        lines.append(f"### {gap['area']}")
        lines.append("")
        lines.append(f"Missing: {', '.join(gap['missing'])}.")
        lines.append("")
        lines.append(f"Next evidence: {gap['next_evidence']}.")
        lines.append("")
    lines.extend([
        "## Regeneration",
        "",
        "```sh",
        "python3 audit/scripts/generate-system-inventory.py",
        "python3 audit/scripts/generate-system-inventory.py --check",
        "```",
        "",
        "`--check` first verifies the pinned root SHA256SUMS hash and all 122 frozen Phase 1 entries, then fails if either committed inventory differs from a clean regeneration or if the 13-band, 68-media, 240-state contracts drift.",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", default=DEFAULT_BASELINE)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[2]
    baseline_root = (root / args.baseline).resolve()
    inventory = build_inventory(root, baseline_root)
    json_text = json.dumps(inventory, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    markdown_text = markdown(inventory)
    output_dir = root / "audit/inventory"
    json_path = output_dir / "system-inventory.json"
    markdown_path = output_dir / "system-inventory.md"

    if args.check:
        mismatches = []
        for path, expected in ((json_path, json_text), (markdown_path, markdown_text)):
            if not path.exists() or path.read_text(encoding="utf-8") != expected:
                mismatches.append(str(path.relative_to(root)))
        if mismatches:
            raise SystemExit("Inventory regeneration mismatch: " + ", ".join(mismatches))
        print("system inventory check: PASS")
        return 0

    output_dir.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json_text, encoding="utf-8")
    markdown_path.write_text(markdown_text, encoding="utf-8")
    print(f"wrote {json_path.relative_to(root)}")
    print(f"wrote {markdown_path.relative_to(root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
