#!/usr/bin/env python3
"""Fail closed when an MM.S root runtime bypasses lifecycle ownership.

The Cargo bodycopy is intentionally re-initializable because Cargo can replace
the ``.mms`` root without replacing the document.  Every root-scoped global
listener and long-lived resource therefore belongs to one named lifecycle
owner.  This validator protects that contract statically; the browser harness
proves the corresponding behavior during an actual root replacement.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PAGES = ("home", "who", "write")
PANEL_VERSION = "responsive-70/root-lifecycle-1"
HOME_VERSION = "tweezer-v3/root-lifecycle-1"


class ContractError(RuntimeError):
    """A fail-closed ownership-contract violation."""


def require(pattern: str, source: str, message: str, *, flags: int = 0) -> None:
    if not re.search(pattern, source, flags):
        raise ContractError(message)


def strip_js_comments_and_strings(source: str) -> str:
    """Blank JS comments and string bodies while retaining code shape.

    This is deliberately a small lexer rather than a JavaScript parser.  The
    ownership checks only need to distinguish executable registration calls
    from examples, comments, selectors, and message strings.
    """

    chars = list(source)
    index = 0
    length = len(chars)
    state = "code"
    quote = ""

    while index < length:
        char = chars[index]
        nxt = chars[index + 1] if index + 1 < length else ""

        if state == "code":
            if char == "/" and nxt == "/":
                chars[index] = chars[index + 1] = " "
                state = "line-comment"
                index += 2
                continue
            if char == "/" and nxt == "*":
                chars[index] = chars[index + 1] = " "
                state = "block-comment"
                index += 2
                continue
            if char in ("'", '"', "`"):
                quote = char
                chars[index] = " "
                state = "string"
                index += 1
                continue
            index += 1
            continue

        if state == "line-comment":
            if char in ("\n", "\r"):
                state = "code"
            else:
                chars[index] = " "
            index += 1
            continue

        if state == "block-comment":
            if char == "*" and nxt == "/":
                chars[index] = chars[index + 1] = " "
                state = "code"
                index += 2
            else:
                if char not in ("\n", "\r"):
                    chars[index] = " "
                index += 1
            continue

        # Strings and template literals are blanked.  Template interpolation
        # is not needed by the MM.S registration patterns protected here.
        if char == "\\":
            chars[index] = " "
            if index + 1 < length:
                if chars[index + 1] not in ("\n", "\r"):
                    chars[index + 1] = " "
                index += 2
            else:
                index += 1
            continue
        if char == quote:
            chars[index] = " "
            state = "code"
        elif char not in ("\n", "\r"):
            chars[index] = " "
        index += 1

    return "".join(chars)


def member_declared(source: str, name: str) -> bool:
    """Accept ordinary, object-literal, assignment, or shorthand members."""

    escaped = re.escape(name)
    patterns = (
        rf"\bfunction\s+{escaped}\s*\(",
        rf"\b{escaped}\s*:\s*",
        rf"\.\s*{escaped}\s*=",
        rf"\b{escaped}\s*(?=[,}}])",
    )
    return any(re.search(pattern, source) for pattern in patterns)


def matching_brace(source: str, opening: int) -> int:
    """Return the index after a balanced function body in stripped JS."""

    if opening < 0 or opening >= len(source) or source[opening] != "{":
        raise ContractError("static ownership scanner could not find a function body")
    depth = 0
    for index in range(opening, len(source)):
        char = source[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return index + 1
    raise ContractError("static ownership scanner found an unbalanced function body")


def function_span(source: str, pattern: str, *, start: int = 0, end: int | None = None) -> tuple[int, int] | None:
    """Locate one function declaration/assignment and its complete body."""

    limit = len(source) if end is None else end
    match = re.search(pattern, source[start:limit])
    if not match:
        return None
    absolute_start = start + match.start()
    opening = source.find("{", start + match.start(), start + match.end() + 1)
    if opening < 0 or opening >= limit:
        raise ContractError("static ownership scanner found a function without a body")
    closing = matching_brace(source, opening)
    if closing > limit:
        raise ContractError("static ownership scanner found a helper outside lifecycle.create()")
    return absolute_start, closing


def blank_spans(source: str, spans: list[tuple[int, int]]) -> str:
    """Blank approved code spans without changing indices or line numbers."""

    chars = list(source)
    for start, end in spans:
        for index in range(start, end):
            if chars[index] not in ("\n", "\r"):
                chars[index] = " "
    return "".join(chars)


def lifecycle_helper_spans(code: str, label: str) -> list[tuple[int, int]]:
    """Find only the owner helpers allowed to touch browser primitives."""

    create = function_span(
        code,
        r"(?:\bregistry\s*\.\s*create\s*=\s*function|\bfunction\s+create)\s*\([^)]*\)\s*\{",
    )
    if not create:
        return []
    create_start, create_end = create
    spans: list[tuple[int, int]] = []
    for name in ("on", "onMql", "timeout", "interval", "raf"):
        escaped = re.escape(name)
        patterns = (
            rf"\bowner\s*\.\s*{escaped}\s*=\s*function\s*\([^)]*\)\s*\{{",
            rf"\bfunction\s+{escaped}\s*\([^)]*\)\s*\{{",
        )
        helper = None
        for pattern in patterns:
            helper = function_span(code, pattern, start=create_start, end=create_end)
            if helper:
                break
        if not helper:
            raise ContractError(f"{label}: owner.{name}() helper is not statically identifiable")
        spans.append(helper)
    return spans


def reject_unowned_global_registrations(source: str, label: str) -> None:
    code = strip_js_comments_and_strings(source)
    masked = blank_spans(code, lifecycle_helper_spans(code, label))

    # The sole resource created before an owner exists is a deduplicated
    # bootstrap retry.  Mask only its setTimeout token; anything else inside
    # scheduleInit (or a second assignment) remains visible to the scanner.
    bootstrap_pattern = (
        r"\bwindow\s*\.\s*__mmsPanelBootstrapTimer\s*=\s*"
        r"(?P<timer>window\s*\.\s*setTimeout)\s*\("
    )
    bootstrap_calls = list(re.finditer(bootstrap_pattern, masked))
    if len(bootstrap_calls) > 1:
        raise ContractError(f"{label}: more than one raw bootstrap timeout exists")
    if bootstrap_calls:
        schedule = function_span(masked, r"\bfunction\s+scheduleInit\s*\([^)]*\)\s*\{")
        call = bootstrap_calls[0]
        if not schedule or not (schedule[0] <= call.start() < schedule[1]):
            raise ContractError(f"{label}: bootstrap timeout exists outside scheduleInit()")
        schedule_source = masked[schedule[0]:schedule[1]]
        if not re.search(
            r"\bif\s*\(\s*window\s*\.\s*__mmsPanelBootstrapTimer\s*\)\s*return\b",
            schedule_source,
        ):
            raise ContractError(f"{label}: bootstrap timeout is not deduplicated")
        timer_span = call.span("timer")
        masked = blank_spans(masked, [timer_span])

    direct_patterns = {
        "raw element/global addEventListener": (
            r"(?:\.\s*addEventListener(?:\s*\.\s*call)?|(?<![\w$.])addEventListener)\s*\("
        ),
        "raw element/global attachEvent": (
            r"(?:\.\s*attachEvent(?:\s*\.\s*call)?|(?<![\w$.])attachEvent)\s*\("
        ),
        "window/document on-event assignment": (
            r"\b(?:window|document|globalThis|self)\s*\.\s*on[a-zA-Z]+\s*="
        ),
        "raw setInterval": (
            r"(?<![\w$])(?:(?:window|globalThis|self)\s*\.\s*)?setInterval\s*\("
        ),
        "raw setTimeout": (
            r"(?<![\w$])(?:(?:window|globalThis|self)\s*\.\s*)?setTimeout\s*\("
        ),
        "raw requestAnimationFrame": (
            r"(?<![\w$])(?:(?:window|globalThis|self)\s*\.\s*)?requestAnimationFrame\s*\("
        ),
    }
    for description, pattern in direct_patterns.items():
        if re.search(pattern, masked):
            raise ContractError(f"{label}: {description} bypasses lifecycle ownership")

    for observer in re.finditer(r"\bnew\s+(?:ResizeObserver|IntersectionObserver)\s*\(", code):
        prefix = code[max(0, observer.start() - 96):observer.start()]
        if not re.search(r"\bruntime\s*\.\s*observe\s*\(\s*$", prefix):
            kind = "ResizeObserver" if "ResizeObserver" in observer.group(0) else "IntersectionObserver"
            raise ContractError(
                f"{label}: {kind} constructor is not directly wrapped in runtime.observe()"
            )

    mql_names = set(
        re.findall(
            r"\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*"
            r"(?:window\s*\.\s*)?matchMedia\s*\(",
            masked,
        )
    )
    for name in sorted(mql_names):
        if re.search(
            rf"\b{re.escape(name)}\s*\.\s*(?:addEventListener|addListener)\s*\(",
            masked,
        ):
            raise ContractError(
                f"{label}: matchMedia listener {name!r} bypasses owner.onMql()"
            )
        if re.search(rf"\b{re.escape(name)}\s*\.\s*onchange\s*=", masked):
            raise ContractError(
                f"{label}: matchMedia onchange {name!r} bypasses owner.onMql()"
            )
    if re.search(
        r"(?:window\s*\.\s*)?matchMedia\s*\([^;\n]*\)\s*\.\s*"
        r"(?:addEventListener|addListener)\s*\(",
        masked,
    ):
        raise ContractError(f"{label}: inline matchMedia listener bypasses owner.onMql()")


def reject_legacy_guards(panel: str, home: str | None) -> None:
    panel_code = strip_js_comments_and_strings(panel)
    if re.search(
        r"\bif\s*\([^)]{0,500}__mmsPanel(?:Version|Root)[^)]{0,500}\)\s*"
        r"(?:\{\s*)?return\b",
        panel_code,
        re.DOTALL,
    ):
        raise ContractError(
            "panel runtime: compatibility markers still act as the root guard"
        )

    if home is None:
        return
    home_code = strip_js_comments_and_strings(home)
    if re.search(
        r"\bif\s*\(\s*(?:window\s*\.\s*)?__mmsTwOverlayV3\s*\)\s*"
        r"(?:\{\s*)?return\b",
        home_code,
    ):
        raise ContractError(
            "Home runtime: permanent __mmsTwOverlayV3 boolean guard returned"
        )


def validate_lifecycle_api(panel: str) -> None:
    require(
        r"window\s*\.\s*__mmsRuntimeLifecycle",
        panel,
        "panel runtime: window.__mmsRuntimeLifecycle is missing",
    )
    require(
        r"\bapiVersion\s*:\s*1\b",
        panel,
        "panel runtime: lifecycle apiVersion 1 is missing",
    )
    require(
        r"Object\s*\.\s*create\s*\(\s*null\s*\)",
        panel,
        "panel runtime: null-prototype owner registry is missing",
    )
    lifecycle_members = ("owners", "create", "replace", "teardownStale")
    owner_members = (
        "name",
        "root",
        "version",
        "active",
        "guard",
        "on",
        "onMql",
        "timeout",
        "clearTimeout",
        "interval",
        "raf",
        "cancelRaf",
        "observe",
        "cleanup",
        "teardown",
    )
    missing = [
        name
        for name in (*lifecycle_members, *owner_members)
        if not member_declared(panel, name)
    ]
    if missing:
        raise ContractError(
            "panel runtime: lifecycle surface is incomplete (missing "
            + ", ".join(missing)
            + ")"
        )

    cleanup_signatures = {
        "timeout cleanup": r"\bclearTimeout\s*\(",
        "interval cleanup": r"\bclearInterval\s*\(",
        "animation-frame cleanup": r"\bcancelAnimationFrame\s*\(",
        "observer cleanup": r"\.\s*disconnect\s*\(",
        "listener cleanup/fallback": r"\.\s*(?:removeEventListener|removeListener)\s*\(",
    }
    for label, pattern in cleanup_signatures.items():
        require(pattern, panel, f"panel runtime: explicit {label} is missing")

    require(
        r"\bdisposed\s*=\s*false\b",
        panel,
        "panel runtime: owner disposed state is missing",
    )
    require(
        r"(?:\bactive\s*=\s*function|\bfunction\s+active)\s*\([^)]*\)\s*\{[^}]{0,300}"
        r"!\s*disposed",
        panel,
        "panel runtime: active() does not become false after teardown",
        flags=re.DOTALL,
    )
    require(
        r"(?:\bteardown\s*=\s*function|\bfunction\s+teardown)\s*\([^)]*\)\s*\{[^}]{0,300}"
        r"if\s*\(\s*disposed\s*\)\s*return\b",
        panel,
        "panel runtime: teardown() is not idempotent",
        flags=re.DOTALL,
    )
    require(
        r"if\s*\(\s*disposed\s*\)\s*return\s*;[^}]{0,120}"
        r"disposed\s*=\s*true\b",
        panel,
        "panel runtime: teardown() does not mark the owner disposed",
        flags=re.DOTALL,
    )
    require(
        r"(?:\breplace\s*=\s*function|\bfunction\s+replace)\s*\([^)]*\)\s*\{[^}]{0,700}"
        r"\.\s*teardown\s*\(",
        panel,
        "panel runtime: replace() does not teardown the previous owner",
        flags=re.DOTALL,
    )
    require(
        r"(?:\bteardownStale\s*=\s*function|\bfunction\s+teardownStale)\s*"
        r"\([^)]*\)\s*\{[^}]{0,900}"
        r"\.\s*teardown\s*\(",
        panel,
        "panel runtime: teardownStale() does not teardown stale owners",
        flags=re.DOTALL,
    )


def validate_named_owner(
    source: str,
    *,
    owner_name: str,
    version: str,
    label: str,
) -> None:
    require(
        rf"\.\s*create\s*\(\s*['\"]{re.escape(owner_name)}['\"]\s*,",
        source,
        f"{label}: lifecycle.create({owner_name!r}, root, version) is missing",
    )
    require(
        rf"\.\s*replace\s*\(\s*['\"]{re.escape(owner_name)}['\"]\s*,",
        source,
        f"{label}: lifecycle.replace({owner_name!r}, owner) is missing",
    )
    if version not in source:
        base, suffix = version.split("/", 1)
        require(
            rf"['\"]{re.escape(base)}['\"]",
            source,
            f"{label}: owner version base {base!r} is missing",
        )
        require(
            rf"['\"]/{re.escape(suffix)}['\"]",
            source,
            f"{label}: owner lifecycle suffix {suffix!r} is missing",
        )
    require(
        r"\.\s*on\s*\(",
        source,
        f"{label}: no owner.on() registrations found",
    )


def validate_panel_script(panel: str) -> None:
    validate_lifecycle_api(panel)
    validate_named_owner(
        panel,
        owner_name="panel",
        version=PANEL_VERSION,
        label="panel runtime",
    )
    require(
        r"\.\s*teardownStale\s*\(",
        panel,
        "panel runtime: teardownStale(nextRoot) is not called",
    )
    require(
        r"\.\s*onMql\s*\(",
        panel,
        "panel runtime: media-query listeners are not owner-managed",
    )
    require(
        r"\.\s*interval\s*\(",
        panel,
        "panel runtime: the clock interval is not owner-managed",
    )
    require(
        r"\.\s*(?:timeout|raf|observe|cleanup)\s*\(",
        panel,
        "panel runtime: no explicit long-lived resource ownership is used",
    )
    require(
        r"__mmsPanelVersion\s*=",
        panel,
        "panel runtime: compatibility version marker is missing",
    )
    require(
        r"__mmsPanelRoot\s*=",
        panel,
        "panel runtime: compatibility root marker is missing",
    )
    reject_unowned_global_registrations(panel, "panel runtime")


def validate_home_script(home: str) -> None:
    validate_named_owner(
        home,
        owner_name="home",
        version=HOME_VERSION,
        label="Home runtime",
    )
    require(
        r"__mmsRuntimeLifecycle",
        home,
        "Home runtime: shared lifecycle lookup is missing",
    )
    require(
        r"__mmsTwOverlayV3\s*=",
        home,
        "Home runtime: compatibility tweezer marker is missing",
    )
    require(
        r"\.\s*(?:raf|cleanup|timeout)\s*\(",
        home,
        "Home runtime: escaped iframe/rig resources are not owner-managed",
    )
    reject_unowned_global_registrations(home, "Home runtime")


SCRIPT_RE = re.compile(r"<script\b[^>]*>(.*?)</script\s*>", re.IGNORECASE | re.DOTALL)


def bodycopy_scripts(bodycopy: str, page: str) -> tuple[str, str | None]:
    scripts = SCRIPT_RE.findall(bodycopy)
    panel_scripts = [script for script in scripts if "__mmsPanelVersion" in script]
    home_scripts = [script for script in scripts if "__mmsTwOverlayV3" in script]
    other_scripts = [
        script
        for script in scripts
        if "__mmsPanelVersion" not in script and "__mmsTwOverlayV3" not in script
    ]
    expected_count = 3 if page == "home" else 2
    if len(scripts) != expected_count:
        raise ContractError(
            f"bodycopy: expected exactly {expected_count} inline scripts for {page}, "
            f"found {len(scripts)}"
        )
    if len(panel_scripts) != 1:
        raise ContractError(
            f"bodycopy: expected one panel runtime script, found {len(panel_scripts)}"
        )
    if len(home_scripts) > 1:
        raise ContractError(
            f"bodycopy: expected at most one Home runtime script, found {len(home_scripts)}"
        )
    if len(other_scripts) != 1:
        raise ContractError(
            f"bodycopy: expected exactly one shared early initializer, found {len(other_scripts)}"
        )
    early_source = (ROOT / "cargo/shared-early-init.html").read_text(encoding="utf-8")
    expected_early_scripts = SCRIPT_RE.findall(early_source)
    if len(expected_early_scripts) != 1:
        raise ContractError("canonical shared early initializer must contain exactly one script")
    if other_scripts[0].strip() != expected_early_scripts[0].strip():
        raise ContractError("bodycopy: shared early initializer differs from canonical source")
    return panel_scripts[0], home_scripts[0] if home_scripts else None


def infer_page(bodycopy: str, requested: str | None) -> str:
    if requested:
        if requested not in PAGES:
            raise ContractError("expected page must be home, who, or write")
        return requested
    match = re.search(
        r'<div\b[^>]*\bclass=["\'][^"\']*\bmms\b[^"\']*["\'][^>]*'
        r'\bdata-page=["\'](who|write)["\']',
        bodycopy,
        re.IGNORECASE,
    )
    return match.group(1).lower() if match else "home"


def validate_bodycopy(bodycopy: str, page: str) -> None:
    panel, home = bodycopy_scripts(bodycopy, page)
    if page == "home" and home is None:
        raise ContractError("Home bodycopy: lifecycle-owned Home runtime is missing")
    if page != "home" and home is not None:
        raise ContractError(f"{page} bodycopy: Home-only runtime is present")
    validate_panel_script(panel)
    if home is not None:
        validate_home_script(home)
    reject_legacy_guards(panel, home)


def validate_canonical_sources() -> None:
    panel = (ROOT / "cargo/panel.js").read_text(encoding="utf-8")
    home = (ROOT / "cargo/home-extras.html").read_text(encoding="utf-8")
    validate_panel_script(panel)
    validate_home_script(home)
    reject_legacy_guards(panel, home)
    for page in PAGES:
        bodycopy = (ROOT / f"cargo/{page}.html").read_text(encoding="utf-8")
        validate_bodycopy(bodycopy, page)


def self_test() -> None:
    panel = r'''
(function () {
  function ensureLifecycle() {
    var owners = Object.create(null);
    function create(name, root, version) {
      var timeouts = []; var intervals = []; var frames = []; var observers = [];
      var disposed = false;
      function active() { return !disposed; }
      function guard(fn) { return function () { if (active()) return fn.apply(this, arguments); }; }
      function on(target, type, fn, options) { target.addEventListener(type, fn, options); }
      function onMql(target, fn) { target.addEventListener('change', fn); }
      function timeout(fn) { return setTimeout(fn, 1); }
      function clearTimeoutOwned(id) { clearTimeout(id); }
      function interval(fn) { return setInterval(fn, 1000); }
      function raf(fn) { return requestAnimationFrame(fn); }
      function cancelRaf(id) { cancelAnimationFrame(id); }
      function observe(observer) { observers.push(observer); }
      function cleanup(fn) { return fn; }
      function teardown() {
        if (disposed) return;
        disposed = true;
        timeouts.forEach(function (id) { clearTimeout(id); });
        intervals.forEach(function (id) { clearInterval(id); });
        frames.forEach(function (id) { cancelAnimationFrame(id); });
        observers.forEach(function (observer) { observer.disconnect(); });
        window.removeEventListener('load', teardown);
      }
      return {name:name,root:root,version:version,
        active:active,guard:guard,on:on,onMql:onMql,timeout:timeout,
        clearTimeout:clearTimeoutOwned,interval:interval,raf:raf,cancelRaf:cancelRaf,
        observe:observe,cleanup:cleanup,teardown:teardown};
    }
    function replace(name, owner) { if (owners[name]) owners[name].teardown(); owners[name] = owner; }
    function teardownStale(root) { Object.keys(owners).forEach(function (name) { if (owners[name].root !== root) owners[name].teardown(); }); }
    window.__mmsRuntimeLifecycle = {apiVersion:1,owners:owners,create:create,replace:replace,teardownStale:teardownStale};
    return window.__mmsRuntimeLifecycle;
  }
  var currentMms = document.querySelector('.mms');
  var lifecycle = ensureLifecycle();
  lifecycle.teardownStale(currentMms);
  var owner = lifecycle.create('panel', currentMms, 'responsive-70/root-lifecycle-1');
  lifecycle.replace('panel', owner);
  window.__mmsPanelVersion = 'responsive-70'; window.__mmsPanelRoot = currentMms;
  owner.on(window, 'resize', function () {}); owner.on(document, 'click', function () {});
  owner.onMql(window.matchMedia('(max-width: 1023px)'), function () {});
  owner.interval(function () {}); owner.timeout(function () {}); owner.raf(function () {});
  owner.observe({disconnect:function () {}}); owner.cleanup(function () {});
})();
'''
    home = r'''
(function () {
  var lifecycle = window.__mmsRuntimeLifecycle;
  var shell = document.querySelector('.mms');
  var owner = lifecycle.create('home', shell, 'tweezer-v3/root-lifecycle-1');
  lifecycle.replace('home', owner); window.__mmsTwOverlayV3 = 1;
  owner.on(window, 'message', function () {}); owner.raf(function () {}); owner.cleanup(function () {});
})();
'''
    validate_panel_script(panel)
    validate_home_script(home)
    reject_legacy_guards(panel, home)

    def inject_home(statement: str) -> str:
        return home.replace("\n})();", f"\n  {statement}\n}})();", 1)

    bad_cases = {
        "permanent tweezer guard": home.replace(
            "var lifecycle = window.__mmsRuntimeLifecycle;",
            "if (window.__mmsTwOverlayV3) return;\n  var lifecycle = window.__mmsRuntimeLifecycle;",
            1,
        ),
        "raw global registration": home.replace(
            "owner.on(window, 'message', function () {});",
            "window.addEventListener('message', function () {});",
            1,
        ),
        "raw document.body listener": inject_home(
            "document.body.addEventListener('click', function () {});"
        ),
        "raw interval": inject_home("window.setInterval(function () {}, 1000);"),
        "raw timeout": inject_home("setTimeout(function () {}, 25);"),
        "raw animation frame": inject_home("requestAnimationFrame(function () {});"),
        "raw ResizeObserver": inject_home(
            "var leakedResize = new ResizeObserver(function () {}); leakedResize.observe(document.body);"
        ),
        "raw IntersectionObserver": inject_home(
            "var leakedIntersection = new IntersectionObserver(function () {}); "
            "leakedIntersection.observe(document.body);"
        ),
    }
    for label, bad_home in bad_cases.items():
        try:
            validate_home_script(bad_home)
            reject_legacy_guards(panel, bad_home)
        except ContractError:
            continue
        raise ContractError(f"self-test: destructive case unexpectedly passed: {label}")

    canonical_who = (ROOT / "cargo/who.html").read_text(encoding="utf-8")
    extra_script = (
        "<script>document.body.addEventListener('click', function () {});"
        "window.setInterval(function () {}, 1000);</script>"
    )
    try:
        validate_bodycopy(canonical_who + extra_script, "who")
    except ContractError:
        pass
    else:
        raise ContractError(
            "self-test: unexpected adjacent inline script bypassed the bodycopy inventory"
        )


def main(argv: list[str]) -> int:
    try:
        if argv == ["--self-test"]:
            self_test()
            print("Root runtime ownership self-test: PASS")
            return 0
        if len(argv) > 2:
            raise ContractError(
                "usage: validate-root-runtime-owner.py [bodycopy.html] [home|who|write]"
            )
        if argv:
            path = Path(argv[0])
            bodycopy = path.read_text(encoding="utf-8")
            page = infer_page(bodycopy, argv[1] if len(argv) == 2 else None)
            validate_bodycopy(bodycopy, page)
            print(f"Root runtime ownership: PASS ({page} bodycopy)")
            return 0
        validate_canonical_sources()
        print("Root runtime ownership: PASS (canonical sources and bodycopies)")
        return 0
    except (ContractError, OSError, UnicodeError) as error:
        print(f"Root runtime ownership: FAIL ({error})", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
