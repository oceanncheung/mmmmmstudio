#!/usr/bin/env python3
"""Validate the prepared, response-header-only plan for MMS-AUD-037."""

from __future__ import annotations

import argparse
import copy
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = ROOT / "audit/contracts/public-response-header-policy.json"
EVIDENCE_PATH = ROOT / "audit/findings/evidence/2026-07-23-round98-public-response-headers.json"
PHASE2_PATH = ROOT / "audit/scripts/validate-phase2.sh"
EXPECTED_PHASE2_COMMAND = (
    'python3 "$ROOT/audit/scripts/validate-public-response-header-policy.py" --self-test'
)
EXPECTED_ROUTES = ("/", "/who", "/write")
EXPECTED_DOCUMENT_URLS = (
    "https://mmmmm.studio/",
    "https://mmmmm.studio/who",
    "https://mmmmm.studio/write",
)
REQUIRED_HEADERS = (
    "content-security-policy",
    "content-security-policy-report-only",
    "reporting-endpoints",
    "referrer-policy",
    "permissions-policy",
    "x-content-type-options",
    "x-frame-options",
    "strict-transport-security",
)
EXPECTED_FREIGHT_KINDS = (
    "v7-embed",
    "touchbaes-embed",
    "montran-embed",
    "montran-pdf",
    "v7-poster",
    "montran-video",
)
EXPECTED_FREIGHT_RESPONSES = {
    "v7-embed": (200, "text/html", None),
    "touchbaes-embed": (200, "text/html", None),
    "montran-embed": (200, "text/html", None),
    "montran-pdf": (206, "application/pdf", "bytes 0-0/13634937"),
    "v7-poster": (206, "image/png", "bytes 0-0/109092"),
    "montran-video": (206, "video/mp4", "bytes 0-0/712303"),
}
EXPECTED_RUNTIME_ORIGINS = (
    "https://build.cargo.site",
    "https://freight.cargo.site",
    "https://static.cargo.site",
    "https://type.cargo.site",
)
EXPECTED_DIRECTIVES = (
    "default-src",
    "base-uri",
    "object-src",
    "form-action",
    "script-src",
    "style-src",
    "img-src",
    "media-src",
    "font-src",
    "connect-src",
    "frame-src",
    "worker-src",
    "frame-ancestors",
)
EXPECTED_STAGES = (
    "owner-confirmation",
    "report-only-discovery",
    "compatibility-verification",
    "enforcement",
)
EXPECTED_CARGO_HTML = (
    "cargo/site-head.html",
    "cargo/home.html",
    "cargo/who.html",
    "cargo/write.html",
)
EXPECTED_FROZEN = {
    "/": (
        "docs/audits/2026-07-20T175853-0400-round-80/public/home.headers",
        "513e96be59f92e1e1ee20255847d21010fb996f68ae327482a46c961bc08f27c",
    ),
    "/who": (
        "docs/audits/2026-07-20T175853-0400-round-80/public/who.headers",
        "72c2d3b4d83dc32d6ebf4167e749f16b745d8387ac07f1e676b0c91a5220c011",
    ),
    "/write": (
        "docs/audits/2026-07-20T175853-0400-round-80/public/write.headers",
        "df5bd17536124305e0fb0e1a902163551d04a0f8febc7e4e05af5b325688180e",
    ),
}
REQUIRED_OFFICIAL_URLS = {
    "https://docs.cargo.site/css-and-html",
    "https://docs.cargo.site/dns-editing",
    "https://docs.cargo.site/domains-purchased-elsewhere",
    "https://www.w3.org/TR/CSP3/",
    "https://www.w3.org/TR/permissions-policy-1/",
    "https://fetch.spec.whatwg.org/#x-content-type-options-header",
    "https://www.rfc-editor.org/rfc/rfc6797",
}


class ContractError(RuntimeError):
    pass


class MetaParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.http_equiv: list[str] = []
        self.names: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "meta":
            return
        values = {name.lower(): value for name, value in attrs}
        value = values.get("http-equiv")
        if value:
            self.http_equiv.append(value.strip().lower())
        name = values.get("name")
        if name:
            self.names.append(name.strip().lower())

    handle_startendtag = handle_starttag


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ContractError(f"cannot read {path.relative_to(ROOT)}: {error}") from error
    if not isinstance(value, dict):
        raise ContractError(f"{path.relative_to(ROOT)} must contain a JSON object")
    return value


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def tracked_files() -> set[str]:
    result = subprocess.run(
        ["git", "ls-files", "--cached"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return set(result.stdout.splitlines())


def exact_list(value: object, expected: tuple[str, ...], label: str) -> None:
    if value != list(expected):
        raise ContractError(f"{label} set or order drifted: {value!r}")


def verify_contract_shape(contract: dict) -> None:
    if contract.get("schema_version") != 1:
        raise ContractError("unsupported public response-header policy schema")
    if contract.get("issue") != "MMS-AUD-037":
        raise ContractError("public response-header policy is not scoped to MMS-AUD-037")
    if contract.get("activation") != "prepared-not-active":
        raise ContractError("response-header activation changed without promotion evidence")

    scope = contract.get("scope")
    if not isinstance(scope, dict):
        raise ContractError("scope is missing")
    if scope.get("canonical_origin") != "https://mmmmm.studio":
        raise ContractError("canonical first-party origin drifted")
    exact_list(scope.get("document_routes"), EXPECTED_ROUTES, "document route")
    if scope.get("freight_origin") != "https://freight.cargo.site":
        raise ContractError("Freight origin drifted")
    if scope.get("freight_covered_by_first_party_policy") is not False:
        raise ContractError("first-party policy falsely claims Freight response coverage")

    delivery = contract.get("delivery")
    if not isinstance(delivery, dict):
        raise ContractError("delivery contract is missing")
    if delivery.get("required_mechanism") != "http-response-headers":
        raise ContractError("policy must be delivered as HTTP response headers")
    if delivery.get("header_owner") is not None:
        raise ContractError("header owner was selected without an approved capability decision")
    if delivery.get("candidate_owners") != [
        "Cargo support-confirmed response-header control",
        "separately approved first-party edge",
    ]:
        raise ContractError("candidate response-header owner set drifted")
    if delivery.get("cargo_self_service_capability") != "not-documented":
        raise ContractError("Cargo self-service capability must remain accurately unconfirmed")
    if delivery.get("cargo_internal_capability") != "unconfirmed":
        raise ContractError("Cargo internal capability was claimed without support evidence")
    if delivery.get("external_edge_requires_separate_approval") is not True:
        raise ContractError("external edge approval gate was removed")
    if delivery.get("meta_substitution_permitted") is not False:
        raise ContractError("meta delivery cannot close this response-header issue")
    exact_list(
        delivery.get("forbidden_meta_substitutions"),
        (
            "content-security-policy",
            "content-security-policy-report-only",
            "permissions-policy",
            "x-content-type-options",
            "x-frame-options",
            "strict-transport-security",
        ),
        "forbidden meta substitution",
    )

    official = contract.get("official_capability_evidence")
    if not isinstance(official, list) or len(official) != len(REQUIRED_OFFICIAL_URLS):
        raise ContractError("official capability evidence set is incomplete")
    urls = {entry.get("url") for entry in official if isinstance(entry, dict)}
    if urls != REQUIRED_OFFICIAL_URLS:
        raise ContractError(f"official capability evidence URL drift: {sorted(urls)}")
    if any(not entry.get("finding") for entry in official):
        raise ContractError("official capability evidence requires a finding for every source")


def verify_evidence(contract: dict, evidence: dict) -> None:
    block = contract.get("evidence")
    if not isinstance(block, dict):
        raise ContractError("evidence contract is missing")
    exact_list(block.get("required_absent_headers"), REQUIRED_HEADERS, "required absent header")
    frozen = block.get("frozen_headers")
    if not isinstance(frozen, list) or len(frozen) != len(EXPECTED_FROZEN):
        raise ContractError("frozen response-header evidence set is incomplete")
    seen_routes: list[str] = []
    for entry in frozen:
        if not isinstance(entry, dict):
            raise ContractError("frozen header entry must be an object")
        route = entry.get("route")
        seen_routes.append(route)
        if route not in EXPECTED_FROZEN:
            raise ContractError(f"unexpected frozen route: {route!r}")
        expected_path, expected_hash = EXPECTED_FROZEN[route]
        if (entry.get("path"), entry.get("sha256")) != (expected_path, expected_hash):
            raise ContractError(f"{route}: frozen header identity drifted")
        path = ROOT / expected_path
        if not path.is_file() or sha256(path) != expected_hash:
            raise ContractError(f"{route}: frozen header evidence changed")
    if tuple(seen_routes) != EXPECTED_ROUTES:
        raise ContractError(f"frozen route order drifted: {seen_routes}")

    expected_live = str(EVIDENCE_PATH.relative_to(ROOT))
    if block.get("live_observation") != expected_live:
        raise ContractError("live response-header evidence reference drifted")
    if evidence.get("schema_version") != 1 or evidence.get("issue") != "MMS-AUD-037":
        raise ContractError("live evidence schema or issue drifted")
    if evidence.get("mode") != "read-only-live-observation":
        raise ContractError("live evidence must remain a read-only observation")
    if evidence.get("request_contract") != {
        "documents": "HTTP/2 GET with a browser-like user agent",
        "freight_embeds": "HTTP/2 GET with https://mmmmm.studio/ as Referer",
        "freight_assets": "HTTP/2 GET with Range: bytes=0-0 and https://mmmmm.studio/ as Referer",
        "http_redirect": "HTTP/1.1 GET without following the redirect",
        "timeout_seconds": 20,
        "response_body_saved": False,
    }:
        raise ContractError("live request method or boundary evidence drifted")
    exact_list(evidence.get("required_policy_headers"), REQUIRED_HEADERS, "live required header")
    documents = evidence.get("first_party_documents")
    if not isinstance(documents, list) or len(documents) != len(EXPECTED_DOCUMENT_URLS):
        raise ContractError("live first-party document evidence is incomplete")
    if tuple(entry.get("url") for entry in documents) != EXPECTED_DOCUMENT_URLS:
        raise ContractError("live first-party URL set or order drifted")
    for entry in documents:
        if entry.get("status") != 200:
            raise ContractError(f"{entry.get('url')}: live document status is not 200")
        headers = entry.get("headers")
        if not isinstance(headers, dict) or headers.get("server") != "Cargo":
            raise ContractError(f"{entry.get('url')}: live Cargo response evidence is incomplete")
        observed = {name.lower() for name in headers}
        if observed & set(REQUIRED_HEADERS):
            raise ContractError(f"{entry.get('url')}: evidence contradicts its missing-header claim")
        exact_list(entry.get("missing_policy_headers"), REQUIRED_HEADERS, "live missing header")
    redirect = evidence.get("http_redirect")
    if not isinstance(redirect, dict) or (
        redirect.get("url"), redirect.get("status"), redirect.get("location"), redirect.get("server")
    ) != ("http://mmmmm.studio/", 301, "https://mmmmm.studio/", "Cargo"):
        raise ContractError("HTTP-to-HTTPS redirect evidence drifted")

    samples = evidence.get("freight_samples")
    if not isinstance(samples, list):
        raise ContractError("Freight sample evidence is missing")
    exact_list([entry.get("kind") for entry in samples], EXPECTED_FREIGHT_KINDS, "Freight sample kind")
    home = (ROOT / "cargo/home.html").read_text(encoding="utf-8")
    for entry in samples:
        kind = entry.get("kind")
        url = entry.get("url")
        if not isinstance(url, str) or not url.startswith("https://freight.cargo.site/"):
            raise ContractError(f"{kind}: Freight sample URL is invalid")
        identity = url.split("/i/", 1)[-1].split("/", 1)[0] if "/i/" in url else url.split("/m/", 1)[-1].split("/", 1)[0]
        if identity not in home:
            raise ContractError(f"{kind}: sampled Freight identity is not canonical Home content")
        expected_status, expected_type, expected_range = EXPECTED_FREIGHT_RESPONSES[kind]
        if (entry.get("status"), entry.get("content_type"), entry.get("content_range")) != (
            expected_status,
            expected_type,
            expected_range,
        ):
            raise ContractError(f"{kind}: Freight status, content type, or range drifted")
        observed = entry.get("observed_headers")
        if not isinstance(observed, dict) or not observed:
            raise ContractError(f"{kind}: actual Freight response-header map is missing")
        if any(not isinstance(name, str) or name != name.lower() for name in observed):
            raise ContractError(f"{kind}: Freight response-header names must be normalized lowercase")
        if set(observed) & set(REQUIRED_HEADERS):
            raise ContractError(f"{kind}: evidence contradicts its missing-header claim")
        if observed.get("content-type") != expected_type:
            raise ContractError(f"{kind}: observed Freight content type drifted")
        if observed.get("access-control-allow-origin") != "*":
            raise ContractError(f"{kind}: observed Freight CORS boundary drifted")
        if not observed.get("date") or not observed.get("cache-control") or not observed.get("x-cache"):
            raise ContractError(f"{kind}: observed Freight response map is incomplete")
        if expected_status == 200:
            if observed.get("server") != "nginx" or observed.get("content-encoding") != "gzip":
                raise ContractError(f"{kind}: observed Freight embed delivery drifted")
            if "content-range" in observed:
                raise ContractError(f"{kind}: non-range embed unexpectedly records Content-Range")
        else:
            if observed.get("content-length") != "1" or observed.get("content-range") != expected_range:
                raise ContractError(f"{kind}: observed Freight byte-range evidence drifted")
        exact_list(entry.get("missing_policy_headers"), REQUIRED_HEADERS, "Freight missing header")


def verify_candidate(contract: dict) -> None:
    inventory = contract.get("runtime_origin_inventory")
    if not isinstance(inventory, dict):
        raise ContractError("runtime origin inventory is missing")
    if inventory.get("source") != "audit/inventory/system-inventory.md":
        raise ContractError("runtime origin inventory source drifted")
    if inventory.get("first_party") != ["https://mmmmm.studio"]:
        raise ContractError("first-party runtime origin drifted")
    exact_list(inventory.get("page_runtime"), EXPECTED_RUNTIME_ORIGINS, "page runtime origin")
    if inventory.get("operational_only") != ["https://api.cargo.site"]:
        raise ContractError("operational-only origin classification drifted")

    candidate = contract.get("candidate_policy")
    if not isinstance(candidate, dict) or candidate.get("state") != "discovery-not-final":
        raise ContractError("candidate policy must remain discovery-not-final")
    if candidate.get("reporting_endpoint") is not None:
        raise ContractError("reporting endpoint was selected without privacy and operation approval")
    csp = candidate.get("csp")
    if not isinstance(csp, dict):
        raise ContractError("CSP discovery contract is missing")
    if csp.get("first_delivery") != "content-security-policy-report-only":
        raise ContractError("CSP must begin in report-only mode")
    exact_list(csp.get("required_directives"), EXPECTED_DIRECTIVES, "CSP directive")
    expected_origins = ("https://mmmmm.studio",) + EXPECTED_RUNTIME_ORIGINS
    exact_list(csp.get("known_required_origins"), expected_origins, "known CSP origin")
    if csp.get("forbidden_sources") != ["*", "http:", "'unsafe-eval'"]:
        raise ContractError("CSP forbidden-source contract drifted")
    if csp.get("frame_ancestors_decision") != "pending-cargo-editor-and-preview-discovery":
        raise ContractError("frame-ancestors was guessed before Cargo framing discovery")
    if csp.get("exact_value") is not None:
        raise ContractError("an exact CSP was activated before report-only discovery")
    if candidate.get("referrer_policy") != "strict-origin":
        raise ContractError("referrer policy candidate must preserve exact-origin child bootstrap")
    permissions = candidate.get("permissions_policy")
    if not isinstance(permissions, dict) or permissions.get("state") != "candidate-after-capability-and-browser-proof":
        raise ContractError("Permissions Policy must remain gated by capability and browser proof")
    if permissions.get("positive_candidates") != ["autoplay=(self)"]:
        raise ContractError("Permissions Policy positive candidate drifted")
    if permissions.get("denied_feature_inventory") != "audit/contracts/iframe-capability-matrix.json":
        raise ContractError("Permissions Policy denied-feature inventory drifted")
    if candidate.get("x_content_type_options") != "nosniff":
        raise ContractError("nosniff candidate drifted")
    frame = candidate.get("frame_protection")
    if not isinstance(frame, dict) or frame != {
        "state": "pending-cargo-editor-and-preview-discovery",
        "x_frame_options_candidate": "DENY",
    }:
        raise ContractError("frame protection was guessed before Cargo framing discovery")
    hsts = candidate.get("hsts")
    if not isinstance(hsts, dict) or hsts.get("state") != "canary-after-owner-confirmation":
        raise ContractError("HSTS state drifted")
    if hsts.get("max_age_ramp_seconds") != [300, 86400, 31536000]:
        raise ContractError("HSTS canary ramp drifted")
    if hsts.get("include_subdomains") is not False or hsts.get("preload") is not False:
        raise ContractError("HSTS subdomains or preload were enabled before the host audit")

    stages = contract.get("stages")
    if not isinstance(stages, list):
        raise ContractError("policy stages are missing")
    exact_list([stage.get("id") for stage in stages], EXPECTED_STAGES, "policy stage")
    if any(not isinstance(stage.get("requirements"), list) or not stage["requirements"] for stage in stages):
        raise ContractError("each policy stage requires explicit evidence")
    gates = contract.get("promotion_gates")
    if not isinstance(gates, list) or len(gates) != 10 or len(gates) != len(set(gates)):
        raise ContractError("promotion gate set drifted")
    required_gate_terms = (
        "header_owner is null",
        "reporting_endpoint is null",
        "CSP exact_value is null",
        "meta tag",
        "all three canonical document routes",
        "Freight response coverage",
        "Cargo editor and preview",
        "HSTS includeSubDomains and preload",
        "Cargo reload",
        "protected visual and interaction contracts",
    )
    for term in required_gate_terms:
        if sum(term in gate for gate in gates) != 1:
            raise ContractError(f"promotion gate missing or duplicated: {term}")


def verify_prepared_state(contract: dict, head_source: str | None = None) -> None:
    guards = contract.get("prepared_state_guards")
    if not isinstance(guards, dict):
        raise ContractError("prepared-state guards are missing")
    exact_list(guards.get("cargo_html"), EXPECTED_CARGO_HTML, "prepared Cargo HTML")
    if guards.get("deployment_manifest") != "cargo/deployment-manifest.json":
        raise ContractError("deployment-manifest guard drifted")
    exact_list(guards.get("forbidden_manifest_keys"), REQUIRED_HEADERS, "forbidden manifest key")

    forbidden = set(REQUIRED_HEADERS)
    for relative in EXPECTED_CARGO_HTML:
        path = ROOT / relative
        if not path.is_file():
            raise ContractError(f"prepared Cargo HTML is missing: {relative}")
        source = head_source if relative == "cargo/site-head.html" and head_source is not None else path.read_text(encoding="utf-8")
        parser = MetaParser()
        parser.feed(source)
        bad = sorted(set(parser.http_equiv) & forbidden)
        if bad:
            raise ContractError(f"{relative}: response-header policy was faked through meta: {bad}")
        if "referrer" in parser.names:
            raise ContractError(f"{relative}: meta referrer policy cannot close the response-header contract")
        source_lower = source.lower()
        dynamic_tokens = sorted(token for token in forbidden if token in source_lower)
        if dynamic_tokens:
            raise ContractError(f"{relative}: scripted or raw response-policy token found: {dynamic_tokens}")

    manifest = load_json(ROOT / "cargo/deployment-manifest.json")

    def walk_keys(value: object) -> list[str]:
        keys: list[str] = []
        if isinstance(value, dict):
            for key, child in value.items():
                keys.append(str(key).strip().lower())
                keys.extend(walk_keys(child))
        elif isinstance(value, list):
            for child in value:
                keys.extend(walk_keys(child))
        return keys

    bad_keys = sorted(set(walk_keys(manifest)) & forbidden)
    if bad_keys:
        raise ContractError(f"deployment manifest prematurely claims response headers: {bad_keys}")


def verify_wiring(phase2_source: str | None = None) -> None:
    if phase2_source is None:
        phase2_source = PHASE2_PATH.read_text(encoding="utf-8")
    if phase2_source.count(EXPECTED_PHASE2_COMMAND) != 1:
        raise ContractError("Phase 2 response-header validator wiring drifted")

    required = {
        str(CONTRACT_PATH.relative_to(ROOT)),
        str(EVIDENCE_PATH.relative_to(ROOT)),
        str(Path(__file__).resolve().relative_to(ROOT)),
    }
    missing = sorted(required - tracked_files())
    if missing:
        raise ContractError(f"response-header contract input is not Git-tracked: {missing}")


def verify(
    contract: dict | None = None,
    evidence: dict | None = None,
    *,
    head_source: str | None = None,
    phase2_source: str | None = None,
    check_wiring: bool = True,
) -> None:
    contract = load_json(CONTRACT_PATH) if contract is None else contract
    evidence = load_json(EVIDENCE_PATH) if evidence is None else evidence
    verify_contract_shape(contract)
    verify_evidence(contract, evidence)
    verify_candidate(contract)
    verify_prepared_state(contract, head_source=head_source)
    if check_wiring:
        verify_wiring(phase2_source=phase2_source)


def expect_failure(label: str, action) -> None:
    try:
        action()
    except ContractError:
        return
    raise ContractError(f"negative fixture unexpectedly passed: {label}")


def self_test() -> None:
    contract = load_json(CONTRACT_PATH)
    evidence = load_json(EVIDENCE_PATH)
    verify(contract, evidence)

    mutations: list[tuple[str, callable]] = []

    def contract_case(label: str, mutate) -> None:
        changed = copy.deepcopy(contract)
        mutate(changed)
        mutations.append((label, lambda value=changed: verify(value, evidence, check_wiring=False)))

    def evidence_case(label: str, mutate) -> None:
        changed = copy.deepcopy(evidence)
        mutate(changed)
        mutations.append((label, lambda value=changed: verify(contract, value, check_wiring=False)))

    contract_case("wrong issue", lambda value: value.__setitem__("issue", "MMS-AUD-035"))
    contract_case("premature activation", lambda value: value.__setitem__("activation", "active"))
    contract_case("false Cargo capability", lambda value: value["delivery"].__setitem__("cargo_self_service_capability", "supported"))
    contract_case("selected owner without evidence", lambda value: value["delivery"].__setitem__("header_owner", "Cargo"))
    contract_case("meta substitution", lambda value: value["delivery"].__setitem__("meta_substitution_permitted", True))
    contract_case("Freight coverage claim", lambda value: value["scope"].__setitem__("freight_covered_by_first_party_policy", True))
    contract_case("missing frozen route", lambda value: value["evidence"]["frozen_headers"].pop())
    contract_case("unapproved reporting endpoint", lambda value: value["candidate_policy"].__setitem__("reporting_endpoint", "https://example.test/report"))
    contract_case("premature exact CSP", lambda value: value["candidate_policy"]["csp"].__setitem__("exact_value", "default-src 'none'"))
    contract_case("wildcard required origin", lambda value: value["candidate_policy"]["csp"]["known_required_origins"].append("*"))
    contract_case("unsafe eval accepted", lambda value: value["candidate_policy"]["csp"]["forbidden_sources"].remove("'unsafe-eval'"))
    contract_case("stage order drift", lambda value: value["stages"].reverse())
    contract_case("premature HSTS subdomains", lambda value: value["candidate_policy"]["hsts"].__setitem__("include_subdomains", True))
    contract_case("missing promotion gate", lambda value: value["promotion_gates"].pop())
    contract_case("prepared guard removed", lambda value: value["prepared_state_guards"]["cargo_html"].pop())

    evidence_case("wrong evidence issue", lambda value: value.__setitem__("issue", "MMS-AUD-035"))
    evidence_case("request boundary drift", lambda value: value["request_contract"].__setitem__("freight_assets", "HEAD"))
    evidence_case("missing document route", lambda value: value["first_party_documents"].pop())
    evidence_case("policy header observed and missing", lambda value: value["first_party_documents"][0]["headers"].__setitem__("content-security-policy", "default-src 'none'"))
    evidence_case("missing header claim removed", lambda value: value["first_party_documents"][0]["missing_policy_headers"].pop())
    evidence_case("redirect weakened", lambda value: value["http_redirect"].__setitem__("status", 302))
    evidence_case("Freight sample removed", lambda value: value["freight_samples"].pop())
    evidence_case("Freight policy header observed", lambda value: value["freight_samples"][0]["observed_headers"].__setitem__("content-security-policy", "default-src 'none'"))
    evidence_case("Freight content type drift", lambda value: value["freight_samples"][0]["observed_headers"].__setitem__("content-type", "application/octet-stream"))
    evidence_case("Freight range drift", lambda value: value["freight_samples"][3]["observed_headers"].__setitem__("content-range", "bytes 0-1/13634937"))

    fake_head = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'">'
    mutations.append(("fake policy meta", lambda: verify(contract, evidence, head_source=fake_head, check_wiring=False)))
    mutations.append(("meta referrer substitute", lambda: verify(contract, evidence, head_source='<meta name="referrer" content="strict-origin">', check_wiring=False)))
    mutations.append(("scripted policy meta", lambda: verify(contract, evidence, head_source='<script>meta.httpEquiv="Content-Security-Policy"</script>', check_wiring=False)))
    mutations.append(("missing Phase 2 wiring", lambda: verify(contract, evidence, phase2_source="", check_wiring=True)))

    for label, action in mutations:
        expect_failure(label, action)
    print(f"Public response-header policy self-test: PASS ({len(mutations)} destructive fixtures rejected)")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        if args.self_test:
            self_test()
        else:
            verify()
            print("Public response-header policy: PASS (prepared-not-active)")
    except ContractError as error:
        print(f"Public response-header policy: FAIL: {error}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
