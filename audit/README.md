# MM.S audit harness

This directory contains the read-only, repeatable browser layer for Phase 2 of the MM.S whole-project audit. It is anchored to the verified Round 80 Phase 1 baseline at `docs/audits/2026-07-20T175853-0400-round-80` and does not modify Cargo, Figma, Freight, or the public site.

Approved behavior discovered after that capture is recorded additively in `docs/audits/2026-07-20-post-round-80-delta.md`. Intentional details that an automated cleanup must preserve are machine-readable in `audit/contracts/intentional-design-contracts.json`; neither record rewrites the frozen baseline.

The first post-guard browser evidence and unresolved defects are summarized in `audit/findings/preliminary-findings.md`. Phase 3 workstream reports and their machine-readable evidence are indexed in `audit/findings/README.md`. A failing visual/state run can therefore represent a successfully detected site defect; consult its run manifest and the tracked summary rather than treating every nonzero audit exit as a harness failure.

The harness keeps the site’s four intentional state axes intact:

- 5 themes: White, Girly, Quirky, Contrast, Black
- 4 typefaces: Serif, Sans, Mono, Gothic
- 4 scales: S, M, L, XL
- 3 frame shapes: Straight, Rounded, Oval

Their Cartesian product is 240 states. The state suite checks all 240 at one compact and one expanded reference, for 480 assertions per selected page. The visual suite uses a deterministic 22-state pairwise covering set across all 12 master widths, for 264 viewport screenshots per selected page.

## Safety contract

- External targets are read-only. The harness never logs in, saves, edits, publishes, uploads, deletes, or submits forms.
- Local assembly runs in the ignored run-output directory, never in `cargo/`.
- Browser contexts are disposable. State-axis changes and localStorage writes exist only inside those contexts.
- Round 69 gold and the Phase 1 Round 80 baseline are inputs only.
- Generated artifacts default to `audit/harness/output/`, which is ignored by Git.
- Scenario ordering and the full/pairwise state matrices are deterministic. The harness does not replace `Date`, `Math.random`, cryptographic randomness, timers, or embedded-frame runtime behavior.

## Targets

### `local-deterministic`

Copies the canonical Cargo source files to the run directory and executes the checked-in assembly and validation scripts there. This is the fast implementation target. It does not model Cargo sanitizer timing, editor hydration, managed-font authorization, CDN behavior, or public routing.

### `cargo-draft-snapshot`

Builds a deterministic fixture from the Phase 1 authenticated readback:

- saved Home, Write, and Who bodycopy;
- complete saved global CSS, including Cargo-managed regions;
- saved site head;
- representative `.content`, `.pages`, `.page`, `.page-layout`, `.page-content`, and `bodycopy` wrappers.

This proves behavior of the captured saved payload. It is not a live Cargo editor and cannot prove current authentication, unsaved state, live hydration, or sanitizer behavior after the baseline timestamp.

### `cargo-draft-live`

An optional authenticated preview adapter. It is disabled until explicit read-only route URLs are supplied. The harness does not attempt authentication or editor control.

```bash
export MMS_AUDIT_CARGO_DRAFT_URL_HOME='https://...'
export MMS_AUDIT_CARGO_DRAFT_URL_WRITE='https://...'
export MMS_AUDIT_CARGO_DRAFT_URL_WHO='https://...'
export MMS_AUDIT_STORAGE_STATE='/absolute/path/to/read-only-playwright-storage-state.json'
npm run audit -- --target cargo-draft-live --suite routes --page all
```

The same URLs can be passed with `--url-home`, `--url-write`, and `--url-who`. A signed preview URL may need no additional state; an authenticated preview can use `--storage-state`. The harness records only whether storage state was configured, never its path or contents.

### `published`

Reads `https://mmmmm.studio`, `/write`, and `/who` for current domain, cache, CDN, metadata, route, and public-delivery evidence. Every public run also performs read-only probes for `robots.txt`, `sitemap.xml`, the favicon, both secondary routes, and one deterministic missing route. Public results are timestamped because network and cache state can vary.

## Installation

The dependency lock is exact. `playwright-core` does not download a browser; the default launch path is the installed Google Chrome channel. `axe-core` is injected only for full accessibility profiles.

```bash
cd '/Users/oceancheung/Documents/Startup/MM.S/mm.s website/audit/harness'
npm ci --ignore-scripts
```

Dependencies:

- `ajv` 8.20.0, MIT
- `ajv-formats` 3.0.1, MIT
- `playwright-core` 1.55.0, Apache-2.0
- `axe-core` 4.10.3, MPL-2.0

Use `--channel chrome` (the default) or provide `--executable-path` for another Chromium-compatible binary. Browser installation is not required for configuration validation.

## Commands

List the complete configuration without launching a browser:

```bash
npm run list
node src/cli.mjs --list --json
```

Validate the 240-state product, pairwise coverage, target inputs, baseline paths, capture profiles, and viewport matrix:

```bash
npm run validate
```

Run the deterministic parent/child messaging self-test. It proves ordinary delivery, a transferred `MessagePort`, sent-call capture, receive-event capture in both frames, and native `Date.now`/`Math.random` behavior:

```bash
npm run self-test
```

Run a representative local Home smoke at 390×844 and 1440×900:

```bash
npm run audit -- --target local-deterministic --suite smoke --page home
```

Run all three routes against the Cargo snapshot:

```bash
npm run audit -- --target cargo-draft-snapshot --suite routes --page all
```

Run all 240 states at compact and expanded references:

```bash
npm run audit -- --target local-deterministic --suite states --page home
```

The state runner loads and settles once per page and viewport, then applies all 240 states with two painted frames between states. It does not pay the full startup cost 480 times.

Run the pairwise visual matrix:

```bash
npm run audit -- --target local-deterministic --suite visual --page home
```

Use a deterministic prefix when debugging:

```bash
npm run audit -- --target published --suite routes --page all --max-scenarios 2
```

## Suites

| Suite | Coverage | Collection profile |
|---|---|---|
| `smoke` | Compact and expanded defaults for selected pages | Full DOM, styles, geometry, accessibility tree, axe, diagnostics, network, performance, scroll, and screenshots |
| `routes` | Compact and expanded defaults for route set | Full profile without scripted scroll cadence |
| `states` | Every 240-state combination at compact and expanded | Reused-page DOM, computed-style, geometry, overflow, state, console, and message assertions |
| `visual` | 22 pairwise states at 320, 390, 430, 431, 600, 768, 1023, 1024, 1440, 1920, 2560, and 2940px | Reused-page screenshot, DOM, style, geometry, overflow, and state evidence |

Full Home profiles retain a top screenshot plus one viewport checkpoint for every `[data-band]`. They intentionally avoid one enormous full-page screenshot. Visual pairwise captures retain top-of-page checkpoints for practical review.

## Collected evidence

Every scenario writes a JSON record conforming to `schemas/scenario-capture.schema.json`.

- DOM: URL, title, language, metadata, canonical, runtime markers, state, headings, links, duplicate IDs.
- Intentional design contracts: approved Cargo-only hooks and forbidden placements, including the four Withered green paragraph rotations on Write.
- Computed styles: layout, overflow, touch/pointer behavior, colors, typography, borders, radius, clipping, object fitting, visibility.
- Geometry: document overflow, bands, rivers, all `data-media-id` elements, controls, sub-44px targets, viewport-extending elements, and each media frame's visible bounds after clipping ancestors are applied. Non-axis-aligned transformed clipping boundaries fail closed for explicit review rather than receiving an unreliable rectangular pass.
- Accessibility: Chromium accessibility tree, role counts, unnamed controls, axe WCAG 2.0/2.1/2.2 A/AA results.
- Diagnostics: console, page errors, unhandled rejections, resource errors, failed requests, and sent/received `window.postMessage` traffic across instrumented frames.
- Network: request type/status/duration, body/header bytes, cache/range headers, service-worker source, CDP priority/protocol/MIME/cache source, and separate startup, scroll-measurement, checkpoint-traversal, and post-checkpoint phases.
- Performance: navigation, paint, buffered LCP, CLS, long tasks, event timing, Chromium metrics, JS heap, and vertical/first-river frame cadence.
- Screenshots: top viewport and Home band checkpoints for full profiles; pairwise checkpoints across the master matrix.

The machine-readable field contract is in `schemas/collection-contract.json`.

## Run output

Each run contains:

```text
run.json
captures/*.json
screenshots/*.png
media-observations.jsonl
media-summary.json
fixtures/                         # fixture targets only
```

`run.json` records the Git commit, Phase 1 checksum-index hash, target authority and limitations, safety mode, deterministic scenario/state-matrix contract, scenario list, public platform probes where applicable, and aggregate status. It conforms to `schemas/run.schema.json`.

`media-observations.jsonl` provides one observation per rendered `data-media-id`, including natural size, rendered rectangle, ancestor-visible rectangle, clipped edges, responsible ancestors, DPR, state, viewport, source, poster, fit, shape policy, and mobile profile. `media-summary.json` aggregates maximum rendered dimensions, required pixel coverage, and unexpected ancestor-clip observations for use by the Phase 2 asset manifest.

Horizontal clipping by an owning native `.mms-river` scrollport is excluded because it is the intended browsing mechanism. Viewport intersection is not used, so below-the-fold and horizontally offscreen media are not false positives. A frame's own rounded or oval mask is likewise excluded. Any deliberate ancestor crop must instead opt in with `data-audit-allow-clip="x|y|both"` plus a non-empty `data-audit-clip-reason`; `data-fit="cover"` and `data-shape-policy="crop"` do not silently exempt a frame from an ancestor cutting it off.

## Known boundaries

- Browser automation is Chromium-based. Physical iPhone Safari, iPad Safari, macOS Safari, Firefox, Edge, pen, and coarse-pointer checks remain separate environment runs in later phases.
- Axe and the parent accessibility tree cannot inspect inaccessible cross-origin embed internals. Touchbaes, V7, and Montran require their own origin-scoped audits or explicit accessible alternatives.
- The message observer is installed in every script-enabled frame reached by the browser context. It records successful `window.postMessage` calls through a transparent `Proxy` and independently records delivered `message` events. A frame that blocks scripts, replaces `window.postMessage` after initialization, or communicates through `MessagePort`, `BroadcastChannel`, a service worker, or browser-internal channels is outside all or part of that evidence.
- Cross-origin `WindowProxy` access can bypass a page realm’s own wrapper or attribute a sent call to the target realm instead of the JavaScript caller. Accordingly, `observerFrameUrl` identifies the realm that reported a record, not an asserted sender; the delivered receive record is authoritative cross-origin evidence. Transferable or non-cloneable payloads can appear as type summaries; the original payload and transfer list are never changed.
- Network phase is assigned when a request starts. `startup` ends before scripted scroll measurement; scroll-induced lazy loads are retained in `scroll-measurement`, band traversal uses `checkpoint-traversal`, and any later traffic uses `post-checkpoint`.
- The Cargo snapshot is honest about being a fixture; only the optional live adapter can observe authenticated draft hydration.
- Service-worker and CDN results are meaningful only on remote targets.
- The harness records evidence; it does not assign issue severity or change the site.
