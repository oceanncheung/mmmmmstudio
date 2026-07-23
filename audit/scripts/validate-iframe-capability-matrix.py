#!/usr/bin/env python3
"""Validate the prepared minimum-capability policy for executable iframes."""

from __future__ import annotations

import argparse
import copy
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = ROOT / "audit/contracts/iframe-capability-matrix.json"
PROTOCOL_PATH = ROOT / "audit/contracts/embed-message-protocol-candidates.json"
MONTRAN_PATH = ROOT / "audit/contracts/montran-pdf-allowlist-candidate.json"
ACTIVE_PATH = ROOT / "audit/contracts/active-embed-builds.json"
REQUIRED_KINDS = ("v7-cup", "touchbaes", "montran-booklet")
REQUIRED_SANDBOX = {"allow-same-origin", "allow-scripts"}
FORBIDDEN_SANDBOX = {
    "allow-downloads",
    "allow-forms",
    "allow-modals",
    "allow-orientation-lock",
    "allow-pointer-lock",
    "allow-popups",
    "allow-popups-to-escape-sandbox",
    "allow-presentation",
    "allow-storage-access-by-user-activation",
    "allow-top-navigation",
    "allow-top-navigation-by-user-activation",
    "allow-top-navigation-to-custom-protocols",
}
DENIED_FEATURES = (
    "accelerometer",
    "aria-notify",
    "attribution-reporting",
    "autoplay",
    "bluetooth",
    "browsing-topics",
    "camera",
    "captured-surface-control",
    "ch-device-memory",
    "ch-downlink",
    "ch-dpr",
    "ch-ect",
    "ch-prefers-color-scheme",
    "ch-prefers-reduced-motion",
    "ch-prefers-reduced-transparency",
    "ch-rtt",
    "ch-save-data",
    "ch-ua",
    "ch-ua-arch",
    "ch-ua-bitness",
    "ch-ua-form-factors",
    "ch-ua-full-version",
    "ch-ua-full-version-list",
    "ch-ua-high-entropy-values",
    "ch-ua-mobile",
    "ch-ua-model",
    "ch-ua-platform",
    "ch-ua-platform-version",
    "ch-ua-wow64",
    "ch-viewport-height",
    "ch-viewport-width",
    "ch-width",
    "clipboard-read",
    "clipboard-write",
    "compute-pressure",
    "cross-origin-isolated",
    "deferred-fetch",
    "deferred-fetch-minimal",
    "digital-credentials-get",
    "display-capture",
    "encrypted-media",
    "fullscreen",
    "gamepad",
    "geolocation",
    "gyroscope",
    "hid",
    "identity-credentials-get",
    "idle-detection",
    "interest-cohort",
    "join-ad-interest-group",
    "keyboard-map",
    "language-detector",
    "language-model",
    "local-fonts",
    "local-network",
    "local-network-access",
    "loopback-network",
    "magnetometer",
    "microphone",
    "midi",
    "on-device-speech-recognition",
    "otp-credentials",
    "payment",
    "picture-in-picture",
    "private-aggregation",
    "private-state-token-issuance",
    "private-state-token-redemption",
    "publickey-credentials-create",
    "publickey-credentials-get",
    "run-ad-auction",
    "screen-wake-lock",
    "serial",
    "shared-storage",
    "shared-storage-select-url",
    "storage-access",
    "summarizer",
    "sync-xhr",
    "translator",
    "unload",
    "usb",
    "window-management",
    "xr-spatial-tracking",
)
EXPECTED_CAPABILITIES = {
    "v7-cup": (
        "script-execution",
        "same-origin-identity",
        "webgl",
        "request-animation-frame",
        "resize-observer",
        "intersection-observer",
        "parent-messaging",
    ),
    "touchbaes": (
        "script-execution",
        "same-origin-identity",
        "pointer-input",
        "css-animation",
        "parent-messaging",
    ),
    "montran-booklet": (
        "script-execution",
        "same-origin-identity",
        "blob-url",
        "module-worker",
        "cors-fetch",
        "range-fetch",
        "canvas",
        "pointer-input",
        "parent-messaging",
    ),
}
EXPECTED_BROWSER_PROOFS = {
    "v7-cup": (
        "origin-only-referrer",
        "non-null-child-origin",
        "ready-message",
        "rotation",
        "visibility-pause-resume",
    ),
    "touchbaes": (
        "origin-only-referrer",
        "non-null-child-origin",
        "mode-message",
        "ready-message",
        "size-message",
        "pointer-drag",
    ),
    "montran-booklet": (
        "origin-only-referrer",
        "non-null-child-origin",
        "ready-message",
        "pdf-range-without-credentials-or-referrer",
        "pages-19-20-rendered",
        "expanded-turn",
        "compact-parent-turn",
    ),
}
EXPECTED_BROWSER_TEST = "audit/harness/src/iframe-capability-test.mjs"
EXPECTED_PROOF_INPUTS = (
    EXPECTED_BROWSER_TEST,
    "audit/harness/src/montran-pdf-allowlist-test.mjs",
)
EXPECTED_NPM_SCRIPT = "node src/iframe-capability-test.mjs"
EXPECTED_PHASE2_COMMAND = '(cd "$ROOT/audit/harness" && npm run iframe-capability-test)'


class ContractError(RuntimeError):
    pass


class HomeParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.frames: dict[str, dict[str, str | None]] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "iframe":
            return
        values = dict(attrs)
        kind = values.get("data-embed-kind")
        if kind is None and values.get("data-slot") == "montran-booklet":
            kind = "montran-booklet"
        if kind not in REQUIRED_KINDS:
            return
        if kind in self.frames:
            raise ContractError(f"duplicate canonical iframe kind: {kind}")
        self.frames[kind] = values

    handle_startendtag = handle_starttag


def load(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ContractError(f"cannot read {path.relative_to(ROOT)}: {error}") from error


def tracked_files() -> set[str]:
    result = subprocess.run(
        ["git", "ls-files", "--cached"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return set(result.stdout.splitlines())


def parse_allow(value: str) -> dict[str, tuple[str, ...]]:
    directives: dict[str, tuple[str, ...]] = {}
    for raw_directive in value.split(";"):
        directive = raw_directive.strip()
        if not directive:
            raise ContractError("Permissions Policy contains an empty directive")
        parts = directive.split()
        if len(parts) < 2:
            raise ContractError(f"Permissions Policy directive has no allowlist: {directive!r}")
        feature, sources = parts[0], tuple(parts[1:])
        if feature in directives:
            raise ContractError(f"duplicate Permissions Policy feature: {feature}")
        directives[feature] = sources
    return directives


def verify_policy(contract: dict) -> None:
    if contract.get("schema_version") != 1:
        raise ContractError("unsupported iframe capability schema")
    if contract.get("issue") != "MMS-AUD-035":
        raise ContractError("iframe capability contract is not scoped to MMS-AUD-035")
    if contract.get("activation") != "prepared-not-active":
        raise ContractError("iframe capability policy changed activation without promotion evidence")
    if contract.get("required_origin_relation") != "cross-origin":
        raise ContractError("sandbox assumes a cross-origin parent/child relation")
    policy = contract.get("policy")
    if not isinstance(policy, dict):
        raise ContractError("iframe policy object is missing")
    tokens = policy.get("sandbox_tokens")
    if not isinstance(tokens, list) or set(tokens) != REQUIRED_SANDBOX or len(tokens) != len(set(tokens)):
        raise ContractError(f"sandbox tokens are not the exact minimum: {tokens}")
    if set(tokens) & FORBIDDEN_SANDBOX:
        raise ContractError("sandbox policy grants an unreviewed capability")
    if policy.get("referrerpolicy") != "strict-origin":
        raise ContractError("referrer policy must preserve only the parent origin")
    permissions = policy.get("permissions_policy")
    if not isinstance(permissions, dict):
        raise ContractError("Permissions Policy object is missing")
    if permissions.get("required_delegations") != []:
        raise ContractError("the embeds require no delegated Permissions Policy feature")
    denied = permissions.get("denied_features")
    if denied != list(DENIED_FEATURES):
        raise ContractError("audited denied-feature set or ordering changed")
    serialized = permissions.get("serialized")
    if not isinstance(serialized, str) or not serialized:
        raise ContractError("serialized Permissions Policy is missing")
    directives = parse_allow(serialized)
    if tuple(directives) != DENIED_FEATURES:
        raise ContractError("serialized Permissions Policy feature set or ordering changed")
    for feature, sources in directives.items():
        if sources != ("'none'",):
            raise ContractError(f"{feature}: iframe policy is not a deny-only directive")


def verify_entries(contract: dict) -> None:
    entries = contract.get("entries")
    if not isinstance(entries, list):
        raise ContractError("iframe capability entries must be a list")
    kinds = [entry.get("kind") for entry in entries if isinstance(entry, dict)]
    if tuple(kinds) != REQUIRED_KINDS or len(kinds) != len(set(kinds)):
        raise ContractError(f"iframe capability kind set/order mismatch: {kinds}")
    media_ids = [entry.get("media_id") for entry in entries]
    if media_ids != ["v7-01", "touchbaes-05", "montran-01"]:
        raise ContractError(f"iframe media identity mismatch: {media_ids}")
    for entry in entries:
        kind = entry["kind"]
        required = entry.get("required_capabilities")
        proofs = entry.get("browser_proofs")
        if required != list(EXPECTED_CAPABILITIES[kind]):
            raise ContractError(f"{kind}: exact required-capability contract drifted")
        if proofs != list(EXPECTED_BROWSER_PROOFS[kind]):
            raise ContractError(f"{kind}: exact browser-proof contract drifted")


def verify_candidate_identities(contract: dict) -> None:
    entries = {entry["kind"]: entry for entry in contract["entries"]}
    protocol = load(PROTOCOL_PATH)
    protocol_entries = {entry["kind"]: entry for entry in protocol["entries"]}
    montran_contract = load(MONTRAN_PATH)
    montran = montran_contract["candidate"]
    active = {entry["kind"]: entry for entry in load(ACTIVE_PATH)["entries"]}

    for kind in ("v7-cup", "touchbaes"):
        entry = entries[kind]
        source = protocol_entries[kind]
        if entry.get("candidate_contract") != str(PROTOCOL_PATH.relative_to(ROOT)):
            raise ContractError(f"{kind}: wrong candidate contract reference")
        if (entry.get("candidate_version"), entry.get("candidate_sha256")) != (
            source.get("version"), source.get("expected_sha256")
        ):
            raise ContractError(f"{kind}: prepared artifact identity drift")
        active_version = source["supersedes"]["version"]
        if str(entry.get("active_version")) != str(active_version):
            raise ContractError(f"{kind}: active version drift")

    entry = entries["montran-booklet"]
    if entry.get("candidate_contract") != str(MONTRAN_PATH.relative_to(ROOT)):
        raise ContractError("Montran: wrong candidate contract reference")
    if (entry.get("candidate_version"), entry.get("wire_message_version"), entry.get("candidate_sha256")) != (
        montran.get("version"), montran.get("wire_message_version"), montran.get("expected_sha256")
    ):
        raise ContractError("Montran prepared artifact identity drift")
    if entry.get("active_version") != active["montran-booklet"]["version"]:
        raise ContractError("Montran active version drift")


def canonical_frames(home_source: str) -> dict[str, dict[str, str | None]]:
    parser = HomeParser()
    parser.feed(home_source)
    if set(parser.frames) != set(REQUIRED_KINDS):
        raise ContractError(f"canonical iframe kind set mismatch: {sorted(parser.frames)}")
    return parser.frames


def verify_prepared_activation(
    contract: dict,
    home_sources: dict[str, str] | None = None,
    manifest: dict | None = None,
) -> None:
    if contract.get("activation") != "prepared-not-active":
        raise ContractError("prepared activation guard received a non-prepared contract")
    sources = home_sources or {
        "cargo/home.template.html": (ROOT / "cargo/home.template.html").read_text(encoding="utf-8"),
        "cargo/home.html": (ROOT / "cargo/home.html").read_text(encoding="utf-8"),
    }
    protocol_entries = {
        entry["kind"]: entry for entry in load(PROTOCOL_PATH)["entries"]
    }
    montran = load(MONTRAN_PATH)["candidate"]
    expected_urls = {
        "v7-cup": protocol_entries["v7-cup"]["supersedes"]["data_src"],
        "touchbaes": protocol_entries["touchbaes"]["supersedes"]["data_src"],
        "montran-booklet": montran["supersedes"]["data_src"],
    }
    policy_attrs = {"allow", "referrerpolicy", "sandbox"}
    for label, source in sources.items():
        frames = canonical_frames(source)
        for kind, frame in frames.items():
            if frame.get("data-src") != expected_urls[kind]:
                raise ContractError(f"{label} {kind}: active iframe URL changed during preparation")
            present = policy_attrs & set(frame)
            if present:
                raise ContractError(f"{label} {kind}: policy activated before atomic promotion: {sorted(present)}")

    deployment = manifest or load(ROOT / "cargo/deployment-manifest.json")
    manifest_entries = {
        entry.get("kind"): entry
        for entry in deployment.get("pages", {}).get("home", {}).get("embeds", [])
        if entry.get("kind") in REQUIRED_KINDS
    }
    if set(manifest_entries) != set(REQUIRED_KINDS):
        raise ContractError(f"deployment iframe kind set mismatch: {sorted(manifest_entries)}")
    for kind, entry in manifest_entries.items():
        attributes = entry.get("attributes")
        if not isinstance(attributes, dict):
            raise ContractError(f"manifest {kind}: attributes are missing")
        if attributes.get("data-src") != expected_urls[kind]:
            raise ContractError(f"manifest {kind}: active iframe URL changed during preparation")
        present = policy_attrs & set(attributes)
        if present:
            raise ContractError(f"manifest {kind}: policy activated before atomic promotion: {sorted(present)}")


def verify_tracked_inputs(contract: dict, tracked: set[str]) -> None:
    required = {
        str(CONTRACT_PATH.relative_to(ROOT)),
        str(Path(__file__).resolve().relative_to(ROOT)),
        contract.get("browser_test"),
        *contract.get("proof_inputs", {}).keys(),
        str(PROTOCOL_PATH.relative_to(ROOT)),
        str(MONTRAN_PATH.relative_to(ROOT)),
        str(ACTIVE_PATH.relative_to(ROOT)),
        "cargo/home.template.html",
        "cargo/home.html",
        "cargo/deployment-manifest.json",
    }
    if None in required:
        raise ContractError("browser test path is missing")
    for relative in sorted(required):
        if relative not in tracked:
            raise ContractError(f"iframe capability input is not Git-tracked: {relative}")
        if not (ROOT / relative).is_file():
            raise ContractError(f"iframe capability input is missing: {relative}")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_proof_inputs(contract: dict, content_overrides: dict[str, bytes] | None = None) -> None:
    if contract.get("browser_test") != EXPECTED_BROWSER_TEST:
        raise ContractError("iframe capability browser-test path drifted")
    proof_inputs = contract.get("proof_inputs")
    if not isinstance(proof_inputs, dict) or tuple(proof_inputs) != EXPECTED_PROOF_INPUTS:
        raise ContractError("iframe capability proof-input set or ordering drifted")
    overrides = content_overrides or {}
    for relative in EXPECTED_PROOF_INPUTS:
        expected = proof_inputs.get(relative)
        if not isinstance(expected, str) or len(expected) != 64:
            raise ContractError(f"invalid proof-input digest: {relative}")
        content = overrides.get(relative)
        actual = hashlib.sha256(content).hexdigest() if content is not None else digest(ROOT / relative)
        if actual != expected:
            raise ContractError(f"iframe capability proof input drifted: {relative}")


def verify_test_wiring(package: dict | None = None, phase2_source: str | None = None) -> None:
    package_data = package or load(ROOT / "audit/harness/package.json")
    scripts = package_data.get("scripts")
    if not isinstance(scripts, dict) or scripts.get("iframe-capability-test") != EXPECTED_NPM_SCRIPT:
        raise ContractError("iframe capability npm wiring drifted")
    source = phase2_source
    if source is None:
        source = (ROOT / "audit/scripts/validate-phase2.sh").read_text(encoding="utf-8")
    if source.count(EXPECTED_PHASE2_COMMAND) != 1:
        raise ContractError("iframe capability Phase 2 wiring drifted")


def validate(contract: dict, tracked: set[str]) -> None:
    verify_policy(contract)
    verify_entries(contract)
    verify_candidate_identities(contract)
    verify_prepared_activation(contract)
    verify_tracked_inputs(contract, tracked)
    verify_proof_inputs(contract)
    verify_test_wiring()


def expect_failure(label: str, callback) -> None:
    try:
        callback()
    except ContractError:
        return
    raise ContractError(f"negative fixture unexpectedly passed: {label}")


def self_test(contract: dict, tracked: set[str]) -> None:
    fixtures = []

    wrong_issue = copy.deepcopy(contract)
    wrong_issue["issue"] = "MMS-AUD-000"
    fixtures.append(("wrong issue", lambda: verify_policy(wrong_issue)))

    extra_token = copy.deepcopy(contract)
    extra_token["policy"]["sandbox_tokens"].append("allow-popups")
    fixtures.append(("extra sandbox grant", lambda: verify_policy(extra_token)))

    missing_origin = copy.deepcopy(contract)
    missing_origin["policy"]["sandbox_tokens"].remove("allow-same-origin")
    fixtures.append(("missing origin identity", lambda: verify_policy(missing_origin)))

    no_referrer = copy.deepcopy(contract)
    no_referrer["policy"]["referrerpolicy"] = "no-referrer"
    fixtures.append(("referrer bootstrap removed", lambda: verify_policy(no_referrer)))

    missing_denial = copy.deepcopy(contract)
    missing_denial["policy"]["permissions_policy"]["denied_features"].pop()
    fixtures.append(("denied feature removed", lambda: verify_policy(missing_denial)))

    granted_camera = copy.deepcopy(contract)
    granted_camera["policy"]["permissions_policy"]["serialized"] = granted_camera[
        "policy"
    ]["permissions_policy"]["serialized"].replace("camera 'none'", "camera *")
    fixtures.append(("permission granted", lambda: verify_policy(granted_camera)))

    bare_camera = copy.deepcopy(contract)
    bare_camera["policy"]["permissions_policy"]["serialized"] = bare_camera[
        "policy"
    ]["permissions_policy"]["serialized"].replace("camera 'none'", "camera")
    fixtures.append(("permission directive without allowlist", lambda: verify_policy(bare_camera)))

    missing_kind = copy.deepcopy(contract)
    missing_kind["entries"] = missing_kind["entries"][:-1]
    fixtures.append(("missing embed kind", lambda: verify_entries(missing_kind)))

    missing_proof = copy.deepcopy(contract)
    missing_proof["entries"][1]["browser_proofs"].remove("pointer-drag")
    fixtures.append(("required browser proof removed", lambda: verify_entries(missing_proof)))

    drifted_artifact = copy.deepcopy(contract)
    drifted_artifact["entries"][0]["candidate_sha256"] = "0" * 64
    fixtures.append(("candidate artifact drift", lambda: verify_candidate_identities(drifted_artifact)))

    template = (ROOT / "cargo/home.template.html").read_text(encoding="utf-8")
    one_sided = template.replace(
        'data-embed-kind="v7-cup"',
        'data-embed-kind="v7-cup" sandbox="allow-scripts allow-same-origin"',
        1,
    )
    fixtures.append((
        "one-sided Cargo activation",
        lambda: verify_prepared_activation(
            contract,
            home_sources={"cargo/home.template.html": one_sided},
        ),
    ))

    manifest = load(ROOT / "cargo/deployment-manifest.json")
    drifted_manifest = copy.deepcopy(manifest)
    drifted_manifest["pages"]["home"]["embeds"][0]["attributes"]["allow"] = "camera 'none'"
    fixtures.append((
        "manifest-only activation",
        lambda: verify_prepared_activation(contract, manifest=drifted_manifest),
    ))

    untracked = set(tracked)
    untracked.discard(contract["browser_test"])
    fixtures.append(("untracked browser proof", lambda: verify_tracked_inputs(contract, untracked)))

    proof_drift = {
        relative: (ROOT / relative).read_bytes()
        for relative in EXPECTED_PROOF_INPUTS
    }
    proof_drift[EXPECTED_BROWSER_TEST] = b"export default function noOp() {}\n"
    fixtures.append(("browser proof implementation drift", lambda: verify_proof_inputs(contract, proof_drift)))

    package = load(ROOT / "audit/harness/package.json")
    drifted_package = copy.deepcopy(package)
    drifted_package["scripts"]["iframe-capability-test"] = "node -e 'process.exit(0)'"
    fixtures.append(("npm proof wiring drift", lambda: verify_test_wiring(package=drifted_package)))

    phase2_source = (ROOT / "audit/scripts/validate-phase2.sh").read_text(encoding="utf-8")
    fixtures.append((
        "Phase 2 proof wiring removed",
        lambda: verify_test_wiring(
            phase2_source=phase2_source.replace(EXPECTED_PHASE2_COMMAND, "", 1),
        ),
    ))

    for label, callback in fixtures:
        expect_failure(label, callback)
    print(f"Iframe capability matrix negative fixtures: PASS ({len(fixtures)} rejected)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    contract = load(CONTRACT_PATH)
    tracked = tracked_files()
    if args.self_test:
        self_test(contract, tracked)
    validate(contract, tracked)
    print("Iframe capability matrix: PASS (3 prepared embeds, policy not active)")


if __name__ == "__main__":
    try:
        main()
    except ContractError as error:
        raise SystemExit(f"Iframe capability matrix: FAIL: {error}")
