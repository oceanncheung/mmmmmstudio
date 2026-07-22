#!/usr/bin/env python3
"""Fail closed when a Cargo payload drifts from the reviewed site manifest."""

from __future__ import annotations

import argparse
from collections import Counter
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parent
DEFAULT_MANIFEST = ROOT / "deployment-manifest.json"
APPROVED_BASELINE = "gold-2026-07-21-responsive-70"
VOID_TAGS = {
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
}
MEDIA_TAGS = {"img", "video", "iframe"}
SOURCE_TAGS = MEDIA_TAGS | {"source"}
SOURCE_ATTRIBUTES = (
    "src",
    "data-src",
    "srcset",
    "data-srcset",
    "data-poster",
    "data-mp4",
    "data-webm",
)


class ManifestError(RuntimeError):
    pass


class BodycopyAudit(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[dict[str, object]] = []
        self.roots: list[str] = []
        self.bands: list[str] = []
        self.media: list[dict[str, object]] = []
        self.errors: list[str] = []

    @staticmethod
    def _classes(attrs: dict[str, str | None]) -> set[str]:
        return set((attrs.get("class") or "").split())

    def _current(self, key: str):
        for node in reversed(self.stack):
            value = node.get(key)
            if value is not None:
                return value
        return None

    def handle_starttag(self, tag: str, attrs) -> None:
        tag = tag.lower()
        attr_map = dict(attrs)
        classes = self._classes(attr_map)

        if "mms" in classes:
            self.roots.append(attr_map.get("data-page") or "home")

        band = self._current("band")
        if attr_map.get("data-band"):
            band = attr_map["data-band"]
            self.bands.append(band)

        parent_media = self._current("media")
        media = parent_media
        media_id = attr_map.get("data-media-id")
        if media_id:
            if parent_media is not None:
                self.errors.append(f"nested data-media-id: {media_id}")
            media = {
                "id": media_id,
                "band": band,
                "wrapper_tag": tag,
                "kind": tag if tag in MEDIA_TAGS else None,
                "attrs": attr_map,
                "sources": [],
            }
            self.media.append(media)
        if media is not None and tag in MEDIA_TAGS:
            current_kind = media.get("kind")
            if current_kind is None:
                media["kind"] = tag
            elif current_kind != tag:
                self.errors.append(
                    f"media {media['id']} contains multiple media kinds: {current_kind}, {tag}"
                )

        if media is not None and tag in SOURCE_TAGS:
            if tag in {"video", "iframe"} and attr_map.get("src") is not None:
                self.errors.append(f"media {media['id']} has an unexpected live {tag} src")
            if tag == "video":
                poster = attr_map.get("poster")
                deferred_poster = attr_map.get("data-poster")
                if poster is not None and deferred_poster is not None and poster != deferred_poster:
                    self.errors.append(f"media {media['id']} poster does not match data-poster")
            source_attrs = {
                attribute: attr_map[attribute]
                for attribute in SOURCE_ATTRIBUTES
                if attr_map.get(attribute) is not None
            }
            if tag == "video" and attr_map.get("poster") is not None and attr_map.get("data-poster") is None:
                source_attrs["poster"] = attr_map["poster"]
            media["sources"].append({"tag": tag, "attrs": source_attrs})

        if tag not in VOID_TAGS:
            self.stack.append({"tag": tag, "band": band, "media": media})

    def handle_startendtag(self, tag: str, attrs) -> None:
        self.handle_starttag(tag, attrs)
        if tag.lower() not in VOID_TAGS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        matched = False
        skipped: list[str] = []
        while self.stack:
            node = self.stack.pop()
            if node["tag"] == tag:
                matched = True
                break
            skipped.append(str(node["tag"]))
        if not matched:
            self.errors.append(f"unmatched closing tag: {tag}")
        elif skipped:
            self.errors.append(f"misnested closing tag {tag}; unclosed before it: {skipped}")


def load_manifest(path: Path) -> dict:
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ManifestError(f"cannot read manifest {path}: {error}") from error

    if manifest.get("schema_version") != 1:
        raise ManifestError("deployment manifest schema_version must be 1")
    if not manifest.get("site"):
        raise ManifestError("deployment manifest must name its site")
    if manifest.get("approved_baseline") != APPROVED_BASELINE:
        raise ManifestError(
            "deployment manifest approved_baseline must be "
            f"{APPROVED_BASELINE!r}; found {manifest.get('approved_baseline')!r}"
        )
    if not isinstance(manifest.get("pages"), dict) or not manifest["pages"]:
        raise ManifestError("deployment manifest must define pages")
    return manifest


def require_equal(label: str, actual, expected) -> None:
    if actual != expected:
        raise ManifestError(f"{label} drifted: expected {expected!r}, found {actual!r}")


def validate_manifest_consistency(manifest: dict) -> None:
    for page, spec in manifest["pages"].items():
        media_ids = spec.get("media_ids")
        if not isinstance(media_ids, list):
            raise ManifestError(f"{page}: media_ids must be a list")
        if len(media_ids) != len(set(media_ids)):
            raise ManifestError(f"{page}: manifest contains duplicate media IDs")

        bands = spec.get("bands", [])
        if len(bands) != len(set(bands)):
            raise ManifestError(f"{page}: manifest contains duplicate bands")
        band_counts = spec.get("media_counts_by_band", {})
        if list(band_counts) != bands:
            raise ManifestError(f"{page}: media_counts_by_band order must match bands")
        if bands and sum(band_counts.values()) != len(media_ids):
            raise ManifestError(f"{page}: band counts must account for the complete media inventory")

        source_hashes = spec.get("media_source_hashes")
        if not isinstance(source_hashes, dict):
            raise ManifestError(f"{page}: media_source_hashes must be an object")
        if list(source_hashes) != media_ids:
            raise ManifestError(f"{page}: media_source_hashes order must match media_ids")
        if any(not re.fullmatch(r"[0-9a-f]{64}", value or "") for value in source_hashes.values()):
            raise ManifestError(f"{page}: every media source hash must be lowercase SHA-256")

        embed_ids = [item.get("media_id") for item in spec.get("embeds", [])]
        if len(embed_ids) != len(set(embed_ids)):
            raise ManifestError(f"{page}: manifest contains duplicate embed IDs")
        if any(media_id not in media_ids for media_id in embed_ids):
            raise ManifestError(f"{page}: every embed must belong to media_ids")
        geometry_ids = [item.get("media_id") for item in spec.get("protected_geometry", [])]
        if any(media_id not in media_ids for media_id in geometry_ids):
            raise ManifestError(f"{page}: every protected geometry item must belong to media_ids")


def custom_property(style: str, name: str) -> float | None:
    match = re.search(
        rf"(?:^|;)\s*{re.escape(name)}\s*:\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?=\s*(?:;|$))",
        style,
    )
    return float(match.group(1)) if match else None


def media_source_hash(record: dict[str, object]) -> str:
    payload = {
        "kind": record["kind"],
        "sources": record["sources"],
    }
    serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def validate_bodycopy(source: str, expected_page: str, manifest: dict) -> None:
    spec = manifest["pages"].get(expected_page)
    if spec is None:
        raise ManifestError(f"unknown deployment target page: {expected_page}")

    audit = BodycopyAudit()
    audit.feed(source)
    audit.close()
    if audit.stack:
        open_tags = [str(node["tag"]) for node in audit.stack[-8:]]
        audit.errors.append(f"unclosed tags at end of payload: {open_tags}")
    if audit.errors:
        raise ManifestError("; ".join(audit.errors))

    require_equal(f"{expected_page}: MM.S root page", audit.roots, [expected_page])

    runtime_markers = re.findall(r"responsive-[0-9]+", source)
    expected_runtime = spec["runtime_marker"]
    expected_occurrences = spec.get("runtime_marker_occurrences", 2)
    require_equal(
        f"{expected_page}: runtime markers",
        runtime_markers,
        [expected_runtime] * expected_occurrences,
    )

    require_equal(f"{expected_page}: band order", audit.bands, spec.get("bands", []))

    actual_ids = [item["id"] for item in audit.media]
    if len(actual_ids) != len(set(actual_ids)):
        duplicates = sorted(media_id for media_id, count in Counter(actual_ids).items() if count > 1)
        raise ManifestError(f"{expected_page}: duplicate media IDs: {duplicates}")
    require_equal(f"{expected_page}: ordered media IDs", actual_ids, spec.get("media_ids", []))

    actual_band_counts = Counter(item["band"] for item in audit.media if item["band"] is not None)
    require_equal(
        f"{expected_page}: media counts by band",
        dict(actual_band_counts),
        spec.get("media_counts_by_band", {}),
    )

    unclassified = [item["id"] for item in audit.media if item["kind"] not in MEDIA_TAGS]
    if unclassified:
        raise ManifestError(f"{expected_page}: unclassified media wrappers: {unclassified}")
    actual_kind_counts = dict(Counter(item["kind"] for item in audit.media))
    require_equal(
        f"{expected_page}: media kind counts",
        actual_kind_counts,
        spec.get("media_kind_counts", {}),
    )

    media_by_id = {item["id"]: item for item in audit.media}
    expected_source_hashes = spec.get("media_source_hashes")
    if not isinstance(expected_source_hashes, dict):
        raise ManifestError(f"{expected_page}: manifest must define media_source_hashes")
    require_equal(
        f"{expected_page}: media source hash order",
        list(expected_source_hashes),
        actual_ids,
    )
    actual_source_hashes = {
        media_id: media_source_hash(media_by_id[media_id])
        for media_id in actual_ids
    }
    require_equal(
        f"{expected_page}: media source identities",
        actual_source_hashes,
        expected_source_hashes,
    )
    for embed in spec.get("embeds", []):
        media_id = embed["media_id"]
        record = media_by_id.get(media_id)
        if record is None:
            raise ManifestError(f"{expected_page}: missing embed {media_id}")
        require_equal(f"{expected_page}: {media_id} element kind", record["kind"], "iframe")
        attrs = record["attrs"]
        for attribute, expected_value in embed.get("attributes", {}).items():
            actual_value = record["band"] if attribute == "data-band" else attrs.get(attribute)
            require_equal(
                f"{expected_page}: {media_id} {embed['kind']} v{embed['version']} {attribute}",
                actual_value,
                expected_value,
            )

    for geometry in spec.get("protected_geometry", []):
        media_id = geometry["media_id"]
        record = media_by_id.get(media_id)
        if record is None:
            raise ManifestError(f"{expected_page}: missing protected geometry item {media_id}")
        style = record["attrs"].get("style") or ""
        width = custom_property(style, "--asset-w")
        height = custom_property(style, "--asset-h")
        require_equal(f"{expected_page}: {media_id} --asset-w", width, float(geometry["asset_w"]))
        require_equal(f"{expected_page}: {media_id} --asset-h", height, float(geometry["asset_h"]))


def validate_head(source: str, manifest: dict) -> None:
    expected = manifest.get("head", {}).get("edge_marker")
    if expected is None:
        raise ManifestError("deployment manifest must define head.edge_marker")
    markers = re.findall(r'data-mms-ios-edge-head=["\']([^"\']+)["\']', source)
    require_equal("site head edge marker", markers, [str(expected)])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("bodycopy", "head"))
    parser.add_argument("input", type=Path)
    parser.add_argument("expected_page", nargs="?", choices=("home", "who", "write"))
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path(os.environ.get("MMS_DEPLOYMENT_MANIFEST", DEFAULT_MANIFEST)),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        manifest = load_manifest(args.manifest)
        validate_manifest_consistency(manifest)
        source = args.input.read_text(encoding="utf-8")
        if args.mode == "head":
            validate_head(source, manifest)
        else:
            if args.expected_page is None:
                raise ManifestError("bodycopy validation requires expected_page")
            validate_bodycopy(source, args.expected_page, manifest)
    except (OSError, UnicodeError, ManifestError) as error:
        print(f"ERROR: deployment manifest: {error}", file=sys.stderr)
        return 1

    target = args.expected_page if args.mode == "bodycopy" else "head"
    print(
        f"OK: deployment manifest {manifest['site']} / {manifest['approved_baseline']} / {target}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
