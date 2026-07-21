# Phase 3 platform, security, privacy, and recovery findings

This is a read-only audit record for the post-Round-80 working tree. It does not authorize Cargo edits, deployment, publication, Figma changes, or interaction redesign.

Machine-readable evidence: `audit/findings/evidence/2026-07-21-phase3-platform-security-summary.json`.

## Outcome

The site has several strong foundations: HTTPS-only canonical assets, exact origin validation around the Montran viewer, validated parent receipt of embed-ready and Touchbaes geometry messages, working PDF range delivery, no detected analytics or cookies, no detected secrets, and protected immutable GitHub recovery releases.

The main security boundary that needs urgent correction is the Touchbaes child-to-parent HTML bridge. The main operational risk is that the active V7 and Montran artifacts cannot be recreated from tracked source. The remaining issues are defense-in-depth, dependency, license, platform-header, and privacy-documentation gaps.

| Severity | Count |
| --- | ---: |
| P0 | 0 |
| P1 | 2 |
| P2 | 6 |
| P3 | 1 |

## P1 — Touchbaes crosses the iframe boundary with executable markup

The child serializes `cursorRig.innerHTML` into a `postMessage` at `Portfolio assets/_for cargo deployment/touchbaes/sticker game/touchbaes-sticker-game/touchbaes-sticker-game-v10.html:1330-1337`. The parent validates the expected iframe window and Freight origin at `cargo/home-extras.html:123-147`, but then assigns the received string to live `innerHTML` at `cargo/home-extras.html:51-60`.

The origin checks are valuable, but they do not make markup safe. If that exact hosted child bundle is compromised, replaced, or accidentally changed to emit unsafe attributes, it gains a direct markup injection path into `mmmmm.studio`.

Recommended correction:

- send only a versioned declarative state object: geometry, open/closed state, held sticker ID, and approved asset ID;
- build the escaped parent rig from trusted local DOM and an allowlist of fixed assets;
- reject unknown fields, values, versions, origins, and windows;
- remove the message-derived `innerHTML` sink entirely.

Verification must preserve the approved desktop tweezer position and interaction while proving no message-derived string reaches an HTML parser sink.

## P1 — Active V7 and Montran artifacts cannot be recovered from tracked source

The frozen embed manifest records the active V7 bundle as ignored, without a rebuild entrypoint or tracked reproducible source at `docs/audits/2026-07-20T175853-0400-round-80/local/embed-manifest.json:4-17`.

The active Montran v17 bundle is also ignored. Its tracked builder emits SHA-256 `56f5c03c...`, not the active `825cf2c3...`, and omits four approved contracts: `FreightRangeTransport`, the 1600px render limit, `__mmsBookletReady`, and version 17. See `docs/audits/2026-07-20T175853-0400-round-80/local/embed-manifest.json:37-63`.

Recommended correction:

- track the authoritative V7 app source and deterministic bundler;
- bring the tracked Montran source and builder to exact v17 feature parity;
- generate both bundles from a clean checkout without ignored inputs;
- gate future release work on frozen hash or explicit contract assertions.

This is both a recovery and supply-chain issue: the published output currently contains behavior the repository cannot reliably reproduce.

## P2 — Cross-origin embeds have no explicit sandbox, permission, or referrer policy

The three executable Freight iframes at `cargo/home.template.html:67`, `:117`, and `:209` have titles but no `sandbox`, `allow`, or `referrerpolicy` attributes.

Recommended correction:

- test a per-embed minimum sandbox, beginning with script execution and only the same-origin capability each embed actually requires;
- add an explicit Permissions Policy rather than inheriting browser defaults;
- add a deliberate referrer policy after preserving Montran's parent-origin validation contract;
- verify V7 WebGL, Touchbaes dragging, Montran range loading, and parent messages before enforcing.

Do not add sandbox flags blindly. Removing origin identity would break current message validation; the policy must be tested as one integration contract.

## P2 — V7 and Touchbaes retain wildcard or incomplete message validation

The Montran parent and child use exact origins, and the homepage validates ready and geometry responses. The remaining paths are weaker:

- the generic parent visibility signal uses `"*"` at `cargo/panel.js:567-574`;
- the Touchbaes mode message uses `"*"` at `cargo/home-extras.html:102-110`;
- Touchbaes outbound messages use `"*"`, and its inbound mode handler checks the parent window but not the parent origin at child lines `1254-1277` and `1310-1323`;
- V7 accepts the visibility message without source or origin validation and posts ready with `"*"` at V7 lines `424-439`.

Use exact target origins everywhere, validate both `event.source` and `event.origin`, and version every message schema. Tests should inject wrong-origin, wrong-window, wrong-kind, and wrong-version messages and prove they have no effect.

## P2 — Montran is a public arbitrary-CORS PDF parser endpoint

The viewer reads a caller-controlled `pdf` query parameter at `work/montran-direct-pdf-v10-src/montran-booklet-direct-pdf-v17.html:1101-1107`, then performs HEAD, range, and full fallback fetches at lines `1111-1202`. It checks the `%PDF` magic bytes on the full-fetch path, but it does not restrict protocol, origin, or path before the request.

This is client-side, not server-side request forgery, but it exposes PDF.js to arbitrary CORS-readable documents and makes the public viewer fetch third-party resources outside the approved portfolio contract.

Allowlist the exact Montran report or a narrowly defined HTTPS Freight host/path set. Reject everything else before the first network call. The approved URL must continue using 256KB ranges and the existing fallback.

## P2 — The public response lacks browser security policy headers

The frozen homepage response contains only status, date, content type, length, Cargo cache status, debug host, and server at `docs/audits/2026-07-20T175853-0400-round-80/public/home.headers:1-7`. It does not show CSP, `frame-ancestors`, Referrer-Policy, Permissions-Policy, `nosniff`, or HSTS.

Recommended sequence:

1. Establish which response headers Cargo can configure.
2. Start Content Security Policy in Report-Only mode because the site has extensive inline and embedded code.
3. Define the exact Cargo, Freight, font, media, blob, and frame sources.
4. Add frame-ancestor, referrer, permission, MIME-sniffing, and HTTPS policies at Cargo or an approved edge layer.
5. Enforce only after the complete compact/expanded interaction matrix is clean.

## P2 — The Framer API helper has a high-severity dependency advisory

`Framer/MM.S Framer API/package.json:10-12` requests `framer-api: "latest"`; the lock currently resolves Framer API 0.1.7 and `devalue` 5.7.1 at `Framer/MM.S Framer API/package-lock.json:20-34`.

The 2026-07-21 `npm audit` reports one high-severity advisory, GHSA-77vg-94rm-hx3p, for sparse-array deserialization denial of service in the installed `devalue`. This tool is not shipped to visitors, so it is not a public runtime vulnerability, but it is authenticated design tooling and should be deterministic.

Pin a reviewed Framer API version, move `devalue` outside the vulnerable range, rerun the design reads, and require a zero-vulnerability audit. The separate browser audit harness reported zero known vulnerabilities.

## P2 — StPageFlip's MIT notice is missing from the tracked distribution record

The vendored `page-flip.browser.js` hash is `bbaca0bbef57a22bb66a3fc69d67baf9a17fb9a9c89ec9ed35e2b91abe4bd1e7`. It exactly matches npm `page-flip` 2.0.7, which declares MIT. The minified file has no retained banner, and the tracked repository has no LICENSE or NOTICE file.

PDF.js 6.1.200 retains its Apache 2.0 notice, and Three.js r160 retains its MIT banner. Add a consolidated third-party notices file for StPageFlip and the other vendored runtime dependencies, then preserve required notices through the deterministic build.

## P3 — Privacy is low-collection but undocumented

No analytics, tracking pixel, form submission, cookie write, authentication header, or persistent personal data was found. The site stores appearance choices in local storage and a render-sequence signature in session storage. A published compact capture contacted MM.S, Cargo build/static/type services, Freight, and Google Fonts; no Cookie or Authorization request headers were observed.

Document this concise data and vendor inventory. Self-hosting fonts is optional unless a stricter privacy or resilience requirement is adopted.

## Transport and dependency positives

- Canonical URLs are HTTPS and no mixed content was found.
- Freight embed and PDF responses expose wildcard CORS, long cache lifetime, and ETags. The sample PDF range response is HTTP 206 with `Content-Range`.
- The published booklet used 262,144-byte partial requests against a 13,634,937-byte PDF.
- Montran validates the exact parent window and referrer-derived parent origin at v17 lines `370-464`.
- The parent validates the expected frame, kind, and origin before accepting embed-ready messages at `cargo/panel.js:667-678`.
- PDF.js 6.1.200 is Apache-2.0; StPageFlip is positively identified as 2.0.7 MIT; Three.js is r160 MIT.
- A scoped scan of 64 canonical and tooling text files found no AWS keys, GitHub tokens, OpenAI-style keys, private keys, or obvious assigned secrets.

## Recovery positives and remaining gate

The GitHub repository actively protects `main` and `round-*` histories from deletion and non-fast-forward changes. `round-69-gold` and `round-80-stable` are immutable releases. That is a strong recovery base.

The release gate is now deterministic embed recovery: do not treat the repository as complete until a clean checkout recreates V7 and Montran without ignored sources and verifies their integration contracts.

## Protected contracts

- Round 69 gold remains immutable and was not modified.
- Withered Green's intentional paragraph rotation remains untouched.
- WTW's second asset remains the approved square.
- Native horizontal rivers remain untouched; this audit proposes no wheel interception, forced stepping, or snap correction.

No Cargo file, Figma node, Freight asset, public page, or GitHub setting was changed during this audit.
