#!/usr/bin/env python3
"""Validate exact notice coverage for every vendored browser runtime."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = ROOT / "audit/contracts/third-party-runtime-notices.json"

EXPECTED_COMPONENTS = {
    "stpageflip": {
        "name": "StPageFlip",
        "package": "page-flip",
        "version": "2.0.7",
        "license": "MIT",
        "copyright": "Copyright (c) 2020 Nodlik",
        "upstream_repository": "https://github.com/Nodlik/StPageFlip",
        "upstream_package": "https://registry.npmjs.org/page-flip/-/page-flip-2.0.7.tgz",
        "notice_heading": "StPageFlip / page-flip 2.0.7",
        "license_text_sha256": "88d7b609a3be5efa2abe8648ddc35d5489579db5e06299545760df45c2c32d66",
        "notice_mode": "sidecar-only",
    },
    "pdfjs": {
        "name": "PDF.js",
        "package": "pdfjs-dist",
        "version": "6.1.200",
        "license": "Apache-2.0",
        "copyright": "Copyright 2024 Mozilla Foundation",
        "upstream_repository": "https://github.com/mozilla/pdf.js",
        "upstream_package": "https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-6.1.200.tgz",
        "notice_heading": "PDF.js / pdfjs-dist 6.1.200",
        "license_text_sha256": "0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594",
        "notice_mode": "embedded-and-sidecar",
    },
    "three-js": {
        "name": "Three.js",
        "package": "three",
        "version": "0.160.0",
        "license": "MIT",
        "copyright": "Copyright © 2010-2023 three.js authors",
        "upstream_repository": "https://github.com/mrdoob/three.js",
        "upstream_package": "https://registry.npmjs.org/three/-/three-0.160.0.tgz",
        "notice_heading": "Three.js 0.160.0 (r160)",
        "license_text_sha256": "852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d",
        "notice_mode": "embedded-and-sidecar",
    },
}
EXPECTED_ARTIFACTS = {
    "v7-active",
    "v7-message-v1",
    "montran-v17",
    "montran-v18",
}


class NoticeError(RuntimeError):
    pass


def digest(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def load_json(path: Path) -> dict:
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


def component_map(contract: dict) -> dict[str, dict]:
    components = contract.get("components")
    if not isinstance(components, list):
        raise NoticeError("notice components must be a list")
    ids = [item.get("id") for item in components if isinstance(item, dict)]
    if len(ids) != len(components) or len(ids) != len(set(ids)):
        raise NoticeError("notice components must be unique objects")
    if set(ids) != set(EXPECTED_COMPONENTS):
        raise NoticeError(f"notice component set mismatch: {ids}")
    return {item["id"]: item for item in components}


def artifact_map(contract: dict) -> dict[str, dict]:
    artifacts = contract.get("artifacts")
    if not isinstance(artifacts, list):
        raise NoticeError("notice artifacts must be a list")
    ids = [item.get("id") for item in artifacts if isinstance(item, dict)]
    if len(ids) != len(artifacts) or len(ids) != len(set(ids)):
        raise NoticeError("notice artifacts must be unique objects")
    if set(ids) != EXPECTED_ARTIFACTS:
        raise NoticeError(f"notice artifact set mismatch: {ids}")
    return {item["id"]: item for item in artifacts}


def verify_contract_shape(contract: dict) -> tuple[dict[str, dict], dict[str, dict]]:
    if contract.get("schema_version") != 1:
        raise NoticeError("unsupported third-party notice contract schema")
    if contract.get("issue") != "MMS-AUD-039":
        raise NoticeError("third-party notice contract is not scoped to MMS-AUD-039")
    if contract.get("status") != "tracked-repository-record":
        raise NoticeError("third-party notice status changed without review")
    notice = contract.get("notice")
    if not isinstance(notice, dict) or set(notice) != {"path", "sha256"}:
        raise NoticeError("notice identity must contain only path and sha256")
    components = component_map(contract)
    artifacts = artifact_map(contract)

    vendor_paths: list[str] = []
    for component_id, expected in EXPECTED_COMPONENTS.items():
        component = components[component_id]
        for field, value in expected.items():
            if component.get(field) != value:
                raise NoticeError(
                    f"{component_id}: {field} is {component.get(field)!r}, expected {value!r}"
                )
        files = component.get("vendor_files")
        if not isinstance(files, list) or not files:
            raise NoticeError(f"{component_id}: vendor_files must be non-empty")
        for item in files:
            if not isinstance(item, dict):
                raise NoticeError(f"{component_id}: vendor file must be an object")
            path = item.get("path")
            if not isinstance(path, str) or "/vendor/" not in path:
                raise NoticeError(f"{component_id}: invalid vendor path: {path!r}")
            vendor_paths.append(path)
            markers = item.get("retained_notice_markers")
            if not isinstance(markers, list) or any(not isinstance(marker, str) for marker in markers):
                raise NoticeError(f"{component_id}: retained markers must be strings")
        if component["notice_mode"] == "sidecar-only" and any(
            item["retained_notice_markers"] for item in files
        ):
            raise NoticeError(f"{component_id}: sidecar-only dependency claims embedded markers")
        if component["notice_mode"] == "embedded-and-sidecar" and any(
            not item["retained_notice_markers"] for item in files
        ):
            raise NoticeError(f"{component_id}: embedded notice markers are missing")

    if len(vendor_paths) != len(set(vendor_paths)):
        raise NoticeError("a vendored runtime file is assigned more than once")
    return components, artifacts


def notice_section(text: str, heading: str) -> str:
    marker = f"## {heading}\n"
    if text.count(marker) != 1:
        raise NoticeError(f"notice heading must occur exactly once: {heading}")
    section = text.split(marker, 1)[1]
    return section.split("\n## ", 1)[0]


def verify_notice(
    contract: dict,
    components: dict[str, dict],
    tracked: set[str],
    notice_payload: bytes | None = None,
) -> None:
    relative = contract["notice"]["path"]
    if relative not in tracked:
        raise NoticeError(f"notice file is not Git-tracked: {relative}")
    path = ROOT / relative
    if not path.is_file():
        raise NoticeError(f"notice file is missing: {relative}")
    payload = path.read_bytes() if notice_payload is None else notice_payload
    if digest(payload) != contract["notice"]["sha256"]:
        raise NoticeError("notice file hash drift")
    text = payload.decode("utf-8")
    for component_id, component in components.items():
        section = notice_section(text, component["notice_heading"])
        required = (
            f"License: {component['license']}",
            component["copyright"],
            component["upstream_repository"],
            component["upstream_package"],
        )
        for marker in required:
            if marker not in section:
                raise NoticeError(f"{component_id}: notice metadata missing: {marker!r}")
        for item in component["vendor_files"]:
            for marker in (item["path"], item["sha256"]):
                if marker not in section:
                    raise NoticeError(f"{component_id}: vendor identity missing from notice")
        match = re.search(r"```text\n(.*?)```", section, flags=re.DOTALL)
        if not match:
            raise NoticeError(f"{component_id}: complete license block is missing")
        license_payload = match.group(1).encode("utf-8")
        if digest(license_payload) != component["license_text_sha256"]:
            raise NoticeError(f"{component_id}: complete license text drift")


def actual_vendor_paths() -> set[str]:
    return {
        str(path.relative_to(ROOT))
        for path in ROOT.glob("work/**/vendor/*")
        if path.is_file()
    }


def verify_vendor_files(
    components: dict[str, dict],
    tracked: set[str],
    payload_overrides: dict[str, bytes] | None = None,
    discovered_paths: set[str] | None = None,
) -> dict[str, bytes]:
    overrides = payload_overrides or {}
    covered: dict[str, bytes] = {}
    for component_id, component in components.items():
        for item in component["vendor_files"]:
            relative = item["path"]
            if relative not in tracked:
                raise NoticeError(f"{component_id}: vendor input is not Git-tracked: {relative}")
            path = ROOT / relative
            if not path.is_file():
                raise NoticeError(f"{component_id}: vendor input is missing: {relative}")
            payload = overrides.get(relative, path.read_bytes())
            if digest(payload) != item["sha256"]:
                raise NoticeError(f"{component_id}: vendor input hash drift: {relative}")
            text = payload.decode("utf-8", errors="replace")
            for marker in item["retained_notice_markers"]:
                if marker not in text:
                    raise NoticeError(
                        f"{component_id}: retained vendor notice marker missing from {relative}: {marker!r}"
                    )
            covered[relative] = payload
    discovered = actual_vendor_paths() if discovered_paths is None else discovered_paths
    if set(covered) != discovered:
        raise NoticeError(
            "vendored runtime coverage mismatch: "
            f"missing={sorted(discovered - set(covered))}, "
            f"unexpected={sorted(set(covered) - discovered)}"
        )
    return covered


def resolve_artifact_entry(artifact: dict, tracked: set[str]) -> dict:
    relative = artifact.get("canonical_contract")
    if relative not in tracked:
        raise NoticeError(f"artifact contract is not Git-tracked: {relative}")
    path = ROOT / relative
    if not path.is_file():
        raise NoticeError(f"artifact contract is missing: {relative}")
    source = load_json(path)
    selector = artifact.get("selector")
    if not isinstance(selector, dict):
        raise NoticeError(f"{artifact.get('id')}: selector must be an object")
    collection = selector.get("collection")
    if collection == "candidate":
        if set(selector) != {"collection"} or not isinstance(source.get("candidate"), dict):
            raise NoticeError(f"{artifact['id']}: invalid candidate selector")
        return source["candidate"]
    if collection == "entries":
        if set(selector) != {"collection", "kind"}:
            raise NoticeError(f"{artifact['id']}: invalid entries selector")
        matches = [entry for entry in source.get("entries", []) if entry.get("kind") == selector["kind"]]
        if len(matches) != 1:
            raise NoticeError(f"{artifact['id']}: canonical entry selector matched {len(matches)} entries")
        return matches[0]
    raise NoticeError(f"{artifact['id']}: unsupported selector collection: {collection!r}")


def isolated_build(entry: dict) -> bytes:
    with tempfile.TemporaryDirectory(prefix="mms-third-party-notice-") as temp_dir:
        checkout = Path(temp_dir) / "checkout"
        for item in entry["inputs"]:
            relative = Path(item["path"])
            destination = checkout / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / relative, destination)
        output = checkout / "build" / entry["output_name"]
        result = subprocess.run(
            [sys.executable, str(checkout / entry["builder"]), "--output", str(output)],
            cwd=checkout,
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise NoticeError(
                f"{entry.get('kind')}: isolated builder failed:\n{result.stdout}{result.stderr}"
            )
        return output.read_bytes()


def verify_payload_occurrence(
    artifact_id: str,
    output: bytes,
    vendor_payloads: dict[str, bytes],
    expected_paths: set[str],
) -> None:
    for relative in sorted(expected_paths):
        count = output.count(vendor_payloads[relative])
        if count != 1:
            raise NoticeError(
                f"{artifact_id}: vendor payload {relative} occurs {count} times, expected 1"
            )


def verify_artifacts(
    artifacts: dict[str, dict],
    components: dict[str, dict],
    tracked: set[str],
    vendor_payloads: dict[str, bytes],
    output_overrides: dict[str, bytes] | None = None,
) -> list[tuple[str, int, str]]:
    component_paths = {
        component_id: {item["path"] for item in component["vendor_files"]}
        for component_id, component in components.items()
    }
    used_components: set[str] = set()
    all_canonical_vendor_paths: set[str] = set()
    outputs = output_overrides or {}
    results: list[tuple[str, int, str]] = []
    for artifact_id in sorted(artifacts):
        artifact = artifacts[artifact_id]
        artifact_components = artifact.get("components")
        if (
            not isinstance(artifact_components, list)
            or not artifact_components
            or len(artifact_components) != len(set(artifact_components))
            or not set(artifact_components) <= set(components)
        ):
            raise NoticeError(f"{artifact_id}: invalid component links")
        entry = resolve_artifact_entry(artifact, tracked)
        canonical_identity = (entry.get("expected_bytes"), entry.get("expected_sha256"))
        notice_identity = (artifact.get("expected_bytes"), artifact.get("expected_sha256"))
        if canonical_identity != notice_identity:
            raise NoticeError(
                f"{artifact_id}: notice identity {notice_identity} differs from canonical {canonical_identity}"
            )
        canonical_vendor_paths = {
            item["path"] for item in entry.get("inputs", []) if "/vendor/" in item.get("path", "")
        }
        expected_paths: set[str] = set()
        for component_id in artifact_components:
            expected_paths.update(component_paths[component_id])
        if canonical_vendor_paths != expected_paths:
            raise NoticeError(
                f"{artifact_id}: component/vendor mapping mismatch: "
                f"canonical={sorted(canonical_vendor_paths)}, expected={sorted(expected_paths)}"
            )
        used_components.update(artifact_components)
        all_canonical_vendor_paths.update(canonical_vendor_paths)
        output = outputs.get(artifact_id)
        if output is None:
            output = isolated_build(entry)
        actual_identity = (len(output), digest(output))
        if actual_identity != notice_identity:
            raise NoticeError(
                f"{artifact_id}: rebuilt identity {actual_identity} differs from {notice_identity}"
            )
        verify_payload_occurrence(artifact_id, output, vendor_payloads, expected_paths)
        results.append((artifact_id, actual_identity[0], actual_identity[1]))
    if used_components != set(components):
        raise NoticeError(f"notice components are not all distributed: {sorted(set(components) - used_components)}")
    if all_canonical_vendor_paths != set(vendor_payloads):
        raise NoticeError("canonical artifact contracts and notice vendor coverage diverge")
    return results


def validate(contract: dict, tracked: set[str]) -> list[tuple[str, int, str]]:
    components, artifacts = verify_contract_shape(contract)
    verify_notice(contract, components, tracked)
    vendor_payloads = verify_vendor_files(components, tracked)
    return verify_artifacts(artifacts, components, tracked, vendor_payloads)


def expect_failure(label: str, callback) -> None:
    try:
        callback()
    except NoticeError:
        return
    raise NoticeError(f"negative fixture unexpectedly passed: {label}")


def self_test(contract: dict, tracked: set[str]) -> None:
    components, artifacts = verify_contract_shape(contract)
    notice_payload = (ROOT / contract["notice"]["path"]).read_bytes()
    vendor_payloads = verify_vendor_files(components, tracked)

    wrong_schema = copy.deepcopy(contract)
    wrong_schema["schema_version"] = 2
    expect_failure("wrong schema", lambda: verify_contract_shape(wrong_schema))

    wrong_issue = copy.deepcopy(contract)
    wrong_issue["issue"] = "MMS-AUD-000"
    expect_failure("wrong issue", lambda: verify_contract_shape(wrong_issue))

    missing_component = copy.deepcopy(contract)
    missing_component["components"] = missing_component["components"][:-1]
    expect_failure("missing component", lambda: verify_contract_shape(missing_component))

    duplicate_component = copy.deepcopy(contract)
    duplicate_component["components"].append(copy.deepcopy(duplicate_component["components"][0]))
    expect_failure("duplicate component", lambda: verify_contract_shape(duplicate_component))

    wrong_metadata = copy.deepcopy(contract)
    wrong_metadata["components"][0]["version"] = "2.0.6"
    expect_failure("wrong component metadata", lambda: verify_contract_shape(wrong_metadata))

    duplicate_vendor = copy.deepcopy(contract)
    duplicate_vendor["components"][1]["vendor_files"].append(
        copy.deepcopy(duplicate_vendor["components"][0]["vendor_files"][0])
    )
    expect_failure("duplicate vendor assignment", lambda: verify_contract_shape(duplicate_vendor))

    reduced_tracked = set(tracked)
    reduced_tracked.remove(contract["notice"]["path"])
    expect_failure(
        "untracked notice",
        lambda: verify_notice(contract, components, reduced_tracked, notice_payload),
    )

    wrong_notice_hash = copy.deepcopy(contract)
    wrong_notice_hash["notice"]["sha256"] = "0" * 64
    expect_failure(
        "notice hash drift",
        lambda: verify_notice(wrong_notice_hash, components, tracked, notice_payload),
    )

    truncated = notice_payload.replace(
        b"Permission is hereby granted, free of charge, to any person obtaining a copy",
        b"Permission text removed",
        1,
    )
    truncated_contract = copy.deepcopy(contract)
    truncated_contract["notice"]["sha256"] = digest(truncated)
    expect_failure(
        "truncated license text",
        lambda: verify_notice(truncated_contract, components, tracked, truncated),
    )

    vendor_drift = copy.deepcopy(contract)
    vendor_drift["components"][0]["vendor_files"][0]["sha256"] = "0" * 64
    drift_components, _ = verify_contract_shape(vendor_drift)
    expect_failure(
        "vendor hash drift",
        lambda: verify_vendor_files(drift_components, tracked),
    )

    three_path = components["three-js"]["vendor_files"][0]["path"]
    no_banner = vendor_payloads[three_path].replace(b"SPDX-License-Identifier: MIT", b"removed marker", 1)
    marker_contract = copy.deepcopy(contract)
    marker_components, _ = verify_contract_shape(marker_contract)
    marker_components["three-js"]["vendor_files"][0]["sha256"] = digest(no_banner)
    expect_failure(
        "removed retained banner",
        lambda: verify_vendor_files(marker_components, tracked, {three_path: no_banner}),
    )

    missing_artifact = copy.deepcopy(contract)
    missing_artifact["artifacts"] = missing_artifact["artifacts"][:-1]
    expect_failure("missing artifact", lambda: verify_contract_shape(missing_artifact))

    duplicate_artifact = copy.deepcopy(contract)
    duplicate_artifact["artifacts"].append(copy.deepcopy(duplicate_artifact["artifacts"][0]))
    expect_failure("duplicate artifact", lambda: verify_contract_shape(duplicate_artifact))

    identity_drift = copy.deepcopy(artifacts)
    identity_drift["v7-active"]["expected_sha256"] = "0" * 64
    expect_failure(
        "artifact identity drift",
        lambda: verify_artifacts(identity_drift, components, tracked, vendor_payloads),
    )

    missing_link = copy.deepcopy(artifacts)
    missing_link["montran-v17"]["components"] = ["stpageflip"]
    expect_failure(
        "missing component-artifact link",
        lambda: verify_artifacts(missing_link, components, tracked, vendor_payloads),
    )

    fake_discovery = set(actual_vendor_paths()) | {"work/example/vendor/new-runtime.js"}
    expect_failure(
        "uncovered vendor input",
        lambda: verify_vendor_files(components, tracked, discovered_paths=fake_discovery),
    )

    active_v7 = artifacts["v7-active"]
    active_entry = resolve_artifact_entry(active_v7, tracked)
    active_output = isolated_build(active_entry)
    three_payload = vendor_payloads[three_path]
    without_payload = active_output.replace(three_payload, b"", 1)
    expect_failure(
        "vendor payload removed",
        lambda: verify_payload_occurrence(
            "v7-active", without_payload, vendor_payloads, {three_path}
        ),
    )
    duplicated_payload = active_output + three_payload
    expect_failure(
        "vendor payload duplicated",
        lambda: verify_payload_occurrence(
            "v7-active", duplicated_payload, vendor_payloads, {three_path}
        ),
    )
    print("Third-party runtime notice negative fixtures: PASS (17 rejected)")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    contract = load_json(CONTRACT_PATH)
    tracked = tracked_files()
    if args.self_test:
        self_test(contract, tracked)
    for artifact_id, size, sha256 in validate(contract, tracked):
        print(
            "Third-party runtime notice: PASS "
            f"{artifact_id} {size} bytes sha256={sha256}"
        )


if __name__ == "__main__":
    try:
        main()
    except NoticeError as error:
        raise SystemExit(f"Third-party runtime notice: FAIL: {error}")
