#!/usr/bin/env python3
"""Rebuild the active V7 and Montran embeds from tracked inputs only."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = ROOT / "audit/contracts/active-embed-builds.json"
REQUIRED_KINDS = {"v7-cup", "montran-booklet"}


class ContractError(RuntimeError):
    pass


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def tracked_files() -> set[str]:
    result = subprocess.run(
        ["git", "ls-files", "--cached"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return {line for line in result.stdout.splitlines() if line}


def frozen_entries(contract: dict) -> dict[str, dict]:
    frozen_path = ROOT / contract["frozen_evidence"]
    frozen = read_json(frozen_path)
    return {entry["kind"]: entry for entry in frozen["entries"]}


def verify_entry_set(contract: dict) -> None:
    entries = contract.get("entries")
    if not isinstance(entries, list):
        raise ContractError("active-embed contract entries must be a list")
    kinds = [entry.get("kind") for entry in entries if isinstance(entry, dict)]
    if len(kinds) != len(entries):
        raise ContractError("active-embed contract entries must be objects")
    if len(kinds) != len(set(kinds)):
        raise ContractError("active-embed contract contains duplicate kinds")
    if set(kinds) != REQUIRED_KINDS:
        missing = sorted(REQUIRED_KINDS - set(kinds))
        unexpected = sorted(set(kinds) - REQUIRED_KINDS)
        raise ContractError(
            "active-embed contract kind set mismatch: "
            f"missing={missing}, unexpected={unexpected}"
        )


def verify_source(entry: dict, tracked: set[str]) -> None:
    builder = entry["builder"]
    listed = [item["path"] for item in entry["inputs"]]
    if builder not in listed:
        raise ContractError(f"{entry['kind']}: builder is not a declared input")
    if len(listed) != len(set(listed)):
        raise ContractError(f"{entry['kind']}: duplicate declared input")

    for item in entry["inputs"]:
        relative = item["path"]
        if relative not in tracked:
            raise ContractError(f"{entry['kind']}: input is not Git-tracked: {relative}")
        source = ROOT / relative
        if not source.is_file():
            raise ContractError(f"{entry['kind']}: input is missing: {relative}")
        actual = sha256_bytes(source.read_bytes())
        if actual != item["sha256"]:
            raise ContractError(
                f"{entry['kind']}: input hash drift for {relative}: {actual}"
            )

    for marker_group in entry["required_contracts"]:
        relative = marker_group["path"]
        if relative not in listed:
            raise ContractError(
                f"{entry['kind']}: behavioral contract reads undeclared input: {relative}"
            )
        source_text = (ROOT / relative).read_text(encoding="utf-8")
        for marker in marker_group["contains"]:
            if marker not in source_text:
                raise ContractError(
                    f"{entry['kind']}: required contract missing from {relative}: {marker!r}"
                )


def verify_expected_output(entry: dict, payload: bytes, frozen: dict) -> None:
    actual_bytes = len(payload)
    actual_hash = sha256_bytes(payload)
    if actual_bytes != entry["expected_bytes"]:
        raise ContractError(
            f"{entry['kind']}: output size {actual_bytes} != {entry['expected_bytes']}"
        )
    if actual_hash != entry["expected_sha256"]:
        raise ContractError(
            f"{entry['kind']}: output hash {actual_hash} != {entry['expected_sha256']}"
        )
    if entry["expected_bytes"] != frozen["bytes"]:
        raise ContractError(f"{entry['kind']}: contract size diverges from frozen evidence")
    if entry["expected_sha256"] != frozen["sha256"]:
        raise ContractError(f"{entry['kind']}: contract hash diverges from frozen evidence")
    if entry["version"] != frozen["version"]:
        raise ContractError(f"{entry['kind']}: contract version diverges from frozen evidence")


def isolated_build(entry: dict) -> bytes:
    with tempfile.TemporaryDirectory(prefix=f"mms-{entry['kind']}-") as temp_dir:
        clean_root = Path(temp_dir) / "checkout"
        for item in entry["inputs"]:
            relative = Path(item["path"])
            destination = clean_root / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / relative, destination)

        output = clean_root / "build" / entry["output_name"]
        result = subprocess.run(
            [
                sys.executable,
                str(clean_root / entry["builder"]),
                "--output",
                str(output),
            ],
            cwd=clean_root,
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise ContractError(
                f"{entry['kind']}: isolated builder failed:\n{result.stdout}{result.stderr}"
            )
        return output.read_bytes()


def validate(contract: dict, tracked: set[str]) -> list[tuple[str, int, str]]:
    if contract.get("schema_version") != 1:
        raise ContractError("unsupported active-embed build contract schema")
    verify_entry_set(contract)
    frozen = frozen_entries(contract)
    results = []
    for entry in contract["entries"]:
        if entry["kind"] not in frozen:
            raise ContractError(f"{entry['kind']}: missing frozen embed evidence")
        verify_source(entry, tracked)
        first = isolated_build(entry)
        second = isolated_build(entry)
        if first != second:
            raise ContractError(f"{entry['kind']}: two isolated builds are not byte-identical")
        verify_expected_output(entry, first, frozen[entry["kind"]])
        results.append((entry["kind"], len(first), sha256_bytes(first)))
    return results


def expect_failure(label: str, callback) -> None:
    try:
        callback()
    except ContractError:
        return
    raise ContractError(f"self-test fixture unexpectedly passed: {label}")


def self_test(contract: dict, tracked: set[str]) -> None:
    entry = contract["entries"][0]

    missing_kind = copy.deepcopy(contract)
    missing_kind["entries"] = missing_kind["entries"][:1]
    expect_failure("missing required kind", lambda: verify_entry_set(missing_kind))

    duplicate_kind = copy.deepcopy(contract)
    duplicate_kind["entries"].append(copy.deepcopy(duplicate_kind["entries"][0]))
    expect_failure("duplicate kind", lambda: verify_entry_set(duplicate_kind))

    missing = copy.deepcopy(entry)
    missing["inputs"][0]["path"] = "work/v7-cup-src/does-not-exist.html"
    expect_failure("missing input", lambda: verify_source(missing, tracked))

    reduced_tracked = set(tracked)
    reduced_tracked.remove(entry["inputs"][0]["path"])
    expect_failure("untracked input", lambda: verify_source(entry, reduced_tracked))

    drifted_input = copy.deepcopy(entry)
    drifted_input["inputs"][0]["sha256"] = "0" * 64
    expect_failure("input drift", lambda: verify_source(drifted_input, tracked))

    missing_marker = copy.deepcopy(entry)
    missing_marker["required_contracts"][1]["contains"][0] = "missing-contract-marker"
    expect_failure("contract removal", lambda: verify_source(missing_marker, tracked))

    frozen = frozen_entries(contract)[entry["kind"]]
    approved_payload = isolated_build(entry)
    output_drift = copy.deepcopy(entry)
    output_drift["expected_sha256"] = "0" * 64
    expect_failure(
        "output drift",
        lambda: verify_expected_output(output_drift, approved_payload, frozen),
    )
    print("Active embed reproducibility negative fixtures: PASS (7 rejected)")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    contract = read_json(CONTRACT_PATH)
    tracked = tracked_files()
    if args.self_test:
        self_test(contract, tracked)
    for kind, size, digest in validate(contract, tracked):
        print(f"Active embed reproducibility: PASS {kind} {size} bytes sha256={digest}")


if __name__ == "__main__":
    try:
        main()
    except ContractError as error:
        raise SystemExit(f"Active embed reproducibility: FAIL: {error}")
