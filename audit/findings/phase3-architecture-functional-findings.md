# Phase 3 architecture and functional findings

This is a read-only audit record for the post-Round-80 working tree. It explains several systemic causes behind recurring regressions; it does not authorize Cargo, Figma, Freight, or public-site changes.

Machine-readable evidence: `audit/findings/evidence/2026-07-21-phase3-architecture-functional-summary.json`.

## Outcome

The site does not need a framework migration. Its strongest foundations are the transactional page assembler, exact shared-component comparison, stable data hooks, and carefully bounded Montran and Touchbaes parent-side checks. The weak point is runtime ownership: multiple scripts can control the same media and lifecycle, while only part of the system understands reinitialization.

That split is the most plausible systemic explanation for the exhausting pattern Ocean identified: a local visual correction can be correct, yet another interaction or media state regresses after Cargo serialization, root replacement, or an old helper running later.

Canonical static validation passed for Home, Who, and Write. Two targeted browser probes and two negative-control payload probes then found issues the existing gate does not catch.

## P1 — The legacy Home autoplay helper defeats the deferred-media controller

`cargo/home-extras.html:1` still contains an older global autoplay recovery loop. It selects every `.mms-video`, calls `play()` at startup, repeats on visibility, page, click, and touch events, and runs again every 2.5 seconds.

The canonical media lifecycle in `cargo/panel.js:567-665` does the opposite by design: it activates sources near the viewport and pauses videos when they leave the observer envelope.

In a 390×844 deterministic local probe with media methods instrumented before scripts ran:

- 27 videos existed;
- 60 `play()` attempts occurred within 2.9 seconds;
- all 27 videos received a play attempt;
- 21 of those videos were more than two viewport heights below the visible area;
- only two videos had been marked loaded;
- 25 pause calls also occurred.

This probe establishes conflicting control, not transfer bytes: the old helper keeps retrying every video after the observer has decided which media should be inactive. Once a below-fold video has been loaded during browsing, the interval can restart it after the observer pauses it.

Recommendation: remove the legacy all-video helper and make the observer lifecycle the sole playback owner. iOS interaction retries should apply only to loaded, visible/near videos. Preserve muted inline autoplay, posters, and video frame rate.

## P1 — The required deployment preflight can pass missing media and a stale runtime

`cargo/validate-cargo-payload.sh:75-115` proves that one root exists and that two responsive markers agree with each other. It does not prove that the agreed version is the canonical version, nor that Home still contains its approved media inventory.

Two in-memory negative controls both returned `OK: bodycopy payload is clean`:

1. Both `responsive-70` strings were changed consistently to `responsive-69`.
2. The complete `wtw-02` frame was removed from Home.

This matters because `cargo/PLAYBOOK.md:204-210` already records the exact historical failure: Cargo's Code View path removed all V7 and Touchbaes river media while leaving descriptions intact. The Playbook requires a human to count 68 media IDs after reload, but the mandatory pre-transfer validator does not enforce that contract.

The full audit inventory generator does know that Home must contain 13 bands and 68 media items (`audit/scripts/generate-system-inventory.py:1009-1016`), but it is not the routine deployment gate.

Recommendation: create a small approved deployment manifest containing the expected runtime/head versions, 13 bands, the exact ordered media-ID set and per-band counts, embed kinds/versions, and critical geometry such as the protected WTW 504×504 square. Validate local payload and persisted Cargo DOM against it. Updating the manifest must be an explicit baseline action, never an automatic side effect of a source edit.

## P2 — Root-aware initialization is not teardown-safe

`cargo/panel.js:5-21` notices a new `.mms` root identity and deliberately initializes again. That is sensible for Cargo. However, the prior instance leaves behind document/window listeners, the one-second clock interval, media and resize observers, media-query listeners, scheduled callbacks, and embed handlers.

The compact browser reproduction was deterministic:

1. Replace the current `.mms` root with a fresh root parsed from the same payload.
2. Re-execute the canonical `responsive-70` runtime.
3. Open the new compact panel.
4. Select Girly.

Before selection, `data-panel="open"` and `dialog.open === true`. After selection, the old document outside-click listener removed `data-panel`, while the new dialog remained open. Only one panel node remained, so the defect is stale behavior rather than duplicate visible markup.

Home extras has the opposite lifecycle problem. `cargo/home-extras.html:3-4` returns forever once `__mmsTwOverlayV3` is set, while frame and river references captured at lines 20-23 remain tied to the first root. A replacement Touchbaes iframe can therefore miss its load/mode binding even though incoming size messages query the current frame dynamically.

Recommendation: one runtime owner should register every listener and observer through a teardown registry, preferably `AbortController` plus explicit cleanup for intervals, animation frames, observers, object URLs, and iframe state. Teardown the old owner before initializing a new root. Fold Home-only enhancements into the same lifecycle rather than relying on a permanent boolean guard.

## P2 — Embed message contracts are inconsistent and partly wildcarded

The Montran bridge is the reference-quality implementation. `montran-booklet-direct-pdf-v17.html:429-464` validates `event.source`, the parsed parent origin, message shape, numeric position, direction consistency, compact state, and versioned readiness.

V7 and Touchbaes do not yet match that standard:

- `cargo/panel.js:567-575` posts generic visibility messages to `*`.
- `coffee-cup-bundle.html:424-428` accepts any message with `__mmsEmbedVisibility === 1`; it checks neither source nor origin.
- `cargo/home-extras.html:102-110` sends Touchbaes mode to `*`.
- Touchbaes checks that the sender is `window.parent`, but not the expected parent origin (`touchbaes-sticker-game-v10.html:1310-1321`).
- V7 and Touchbaes readiness messages are kind-labelled but unversioned.

Recommendation: use one versioned envelope with `kind`, `version`, and bounded payload. Derive exact origins from `data-src`, send to that origin, and validate source plus origin at both ends. Do not add iframe sandbox restrictions until the required capabilities have been inventoried; message hardening is independent.

## P2 — Compact Montran turning is pointer-only

Compact mode correctly moves page turning to the parent so river and page scrolling remain native. The iframe itself becomes non-interactive (`cargo/site.css:1237-1241`), and two transparent previous/next buttons own the tap halves.

However, both buttons are assigned `tabIndex = -1` in `cargo/panel.js:280-287`. The code retains a keyboard/programmatic click fallback, but normal keyboard navigation cannot reach either control.

Recommendation: keep the viewer visually control-free while exposing a focusable semantic turn path and Left/Right key handling. Verify with iOS VoiceOver and an external keyboard. Ocean should decide whether a minimal focus indicator may appear over the booklet or whether the instruction lives outside its artwork.

## P2 — The browser harness measures interaction surfaces without exercising them

The current harness is strong at inventory, geometry, accessibility trees, network, screenshots, and programmatic scroll measurement. It does not click, press keys, drag pointers, send touch gestures, cross the 1023/1024 breakpoint, replace the root, simulate blocked storage, or inject malformed embed messages. A source search found no Playwright click, keyboard, mouse, or touchscreen step in the collector.

That means both deterministic defects above are invisible to the standard matrix. A page can retain 68 media observations and zero overflow while panel state or runtime lifecycle is broken.

Recommendation: add a small separate interaction suite covering:

- compact panel open, select, outside tap, scroll, Escape, and focus restoration;
- desktop scrubber track, drag, mouse-leave reset, and keyboard operation;
- native vertical/horizontal river pass-through;
- 1023→1024→1023 transitions with state retention;
- saved-state reload, back/forward restoration, and storage failure;
- startup interruption and exact final-state restoration;
- valid, stale, malformed, and wrong-origin embed messages;
- Montran single-turn locking and center dead zone;
- one `.mms` root-replacement lifecycle test.

## Positive findings to preserve

- `assemble-pages.py` stages all three routes, validates them, commits atomically, and restores backups after a failed commit.
- `validate-shared-components.py` compares the complete shared runtime, panel, navigation, early initializer, header, and clock across Home, Who, and Write.
- The four 375ms startup cuts total exactly 1.5 seconds, restore the exact saved/default state, and remove their temporary lifecycle listeners when complete or interrupted.
- Montran validates its cross-origin parent contract and compact turn direction carefully.
- Touchbaes parent-side size handling validates source, origin, geometry version, compact mode, finite height, and bounded edge reserves.
- Scrubbers are generated only once per unchanged band and retain keyboard control without wheel interception or forced stepping.
- The Withered Green rotation is intentional and protected: exactly four direct paragraph `uses="eye-roll"` hooks, with no heading hook.
- WTW `wtw-02` remains square at 504×504 in the canonical source.

## Recommended remediation order

1. Add fail-closed runtime/media/embed manifest checks before the next visual Cargo batch.
2. Remove the old all-video autoplay loop and verify lifecycle playback on physical iPhone Safari and desktop Chromium.
3. Introduce teardown-safe runtime ownership and lock it with the root-replacement test.
4. Version and origin-lock V7 and Touchbaes messages using Montran as the reference.
5. Add compact booklet keyboard operation and the focused interaction suite.

No Cargo, Figma, Freight, or public-site state was changed during this audit.
