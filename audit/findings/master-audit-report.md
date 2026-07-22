# MM.S master audit report

This report consolidates the Round 81 read-only audit. It is based on the immutable Round 80 capture plus explicitly documented post-baseline deltas. It authorizes no Cargo, Figma, Freight, route, DNS, GitHub, or public-site change.

Machine-readable registry: `audit/findings/issue-registry.json`.

## Executive result

The visual direction is strong and should not be redesigned. MM.S reads as a specific, authored studio rather than a generic agency template. The 240-state contract is coherent, all 128 canonical type-token comparisons pass, local and public copy match, native rivers remain stable, WTW is now square across the complete visual matrix, and Withered Green retains its four intentional rotating paragraphs.

The weak point is system ownership and release protection. Multiple runtimes can control the same media, initialization has no teardown, and the mandatory deployment validator can pass both a stale runtime and a Home payload with `wtw-02` removed. Those defects explain how an accurate local edit can be followed by an unrelated regression in Cargo.

The consolidated registry contains 44 issues: 0 P0, 16 P1, 24 P2, and 4 P3. No remediation has begun.

## Health score

Scores use 0 = unavailable/unsafe, 1 = major barriers, 2 = functional with material defects, 3 = solid with bounded gaps, and 4 = strong/verified. The combined score is the unweighted mean so the weighting is transparent.

| Category | Score / 4 | Rationale |
| --- | ---: | --- |
| Accessibility | 1.0 | Missing language, invalid river ARIA, contrast failures, weak alternatives/headings, continuous motion, and pointer-only booklet turning. |
| Performance | 1.5 | Published compact startup is about 43 MiB; synthetic scroll/CLS miss targets; the legacy autoplay loop fights the observer. |
| Responsiveness | 2.5 | Zero page overflow and strong native rivers, but Touchbaes clips at 1024 and Random Pics clips expanded. |
| Theming and design-system integrity | 2.5 | All 128 type-token values match; panel bindings, documentation, and Write structures drift. |
| Functionality | 2.0 | Core journeys and media load, but root replacement, playback ownership, keyboard turning, and interaction coverage are incomplete. |
| Platform resilience and security | 1.5 | HTTPS/CORS/range delivery and Git releases are strong; Touchbaes markup injection and unreproducible active embeds are P1. |
| Maintainability | 2.0 | Deterministic assembly, schemas, and inventories are strong; runtime ownership and deployment fail-closed checks are not. |
| Content and SEO | 1.5 | Copy parity and links pass; duplicate canonical routes, dead legacy routes, heading structure, metadata, and 404 recovery do not. |
| Design quality | 3.5 | Distinctive no-design direction, strong arrival, and organic rivers; compact journey ending and route orientation need decisions. |
| **Combined** | **18 / 36 = 50%** | **Strong design foundation, materially under-hardened delivery and accessibility.** |

## Positive evidence to preserve

- The complete local Home visual suite covers 22 pairwise states at 12 widths: 264 captures and 68 media IDs with zero page-level overflow or state mismatch.
- WTW `wtw-02` is square and unclipped in every observation. The superseded 765.2×765.2 source metadata is now guarded by a current 504×504 contract.
- Withered Green has exactly four direct `<span uses="eye-roll">` paragraph hooks, no heading hook, and zero contract failures in local and public all-route runs.
- All 128 Figma/Cargo type-token numeric comparisons pass.
- Home, Write, and Who local/public normalized copy hashes match; punctuation and multilingual text retain UTF-8 integrity.
- External project/contact destinations tested successfully, and the shared Email URI contains both intended recipients.
- The page assembler is transactional, shared components are compared exactly, and the audit harness now uses strict schemas and negative fixtures.
- HTTPS, Freight CORS/range support, current PDF partial requests, and immutable GitHub Round 69/Round 80 recovery releases are verified.
- The design anti-pattern scan returned zero findings. Browser-default links, asymmetry, variable media proportions, and intentional awkwardness are protected choices.

## Systemic causes

1. **Release validation checks cleanliness, not completeness.** The normal preflight does not know the approved runtime version, 68-media inventory, per-band counts, embed contracts, or WTW geometry.
2. **Runtime ownership is split.** The observer lifecycle, legacy autoplay helper, Home enhancements, and reinitializing shared runtime can all act on the same page without a common teardown owner.
3. **Figma endpoints are visually useful but structurally inconsistent.** Some components use the wrong token, clipped fixed instances, fixed overflowing containers, or stale documentation even when screenshots look right.
4. **Cargo delivery differs from deterministic source.** Published startup loads much more media and mutates river ARIA in ways not present in the local fixture.
5. **Accessibility and platform semantics were added after visual behavior.** Alternatives, headings, language, pause motion, landmarks, policies, and keyboard paths are incomplete despite strong visual/interaction craft.
6. **Active embed artifacts outran tracked source.** V7 and Montran contain approved behavior that the repository cannot recreate exactly from a clean checkout.

## Prioritized remediation batches

These are proposed batches only. Ocean must approve each visible or policy-changing batch before implementation.

### Batch 1 — Fail-closed release and regression guards

Address `MMS-AUD-028` first: add an explicitly reviewed deployment manifest for runtime/head versions, ordered media IDs, band counts, embed versions, and protected geometry. Add the interaction suite in `MMS-AUD-032`. This is the safeguard that prevents another WTW/V7/Touchbaes disappearance while later work proceeds.

### Batch 2 — Runtime and media ownership

Address `MMS-AUD-027`, `MMS-AUD-029`, and the published divergence in `MMS-AUD-009`. Remove competing playback ownership, add teardown, and prove visible/near autoplay on physical iPhone Safari before optimizing bytes or observers.

### Batch 3 — P1 accessibility foundation

Address `MMS-AUD-003`, `004`, `006`, `007`, `008`, and `022`. Semantic-only corrections can be isolated; palette, media-copy, hierarchy, and motion controls require Ocean's decisions. Preserve the four Withered rotations in normal mode.

### Batch 4 — Security and deterministic embed recovery

Address `MMS-AUD-033` and `034` before treating the repository as release-complete. Then harden message origins/versions, PDF allowlisting, iframe policies, headers, dependency advisory, and notices (`030`, `035`–`039`) in capability-tested sub-batches.

### Batch 5 — Responsive and Figma parity

Correct the proven Touchbaes and Random Pics clipping (`001`, `002`) and the Figma-only duplicate/clipped/fixed structures (`012`–`018`). Any visible geometry change begins in Figma and is verified at the full viewport/state matrix.

### Batch 6 — Content, routes, and visitor journey

Decide canonical routes, legacy project destinations, compact ending contact treatment, and project fragments (`020`, `021`, `041`, `042`). Then handle navigation landmark, route state, metadata, 404, favicon, and direct-entry panel discovery (`023`–`026`, `043`, `044`).

### Batch 7 — Performance and physical-device verification

After runtime ownership is stable, profile `MMS-AUD-010` and verify content visibility, compact target sizing, Montran keyboard/VoiceOver, and embed policies on the stated device/browser matrix (`005`, `011`, `031`, `035`).

## Decision gates

Ocean's explicit approval is required before:

- any palette or semantic color-token change;
- visible heading/current-route/contact-ending treatment;
- project fragments/index or redirect strategy;
- control-panel geometry or typography changes;
- motion pause/reduced-motion design;
- responsive media geometry that changes the approved composition;
- iframe policy enforcement, route/DNS/header changes, or publication.

Pure semantic, security, lifecycle, validation, and reproducibility fixes can be prepared as isolated proposals, but they still remain draft-only until their batch is approved.

## Protected contracts

- Never edit `cargo/gold/round-69/` or the frozen Round 80 evidence.
- WTW `wtw-02` remains exactly 504×504 at the approved desktop endpoint and must remain square/unclipped across states.
- Withered Green keeps exactly four Cargo-native rotating body paragraphs; the heading remains static.
- Horizontal rivers remain native. Do not add wheel interception, forced stepping, snapping, or animated correction.
- Preserve the editorial no-design identity, sentence case, browser-default link language, asymmetry, and variable media proportions.
- Publishing is a separate explicit action and is not authorized by this report.
