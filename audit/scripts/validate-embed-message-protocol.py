#!/usr/bin/env python3
"""Validate prepared V7/Touchbaes protocol-v1 successors and parent bridge."""

from __future__ import annotations

import argparse
import copy
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = ROOT / "audit/contracts/embed-message-protocol-candidates.json"
ACTIVE_PATH = ROOT / "audit/contracts/active-embed-builds.json"
TOUCHBAES_V10 = ROOT / (
    "Portfolio assets/_for cargo deployment/touchbaes/sticker game/"
    "touchbaes-sticker-game/touchbaes-sticker-game-v10.html"
)
REQUIRED_KINDS = {"v7-cup", "touchbaes"}


class ContractError(RuntimeError):
    pass


class EmbedParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.frames: dict[str, dict[str, str | None]] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "iframe":
            return
        values = dict(attrs)
        kind = values.get("data-embed-kind")
        if kind in REQUIRED_KINDS:
            if kind in self.frames:
                raise ContractError(f"duplicate canonical iframe kind: {kind}")
            self.frames[kind] = values

    handle_startendtag = handle_starttag


def digest(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def tracked_files() -> set[str]:
    result = subprocess.run(
        ["git", "ls-files", "--cached"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return set(result.stdout.splitlines())


def verify_no_wildcard(label: str, source: str) -> None:
    for match in re.finditer(r"\bpostMessage\s*\(", source):
        statement_end = source.find(";", match.start())
        statement = source[match.start(): statement_end if statement_end >= 0 else None]
        if re.search(r",\s*(['\"])\*\1\s*\)\s*$", statement, flags=re.DOTALL):
            raise ContractError(f"{label}: wildcard postMessage target remains")


def verify_contract_shape(contract: dict) -> None:
    if contract.get("schema_version") != 1:
        raise ContractError("unsupported candidate contract schema")
    if contract.get("issue") != "MMS-AUD-030":
        raise ContractError("candidate contract is not scoped to MMS-AUD-030")
    if contract.get("protocol_version") != 1:
        raise ContractError("candidate protocol version must be 1")
    if contract.get("activation") != "prepared-not-active":
        raise ContractError("candidate activation state changed without promotion evidence")
    entries = contract.get("entries")
    if not isinstance(entries, list):
        raise ContractError("candidate entries must be a list")
    kinds = [entry.get("kind") for entry in entries if isinstance(entry, dict)]
    if len(kinds) != len(entries) or set(kinds) != REQUIRED_KINDS or len(kinds) != len(set(kinds)):
        raise ContractError(f"candidate kind set mismatch: {kinds}")


def verify_superseded(contract: dict) -> None:
    active_entries = {entry["kind"]: entry for entry in load(ACTIVE_PATH)["entries"]}
    entries = {entry["kind"]: entry for entry in contract["entries"]}
    v7 = entries["v7-cup"]["supersedes"]
    active_v7 = active_entries["v7-cup"]
    if (v7.get("version"), v7.get("bytes"), v7.get("sha256")) != (
        active_v7["version"], active_v7["expected_bytes"], active_v7["expected_sha256"]
    ):
        raise ContractError("V7 successor does not identify the active recovered artifact")
    touch_payload = TOUCHBAES_V10.read_bytes()
    touch = entries["touchbaes"]["supersedes"]
    if (touch.get("version"), touch.get("bytes"), touch.get("sha256")) != (
        10, len(touch_payload), digest(touch_payload)
    ):
        raise ContractError("Touchbaes successor does not identify v10 exactly")


def verify_prepared_activation(
    contract: dict,
    home_source: str | None = None,
    manifest: dict | None = None,
) -> None:
    if contract.get("activation") != "prepared-not-active":
        raise ContractError("prepared activation guard received a non-prepared contract")
    source = home_source
    if source is None:
        source = (ROOT / "cargo/home.template.html").read_text(encoding="utf-8")
    parser = EmbedParser()
    parser.feed(source)
    if set(parser.frames) != REQUIRED_KINDS:
        raise ContractError(f"canonical protocol iframe set mismatch: {sorted(parser.frames)}")

    deployment = manifest if manifest is not None else load(ROOT / "cargo/deployment-manifest.json")
    manifest_entries = {
        item.get("kind"): item
        for item in deployment.get("pages", {}).get("home", {}).get("embeds", [])
        if item.get("kind") in REQUIRED_KINDS
    }
    if set(manifest_entries) != REQUIRED_KINDS:
        raise ContractError(f"deployment protocol iframe set mismatch: {sorted(manifest_entries)}")

    entries = {entry["kind"]: entry for entry in contract["entries"]}
    for kind in sorted(REQUIRED_KINDS):
        expected = entries[kind]["supersedes"]
        frame = parser.frames[kind]
        if frame.get("data-src") != expected.get("data_src"):
            raise ContractError(f"{kind}: prepared Home switched the active iframe URL")
        if "data-embed-protocol" in frame:
            raise ContractError(f"{kind}: prepared Home enabled strict protocol before atomic promotion")
        manifest_entry = manifest_entries[kind]
        attributes = manifest_entry.get("attributes", {})
        if attributes.get("data-src") != expected.get("data_src"):
            raise ContractError(f"{kind}: prepared manifest switched the active iframe URL")
        if "data-embed-protocol" in attributes:
            raise ContractError(f"{kind}: prepared manifest enabled strict protocol before atomic promotion")
        if str(manifest_entry.get("version")) != str(expected.get("version")):
            raise ContractError(f"{kind}: prepared manifest version no longer matches active child")


def verify_source(entry: dict, tracked: set[str]) -> None:
    inputs = entry.get("inputs")
    if not isinstance(inputs, list) or not inputs:
        raise ContractError(f"{entry['kind']}: inputs must be a non-empty list")
    paths = [item.get("path") for item in inputs]
    if len(paths) != len(set(paths)):
        raise ContractError(f"{entry['kind']}: duplicate input")
    if entry.get("builder") not in paths:
        raise ContractError(f"{entry['kind']}: builder is not a declared input")
    if entry.get("protocol_source") not in paths:
        raise ContractError(f"{entry['kind']}: protocol source is not a declared input")
    for item in inputs:
        relative = item.get("path")
        if relative not in tracked:
            raise ContractError(f"{entry['kind']}: input is not Git-tracked: {relative}")
        path = ROOT / relative
        if not path.is_file():
            raise ContractError(f"{entry['kind']}: missing input: {relative}")
        actual = digest(path.read_bytes())
        if actual != item.get("sha256"):
            raise ContractError(f"{entry['kind']}: input hash drift for {relative}: {actual}")
    source = (ROOT / entry["protocol_source"]).read_text(encoding="utf-8")
    for marker in entry.get("required_contracts", []):
        if marker not in source:
            raise ContractError(f"{entry['kind']}: required protocol marker missing: {marker!r}")
    verify_no_wildcard(entry["kind"], source)


def isolated_build(entry: dict) -> bytes:
    with tempfile.TemporaryDirectory(prefix=f"mms-{entry['kind']}-message-v1-") as temp_dir:
        checkout = Path(temp_dir) / "checkout"
        for item in entry["inputs"]:
            relative = Path(item["path"])
            destination = checkout / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / relative, destination)
        output = checkout / "build" / entry["output_name"]
        result = subprocess.run(
            [
                sys.executable,
                str(checkout / entry["builder"]),
                "--output",
                str(output),
            ],
            cwd=checkout,
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise ContractError(
                f"{entry['kind']}: isolated builder failed:\n{result.stdout}{result.stderr}"
            )
        return output.read_bytes()


def verify_parent_bridge() -> None:
    panel = (ROOT / "cargo/panel.js").read_text(encoding="utf-8")
    extras = (ROOT / "cargo/home-extras.html").read_text(encoding="utf-8")
    required_panel = (
        "var PANEL_OWNER_VERSION = 'responsive-70/root-lifecycle-2/embed-message-v1'",
        "var EMBED_PROTOCOL_VERSION = 1",
        "function embedOrigin(frame)",
        "frame.hasAttribute('data-embed-protocol')",
        "protocolVersion: EMBED_PROTOCOL_VERSION",
        "kind: kind",
        "visible: Boolean(visible)",
        "if (!expectedOrigin || event.origin !== expectedOrigin) return",
        "event.source !== frame.contentWindow",
        "event.data.protocolVersion !== requiredProtocol",
        "requiredProtocol < 0",
    )
    required_extras = (
        "var OWNER_VERSION = 'tweezer-v3/root-lifecycle-2/embed-message-v1'",
        "var EMBED_PROTOCOL_VERSION = 1",
        "var EMBED_KIND = 'touchbaes'",
        "function gameOrigin()",
        "frame.hasAttribute('data-embed-protocol')",
        "protocolVersion: EMBED_PROTOCOL_VERSION",
        "kind: EMBED_KIND",
        "compact: Boolean(isCompact)",
        "event.source !== iframe.contentWindow",
        "event.origin !== expectedOrigin",
        "data.protocolVersion !== requiredProtocol",
        "requiredProtocol < 0",
        "data.__mmsGameSize === 1",
        "typeof data.compact !== 'boolean'",
        "data.__tw !== 1",
    )
    for marker in required_panel:
        if marker not in panel:
            raise ContractError(f"parent panel protocol marker missing: {marker!r}")
    for marker in required_extras:
        if marker not in extras:
            raise ContractError(f"Touchbaes parent protocol marker missing: {marker!r}")
    for label, source in (("panel", panel), ("home extras", extras)):
        verify_no_wildcard(label, source)


def validate(contract: dict, tracked: set[str]) -> list[tuple[str, int, str]]:
    verify_contract_shape(contract)
    verify_superseded(contract)
    verify_prepared_activation(contract)
    verify_parent_bridge()
    results = []
    for entry in contract["entries"]:
        verify_source(entry, tracked)
        first = isolated_build(entry)
        second = isolated_build(entry)
        if first != second:
            raise ContractError(f"{entry['kind']}: isolated builds are not byte-identical")
        actual = (len(first), digest(first))
        expected = (entry.get("expected_bytes"), entry.get("expected_sha256"))
        if actual != expected:
            raise ContractError(f"{entry['kind']}: output drift: actual={actual}, expected={expected}")
        results.append((entry["kind"], actual[0], actual[1]))
    return results


def expect_failure(label: str, callback) -> None:
    try:
        callback()
    except ContractError:
        return
    raise ContractError(f"negative fixture unexpectedly passed: {label}")


def self_test(contract: dict, tracked: set[str]) -> None:
    wrong_version = copy.deepcopy(contract)
    wrong_version["protocol_version"] = 2
    expect_failure("wrong protocol version", lambda: verify_contract_shape(wrong_version))
    active_candidate = copy.deepcopy(contract)
    active_candidate["activation"] = "active"
    expect_failure("unproven activation", lambda: verify_contract_shape(active_candidate))
    missing_kind = copy.deepcopy(contract)
    missing_kind["entries"] = missing_kind["entries"][:1]
    expect_failure("missing candidate", lambda: verify_contract_shape(missing_kind))
    drifted_superseded = copy.deepcopy(contract)
    drifted_superseded["entries"][0]["supersedes"]["sha256"] = "0" * 64
    expect_failure("superseded identity drift", lambda: verify_superseded(drifted_superseded))
    entry = contract["entries"][0]
    drifted_input = copy.deepcopy(entry)
    drifted_input["inputs"][0]["sha256"] = "0" * 64
    expect_failure("input hash drift", lambda: verify_source(drifted_input, tracked))
    missing_marker = copy.deepcopy(entry)
    missing_marker["required_contracts"][0] = "missing-protocol-marker"
    expect_failure("protocol marker removal", lambda: verify_source(missing_marker, tracked))
    untracked = set(tracked)
    untracked.remove(entry["inputs"][0]["path"])
    expect_failure("untracked input", lambda: verify_source(entry, untracked))
    expect_failure(
        "wildcard target",
        lambda: verify_no_wildcard("mutation", 'window.parent.postMessage({ kind: "v7-cup" }, "*");'),
    )
    home = (ROOT / "cargo/home.template.html").read_text(encoding="utf-8")
    one_sided_attr = home.replace(
        'data-embed-kind="v7-cup"',
        'data-embed-kind="v7-cup" data-embed-protocol="1"',
        1,
    )
    expect_failure(
        "one-sided protocol activation",
        lambda: verify_prepared_activation(contract, one_sided_attr),
    )
    one_sided_url = home.replace(
        contract["entries"][1]["supersedes"]["data_src"],
        "https://freight.cargo.site/m/candidate/touchbaes-sticker-game-v11.html",
        1,
    )
    expect_failure(
        "one-sided URL activation",
        lambda: verify_prepared_activation(contract, one_sided_url),
    )
    manifest = load(ROOT / "cargo/deployment-manifest.json")
    drifted_manifest = copy.deepcopy(manifest)
    manifest_touch = next(
        item for item in drifted_manifest["pages"]["home"]["embeds"]
        if item.get("kind") == "touchbaes"
    )
    manifest_touch["attributes"]["data-embed-protocol"] = "1"
    expect_failure(
        "manifest-only protocol activation",
        lambda: verify_prepared_activation(contract, manifest=drifted_manifest),
    )
    print("Embed message protocol negative fixtures: PASS (11 rejected)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    contract = load(CONTRACT_PATH)
    tracked = tracked_files()
    if args.self_test:
        self_test(contract, tracked)
    for kind, size, sha256 in validate(contract, tracked):
        print(f"Embed message protocol candidate: PASS {kind} {size} bytes sha256={sha256}")


if __name__ == "__main__":
    try:
        main()
    except ContractError as error:
        raise SystemExit(f"Embed message protocol candidate: FAIL: {error}")
