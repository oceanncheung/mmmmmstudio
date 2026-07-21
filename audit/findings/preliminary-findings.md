# Preliminary browser findings

These are evidence-backed findings discovered while closing the Phase 2 harness. They are not the final scored audit report and do not authorize remediation or publication.

## P1 — Touchbaes is vertically clipped at the 1024px structural boundary

All 22 pairwise visual states at exactly 1024px clip `touchbaes-05` by 68.71875px at the top. The same iframe is not flagged at the adjacent compact widths or larger expanded references. The inline iframe minimum is 500px while the 1024px expanded river measures approximately 431.28px; bottom alignment therefore hides the top of an interactive embed.

Required decision before remediation: preserve the current expanded composition by increasing the river's intrinsic height, or proportionally reduce the game at the boundary. Complete interactive content and no crop remain acceptance requirements.

## P2 — Random Pics is vertically clipped across expanded states

`randompics-01` is the only clip in the complete 480-state reference run: 150 affected expanded states and zero compact failures. In the 264-capture visual matrix it fails 49 times from 1024px through 2940px. Maximum bottom loss ranges from 288.953125px at 1024px to 8.34375px at the widest references. At the default 1440px Medium state, both local and public delivery lose 12.1875px.

The evidence points to a fixed river height that does not include the complete caption, 12px gap, and proportional video height. Remediation must be checked against Figma before changing the visible composition.

## P1 — Cargo runtime corrupts the river accessibility contract

The published page, but not the deterministic local fixture, adds `hidden` and `aria-valuenow` to all 12 project rivers after the scrubbers initialize. Axe reports 12 critical `aria-allowed-attr` failures. The visually separate scrubber controls still exist, so this is a Cargo-runtime integration problem rather than missing source markup.

The same 12 native scroll regions are not keyboard focusable. Fine-pointer desktop scrubbers provide a separate keyboard route, but compact/coarse-pointer and native river semantics still require manual screen-reader and keyboard review. Any repair must preserve native touch/trackpad panning and the approved scrubber visual.

## P1 — Document language is absent

Local and published smoke runs for Home and Write report no `lang` attribute on the root HTML element. This affects assistive-technology pronunciation across all routes and is an invisible platform/head correction candidate.

## Needs manual decision — compact navigation target size

Axe flags the five compact text navigation/contact links for target size. Their tight body-leading rhythm is an explicit prior design choice, so this must be evaluated against WCAG spacing exceptions and physical-device usability rather than automatically restoring 44px rows.

## Confirmed protections

- WTW `wtw-02` stayed square in all 264 visual observations and had zero ancestor clips at every audited width.
- Home retained 68 media IDs, zero page-level horizontal overflow, and zero state mismatches.
- Local and published Write passed the Withered green contract at 390px and 1440px: four body-paragraph `eye-roll` hooks, none on the heading.

Machine-readable evidence: `audit/findings/evidence/2026-07-21-phase2-browser-summary.json`.
