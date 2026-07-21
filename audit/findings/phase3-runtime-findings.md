# Phase 3 runtime findings

This is a read-only audit record for the post-Round-80 working tree. It adds findings beyond the Phase 2 record and does not authorize Cargo edits, deployment, publication, palette changes, or interaction redesign.

Machine-readable evidence: `audit/findings/evidence/2026-07-21-phase3-runtime-summary.json`.

## Evidence boundary

Three captures are the primary evidence set:

| Target | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Published Cargo | 390 × 844, DPR 2 | `audit/harness/output/2026-07-21T02-55-09-747Z__published__smoke/captures/smoke__0000__home__compact__white-serif-m-straight.json` | `918fcb5b0a912740c39903222657b03b35346c3c6e0cd092157b841c156ae81d` |
| Published Cargo | 1440 × 900, DPR 1 | `audit/harness/output/2026-07-21T02-55-09-747Z__published__smoke/captures/smoke__0001__home__expanded__white-serif-m-straight.json` | `6b253fcc78a8a470d59bd4deda41976470b14670c9945b65efd48dfe660cb6ef` |
| Deterministic local fixture | 390 × 844, DPR 2 | `audit/harness/output/2026-07-21T03-07-39-352Z__local-deterministic__smoke/captures/smoke__0000__home__compact__white-serif-m-straight.json` | `7b4adb626956298e2d55e36918412892bc3f41871e874e9bd777afb5e987e549` |

The following already-documented issues are intentionally not duplicated here: Touchbaes clipping at 1024px, Random Pics expanded clipping, Cargo’s river ARIA mutation, missing document language, and compact navigation target size.

### Fresh all-route corroboration

The final all-route runs cover Home, Write, and Who at 390px and 1440px:

| Target | Run manifest | Run SHA-256 | Result |
| --- | --- | --- | --- |
| Deterministic local fixture | `audit/harness/output/2026-07-21T03-52-18-381Z__local-deterministic__routes/run.json` | `78edaf044be128e69535912c3928c4ccab22f8c51faaff541b92c81997871698` | 6 captures; 0 fatal, non-200, overflow, state, or intentional-contract failures; 1 known Random Pics expanded clip; 11 Axe rule entries; 3 expected/aborted media or PDF requests; 70 media |
| Published Cargo | `audit/harness/output/2026-07-21T03-54-05-459Z__published__routes/run.json` | `424eccdf64c108d2b08fc9be7a547ec036164c00b2d1d07ee46d656c647a00d6` | 6 captures; 0 fatal, non-200, overflow, state, or intentional-contract failures; 1 known Random Pics expanded clip; 13 Axe rule entries; 3 expected/aborted media or PDF requests; 70 media |

All six local captures reproduce `html-has-lang`; both Home widths reproduce 12 `scrollable-region-focusable` nodes; compact Home, Write, and Who each reproduce five target-size nodes. Published Cargo adds 12 critical `aria-allowed-attr` nodes at each Home width and does not reproduce that mutation locally. The per-capture SHA-256 values are recorded in the machine-readable summary.

The Withered Green contract has zero failures in both all-route runs: four complete body-paragraph hooks, no heading hook, and no text outside those hooks.

## P1 — Three approved themes fail normal-text contrast

This is a canonical token issue reproduced in both local and published rendering. `cargo/tokens.css:10-40` defines these pairs:

- Girly green on pink: **1.840567812:1**
- Contrast magenta on yellow: **3.152823983:1**
- Quirky sky on brown: **3.833794536:1**
- White/black reference: **21:1**

The three colored themes are below the WCAG AA 4.5:1 threshold for normal text; Girly and Contrast are especially severe across body copy, captions, links, and controls.

Decision gate: Ocean must choose between revising the approved palette, adding separate accessible semantic text/control tokens while retaining the surface colors, or explicitly accepting these experimental non-AA modes. The audit authorizes no palette mutation.

## P1 — Main portfolio media lacks meaningful accessible alternatives and project structure

Canonical source inventory:

- `cargo/home.template.html`: 38 images, 35 with `alt=""`; 27 videos, all autoplaying and looping, none with an accessible label or title.
- `cargo/who.template.html`: two profile videos, neither labelled.
- Home uses 12 unnamed project-description figures and no real project headings.

Published compact accessibility-tree evidence:

- 27 video roles: 17 unnamed and 10 named only with the browser fallback “Unable to play media.”
- 12 figure roles, all unnamed.
- Seven image roles, four unnamed.
- No headings.

Published expanded evidence initially exposes only nine video roles, three unnamed figures, and no headings. The deterministic local fixture confirms that media names change with loading state rather than providing stable content descriptions: two video roles are empty and 25 expose the generic media-error name.

Decision gate: first classify which images and videos are meaning-bearing versus genuinely decorative, approve concise alternative text, and approve the visual-neutral project heading hierarchy. Do not bulk-generate alt text or alter structure without that content decision.

## P1 — Continuous autoplay motion has no pause or reduced-motion pathway

Across Home and Who there are 29 autoplaying, looping videos and zero visible video controls. `cargo/site.css:1319-1324` disables the intro rotation and startup transitions under reduced motion, but it does not pause the video, GIF, or iframe motion activated by `cargo/panel.js:577-665`. `cargo/shared-early-init.html:198-200` uses reduced motion and Save-Data only to skip the startup design sequence.

Decision gate: design and approve a global pause-motion or reduced-motion experience before implementation. The normal-motion version must preserve the intentional Withered Green rotation.

## P1 — Published Cargo defeats the intended compact deferred-load envelope

This is a published/Cargo-runtime divergence, not simply a canonical local-source finding.

| Metric before harness scrolling | Published compact | Local compact |
| --- | ---: | ---: |
| Startup transfer | 45,243,344 bytes / 43.147 MiB | 6,228,677 bytes / 5.940 MiB |
| Startup requests | 111 | 18 |
| Image requests | 76 | 14 |
| Image response bodies | 20,388,625 bytes | 2,503,343 bytes |
| Media requests | 16 | 2 |
| Media response bodies | 23,450,227 bytes | 3,281,235 bytes |

Published compact transfers **7.2636×** the deterministic local fixture’s startup payload. Published expanded is heavier again: 49,467,119 startup bytes, including 76 image and 16 media requests.

The canonical loader at `cargo/panel.js:577-665` says actual video and iframe sources remain observer-governed. This discrepancy therefore needs an exact deployed-body/Cargo-runtime diff before changing the media-loading policy.

Decision gate: identify whether Cargo hydration, deployed-body drift, or another runtime source is activating those requests. Preserve scrubber prewarming and native rivers.

## P2 — Layout stability and scroll cadence need physical profiling

Synthetic measurements are materially below a stable 60 fps:

- Published compact vertical scroll: 48 fps, 24 of 48 frames over 20ms, 33.4ms p95.
- Published expanded vertical scroll: 38.42 fps, 34 of 48 frames over 20ms, 33.4ms p95.
- Published expanded horizontal scroll: 46.82 fps, 25 of 48 frames over 20ms, 33.4ms p95.
- Deterministic local compact vertical scroll: 51.90 fps, 21 of 48 frames over 20ms.

Observed compact cumulative layout shift is also high in the harness: 0.7497 published and 0.7927 local. These are laboratory observations, not field Core Web Vitals.

Decision gate: profile media, iframe settlement, and compositing timelines on a physical iPhone and a representative desktop before choosing optimizations.

## P2 — Expanded `content-visibility` may prune projects from assistive navigation

`cargo/site.css:170-175` applies `content-visibility:auto` to every showcase band. Compact captures expose 12 figures, 27 videos, and three iframes in the accessibility tree; initial expanded captures expose only three figures, nine videos, and two iframes. Local and published Chromium agree.

Decision gate: verify full-project traversal with VoiceOver and NVDA. Accessibility behavior varies by browser, while removing containment has a real performance cost.

## Protected contracts and positive evidence

- Round 69 gold remains immutable and was untouched.
- Native horizontal rivers remain protected; no wheel interception, forced stepping, or snap correction is proposed.
- WTW `wtw-02` remained square and unclipped in all 264 visual observations.
- Withered Green intentionally retains exactly four body `uses="eye-roll"` spans in `cargo/write.template.html:31-37`; its heading is not animated. This rotation must remain.
- The broader completed matrices retained 68 Home media IDs, zero page-level horizontal overflow, zero state mismatches, and zero intentional-contract failures.

No Cargo file was edited, deployed, or published during Phase 3.
