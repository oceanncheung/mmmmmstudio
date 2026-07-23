# Intentional design contracts

These contracts record approved details that a conventional cleanup or parity audit could otherwise misclassify as defects. They supplement the immutable Round 80 evidence; they never rewrite that historical baseline.

Automated checks must preserve each required selector and behavior. A Figma static endpoint may document the resting composition while Cargo supplies an approved interaction. In that case, the interaction is an intentional parity exception rather than drift.

Current protected exception:

- Write / Withered green: all four body paragraphs retain Cargo's native `eye-roll` effect. The heading does not rotate. The effect is dynamic, so tests assert one direct hook around the complete text of each paragraph, route and section presence, and the forbidden heading placement rather than a fixed angle.

## Third-party runtime notices

`third-party-runtime-notices.json` maps every Git-tracked browser runtime under
`work/**/vendor/` to its exact version, license, upstream source, file hash,
complete license block in `THIRD_PARTY_NOTICES.md`, and active or prepared
artifact identities. `validate-third-party-runtime-notices.py` rebuilds those
artifacts and rejects uncovered vendor inputs, notice drift, missing retained
banners, artifact identity drift, or vendor payload removal/duplication.

This is a tracked repository provenance and notice record. It does not claim
that immutable Freight files uploaded before this record contain a new
internal notice; that would require a separately versioned build and promotion.

## Framer helper dependencies

`framer-helper-dependencies.json` pins the private read-only Framer helper to
reviewed package and lockfile identities outside `GHSA-77vg-94rm-hx3p`. The
validator also hash-locks its config and smoke test, limits remote calls to the
documented read methods plus `disconnect()`, and rejects floating versions,
vulnerable serializer versions, or an unreviewed remote mutation. The online
`npm run audit:dependencies` check remains required whenever this tool is used
or its lockfile changes. Every contract input must also be Git-tracked so an
untracked dirty-worktree substitute cannot pass and disappear from a fresh
clone. The public MM.S site does not ship these packages.

## Executable iframe capability matrix

`iframe-capability-matrix.json` records the tested minimum policy for the
prepared V7, Touchbaes, and Montran successors. All three require scripts and
their real Freight origin identity, retain only the parent origin through
`strict-origin`, delegate no positive Permissions Policy feature, and deny the
finite reviewed feature set listed in the contract. The Chromium proof fails
if any browser-supported feature is either missing from that set or remains
allowed. The policy is deliberately
`prepared-not-active`: the canonical Cargo payload and deployment manifest must
remain on the active iframe URLs without `sandbox`, `allow`, or
`referrerpolicy` until a later atomic successor upload and Cargo promotion.

The browser proof applies every attribute before navigation, runs the actual
candidate builds, verifies real child origins and origin-only referrers, and
exercises V7 WebGL/visibility, Touchbaes mode/size/pointer dragging, and Montran Blob
worker/range rendering plus both turn paths. It also proves that removing
`allow-same-origin` produces an opaque origin and that removing the referrer
prevents child bootstrap. The finite iframe `allow` list is not represented as
a future-proof deny-all; browsers have no such iframe syntax. Exact proof-input
digests and npm/Phase 2 wiring are guarded so a no-op proof cannot silently
replace the reviewed test.

## Public response-header policy

`public-response-header-policy.json` records the response-layer remediation
plan for `MMS-AUD-037`. It is deliberately `prepared-not-active`: Cargo's
documented self-service surfaces cover CSS, bodycopy, Custom HTML, metadata,
and DNS, but no documented HTTP response-header rule. That finding does not
claim Cargo is incapable of support-assisted configuration. A separately
approved first-party edge is the other candidate owner; it cannot rewrite
responses from the independent `freight.cargo.site` origin.

The contract forbids treating `<meta http-equiv>` as equivalent to response
headers. CSP Report-Only, `frame-ancestors`, top-level Permissions Policy,
MIME-sniffing protection, frame protection, and HSTS require response-layer
delivery. It preserves frozen Round 80 evidence plus a 2026-07-23 live
Home/Who/Write and Freight observation. The Freight record contains each
actual normalized response-header map, status, content type, and byte range;
the missing-policy result is derived from those maps rather than asserted.
The contract leaves the header owner,
reporting endpoint, exact CSP, and Cargo editor/preview framing decision
unset. Those unknowns are promotion gates, not values to guess.

`validate-public-response-header-policy.py` verifies both evidence sets,
requires the exact runtime-origin discovery inventory, and keeps every Cargo
HTML and deployment-manifest surface free of fake response-policy activation.
The guard rejects literal or script-created policy meta tokens and meta
referrer substitutes. It also rejects false platform claims, premature
activation, route/Freight scope confusion, unsafe CSP widening, skipped
report-only discovery, and premature long-lived HSTS. A future activation
requires response-header ownership, a
privacy-reviewed report sink, clean report-only evidence, complete compact and
expanded interaction coverage, Cargo editor/preview compatibility, transport
and host audits, rollback, reload persistence, and fresh public response
proof. None of those external changes is authorized by this prepared record.

## Low-collection privacy inventory

`low-collection-privacy.json` is the factual repository record for
`MMS-AUD-040`. It inventories the four first-party appearance preferences, the
one tab-session startup signature, the active Touchbaes embed's removal-only
legacy key, the exact seven origins observed during fresh route loads and a
complete Home traversal, and visitor-initiated links that are not background
vendors.

The linked `docs/PRIVACY-DATA-INVENTORY.md` is deliberately a technical
inventory, not a public privacy policy or legal notice. Its negative findings
are limited to the audited source and dated browser evidence. Cargo, Freight,
and Google Fonts receive ordinary connection/request metadata; their
provider-side logging, retention, reuse, legal basis, subprocessors, and
deletion practices were not observable and are not claimed.

`validate-low-collection-privacy.py` hash-locks the disclosure, evidence,
canonical source inputs, and frozen Phase 3 evidence. It rejects unrecorded
storage access, cookie/beacon/form/tracker paths, preference transmission,
origin or outbound-link drift, deployable bodycopy resource additions, CSS
`url()`/`@import` additions, invented provider claims, absolute privacy
language, publication through Cargo, missing Git tracking, and missing or
duplicated Phase 2 wiring. Any visitor-facing notice remains a separate copy,
legal, visual, Cargo-draft, reload, and publication decision.

## Native-river ARIA source purity

`river-aria-source-purity.json` closes the repository recurrence path for
`MMS-AUD-003`. Frozen Round 80 evidence contains 12 native project rivers
serialized with both `hidden` and `aria-valuenow="0"`, but the same attributes
were already present in the saved bodycopy and HTTP response before the
current runtime executed. Fresh instrumentation found that the current runtime
writes scrollbar state only to the 12 generated sibling scrubbers, not to the
13 native rivers.

The production runtime is therefore intentionally unchanged. The active
deployment manifest pins the exact native-river inventory and requires zero
scrollbar roles or value/orientation ARIA on exact `mms-river` class tokens,
independently of its existing hidden-river check. Duplicate attributes are
rejected before parsing can discard their first value.
`river-aria-source-test.mjs` validates clean canonical sources, reconstructs
the exact 12-river Cargo contamination as a browser negative control, runs
Axe's `aria-allowed-attr` rule, preserves the separate scrollbar semantics,
and exercises compact touch panning plus expanded native horizontal wheel
scrolling. The contaminated fixture is expected to reproduce 12 Axe nodes; it
is proof that the source gate is necessary, not a runtime self-healing path.
