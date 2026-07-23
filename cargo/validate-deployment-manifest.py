#!/usr/bin/env python3
"""Fail closed when a Cargo payload drifts from the reviewed site manifest."""

from __future__ import annotations

import argparse
from collections import Counter
from copy import deepcopy
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
    "primary_navigation_candidates",
    "expanded_primary_navigations",
    "compact_primary_navigations",
    "invalid_primary_navigation_candidates",
    "legacy_complementary_rails",
    "complementary_landmarks",
    "navigation_landmarks",
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
CONTENT_SEMANTICS_KEYS = {
    "decorative_native_media",
    "interactive_embeds",
    "named_project_figures",
    "source_structure",
}
DECORATIVE_NATIVE_MEDIA_KEYS = {"count", "kind_counts", "media_ids"}
INTERACTIVE_EMBEDS_KEYS = {"count", "items"}
INTERACTIVE_EMBED_ITEM_KEYS = {"media_id", "title"}
NAMED_PROJECT_FIGURES_KEYS = {"count", "items"}
NAMED_PROJECT_FIGURE_ITEM_KEYS = {"band", "label"}
SOURCE_STRUCTURE_KEYS = {
    "figure_count",
    "heading_counts",
    "role_heading_count",
    "unlabeled_nonfigure_bands",
}
HEADING_TAGS = tuple(f"h{level}" for level in range(1, 7))
UNLABELED_NONFIGURE_BAND_ITEM_KEYS = {"band", "tag", "figure_count"}
ACCESSIBLE_NAME_ATTRIBUTES = {"aria-label", "aria-labelledby", "title"}
DECORATIVE_OWNER_ATTRIBUTES = {
    "data-a11y-policy": "decorative",
    "aria-hidden": "true",
}
INTERACTIVE_OWNER_ATTRIBUTES = {"data-a11y-policy": "interactive"}
INTERACTIVE_NATIVE_TAGS = {
    "button",
    "input",
    "select",
    "summary",
    "textarea",
}
INTERACTIVE_ROLES = {
    "button",
    "checkbox",
    "combobox",
    "link",
    "listbox",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "radio",
    "slider",
    "spinbutton",
    "switch",
    "tab",
    "textbox",
    "treeitem",
}


def decorative_focusability_reasons(
    tag: str,
    attrs: dict[str, str | None],
) -> list[str]:
    """Return attributes/semantics that can expose an aria-hidden media subtree."""

    reasons: list[str] = []
    if "tabindex" in attrs:
        reasons.append("tabindex")
    if (
        "contenteditable" in attrs
        and (attrs.get("contenteditable") or "").strip().lower() != "false"
    ):
        reasons.append("contenteditable")
    if "href" in attrs:
        reasons.append("href")
    if tag in {"audio", "video"} and "controls" in attrs:
        reasons.append("controls")
    if tag in INTERACTIVE_NATIVE_TAGS:
        reasons.append(f"native-{tag}")
    role_tokens = set((attrs.get("role") or "").strip().lower().split())
    interactive_roles = sorted(role_tokens & INTERACTIVE_ROLES)
    if interactive_roles:
        reasons.append(f"role:{','.join(interactive_roles)}")
    return reasons


class ManifestError(RuntimeError):
    pass


class HeadStartTagAudit(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.first_tag: str | None = None
        self.first_attributes: list[tuple[str, str | None]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self.first_tag is None:
            self.first_tag = tag.lower()
            self.first_attributes = [(name.lower(), value) for name, value in attrs]


class BodycopyAudit(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[dict[str, object]] = []
        self.roots: list[str] = []
        self.bands: list[str] = []
        self.band_records: list[dict[str, object]] = []
        self.figure_counts_by_band: Counter[str] = Counter()
        self.figure_count = 0
        self.heading_counts = {tag: 0 for tag in HEADING_TAGS}
        self.role_heading_count = 0
        self.media: list[dict[str, object]] = []
        self.project_figures: list[dict[str, object]] = []
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
            "primary_navigation_candidates": 0,
            "expanded_primary_navigations": 0,
            "compact_primary_navigations": 0,
            "invalid_primary_navigation_candidates": 0,
            "legacy_complementary_rails": 0,
            "complementary_landmarks": 0,
            "navigation_landmarks": 0,
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
        role_tokens = set((attr_map.get("role") or "").lower().split())
        normalized_style = re.sub(r"\s+", "", attr_map.get("style") or "").lower()
        ancestor_suppresses_navigation = any(
            bool(node.get("navigation_suppressed")) for node in self.stack
        )
        element_suppresses_navigation = (
            tag in {"template", "noscript"}
            or (tag == "dialog" and "open" not in attr_map)
            or (tag == "details" and "open" not in attr_map)
            or "hidden" in attr_map
            or "inert" in attr_map
            or "popover" in attr_map
            or (attr_map.get("aria-hidden") or "").strip().lower() == "true"
            or re.search(r"(?:^|;)display:none(?:!important)?(?:;|$)", normalized_style) is not None
            or re.search(r"(?:^|;)visibility:(?:hidden|collapse)(?:!important)?(?:;|$)", normalized_style) is not None
            or re.search(r"(?:^|;)content-visibility:hidden(?:!important)?(?:;|$)", normalized_style) is not None
        )
        navigation_suppressed = (
            ancestor_suppresses_navigation or element_suppresses_navigation
        )

        if tag == "aside" or "complementary" in role_tokens:
            self.source_purity["complementary_landmarks"] += 1
        if tag == "nav" or "navigation" in role_tokens:
            self.source_purity["navigation_landmarks"] += 1

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
            if "scrollbar" in role_tokens or any(
                attribute in attr_map for attribute in RIVER_SCROLLBAR_ARIA
            ):
                self.source_purity["invalid_river_scrollbar_semantics"] += 1
        if "mms-river-scrubber" in classes:
            self.source_purity["generated_scrubbers"] += 1

        is_expanded_navigation = "mms-rail" in classes
        is_compact_navigation = "mms-mlinks" in classes
        if is_expanded_navigation or is_compact_navigation:
            self.source_purity["primary_navigation_candidates"] += 1
            parent = self.stack[-1] if self.stack else {}
            parent_classes = parent.get("classes") or set()
            parent_is_expected = (
                parent.get("tag") == "div"
                and (
                    (is_expanded_navigation and "mms" in parent_classes)
                    or (is_compact_navigation and "mms-intro-wrap" in parent_classes)
                )
            )
            candidate_is_valid = (
                tag == "nav"
                and attr_map.get("aria-label") == "Primary"
                and is_expanded_navigation != is_compact_navigation
                and classes in ({"mms-rail"}, {"mms-mlinks"})
                and set(attr_map) == {"aria-label", "class"}
                and parent_is_expected
                and not navigation_suppressed
            )
            if tag == "aside" and is_expanded_navigation:
                self.source_purity["legacy_complementary_rails"] += 1
            if candidate_is_valid and is_expanded_navigation:
                self.source_purity["expanded_primary_navigations"] += 1
            elif candidate_is_valid and is_compact_navigation:
                self.source_purity["compact_primary_navigations"] += 1
            else:
                self.source_purity["invalid_primary_navigation_candidates"] += 1

        if "mms" in classes:
            self.roots.append(attr_map.get("data-page") or "home")

        band = self._current("band")
        if attr_map.get("data-band"):
            band = attr_map["data-band"]
            self.bands.append(band)
            self.band_records.append({
                "tag": tag,
                "band": band,
                "attrs": attr_map,
            })

        if tag in HEADING_TAGS:
            self.heading_counts[tag] += 1
        if "heading" in role_tokens:
            self.role_heading_count += 1
        if tag == "figure" and band is not None:
            self.figure_counts_by_band[band] += 1
        if tag == "figure":
            self.figure_count += 1

        if "mms-desc" in classes:
            self.project_figures.append({
                "tag": tag,
                "band": band,
                "attrs": attr_map,
                "suppressed": navigation_suppressed,
            })

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
                "suppressed": navigation_suppressed,
                "elements": [],
                "sources": [],
                "semantic_nodes": [],
            }
            self.media.append(media)
        if media is not None:
            focusability_reasons = decorative_focusability_reasons(tag, attr_map)
            if focusability_reasons:
                media["semantic_nodes"].append({
                    "tag": tag,
                    "attrs": attr_map,
                    "reasons": focusability_reasons,
                    "owner": parent_media is None,
                })
        if media is not None and tag in MEDIA_TAGS:
            media["elements"].append({
                "tag": tag,
                "attrs": attr_map,
                "suppressed": navigation_suppressed,
            })
            if len(media["elements"]) > 1:
                self.errors.append(
                    f"media {media['id']} contains multiple media elements"
                )
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
            self.stack.append({
                "tag": tag,
                "band": band,
                "media": media,
                "classes": classes,
                "navigation_suppressed": navigation_suppressed,
            })

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


def require_object_keys(label: str, value, expected_keys: set[str]) -> dict:
    if not isinstance(value, dict):
        raise ManifestError(f"{label} must be an object")
    if set(value) != expected_keys:
        raise ManifestError(f"{label} keys must be {sorted(expected_keys)}")
    return value


def require_counted_list(label: str, contract: dict, item_key: str) -> list:
    count = contract.get("count")
    items = contract.get(item_key)
    if not isinstance(count, int) or isinstance(count, bool) or count < 0:
        raise ManifestError(f"{label}.count must be a non-negative integer")
    if not isinstance(items, list):
        raise ManifestError(f"{label}.{item_key} must be a list")
    if count != len(items):
        raise ManifestError(
            f"{label}.count must equal the {item_key} inventory length"
        )
    return items


def validate_content_semantics_manifest(page: str, spec: dict) -> None:
    semantics = require_object_keys(
        f"{page}: content_semantics",
        spec.get("content_semantics"),
        CONTENT_SEMANTICS_KEYS,
    )
    decorative = require_object_keys(
        f"{page}: content_semantics.decorative_native_media",
        semantics["decorative_native_media"],
        DECORATIVE_NATIVE_MEDIA_KEYS,
    )
    decorative_ids = require_counted_list(
        f"{page}: content_semantics.decorative_native_media",
        decorative,
        "media_ids",
    )
    if any(not isinstance(media_id, str) or not media_id for media_id in decorative_ids):
        raise ManifestError(
            f"{page}: decorative native media IDs must be non-empty strings"
        )
    if len(decorative_ids) != len(set(decorative_ids)):
        raise ManifestError(
            f"{page}: content_semantics decorative native media IDs contain duplicates"
        )
    decorative_kind_counts = decorative.get("kind_counts")
    if not isinstance(decorative_kind_counts, dict):
        raise ManifestError(
            f"{page}: content_semantics decorative kind_counts must be an object"
        )
    if any(kind not in {"img", "video"} for kind in decorative_kind_counts):
        raise ManifestError(
            f"{page}: decorative native media kinds may only be img or video"
        )
    if any(
        not isinstance(count, int) or isinstance(count, bool) or count <= 0
        for count in decorative_kind_counts.values()
    ):
        raise ManifestError(
            f"{page}: decorative native media kind counts must be positive integers"
        )
    if sum(decorative_kind_counts.values()) != decorative["count"]:
        raise ManifestError(
            f"{page}: decorative native media kind counts must equal its inventory count"
        )

    interactive = require_object_keys(
        f"{page}: content_semantics.interactive_embeds",
        semantics["interactive_embeds"],
        INTERACTIVE_EMBEDS_KEYS,
    )
    interactive_items = require_counted_list(
        f"{page}: content_semantics.interactive_embeds",
        interactive,
        "items",
    )
    interactive_ids: list[str] = []
    for index, item in enumerate(interactive_items):
        item = require_object_keys(
            f"{page}: content_semantics.interactive_embeds.items[{index}]",
            item,
            INTERACTIVE_EMBED_ITEM_KEYS,
        )
        media_id = item["media_id"]
        title = item["title"]
        if not isinstance(media_id, str) or not media_id:
            raise ManifestError(
                f"{page}: interactive embed media IDs must be non-empty strings"
            )
        if not isinstance(title, str) or not title.strip():
            raise ManifestError(
                f"{page}: interactive embed titles must be non-empty strings"
            )
        interactive_ids.append(media_id)
    if len(interactive_ids) != len(set(interactive_ids)):
        raise ManifestError(
            f"{page}: content_semantics interactive embed IDs contain duplicates"
        )

    figures = require_object_keys(
        f"{page}: content_semantics.named_project_figures",
        semantics["named_project_figures"],
        NAMED_PROJECT_FIGURES_KEYS,
    )
    figure_items = require_counted_list(
        f"{page}: content_semantics.named_project_figures",
        figures,
        "items",
    )
    figure_bands: list[str] = []
    figure_labels: list[str] = []
    for index, item in enumerate(figure_items):
        item = require_object_keys(
            f"{page}: content_semantics.named_project_figures.items[{index}]",
            item,
            NAMED_PROJECT_FIGURE_ITEM_KEYS,
        )
        band = item["band"]
        label = item["label"]
        if not isinstance(band, str) or not band:
            raise ManifestError(
                f"{page}: named project figure bands must be non-empty strings"
            )
        if not isinstance(label, str) or not label.strip():
            raise ManifestError(
                f"{page}: named project figure labels must be non-empty strings"
            )
        figure_bands.append(band)
        figure_labels.append(label)
    if len(figure_bands) != len(set(figure_bands)):
        raise ManifestError(
            f"{page}: content_semantics named project figure bands contain duplicates"
        )
    if len(figure_labels) != len(set(figure_labels)):
        raise ManifestError(
            f"{page}: content_semantics named project figure labels contain duplicates"
        )

    source_structure = require_object_keys(
        f"{page}: content_semantics.source_structure",
        semantics["source_structure"],
        SOURCE_STRUCTURE_KEYS,
    )
    heading_counts = require_object_keys(
        f"{page}: content_semantics.source_structure.heading_counts",
        source_structure["heading_counts"],
        set(HEADING_TAGS),
    )
    if any(
        not isinstance(count, int) or isinstance(count, bool) or count < 0
        for count in heading_counts.values()
    ):
        raise ManifestError(
            f"{page}: content semantics heading counts must be non-negative integers"
        )
    role_heading_count = source_structure["role_heading_count"]
    if (
        not isinstance(role_heading_count, int)
        or isinstance(role_heading_count, bool)
        or role_heading_count < 0
    ):
        raise ManifestError(
            f"{page}: content semantics role_heading_count must be a "
            "non-negative integer"
        )
    figure_count = source_structure["figure_count"]
    if (
        not isinstance(figure_count, int)
        or isinstance(figure_count, bool)
        or figure_count < 0
    ):
        raise ManifestError(
            f"{page}: content semantics figure_count must be a non-negative integer"
        )
    if figure_count < figures["count"]:
        raise ManifestError(
            f"{page}: content semantics figure_count cannot be smaller than "
            "named_project_figures.count"
        )
    unlabeled_bands = source_structure["unlabeled_nonfigure_bands"]
    if not isinstance(unlabeled_bands, list):
        raise ManifestError(
            f"{page}: content semantics unlabeled_nonfigure_bands must be a list"
        )
    unlabeled_band_names: list[str] = []
    for index, item in enumerate(unlabeled_bands):
        item = require_object_keys(
            f"{page}: content_semantics.source_structure."
            f"unlabeled_nonfigure_bands[{index}]",
            item,
            UNLABELED_NONFIGURE_BAND_ITEM_KEYS,
        )
        band = item["band"]
        tag = item["tag"]
        figure_count = item["figure_count"]
        if not isinstance(band, str) or not band:
            raise ManifestError(
                f"{page}: unlabeled nonfigure band names must be non-empty strings"
            )
        if not isinstance(tag, str) or not re.fullmatch(r"[a-z][a-z0-9:-]*", tag):
            raise ManifestError(
                f"{page}: unlabeled nonfigure band tags must be lowercase HTML names"
            )
        if tag == "figure":
            raise ManifestError(
                f"{page}: unlabeled nonfigure band tag must not be figure"
            )
        if (
            not isinstance(figure_count, int)
            or isinstance(figure_count, bool)
            or figure_count != 0
        ):
            raise ManifestError(
                f"{page}: unlabeled nonfigure band figure_count must be exactly zero"
            )
        unlabeled_band_names.append(band)
    if len(unlabeled_band_names) != len(set(unlabeled_band_names)):
        raise ManifestError(
            f"{page}: content semantics unlabeled nonfigure bands contain duplicates"
        )
    if any(band not in spec.get("bands", []) for band in unlabeled_band_names):
        raise ManifestError(
            f"{page}: every unlabeled nonfigure band must belong to bands"
        )

    media_ids = spec.get("media_ids", [])
    if any(media_id not in media_ids for media_id in decorative_ids + interactive_ids):
        raise ManifestError(
            f"{page}: every content-semantic media item must belong to media_ids"
        )
    if set(decorative_ids) & set(interactive_ids):
        raise ManifestError(
            f"{page}: decorative native media and interactive embeds must be disjoint"
        )
    semantic_media_ids = set(decorative_ids) | set(interactive_ids)
    if semantic_media_ids != set(media_ids):
        raise ManifestError(
            f"{page}: content_semantics must classify the complete media inventory"
        )
    if decorative_ids != [
        media_id for media_id in media_ids if media_id not in set(interactive_ids)
    ]:
        raise ManifestError(
            f"{page}: decorative native media order must follow media_ids"
        )
    embed_ids = [item.get("media_id") for item in spec.get("embeds", [])]
    if interactive_ids != embed_ids:
        raise ManifestError(
            f"{page}: content_semantics interactive embeds must match embeds in order"
        )
    expected_native_kind_counts = {
        kind: count
        for kind, count in spec.get("media_kind_counts", {}).items()
        if kind in {"img", "video"} and count
    }
    if decorative_kind_counts != expected_native_kind_counts:
        raise ManifestError(
            f"{page}: decorative native media kind_counts must match media_kind_counts"
        )
    bands = spec.get("bands", [])
    if any(band not in bands for band in figure_bands):
        raise ManifestError(
            f"{page}: every named project figure must belong to a reviewed band"
        )


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
        validate_content_semantics_manifest(page, spec)


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


def require_semantic_attributes(
    label: str,
    attrs: dict[str, str | None],
    required: dict[str, str],
) -> None:
    for attribute, expected_value in required.items():
        require_equal(
            f"{label} {attribute}",
            attrs.get(attribute),
            expected_value,
        )


def reject_accessible_name_attributes(
    label: str,
    attrs: dict[str, str | None],
) -> None:
    present = sorted(ACCESSIBLE_NAME_ATTRIBUTES & set(attrs))
    if present:
        raise ManifestError(
            f"{label} content semantics forbid accessible-name attributes: {present}"
        )


def validate_bodycopy_content_semantics(
    expected_page: str,
    spec: dict,
    audit: BodycopyAudit,
    media_by_id: dict[str, dict[str, object]],
) -> None:
    semantics = spec["content_semantics"]
    decorative = semantics["decorative_native_media"]
    for media_id in decorative["media_ids"]:
        record = media_by_id[media_id]
        label = f"{expected_page}: content semantics decorative media {media_id}"
        if record["kind"] not in {"img", "video"}:
            raise ManifestError(
                f"{label} must be native img or video, found {record['kind']!r}"
            )
        owner_attrs = record["attrs"]
        require_semantic_attributes(
            f"{label} owner",
            owner_attrs,
            DECORATIVE_OWNER_ATTRIBUTES,
        )
        reject_accessible_name_attributes(f"{label} owner", owner_attrs)
        if not record["suppressed"]:
            raise ManifestError(f"{label} owner must suppress its decorative content")
        for node in record["semantic_nodes"]:
            location = "owner" if node["owner"] else f"descendant {node['tag']}"
            raise ManifestError(
                f"{label} {location} must not be focusable or interactive; "
                f"found {node['reasons']}"
            )
        elements = record["elements"]
        if len(elements) != 1:
            raise ManifestError(f"{label} must contain exactly one media element")
        element = elements[0]
        element_attrs = element["attrs"]
        require_equal(f"{label} element kind", element["tag"], record["kind"])
        reject_accessible_name_attributes(f"{label} element", element_attrs)
        if record["kind"] == "img":
            require_equal(f"{label} image alt", element_attrs.get("alt"), "")

    interactive = semantics["interactive_embeds"]
    for item in interactive["items"]:
        media_id = item["media_id"]
        record = media_by_id[media_id]
        label = f"{expected_page}: content semantics interactive embed {media_id}"
        require_equal(f"{label} element kind", record["kind"], "iframe")
        owner_attrs = record["attrs"]
        require_semantic_attributes(
            f"{label} owner",
            owner_attrs,
            INTERACTIVE_OWNER_ATTRIBUTES,
        )
        require_equal(f"{label} title", owner_attrs.get("title"), item["title"])
        for forbidden in ("aria-hidden", "hidden", "inert", "aria-label", "aria-labelledby"):
            if forbidden in owner_attrs:
                raise ManifestError(
                    f"{label} must not carry suppressing or competing attribute {forbidden}"
                )
        if record["suppressed"]:
            raise ManifestError(f"{label} must remain exposed to assistive technology")
        elements = record["elements"]
        if len(elements) != 1 or elements[0]["tag"] != "iframe":
            raise ManifestError(f"{label} must contain exactly one iframe element")

    expected_figures = semantics["named_project_figures"]["items"]
    actual_figures: list[dict[str, str]] = []
    for index, figure in enumerate(audit.project_figures):
        label = f"{expected_page}: content semantics project figure {index + 1}"
        require_equal(f"{label} element kind", figure["tag"], "figure")
        attrs = figure["attrs"]
        if figure["suppressed"]:
            raise ManifestError(f"{label} must remain exposed to assistive technology")
        for forbidden in ("aria-hidden", "hidden", "inert", "aria-labelledby", "title", "role"):
            if forbidden in attrs:
                raise ManifestError(
                    f"{label} must not carry suppressing or competing attribute {forbidden}"
                )
        actual_figures.append({
            "band": figure["band"],
            "label": attrs.get("aria-label"),
        })
    require_equal(
        f"{expected_page}: content semantics named project figures",
        actual_figures,
        expected_figures,
    )

    source_structure = semantics["source_structure"]
    require_equal(
        f"{expected_page}: content semantics heading counts",
        audit.heading_counts,
        source_structure["heading_counts"],
    )
    require_equal(
        f"{expected_page}: content semantics role heading count",
        audit.role_heading_count,
        source_structure["role_heading_count"],
    )
    require_equal(
        f"{expected_page}: content semantics total figure count",
        audit.figure_count,
        source_structure["figure_count"],
    )
    band_records = {
        record["band"]: record
        for record in audit.band_records
    }
    for item in source_structure["unlabeled_nonfigure_bands"]:
        band = item["band"]
        record = band_records.get(band)
        if record is None:
            raise ManifestError(
                f"{expected_page}: content semantics missing unlabeled band {band}"
            )
        label = f"{expected_page}: content semantics unlabeled band {band}"
        require_equal(f"{label} element kind", record["tag"], item["tag"])
        reject_accessible_name_attributes(label, record["attrs"])
        require_equal(
            f"{label} figure count",
            audit.figure_counts_by_band.get(band, 0),
            item["figure_count"],
        )


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
    validate_bodycopy_content_semantics(expected_page, spec, audit, media_by_id)
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
        if "data_fit" in geometry:
            require_equal(
                f"{expected_page}: {media_id} data-fit",
                record["attrs"].get("data-fit"),
                geometry["data_fit"],
            )


def mutate_html_attribute(
    start_tag: str,
    attribute: str,
    value: str | None,
) -> str:
    pattern = re.compile(
        rf"\s+{re.escape(attribute)}"
        rf"(?:\s*=\s*(?:\"[^\"]*\"|'[^']*'|[^\s>]+))?",
        flags=re.IGNORECASE,
    )
    updated, count = pattern.subn("", start_tag, count=1)
    if value is None:
        if count != 1:
            raise ManifestError(
                f"self-test could not remove {attribute} from {start_tag[:80]!r}"
            )
        return updated
    rendered = f' {attribute}="{value}"'
    if count == 0:
        return start_tag[:-1] + rendered + ">"
    return updated[:-1] + rendered + ">"


def mutate_media_owner_tag(source: str, media_id: str, mutation) -> str:
    pattern = re.compile(
        rf"<[a-z][^<>]*\bdata-media-id=\"{re.escape(media_id)}\"[^<>]*>",
        flags=re.IGNORECASE,
    )
    match = pattern.search(source)
    if match is None:
        raise ManifestError(f"self-test could not locate media owner {media_id}")
    mutated_tag = mutation(match.group(0))
    if mutated_tag == match.group(0):
        raise ManifestError(f"self-test did not mutate media owner {media_id}")
    return source[:match.start()] + mutated_tag + source[match.end():]


def insert_media_owner_child(source: str, media_id: str, child: str) -> str:
    pattern = re.compile(
        rf"<(?P<tag>[a-z][a-z0-9:-]*)[^<>]*"
        rf"\bdata-media-id=\"{re.escape(media_id)}\"[^<>]*>",
        flags=re.IGNORECASE,
    )
    match = pattern.search(source)
    if match is None:
        raise ManifestError(f"self-test could not locate media owner {media_id}")
    if match.group("tag").lower() in VOID_TAGS | MEDIA_TAGS:
        raise ManifestError(
            f"self-test cannot insert a descendant into media owner {media_id}"
        )
    return source[:match.end()] + child + source[match.end():]


def mutate_media_element_tag(source: str, media_id: str, mutation) -> str:
    owner_pattern = re.compile(
        rf"<(?P<tag>[a-z][a-z0-9:-]*)[^<>]*"
        rf"\bdata-media-id=\"{re.escape(media_id)}\"[^<>]*>",
        flags=re.IGNORECASE,
    )
    owner = owner_pattern.search(source)
    if owner is None:
        raise ManifestError(f"self-test could not locate media owner {media_id}")
    owner_tag = owner.group("tag").lower()
    if owner_tag in MEDIA_TAGS:
        mutated_tag = mutation(owner.group(0))
        if mutated_tag == owner.group(0):
            raise ManifestError(f"self-test did not mutate media element {media_id}")
        return source[:owner.start()] + mutated_tag + source[owner.end():]
    element_pattern = re.compile(
        r"<(?:img|video|iframe)\b[^<>]*>",
        flags=re.IGNORECASE,
    )
    element = element_pattern.search(source, owner.end())
    owner_end = re.search(
        rf"</{re.escape(owner_tag)}\s*>",
        source[owner.end():],
        flags=re.IGNORECASE,
    )
    if (
        element is None
        or owner_end is None
        or element.start() >= owner.end() + owner_end.start()
    ):
        raise ManifestError(f"self-test could not locate media element {media_id}")
    mutated_tag = mutation(element.group(0))
    if mutated_tag == element.group(0):
        raise ManifestError(f"self-test did not mutate media element {media_id}")
    return source[:element.start()] + mutated_tag + source[element.end():]


def mutate_band_start_tag(source: str, band: str, mutation) -> str:
    pattern = re.compile(
        rf"<[a-z][^<>]*\bdata-band=\"{re.escape(band)}\"[^<>]*>",
        flags=re.IGNORECASE,
    )
    match = pattern.search(source)
    if match is None:
        raise ManifestError(f"self-test could not locate band {band}")
    mutated_tag = mutation(match.group(0))
    if mutated_tag == match.group(0):
        raise ManifestError(f"self-test did not mutate band {band}")
    return source[:match.start()] + mutated_tag + source[match.end():]


def insert_after_band_start(source: str, band: str, child: str) -> str:
    pattern = re.compile(
        rf"<[a-z][^<>]*\bdata-band=\"{re.escape(band)}\"[^<>]*>",
        flags=re.IGNORECASE,
    )
    match = pattern.search(source)
    if match is None:
        raise ManifestError(f"self-test could not locate band {band}")
    return source[:match.end()] + child + source[match.end():]


def insert_after_page_root_start(source: str, page: str, child: str) -> str:
    if page == "home":
        pattern = re.compile(
            r"<[a-z][^<>]*\bclass=\"mms\"[^<>]*>",
            flags=re.IGNORECASE,
        )
    else:
        pattern = re.compile(
            rf"<[a-z][^<>]*\bdata-page=\"{re.escape(page)}\"[^<>]*>",
            flags=re.IGNORECASE,
        )
    match = pattern.search(source)
    if match is None:
        raise ManifestError(f"self-test could not locate MM.S root for {page}")
    return source[:match.end()] + child + source[match.end():]


def mutate_project_figure_tag(source: str, label: str, mutation) -> str:
    pattern = re.compile(
        rf"<figure\b(?=[^<>]*\baria-label=\"{re.escape(label)}\")[^<>]*>",
        flags=re.IGNORECASE,
    )
    match = pattern.search(source)
    if match is None:
        raise ManifestError(f"self-test could not locate project figure {label!r}")
    mutated_tag = mutation(match.group(0))
    if mutated_tag == match.group(0):
        raise ManifestError(f"self-test did not mutate project figure {label!r}")
    return source[:match.start()] + mutated_tag + source[match.end():]


def expect_semantic_bodycopy_rejection(
    label: str,
    source: str,
    expected_page: str,
    manifest: dict,
) -> None:
    try:
        validate_bodycopy(source, expected_page, manifest)
    except ManifestError as error:
        if "content semantics" not in str(error).replace("_", " "):
            raise ManifestError(
                f"self-test {label!r} was rejected by an unrelated guard: {error}"
            ) from error
        return
    raise ManifestError(f"self-test destructive fixture unexpectedly passed: {label}")


def expect_semantic_manifest_rejection(label: str, manifest: dict) -> None:
    try:
        validate_manifest_consistency(manifest)
    except ManifestError:
        return
    raise ManifestError(f"self-test destructive fixture unexpectedly passed: {label}")


def run_content_semantics_self_test(
    source: str,
    expected_page: str,
    manifest: dict,
) -> int:
    spec = manifest["pages"][expected_page]
    semantics = spec["content_semantics"]
    audit = BodycopyAudit()
    audit.feed(source)
    audit.close()
    media_by_id = {item["id"]: item for item in audit.media}
    mutations: list[tuple[str, str]] = []

    decorative_ids = semantics["decorative_native_media"]["media_ids"]
    if decorative_ids:
        media_id = decorative_ids[0]
        mutations.extend([
            (
                "decorative owner missing policy",
                mutate_media_owner_tag(
                    source,
                    media_id,
                    lambda tag: mutate_html_attribute(tag, "data-a11y-policy", None),
                ),
            ),
            (
                "decorative owner missing aria-hidden",
                mutate_media_owner_tag(
                    source,
                    media_id,
                    lambda tag: mutate_html_attribute(tag, "aria-hidden", None),
                ),
            ),
            (
                "decorative owner gains competing name",
                mutate_media_owner_tag(
                    source,
                    media_id,
                    lambda tag: mutate_html_attribute(tag, "aria-label", "unexpected"),
                ),
            ),
            (
                "decorative owner gains nonnegative tabindex",
                mutate_media_owner_tag(
                    source,
                    media_id,
                    lambda tag: mutate_html_attribute(tag, "tabindex", "0"),
                ),
            ),
            (
                "decorative owner becomes contenteditable",
                mutate_media_owner_tag(
                    source,
                    media_id,
                    lambda tag: mutate_html_attribute(tag, "contenteditable", "true"),
                ),
            ),
            (
                "decorative owner gains button semantics",
                mutate_media_owner_tag(
                    source,
                    media_id,
                    lambda tag: mutate_html_attribute(tag, "role", "button"),
                ),
            ),
            (
                "decorative owner gains focusable descendant",
                insert_media_owner_child(
                    source,
                    media_id,
                    "<button type=\"button\">unexpected</button>",
                ),
            ),
            (
                "decorative owner gains linked descendant",
                insert_media_owner_child(
                    source,
                    media_id,
                    "<a href=\"#unexpected\">unexpected</a>",
                ),
            ),
        ])
    image_id = next(
        (media_id for media_id in decorative_ids if media_by_id[media_id]["kind"] == "img"),
        None,
    )
    if image_id is not None:
        mutations.extend([
            (
                "decorative image gains nonempty alt",
                mutate_media_element_tag(
                    source,
                    image_id,
                    lambda tag: mutate_html_attribute(tag, "alt", "unexpected"),
                ),
            ),
            (
                "decorative image gains tabindex",
                mutate_media_element_tag(
                    source,
                    image_id,
                    lambda tag: mutate_html_attribute(tag, "tabindex", "0"),
                ),
            ),
        ])
    video_id = next(
        (media_id for media_id in decorative_ids if media_by_id[media_id]["kind"] == "video"),
        None,
    )
    if video_id is not None:
        mutations.extend([
            (
                "decorative video gains title",
                mutate_media_element_tag(
                    source,
                    video_id,
                    lambda tag: mutate_html_attribute(tag, "title", "unexpected"),
                ),
            ),
            (
                "decorative video gains controls",
                mutate_media_element_tag(
                    source,
                    video_id,
                    lambda tag: mutate_html_attribute(tag, "controls", ""),
                ),
            ),
        ])

    interactive_items = semantics["interactive_embeds"]["items"]
    if interactive_items:
        item = interactive_items[0]
        media_id = item["media_id"]
        mutations.extend([
            (
                "interactive embed missing policy",
                mutate_media_owner_tag(
                    source,
                    media_id,
                    lambda tag: mutate_html_attribute(tag, "data-a11y-policy", None),
                ),
            ),
            (
                "interactive embed suppressed",
                mutate_media_owner_tag(
                    source,
                    media_id,
                    lambda tag: mutate_html_attribute(tag, "aria-hidden", "true"),
                ),
            ),
            (
                "interactive embed missing title",
                mutate_media_owner_tag(
                    source,
                    media_id,
                    lambda tag: mutate_html_attribute(tag, "title", None),
                ),
            ),
            (
                "interactive embed title drift",
                mutate_media_owner_tag(
                    source,
                    media_id,
                    lambda tag: mutate_html_attribute(tag, "title", "unexpected"),
                ),
            ),
        ])

    figure_items = semantics["named_project_figures"]["items"]
    if figure_items:
        figure_label = figure_items[0]["label"]
        mutations.extend([
            (
                "project figure missing label",
                mutate_project_figure_tag(
                    source,
                    figure_label,
                    lambda tag: mutate_html_attribute(tag, "aria-label", None),
                ),
            ),
            (
                "project figure suppressed",
                mutate_project_figure_tag(
                    source,
                    figure_label,
                    lambda tag: mutate_html_attribute(tag, "aria-hidden", "true"),
                ),
            ),
        ])

    source_structure = semantics["source_structure"]
    mutations.append((
        "source gains unexpected heading",
        insert_after_page_root_start(
            source,
            expected_page,
            "<h1>unexpected</h1>",
        ),
    ))
    mutations.extend([
        (
            "source gains unexpected role heading",
            insert_after_page_root_start(
                source,
                expected_page,
                "<div role=\"heading\">unexpected</div>",
            ),
        ),
        (
            "source gains unexpected generic figure",
            insert_after_page_root_start(
                source,
                expected_page,
                "<figure></figure>",
            ),
        ),
    ])
    for item in source_structure["unlabeled_nonfigure_bands"]:
        band = item["band"]
        mutations.extend([
            (
                f"unlabeled band {band} gains aria-label",
                mutate_band_start_tag(
                    source,
                    band,
                    lambda tag: mutate_html_attribute(
                        tag,
                        "aria-label",
                        "unexpected",
                    ),
                ),
            ),
            (
                f"unlabeled band {band} gains aria-labelledby",
                mutate_band_start_tag(
                    source,
                    band,
                    lambda tag: mutate_html_attribute(
                        tag,
                        "aria-labelledby",
                        "unexpected",
                    ),
                ),
            ),
            (
                f"unlabeled band {band} gains figure",
                insert_after_band_start(source, band, "<figure></figure>"),
            ),
        ])

    for label, mutated_source in mutations:
        expect_semantic_bodycopy_rejection(
            label,
            mutated_source,
            expected_page,
            manifest,
        )

    manifest_mutations: list[tuple[str, dict]] = []
    missing_contract = deepcopy(manifest)
    del missing_contract["pages"][expected_page]["content_semantics"]
    manifest_mutations.append(("missing content semantics contract", missing_contract))

    if decorative_ids:
        wrong_count = deepcopy(manifest)
        wrong_count["pages"][expected_page]["content_semantics"][
            "decorative_native_media"
        ]["count"] += 1
        manifest_mutations.append(("decorative media count drift", wrong_count))

        duplicate_id = deepcopy(manifest)
        duplicate_contract = duplicate_id["pages"][expected_page]["content_semantics"][
            "decorative_native_media"
        ]
        duplicate_contract["media_ids"].append(duplicate_contract["media_ids"][0])
        duplicate_contract["count"] += 1
        first_kind = next(iter(duplicate_contract["kind_counts"]))
        duplicate_contract["kind_counts"][first_kind] += 1
        manifest_mutations.append(("duplicate decorative media ID", duplicate_id))

    if interactive_items:
        wrong_title = deepcopy(manifest)
        wrong_title["pages"][expected_page]["content_semantics"][
            "interactive_embeds"
        ]["items"][0]["title"] = ""
        manifest_mutations.append(("empty interactive embed title", wrong_title))

    if figure_items:
        duplicate_figure = deepcopy(manifest)
        figure_contract = duplicate_figure["pages"][expected_page]["content_semantics"][
            "named_project_figures"
        ]
        figure_contract["items"].append(deepcopy(figure_contract["items"][0]))
        figure_contract["count"] += 1
        manifest_mutations.append(("duplicate project figure label", duplicate_figure))

    wrong_heading_count = deepcopy(manifest)
    wrong_heading_count["pages"][expected_page]["content_semantics"][
        "source_structure"
    ]["heading_counts"]["h1"] = -1
    manifest_mutations.append(("invalid source heading count", wrong_heading_count))

    for label, mutated_manifest in manifest_mutations:
        expect_semantic_manifest_rejection(label, mutated_manifest)

    return len(mutations) + len(manifest_mutations)


def validate_head(source: str, manifest: dict) -> None:
    expected = manifest.get("head", {}).get("edge_marker")
    if expected is None:
        raise ManifestError("deployment manifest must define head.edge_marker")
    language = manifest.get("head", {}).get("document_language")
    if not isinstance(language, str) or not re.fullmatch(r"[a-z]{2}(?:-[A-Z]{2})?", language):
        raise ManifestError("deployment manifest must define a valid head.document_language")
    if re.match(r"\s*<script\b", source, flags=re.IGNORECASE) is None:
        raise ManifestError("site head must begin with its inline script")
    head_start = HeadStartTagAudit()
    head_start.feed(source)
    if head_start.first_tag != "script":
        raise ManifestError("site head first element must be its inline script")
    attribute_names = [name for name, _ in head_start.first_attributes]
    require_equal(
        "site head inline script attribute names",
        sorted(attribute_names),
        sorted(["data-mms-ios-edge-head", "data-mms-document-language"]),
    )
    markers = [
        value
        for name, value in head_start.first_attributes
        if name == "data-mms-ios-edge-head"
    ]
    require_equal("site head edge marker", markers, [str(expected)])
    language_markers = [
        value
        for name, value in head_start.first_attributes
        if name == "data-mms-document-language"
    ]
    require_equal("site head document-language marker", language_markers, [language])
    assignment = f"document.documentElement.setAttribute('lang', '{language}');"
    assignment_matches = list(re.finditer(
        rf"(?m)^[ \t]*{re.escape(assignment)}[ \t]*$", source
    ))
    require_equal(
        "site head executable document-language assignment count",
        len(assignment_matches),
        1,
    )
    bootstrap_match = re.match(
        rf"\s*<script\b[^>]*>\s*\(function \(\) \{{\r?\n"
        rf"[ \t]*{re.escape(assignment)}[ \t]*\r?\n",
        source,
        flags=re.IGNORECASE,
    )
    if bootstrap_match is None:
        raise ManifestError(
            "site head document-language assignment must be the first executable IIFE statement"
        )
    route_gate_matches = list(re.finditer(
        r"(?m)^[ \t]*var path = window\.location\.pathname \|\| '/';[ \t]*$",
        source,
    ))
    require_equal("site head executable route-gate declaration count", len(route_gate_matches), 1)
    if assignment_matches[0].start() > route_gate_matches[0].start():
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
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="run destructive content-semantics fixtures after a valid bodycopy check",
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
            if args.self_test:
                fixtures = run_content_semantics_self_test(
                    source,
                    args.expected_page,
                    manifest,
                )
                print(
                    f"Content-semantics destructive fixtures: PASS ({fixtures} rejected)",
                    file=sys.stderr,
                )
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
