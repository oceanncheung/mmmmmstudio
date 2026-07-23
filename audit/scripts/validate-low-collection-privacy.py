#!/usr/bin/env python3
"""Validate the factual, repository-only privacy inventory for MMS-AUD-040."""

from __future__ import annotations

import argparse
import copy
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urljoin, urlsplit


ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = ROOT / "audit/contracts/low-collection-privacy.json"
DISCLOSURE_PATH = ROOT / "docs/PRIVACY-DATA-INVENTORY.md"
EVIDENCE_PATH = ROOT / "audit/findings/evidence/2026-07-23-round99-privacy-request-storage.json"
PHASE2_PATH = ROOT / "audit/scripts/validate-phase2.sh"
EXPECTED_PHASE2_COMMAND = (
    'python3 "$ROOT/audit/scripts/validate-low-collection-privacy.py" --self-test'
)
EXPECTED_ROUTES = ("/", "/who", "/write")
EXPECTED_RUNTIME_SOURCES = (
    "cargo/shared-early-init.html",
    "cargo/panel.js",
    "cargo/home.template.html",
    "cargo/who.template.html",
    "cargo/write.template.html",
    "cargo/shared-nav-items.html",
    "cargo/home-extras.html",
    "cargo/site-head.html",
    "cargo/home.html",
    "cargo/who.html",
    "cargo/write.html",
    "cargo/tokens.css",
    "cargo/site.css",
)
EXPECTED_SOURCE_HASHES = {
    "cargo/shared-early-init.html": "18e4cf5c9ddd362d3e9f6e96696d7516373f07af0866ddd8761408b0c01c1197",
    "cargo/panel.js": "66532ec0dde7d2b36ee4dba43f0a7cd0021f5155dfffdc44fc556a034db408f7",
    "cargo/home.template.html": "7d9446d75174c6096c268d3d46fb72d8972d50e75540e241c83a7f47bc88041e",
    "cargo/who.template.html": "1eb7e7aa4e3ae37ac2da9793f63e52b76e8d3bb92f60b0dd0b9b523a3f2c0e21",
    "cargo/write.template.html": "348a820f9d24755cad7dbdfa4ab8c0016d585d60b745737b819df7c823a02608",
    "cargo/shared-nav-items.html": "0f5ab94a8b59380ded80de9931af08d9072396a24411038254d6f245ba453361",
    "cargo/home-extras.html": "0cb6c73ece86b3d27b7f8572174867a206c67d06701ad204d253cd1c7bd07992",
    "cargo/site-head.html": "fdb1bc6a7d2b6ad36b054a36f2e42c6d2d15401f4c29e4121efeeb1d96ffd71d",
    "cargo/home.html": "cf73e9d14fbbed5f34476663b8b505c96cf9155a0ac0b25b5b69c061c41e1704",
    "cargo/who.html": "d94edb7c90b47135ea35b92924258a22fa3a4e841d14a2402754f8f40ca321b0",
    "cargo/write.html": "c16479bb9d11a60b2dd4fc119377b7d380a7e06fbb49decd8677225a96affddb",
    "cargo/tokens.css": "70178291f00dfeacaae9fc7c0fde2d7f444cb26456d969b7d2523d0274a71d98",
    "cargo/site.css": "aa61fcbf580714e09a0d855a208ce5c213d0ada29885fe5abbdf6c6d8dbe1875",
}
EXPECTED_FROZEN_HASHES = {
    "audit/findings/phase3-platform-security-findings.md": "0332c0faeae5a224247e35291f066742a9a46c70abdedc53cd8aead3e3ec68b4",
    "audit/findings/evidence/2026-07-21-phase3-platform-security-summary.json": "3c8a7d2a954e100fb982c7d13f705130c25726b1e637978c49f16533c2b1b4d4",
    "docs/audits/2026-07-20T175853-0400-round-80/public/home.headers": "513e96be59f92e1e1ee20255847d21010fb996f68ae327482a46c961bc08f27c",
    "docs/audits/2026-07-20T175853-0400-round-80/public/who.headers": "72c2d3b4d83dc32d6ebf4167e749f16b745d8387ac07f1e676b0c91a5220c011",
    "docs/audits/2026-07-20T175853-0400-round-80/public/write.headers": "df5bd17536124305e0fb0e1a902163551d04a0f8febc7e4e05af5b325688180e",
}
EXPECTED_STORAGE = (
    ("localStorage", "mms-theme", ("white", "girly", "quirky", "contrast", "black"), "until-overwritten-or-browser-cleared"),
    ("localStorage", "mms-face", ("serif", "sans", "mono", "gothic"), "until-overwritten-or-browser-cleared"),
    ("localStorage", "mms-scale", ("s", "m", "l", "xl"), "until-overwritten-or-browser-cleared"),
    ("localStorage", "mms-shape", ("straight", "rounded", "oval"), "until-overwritten-or-browser-cleared"),
    ("sessionStorage", "mms-render-sequence", ("four theme:face:scale:shape combinations joined by |",), "browser-tab-session"),
)
EXPECTED_ORIGINS = (
    "https://mmmmm.studio",
    "https://build.cargo.site",
    "https://static.cargo.site",
    "https://type.cargo.site",
    "https://freight.cargo.site",
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
)
EXPECTED_HTTPS_DESTINATIONS = (
    "https://ellacportfolio.com",
    "https://eviive.ch",
    "https://www.linkedin.com/company/mmmmmstudio/",
    "https://www.touchbaes.ca",
    "https://www.travisleung.com",
)
EXPECTED_MAILTO_DESTINATIONS = (
    "mailto:alvis@mmmmm.studio",
    "mailto:ocean@mmmmm.studio",
    "mailto:ocean@mmmmm.studio,alvis@mmmmm.studio",
)
EXPECTED_STORAGE_OPERATIONS = {
    "cargo/shared-early-init.html": (
        "localStorage.getItem('mms-' + axis)",
        "sessionStorage.getItem('mms-render-sequence')",
        "sessionStorage.setItem('mms-render-sequence', signature)",
    ),
    "cargo/panel.js": (
        "localStorage.setItem('mms-' + axis, value)",
        "localStorage.getItem('mms-' + axis)",
        "localStorage.getItem('mms-scale')",
    ),
    "cargo/home.html": (
        "localStorage.getItem('mms-' + axis)",
        "sessionStorage.getItem('mms-render-sequence')",
        "sessionStorage.setItem('mms-render-sequence', signature)",
        "localStorage.setItem('mms-' + axis, value)",
        "localStorage.getItem('mms-' + axis)",
        "localStorage.getItem('mms-scale')",
    ),
    "cargo/who.html": (
        "localStorage.getItem('mms-' + axis)",
        "sessionStorage.getItem('mms-render-sequence')",
        "sessionStorage.setItem('mms-render-sequence', signature)",
        "localStorage.setItem('mms-' + axis, value)",
        "localStorage.getItem('mms-' + axis)",
        "localStorage.getItem('mms-scale')",
    ),
    "cargo/write.html": (
        "localStorage.getItem('mms-' + axis)",
        "sessionStorage.getItem('mms-render-sequence')",
        "sessionStorage.setItem('mms-render-sequence', signature)",
        "localStorage.setItem('mms-' + axis, value)",
        "localStorage.getItem('mms-' + axis)",
        "localStorage.getItem('mms-scale')",
    ),
}
STORAGE_CALL_RE = re.compile(
    r"(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\([^;\n]+\)"
)
FORBIDDEN_RUNTIME_PATTERNS = {
    "cookie API": re.compile(r"\bdocument\.cookie\b|\bcookieStore\b", re.I),
    "beacon": re.compile(r"\bnavigator\.sendBeacon\b", re.I),
    "network request API": re.compile(r"\bfetch\s*\(|\bXMLHttpRequest\b", re.I),
    "analytics or tracker": re.compile(
        r"googletagmanager|google-analytics|\bgtag\s*\(|\bfbq\s*\(|hotjar|mixpanel|"
        r"segment\.io|plausible|matomo|fullstory|clarity\.ms",
        re.I,
    ),
    "submitting form": re.compile(r"<form\b|\bFormData\s*\(", re.I),
}
FORBIDDEN_ABSOLUTE_CLAIMS = (
    "never collects",
    "collects nothing",
    "does not collect data",
    "no personal data",
    "fully anonymous",
    "completely anonymous",
    "contacted only when",
    "only when a visitor selects",
)


class ContractError(RuntimeError):
    pass


class HrefParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.hrefs: list[str] = []
        self.resources: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        values = dict(attrs)
        if tag == "a" and values.get("href"):
            self.hrefs.append(values["href"] or "")
        resource_attrs = {
            "audio": ("src",),
            "iframe": ("src", "data-src", "data-poster"),
            "img": ("src", "srcset", "data-src", "data-srcset", "data-poster"),
            "link": ("href",),
            "object": ("data",),
            "script": ("src",),
            "source": ("src", "srcset", "data-src", "data-srcset"),
            "video": ("src", "poster", "data-src", "data-poster", "data-mp4"),
        }.get(tag, ())
        for name in resource_attrs:
            value = values.get(name)
            if not value:
                continue
            if name in {"srcset", "data-srcset"}:
                self.resources.extend(part.strip().split()[0] for part in value.split(",") if part.strip())
            else:
                self.resources.append(value)

    handle_startendtag = handle_starttag


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ContractError(f"cannot read {path.relative_to(ROOT)}: {error}") from error
    if not isinstance(value, dict):
        raise ContractError(f"{path.relative_to(ROOT)} must contain a JSON object")
    return value


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_path(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


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


def require_tracked(paths: set[str], tracked: set[str]) -> None:
    missing = sorted(paths - tracked)
    if missing:
        raise ContractError(f"privacy contract inputs are not Git-tracked: {missing}")


def verify_contract(contract: dict, disclosure: str, evidence_bytes: bytes) -> None:
    if contract.get("schema_version") != 1 or contract.get("issue") != "MMS-AUD-040":
        raise ContractError("privacy contract schema or issue drifted")
    if contract.get("status") != "tracked-repository-record":
        raise ContractError("privacy inventory status drifted")
    if contract.get("publication") != {
        "public_notice": "not-published",
        "legal_policy": False,
        "cargo_change_authorized": False,
    }:
        raise ContractError("repository inventory was presented as a public or legal policy")

    scope = contract.get("scope")
    if not isinstance(scope, dict):
        raise ContractError("privacy scope is missing")
    exact_list(scope.get("routes"), EXPECTED_ROUTES, "route")
    exact_list(scope.get("runtime_sources"), EXPECTED_RUNTIME_SOURCES, "runtime source")
    if scope.get("disclosure_path") != str(DISCLOSURE_PATH.relative_to(ROOT)):
        raise ContractError("privacy disclosure path drifted")
    if scope.get("evidence_path") != str(EVIDENCE_PATH.relative_to(ROOT)):
        raise ContractError("privacy evidence path drifted")
    if scope.get("disclosure_sha256") != sha256_bytes(disclosure.encode("utf-8")):
        raise ContractError("privacy disclosure identity drifted")
    if scope.get("evidence_sha256") != sha256_bytes(evidence_bytes):
        raise ContractError("privacy evidence identity drifted")

    entries = contract.get("browser_storage")
    if not isinstance(entries, list) or len(entries) != len(EXPECTED_STORAGE):
        raise ContractError("browser-storage inventory is incomplete")
    actual = []
    for entry in entries:
        if not isinstance(entry, dict):
            raise ContractError("browser-storage entry must be an object")
        if not entry.get("purpose") or not entry.get("write_condition"):
            raise ContractError("browser-storage purpose or write condition is missing")
        if entry.get("transmitted_by_audited_runtime") is not False:
            raise ContractError("browser-storage value was claimed as transmitted")
        actual.append(
            (
                entry.get("scope"),
                entry.get("key"),
                tuple(entry.get("allowed_values", [])),
                entry.get("retention"),
            )
        )
    if tuple(actual) != EXPECTED_STORAGE:
        raise ContractError(f"browser-storage inventory drifted: {actual!r}")

    embedded = contract.get("embedded_storage")
    expected_embed = [{
        "origin": "https://freight.cargo.site",
        "embed": "touchbaes-sticker-game-v10",
        "key": "touchbaes-sticker-room-raw-v44",
        "operation": "remove-only",
        "current_placement_persistence": False,
    }]
    if embedded != expected_embed:
        raise ContractError("Touchbaes legacy storage behavior drifted")

    services = contract.get("network_services")
    if not isinstance(services, list):
        raise ContractError("network-service inventory is missing")
    exact_list([entry.get("origin") for entry in services], EXPECTED_ORIGINS, "runtime origin")
    if any(not entry.get("classification") or not entry.get("role") for entry in services):
        raise ContractError("network-service classification or role is missing")

    negatives = contract.get("qualified_negative_findings")
    if not isinstance(negatives, list) or len(negatives) != 5:
        raise ContractError("qualified negative findings are incomplete")
    if any("audited" not in finding and "observed" not in finding for finding in negatives):
        raise ContractError("negative finding is not limited to audited evidence")

    navigation = contract.get("external_navigation")
    if not isinstance(navigation, dict):
        raise ContractError("external-navigation inventory is missing")
    if navigation.get("classification") != "link-destination-not-runtime-resource":
        raise ContractError("external navigation was misclassified as a resource vendor")
    exact_list(navigation.get("internal_paths"), EXPECTED_ROUTES, "internal path")
    exact_list(navigation.get("https_destinations"), EXPECTED_HTTPS_DESTINATIONS, "HTTPS destination")
    exact_list(navigation.get("mailto_destinations"), EXPECTED_MAILTO_DESTINATIONS, "mailto destination")

    limitations = contract.get("limitations")
    if not isinstance(limitations, list) or len(limitations) < 5:
        raise ContractError("privacy limitations are incomplete")
    joined = " ".join(limitations).lower()
    for required in ("provider-side", "chromium", "request counts", "external destinations"):
        if required not in joined:
            raise ContractError(f"privacy limitation is missing: {required}")
    gates = contract.get("change_gates")
    if not isinstance(gates, list) or len(gates) != 4:
        raise ContractError("privacy change gates are incomplete")
    if not any("does not authorize" in gate for gate in gates):
        raise ContractError("external change authorization guard is missing")


def verify_disclosure(disclosure: str) -> None:
    normalized = re.sub(r"\s+", " ", disclosure)
    lowered = normalized.lower()
    if not re.search(r"not a\s+public privacy policy", lowered):
        raise ContractError("technical inventory boundary is missing from disclosure")
    for phrase in FORBIDDEN_ABSOLUTE_CLAIMS:
        if phrase in lowered:
            raise ContractError(f"unsupported absolute privacy claim: {phrase}")
    for _, key, _, _ in EXPECTED_STORAGE:
        if f"`{key}`" not in disclosure:
            raise ContractError(f"disclosure omits browser-storage key: {key}")
    for origin in EXPECTED_ORIGINS:
        if f"`{origin}`" not in disclosure:
            raise ContractError(f"disclosure omits runtime origin: {origin}")
    for phrase in (
        "ordinary connection and request metadata",
        "does not determine those providers' server-log retention",
        "does not load project, profile, LinkedIn, or email destinations as background resources",
        "sampled sessions did not contact them before visitor activation",
        "speculative behavior outside that observation is not guaranteed",
        "does not send the five stored values",
    ):
        if phrase not in normalized:
            raise ContractError(f"disclosure qualification is missing: {phrase}")


def verify_evidence(evidence: dict) -> None:
    if evidence.get("schema_version") != 1 or evidence.get("issue") != "MMS-AUD-040":
        raise ContractError("privacy evidence schema or issue drifted")
    if evidence.get("mode") != "read-only-live-and-source-observation":
        raise ContractError("privacy evidence was not recorded as read-only")

    sources = evidence.get("canonical_source_identities")
    if not isinstance(sources, list):
        raise ContractError("canonical source identities are missing")
    actual_source_hashes = {entry.get("path"): entry.get("sha256") for entry in sources}
    if actual_source_hashes != EXPECTED_SOURCE_HASHES:
        raise ContractError("canonical source evidence set or identity drifted")
    for path, expected_hash in EXPECTED_SOURCE_HASHES.items():
        if sha256_path(ROOT / path) != expected_hash:
            raise ContractError(f"canonical privacy source changed: {path}")

    frozen = evidence.get("frozen_evidence")
    if not isinstance(frozen, list):
        raise ContractError("frozen privacy evidence is missing")
    actual_frozen = {entry.get("path"): entry.get("sha256") for entry in frozen}
    if actual_frozen != EXPECTED_FROZEN_HASHES:
        raise ContractError("frozen privacy evidence set or identity drifted")
    for path, expected_hash in EXPECTED_FROZEN_HASHES.items():
        if sha256_path(ROOT / path) != expected_hash:
            raise ContractError(f"frozen privacy evidence changed: {path}")

    storage = evidence.get("browser_storage")
    if not isinstance(storage, dict):
        raise ContractError("browser-storage observation is missing")
    clean = storage.get("clean_first_party")
    if clean != {
        "local_storage": {},
        "session_storage_keys": ["mms-render-sequence"],
        "cookies": [],
        "indexed_db_databases": [],
        "cache_storage_keys": [],
        "service_worker_registrations": [],
    }:
        raise ContractError("clean first-party storage observation drifted")
    selected = storage.get("after_control_selection")
    if not isinstance(selected, dict):
        raise ContractError("control-selection storage observation is missing")
    if selected.get("local_storage") != {
        "mms-face": "sans",
        "mms-scale": "xl",
        "mms-shape": "oval",
        "mms-theme": "girly",
    }:
        raise ContractError("appearance preference observation drifted")
    if selected.get("session_storage_keys") != ["mms-render-sequence"]:
        raise ContractError("unexpected session-storage key observed after interaction")
    if selected.get("additional_network_requests") != 0 or selected.get("cookies") != []:
        raise ContractError("appearance interaction unexpectedly changed network or cookie state")
    touchbaes = storage.get("touchbaes_v10")
    if not isinstance(touchbaes, dict) or (
        touchbaes.get("legacy_key"),
        touchbaes.get("operation"),
        touchbaes.get("placement_persistence"),
    ) != ("touchbaes-sticker-room-raw-v44", "remove-only", False):
        raise ContractError("Touchbaes live storage observation drifted")
    if touchbaes.get("response_sha256") != "2c4f2c12a8d049ab0805fb8f72f246a95e715154671d5fd8cc808407995afcb5":
        raise ContractError("Touchbaes live response identity drifted")

    observations = evidence.get("network_observations")
    if not isinstance(observations, list) or [item.get("label") for item in observations] != [
        "home-clean-load", "who-clean-load", "write-clean-load", "home-full-traversal"
    ]:
        raise ContractError("live route observation set drifted")
    for item in observations:
        if not isinstance(item.get("request_count"), int) or item["request_count"] <= 0:
            raise ContractError("live request count is invalid")
        methods = item.get("methods")
        if not isinstance(methods, list) or not methods or set(methods) - {"GET", "HEAD"}:
            raise ContractError("live evidence contains an unexpected request method")
    exact_list(evidence.get("observed_runtime_origins"), EXPECTED_ORIGINS, "observed runtime origin")
    roles = evidence.get("origin_roles")
    if not isinstance(roles, dict) or tuple(roles) != EXPECTED_ORIGINS:
        raise ContractError("runtime-origin role inventory drifted")
    if any(not value for value in roles.values()):
        raise ContractError("runtime-origin role is empty")

    findings = evidence.get("request_findings")
    expected_zero = (
        "cookie_request_headers",
        "authorization_request_headers",
        "set_cookie_response_headers",
        "write_method_requests",
        "tracker_pattern_requests",
        "forms_on_routes",
    )
    if not isinstance(findings, dict) or any(findings.get(key) != 0 for key in expected_zero):
        raise ContractError("live privacy request finding drifted")
    if findings.get("resolved_google_font_binary_url_captured") is not False:
        raise ContractError("evidence invents an exact Google Fonts binary URL")
    frames = evidence.get("runtime_dependency_frames")
    if frames != {
        "loaded": ["v7-cup", "touchbaes", "montran-booklet"],
        "local_storage_after_load": {},
        "session_storage_after_load": {},
    }:
        raise ContractError("embedded-frame storage observation drifted")
    if not isinstance(evidence.get("methods"), list) or len(evidence["methods"]) < 5:
        raise ContractError("privacy evidence methods are incomplete")
    limits = " ".join(evidence.get("limitations", [])).lower()
    if "provider-side" not in limits or "future" not in limits or "chromium" not in limits:
        raise ContractError("privacy evidence limitations are incomplete")


def verify_runtime_sources(source_overrides: dict[str, str] | None = None) -> None:
    overrides = source_overrides or {}
    sources = {
        path: overrides.get(path, (ROOT / path).read_text(encoding="utf-8"))
        for path in EXPECTED_RUNTIME_SOURCES
    }
    for path, text in sources.items():
        calls = tuple(STORAGE_CALL_RE.findall(text))
        expected = EXPECTED_STORAGE_OPERATIONS.get(path, ())
        if calls != expected:
            raise ContractError(f"unrecorded or missing storage access in {path}: {calls!r}")
        for label, pattern in FORBIDDEN_RUNTIME_PATTERNS.items():
            if pattern.search(text):
                raise ContractError(f"{path}: unrecorded {label} path")

    early = sources["cargo/shared-early-init.html"]
    required_axis_fragments = (
        "var THEMES = ['white', 'girly', 'quirky', 'contrast', 'black'];",
        "var FACES = ['serif', 'sans', 'mono', 'gothic'];",
        "var SCALES = ['s', 'm', 'l', 'xl'];",
        "var SHAPES = ['straight', 'rounded', 'oval'];",
        "var PREVIEW_COUNT = 4;",
    )
    for fragment in required_axis_fragments:
        if fragment not in early:
            raise ContractError(f"browser-storage value family drifted: {fragment}")

    hrefs: list[str] = []
    for path in ("cargo/home.template.html", "cargo/who.template.html", "cargo/write.template.html", "cargo/shared-nav-items.html"):
        parser = HrefParser()
        parser.feed(sources[path])
        hrefs.extend(parser.hrefs)
    internal = sorted({href for href in hrefs if href.startswith("/")})
    https = sorted({href for href in hrefs if href.startswith("https://")})
    mailto = sorted({href for href in hrefs if href.startswith("mailto:")})
    expected_hrefs = sorted({*EXPECTED_ROUTES, *EXPECTED_HTTPS_DESTINATIONS, *EXPECTED_MAILTO_DESTINATIONS})
    if sorted(set(hrefs)) != expected_hrefs:
        raise ContractError(f"link destination inventory drifted: {sorted(set(hrefs))}")
    if internal != sorted(EXPECTED_ROUTES):
        raise ContractError(f"internal navigation inventory drifted: {internal}")
    if https != sorted(EXPECTED_HTTPS_DESTINATIONS):
        raise ContractError(f"external HTTPS destination inventory drifted: {https}")
    if mailto != sorted(EXPECTED_MAILTO_DESTINATIONS):
        raise ContractError(f"mailto destination inventory drifted: {mailto}")

    resource_origins: set[str] = set()
    for path in ("cargo/home.html", "cargo/who.html", "cargo/write.html"):
        parser = HrefParser()
        parser.feed(sources[path])
        for value in parser.resources:
            parsed_literal = urlsplit(value)
            if parsed_literal.scheme in {"data", "blob"}:
                continue
            resolved = urlsplit(urljoin("https://mmmmm.studio/", value))
            if resolved.scheme != "https" or not resolved.netloc:
                raise ContractError(f"deployable bodycopy has a non-HTTPS resource URL: {value}")
            resource_origins.add(f"{resolved.scheme}://{resolved.netloc}")
        for match in re.finditer(r"url\(\s*['\"]?(https://[A-Za-z0-9.-]+)", sources[path], re.I):
            resource_origins.add(match.group(1))
    if resource_origins != {"https://freight.cargo.site"}:
        raise ContractError(f"deployable bodycopy resource origin inventory drifted: {sorted(resource_origins)}")

    for path in ("cargo/tokens.css", "cargo/site.css"):
        css = sources[path]
        if re.search(r"@import\b|url\s*\(", css, re.I):
            raise ContractError(f"unrecorded CSS import or URL in {path}")
    literal_origins = sorted({
        origin
        for text in sources.values()
        for origin in re.findall(r"https://[A-Za-z0-9.-]+", text)
    })
    expected_literal_origins = sorted({
        "https://freight.cargo.site",
        *(re.match(r"https://[^/]+", destination).group(0) for destination in EXPECTED_HTTPS_DESTINATIONS),
    })
    if literal_origins != expected_literal_origins:
        raise ContractError(f"canonical source origin inventory drifted: {literal_origins}")


def verify_nonpublication() -> None:
    paths = (
        "cargo/home.html", "cargo/who.html", "cargo/write.html",
        "cargo/home.template.html", "cargo/who.template.html", "cargo/write.template.html",
        "cargo/shared-nav-items.html", "cargo/deployment-manifest.json",
    )
    pattern = re.compile(r"privacy-data-inventory|href\s*=\s*['\"]/?privacy(?:['\"/#?])", re.I)
    for path in paths:
        if pattern.search((ROOT / path).read_text(encoding="utf-8")):
            raise ContractError(f"repository inventory was exposed in Cargo without approval: {path}")


def verify_phase2(phase2: str) -> None:
    if phase2.count(EXPECTED_PHASE2_COMMAND) != 1:
        raise ContractError("privacy validator Phase 2 wiring must appear exactly once")


def validate_all(
    contract: dict,
    disclosure: str,
    evidence: dict,
    evidence_bytes: bytes,
    phase2: str,
    tracked: set[str],
    source_overrides: dict[str, str] | None = None,
) -> None:
    verify_contract(contract, disclosure, evidence_bytes)
    verify_disclosure(disclosure)
    verify_evidence(evidence)
    verify_runtime_sources(source_overrides)
    verify_nonpublication()
    verify_phase2(phase2)
    required = {
        str(CONTRACT_PATH.relative_to(ROOT)),
        str(DISCLOSURE_PATH.relative_to(ROOT)),
        str(EVIDENCE_PATH.relative_to(ROOT)),
        str(Path(__file__).resolve().relative_to(ROOT)),
        str(PHASE2_PATH.relative_to(ROOT)),
        *EXPECTED_RUNTIME_SOURCES,
        *EXPECTED_FROZEN_HASHES,
    }
    require_tracked(required, tracked)


def expect_failure(label: str, callback) -> None:
    try:
        callback()
    except ContractError:
        return
    raise ContractError(f"destructive fixture unexpectedly passed: {label}")


def run_self_test(
    contract: dict,
    disclosure: str,
    evidence: dict,
    evidence_bytes: bytes,
    phase2: str,
    tracked: set[str],
) -> int:
    fixtures = 0

    def mutate_contract(label: str, mutator) -> None:
        nonlocal fixtures
        candidate = copy.deepcopy(contract)
        mutator(candidate)
        expect_failure(label, lambda: validate_all(candidate, disclosure, evidence, evidence_bytes, phase2, tracked))
        fixtures += 1

    def mutate_evidence(label: str, mutator) -> None:
        nonlocal fixtures
        candidate = copy.deepcopy(evidence)
        mutator(candidate)
        candidate_bytes = (json.dumps(candidate, indent=2) + "\n").encode("utf-8")
        candidate_contract = copy.deepcopy(contract)
        candidate_contract["scope"]["evidence_sha256"] = sha256_bytes(candidate_bytes)
        expect_failure(label, lambda: validate_all(candidate_contract, disclosure, candidate, candidate_bytes, phase2, tracked))
        fixtures += 1

    mutate_contract("wrong issue", lambda value: value.__setitem__("issue", "MMS-AUD-999"))
    mutate_contract("public notice claim", lambda value: value["publication"].__setitem__("public_notice", "published"))
    mutate_contract("legal-policy claim", lambda value: value["publication"].__setitem__("legal_policy", True))
    mutate_contract("missing storage key", lambda value: value["browser_storage"].pop())
    mutate_contract("extra storage value", lambda value: value["browser_storage"][0]["allowed_values"].append("secret"))
    mutate_contract("wrong retention", lambda value: value["browser_storage"][0].__setitem__("retention", "forever"))
    mutate_contract("claimed transmission", lambda value: value["browser_storage"][0].__setitem__("transmitted_by_audited_runtime", True))
    mutate_contract("missing provider", lambda value: value["network_services"].pop())
    mutate_contract("outbound link as vendor", lambda value: value["external_navigation"].__setitem__("classification", "background-resource"))
    mutate_contract("Touchbaes persistence reintroduced", lambda value: value["embedded_storage"][0].__setitem__("current_placement_persistence", True))

    altered_disclosure = disclosure.replace("ordinary connection and request metadata", "no metadata")
    altered_contract = copy.deepcopy(contract)
    altered_contract["scope"]["disclosure_sha256"] = sha256_bytes(altered_disclosure.encode("utf-8"))
    expect_failure(
        "missing provider metadata caveat",
        lambda: validate_all(altered_contract, altered_disclosure, evidence, evidence_bytes, phase2, tracked),
    )
    fixtures += 1
    absolute_disclosure = disclosure + "\nMM.S never collects anything.\n"
    absolute_contract = copy.deepcopy(contract)
    absolute_contract["scope"]["disclosure_sha256"] = sha256_bytes(absolute_disclosure.encode("utf-8"))
    expect_failure(
        "absolute privacy claim",
        lambda: validate_all(absolute_contract, absolute_disclosure, evidence, evidence_bytes, phase2, tracked),
    )
    fixtures += 1
    absolute_link_disclosure = disclosure + "\nExternal sites are contacted only when selected.\n"
    absolute_link_contract = copy.deepcopy(contract)
    absolute_link_contract["scope"]["disclosure_sha256"] = sha256_bytes(
        absolute_link_disclosure.encode("utf-8")
    )
    expect_failure(
        "absolute external-link claim",
        lambda: validate_all(
            absolute_link_contract, absolute_link_disclosure, evidence, evidence_bytes, phase2, tracked
        ),
    )
    fixtures += 1

    mutate_evidence("cookie observed", lambda value: value["request_findings"].__setitem__("cookie_request_headers", 1))
    mutate_evidence("authorization observed", lambda value: value["request_findings"].__setitem__("authorization_request_headers", 1))
    mutate_evidence("write request observed", lambda value: value["request_findings"].__setitem__("write_method_requests", 1))
    mutate_evidence("tracker observed", lambda value: value["request_findings"].__setitem__("tracker_pattern_requests", 1))
    mutate_evidence("invented Google binary capture", lambda value: value["request_findings"].__setitem__("resolved_google_font_binary_url_captured", True))
    mutate_evidence("extra first-party local key", lambda value: value["browser_storage"]["after_control_selection"]["local_storage"].__setitem__("visitor-id", "1"))
    mutate_evidence("extra session key", lambda value: value["browser_storage"]["clean_first_party"]["session_storage_keys"].append("visitor-id"))

    for label, marker in (
        ("new storage call", "\nlocalStorage.setItem('visitor-id', '1');\n"),
        ("cookie API", "\ndocument.cookie = 'visitor-id=1';\n"),
        ("beacon", "\nnavigator.sendBeacon('/collect', 'x');\n"),
        ("fetch", "\nfetch('/collect?theme=' + localStorage.getItem('mms-theme'));\n"),
        ("analytics", "\ngtag('event', 'view');\n"),
        ("form", "\n<form action='/collect' method='post'></form>\n"),
    ):
        overrides = {"cargo/site-head.html": (ROOT / "cargo/site-head.html").read_text(encoding="utf-8") + marker}
        expect_failure(
            label,
            lambda overrides=overrides: validate_all(
                contract, disclosure, evidence, evidence_bytes, phase2, tracked, overrides
            ),
        )
        fixtures += 1

    body = (ROOT / "cargo/home.html").read_text(encoding="utf-8")
    for label, marker in (
        ("deployable preconnect origin", '<link rel="preconnect" href="https://tracker.example">'),
        ("deployable protocol-relative origin", '<link rel="preconnect" href="//tracker.example">'),
        ("deployable HTTP origin", '<link rel="preconnect" href="http://tracker.example">'),
        ("deployable prefetch of outbound origin", '<link rel="prefetch" href="https://eviive.ch/pixel">'),
        ("deployable script origin", '<script src="https://tracker.example/pixel.js"></script>'),
        (
            "deployable deferred srcset origin",
            '<img data-srcset="https://freight.cargo.site/a.jpg 1x, //tracker.example/b.jpg 2x">',
        ),
    ):
        overrides = {"cargo/home.html": marker + "\n" + body}
        expect_failure(
            label,
            lambda overrides=overrides: validate_all(
                contract, disclosure, evidence, evidence_bytes, phase2, tracked, overrides
            ),
        )
        fixtures += 1

    for label, marker in (
        ("CSS URL origin", '\n.mms { background-image: url("https://tracker.example/pixel"); }\n'),
        ("CSS import origin", '\n@import url("https://tracker.example/style.css");\n'),
    ):
        overrides = {"cargo/site.css": (ROOT / "cargo/site.css").read_text(encoding="utf-8") + marker}
        expect_failure(
            label,
            lambda overrides=overrides: validate_all(
                contract, disclosure, evidence, evidence_bytes, phase2, tracked, overrides
            ),
        )
        fixtures += 1

    expect_failure(
        "missing Phase 2 wiring",
        lambda: validate_all(
            contract, disclosure, evidence, evidence_bytes,
            phase2.replace(EXPECTED_PHASE2_COMMAND, ""), tracked,
        ),
    )
    fixtures += 1
    expect_failure(
        "duplicated Phase 2 wiring",
        lambda: validate_all(
            contract, disclosure, evidence, evidence_bytes,
            phase2 + "\n" + EXPECTED_PHASE2_COMMAND + "\n", tracked,
        ),
    )
    fixtures += 1
    reduced_tracked = set(tracked)
    reduced_tracked.discard(str(DISCLOSURE_PATH.relative_to(ROOT)))
    expect_failure(
        "untracked disclosure",
        lambda: validate_all(contract, disclosure, evidence, evidence_bytes, phase2, reduced_tracked),
    )
    fixtures += 1
    return fixtures


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    contract = load_json(CONTRACT_PATH)
    disclosure = DISCLOSURE_PATH.read_text(encoding="utf-8")
    evidence_bytes = EVIDENCE_PATH.read_bytes()
    evidence = json.loads(evidence_bytes)
    phase2 = PHASE2_PATH.read_text(encoding="utf-8")
    tracked = tracked_files()
    validate_all(contract, disclosure, evidence, evidence_bytes, phase2, tracked)
    if args.self_test:
        fixtures = run_self_test(contract, disclosure, evidence, evidence_bytes, phase2, tracked)
        print(f"Low-collection privacy destructive fixtures: PASS ({fixtures} rejected)")
    print("Low-collection privacy inventory: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
