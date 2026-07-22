#!/usr/bin/env python3
"""Validate the prepared Montran exact-PDF allowlist successor."""

from __future__ import annotations

import argparse
import copy
import csv
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = ROOT / "audit/contracts/montran-pdf-allowlist-candidate.json"
ACTIVE_CONTRACT_PATH = ROOT / "audit/contracts/active-embed-builds.json"
HOME_PATH = ROOT / "cargo/home.template.html"
DEPLOYMENT_MANIFEST_PATH = ROOT / "cargo/deployment-manifest.json"

APPROVED_PDF_URL = (
    "https://freight.cargo.site/t/original/i/"
    "P3028590574867085520722012452665/"
    "montran_sustainability-report_2025_v4-web.pdf"
)
APPROVED_PDF_BYTES = 13_634_937
APPROVED_PDF_SHA256 = (
    "664dab49810d21acaa0ffbb7d6749268215c1b655ccec11f461d67c147f02629"
)
FROZEN_PDF_EVIDENCE = (
    "docs/audits/2026-07-20T175853-0400-round-80/"
    "freight/asset-manifest.csv"
)

ACTIVE_VERSION = 17
ACTIVE_BYTES = 1_936_356
ACTIVE_SHA256 = (
    "825cf2c3a1f130cb3445e62443985e845991204d19e0c2154cfd43a36126b49b"
)
ACTIVE_VIEWER_URL = (
    "https://freight.cargo.site/m/U3034412351395654863674388559673/"
    "montran-booklet-direct-pdf-v17.html"
)
ACTIVE_DATA_SRC = (
    ACTIVE_VIEWER_URL
    + "?pdf=https%3A%2F%2Ffreight.cargo.site%2Ft%2Foriginal%2Fi%2F"
    "P3028590574867085520722012452665%2F"
    "montran_sustainability-report_2025_v4-web.pdf"
)

EXPECTED_INPUTS = {
    "work/montran-direct-pdf-v10-src/index.html",
    "work/montran-direct-pdf-v10-src/booklet.config.json",
    "work/montran-direct-pdf-v10-src/loading-poster.jpg",
    "work/montran-direct-pdf-v10-src/vendor/page-flip.browser.js",
    "work/montran-direct-pdf-v10-src/vendor/pdf.min.mjs",
    "work/montran-direct-pdf-v10-src/vendor/pdf.worker.min.mjs",
    "work/montran-pdf-allowlist-v18-src/approved-pdf.json",
    "work/montran-pdf-allowlist-v18-src/pdf-policy.js",
    "work/montran-pdf-allowlist-v18-src/build-bundle.py",
}


class ContractError(RuntimeError):
    pass


class MontranFrameParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.frames: list[dict[str, str | None]] = []

    def handle_starttag(
        self,
        tag: str,
        attrs: list[tuple[str, str | None]],
    ) -> None:
        if tag.lower() != "iframe":
            return
        values = dict(attrs)
        if values.get("data-slot") == "montran-booklet":
            self.frames.append(values)


def load_json(path: Path) -> dict:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ContractError(f"cannot read JSON {path.relative_to(ROOT)}: {error}") from error
    if not isinstance(payload, dict):
        raise ContractError(f"JSON root must be an object: {path.relative_to(ROOT)}")
    return payload


def digest(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def tracked_files() -> set[str]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        check=False,
        capture_output=True,
    )
    if result.returncode != 0:
        raise ContractError("git ls-files failed while checking candidate inputs")
    return {
        item.decode("utf-8")
        for item in result.stdout.split(b"\0")
        if item
    }


def candidate(contract: dict) -> dict:
    value = contract.get("candidate")
    if not isinstance(value, dict):
        raise ContractError("candidate must be an object")
    return value


def verify_contract_shape(contract: dict) -> None:
    if contract.get("schema_version") != 1:
        raise ContractError("candidate contract schema_version must be 1")
    if contract.get("issue") != "MMS-AUD-036":
        raise ContractError("candidate contract issue must be MMS-AUD-036")
    if contract.get("activation") != "prepared-not-active":
        raise ContractError("Montran allowlist candidate must remain prepared-not-active")

    entry = candidate(contract)
    expected_scalar = {
        "kind": "montran-booklet",
        "version": 18,
        "wire_message_version": 17,
        "builder": "work/montran-pdf-allowlist-v18-src/build-bundle.py",
        "policy_source": "work/montran-pdf-allowlist-v18-src/pdf-policy.js",
        "policy_data": "work/montran-pdf-allowlist-v18-src/approved-pdf.json",
        "output_name": "montran-booklet-direct-pdf-v18.html",
    }
    for key, expected in expected_scalar.items():
        if entry.get(key) != expected:
            raise ContractError(f"candidate {key} mismatch: {entry.get(key)!r}")
    if not isinstance(entry.get("expected_bytes"), int) or entry["expected_bytes"] <= 0:
        raise ContractError("candidate expected_bytes must be a positive integer")
    if not isinstance(entry.get("expected_sha256"), str) or len(entry["expected_sha256"]) != 64:
        raise ContractError("candidate expected_sha256 must be a SHA-256 hex string")

    approved = contract.get("approved_pdf")
    if not isinstance(approved, dict):
        raise ContractError("approved_pdf must be an object")
    expected_approved = {
        "url": APPROVED_PDF_URL,
        "bytes": APPROVED_PDF_BYTES,
        "sha256": APPROVED_PDF_SHA256,
        "content_type": "application/pdf",
        "frozen_evidence": FROZEN_PDF_EVIDENCE,
    }
    for key, expected in expected_approved.items():
        if approved.get(key) != expected:
            raise ContractError(f"approved PDF {key} mismatch: {approved.get(key)!r}")


def verify_supersession(contract: dict, active_contract: dict | None = None) -> None:
    supersedes = candidate(contract).get("supersedes")
    if not isinstance(supersedes, dict):
        raise ContractError("candidate supersedes must be an object")
    expected = {
        "version": ACTIVE_VERSION,
        "bytes": ACTIVE_BYTES,
        "sha256": ACTIVE_SHA256,
        "freight_url": ACTIVE_VIEWER_URL,
        "data_src": ACTIVE_DATA_SRC,
    }
    for key, value in expected.items():
        if supersedes.get(key) != value:
            raise ContractError(f"active v17 supersession {key} mismatch")

    active = active_contract if active_contract is not None else load_json(ACTIVE_CONTRACT_PATH)
    entries = active.get("entries")
    if not isinstance(entries, list):
        raise ContractError("active embed entries must be a list")
    matches = [item for item in entries if item.get("kind") == "montran-booklet"]
    if len(matches) != 1:
        raise ContractError(f"active Montran entry count is {len(matches)} (expected 1)")
    current = matches[0]
    if (
        current.get("version") != ACTIVE_VERSION
        or current.get("expected_bytes") != ACTIVE_BYTES
        or current.get("expected_sha256") != ACTIVE_SHA256
        or current.get("output_name") != "montran-booklet-direct-pdf-v17.html"
    ):
        raise ContractError("active embed contract no longer identifies recovered v17")


def parse_home_frame(source: str) -> dict[str, str | None]:
    parser = MontranFrameParser()
    parser.feed(source)
    if len(parser.frames) != 1:
        raise ContractError(
            f"canonical Home Montran iframe count is {len(parser.frames)} (expected 1)"
        )
    return parser.frames[0]


def verify_active_urls(
    contract: dict,
    home_source: str | None = None,
    deployment_manifest: dict | None = None,
) -> None:
    source = home_source if home_source is not None else HOME_PATH.read_text(encoding="utf-8")
    frame = parse_home_frame(source)
    if frame.get("data-src") != ACTIVE_DATA_SRC:
        raise ContractError("canonical Home switched away from the active v17 viewer URL")
    output_name = candidate(contract)["output_name"]
    if output_name in source:
        raise ContractError("prepared v18 output is already referenced by canonical Home")

    manifest = (
        deployment_manifest
        if deployment_manifest is not None
        else load_json(DEPLOYMENT_MANIFEST_PATH)
    )
    embeds = manifest.get("pages", {}).get("home", {}).get("embeds", [])
    matches = [item for item in embeds if item.get("kind") == "montran-booklet"]
    if len(matches) != 1:
        raise ContractError(
            f"deployment Montran entry count is {len(matches)} (expected 1)"
        )
    current = matches[0]
    attributes = current.get("attributes")
    if not isinstance(attributes, dict):
        raise ContractError("deployment Montran attributes must be an object")
    if str(current.get("version")) != str(ACTIVE_VERSION):
        raise ContractError("deployment manifest switched the Montran version")
    if attributes.get("data-src") != ACTIVE_DATA_SRC:
        raise ContractError("deployment manifest switched the active Montran URL")
    if output_name in json.dumps(current, sort_keys=True):
        raise ContractError("prepared v18 output is already referenced by deployment manifest")


def verify_inputs(contract: dict, tracked: set[str]) -> None:
    entry = candidate(contract)
    inputs = entry.get("inputs")
    if not isinstance(inputs, list) or not inputs:
        raise ContractError("candidate inputs must be a non-empty list")
    paths = [item.get("path") for item in inputs if isinstance(item, dict)]
    if len(paths) != len(inputs) or len(paths) != len(set(paths)):
        raise ContractError("candidate inputs contain a missing or duplicate path")
    if set(paths) != EXPECTED_INPUTS:
        raise ContractError(
            "candidate input set mismatch: "
            f"missing={sorted(EXPECTED_INPUTS - set(paths))}, "
            f"extra={sorted(set(paths) - EXPECTED_INPUTS)}"
        )
    for item in inputs:
        relative = item["path"]
        if relative not in tracked:
            raise ContractError(f"candidate input is not Git-tracked: {relative}")
        path = ROOT / relative
        if not path.is_file():
            raise ContractError(f"candidate input is missing: {relative}")
        actual = digest(path.read_bytes())
        if item.get("sha256") != actual:
            raise ContractError(
                f"candidate input hash drift for {relative}: {actual}"
            )

    for key in ("builder", "policy_source", "policy_data"):
        if entry[key] not in paths:
            raise ContractError(f"candidate {key} is not a declared input")


def verify_source_contracts(contract: dict) -> None:
    entry = candidate(contract)
    required = entry.get("required_source_contracts")
    if not isinstance(required, list) or not required:
        raise ContractError("required_source_contracts must be a non-empty list")
    required_paths = [record.get("path") for record in required if isinstance(record, dict)]
    expected_paths = {entry["builder"], entry["policy_source"], entry["policy_data"]}
    if len(required_paths) != len(required) or set(required_paths) != expected_paths:
        raise ContractError("required source contract paths do not cover builder and policy")
    for record in required:
        path = ROOT / record["path"]
        source = path.read_text(encoding="utf-8")
        markers = record.get("contains")
        if not isinstance(markers, list) or not markers:
            raise ContractError(f"required markers missing for {record['path']}")
        for marker in markers:
            if not isinstance(marker, str) or marker not in source:
                raise ContractError(
                    f"required source marker missing from {record['path']}: {marker!r}"
                )

    policy = load_json(ROOT / entry["policy_data"])
    if policy != {
        "schema_version": 1,
        "approved_pdf_url": APPROVED_PDF_URL,
        "expected_bytes": APPROVED_PDF_BYTES,
        "expected_sha256": APPROVED_PDF_SHA256,
    }:
        raise ContractError("approved PDF policy data does not match frozen identity")


def frozen_rows(path: Path) -> list[dict[str, str]]:
    try:
        with path.open(encoding="utf-8", newline="") as handle:
            return list(csv.DictReader(handle))
    except OSError as error:
        raise ContractError(f"cannot read frozen PDF evidence: {error}") from error


def verify_frozen_pdf(
    contract: dict,
    rows: list[dict[str, str]] | None = None,
) -> None:
    evidence_path = ROOT / contract["approved_pdf"]["frozen_evidence"]
    evidence_rows = rows if rows is not None else frozen_rows(evidence_path)
    matches = [row for row in evidence_rows if row.get("original_url") == APPROVED_PDF_URL]
    if len(matches) != 1:
        raise ContractError(
            f"frozen approved PDF evidence count is {len(matches)} (expected 1)"
        )
    row = matches[0]
    expected = {
        "page": "home",
        "kind": "pdf",
        "freight_id": "P3028590574867085520722012452665",
        "filename": "montran_sustainability-report_2025_v4-web.pdf",
        "http_status": "200",
        "content_type": "application/pdf",
        "byte_size": str(APPROVED_PDF_BYTES),
        "sha256": APPROVED_PDF_SHA256,
        "downloaded_bytes": str(APPROVED_PDF_BYTES),
    }
    for key, value in expected.items():
        if row.get(key) != value:
            raise ContractError(f"frozen approved PDF {key} mismatch")


def isolated_build(contract: dict) -> bytes:
    entry = candidate(contract)
    with tempfile.TemporaryDirectory(prefix="mms-montran-pdf-allowlist-") as temp_dir:
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
                "isolated Montran allowlist build failed:\n"
                f"{result.stdout}{result.stderr}"
            )
        if not output.is_file():
            raise ContractError("isolated Montran allowlist build produced no output")
        return output.read_bytes()


def verify_output(contract: dict, payload: bytes) -> None:
    entry = candidate(contract)
    try:
        source = payload.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ContractError("candidate output is not UTF-8 HTML") from error

    required = entry.get("required_output_contracts")
    forbidden = entry.get("forbidden_output_contracts")
    if not isinstance(required, list) or not required:
        raise ContractError("required_output_contracts must be non-empty")
    if not isinstance(forbidden, list) or not forbidden:
        raise ContractError("forbidden_output_contracts must be non-empty")
    for marker in required:
        if not isinstance(marker, str) or marker not in source:
            raise ContractError(f"required candidate output marker missing: {marker!r}")
    for marker in forbidden:
        if not isinstance(marker, str) or marker in source:
            raise ContractError(f"forbidden candidate output marker retained: {marker!r}")

    if source.count(APPROVED_PDF_URL) != 2:
        raise ContractError("approved PDF URL must occur exactly in policy and inlined config")
    if source.count("fetchApprovedPdf(url,") != 5:
        raise ContractError("candidate must contain one guarded fetch helper and four calls")
    if source.count("const response = await fetch(url, requestOptions);") != 1:
        raise ContractError("candidate native fetch boundary count is not exactly one")
    if source.count("fetch(url,") != 1:
        raise ContractError("candidate contains a PDF fetch outside the approved boundary")
    for marker in (
        'mode: "cors"',
        'credentials: "omit"',
        'referrerPolicy: "no-referrer"',
        'redirect: "error"',
    ):
        if source.count(marker) != 1:
            raise ContractError(f"candidate request policy marker count changed: {marker}")

    query_position = source.find("const pdfParameters =")
    resolution_position = source.find("const pdfUrl = resolveApprovedPdfUrl", query_position)
    preload_position = source.find("          showPreload();", query_position)
    if not (
        query_position >= 0
        and resolution_position > query_position
        and preload_position > resolution_position
    ):
        raise ContractError("PDF rejection no longer occurs before the loading surface")


def validate(contract: dict, tracked: set[str]) -> bytes:
    verify_contract_shape(contract)
    verify_supersession(contract)
    verify_active_urls(contract)
    verify_inputs(contract, tracked)
    verify_source_contracts(contract)
    verify_frozen_pdf(contract)
    first = isolated_build(contract)
    second = isolated_build(contract)
    if first != second:
        raise ContractError("isolated Montran allowlist builds are not byte-identical")
    entry = candidate(contract)
    actual = (len(first), digest(first))
    expected = (entry["expected_bytes"], entry["expected_sha256"])
    if actual != expected:
        raise ContractError(
            f"candidate output drift: actual={actual}, expected={expected}"
        )
    verify_output(contract, first)
    return first


def expect_failure(label: str, callback) -> None:
    try:
        callback()
    except ContractError:
        return
    raise ContractError(f"negative fixture unexpectedly passed: {label}")


def self_test(contract: dict, tracked: set[str], payload: bytes) -> None:
    wrong_schema = copy.deepcopy(contract)
    wrong_schema["schema_version"] = 2
    expect_failure("wrong schema", lambda: verify_contract_shape(wrong_schema))

    active_candidate = copy.deepcopy(contract)
    active_candidate["activation"] = "active"
    expect_failure("unproven activation", lambda: verify_contract_shape(active_candidate))

    changed_pdf = copy.deepcopy(contract)
    changed_pdf["approved_pdf"]["url"] = "https://example.test/report.pdf"
    expect_failure("approved URL drift", lambda: verify_contract_shape(changed_pdf))

    changed_supersession = copy.deepcopy(contract)
    changed_supersession["candidate"]["supersedes"]["sha256"] = "0" * 64
    expect_failure(
        "active supersession drift",
        lambda: verify_supersession(changed_supersession),
    )

    changed_input = copy.deepcopy(contract)
    changed_input["candidate"]["inputs"][0]["sha256"] = "0" * 64
    expect_failure("input hash drift", lambda: verify_inputs(changed_input, tracked))

    reduced_tracked = set(tracked)
    reduced_tracked.remove(contract["candidate"]["builder"])
    expect_failure("untracked builder", lambda: verify_inputs(contract, reduced_tracked))

    missing_marker = copy.deepcopy(contract)
    missing_marker["candidate"]["required_source_contracts"][0]["contains"][0] = (
        "missing-policy-marker"
    )
    expect_failure(
        "policy marker removal",
        lambda: verify_source_contracts(missing_marker),
    )

    home = HOME_PATH.read_text(encoding="utf-8")
    switched_home = home.replace(
        ACTIVE_VIEWER_URL,
        "https://freight.cargo.site/m/candidate/montran-booklet-direct-pdf-v18.html",
        1,
    )
    expect_failure(
        "Home-only activation",
        lambda: verify_active_urls(contract, home_source=switched_home),
    )

    manifest = load_json(DEPLOYMENT_MANIFEST_PATH)
    changed_manifest = copy.deepcopy(manifest)
    manifest_entry = next(
        item
        for item in changed_manifest["pages"]["home"]["embeds"]
        if item.get("kind") == "montran-booklet"
    )
    manifest_entry["version"] = "18"
    expect_failure(
        "manifest-only activation",
        lambda: verify_active_urls(contract, deployment_manifest=changed_manifest),
    )

    active = load_json(ACTIVE_CONTRACT_PATH)
    changed_active = copy.deepcopy(active)
    active_entry = next(
        item for item in changed_active["entries"]
        if item.get("kind") == "montran-booklet"
    )
    active_entry["expected_sha256"] = "0" * 64
    expect_failure(
        "active contract drift",
        lambda: verify_supersession(contract, active_contract=changed_active),
    )

    evidence = frozen_rows(ROOT / FROZEN_PDF_EVIDENCE)
    changed_evidence = copy.deepcopy(evidence)
    evidence_entry = next(
        row for row in changed_evidence
        if row.get("original_url") == APPROVED_PDF_URL
    )
    evidence_entry["sha256"] = "0" * 64
    expect_failure(
        "frozen PDF identity drift",
        lambda: verify_frozen_pdf(contract, rows=changed_evidence),
    )

    unsafe_output = payload.replace(b'redirect: "error"', b'redirect: "follow"', 1)
    expect_failure(
        "redirect policy removal",
        lambda: verify_output(contract, unsafe_output),
    )

    unguarded_output = payload.replace(
        b"const response = await fetch(url, requestOptions);",
        b"const response = await fetch(String(url), requestOptions);",
        1,
    )
    expect_failure(
        "native fetch boundary drift",
        lambda: verify_output(contract, unguarded_output),
    )

    print("Montran PDF allowlist negative fixtures: PASS (13 rejected)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    contract = load_json(CONTRACT_PATH)
    tracked = tracked_files()
    payload = validate(contract, tracked)
    if args.self_test:
        self_test(contract, tracked, payload)
    entry = candidate(contract)
    print(
        "Montran PDF allowlist candidate: PASS "
        f"{len(payload)} bytes sha256={digest(payload)} "
        f"activation={contract['activation']} wire={entry['wire_message_version']}"
    )


if __name__ == "__main__":
    try:
        main()
    except ContractError as error:
        raise SystemExit(f"Montran PDF allowlist candidate: FAIL: {error}")
