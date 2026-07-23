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
SOURCE_PURITY_KEYS = {
    "live_video_src",
    "live_iframe_src",
    "live_source_src",
    "native_media_poster",
    "data_mms_loaded",
    "data_motion_ready",
    "data_mms_source",
    "hidden_rivers",
    "native_rivers",
    "invalid_river_scrollbar_semantics",
    "generated_scrubbers",
    "deferred_data_src",
    "eager_image_ids",
    "image_loading",
    "iframe_loading",
    "video_preload",
}
RIVER_SCROLLBAR_ARIA = {
    "aria-orientation",
    "aria-valuemin",
    "aria-valuemax",
    "aria-valuenow",
    "aria-valuetext",
}
IMAGE_LOADING_KEYS = {"eager", "lazy", "other"}
IFRAME_LOADING_KEYS = {"eager", "lazy", "other"}
VIDEO_PRELOAD_KEYS = {"none", "auto", "metadata", "other"}


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
        self.source_purity = {
            "live_video_src": 0,
            "live_iframe_src": 0,
            "live_source_src": 0,
            "native_media_poster": 0,
            "data_mms_loaded": 0,
            "data_motion_ready": 0,
            "data_mms_source": 0,
            "hidden_rivers": 0,
            "native_rivers": 0,
            "invalid_river_scrollbar_semantics": 0,
            "generated_scrubbers": 0,
            "deferred_data_src": 0,
            "eager_image_ids": [],
            "image_loading": {"eager": 0, "lazy": 0, "other": 0},
            "iframe_loading": {"eager": 0, "lazy": 0, "other": 0},
            "video_preload": {"none": 0, "auto": 0, "metadata": 0, "other": 0},
        }

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
        attribute_names = [name for name, _ in attrs]
        duplicate_attributes = sorted(
            name for name, count in Counter(attribute_names).items() if count > 1
        )
        if duplicate_attributes:
            self.errors.append(
                f"{tag} has duplicate attributes: {duplicate_attributes}"
            )
        attr_map = dict(attrs)
        classes = self._classes(attr_map)

        if tag == "video" and "src" in attr_map:
            self.source_purity["live_video_src"] += 1
        if tag == "iframe" and "src" in attr_map:
            self.source_purity["live_iframe_src"] += 1
        if tag == "source" and "src" in attr_map:
            self.source_purity["live_source_src"] += 1
        if tag in {"video", "iframe"} and "poster" in attr_map:
            self.source_purity["native_media_poster"] += 1
        if "data-mms-loaded" in attr_map:
            self.source_purity["data_mms_loaded"] += 1
        if "data-motion-ready" in attr_map:
            self.source_purity["data_motion_ready"] += 1
        if "data-mms-source" in attr_map:
            self.source_purity["data_mms_source"] += 1
        if "data-src" in attr_map:
            self.source_purity["deferred_data_src"] += 1
        if tag == "img":
            loading = attr_map.get("loading")
            loading_key = loading if loading in {"eager", "lazy"} else "other"
            self.source_purity["image_loading"][loading_key] += 1
        if tag == "iframe":
            loading = attr_map.get("loading")
            loading_key = loading if loading in {"eager", "lazy"} else "other"
            self.source_purity["iframe_loading"][loading_key] += 1
        if tag == "video":
            preload = attr_map.get("preload")
            preload_key = preload if preload in {"none", "auto", "metadata"} else "other"
            self.source_purity["video_preload"][preload_key] += 1
        if "mms-river" in classes:
            self.source_purity["native_rivers"] += 1
            style = re.sub(r"\s+", "", attr_map.get("style") or "").lower()
            if "hidden" in attr_map or re.search(r"(?:^|;)display:none(?:;|$)", style):
                self.source_purity["hidden_rivers"] += 1
            role_tokens = set((attr_map.get("role") or "").lower().split())
            if "scrollbar" in role_tokens or any(
                attribute in attr_map for attribute in RIVER_SCROLLBAR_ARIA
            ):
                self.source_purity["invalid_river_scrollbar_semantics"] += 1
        if "mms-river-scrubber" in classes:
            self.source_purity["generated_scrubbers"] += 1

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
        if tag == "img" and attr_map.get("loading") == "eager":
            eager_media_id = attr_map.get("data-media-id") or (
                media.get("id") if media is not None else None
            )
            if eager_media_id is None:
                self.errors.append("eager image has no data-media-id owner")
            else:
                self.source_purity["eager_image_ids"].append(eager_media_id)

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

    if manifest.get("schema_version") != 2:
        raise ManifestError("deployment manifest schema_version must be 2")
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
        source_purity = spec.get("source_purity")
        if not isinstance(source_purity, dict):
            raise ManifestError(f"{page}: source_purity must be an object")
        if set(source_purity) != SOURCE_PURITY_KEYS:
            raise ManifestError(
                f"{page}: source_purity keys must be {sorted(SOURCE_PURITY_KEYS)}"
            )
        loading_contracts = {
            "image_loading": IMAGE_LOADING_KEYS,
            "iframe_loading": IFRAME_LOADING_KEYS,
            "video_preload": VIDEO_PRELOAD_KEYS,
        }
        for contract, required_keys in loading_contracts.items():
            values = source_purity.get(contract)
            if not isinstance(values, dict) or set(values) != required_keys:
                raise ManifestError(
                    f"{page}: source_purity.{contract} keys must be {sorted(required_keys)}"
                )
            if any(not isinstance(value, int) or value < 0 for value in values.values()):
                raise ManifestError(
                    f"{page}: source_purity.{contract} counts must be non-negative integers"
                )
        eager_image_ids = source_purity.get("eager_image_ids")
        if not isinstance(eager_image_ids, list) or any(
            not isinstance(media_id, str) or not media_id for media_id in eager_image_ids
        ):
            raise ManifestError(f"{page}: source_purity.eager_image_ids must be a string list")
        if len(eager_image_ids) != len(set(eager_image_ids)):
            raise ManifestError(f"{page}: source_purity.eager_image_ids contains duplicates")
        scalar_purity = {
            key: value
            for key, value in source_purity.items()
            if key not in {*loading_contracts, "eager_image_ids"}
        }
        if any(not isinstance(value, int) or value < 0 for value in scalar_purity.values()):
            raise ManifestError(f"{page}: source_purity counts must be non-negative integers")
        expected_image_count = spec.get("media_kind_counts", {}).get("img", 0)
        if sum(source_purity["image_loading"].values()) != expected_image_count:
            raise ManifestError(
                f"{page}: source_purity.image_loading must account for every image"
            )
        expected_iframe_count = spec.get("media_kind_counts", {}).get("iframe", 0)
        if sum(source_purity["iframe_loading"].values()) != expected_iframe_count:
            raise ManifestError(
                f"{page}: source_purity.iframe_loading must account for every iframe"
            )
        expected_video_count = spec.get("media_kind_counts", {}).get("video", 0)
        if sum(source_purity["video_preload"].values()) != expected_video_count:
            raise ManifestError(
                f"{page}: source_purity.video_preload must account for every video"
            )

        media_ids = spec.get("media_ids")
        if not isinstance(media_ids, list):
            raise ManifestError(f"{page}: media_ids must be a list")
        if len(media_ids) != len(set(media_ids)):
            raise ManifestError(f"{page}: manifest contains duplicate media IDs")
        if any(media_id not in media_ids for media_id in eager_image_ids):
            raise ManifestError(
                f"{page}: every eager_image_id must belong to the reviewed media IDs"
            )

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

    require_equal(
        f"{expected_page}: saved-source purity",
        audit.source_purity,
        spec["source_purity"],
    )

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

    language = manifest.get("head", {}).get("document_language")
    if not isinstance(language, str) or not re.fullmatch(r"[a-z]{2}(?:-[A-Z]{2})?", language):
        raise ManifestError("deployment manifest must define a valid head.document_language")
    language_markers = re.findall(
        r'data-mms-document-language=["\']([^"\']+)["\']', source
    )
    require_equal("site head document-language marker", language_markers, [language])
    assignment = f"document.documentElement.setAttribute('lang', '{language}');"
    require_equal("site head document-language assignment count", source.count(assignment), 1)
    assignment_offset = source.find(assignment)
    route_gate_offset = source.find("var path = window.location.pathname")
    if route_gate_offset < 0 or assignment_offset > route_gate_offset:
        raise ManifestError("site head document-language assignment must precede the route gate")


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
