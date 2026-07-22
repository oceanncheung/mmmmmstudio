# Phase 3 Figma findings

This is a read-only comparison of live Figma file `aaJEv2Z8j6HaegMHou4N09`, the frozen Round 80 Figma inventory, and the current Cargo source/harness evidence. It does not authorize remediation or publication. No Figma or Cargo content was changed during this phase.

The required live flow was completed for desktop Control Panel `1:1039`, compact Control Panel `1:2899`, Write desktop `532:1208`, and Write mobile `640:448`: design context, screenshots, variable definitions, metadata, and targeted Plugin API property reads. Each live screenshot matches the frozen Round 80 capture byte-for-byte when rendered at the same size.

## P1 — Write mobile contains a duplicate passage

Write mobile `640:448` contains six Write Passage instances, while Write desktop and `cargo/write.template.html` contain the intended five. “Clout fleeing” appears twice:

- first instance `736:605`, title node `I736:605;736:590`, at y=516;
- duplicate instance `736:630`, title node `I736:630;736:590`, at y=1465.

The duplicated mobile passage is a Figma content error, not a Cargo omission. Removing it later must not remove the one intended Clout passage.

## P2 — The desktop panel is bound to the wrong width token

Control Panel root `1:1039` binds its width to `Space/col/2` (`VariableID:82:251`) even though `Space/panel/width` exists specifically for the capped rail.

The error is hidden at the common references because both tokens resolve to 200px at Desktop and 250px at Desktop 1800. At Desktop 2560 they diverge:

- `col/2` = 355.5556px;
- `panel/width` = 250px.

Therefore the component does not encode the approved “panel stops growing at 1800px” contract. Rebinding the root to `panel/width` is the direct design-system correction; no visual change should occur at 1440px.

## P2 — The desktop panel’s documented height contract is stale

The live component is Vertical Auto Layout, Hug height (`primaryAxisSizingMode=AUTO`), fixed width, 200×248px, with 24px block padding, 16px inline padding, and 16px group gaps. Its four rows are 20, 24, 72, and 36px. The resulting height is exactly:

`48 padding + 152 rows + 48 gaps = 248px`.

Its component description still claims 200×232 at 1440, about 142×209 at 1024, and 250×290 from 1800 upward. Current Cargo instead measures:

- 142.21875×220.25px at 1024;
- 200×248px at 1440;
- 250×310px at 1920/capped chrome.

The 1440 Figma and Cargo geometry agree; the prose and the narrower/wider scaling target do not. Decide whether the 248/220/310 geometry or the documented 232/209/290 target is authoritative before remediation.

## P2 — Compact panel typography does not encode one coherent token contract

The compact sheet root `1:2899` applies Mobile Space but no explicit Type Scale. Each face button independently forces Type Scale Small:

- `1:2868` Serif: 17/20px;
- `1:2869` Sans: 16.4/20px;
- `1:2870` Mono: 15.3/20px;
- `1:2871` Gothic: 15.8/21px.

Cargo intentionally renders the compact choices at the breakpoint Medium sizes: 20/23, 19.3/23, 18/23, and 18.4/23px (`cargo/site.css:984-990`). This is a direct Figma/Cargo mismatch, not a global type-token mismatch.

Gothic is additionally detached from the design system. Its inner text has no font-family, font-size, or font-style variable binding, and its 15.8/21px metrics differ from the canonical Mobile Small Gothic base value of 15.6/20px.

The panel slider’s `a` glyphs are bound to an external legacy `Type Scale/font/family` variable that resolves to Tinos in every mode. They are not bound to local `Typeface/font/family`. Cargo uses `--font-family-base`, so Figma currently fails to document the slider’s actual face-switching behavior.

## P2 — Write desktop relies on fixed frames plus unclipped overflow

Write desktop root `532:1208` is a fixed 1440×942 frame with clipping disabled. Its content `532:1210` is a fixed-height 1128×862 frame, also with clipping disabled, rather than Hug height.

The final child begins at y=1230 and ends at y=1421. This is 519px beyond the content frame’s bottom and 479px beyond the nominal page frame. Figma’s screenshot is consequently 1440×1421 even though the frame metadata says 1440×942.

This reproduces the intended appearance today, but it is structurally fragile: adding copy, changing type, or enabling clipping can hide content. The long content container should eventually Hug its children, while the 942px reference viewport should be represented separately.

## P2 — Write mobile achieves col/4 passages by clipping col/6 instances

Both compact Clout rows use a 228×200px clipped wrapper around a 350×200px Write Passage instance:

- wrapper `736:604` clips instance `736:605`;
- wrapper `736:629` clips duplicate instance `736:630`.

This masquerades as a col/4 text frame by cutting off a col/6 component. It is unsafe under typeface and scale changes. Cargo’s compact implementation is structurally better: the article owns its responsive col/4 width and aligns right without clipping.

## P2 — Write desktop spacing is behind the current Figma component

Write Passage component `736:595` and both Withered instances (`756:729`, `736:611`) use a 16px title-to-body gap. Cargo applies only 8px on expanded Write (`cargo/site.css:1440-1444`) and correctly restores 16px only below 1024px (`cargo/site.css:1590-1594`).

The first Figma desktop row Hugs to 291px. Cargo forces `.mms-write-top` to a 304px minimum (`cargo/site.css:1421-1429`), so the following Withered block begins at least 13px lower at the 1440 reference. The large inter-passage gaps themselves are correct: 64px desktop and 32px mobile in both systems.

## P3 — Variable scoping and documentation remain incomplete

The live file contains 119 local variables. Missing metadata is concentrated in four collections:

| Collection | Variables | Empty scopes | Empty descriptions |
| --- | ---: | ---: | ---: |
| Primitives | 11 | 11 | 11 |
| Color | 6 | 0 | 6 |
| Space | 48 | 2 | 32 |
| Type Scale | 32 | 32 | 0 |
| Typeface | 9 | 0 | 0 |
| UI State | 13 | 13 | 13 |

All 11 primitive colors still have no property scopes. All 32 Type Scale primitives have no property scopes. Space also carries 16 responsive semantic type aliases, which works technically but overloads a spacing/grid collection with typography routing. `unit/content` and `unit/chrome` are the only two unscoped Space variables and may reasonably remain broad unit primitives.

Color semantics have appropriate scopes, but all six lack descriptions. UI State’s 13 string variables also lack descriptions. These are maintainability and variable-picker issues rather than current rendering failures.

## P3 — Component descriptions are not current

- Control Panel `1:1039` describes a 200×232 component, but the live component and screenshot are 200×248.
- Write Passage `736:595` is documented as a showcase description with `title/tagline/blurb/url` props even though it is the canonical component used for editorial poems.
- Compact sheet `1:2899` is correctly described as a 390px endpoint whose responsiveness and 44px hit regions are owned by Cargo.

## Confirmed passes

- All 32 Figma type variables across four S/M/L/XL modes were compared with `cargo/tokens.css`: 128 numeric comparisons, zero mismatches.
- Write Medium resolves to 22/25px desktop and 20/23px mobile in both systems.
- `col/1` exists at every Space endpoint and matches Cargo: 84, 45, 105, and 149.3334px.
- The compact sheet uses Vertical Auto Layout and Hug height. Its 390×179 raster reference and row geometry match the current static Cargo composition before safe-area extension.
- The desktop panel’s 1440 visual geometry and optical 20/24/32/36px rows match Cargo.
- Write’s outer content gaps match: 64px expanded and 32px compact.

## Protected exception — Withered Green rotation must remain

Figma nodes `756:729` and `736:611` document the static, zero-degree resting composition. Cargo intentionally applies its native `eye-roll` effect to exactly four direct body-paragraph spans in `cargo/write.template.html:34-37`; the heading is excluded.

This is enforced by `audit/contracts/intentional-design-contracts.json:5-32`. The missing Figma rotation is not a discrepancy and must never be used to normalize away the Cargo motion.

## Reproducible screenshot evidence

| Node | Render | SHA-256 | Frozen match |
| --- | --- | --- | --- |
| `1:1039` | 200×248 | `2cddbf07f02fd0d6e97fea13cfe82e3ac89d9d088fa6e7b245509b2f2e230f14` | yes |
| `1:2899` | 390×179 | `6c9955762e86db80909a43e016c2fdd1047900a277197144aad967c41497afbf` | yes |
| `532:1208` | 1440×1421 | `fc5c702fe344eff76336243a0c3860bd608067f280ec38ff413ada27c36f7fb5` | yes |
| `640:448` | 322×1600 | `c9aeaddddb0dbe0b64e6b175e79a64897918ac82ff4813d2f898fed9949eee15` | yes |

Machine-readable evidence: `audit/findings/evidence/2026-07-21-phase3-figma-summary.json`.
