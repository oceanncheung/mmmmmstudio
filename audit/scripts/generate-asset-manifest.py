#!/usr/bin/env python3
"""Build the Round 80 asset and link inventory from frozen Phase 1 evidence.

The generator is intentionally network-free. It combines the authenticated
Cargo draft inventory, published bodycopy dependencies, Freight probes, local
media contracts, embed provenance, and the captured public font declarations.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.parse import quote, unquote, urlparse


REPO = Path(__file__).resolve().parents[2]
BASELINE_REL = Path("docs/audits/2026-07-20T175853-0400-round-80")
BASELINE = REPO / BASELINE_REL
OUT_DIR = REPO / "audit/assets"
EMBED_DEPENDENCIES = OUT_DIR / "frozen-embed-dependencies.json"
RENDERED_MEASUREMENTS = OUT_DIR / "rendered-media-measurements.json"
RENDERED_MEASUREMENTS_PROVENANCE = OUT_DIR / "rendered-media-measurements.provenance.json"
GEOMETRY_SUPERSESSIONS = OUT_DIR / "post-baseline-geometry-supersessions.json"
BASELINE_MANIFEST_SHA256 = "efe8a99a378e769db0fd4cf1fbc10033096673d66a5acce00192f1b7198983a6"

FIELDS = [
    "record_id",
    "record_type",
    "page",
    "owning_showcase",
    "media_id",
    "source_file",
    "cargo_freight_url",
    "canonical_base_url",
    "url_evidence",
    "freight_id",
    "filename",
    "rendition",
    "rendition_width_request_px",
    "natural_width_px",
    "natural_height_px",
    "design_width_1440_css_px",
    "design_height_1440_css_px",
    "rendered_max_width_css_px",
    "rendered_max_height_css_px",
    "dpr_coverage",
    "format",
    "mime_type",
    "transparency",
    "poster_fallback",
    "loading_priority",
    "referenced",
    "referenced_by",
    "source_provenance_evidence",
    "source_provenance_confidence",
    "delivery_evidence_source",
    "delivery_evidence_confidence",
    "notes",
]

def csv_rows(path: Path, delimiter: str = ",") -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle, delimiter=delimiter))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def verify_frozen_baseline() -> int:
    """Require the immutable Phase 1 evidence to match its root manifest."""
    manifest = BASELINE / "SHA256SUMS"
    if not manifest.is_file():
        raise RuntimeError(f"missing frozen baseline manifest: {manifest.relative_to(REPO)}")
    actual_manifest_hash = sha256_file(manifest)
    if actual_manifest_hash != BASELINE_MANIFEST_SHA256:
        raise RuntimeError(
            "frozen baseline root manifest hash mismatch: "
            f"expected {BASELINE_MANIFEST_SHA256}, got {actual_manifest_hash}"
        )
    entries = 0
    baseline_root = BASELINE.resolve()
    for line_number, line in enumerate(manifest.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        match = re.fullmatch(r"([0-9a-f]{64})  \./(.+)", line)
        if not match:
            raise RuntimeError(f"invalid SHA256SUMS line {line_number}: {line!r}")
        expected, relative = match.groups()
        target = (BASELINE / relative).resolve()
        if not target.is_relative_to(baseline_root):
            raise RuntimeError(f"baseline manifest path escapes root: {relative}")
        if not target.is_file():
            raise RuntimeError(f"baseline manifest entry is missing: {relative}")
        actual = sha256_file(target)
        if actual != expected:
            raise RuntimeError(
                f"frozen baseline entry hash mismatch for {relative}: expected {expected}, got {actual}"
            )
        entries += 1
    if entries == 0:
        raise RuntimeError("frozen baseline manifest contains no entries")
    return entries


def freight_id(url: str) -> str:
    match = re.search(r"/(?:i|m)/([A-Z]\d+)/", url)
    return match.group(1) if match else ""


def url_filename(url: str) -> str:
    return unquote(urlparse(url).path.rsplit("/", 1)[-1])


def url_format(url: str, fallback: str = "") -> str:
    suffix = Path(url_filename(url)).suffix.lower().lstrip(".")
    return suffix or fallback.lower()


def requested_width(url: str) -> str:
    match = re.search(r"/w/(\d+)(?:/|$)", urlparse(url).path)
    return match.group(1) if match else ""


def clean_number(value: str | float | int | None) -> str:
    if value is None or value == "":
        return "unknown"
    try:
        number = float(value)
    except (TypeError, ValueError):
        return str(value)
    if number.is_integer():
        return str(int(number))
    return f"{number:.3f}".rstrip("0").rstrip(".")


def yes_no(value: bool) -> str:
    return "true" if value else "false"


def normalized_name(name: str) -> str:
    text = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def canonical_stem(name: str) -> str:
    stem = Path(name).stem.lower()
    tokens = re.split(r"[^a-z0-9]+", unicodedata.normalize("NFKD", stem).encode("ascii", "ignore").decode())
    discard = {
        "cargo", "compressed", "final", "h264", "hq", "light", "originals",
        "poster", "retina", "small", "tiny", "under", "upscaled", "v2", "v3",
        "v4", "web", "1mb", "1080", "1800", "4x", "6x",
    }
    return "".join(token for token in tokens if token and token not in discard)


def transparency_from_probe(row: dict[str, str] | None, file_format: str) -> tuple[str, str]:
    if row:
        pixel = row.get("pixel_format", "").lower()
        if pixel in {"rgba", "bgra", "rgba64be", "yuva420p", "yuva444p"}:
            return "yes", f"decoded pixel format {pixel}"
        if pixel.startswith("yuv") or file_format in {"jpg", "jpeg"}:
            return "no", f"decoded pixel format {pixel or 'jpeg'}"
    if file_format in {"jpg", "jpeg"}:
        return "no", "JPEG has no alpha channel"
    return "unknown", "alpha channel was not decoded in Phase 1"


def mime_for(file_format: str, fallback: str = "") -> str:
    if fallback:
        return fallback
    return {
        "gif": "image/gif",
        "html": "text/html",
        "jpeg": "image/jpeg",
        "jpg": "image/jpeg",
        "mp4": "video/mp4",
        "pdf": "application/pdf",
        "png": "image/png",
        "svg": "image/svg+xml",
        "webm": "video/webm",
        "webp": "image/webp",
        "woff": "font/woff",
        "woff2": "font/woff2",
    }.get(file_format, "unknown")


def base_record() -> dict[str, str]:
    return {field: "" for field in FIELDS}


def frozen_embed_dependencies(
    embed_entries: list[dict[str, object]],
) -> tuple[dict[str, dict[str, str]], list[dict[str, str]]]:
    """Load portable child/inline evidence tied to frozen parent bundle hashes."""
    payload = json.loads(EMBED_DEPENDENCIES.read_text(encoding="utf-8"))
    if payload.get("schema_version") != 1:
        raise RuntimeError("unsupported frozen embed-dependency evidence schema")
    if payload.get("baseline_manifest_sha256") != BASELINE_MANIFEST_SHA256:
        raise RuntimeError("embed-dependency evidence is not tied to the Phase 1 root manifest")
    captured_by_kind = {str(entry["kind"]): entry for entry in embed_entries}
    frozen_sources = {
        row["path"]: row["sha256"]
        for row in csv_rows(BASELINE / "local/source-manifest.tsv", delimiter="\t")
    }
    children: dict[str, dict[str, str]] = {}
    inline_assets: list[dict[str, str]] = []
    for parent in payload.get("parents", []):
        kind = str(parent["kind"])
        captured = captured_by_kind.get(kind)
        if not captured:
            raise RuntimeError(f"embed-dependency evidence has no frozen parent: {kind}")
        if parent.get("bundle_sha256") != captured.get("sha256"):
            raise RuntimeError(f"embed-dependency evidence parent hash mismatch: {kind}")
        if parent.get("freight_url") != captured.get("freight_url"):
            raise RuntimeError(f"embed-dependency evidence parent URL mismatch: {kind}")
        common = {
            "parent_kind": kind,
            "parent_url": str(parent["freight_url"]),
            "parent_sha256": str(parent["bundle_sha256"]),
            "page": str(parent["page"]),
            "owner": str(parent["owning_showcase"]),
            "media_id": str(parent["media_id"]),
        }
        for raw_child in parent.get("children", []):
            child = {key: str(value) for key, value in raw_child.items()}
            asset_id = child.get("freight_id", "")
            if not asset_id or asset_id != freight_id(child.get("url", "")):
                raise RuntimeError(f"invalid frozen child identity for {kind}: {child}")
            if asset_id in children:
                raise RuntimeError(f"duplicate frozen embed child Freight ID: {asset_id}")
            if frozen_sources.get(child.get("source_file", "")) != child.get("source_sha256"):
                raise RuntimeError(f"embed child source is not hash-backed by Phase 1: {asset_id}")
            children[asset_id] = {
                **common,
                **child,
                "parent_media_id": common["media_id"],
                "media_id": f"{common['media_id']} (embed child)",
            }
        for raw_inline in parent.get("inline_assets", []):
            inline = {key: str(value) for key, value in raw_inline.items()}
            if not re.fullmatch(r"[0-9a-f]{64}", inline.get("decoded_sha256", "")):
                raise RuntimeError(f"invalid inline asset hash for {kind}: {inline}")
            source_path = inline.get("source_file", "")
            source_hash = inline.get("source_sha256", "")
            frozen_source_hash = frozen_sources.get(source_path)
            if frozen_source_hash and frozen_source_hash != source_hash:
                raise RuntimeError(f"inline source hash disagrees with Phase 1: {kind}/{source_path}")
            if not frozen_source_hash and source_hash != inline.get("decoded_sha256"):
                raise RuntimeError(f"one-time inline source is not an exact decoded-byte match: {kind}/{source_path}")
            inline_assets.append({
                **common,
                **inline,
                "parent_media_id": common["media_id"],
                "media_id": f"{common['media_id']} (inline {inline.get('role', 'asset')})",
            })
    return children, inline_assets


def rendered_measurements() -> tuple[dict[str, dict[str, object]], str, dict[str, object]]:
    """Optionally load a checked-in complete visual-suite media summary.

    The summary intentionally contains no run metadata, so a hash-bound sidecar
    records whether the evidence came from the local deterministic fixture, an
    authenticated Cargo snapshot, or another declared target.
    """
    if not RENDERED_MEASUREMENTS.is_file():
        return {}, "not captured", {}
    if not RENDERED_MEASUREMENTS_PROVENANCE.is_file():
        raise RuntimeError("rendered-media measurement artifact has no provenance sidecar")
    payload = json.loads(RENDERED_MEASUREMENTS.read_text(encoding="utf-8"))
    provenance = json.loads(RENDERED_MEASUREMENTS_PROVENANCE.read_text(encoding="utf-8"))
    if payload.get("schemaVersion") != "mms-audit/v1" or payload.get("kind") != "media-observation-summary":
        raise RuntimeError("unsupported rendered-media measurement artifact")
    if provenance.get("schema_version") != "mms-audit/rendered-measurement-provenance/v1":
        raise RuntimeError("unsupported rendered-media measurement provenance")
    if provenance.get("artifact") != RENDERED_MEASUREMENTS.relative_to(REPO).as_posix():
        raise RuntimeError("rendered-media provenance points to the wrong artifact")
    if provenance.get("artifact_sha256") != sha256_file(RENDERED_MEASUREMENTS):
        raise RuntimeError("rendered-media measurement provenance hash mismatch")
    if provenance.get("suite") != "visual" or provenance.get("capture_count") != provenance.get("scenario_count"):
        raise RuntimeError("rendered-media measurements must come from a complete visual suite")
    required_widths = [320, 390, 430, 431, 600, 768, 1023, 1024, 1440, 1920, 2560, 2940]
    if provenance.get("viewport_widths_px") != required_widths:
        raise RuntimeError("rendered-media provenance does not cover the complete visual viewport matrix")
    source_run_relative = Path(str(provenance.get("source_run", "")))
    if source_run_relative.is_absolute() or ".." in source_run_relative.parts:
        raise RuntimeError("rendered-media provenance source-run path is unsafe")
    source_run = REPO / source_run_relative
    source_record_path = provenance.get("source_record_path", [])
    if not source_run.is_file() or not isinstance(source_record_path, list) or not source_record_path:
        raise RuntimeError("rendered-media provenance has no committed source-run record")
    source_record: object = json.loads(source_run.read_text(encoding="utf-8"))
    for key in source_record_path:
        if not isinstance(source_record, dict) or key not in source_record:
            raise RuntimeError("rendered-media provenance source-record path is invalid")
        source_record = source_record[key]
    if not isinstance(source_record, dict):
        raise RuntimeError("rendered-media provenance source record is not an object")
    if source_record.get("run_id") != provenance.get("source_run_id"):
        raise RuntimeError("rendered-media provenance run ID disagrees with committed evidence")
    if source_record.get("captures") != provenance.get("capture_count"):
        raise RuntimeError("rendered-media provenance capture count disagrees with committed evidence")
    if source_record.get("viewport_widths_px") != required_widths:
        raise RuntimeError("rendered-media provenance viewport matrix disagrees with committed evidence")
    if source_record.get("media_ids") != provenance.get("media_id_count"):
        raise RuntimeError("rendered-media provenance media count disagrees with committed evidence")
    measurements: dict[str, dict[str, object]] = {}
    for item in payload.get("media", []):
        media_id = str(item.get("mediaId", ""))
        if not media_id or media_id in measurements:
            raise RuntimeError(f"invalid or duplicate rendered media ID: {media_id!r}")
        for key in ("maxRenderedWidth", "maxRenderedHeight", "maxDpr", "maxRequiredPixelWidth", "maxRequiredPixelHeight"):
            value = item.get(key)
            if not isinstance(value, (int, float)) or value < 0:
                raise RuntimeError(f"invalid {key} for rendered media ID {media_id}")
        measurements[media_id] = item
    if provenance.get("media_id_count") != len(measurements):
        raise RuntimeError("rendered-media provenance media count mismatch")
    return measurements, RENDERED_MEASUREMENTS.relative_to(REPO).as_posix(), provenance


def geometry_supersessions() -> dict[str, object]:
    """Load additive current-geometry facts without rewriting frozen rows."""
    payload = json.loads(GEOMETRY_SUPERSESSIONS.read_text(encoding="utf-8"))
    if payload.get("schema_version") != "mms-audit/post-baseline-geometry-supersessions/v1":
        raise RuntimeError("unsupported post-baseline geometry-supersession evidence")
    if payload.get("baseline") != BASELINE_REL.as_posix():
        raise RuntimeError("geometry supersessions point to the wrong frozen baseline")
    seen: set[tuple[str, str]] = set()
    for item in payload.get("supersessions", []):
        identity = (str(item.get("page", "")), str(item.get("media_id", "")))
        if not all(identity) or identity in seen:
            raise RuntimeError(f"invalid or duplicate geometry supersession: {identity}")
        seen.add(identity)
        if item.get("status") != "current":
            raise RuntimeError(f"geometry supersession is not current: {identity}")
        for value_name in ("frozen_value", "current_value"):
            value = item.get(value_name, {})
            if not all(isinstance(value.get(axis), (int, float)) and value.get(axis) > 0 for axis in ("width_css_px", "height_css_px")):
                raise RuntimeError(f"invalid {value_name} in geometry supersession: {identity}")
    return payload


class BodycopyParser(HTMLParser):
    """Collect URL occurrences while retaining the enclosing showcase band."""

    URL_ATTRIBUTES = ("src", "data-src", "poster", "data-poster", "data-mp4")

    def __init__(self, page: str) -> None:
        super().__init__(convert_charrefs=True)
        self.page = page
        self.stack: list[tuple[str, str]] = []
        self.occurrences: list[dict[str, str]] = []
        self.links: list[dict[str, str]] = []
        self.relations: dict[str, dict[str, str]] = {}

    def current_band(self) -> str:
        for _, band in reversed(self.stack):
            if band:
                return band
        return "site-shell"

    def handle_starttag(self, tag: str, attrs_raw: list[tuple[str, str | None]]) -> None:
        attrs = {key: value or "" for key, value in attrs_raw}
        inherited = self.current_band()
        band = attrs.get("data-band", "") or (inherited if inherited != "site-shell" else "")
        self.stack.append((tag, band))
        owner = band or "site-shell"
        priority = (
            attrs.get("data-motion-priority")
            or attrs.get("fetchpriority")
            or attrs.get("loading")
            or "default"
        )
        media_id = attrs.get("data-media-id", "")
        source = attrs.get("data-src") or attrs.get("src") or ""
        poster = attrs.get("data-poster") or attrs.get("poster") or ""
        fallback = attrs.get("data-mp4", "")
        relation = "; ".join(
            item for item in (
                f"poster={poster}" if poster else "",
                f"fallback={fallback}" if fallback else "",
            ) if item
        )
        if source:
            self.relations[freight_id(source)] = {
                "relation": relation,
                "owner": owner,
                "page": self.page,
                "media_id": media_id,
                "priority": priority,
            }
        if poster:
            self.relations[freight_id(poster)] = {
                "relation": f"poster for {source}",
                "owner": owner,
                "page": self.page,
                "media_id": media_id,
                "priority": priority,
            }
        if fallback:
            self.relations[freight_id(fallback)] = {
                "relation": f"fallback for {source}",
                "owner": owner,
                "page": self.page,
                "media_id": media_id,
                "priority": priority,
            }
        for attribute in self.URL_ATTRIBUTES:
            value = attrs.get(attribute, "")
            if value and (value.startswith("http://") or value.startswith("https://")):
                self.occurrences.append({
                    "url": value,
                    "tag": tag,
                    "attribute": attribute,
                    "page": self.page,
                    "owner": owner,
                    "media_id": media_id,
                    "priority": priority,
                })
        for candidate in attrs.get("srcset", "").split(","):
            value = candidate.strip().split(" ", 1)[0]
            if value.startswith("http://") or value.startswith("https://"):
                self.occurrences.append({
                    "url": value,
                    "tag": tag,
                    "attribute": "srcset",
                    "page": self.page,
                    "owner": owner,
                    "media_id": media_id,
                    "priority": priority,
                })
        href = attrs.get("href", "")
        if tag == "a" and href:
            self.links.append({"url": href, "page": self.page, "owner": owner})

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break


def parse_bodycopies() -> tuple[list[dict[str, str]], list[dict[str, str]], dict[str, dict[str, str]]]:
    occurrences: list[dict[str, str]] = []
    links: list[dict[str, str]] = []
    relations: dict[str, dict[str, str]] = {}
    for page in ("home", "who", "write"):
        path = BASELINE / f"cargo-draft/{page}.bodycopy.html"
        parser = BodycopyParser(page)
        parser.feed(path.read_text(encoding="utf-8"))
        occurrences.extend(parser.occurrences)
        links.extend(parser.links)
        relations.update({key: value for key, value in parser.relations.items() if key})
    return occurrences, links, relations


def local_media_maps() -> tuple[dict[str, dict[str, str]], dict[str, str]]:
    details: dict[str, dict[str, str]] = {}
    relation: dict[str, str] = {}
    for row in csv_rows(BASELINE / "local/media-inventory.csv"):
        primary_id = freight_id(row["source"])
        primary_relation = "; ".join(
            value for value in (
                f"poster={row['poster']}" if row["poster"] else "",
                f"fallback={row['mp4_fallback']}" if row["mp4_fallback"] else "",
            ) if value
        )
        common = {
            "page": "home",
            "owner": row["band"],
            "media_id": row["media_id"],
            "design_width": row["asset_w"],
            "design_height": row["asset_h"],
            "priority": row["loading"] or ("critical" if row["media_id"] in {"eviive-01", "eviive-02", "v7-01"} else "near"),
        }
        if primary_id:
            details[primary_id] = common
            relation[primary_id] = primary_relation
        for role, url in (("poster", row["poster"]), ("fallback", row["mp4_fallback"])):
            asset_id = freight_id(url)
            if not asset_id:
                continue
            details[asset_id] = common
            relation[asset_id] = f"{role} for {row['source']}"
    return details, relation


def frozen_source_indexes() -> tuple[dict[str, list[str]], dict[str, list[str]], dict[str, list[str]], dict[str, list[str]]]:
    """Index only source paths captured and hashed inside Phase 1 evidence."""
    exact: dict[str, list[str]] = defaultdict(list)
    normalized: dict[str, list[str]] = defaultdict(list)
    canonical: dict[str, list[str]] = defaultdict(list)
    by_sha: dict[str, list[str]] = defaultdict(list)

    source_rows = csv_rows(BASELINE / "local/source-manifest.tsv", delimiter="\t")
    for row in source_rows:
        rel = row["path"]
        name = Path(rel).name
        by_sha[row["sha256"]].append(row["path"])
        exact[name.lower()].append(rel)
        normalized[normalized_name(name)].append(rel)
        canonical[f"{canonical_stem(name)}{Path(name).suffix.lower()}"].append(rel)
    for index in (exact, normalized, canonical, by_sha):
        for key in index:
            index[key] = sorted(set(index[key]))
    return exact, normalized, canonical, by_sha


def source_for(
    filename: str,
    sha256: str,
    indexes: tuple[dict[str, list[str]], dict[str, list[str]], dict[str, list[str]], dict[str, list[str]]],
) -> tuple[str, str, str]:
    exact, normalized, canonical, by_sha = indexes
    if sha256 and len(by_sha.get(sha256, [])) == 1:
        return by_sha[sha256][0], "high", "local file matched remote SHA-256"
    strategies = (
        (exact.get(filename.lower(), []), "medium", "captured local source matched exact basename"),
        (normalized.get(normalized_name(filename), []), "low", "captured local source matched normalized basename"),
        (canonical.get(f"{canonical_stem(filename)}{Path(filename).suffix.lower()}", []), "low", "captured local source matched normalized release stem"),
    )
    for matches, confidence, note in strategies:
        if len(matches) == 1:
            return matches[0], confidence, note
    return "unknown", "unknown", "no unambiguous source match exists in the frozen Phase 1 source manifest"


def record_id(record: dict[str, str]) -> str:
    identity = "|".join((
        record["record_type"], record["page"], record["cargo_freight_url"],
        record["freight_id"], record["filename"], record["owning_showcase"],
    ))
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()[:20]


def finalize_record(record: dict[str, str]) -> dict[str, str]:
    for field in FIELDS:
        record.setdefault(field, "")
    for field in (
        "natural_width_px", "natural_height_px", "design_width_1440_css_px",
        "design_height_1440_css_px", "rendered_max_width_css_px",
        "rendered_max_height_css_px", "dpr_coverage",
    ):
        if not record[field]:
            record[field] = "unknown"
    if not record["source_file"]:
        record["source_file"] = "unknown"
    if not record["canonical_base_url"]:
        record["canonical_base_url"] = record["cargo_freight_url"].split("?", 1)[0]
    if not record["url_evidence"]:
        record["url_evidence"] = "unknown"
    if not record["poster_fallback"]:
        record["poster_fallback"] = "none"
    if not record["loading_priority"]:
        record["loading_priority"] = "unknown"
    if not record["transparency"]:
        record["transparency"] = "unknown"
    if not record["source_provenance_evidence"]:
        record["source_provenance_evidence"] = "no source provenance captured"
    if not record["source_provenance_confidence"]:
        record["source_provenance_confidence"] = "unknown"
    if not record["delivery_evidence_source"]:
        record["delivery_evidence_source"] = "unknown"
    if not record["delivery_evidence_confidence"]:
        record["delivery_evidence_confidence"] = "unknown"
    record["record_id"] = record_id(record)
    return {field: str(record[field]) for field in FIELDS}


def add_note(record: dict[str, str], note: str) -> None:
    if not note:
        return
    record["notes"] = "; ".join(value for value in (record.get("notes", ""), note) if value)


def build_records() -> list[dict[str, str]]:
    freight_probes = csv_rows(BASELINE / "freight/asset-manifest.csv")
    probe_by_id = {row["freight_id"]: row for row in freight_probes}
    library_rows = csv_rows(BASELINE / "cargo-draft/media-inventory.tsv", delimiter="\t")
    dependency_rows = csv_rows(BASELINE / "public/public-bodycopy-dependencies.tsv", delimiter="\t")
    embed_entries = json.loads((BASELINE / "local/embed-manifest.json").read_text(encoding="utf-8"))["entries"]
    embed_children, inline_embed_assets = frozen_embed_dependencies(embed_entries)
    measurement_by_media_id, measurement_source, _ = rendered_measurements()
    local_details, local_relations = local_media_maps()
    occurrences, links, body_relations = parse_bodycopies()
    source_indexes = frozen_source_indexes()

    occurrences_by_id: dict[str, list[dict[str, str]]] = defaultdict(list)
    occurrences_by_url: dict[str, list[dict[str, str]]] = defaultdict(list)
    for occurrence in occurrences:
        occurrences_by_url[occurrence["url"]].append(occurrence)
        asset_id = freight_id(occurrence["url"])
        if asset_id:
            occurrences_by_id[asset_id].append(occurrence)

    dependency_by_id: dict[str, list[dict[str, str]]] = defaultdict(list)
    dependency_urls: set[str] = set()
    for dependency in dependency_rows:
        dependency_urls.add(dependency["url"])
        if dependency["freight_id"]:
            dependency_by_id[dependency["freight_id"]].append(dependency)
    referenced_ids = set(dependency_by_id)
    referenced_ids.update(embed_children)
    dependency_urls.update(child["url"] for child in embed_children.values())
    observed_original_by_id: dict[str, str] = {
        row["freight_id"]: row["original_url"]
        for row in freight_probes
        if row["freight_id"] and row["original_url"]
    }
    for dependency in dependency_rows:
        if dependency["freight_id"] and dependency["variant"] == "original":
            observed_original_by_id.setdefault(dependency["freight_id"], dependency["url"])

    records: list[dict[str, str]] = []
    represented_original_ids: set[str] = set()
    represented_urls: set[str] = set()

    def ownership(asset_id: str) -> tuple[str, str, str, str, str]:
        child = embed_children.get(asset_id, {})
        detail = local_details.get(asset_id, {})
        relation = body_relations.get(asset_id, {})
        occurrences_for_asset = occurrences_by_id.get(asset_id, [])
        owner = child.get("owner") or detail.get("owner") or relation.get("owner") or (occurrences_for_asset[0]["owner"] if occurrences_for_asset else "unknown")
        page = child.get("page") or detail.get("page") or relation.get("page") or (occurrences_for_asset[0]["page"] if occurrences_for_asset else "unknown")
        media_id_value = child.get("media_id") or detail.get("media_id") or relation.get("media_id") or (occurrences_for_asset[0]["media_id"] if occurrences_for_asset else "")
        priority = child.get("loading_priority") or relation.get("priority") or detail.get("priority") or (occurrences_for_asset[0]["priority"] if occurrences_for_asset else "")
        poster = local_relations.get(asset_id) or relation.get("relation") or ""
        return page, owner, media_id_value, priority, poster

    def references(asset_id: str, url: str) -> str:
        values = {
            f"{row['page']}:{row['tag']}[{row['attribute']}]/{row['variant']}"
            for row in dependency_by_id.get(asset_id, [])
            if not url or row["url"] == url or row["variant"] == "original"
        }
        values.update(
            f"{row['page']}:{row['tag']}[{row['attribute']}]"
            for row in occurrences_by_url.get(url, [])
        )
        child = embed_children.get(asset_id)
        if child and (not url or child["url"] == url):
            values.add(
                f"{child['page']}:{child['parent_media_id']} iframe child/{child['role']}"
            )
        return "; ".join(sorted(values)) or "none"

    for row in library_rows:
        asset_id = row["hash"]
        filename = row["name"] or row["display_name"]
        file_format = (row["file_type"] or Path(filename).suffix.lstrip(".")).lower()
        probe = probe_by_id.get(asset_id)
        child = embed_children.get(asset_id)
        observed_url = observed_original_by_id.get(asset_id, "")
        if child:
            url = child["url"]
            url_evidence = "observed verbatim in the active embed bundle captured by frozen child-dependency evidence"
            delivery_confidence = "high"
        elif observed_url:
            url = observed_url
            url_evidence = "observed in the Phase 1 Freight probe or captured bodycopy"
            delivery_confidence = "high"
        else:
            url = f"https://freight.cargo.site/t/original/i/{asset_id}/{quote(filename, safe='')}"
            url_evidence = "derived from Cargo media hash and filename; not observed in Phase 1 delivery"
            delivery_confidence = "medium"
        page, owner, media_id_value, priority, poster = ownership(asset_id)
        if page == "who" and filename.lower().startswith("profile-chy"):
            owner = "who-ocean"
        elif page == "who" and filename.lower().startswith("profile-cch"):
            owner = "who-alvis"
        if child:
            source = child["source_file"]
            source_confidence = "low"
            source_note = child["source_relation"]
        else:
            source, source_confidence, source_note = source_for(filename, probe.get("sha256", "") if probe else "", source_indexes)
        alpha, alpha_note = transparency_from_probe(probe, file_format)
        natural_w = row["width"] or (probe.get("natural_width", "") if probe else "")
        natural_h = row["height"] or (probe.get("natural_height", "") if probe else "")
        detail = local_details.get(asset_id, {})
        is_referenced = asset_id in referenced_ids
        record_type = "poster" if "poster" in row["role"] or "poster" in filename.lower() else (
            "video" if file_format in {"mp4", "mov", "webm"} else "image"
        )
        record = base_record()
        record.update({
            "record_type": record_type,
            "page": page if is_referenced else (page if page != "unknown" else "Cargo library"),
            "owning_showcase": owner,
            "media_id": media_id_value,
            "source_file": source,
            "cargo_freight_url": url,
            "canonical_base_url": url,
            "url_evidence": url_evidence,
            "freight_id": asset_id,
            "filename": filename,
            "rendition": "original",
            "natural_width_px": clean_number(natural_w),
            "natural_height_px": clean_number(natural_h),
            "design_width_1440_css_px": clean_number(detail.get("design_width")),
            "design_height_1440_css_px": clean_number(detail.get("design_height")),
            "format": file_format,
            "mime_type": mime_for(file_format, row["mime_type"]),
            "transparency": alpha,
            "poster_fallback": poster,
            "loading_priority": priority or ("none (unreferenced)" if not is_referenced else "unknown"),
            "referenced": yes_no(is_referenced),
            "referenced_by": references(asset_id, ""),
            "source_provenance_evidence": (
                f"audit/assets/frozen-embed-dependencies.json: {source_note}; source path/hash is frozen in {BASELINE_REL}/local/source-manifest.tsv"
                if child else f"{BASELINE_REL}/local/source-manifest.tsv: {source_note}"
            ),
            "source_provenance_confidence": source_confidence,
            "delivery_evidence_source": (
                f"{BASELINE_REL}/cargo-draft/media-inventory.tsv; audit/assets/frozen-embed-dependencies.json; parent bundle SHA-256 {child['parent_sha256']}"
                if child else f"{BASELINE_REL}/cargo-draft/media-inventory.tsv" + (f"; {BASELINE_REL}/freight/asset-manifest.csv" if probe else "")
            ),
            "delivery_evidence_confidence": delivery_confidence,
        })
        if detail.get("design_width") and natural_w:
            coverage = float(natural_w) / float(detail["design_width"])
            record["dpr_coverage"] = f"{coverage:.2f}x at 1440 reference; maximum-render coverage pending"
        add_note(record, source_note)
        add_note(record, alpha_note)
        add_note(record, f"Cargo library in_use={row['in_use']}; bodycopy reference is authoritative")
        records.append(finalize_record(record))
        represented_original_ids.add(asset_id)
        represented_urls.add(url)

    # Referenced embeds and the PDF are not represented in Cargo's page-media list.
    embed_by_url = {entry["freight_url"]: entry for entry in embed_entries}
    for dependency in dependency_rows:
        if dependency["variant"] not in {"embed", "original"}:
            continue
        asset_id = dependency["freight_id"]
        if asset_id in represented_original_ids:
            continue
        probe = probe_by_id.get(asset_id)
        page, owner, media_id_value, priority, poster = ownership(asset_id)
        if dependency["kind"] == "pdf" and dependency["filename"].startswith("montran_"):
            page, owner = "home", "montran"
        file_format = url_format(dependency["url"], probe.get("kind", "") if probe else "")
        embed = embed_by_url.get(dependency["url"].split("?", 1)[0])
        if embed:
            source = embed["local_path"]
            if probe and embed.get("sha256") == probe.get("sha256"):
                source_confidence = "high"
                source_note = "embed source path matched remote SHA-256 in frozen Phase 1 evidence"
            else:
                source_confidence = "unknown"
                source_note = "embed path is captured, but no matching source/delivery hash was available"
        else:
            source, source_confidence, source_note = source_for(dependency["filename"], probe.get("sha256", "") if probe else "", source_indexes)
        alpha, alpha_note = transparency_from_probe(probe, file_format)
        record = base_record()
        record.update({
            "record_type": dependency["kind"],
            "page": page if page != "unknown" else dependency["page"],
            "owning_showcase": owner,
            "media_id": media_id_value,
            "source_file": source,
            "cargo_freight_url": dependency["url"],
            "canonical_base_url": dependency["url"].split("?", 1)[0],
            "url_evidence": "observed verbatim in the captured bodycopy dependency table",
            "freight_id": asset_id,
            "filename": dependency["filename"],
            "rendition": dependency["variant"],
            "natural_width_px": clean_number(probe.get("natural_width") if probe else ""),
            "natural_height_px": clean_number(probe.get("natural_height") if probe else ""),
            "design_width_1440_css_px": clean_number(local_details.get(asset_id, {}).get("design_width")),
            "design_height_1440_css_px": clean_number(local_details.get(asset_id, {}).get("design_height")),
            "format": file_format,
            "mime_type": mime_for(file_format, probe.get("content_type", "") if probe else ""),
            "transparency": alpha if dependency["kind"] not in {"embed", "pdf"} else "not applicable",
            "poster_fallback": poster,
            "loading_priority": priority or "lazy",
            "referenced": "true",
            "referenced_by": references(asset_id, dependency["url"]),
            "source_provenance_evidence": (
                f"{BASELINE_REL}/local/embed-manifest.json: {source_note}"
                if embed else f"{BASELINE_REL}/local/source-manifest.tsv: {source_note}"
            ),
            "source_provenance_confidence": source_confidence,
            "delivery_evidence_source": f"{BASELINE_REL}/public/public-bodycopy-dependencies.tsv; {BASELINE_REL}/freight/asset-manifest.csv",
            "delivery_evidence_confidence": "high",
        })
        add_note(record, source_note)
        add_note(record, alpha_note if dependency["kind"] not in {"embed", "pdf"} else "")
        records.append(finalize_record(record))
        represented_original_ids.add(asset_id)
        represented_urls.add(record["cargo_freight_url"])

    # Assets embedded inside hashed iframe bundles have no standalone network
    # request. Keep a compact SHA-addressed identity rather than copying a data
    # URI into the manifest.
    for inline in inline_embed_assets:
        file_format = Path(inline["filename"]).suffix.lower().lstrip(".")
        inline_url = (
            f"inline://{freight_id(inline['parent_url'])}/{quote(inline['filename'], safe='')}"
            f"#sha256={inline['decoded_sha256']}"
        )
        source_hash_matches = inline.get("source_sha256") == inline.get("decoded_sha256")
        source_note = inline.get("source_relation", "inline source relation not captured")
        record = base_record()
        record.update({
            "record_type": "poster" if inline["role"] == "loading poster" else "embed-inline-image",
            "page": inline["page"],
            "owning_showcase": inline["owner"],
            "media_id": inline["media_id"],
            "source_file": inline.get("source_file", "unknown"),
            "cargo_freight_url": inline_url,
            "canonical_base_url": inline_url,
            "url_evidence": "SHA-addressed identity for a data URI decoded from the active hashed embed bundle",
            "filename": inline["filename"],
            "rendition": "inline data URI",
            "natural_width_px": clean_number(inline.get("natural_width_px")),
            "natural_height_px": clean_number(inline.get("natural_height_px")),
            "format": file_format,
            "mime_type": inline["mime_type"],
            "transparency": inline.get("transparency", "unknown"),
            "poster_fallback": "self (inline loading poster)" if inline["role"] == "loading poster" else "none",
            "loading_priority": inline["loading_priority"],
            "referenced": "true",
            "referenced_by": f"{inline['page']}:{inline['parent_media_id']} iframe inline/{inline['role']}",
            "source_provenance_evidence": f"audit/assets/frozen-embed-dependencies.json: {source_note}",
            "source_provenance_confidence": "high" if source_hash_matches else "unknown",
            "delivery_evidence_source": (
                "audit/assets/frozen-embed-dependencies.json; "
                f"parent bundle SHA-256 {inline['parent_sha256']} from {BASELINE_REL}/local/embed-manifest.json"
            ),
            "delivery_evidence_confidence": "high",
        })
        add_note(record, f"decoded bytes={inline['decoded_bytes']}; decoded SHA-256={inline['decoded_sha256']}")
        add_note(record, source_note)
        records.append(finalize_record(record))

    # Each Cargo transform URL is a distinct delivery rendition.
    for dependency in dependency_rows:
        if dependency["variant"] != "transformed" or dependency["url"] in represented_urls:
            continue
        asset_id = dependency["freight_id"]
        probe = probe_by_id.get(asset_id)
        page, owner, media_id_value, priority, poster = ownership(asset_id)
        file_format = url_format(dependency["url"])
        source, source_confidence, source_note = source_for(dependency["filename"], probe.get("sha256", "") if probe else "", source_indexes)
        alpha, alpha_note = transparency_from_probe(probe, file_format)
        request_w = requested_width(dependency["url"])
        inferred_w = ""
        inferred_h = ""
        if request_w and probe and probe.get("natural_width") and probe.get("natural_height"):
            source_w = int(float(probe["natural_width"]))
            source_h = int(float(probe["natural_height"]))
            inferred_w_value = min(int(request_w), source_w)
            inferred_w = str(inferred_w_value)
            inferred_h = str(round(inferred_w_value * source_h / source_w))
        detail = local_details.get(asset_id, {})
        record = base_record()
        record.update({
            "record_type": "image-rendition",
            "page": page if page != "unknown" else dependency["page"],
            "owning_showcase": owner,
            "media_id": media_id_value,
            "source_file": source,
            "cargo_freight_url": dependency["url"],
            "freight_id": asset_id,
            "filename": dependency["filename"],
            "rendition": "transformed",
            "rendition_width_request_px": request_w,
            "natural_width_px": clean_number(inferred_w),
            "natural_height_px": clean_number(inferred_h),
            "design_width_1440_css_px": clean_number(detail.get("design_width")),
            "design_height_1440_css_px": clean_number(detail.get("design_height")),
            "format": file_format,
            "mime_type": mime_for(file_format),
            "transparency": alpha,
            "poster_fallback": poster,
            "loading_priority": priority or "lazy",
            "referenced": "true",
            "referenced_by": references(asset_id, dependency["url"]),
            "source_provenance_evidence": f"{BASELINE_REL}/local/source-manifest.tsv: {source_note}",
            "source_provenance_confidence": source_confidence,
            "delivery_evidence_source": f"{BASELINE_REL}/public/public-bodycopy-dependencies.tsv; URL width contract; original dimensions from {BASELINE_REL}/freight/asset-manifest.csv",
            "delivery_evidence_confidence": "high for URL; medium for inferred decoded size" if inferred_w else "high for URL",
        })
        if detail.get("design_width") and inferred_w:
            coverage = float(inferred_w) / float(detail["design_width"])
            record["dpr_coverage"] = f"{coverage:.2f}x at 1440 reference; maximum-render coverage pending"
        add_note(record, source_note)
        add_note(record, alpha_note)
        if inferred_w:
            add_note(record, "natural size is inferred from the Cargo width request and probed original ratio; browser decode is pending")
        records.append(finalize_record(record))
        represented_urls.add(dependency["url"])

    # Links are deliberately separate records, including relative navigation and mailto links.
    seen_links: set[tuple[str, str, str]] = set()
    for link in links:
        key = (link["page"], link["owner"], link["url"])
        if key in seen_links:
            continue
        seen_links.add(key)
        parsed = urlparse(link["url"])
        if parsed.scheme == "mailto":
            kind = "email-link"
        elif not parsed.scheme or parsed.netloc in {"mmmmm.studio", "www.mmmmm.studio"}:
            kind = "internal-link"
        else:
            kind = "external-link"
        record = base_record()
        record.update({
            "record_type": kind,
            "page": link["page"],
            "owning_showcase": link["owner"],
            "source_file": f"cargo/{link['page']}.html",
            "cargo_freight_url": link["url"],
            "canonical_base_url": link["url"],
            "url_evidence": "observed verbatim in the frozen Cargo draft bodycopy",
            "filename": parsed.netloc or parsed.path or link["url"],
            "rendition": "not applicable",
            "format": "URI",
            "mime_type": "not applicable",
            "transparency": "not applicable",
            "poster_fallback": "not applicable",
            "loading_priority": "user navigation",
            "referenced": "true",
            "referenced_by": f"{link['page']}:a[href]",
            "source_provenance_evidence": f"exact canonical path captured in {BASELINE_REL}/local/source-manifest.tsv; delivered bodycopy in {BASELINE_REL}/cargo-draft/{link['page']}.bodycopy.html",
            "source_provenance_confidence": "medium",
            "delivery_evidence_source": f"{BASELINE_REL}/cargo-draft/{link['page']}.bodycopy.html",
            "delivery_evidence_confidence": "high",
        })
        records.append(finalize_record(record))

    # Cargo-generated @font-face blocks expose the exact remote font files.
    public_home = (BASELINE / "public/home.html").read_text(encoding="utf-8")
    font_urls: dict[str, set[str]] = defaultdict(set)
    for block in re.findall(r"@font-face\s*\{(.*?)\}", public_home, flags=re.DOTALL):
        family_match = re.search(r"font-family:\s*[\"']?([^;\"']+)", block)
        url_match = re.search(r"src:\s*url\([\"']?([^\"')]+)", block)
        if family_match and url_match:
            font_urls[url_match.group(1)].add(family_match.group(1).strip())
    for url, families in sorted(font_urls.items()):
        file_format = url_format(url)
        record = base_record()
        record.update({
            "record_type": "font-file",
            "page": "site",
            "owning_showcase": "Cargo shell",
            "source_file": "Cargo-managed font block (no local source file)",
            "cargo_freight_url": url,
            "canonical_base_url": url,
            "url_evidence": "observed verbatim in a captured public @font-face rule",
            "filename": url_filename(url),
            "rendition": "Cargo font delivery",
            "format": file_format,
            "mime_type": mime_for(file_format),
            "transparency": "not applicable",
            "poster_fallback": "system fallback stack in cargo/tokens.css",
            "loading_priority": "browser font selection",
            "referenced": "true",
            "referenced_by": "; ".join(sorted(families)),
            "source_provenance_evidence": "Cargo-managed binary; no local source file captured",
            "source_provenance_confidence": "unknown",
            "delivery_evidence_source": f"{BASELINE_REL}/public/home.html @font-face",
            "delivery_evidence_confidence": "high",
        })
        records.append(finalize_record(record))

    # The Google provider and system serif are selected by CSS but do not expose
    # a captured binary URL in Phase 1.
    for family, record_type, provider, fallback in (
        ("UnifrakturMaguntia", "font-provider", "Google Fonts provider; resolved binary URL not captured", "Times New Roman"),
        ("Times New Roman", "system-font", "operating-system font; no remote URL", "Times, serif"),
    ):
        record = base_record()
        record.update({
            "record_type": record_type,
            "page": "site",
            "owning_showcase": "site typography",
            "source_file": "cargo/tokens.css",
            "cargo_freight_url": "not captured" if record_type == "font-provider" else "not applicable",
            "canonical_base_url": "not captured" if record_type == "font-provider" else "not applicable",
            "url_evidence": "no binary delivery URL was captured" if record_type == "font-provider" else "system font has no delivery URL",
            "filename": family,
            "rendition": provider,
            "format": "font",
            "mime_type": "not captured",
            "transparency": "not applicable",
            "poster_fallback": fallback,
            "loading_priority": "browser font selection",
            "referenced": "true",
            "referenced_by": f"font-family: {family}",
            "source_provenance_evidence": f"exact CSS contract path captured in {BASELINE_REL}/local/source-manifest.tsv",
            "source_provenance_confidence": "medium",
            "delivery_evidence_source": f"{BASELINE_REL}/public/home.html preloaded site font settings",
            "delivery_evidence_confidence": "medium for provider contract; unknown for resolved binary" if record_type == "font-provider" else "not applicable",
            "notes": "Phase 2 network harness must capture the resolved font request" if record_type == "font-provider" else "availability depends on the visitor operating system",
        })
        records.append(finalize_record(record))

    # Attach full-suite rendered maxima only when the checked-in harness
    # artifact exists. Embed children use qualified IDs and are intentionally
    # not assigned their parent iframe's rectangle.
    for record in records:
        measurement = measurement_by_media_id.get(record["media_id"])
        if not measurement:
            continue
        rendered_w = float(measurement["maxRenderedWidth"])
        rendered_h = float(measurement["maxRenderedHeight"])
        required_w = float(measurement["maxRequiredPixelWidth"])
        required_h = float(measurement["maxRequiredPixelHeight"])
        if rendered_w > 0:
            record["rendered_max_width_css_px"] = clean_number(rendered_w)
        if rendered_h > 0:
            record["rendered_max_height_css_px"] = clean_number(rendered_h)
        coverage_parts: list[tuple[str, float]] = []
        if required_w > 0 and record["natural_width_px"] != "unknown":
            coverage_parts.append(("width", float(record["natural_width_px"]) / required_w))
        if required_h > 0 and record["natural_height_px"] != "unknown":
            coverage_parts.append(("height", float(record["natural_height_px"]) / required_h))
        if coverage_parts:
            limiting_axis, limiting_coverage = min(coverage_parts, key=lambda value: value[1])
            record["dpr_coverage"] = (
                f"{limiting_coverage:.2f}x of measured requirement ({limiting_axis}-limited; "
                f"max observed DPR {clean_number(measurement['maxDpr'])})"
            )
        else:
            record["dpr_coverage"] = "unknown (rendered maximum measured; decoded source size unavailable)"
        add_note(record, f"rendered maxima imported from {measurement_source}")

    # Deterministic validation against every frozen Phase 1 dependency.
    generated_ids = {record["freight_id"] for record in records if record["freight_id"]}
    missing_probes = sorted(set(probe_by_id) - generated_ids)
    if missing_probes:
        raise RuntimeError(f"manifest omitted probed Freight IDs: {missing_probes}")
    generated_urls = {record["cargo_freight_url"] for record in records if record["cargo_freight_url"]}
    missing_freight_urls = sorted(
        url for url in dependency_urls
        if urlparse(url).netloc == "freight.cargo.site"
        and url not in generated_urls
    )
    if missing_freight_urls:
        raise RuntimeError(f"manifest omitted Freight dependency URLs: {missing_freight_urls[:5]}")

    records.sort(key=lambda row: (
        row["record_type"], row["page"], row["owning_showcase"],
        row["filename"].lower(), row["cargo_freight_url"], row["freight_id"],
    ))
    ids = [record["record_id"] for record in records]
    if len(ids) != len(set(ids)):
        duplicates = [item for item, count in Counter(ids).items() if count > 1]
        raise RuntimeError(f"record ID collision: {duplicates}")
    return records


def csv_bytes(records: list[dict[str, str]]) -> bytes:
    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=FIELDS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(records)
    return buffer.getvalue().encode("utf-8")


def summary_for(records: list[dict[str, str]]) -> dict[str, object]:
    return {
        "record_count": len(records),
        "by_record_type": dict(sorted(Counter(row["record_type"] for row in records).items())),
        "by_page": dict(sorted(Counter(row["page"] for row in records).items())),
        "referenced": dict(sorted(Counter(row["referenced"] for row in records).items())),
        "known_natural_size": sum(row["natural_width_px"] != "unknown" and row["natural_height_px"] != "unknown" for row in records),
        "known_local_source": sum(row["source_file"] not in {"unknown", "Cargo-managed font block (no local source file)"} for row in records),
        "unknown_rendered_max": sum(row["rendered_max_width_css_px"] == "unknown" for row in records),
        "unknown_transparency": sum(row["transparency"] == "unknown" for row in records),
        "source_provenance_confidence": dict(sorted(Counter(row["source_provenance_confidence"] for row in records).items())),
        "delivery_evidence_confidence": dict(sorted(Counter(row["delivery_evidence_confidence"] for row in records).items())),
    }


def json_bytes(records: list[dict[str, str]], verified_entries: int) -> bytes:
    _, measurement_source, measurement_provenance = rendered_measurements()
    supersessions = geometry_supersessions()
    payload = {
        "schema_version": 2,
        "baseline": BASELINE_REL.as_posix(),
        "baseline_verification": {
            "root_manifest": f"{BASELINE_REL}/SHA256SUMS",
            "root_manifest_sha256": BASELINE_MANIFEST_SHA256,
            "verified_entry_count": verified_entries,
        },
        "generation_mode": "deterministic and offline: frozen Phase 1 core plus declared hash-tied additive evidence",
        "embed_dependency_evidence": EMBED_DEPENDENCIES.relative_to(REPO).as_posix(),
        "rendered_measurement_evidence": measurement_source,
        "rendered_measurement_provenance": measurement_provenance,
        "post_baseline_geometry_supersessions_evidence": GEOMETRY_SUPERSESSIONS.relative_to(REPO).as_posix(),
        "post_baseline_geometry_supersessions": supersessions["supersessions"],
        "fields": FIELDS,
        "summary": summary_for(records),
        "records": records,
    }
    return (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=False) + "\n").encode("utf-8")


def readme_bytes(records: list[dict[str, str]], verified_entries: int) -> bytes:
    summary = summary_for(records)
    _, measurement_source, measurement_provenance = rendered_measurements()
    supersessions = geometry_supersessions()["supersessions"]
    types = summary["by_record_type"]
    source_unknown = sum(row["source_file"] == "unknown" for row in records)
    inferred_renditions = sum(
        row["rendition"] == "transformed" and "inferred" in row["notes"]
        for row in records
    )
    unreferenced_library = sum(
        row["page"] == "Cargo library" and row["referenced"] == "false"
        for row in records
    )
    embed_children = sum("iframe child/" in row["referenced_by"] for row in records)
    inline_assets = sum(row["rendition"] == "inline data URI" for row in records)
    rows = "\n".join(f"| {kind} | {count} |" for kind, count in types.items())
    text = f"""# Round 80 asset manifest

This directory is generated by `audit/scripts/generate-asset-manifest.py` from the immutable Phase 1 Round 80 evidence. The generator performs no network requests, never reads live ignored `Portfolio assets/` or `work/` files, and does not mutate Cargo, Figma, or the public site.

Run from the repository root:

```sh
python3 audit/scripts/generate-asset-manifest.py
python3 audit/scripts/generate-asset-manifest.py --check
```

## Coverage

- Total records: **{summary['record_count']}**
- Records with a known natural size: **{summary['known_natural_size']}**
- Records with a local or canonical source path: **{summary['known_local_source']}**
- Referenced records: **{summary['referenced'].get('true', 0)}**
- Unreferenced Cargo-library originals: **{unreferenced_library}**
- Active embed-child Freight records: **{embed_children}**
- SHA-addressed inline embed assets: **{inline_assets}**
- Frozen baseline entries hash-verified before generation: **{verified_entries}**

| Record type | Count |
|---|---:|
{rows}

The manifest includes every Cargo draft page-media entry, every Freight URL and image rendition referenced by the captured bodycopy, active iframe child assets, SHA-addressed inline embed images, current images/GIFs/videos/posters/embeds/PDFs, Cargo-delivered font binaries, the Google/system font contracts, and link records for internal navigation, email, and external destinations.

## Evidence order

1. Authenticated Cargo draft inventory for page-media identity and original dimensions.
2. Published bodycopy dependency table for current reference and every Freight rendition.
3. Freight probes for decoded dimensions, codec/pixel format, hashes, and reachability.
4. Frozen local source/media/embed manifests for showcase ownership, poster/fallback relationships, design-reference dimensions, and provenance.
5. `audit/assets/frozen-embed-dependencies.json` for children and inline assets extracted once from parent bundles whose hashes are frozen in Phase 1.
6. Frozen Cargo draft bodycopy for loading priority and link context.
7. Captured published HTML for Cargo-managed font URLs.

## Honest gaps retained for the browser harness

- Rendered measurement evidence: `{measurement_source}`, hash-bound to `{measurement_provenance.get('source_run_id', 'unknown run')}`. This is a complete **{measurement_provenance.get('target_name', 'unknown')}** visual matrix, not an authenticated Cargo-draft snapshot. It is authoritative for current local geometry; Cargo runtime and delivery parity remain separate evidence requirements.
- {inferred_renditions} transformed-rendition natural sizes are inferred from Cargo's requested width and the probed original ratio. The browser/network harness must confirm decoded output sizes.
- {source_unknown} records have no unambiguous local source-file match. A filename guess is not promoted to provenance.
- {summary['unknown_transparency']} records retain unknown transparency because Phase 1 did not decode an alpha-capable pixel format for them.
- The resolved Google Fonts binary for UnifrakturMaguntia was not present in the static capture and remains a provider record.
- Unreferenced Cargo-library rows are cleanup candidates only. This inventory does not authorize deletion.

CSV is the review/export format. JSON is the canonical machine-readable format and includes the same records plus aggregate counts.

## Additive post-baseline geometry

The frozen `design_*_1440_css_px` fields remain historical Round 80 facts. Current geometry that supersedes a frozen value is stored separately in `{GEOMETRY_SUPERSESSIONS.relative_to(REPO).as_posix()}` and embedded at the top level of the JSON manifest. There are **{len(supersessions)}** current supersessions; no frozen row is silently rewritten.

## Optional rendered-measurement artifact

The generator consumes `audit/assets/rendered-media-measurements.json` only when it exists. It must be the browser harness's complete `media-summary.json` payload and must have a SHA-256-bound provenance sidecar:

```json
{{
  "schemaVersion": "mms-audit/v1",
  "kind": "media-observation-summary",
  "media": [
    {{
      "mediaId": "eviive-01",
      "maxRenderedWidth": 1000,
      "maxRenderedHeight": 562.5,
      "maxDpr": 2,
      "maxRequiredPixelWidth": 2000,
      "maxRequiredPixelHeight": 1125
    }}
  ]
}}
```

The remaining harness fields may be retained. Media IDs must be unique and every maximum/requirement value must be a non-negative number. The generator applies measurements only to exact top-level `data-media-id` matches; it never assigns a parent iframe rectangle to an internal embed child. DPR coverage is computed from decoded delivery dimensions against the measured pixel requirement and remains unknown when decoded dimensions are unavailable.

## Integrity and confidence rules

- Generation stops unless `SHA256SUMS` itself matches `{BASELINE_MANIFEST_SHA256}` and all {verified_entries} listed evidence files match their recorded SHA-256.
- Embed-child generation also stops unless every evidence parent URL and bundle SHA-256 matches the frozen Phase 1 embed manifest.
- Source provenance is independent from delivery evidence: remote delivery can be high confidence while the producing local file remains unknown.
- A source/delivery SHA-256 match is `high`, an exact captured basename is `medium`, a normalized-name match is `low`, and no match is `unknown`.
- Unreferenced Cargo-library URLs are explicitly marked as derived from Cargo hash/name rather than observed. Referenced URLs and transforms are preserved verbatim from the frozen capture.
- The Montran booklet record preserves its complete operational iframe URL, including the required `?pdf=` query, while `canonical_base_url` records the query-free embed resource.
"""
    return text.encode("utf-8")


def outputs(records: list[dict[str, str]], verified_entries: int) -> dict[Path, bytes]:
    return {
        OUT_DIR / "asset-manifest.csv": csv_bytes(records),
        OUT_DIR / "asset-manifest.json": json_bytes(records, verified_entries),
        OUT_DIR / "README.md": readme_bytes(records, verified_entries),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if generated outputs differ from committed files")
    args = parser.parse_args()

    required = (
        BASELINE / "cargo-draft/media-inventory.tsv",
        BASELINE / "freight/asset-manifest.csv",
        BASELINE / "local/media-inventory.csv",
        BASELINE / "local/embed-manifest.json",
        BASELINE / "public/public-bodycopy-dependencies.tsv",
        BASELINE / "public/home.html",
        EMBED_DEPENDENCIES,
    )
    missing = [str(path.relative_to(REPO)) for path in required if not path.is_file()]
    if missing:
        raise SystemExit(f"missing Phase 1 inputs: {', '.join(missing)}")

    verified_entries = verify_frozen_baseline()
    records = build_records()
    generated = outputs(records, verified_entries)
    if args.check:
        drift = []
        for path, expected in generated.items():
            if not path.is_file() or path.read_bytes() != expected:
                drift.append(path.relative_to(REPO).as_posix())
        if drift:
            print("asset manifest drift: " + ", ".join(drift), file=sys.stderr)
            return 1
        print(f"asset manifest is current: {len(records)} records")
        return 0

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for path, content in generated.items():
        path.write_bytes(content)
    print(f"wrote {len(records)} records to {OUT_DIR.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
