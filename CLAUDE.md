# mm.s website — agency site ("no design" / plain-HTML aesthetic)

**What:** The mm.s agency's own site. Deliberately un-designed: browser-default
HTML aesthetic (Times New Roman, default blue links, plain document flow) — in
the lineage of tracyma.com. Built/hosted on **cargo.site**; prototyped in
**Figma** first.

**Figma file:** https://www.figma.com/design/aaJEv2Z8j6HaegMHou4N09/web-design
**Reference:** https://www.tracyma.com/ · Current live draft: on Cargo (password/preview stage)

## Locked decisions (2026-07-05)
- **THEME ENGINE (2026-07-05) — the control panel realized as variable modes.**
  Select any frame → Appearance panel → switch modes per collection:
  - **Color — LIVE, OCEAN'S PAIRINGS (final 2026-07-05 PM): 5 modes = 5
    dots.** White (bg #FFF/ink #000) · Black (bg #000/ink #FFF) · **Navy (bg
    #051957/ink #FF0000)** · **Brown (bg #3D1E06/ink #4DBAFF)** · **Yellow
    (bg #FEFF01/ink #FF00FF)** — pairs defined by Ocean in foundations
    "color pairings" section (left ellipse = bg + dot default, right = ink +
    selected center; W/B already obeyed this rule). Modes RENAMED in place
    (Red/Blue/Green → Navy/Brown/Yellow) so all dot wiring survived.
    CONTRAST WARNINGS (artistic call, flagged not blocked): navy/red ≈ 4:1
    (borderline), yellow/magenta ≈ 2.9:1 (fails AA body). **EXPANSION
    PROTOCOL for new pairs:** add a 2-ellipse group frame in foundations →
    then: 2 primitives, 1 mode + 6 aliases, 1 Swatch variant pair
    (Default/Selected with pair fills), 1 dot instance in the panel row,
    1 state var + radio reactions rewire (all dots' action lists grow by
    one). ~one script; ask Claude to "sync color pairings". **Panel dots = radio
    controller** (color-theme/*-state vars bound to State props; ONE reaction
    each: 5 radio sets + SET_VARIABLE_MODE Color). **Literal-era fills were
    audited + bound** for theming: desc-master texts, intro texts, slider
    a-glyphs (all 4 variants), root bg, nav mask — all on text/primary /
    bg/page now. Panels NOT color-pinned (deliberate: the inverted-panel look
    was good in the earlier Black demo); Type-Scale pin stays. Transparent
    bands + themed root = the whole page re-colors from one dot click.
  - **Typeface** (4 modes): Serif="Times New Roman" · Sans="Inter" ·
    Mono="Source Code Pro" · Script="Dancing Script" (cloud has no desktop
    fonts; swap the Script value to any local font in desktop app if desired).
    **VERIFIED 2026-07-05: style-mediated bindings respond to frame modes** —
    text styles carrying the font/family binding is sufficient; no direct
    node bindings needed. Specimens now live in the foundations doc
    ("typeface" section, 4 explicitly-moded cards); the ad-hoc test strip on
    the components page was removed after verification.
    `font/family` var lives HERE now (old Type-collection var deleted).
    ~~Body Italic caveat~~ — obsolete: italics removed from the system
    entirely (2026-07-05), so ALL styles are family-bound and symmetric.
  - **Type Scale** (4 modes, default Medium; L/XL made DRAMATIC per Ocean
    2026-07-05 PM): caption/base/heading + lh —
    S 12/16/28 (lh 16/24/36) · M 14/18/36 (lh 24/24/48) ·
    L 18/24/56 (lh 24/32/72) · XL 24/32/72 (lh 32/40/88).
    Leading ratios tighten as size grows (body 150→133→133→125%, headings
    129→122%); Medium = the pure 24-grid mode, other scales live on the
    8-grid (deliberate trade). Compensated -sans/-mono/-script sets updated
    to match at L/XL. **BOTH control-panel masters carry an explicit
    Type-Scale=Medium pin** — panel chrome never scales (propagates to every
    panel/sheet instance; the slider's a-glyphs therefore stay Medium too).
  - **OPTICAL SIZE COMPENSATION v2 — X-HEIGHT NORMALIZED (2026-07-05 PM).**
    Method = CSS font-size-adjust equivalent: multiplier = xh(Times)/xh(face),
    **measured empirically in-file** (flatten "x" @100px, read ink height):
    Tinos 45.9 · Inter 54.5 · SCP 48.6 · Dancing Script 39.1 · Pinyon 33.5 →
    multipliers **Sans ×0.842 · Mono ×0.944 · Script ×1.174** (replaced the
    eyeballed 0.74/1.2; mono now has its OWN set — was wrongly sharing sans).
    Chain: styles' fontSize → Typeface `size/*` pickers → per-mode alias →
    Type-Scale sets `*-sans` / `*-mono` / `*-script` / originals (Serif).
    Body @ Medium: Serif 18 · Sans 15.2 · Mono 17 · Script 21.1.
    **Line-height: DELIBERATELY constant** (lh vars unchanged, 24 rhythm) —
    after x-height normalization equal leading = equal optical rhythm;
    per-face leading would re-introduce drift. Preview labels: Sans 11.8,
    Mono 13.2, Script 19.2 (Pinyon ×1.37). Slider small-a still on raw
    caption (post-flip rebind if wanted). Re-measure protocol lives here:
    flatten-x method, any new face gets its set + picker alias.
  - **Space** (2 modes): Desktop/Mobile (margins 40/20) — pre-existing.
- **Base font:** Times New Roman. Web stack `"Times New Roman", Times, serif`.
  Figma Serif variable `51:270`, mode `51:0`, is restored to
  `Times New Roman`; cloud readback verified the exact family on 2026-07-14.
  Do not flip it to Tinos for later automation.
- **Components page reorg (2026-07-05 PM, IN PROGRESS):** sections created —
  icons / atoms / molecules / panels (2 options) / sheets (2 options); Check
  Icon deleted (0 uses); text-free components placed (3 icons + Corner Radius,
  Swatch, Image Shape Option, Image Shape). The old Tinos-flip gate is closed;
  do not treat it as an outstanding prerequisite. ALSO NOTE: Ocean's canvas
  now uses the OPTION 2 family everywhere
  (desktop panel + mobile sheet swapped); Panel O1 + Sheet O1 have ZERO live
  instances — kept as design candidates, Ocean to decide their fate.
- **Links:** BLACK, always underlined (Ocean, 2026-07-05 — blue "read too close
  to the reference site"; reversed the earlier blue decision). `link/default`
  and `link/visited` both alias `black`; blue/purple primitives kept in the
  palette (blue is a Control Panel dot color). Visited treatment TBD if ever.
- **Type ramp (3 sizes, resist adding more):** Caption 14/24 · Body 18/24 ·
  Heading 36/48 (2 baselines). Tokens: `font/size/caption` (renamed from
  small), `font/size/base`, `font/size/heading`. Styles: Caption (renamed from
  Small), Body, Body Bold, Heading (Bold 36). Bold = hierarchy.
  **ITALICS: one sanctioned use — now FULLY MODE-AWARE (final, 2026-07-05
  PM).** `Caption Italic` switches typefaces like everything else via a
  **FONT_STYLE string variable** (`font/style-caption-italic`: Italic/Italic/
  Italic/**Regular**) bound alongside fontFamily — the Regular value makes
  Script mode fall back to plain Dancing Script (scripts have no italics;
  this is THE pattern for per-mode style fallbacks). fontSize on the
  size/caption optical picker; lineHeight lh/caption. Renders: Tinos Italic
  14 · Inter Italic 11.8 · SCP Italic 11.2 · Dancing Script Regular 16.4 (M).
  Used ONLY on the three showcase taglines; all other caption text = Caption.
  Cargo: <figcaption><em> + `font-style: normal` under the script theme.
  No shadows, no radii, no dark mode (v1). All line-heights are baseline
  multiples (snapped 2026-07-05).
- **Icon convention (Ocean, 2026-07-05):** ALL icons are **24×24 frames,
  1px stroke weight** — Check, Close (cross), Control (mixer, outlined knobs),
  Corner Radius glyphs. The Check Icon design is OCEAN's (24px frame, 1px,
  ~16px tick); do not "normalize" it back to 12px.
- **Slider spectrum:** small a = `font/size/caption` (14, bound), large a =
  28 LITERAL (Ocean: exactly 2× the small; unbound — `font/size/heading` 36
  stays for page headings only). Optical alignment: both a's have
  `leadingTrim: CAP_HEIGHT` and sit inside cage frames matching the 24px
  slider row; glyph optical center (baseline − xHeight/2, Tinos x-height ≈
  0.448em) sits at cage middle so the track runs through both glyphs.
  Recompute on size change: textY = 12 + 0.224·fontSize − boxH (cage h 24).
- **CONTROL ROW HEIGHT SYSTEM (Ocean, 2026-07-05 PM): 20 / 24 / 32 / 36** —
  color dots row 20 (dots fixed 20, SPACE_BETWEEN absorbs width) · slider 24
  · button rows 32 (natural: 4 + lh24 + 4) · image-shape row 36. Row gap 16,
  panel padding 16. ALL rows FILL width — the panel is fully fluid; Option 1
  desktop panel (200w) verified conformant (Ocean had also converted his
  actions rows to native GRID layout, 2×2 of 32-tall buttons — kept).
  Rollout to Option 2 + both Sheets PENDING Ocean's review.
- **Spacing:** margin/page 40 desktop / 20 mobile (Figma "Space" collection has
  Desktop/Mobile **modes**); content measure **548** / 350 (grid-derived:
  5 desktop cols; was 560 pre-grid).
- **Grid (2026-07-05):** Swiss modular (Müller-Brockmann) — desktop **12 cols ×
  84px, gutter 32, margin 40**; mobile **6 cols × 45px, gutter 16, margin 20**;
  **24px baseline rows** both. Integer columns by construction. Figma grid
  styles `grid/desktop` + `grid/mobile` with gutter/offset/baseline **bound to
  space tokens**; applied to both home frames. Seating: nav rail = cols 1–2,
  content = cols 3–7 (desktop), all 6 cols (mobile). Rule: image heights =
  multiples of 24. CSS: `repeat(12,1fr)`, `gap: 0 var(--space-32)`,
  `line-height: 24px`.

## What exists in the Figma file (built 2026-07-05, run `mms-lib-2026-07-05`)
- Pages: `main` (design) · `library — foundations` (token doc) · `library — components`
- **Variables** (all scoped + CSS `var()` code syntax): Primitives (5 colors),
  Color semantic (bg/page, text/primary, text/muted, link/default, link/visited),
  Space (4–64 + 128 scale, margin/page, measure/content, col/2·4·8 spans;
  Desktop/Mobile/Desktop-XL modes; space/128 = section gap, bound to Frame 1's
  itemSpacing on home),
  Type (font/family "Tinos", sizes 18/14)
- **Text styles:** Body, Body Bold, Body Italic, Small (bound to type variables;
  all line-height 24px)
- **Grid styles:** `grid/desktop` (12×84, g32) + `grid/mobile` (6×45, g16),
  each incl. 24px baseline rows; gutter/offset/sectionSize variable-bound
- **Components:** `Link` (State=Default/Visited, `label` prop) · `Timestamp`
  (`time` prop) · `Nav` (wordmark + work/write/who? + email/linkedin) ·
  `Swatch` (Color=W/K/R/B/G × State=Default/Selected — Selected = 8px CENTER
  DOT, radio-button style: white dot on colored swatches, black dot on White;
  checks removed per Ocean 2026-07-05) · `Buttons` (OCEAN's set: Shape=
  Rectangle/Ellipse × State=Default/Selected/Focus/Disabled + Icon#1:7 bool +
  label#1:8; Selected=inverted black fill for BOTH text buttons and pickers,
  Focus=1px dotted rectangular outline offset 3, Disabled=muted; Checked state
  DELETED — selection is always inversion, never checkmarks; NO hover variant)
  · `Check Icon` (24×24/1px — now UNUSED by any control, kept in library) ·
  `Image Icon` (24×24 filled mountains+sun pictogram) ·
  `Image Shape Option` (set, Shape=Straight/Rounded/Oval × State=Default/
  Selected. **FLUID since 2026-07-05 PM**: uniform 52×36 auto-layout cells;
  optical correction lives in PER-VARIANT INSETS on the `shape` stretch layer
  — straight 2 / rounded 1 / oval 0 → shapes 32/34/36 tall — so hierarchy
  survives FILL at ANY width. Glyph in-flow auto-centered. Default = bg +
  0.75px border (Ocean 2026-07-05 — lighter than the 1px icon weight) + ink
  glyph; Selected = inverted) ·
  `Image Shape` (row 168×36 reference, 3 Option instances at FILL/FILL —
  fluid by design now; the earlier keep-FIXED rule is obsolete) · `Slider` (a—a type-size slider; FIXED 2026-07-05: labels in-flow,
  track-area FILLs, track STRETCH + thumb CENTER constraints — never wrap slider
  guts in an absolute FIXED frame or a Group, groups scale children into ovals) ·
  `Corner Radius` set + `Image Shape` picker (OCEAN's; rectangle option demoed
  Checked) · `Control Panel (Option 1 + Ocean's Option 2)` + matching Sheets
  (Ocean's panel semantics: colors / corner-style / type-size slider /
  Serif·Sans·Mono·Script font buttons) ·
  `Control Icon` (24px mixer glyph, no text — TNR-flip-safe) ·
  `Close Icon` (24px vector cross, 2px flat-cap strokes — TNR-flip-safe) ·
  `Control Panel / Sheet` (390w bottom sheet: 1px top border, "controls" +
  Close Icon header, nested Control Panel instance with chrome stripped)
- **Mobile panel pattern (2026-07-05):** Control Icon sits LEFT of Timestamp in
  the mobile header; tapping opens the Sheet from the bottom. Frames:
  `home / mobile` (closed, 11:31) + `home / mobile — controls open` (21:148,
  sheet absolute-bottom). Prototype-wired: icon -> open, close/icon -> back,
  instant transitions (no animation, per aesthetic). Icon is 24px visually —
  MUST get >=44px tap padding in Cargo CSS.
- **Extra tokens (2026-07-05):** primitives `red #FF0000` + `green #008000`
  (panel dot colors) · semantic `border/default` → black (STROKE_COLOR,
  `var(--color-border)`) for panel/button/dot strokes
- **Frames on `main`:** `home / desktop` 1440×900 (node 11:2) · `home / mobile`
  390×844 with Mobile variable mode (node 11:31). Ocean's original empty
  `Wireframe - 1` (1:2) left untouched.
- Full node/variable ID ledger: see session scratchpad `dsb-state-mms-lib-2026-07-05.json`
  (IDs also recoverable by name — everything is deterministically named,
  sharedPluginData namespace `dsb`).

## Open items

**[2026-07-22] Round 90 — PRIMARY INTERACTION COVERAGE, TEST-ONLY (not deployed).**
Branch `round-90/primary-interaction-coverage` closes audit gap `MMS-AUD-032`
with browser contracts for compact panel behavior, scrubbers, native rivers,
startup state, embed readiness, Touchbaes sizing messages, and Montran compact
turn filtering. No Cargo, Figma, Freight, public-site, or visible UI mutation
was made. Full `bash audit/scripts/validate-phase2.sh` passed, including
122/122 frozen hashes, both 240-state gold parity matrices, media ownership,
swatch focus, Touchbaes iPad readiness, the new interaction suite, runtime root
replacement, source purity, and destructive deployment fixtures. The protected
gold `cargo/gold/2026-07-21-responsive-70` remains unchanged. Known deferred
issue: production `applyGameHeight()` still clamps zero/negative finite
Touchbaes heights to 1px; fix that in a later embed-validation batch.

**[2026-07-12] Round 30 — MOBILE NAV/CAPTIONS/GAME ENVELOPE/PENCIL, DRAFT (not published).**
Prepared `responsive-32`: mobile links now scroll away while the compact header
row remains at z10 under z20 showcases; Montran/Kelly/Random Pics share matched
caption-media widths, 12px filled gaps, and the smaller 1.1em manicule;
Touchbaes measures a deterministic maximum-scale/shadow envelope and reports a
single stable iframe height only after parent mode is known; the active pencil
uses two Cargo-native `pencil-3` passes for a real ink exterior and inverse
interior. Local Chromium passed 320–1024 with zero overflow, stable game heights,
10–19px maximum-shadow clearance, and desktop Kelly unchanged. Correct game v7
hash `C3031049959885552314264465225529` is uploaded and wired; Cargo reload
readback retains one root, `responsive-32`, protected font blocks, new CSS, and
the correct hash. Compact Cargo geometry passed at 729px, and the exact Freight
game passed its postMessage bridge at 390px. DRAFT ONLY. Full evidence:
DEPLOY.md Round 30.

**[2026-07-12] Round 29 — BOUNDED MOBILE PANEL + THEME-AWARE PANEL TYPE, DRAFT (not published).**
The compact tray now follows the approved bounded system: edge-to-edge through
430px, capped at 430px afterward with a fluid right inset, 273px normal height,
and a 213px three-row layout at 600px viewport height and below. Cargo's wide
mobile preview no longer stretches the 390px Figma composition. The portaled
dialog explicitly carries the active face and Cargo font-scale fallback, so
`Controls` and the 14px/28px slider labels now switch across Serif/Sans/Mono/
Gothic. The native `pencil-3` selected state uses theme ink fill plus inverse
theme-background tracing, and the compact intro order is control panel /
pencil / smiley. Runtime is `responsive-31`. Local viewport/face matrices and
Cargo interaction checks passed with zero compact page overflow; reloaded
Cargo readback retained one root, both runtime markers, the new CSS rules, and
all three managed font blocks. DRAFT ONLY; never publish without a new explicit
instruction. Full log: DEPLOY.md Round 29.

**[2026-07-12] Round 28 — FIGMA MOBILE PANEL, RENDER PREVIEW, TOUCHBAES STABILITY, PUBLISHED.**
Cargo now mirrors Figma mobile panel node 21:148: palette and type scale share
the first row, five 24px circular swatches sit in separate transparent cells,
and the face/shape rows use the shorter updated geometry. The panel is 273px
tall at 390px and preserves the existing expanded order. `responsive-30` adds
a four-combination, non-persistent first-session render preview and restores
saved settings after 540ms; reduced-motion and Save-Data skip it. Touchbaes
keeps keyed sticker nodes, ignores duplicate mode messages, derives iframe
height from untransformed layout, and reserves 29px bleed; the new Freight
file is X3030840525330113775081479518009. Mandy's alpha video uses the explicit
100vw `wide` profile while retaining VP9-alpha/HEVC-alpha routing. Cargo reload
readback has one `.mms` root, the new hash/profile/runtime, all three Cargo
text-style blocks, and the single managed CSS marker. Published to
`mmmmm.studio` at 11:48 on 2026-07-12 after Ocean explicitly requested a phone
preview. Public 390x844 reload proof passed with zero console errors. Future
edits return to draft-only. Full log: DEPLOY.md Round 28.

**[2026-07-11] Round 18 — INTRO DETAIL, DESCRIPTION CONSISTENCY, RETINA MEDIA, DRAFT (not published).**
Figma confirms the intro's final sentence is a separate block with a 24px gap,
and both Montran and AnyDay descriptions are the same `col/6` width (664px at
1440). Cargo now mirrors that structure: three intro paragraphs, a one-em
baseline-aligned native `happy-face-1` glyph, and Cargo's built-in Rotation
effect at 25 seconds per turn. Removed the obsolete AnyDay `col/8` override,
so Montran and AnyDay compute identically at every expanded width. Replaced
the seven named blurry stills with optimized retina derivatives from original
Figma fills, exact 4x Figma exports, or the supplied Montran map source. Reload
proof: all seven serve at 2.25x–2.68x rendered width, no edge artifacts, no
stray media items, no page overflow, native rivers unchanged, and Montran v11
intact. Full log: DEPLOY.md Round 18.

**[2026-07-11] Round 17 — WIDE-DESKTOP GEOMETRY CORRECTION, DRAFT (not published).**
Removed the centered 2560px shell and split expanded scaling into a content
unit (`--layout-u`, through 2560) and chrome unit (`--chrome-u`, capped at
1800). The page now fills the viewport; `--edge-pad` is equal on all four
outer edges and caps at 50px. From 1800 upward the rail stays 340px, the panel
stays 250×332px, and only the main content receives additional width. Cargo
reload proof at the 2900px Dia viewport: root 2900px, rail 340px, panel 250px,
clock right edge 50px from the viewport, final page bottom gap 50px, rivers to
the physical screen edge, and zero page overflow. Compact behavior and Montran
v11 are unchanged. Figma now documents Desktop 1800 and Desktop 2560 modes,
the chrome/content units, equal edge padding, and new wide reference captures.
Full log: DEPLOY.md Round 17.

**[2026-07-11] Round 16 — RESPONSIVE SYSTEM + MOBILE CONTROL DIALOG, DRAFT (not published).**
Implemented the approved compact/expanded system in Figma and the Cargo Work
draft. One structural breakpoint now switches at 1024px; the expanded grid,
rail, panel, spacing, and descriptions scale continuously through 2560px and
the complete 2560px composition centers above that width. Mobile rivers keep
native horizontal overflow with varied proportional media capped at 82vw and
62svh; there is no wheel interception, snapping, or scroll animation. The
mobile controls are a native modal dialog with safe-area padding, internal
overflow, focus transfer/restore, Escape dismissal, scroll lock, and 44px
targets. Figma received `col/10`, corrected bindings/Fill/Hug behavior, 44px
control wrappers, and verified 390/768/1024/1440/2560 reference frames. Cargo
reload proof: 13 bands, 69 responsive assets, zero page overflow, 2560px shell
centered at x170 in a 2900px viewport, defaults restored. Full log: DEPLOY.md
Round 16.

**[2026-07-11] Round 15h — MONTRAN VIEWER v11, ZERO CONTROLS, DRAFT (not published).**
Ocean clarified that page turning must be click/drag only. Removed the entire
navigation DOM, both arrows, button code/CSS, and keyboard arrow handler. Kept
the screenshot-matched 1074 x 302 spread centered in the 1176 x 504 frame and
page 19 default. Uploaded A3028631537...; Cargo reload shows v11, v10 absent,
and no navigation controls. Full log: DEPLOY.md Round 15h.

**[2026-07-11] Round 15g — MONTRAN DIRECT-PDF VIEWER v10, DRAFT (not published).**
Viewer now opens on PDF page 19 (spread 19-20), removes the center page/status
control, and uses the full 1176 x 504 frame so the 1074 x 302 spread is centered
at x51/y101. The older poster/dim/progress loader is restored only after a
650ms delay; fast loads bypass it. Uploaded bundle U3028615476...; Cargo reload
shows the v10 iframe and two arrows only. Figma/Cargo description audit: Cargo
matches the 1440 Figma spans exactly, but the unsourced 1800px XL token jump
creates a 36% text-frame jump and up to 80px overflow before 1880px. No
description CSS changed yet; proposed fix is pending Ocean's choice. Full log:
DEPLOY.md Round 15g.

**[2026-07-11] Round 15f — MONTRAN DIRECT-PDF VIEWER v9, DRAFT (not published).**
Ocean rejected the image-native v8 path and supplied
`flippable-booklet-export_v2.zip`. Deployed its PDF-native viewer: uploaded the
71-page PDF (P3028590574...) and self-contained bundle (Y3028594344...), then
wired the PDF through `?pdf=`. Preserved the existing 504 design-pixel height;
the export's 21:9 ratio makes the new width 1176. Cover + page 20 render checks
passed; Cargo reload shows the PDF cover, one page root, v8 absent, and the new
URL/size persistent. Plan: docs/plans/2026-07-11-montran-direct-pdf-v9.md.
Full log: DEPLOY.md Round 15f.

**[2026-07-11] Round 15e — HORIZONTAL RIVERS REBUILT, DRAFT (not published).**
Ocean: "the scroll is super stuttering... strip them and re-build from the
ground up." Removed Round-15 mandatory snap/snap-stop entirely and rebuilt the
rivers on native overflow only (no wheel handler, animation, smooth scroll, or
programmatic scrollLeft). The tweezer overlay's capture listener no longer
observes every descendant scroll; it is scoped to the Touchbaes game river.
Reload-verified: one bodycopy root, no stepper, no global capture, no mandatory
snap, Cargo font blocks preserved. Plan: docs/plans/2026-07-11-horizontal-scroll-rebuild.md.
Full log: DEPLOY.md Round 15e.

**[2026-07-11] Round 15d — RIVER STEPPER REVERTED, DRAFT (not published).**
Ocean: "i really hate this scroll let's just revert that." Removed the
Round-15c `/*mms-river-stepper*/` inline script and its local mirror. Rivers
are back to the Round-15b native-scroll + CSS-snap behavior; the offset spacer
remains a snap target so designed rest positions do not regress. Full log:
DEPLOY.md Round 15d.

**[2026-07-11 ~01:10] Round 15b — REGRESSIONS + TRUE COLUMN SPANS, DRAFT (not published).**
Rivers-pulled-left = R15 snap excluded the offset spacer -> no snap point
at scrollLeft 0 -> mandatory snap yanked rivers to margin-page at load.
Spacer is now a snap target (its snap position clamps to 0); rest offsets
restored (verified item1 at 624 XL). Theme-colored hairlines (Ocean: line
recolors per theme) = .mms-img placeholder bg (--color-text-muted) peeking
through sub-device-pixel raster gaps on fractional sizes -> .mms-img
background: transparent. Desc widths REDONE from the real Figma grid
(rework 83:251: 12 cols, col 84, gutter 32, margin 40 @1440; XL col 124):
col(n) = n*colW+(n-1)*32; V7/Loop/DeadGood = col-10 (NEW TOKEN --col-10:
1128 design/1528 XL/350 mobile), AnyDay = col-8, EVIIVE/Kelly + fixed
bands = col-6 default; the R14 col-8-minus-offset formula is GONE. XL
verified 1528/1216/904. Picker/white-dot/"yellow bg pink text" = the
PUBLISHED R12-era site (draft has palette v2 + THEME_MIG picker fix since
R13) — cmd+P resolves. HANDOFF-CODEX.md (project root) = full successor-
agent onboarding (paths, memory, playbook digest, upload matrix, current
state). Full log: DEPLOY.md Round 15b.

**[2026-07-11 ~00:40] Round 15 — ALPHA REBUILD + IMAGE-NATIVE BOOKLET + POLISH, ALL DRAFT (not published).**
Plan + as-built: docs/plans/2026-07-10-cargo-round15.md + DEPLOY.md R15.
8bit-girls "white noise"/iOS-opacity = ONE defect, proven numerically via
AVAssetImageGenerator: the ffmpeg->hevc_videotoolbox encode premultiplied
the matte against WHITE (silhouette pixels decode RGB==alpha ⇒ straight
color = pure white). Rebuilt BOTH alpha videos webm -> ProRes4444 ->
avconvert PresetHEVCHighestQualityWithAlpha (8bit-girls-alpha-v2 2.0MB /
mandy-hf-alpha-v2 6.1MB), data-mp4 swapped. RULE: never encode alpha via
ffmpeg's videotoolbox; ProRes -> avconvert only. BOOKLET v8 Z3028491865… =
image-native: 71 PDFKit page renders (gradients INTACT in the v4 pdf —
the "stripped gradients" were pdf.js's shading renderer dying on the right
side of the big teal sweeps) -> 1400px JPEG q88 (10.3MB, lazy) on freight,
config.pageImages manifest, index.html renderPage shim (pdf.js only for
?pdf=), iframe swapped param-less, Safari-verified. iPad "Invalid PDF
structure" class retired. [GOTCHA] bodycopy drop REJECTS image/webp
silently (jpg/png/gif/mp4 fine); mass uploads = staggered 650ms drops;
a wedged editor upload path is fixed by reloading the editor tab.
Hairline borders: WebKit letterboxes sub-pixel aspect drift (my -2
rescales) black — .mms-band video { object-fit: cover } systemic;
dg-image3/curate-image2 had real baked-in light edges -> 3px crops -> -v2
uploads swapped. Intro/clock/wordmark aligned at 40: the R13 intro rewrite
wrapped line 1 in <p> so .mms-intro p margin (--lh-base 25px) pushed the
0-height sticky head below its pin -> p:first-child margin 0 !important
(the mobile neutralizer re-asserts with !important; win by specificity).
Slider a-glyphs: per-face optical centers measured (TextMetrics): sans/
mono -0.131em, gothic -0.007/-0.025em (was flat -0.114em tuned on serif28;
gothic-14 sat 1.5px high). Thumb box-shadow none. Rivers:
scroll-snap-type x mandatory + snap-stop always + scroll-padding
margin-page (offset spacer excluded); strict one-per-wheel-tick = JS
hijack, offered not built. All reload-verified. NOTE: Ocean sometimes
reviews the PUBLISHED site (old palette/booklet/game — e.g. "yellow"
theme + white picker dot = R12-era published state); the draft carries
everything — cmd+P syncs. Deletables: booklet v7 C3028405902… + the pdf
X3026621020… + old hevc pair X3028308602…/A3028308632… (+ prior lists).

**[2026-07-10 ~23:00] Round 14 — iPAD ROOT-CAUSES + KELLY/DESC/CAPTION SYNC, ALL DRAFT (not published).**
Booklet "Invalid PDF structure" on LATEST iPadOS ≠ withResolvers: CDN bytes
proven clean (200/no-encoding/%PDF; HEAD lies accept-ranges:none but 206s
fine) and v6 renders in macOS Safari + Chrome → iPadOS-specific transport
failure inside pdf.js url mode. v7 C3028405902… = openPdfResilient: url
attempt unchanged; on failure cache-busted full fetch (reader progress) →
%PDF magic check → getDocument({data}); failures now show diagnostics
(status/first-bytes hex). Game v3 S3028401411…: synthetic touch events
proved the JS drag cycle sound → iPad failure = iOS gesture layer
(pointercancel on pan-claimable surfaces; game overflowed its iframe 9px);
fixed with blanket body touch-action:none/overflow:hidden/overscroll-none,
-webkit-touch-callout:none, setPointerCapture, preventDefault-on-drag-move.
UNIFIED HOLD MODEL: sticker always hangs at tweezer TIPS; mouse/pen = rig
hotspot at cursor (unchanged), touch = rig TIPS at finger (sticker under
finger, tweezer pinching beside); idle touch never moves the rig (game +
EMBED twTrack gate by pointerType; immediate twRest on touch end/cancel;
pointerout leave = mouse/pen only); hit-slop 18→28. Kelly: only real delta
was the manicule — shared 1.48/1.38em rule assumes 14px (montran) caption,
kelly is 16px → pinned .mms-band[data-band="kelly"] .caption text-icon to
19.3/20.7 u-px (equal-specificity !important loses by source order — bump
specificity, don't reorder). Desc widths: Figma FILL on b1/b2/b5/b7/b8/b12
→ ONE rule width: calc(var(--col-8) - var(--offset,0px)) (offset tokens
already col-N+space-32); inline px widths removed (v7/loop/deadgood/
anyday); data-band added to eviive/v7/touchbaes/mandy/loop; XL verified
592/1216/904. Caption plates: exactly montran 339:702 / kelly 442:519 /
randompics 405:504 carry bg/page on Figma → background: var(--color-bg-page)
on those three slots. Hidden-tab probes: rAF-batched updatePointer freezes
(zombie-rAF) — trust updatePointerNow/twTrack paths. Deletables: booklet
v6 U3028320643… + 5 older bundle copies + game v1 D3023626629…/v2
Z3028330445…. Ocean re-tests booklet + game touch on iPad; NOT published.
Full log: DEPLOY.md Round 14.

**[2026-07-11 ~02:00] Round 13c — PURELOVE ALPHA + HOVERS + iOS/SAFARI + GAME v2, ALL DRAFT (not published).**
Purelove-4 = another shots.so grey-card export → in-page flood-key (51% flood,
guard raised to 65% for card-not-ring shapes) → purelove-4-v2.png
S3028289855…, corners alpha-0 verified on the CDN rendition. Hover effects
live in Site CSS + local site.css: `.mms a:hover` bold, `.mms-btn/.mms-shape
:hover` invert via tokens, `.mms-dot:hover` box-shadow ring (not border —
reflow), range-thumb :hover fills; NOT gated on (hover:hover) — Pencil gets
them. iOS/Safari videos: 15 opaque webms src-swapped to H.264 uploads; the
ONLY 2 alpha webms (8bit-girls, mandy hf — detect via ffprobe stream_tags
alpha_mode=1, pix_fmt always lies yuv420p) got HEVC-alpha
(hevc_videotoolbox, decode forced -c:v libvpx-vp9 before -i, hvc1,
AVFoundation containsAlphaChannel=1) delivered by data-mp4 attr + panel.js
UA swap (isIOS/isSafari; live page script patched + local panel.js).
Booklet v6: pdf.js v4 needs Promise.withResolvers (iOS <17.4 hard-crash,
lib AND worker) → build-bundle.py prepends polyfill to both blocks,
U3028320643… swapped in keeping ?pdf=. Touchbaes game v2 Z3028330445…:
mobile = WIDTH-ONLY (the old `(hover:none) and (pointer:coarse)` clause
made iPads mobile while the site stayed desktop); interaction stays
per-event (touch direct-drag + tweezer rides next to the sticker, pen/mouse
tweezer-tip, Pencil hover works); tweezer visible in BOTH layouts (parent-
drawn rig now unconditional, parks on load/leave/touch-end); site-mobile
CSS caps the game iframe (100vw × board+tray calc) past its 762px inline
floor so phones still flip it to mobile layout. HTML uploads = MOUNTAINS
icon → input#file → React onChange via __reactProps (change event alone is
dead; hash lands in store.getState().media.data, NOT s3 perf). V7/AnyDay
second paragraphs were already in the 13b draft (Ocean compared against the
stale published site). Deletables added: purelove-4.jpg N30282469…, booklet
v5 I3027043806…, game v1 D3023626629…. Ocean to review + cmd+P. Full log:
DEPLOY.md Round 13c.

**[2026-07-10] STATUS — Round 8: Ocean's component fixes DONE; Type Scale v2 PLANNED.**
Montran map tile rebuilt to the redesigned Figma (Frame 4629): native Cargo
manicule `<text-icon icon="pointer-2">` as a SEPARATE flex item + hanging-
indent caption (bullet behavior, Figma-exact 20.7×19.3 icon / 2px gap /
22.7 indent), new transparent-frame screenshot montran-map-v3.png
(E3026982405…, tile/img 690, caption 516, inline `background:transparent`
REQUIRED on transparent PNGs — .mms-img has a gray placeholder bg).
Desc component gaps title-group/blurb/url now 8px on ALL bands (Figma
itemSpacing 8, was 4). Full acceptance checklist passed (themes×5, faces×4,
scales×4, shapes×3, geometry, served rendition, persistence×2, strays 0).
**TYPE SCALE V2 EXECUTED same day (Ocean: "let's do 22")** — serif ladder
S18 M22 L27 XL36; M row: caption 16/18, base 22/25, heading 41/50; faces
×0.966/×0.90/=serif; NO baseline grid (Space ladder untouched). Figma Type
Scale variables + Cargo tokens now carry IDENTICAL numbers (drift killed);
desc master + montran blurb were already variable-bound so the canvas
self-updated (no Tinos flip needed — float variable edits are TNR-safe,
proven twice). Panel locks bumped to 16/15.5/14.4/16 + title 20 (slider a's
stay 14/28 by design). Montran caption widened 516→526 (16px 3-line wrap;
caption→image gap now 8, Figma-exact). Full matrix verified post-reload;
NOT published. Plan + as-built: `docs/plans/2026-07-10-type-scale-v2.md`.
Session ops notes (hidden-tab Dia driving, screenshots NOW WORK, zombie-rAF
+ media-placeholder traps): DEPLOY.md Round 8 + PLAYBOOK section 2.

**[2026-07-10 03:45] Round 12 — CLEAN SLUGS LIVE.** Ghost purls freed
themselves after the publish; the -1 regression came from a title-case
retitle regenerating slugs (Cargo derives slug from title). Panel rename UI
is gone, so: NEW pages "write"/"who" (clean purls) + content copied from the
published -1 pages + all navs -> /write /who + republished. Live: / /write
/who all clean+200. OCEAN TODO: delete the old title-case "Write"/"Who" page
rows (orphaned at write-1/who-1) + the media-library list (DEPLOY.md R11).
His fun-slug fallback (times-up-but-still-writing / who-do-you-think-you-are)
was NOT needed — clean slugs won. Details: DEPLOY.md Round 12.

**[2026-07-10 ~20:35] Round 13 COMPLETE — FULL SYNC + 4 NEW BANDS, ALL IN
DRAFT.** After Ocean unlocked + parked the MCP tab visible: Phase 2+3
replayed and verified (new intro col-6, 9 real desc blurbs + Ella/Travis
links, montran caption v2, mandy 900, touchbaes 606.5, anyday reorder,
kelly zero-gap zine grid + up-icon caption), 26 uploads, EVIIVE rebuilt
(motion kept in slots 1/2/5 — RULE: figma Image Frames may be stills OF
live videos, size-match before swapping), 4 new bands (randompics tile /
purelove / deadgood / wtw). 13 bands total, 26 videos playing, themes x5
matching, strays 0. NOT PUBLISHED — Ocean reviews then cmd+P. Flags: url
rows on Figma still eviive placeholders (only EVIIVE shows a url live);
eviive-1/-2/-card jpgs + old anyday-logo v1 webm now deletable in the
library. Full log: DEPLOY.md Round 13 (incl. locked-machine + visible-tab
operating rules).

**[2026-07-10 ~19:10] Round 13 — PALETTE V2 LIVE IN DRAFT; REST PAUSED ON
SCREEN LOCK.** Done+verified: girly (#FFEEF4/#00CD0A) / quirky (#553D12/sky)
/ contrast themes replace navy/brown/yellow, new panel dots (ink outer + bg
center), localStorage migration, AND the picker-stays-selected-on-refresh
fix; kelly caption CSS (icon rotate -90 = up) live. LOST to the lock (Cargo
CRDT sync does not save while the Mac screen is locked — edits silently
revert on reload!): Phase 2 texts + Phase 3 bodycopy geometry — full replay
manifest in docs/plans/2026-07-10-cargo-round13.md. PENDING: 26 uploads
(11 staged + relay server :8934 running), anyday cropped webm swap, 4 NEW
bands (Random Pics/PURE LOVE/Dead Good/WTW), eviive rebuild. RESUME = Ocean
wakes/unlocks the Mac, then replay per plan. NEW techniques in DEPLOY R13:
React-fiber invocation (beats dead clicks), IFRAME localhost relay v2
(no gesture, works locked), locked-machine behavior table. DRAFT ONLY.

**[2026-07-10 03:31] Round 11 — SITE PUBLISHED LIVE (Ocean: "please publish
for once").** 6 videos wired from the red-note paths (4 AnyDay + 1 Curate via
the new LOCAL FILE RELAY: localhost popup postMessages ArrayBuffers into the
editor — zero agent transfer; mandy SATAIC was already hosted), mandy river
= 618 with SATAIC at 464×618 ("try something new" ✓), nav hrefs aligned to
the REAL slugs /write-1 /who-1 on all 3 pages (ghost-slug collision blocks
clean /write /who — flag for Ocean), homepage flag was already ours, PUBLISH
clicked (globe → Publish changes) and LIVE-VERIFIED (mmmmm.studio serves all
9 bands, videos, booklet v5, map v4; /write-1 + /who-1 = 200). LIBRARY
CLEANUP BLOCKED: the picker's button.delete ignores real+synthetic clicks —
Ocean's manual list in DEPLOY.md Round 11 (9 images + 4 old bundles;
CAUTION: same-named video items are live). Full log: DEPLOY.md Round 11.

**[2026-07-10 later] Round 10 — grey frame killed, booklet v5, ALL 9 RIVERS LIVE.**
Map v4 (Z3027026...): the "transparent" v3 was fully opaque (shots.so grey
CARD ring; Round 8 checked the alpha channel not the VALUES — rule: verify
transparency by sampling pixels); fixed by in-page border flood-key, edges
now meet pure page bg. Booklet v5 (I3027043...): loading = spread-poster +
dim + progress bar (poster synthesized in-page from the PDF via the bundle's
own pdf.js); corner hint 24-44px + shadow boost (was 10-18, too subtle);
build-bundle.py added. Rivers 7-9 deployed (anyday/2 5 imgs, kelly/4 2x2
zine GRID at 792 river height — display:grid inline survives the sanitizer,
curate Loop-pattern 4 imgs); descs use Figma taglines, URLS OMITTED (Figma
carries eviive.* placeholders — need real URLs); slideshow-named stills
shipped as images (no red-text video instructions on Figma). Figma's Mandy
Ma row now measures 618 tall vs the live band's older layout — unconfirmed
redesign, ask Ocean. Freight is CORS-clean from the admin page (in-page
transform/re-upload pipeline; no byte transfer). Full log: DEPLOY.md
Round 10. NOT PUBLISHED.

**[2026-07-06] STATUS — Cargo site is now RESPONSIVE (fluid GRID, 1440 base).**
The GRID (columns, spacing, margins, nav rail, images) scales via
`--u = min(100vw/1440,1px)` from the 1440 base down to the ≤760 mobile
hand-off; the TYPE stays a FIXED px size (Ocean r3b: "the grid should be on
scale. the font size should always stay the same" — an earlier `--ut` type-
scaling attempt was removed). Narrower columns just reflow the fixed-size text;
phone layout unchanged below 760.
Deployed to the Cargo DRAFT + verified persistent after a full editor reload;
**NOT published** (Ocean publishes). Full recipe + the non-obvious Cargo
global-CSS location (right rail "Site Settings" → "CSS / HTML", autosaves; page
bodycopy image styles via top-bar "Code View" → HTML → "Update") are in
`cargo/DEPLOY.md` Round 3 and `cargo/PLAYBOOK.md`. NOTE: several bullets below
are now STALE (work/write/who pages exist + are published; the control panel is
built and responsive) — kept for Figma-side history. The `cargo/` docs are the
current source of truth for the built site.

- [ ] **Contrast:** timestamp gray `#999999` on white = 2.85:1 — fails WCAG AA
  (needs 4.5:1 at 18px). Recommend darkening `gray/60` primitive → `#767676`.
  Ocean to decide.
- [ ] Mobile tap targets: stacked 18px links ≈25px tall (<44px). Genre-standard
  compromise; if fixed, fix in Cargo CSS (`a { padding-block: … }`), not Figma.
- [ ] Design `work` / `write` / `who?` page frames (only `home` exists).
- [ ] **"Another level" concept — panel EXISTS, behavior NOT brainstormed:**
  `Control Panel` component (from Ocean's 2026-07-05 paper sketch) now sits
  bottom-left on home/desktop. Placeholder semantics: row-2 labels
  serif/sans/mono are a GUESS from the sketch caption "1. serif" — editable via
  the `label` prop; the 4 action buttons are unlabeled "button"; slider
  function unknown; mobile placement not designed. The real behavior
  (what the dots/slider actually manipulate — page? generative artwork?) is
  p5.js/canvas **code** on Cargo — Figma only mocks states. Brainstorm scope
  before building. Tension to resolve: if buttons switch the site font away
  from Times New Roman, it dilutes the "no design" thesis — panel possibly
  should drive artwork/canvas, not site chrome.
- [ ] Cargo implementation: map tokens 1:1 from the `var()` code syntax already
  on every Figma variable; live-clock JS for Timestamp; keep semantic plain HTML.
  Theme engine maps to CSS: `[data-theme]` attribute swapping custom-property
  sets (exactly mirrors Figma modes).
- [ ] Foundations doc page predates the theme engine — refresh it with a modes
  section (theme swatch matrix, scale table, typeface specimens) at some point.
- [x] ~~Option 2 left in Black mode as demo~~ — cleared 2026-07-05 after it
  leaked into Sheet Option 1 (its nested panel is an Option-2 INSTANCE, and
  explicit modes on a MASTER propagate to all instances). RULE: never leave
  demo/explicit modes set on component masters — demo on a throwaway frame or
  screenshot-and-revert in the same script.

- [ ] **Work showcase gallery (2026-07-05 PM):** Ocean built the first EVIIVE
  case strip on home/desktop inside a GRID-layout frame — wrong container for
  scroll-over behavior. CORRECT PATTERN (researched + demo'd, frame "gallery
  pattern — demo" 80:251 on main page): text block as normal layer UNDER; a
  TRANSPARENT regular frame (not auto-layout) spanning col-3→right-margin ON
  TOP with clipsContent + overflowDirection=HORIZONTAL; inside it the
  auto-layout image row with a leading OFFSET-SPACER (= text width + gutter).
  Figma constraint: fixed-position layers ALWAYS render above scrolling
  content, so "images cover text" MUST use the transparent-overlay pattern,
  never fix-position. Image sizes stay grid-span widths / 24-multiple heights.
  Fully fluid proportional images are impossible in Figma (no vw units) —
  discrete responsiveness via width tokens/modes; true fluidity happens in
  Cargo CSS (flex-basis + overflow-x).
- [x] **Rework BUILT without the flip (2026-07-05 PM): "home / desktop —
  rework (WIP)" (83:251, at 1560/1200; Ocean's original untouched above it).**
  Ocean's stacking preserved (intro ABOVE showcase); scroll architecture live
  (viewport 1128 / strip 3680, overflowDirection=HORIZONTAL — drag in
  Present); image heights snapped to 24-grid (288/168/504/240/372/372/168);
  river widths bound to col tokens; intro content width bound to col/4; nav
  pin = SPACE_BETWEEN (gap-960 hack removed); main column FILL (fluid).
  **Showcase-band structure (REVISED per Ocean 2026-07-05 PM — bottom-aligned
  river):** band (plain frame in flow, FILL×696): gallery-viewport (FILL×504,
  clips, scrolls; row counterAxisAlignItems=MAX so ALL images hang from the
  shared y=504 bottom line) + project-description (STATIC at x=464, y=520,
  width col/4). Images never extend below the line → text is never covered —
  Ocean's simplification, correct: no z-overlay trick needed anymore.
- **Responsive mechanism (2026-07-05 PM):** dragging a frame wider NEVER
  recomputes tokens (Figma has no fluid units) — responsiveness = SPACE MODES.
  Added **Desktop XL mode (1920: 12×124px cols, gutter 32, margin 40 — exact
  integers)**: col/2 280 · col/4 592 · col/8 1216 · measure 748. Proof frame
  "home / desktop — rework @1920 (XL mode)" (93:251): intro/desc/cover 432→592,
  big image 896→1216, all from the mode switch. CAVEATS: (1) TNR text boxes
  resize but the CLOUD can't re-measure wrap — check XL text reflow in desktop
  (renders fine there); (2) image HEIGHTS are not tokens — widths grow, heights
  stay (crop/stretch per scaleMode) — decide height tokens vs accept crop. Discovered TNR loopholes:
  clone()/resize()/layout-mode changes/delete/WIDTH-binding all WORK on
  text-bearing nodes; only characters/styles/fontName/REPARENT are gated.
  ~~DEBT: 3 card texts literal-Tinos off-system~~ — RESOLVED by Ocean
  (2026-07-05 PM): he applied Body/Caption styles himself; texts are
  family-bound/on-system again (and therefore TNR-gated for automation).
  Description spacing matched to his original (desc gap 4, by Ocean).
  REMAINING micro-deltas vs his original: title+tagline should be a gap-0
  pair (currently flat 4) — fix = select both, Shift+A, gap 0 (or post-flip);
  tagline is one merged string vs his 3-piece gap-4 row (sub-pixel visual
  difference). Ocean's tagline stays 14 ITALIC — italics formally removed
  from the system, his ad-hoc reintroduction stands unchallenged for now.
  **Col-span tokens (2026-07-05 PM):** `col/2` 200/106 · `col/4` 432/228 ·
  `col/8` 896/350 (Desktop/Mobile modes, WIDTH_HEIGHT scope, var(--col-N)).
  **Project-card anatomy (Ocean spec):** card = VERTICAL auto-layout, width
  BOUND to a col token; cover image + title/tagline/blurb all FILL — so the
  description width follows the image width via the grid token. Demo'd live
  in the gallery demo (card 82:254); Ocean's real Frame 2 already has the
  right structure — just needs its width bound to col/4 (flip-gated with the
  rest).

- [x] **Fixed intro (2026-07-05 PM, v2):** Ocean's sticky attempt scrolled-
  then-pinned-at-edge; replaced with true FIXED: new root-level block
  "intro — fixed" (98:316) — verbatim replica, Tinos literal, WHITE plate +
  paddingBottom 24, width bound col/4, abs (272,40); root overflow=VERTICAL,
  numberOfFixedChildren=1 (assumed last-N semantics — VERIFY in Present; if
  Frame 1 freezes instead, semantics are first-N and the fix inverts).
  **Ocean's ORIGINAL intro (83:257) still exists at opacity 0 inside Frame 1
  as its own flow-spacer — intro copy edits must go to the FIXED block.**
  Debt: fixed-block texts are literal-Tinos off-system (restyle in UI or
  post-flip). Nav white mask (272 full-height, margins as padding) done;
  nav z-raise + nav/Timestamp Fixed settings = Ocean's 3 clicks (TNR-gated).

- [x] **Typeface buttons = live radio group + mode switch (2026-07-05 PM).**
  New `UI State` collection: 4 STRING vars (typeface/*-state, "Default"/
  "Selected"); each button's State VARIANT PROP IS BOUND to its var; every
  button has ONE ON_CLICK reaction with 5 actions (set all 4 state vars +
  SET_VARIABLE_MODE on Typeface). **GOTCHA THAT CAUSED OCEAN'S BUG: Figma
  fires only ONE reaction per trigger — his variant-change and mode-set lived
  in TWO separate ON_CLICK reactions, so the mode never fired. Always merge
  into one reaction, many actions.** Button LABELS keep literal preview fonts
  (deliberately don't switch with mode). KNOWN GAP: Sheet Option 2's DETACHED
  panel copy still has the old dual-reaction wiring — detached = orphaned.

- [x] ~~Intro one-time reveal~~ — built (opaque band aprons, gap->0, top-gap
  window) then **REVERTED same day at Ocean's call** ("doesn't make sense").
  Current design: flow gap = space/192 (bound), bands 644, transparent gaps —
  the intro PEEKS THROUGH between bands by design. If one-time reveal ever
  returns, the apron mechanism is the way (Figma has no scroll triggers);
  it costs the glimpse rhythm.

- [x] **Showcase bands = full auto-layout (2026-07-05 PM, final structure):**
  band (VERTICAL, HUG height, FILL width, bg/page fill) → gallery-viewport
  (FILL × 504 fixed, plain frame — REQUIRED for scroll) + desc-row
  (HORIZONTAL, FILL: [desc-offset spacer bound to col token] + description
  (col/4: title-group gap-0 + blurb, gap 4)). Stagger offsets = spacer
  tokens: band1 col/4, band2 none, band3 col/2 (+32 flow gap each). Bands
  hug at 692 (the old manual 644 was silently overflowing desc into the gap).
  **Figma CANNOT bind width to built-in layout-grid columns** (grids are
  passive guides) — col-span tokens ARE the mechanism. Non-auto-layout
  survivors, all required: root (z architecture), viewports (scroll), the
  opacity-0 ghost + static intro (pinning). DEBT: 9 recreated desc texts are
  literal Tinos — Ocean restyles (Body / Caption / Caption Italic) in UI.

- [x] **Slider = live 4-step type-scale control (2026-07-05 PM):** Slider is
  now a variant SET (Scale=Small/Medium/Large/Extra Large; old master = the
  Medium variant so all placed instances stayed valid). Thumb per variant at
  0/40/80/120 on the 132 track, SCALE-constrained. 12 transparent hotspots
  (4 track quarters x 4 variants, self-targets skipped — Figma REJECTS
  self-referencing CHANGE_TO): each = ONE reaction [CHANGE_TO target variant
  w/ SMART_ANIMATE 200ms ease-out + SET_VARIABLE_MODE Type Scale]. The thumb
  glide is the ONE sanctioned animation (physical control metaphor); page
  text re-scales live incl. the slider's own a-glyphs. Descriptions:
  col/6 (664) + white fill (new col/6 token: 664/350/904).

- [x] **IMAGE SHAPE THEMING (2026-07-05 PM, the "big task"):** clicking
  Straight/Rounded/Oval in the panel reshapes EVERY image. Architecture:
  `Image Frame` component set (Shape=Straight/Rounded/Oval; same-named `img`
  STRETCH layer per variant so photo fills SURVIVE variant switches; Rounded
  radius bound to new `radius/image` token 24; **Oval = true ELLIPSE
  stretched non-uniformly** — corner radius maxes out at pill, can't make an
  ellipse, hence variant-swap not property). All 21 showcase images (covers
  incl.) converted to instances with their photos as img-fill overrides and
  **Shape prop bound to `image/shape` STRING var** (UI State). Panel picker:
  3 option instances state-bound (image-shape/*-state vars) + ONE reaction
  each = radio + SET_VARIABLE image/shape. Proven by API flip (Rounded
  screenshot: all images re-framed at once). **FUTURE IMAGES: duplicate any
  placed Image Frame instance and swap its img fill — the binding travels.**
  Proportions live on instances; oval crops edges harder (FILL scaleMode).

- [x] **`Project Description` COMPONENT (2026-07-05 PM):** descriptions are
  instances now — props: title/tagline/blurb/url (TEXT) + **hasUrl (BOOLEAN
  — toggles the underlined url line for unlinked projects)**. White fill,
  16 top seam, col/6 width baked into the master. Band 1 demos hasUrl=true
  ("eviive.com"), bands 2/3 false (hug shows it: 672 vs 644). url line =
  plain underlined Tinos text (a real Link instance is TNR-gated — swap
  post-flip if wanted). **RESTYLE THE MASTER ONCE** (title/blurb→Body,
  tagline→Caption Italic, url→Body+underline) and every instance inherits —
  this permanently ends the per-band restyle churn.

- [x] **SCRIPT → GOTHIC (2026-07-05 PM, pre-Cargo font pass):** Typeface mode
  renamed Gothic; face = **UnifrakturMaguntia "Book"** (Google, cloud-loadable,
  SINGLE CUT — x-height 70.8 → multiplier **×0.648**, gothic must SHRINK; size
  sets renamed *-gothic). Single-cut support = fontStyle STRING vars on ALL
  styles now: `font/style-regular` (R/R/R/Book) on Body+Caption,
  `font/style-bold` (B/B/B/Book) on Body Bold+Heading, caption-italic var
  Gothic value = Book. Panel label = "Gothic" in Unifraktur 9.1.
  ~~Desktop edit pending~~ — **famVar Gothic value SET FROM CLOUD
  (2026-07-05 PM): validation is per-mode-value + consumer pairs, and the
  font/style-* variables resolving "Book" made every pair exist. General
  lesson: single-cut fonts become cloud-settable once style vars cover all
  styles.** Gothic size sets currently **ALIAS the sans sets** (Ocean:
  "same scale as sans, see how it looks") — live-linked; un-alias to diverge
  (measured blackletter multiplier was ×0.648 if it ever needs to shrink).
  Gothic labels updated at ALL sites: panel, detached Sheet-2 copy,
  foundations specimen (card renamed typeface/Gothic).
  **FINAL FONTS (2026-07-05 PM — Ocean uploaded the Cargo faces to Figma;
  NO stand-ins remain):** Serif = Times New Roman (system stack) · Sans =
  **TeX Gyre Heros Cn** (uploaded; x-height 52.3 → **×0.878**, measured) ·
  Mono = **ABC Gaisyr Semi Mono Trial** (uploaded; x-height 46.1 ≈ Times'
  45.9 → **aliases the serif scale**, ×0.996) · Gothic = UnifrakturMaguntia
  (**aliases serif scale** per Ocean — measured ×0.648 available if it ever
  needs shrinking). GOTCHAS CAUGHT: exact family names differ from Cargo's
  labels ("Cn" not "Condensed"; "ABC…Trial" prefix/suffix); Gaisyr's italic
  style = "Regular Italic" (caption-italic var's Mono value set accordingly).
  **LINE-SPACING AUDIT (reviewed, verdict: NO CHANGES):** all face×scale
  ratios within classical ranges — serif/mono/gothic body 125–150%, headings
  122–133%; sans runs ~139–152% (airier by construction: compensated sizes +
  constant baseline leading; condensed grotesks take leading well). Constant
  per-scale leading = the baseline rhythm doctrine; per-face lh pickers are
  the escape hatch if a face ever genuinely needs bespoke leading.

- [x] **Dot legibility swap (2026-07-05 PM):** Navy + Brown dots were unread-
  ably dark — they now wear their INK colors (Navy theme dot = RED, Brown
  theme dot = SKY) with the dark bg colors as the selected CENTERS. Themes
  themselves unchanged (bg still navy/brown). Dot row order: White · Yellow ·
  Sky(Brown) · Red(Navy) · Black. Two stale foundations specimen labels
  ("Sans — Inter", "Mono — Source Code Pro") are TNR-gated cosmetics —
  edit in UI anytime.

- [x] **Mono "not switching" = false alarm (2026-07-06):** Gaisyr IS a
  serifed semi-mono metrically ≈ Times (by design + the scale alias) — the
  switch works; the change is subtle (evenized advances, serifed digits).
  Stale specimen labels reinforced the misread — ALL font mentions now
  corrected. LABEL-GATE LESSON: foundation card labels resolve through each
  card's EXPLICIT typeface mode — text edits pass only when THAT mode's font
  is loaded first (why Gothic passed but Sans/Mono gated earlier).
- [x] **Slider thumb distortion at stretched widths FIXED (2026-07-06):**
  SCALE constraints scale SIZE too (thumb 12 → ~28 in the 310w sheet).
  layoutGrow is INTEGER-only (0/1 = FILL, no flex ratios). Working mechanism:
  per variant, a transparent `thumb-pos` wrapper (x0 → thumb-center, SCALE
  constraint = proportional right edge) with the 12×12 thumb pinned MAX to
  that edge — position scales, size never. Verified: 310w sheet, thumb 12×12
  at 35% ≈ Medium's exact fraction.

- [READ FIRST] **ALL Cargo work goes through `cargo/PLAYBOOK.md`** — the
  operations manual: hard rules (never publish, never touch other pages,
  sticky-not-fixed, preserve Cargo-managed style blocks), step-by-step
  recipes (content injection, CSS splice, image pipeline, type changes),
  paste-ready verification probes, symptom table, and the current-state
  ledger. Written 2026-07-06 specifically so lower-tier models can continue
  this work safely. The entries below are HISTORY; the playbook is the
  procedure. `cargo/DEPLOY.md` = chronological log; `cargo/assemble-test.sh`
  = local test build.
- [DONE] **CARGO DEPLOYMENT ROUND 1 — LIVE IN CARGO AS DRAFT, full QA passed
  on the actual site (2026-07-06 overnight). NOT published — Ocean reviews
  then publishes (cmd+P) himself.** What's in Cargo (all draft-safe,
  existing pages untouched):
  - **Site CSS** (Site Settings → CSS/HTML, CodeMirror): original 6,281-char
    Cargo boilerplate preserved, tokens.css + site.css APPENDED after it
    (total 17,594 chars). Persistence + cascade verified by computed styles
    (nav fixed 272px = token math resolving).
  - **New page "home v2 test"** (edit URL mmmmm.studio/edit/I2398594830),
    unlinked, draft: full home.html markup + panel.js inlined in one
    `<script>`, injected into the page `bodycopy` (7,186 chars after Cargo's
    serializer). Persists across reloads; script EXECUTES on page render
    (clock ticks, defaults apply).
  - **3 new text styles** created solely to register fonts (safe to leave;
    deletable anytime): `.mms-mono` = Gaisyr Semi-Mono Regular, `.mms-sans` =
    TeX Gyre Heros Condensed Regular, `.mms-gothic` = UnifrakturMaguntia
    Regular. This is THE mechanism that makes Cargo emit @font-face — fonts
    exist in their library but only ship when referenced by a text style.
    Family names confirmed == tokens.css stacks (no patch needed).
  - **ON-CARGO QA MATRIX PASSED** (computed-style assertions in the editor
    iframe, script live): 5 themes exact bg/ink pairs; 4 faces render real
    fonts with optical sizes serif 18 / sans 17.4 (x0.966) / mono 16.2
    (x0.90) / gothic 18; scale slider 16/18/24/32; shapes 0 / 24px / 50%
    ellipse. State reset to white/serif/m/straight + test localStorage
    cleared.
  - **Round 2 remains:** real EVIIVE image exports (placeholders gray);
    mobile bottom-sheet pass; publish decision incl. site-wide CSS caveat
    (`html,body{background:var(--color-bg-page)}` in site.css — inert on
    pages without data-theme but review before publish); draft page 404s
    publicly until published (tested).
  - **Cargo automation gotchas (hard-won):** page canvas lives in iframe
    `client-side-rendering.html` (contentDocument accessible; TWO bodycopy
    els — pinned Clock overlay first, real page second — select by
    `.querySelector('.mms')`). Inject content = set bodycopy.innerHTML +
    dispatch input + cmd+S (execCommand insertHTML returns false). Their
    admin needs REAL coordinate clicks (synthetic .click() ignored); font
    picker is Clusterize-VIRTUALIZED (rows materialize on scroll of
    `.uiWindow-inner`; always elementFromPoint-verify before clicking — a
    blind click assigned Gramercy Display to .mms-mono and silently wiped
    Gaisyr; caught + fixed). Style switcher = native `<select>` (JS settable).
    CSS editor: `document.querySelector('.CodeMirror').CodeMirror`,
    append-only `cm.setValue(cm.getValue()+X)`. CDP screenshots fail in Dia —
    drive blind via DOM probes + computed styles.
- [DONE] **ROUND 1b — Ocean's review feedback fixed same night (2026-07-06):
  sticky architecture.** His report: two clocks / template columns squeezing
  the design / left side not sticky / images not aligned to descriptions.
  Root causes: (1) template's pinned Clock page overlays all pages; (2)
  Cargo `.page-layout` caps content `max-width:64%` + `.page-content` pads
  ~25px; (3) Cargo wrappers form a containing block + editor scrolls an
  inner div, so **position:fixed silently detaches — NEVER use fixed on
  Cargo, use sticky**; (4) river spacer ignored the 32px flex gap.
  site.css v2 + home.html v2: `.mms` = 2-col grid; `.mms-rail` (nav top +
  panel bottom, sticky) = whole left side pinned; `.mms-sticky-head`
  (intro + clock, height 0, z0) pinned under scrolling bands; scoped
  `html[data-theme]` overrides neutralize template + hide pinned Clock on
  mms pages only; spacer = calc(offset - 32). ALL verified in Cargo's
  editor post-save-reload (rail y40 + panel viewport-bottom at every scroll
  pos; alignment 736/272/504 exact; one ticking clock; yellow paints
  edge-to-edge; gothic renders). Answer to Ocean's "can CSS+HTML alone do
  it?": YES — zero template/settings changes, all scoped CSS.
  [WARNING] Cargo INJECTS text-style CSS (`--text-style:"mms mono"` blocks)
  INTO the custom-CSS document — those 3 blocks ARE the font registration;
  any future CSS splice must preserve them (now labeled "Cargo-managed",
  sitting between tokens and site v2; editor total 20,588 chars).
- [DONE] **ROUND 1c — type parity + real EVIIVE images (2026-07-06, Ocean
  awake + reviewing).** TYPE: Ocean's "both bodycopy 1.2 but ours looks
  smaller" — our page never used Cargo's Bodycopy; tokens had serif M
  18px/24. Now M base = 19.2px (= 1.2rem parity; sans 18.5 / mono 17.3 /
  gothic 19.2 via multipliers) and ALL line heights tightened to ~1.15
  (M 22/18/44; S 19/14/34; L 28/22/64; XL 38/29/82) — **24px baseline grid
  deliberately broken, Ocean's call ("looks loosen")**; Figma library still
  has the old values -> re-sync Figma type tokens later if the system stays.
  IMAGES: `.mms-img` divs -> real `<img>` elements. Band 1 = REAL EVIIVE
  exports served from Cargo's CDN; bands 2/3 = transparent-SVG placeholder
  imgs (themed gray via CSS bg), real image swap = set src only. Pipeline
  (documented in cargo/DEPLOY.md): Figma download_assets per instance @2x ->
  in-page fetch (Figma MCP asset endpoint sends CORS) -> File -> synthetic
  drop on bodycopy -> Cargo uploads -> <media-item hash> ->
  freight.cargo.site/w/{W}/q/85/i/{hash}/{name} (referer-gated: curl 403s,
  browsers fine). Hash map + dead ends in DEPLOY.md; exports in
  cargo/assets/. VERIFIED post-save-reload: 19.2/22 computed, 7 freight
  imgs loaded, alignment 736/736, clock live. Still NOT published.
- [DONE] **ROUND 2 — MOBILE BUILT (2026-07-06, Ocean's spec, deployed to
  Cargo as draft).** Ocean's design: sticky top bar (MM.S + menu button +
  clock), menu opens the control panel as a bottom sheet (X closes),
  intro block scrolls in flow, everything left-aligned at the 20px margin,
  intro + showcase blocks get fill bg, and the z-choreography: intro
  slides UNDER the bar (z1<z10) while showcases slide OVER it (z20>z10);
  sheet z30. Implemented in site.css v3 + home.html/panel.js r2 (panel is
  now a direct .mms child: desktop grid col1/row2 sticky-bottom, mobile
  sheet via html[data-panel="open"], transient; clock ticks all .js-clock
  els). Verified locally at 375x812 incl. elementFromPoint choreography
  proofs + sheet interaction; desktop regression-verified locally AND in
  Cargo post-deploy. NOT published; mobile look needs Ocean's eyes (narrow
  the browser window on the edit page, or publish). Open knob: mobile
  river/image sizes unchanged from desktop px — downscale pass if Ocean
  wants. Figma mobile frames now BEHIND the site (older header concept).
- [DONE] **ROUND 2b — Ocean's mobile review fixes + SITE STRUCTURE
  (2026-07-06 late).** (1) Mobile links now INSIDE the sticky bar (whole
  block sticky; bands cover it, intentional). (2) Rivers FULL-BLEED right;
  at max scroll the last image right-aligns with the clock (padding-right
  = margin on .mms-river; .mms-main lost right padding; clock carries its
  own margin) — probe-verified desktop 1716=clock, mobile 469=vw-20.
  (3) Shape-button stroke 1px. (4) Real links: ocean@mmmmm.studio +
  linkedin.com/company/mmmmmstudio; Work="/", Write="/write", Who?="/who"
  (slugs assumed — verify at publish; "/" = OLD home until Ocean
  right-clicks home v2 test -> Set as Homepage). (5) NEW PAGES: write
  (edit/D4042456702) + who? (edit/I0096029541), home-shell placeholders,
  local sources cargo/write.html + who.html. (6) DELETED (draft): Clock,
  mm.s, Projects+Example Project; **Information remains — permission
  classifier blocked agent-inferred deletion, Ocean must say the word**;
  live site curl-verified unaffected. (7) [CRITICAL GOTCHA] Cargo's MOBILE
  EDITOR (toggle = radio group ~x1105 top bar) generates
  #mobile-offset-styles which clones all padding/margin declarations
  scaled x0.66 AFTER our sheet (".mms *" clone leaks unprefixed) — fixed
  with the !important "mobile-offset neutralizer" section kept LAST in the
  site CSS; ANY new mms spacing must be mirrored there (see PLAYBOOK).
- [DONE] **ROUND 2c — fill model (2026-07-06).** Ocean: "images should not
  have a white fill, only the text description should." The mobile
  `.mms-band` had a white fill = an opaque sheet that erased the whole nav
  as it scrolled (only Work/Write showed). FIX: mobile `.mms-band`
  background -> transparent (one-line splice in Cargo CSS). Now ONLY
  `.mms-desc` (white plate) + the opaque images cover the nav; transparent
  band lets the nav show through elsewhere. Desktop was already transparent.
  Verified after reload in Cargo's mobile editor (band rgba(0,0,0,0), desc
  white, all 5 links visible, img/intro at x=20, image covers nav via
  elementFromPoint). Site-wide CSS -> write/who inherit automatically.
  RULE: never re-add a background to `.mms-band` (see PLAYBOOK fill rule).
  Answered Ocean's mobile-padding Q (not a bug): 20px left gutter + 16px bar
  top + 20px right on text; only rivers bleed right (intentional); looks
  marginless only because it's white-on-white on the white theme.
- [DONE] **ROUND 2d — control-panel refinements, Figma-matched
  (2026-07-06).** Grounded in Figma panel screenshots. (1) Added "Controls"
  heading: `.mms-panel-head` (title + X) as panel's first child, all 3
  pages; header desktop-hidden, mobile-sheet-only (Figma desktop panel has
  no header). (2) Mobile dots now STRETCHED ellipses (`.mms-dot{flex:1 1 0;
  width:auto;height:28px}`); desktop stays 20px circles. (3) Font buttons
  SIZE-LOCKED to Medium caption px (serif/gothic 14, sans 13.5, mono 12.6)
  instead of scaling `var(--font-size-caption)` — panel UI no longer grows
  with the slider; "Controls" title fixed 18px. (4) Slider a's centered on
  the line via `line-height:1 + translateY(-0.114em)` (derived from canvas
  font metrics). Deployed as 9 unique CSS replacements (25,319 chars;
  cargo-managed styles + neutralizer intact) + surgical panel-markup wrap on
  home/write/who. Verified after reload in Cargo mobile editor: label,
  83x28 ellipses, fixed buttons, close/toggle/face all functional; desktop
  regression clean. See PLAYBOOK ledger. Still NOT published.
- [DONE] **ROUND 2e — nav links fixed + mobile sticky intro (2026-07-06).**
  (1) LINKS: write/work 404'd because Cargo AUTO-SUFFIXED slugs — real purls
  (via window.store.getState().pages) are Home="home" (homepage, at /),
  Write="write-1", Who?="who-1"; pages ARE published. Fixed nav hrefs on all
  3 pages -> Work="/", Write="/write-1", Who?="/who-1" (both bar + rail
  copies; Cargo had mangled the rail to #/relative). Live needs re-publish;
  preview works now. Clean /write /who = rename page URLs in Cargo settings
  + republish (offered). (2) STICKY INTRO: "Building better brands" now
  STATIC on mobile — `.mms-intro-wrap` (display:contents desktop / block
  mobile) wraps intro+first band; intro `position:sticky; top:var(--bar-h)`
  pins below the bar, first work (z20) covers it, releases after the first
  band so no ghosting through later bands; panel.js setBarH() sets --bar-h
  from the bar height. Deployed (2 CSS splices + per-page wrap/script/link
  fix) + verified in Cargo mobile & desktop editors. NOT published — Ocean
  re-publishes to push links + intro live. Detail: cargo/DEPLOY.md +
  PLAYBOOK ledger. [WARNING] transparent bands => pinned intro peeks through
  band gaps as the first work rises (consistent with nav peek-through 2c).
- [DONE] **ROUND 2f — clean slugs (2026-07-06).** Renamed the auto-suffixed
  slugs write-1/who-1 -> "write"/"who". Cargo has NO per-page URL field; the
  slug derives from the page TITLE. Working method (raw typing reverted):
  reload editor -> fresh Pages panel -> double-click page name -> set the
  inline input via NATIVE value setter + input/change events -> Enter.
  Verified via store.getState().pages purls (persisted). Page titles now
  lowercase write/who (on-brand; nav link text stays Write/Who?). Nav hrefs
  on all 3 pages flipped back to /, /write, /who (+saved). DRAFT — Ocean must
  RE-PUBLISH for /write /who to resolve live (live still serves write-1/who-1).
  Method documented in PLAYBOOK "HOW TO RENAME A PAGE SLUG".

## Gotchas
- Figma cloud readback now returns `Times New Roman` for Serif variable
  `51:270`, mode `51:0` (verified 2026-07-14). The former Tinos stand-in
  warning is obsolete.
- Figma variable scope enum is `WIDTH_HEIGHT` (not `WIDTH_AND_HEIGHT`).
- **Concurrent editing collides (observed 2026-07-05):** Ocean edits the file
  live in desktop while Claude scripts run. Casualties that session: sheet
  title text overwritten, serif/sans/mono label overrides wiped (both
  restored). Ocean also added an `Icon#1:0` boolean + hidden "Corner Radius"
  instance to the `Button` master — HIS edit, kept. When automating: re-inspect
  before mutating nodes touched earlier; treat unexpected diffs as human edits,
  not script bugs — repair content, never revert the human's structural changes
  without asking.

## Current handoff — Round 22 compact showcase and performance refinement
- Round 22 was published to `mmmmm.studio` on 2026-07-11 after Ocean explicitly
  requested publication for phone testing. Public 390px proof passed with zero
  overflow, 85vw media, full-width rivers, and the Small default. Future edits
  return to draft-only and must not be published without a new explicit request.
- Source contracts are now: 85vw standard compact media, 58vw intentionally
  small media, 94vw Touchbaes, native unsnapped rivers, and zero page-level
  horizontal overflow. Fresh compact sessions default to Small; expanded
  sessions default to Medium; saved user choices always win.
- Current embedded drafts: Touchbaes v7
  `V3029649661012769620108113393465`, V7 cup v3
  `U3029652463921744643979643238201`, and Montran viewer v13
  `F3029653692751601114141424138041`.
- `cargo/panel.js` is `responsive-23`: video/iframe sources are deferred until
  near-view, later bands use content visibility, and embed visibility messages
  pause the V7 renderer. Do not restore eager `src` attributes in bodycopy.
- Touchbaes v7 deliberately allows page/river panning outside loose stickers,
  uses a separate visible mobile drag preview, hides the tweezer on compact
  screens, and reports its true rendered height. Do not reintroduce a fixed
  mobile iframe height or blanket `touch-action:none` on the board.

## Current handoff — Round 23 mobile control tray
- Round 23 is saved and reload-verified in Cargo draft but is NOT published.
  Future agents must not publish it without a new explicit instruction from
  Ocean.
- `cargo/panel.js` is now `responsive-24`. Compact controls use the same dialog
  node as desktop, portaled under `body` and opened with non-modal `show()`;
  expanded mode restores it to the `.mms` grid. Do not restore `showModal()`,
  root scroll locking, inert background behavior, or outside-tap dismissal.
- `syncPanelMode()` must preserve a compact tray when both
  `html[data-panel="open"]` and `dialog.open` are true. This guards the setting
  remeasurement path through `setBarH()`; removing it makes every setting tap
  close the tray again.
- Compact visible controls are 32px inside independent 44px touch targets.
  Swatches are true ellipses, the open header trigger is black with white
  artwork, and the inline introduction words "control panel" are a synchronized
  mobile-only trigger.
- Cargo currently reloads with one `.mms` root, `responsive-24` only, and no
  `showModal()`. The draft preview was left in mobile mode with white, Serif,
  Small, straight settings and the tray closed.

## Current handoff — Round 31 mobile tray, render flash, and iOS video playback
- Round 31 is saved and reload-verified in Cargo draft and is NOT published.
  Runtime is `responsive-33`; the bodycopy contains one `.mms` root and no
  stale `responsive-32` marker.
- The four-combination render pass runs on every full page load, restores the
  visitor's saved state, and remains disabled for reduced-motion or Save-Data.
- Compact controls follow Figma node `21:159`: 390x223 content geometry plus
  Cargo's 1px top border; row heights are 41/24/26/36 with 16px gaps, 20px
  sides, 16px top, and 32px bottom. Above 430px the tray remains 430px wide.
- iOS video activation must keep every property and attribute set before source
  attachment: muted/defaultMuted/autoplay/playsInline plus muted, autoplay,
  playsinline, and webkit-playsinline attributes. Do not regress to a play-only
  retry after the source is attached.
- The native Cargo `pencil-3` glyph is horizontally mirrored with `scaleX(-1)`
  in both header and inline placements. Its reverse-filled two-pass active
  state remains unchanged.

## Current handoff — Round 32 hard cuts and UTF-8 recovery
- Round 32 is reload-verified in Cargo draft and is NOT published. Runtime is
  `responsive-34`; the every-load design pass uses four instantaneous cuts,
  holds each state for 200ms, and restores the saved settings after 880ms.
- Never decode a Base64 bodycopy payload with plain `atob()`. Use
  `TextDecoder('utf-8', {fatal:true})` over the decoded bytes. Plain `atob()`
  caused the published homepage's en dashes, bullets, curly punctuation,
  accented character, and `（純愛）` title to become mojibake.
- The Cargo draft is clean: one `.mms` root, 12 real en dashes, 12 real bullets,
  intact punctuation/CJK, zero mojibake lead characters, and zero overflow.
  The public site remains corrupted until Ocean explicitly requests publish.

## Current handoff — Round 33 motion-first startup and responsive tray
- Round 33 is saved and reload-verified in Cargo draft and is NOT published.
  Runtime is `responsive-35`; the public site still reports `responsive-34`
  and contains no Round 33 marker. Wait for a new explicit publish instruction.
- Startup now uses five randomized 260ms hard cuts, all themes, every face and
  scale, every shape, then restores the exact saved settings at 1.38s. Only the
  previous signature is stored in sessionStorage. Reduced-motion and Save-Data
  still skip the pass.
- All 27 deferred videos have Freight posters. The first two EVIIVE videos and
  V7 cup activate immediately; other motion preloads one viewport ahead. V7 is
  `Z3031274916472238420423367767865` and Touchbaes is
  `H3031257561148224575971082680121`; both clear their iframe poster only after
  a validated child-ready message.
- Compact panel modes are 320–430 full-width, 431–759 bounded and centered,
  760–1023 bottom-right at 390px, and 560x170 for short landscape. All controls
  retain 44px targets. Figma source `1:2899` is Hug-height/44px-row based;
  landscape component `542:365` and reference section `542:400` are current.
- Keep the compact Touchbaes width rule active after measured height arrives.
  Height belongs to the validated child; width remains
  `--mobile-game-w`. Removing that split resurrects the 820px inline desktop
  width on phones.

## Current handoff — Round 34 Figma-first panel and type refinement
- Round 34 is saved and reload-verified in Cargo draft and is NOT published.
  Runtime is `responsive-36`; the public site remains `responsive-34`.
- Startup now uses four randomized 260ms hard cuts. The last cut is forced to
  differ from the visitor's starting state, then the exact saved/default state
  is restored. Fresh compact visits start Small; fresh expanded visits start
  Medium; explicit visitor choices remain persistent.
- Figma and Cargo caption tokens are synchronized: serif S/M/L/XL
  15/18/22/30 with leading 17/21/25/34. Sans remains x0.966, Mono x0.90, and
  measured Gothic ink is normalized to x0.92 across caption/body/heading.
- Figma `1:2899` and Cargo now share the latest 390x244 sheet geometry:
  16px top, 20px sides, 24px bottom, slider before palette, 32px type buttons,
  and 36px shape controls with non-overlapping 44px web hit regions. Typeface
  preview labels render at equal ink height: 16/15/15.8/12.7.
- The mobile control trigger uses one unchanged native `pencil-3` glyph for
  open and closed states. Its optical size follows the selected base type size
  while the button remains 44px. Mandy alpha is 150vw in compact mode.
- Touchbaes now includes “Make a booking here!” with only “here” linking to
  https://www.touchbaes.ca; the existing fine-pointer link hover bold applies.

## Current handoff — Round 35 single compact control-panel treatment
- Round 35 is saved and reload-verified in Cargo draft and is NOT published.
  Runtime stays `responsive-36`; this was a CSS-only responsive correction.
- Delete/ignore every landscape-specific control-panel treatment. Compact uses
  the same Figma `1:2899` composition in portrait and landscape: full-width
  through 430px, 390px right-aligned with 16px inset at 431–759, and 390px
  right-aligned with 24px right/bottom insets at 760–1023. Expanded keeps the
  existing left rail at 1024px and above.
- Figma `1:2899` documents the single compact contract. Obsolete landscape
  component `542:365` and reference section `542:400` were removed from the
  canvas. Do not recreate either.
- Reload proof includes 844x390 using the ordinary 390x246 compact sheet at
  right/bottom 24px, not a special layout. Cargo's 729px preview uses a 16px
  right inset; 2900px desktop remains 250x332 sticky. Page overflow is zero.

## Current handoff — Round 36 desktop restoration and five-cut startup
- Round 36 is saved and reload-verified in Cargo draft and is NOT published.
  Runtime is `responsive-38`; public remains `responsive-34`.
- Cargo may delete the compact portal's comment placeholder when rebuilding
  its preview. Expanded restoration must recreate the anchor under `.mms` and
  move the dialog after it. This returns the panel to the original left rail;
  removing the fallback sends the native dialog to the far right again.
- Unsaved scale defaults now follow the active structural mode on transition:
  Small below 1024, Medium from 1024. Saved user choices still persist. Desktop
  typeface labels use the Medium optical sizes 22/21.3/19.8/20.2.
- Refresh preview is five unique 260ms hard cuts using all themes, every face
  and scale, and every shape, followed by exact saved/default restoration.
- Cargo transition proof: 729px = body-portaled 390x245 sheet, right 16, Small;
  2900px = `.mms`-parented 250x332 left panel at x50, Medium, Serif 22px. Zero
  overflow in both modes.

## Current handoff — Round 37 compact slider row correction
- Round 37 is a reload-verified Cargo CSS correction and is NOT published.
  Runtime remains `responsive-38`.
- The compact slider was hidden behind the typeface row because it inherited
  desktop `order:3` and auto-placed into a second grid row. Keep both
  `.mms-scale` and `.row.dots` explicitly at `grid-row:1; order:1`, with the
  slider in column 1 and palette in column 2.
- Cargo 729px proof matches Figma `1:2899`: slider and palette y77, typefaces
  y117, shapes y169, panel 390x245, zero overlap, zero page overflow.

## Current handoff — Round 38 final compact controls and mobile embeds
- Round 38 is saved and reload-verified in Cargo draft and is NOT published.
  Runtime is `responsive-40`; public remains `responsive-34`.
- Latest Figma/Cargo compact panel is 390x220 plus border with 20px sides,
  8px top/bottom, 24/32/36 optical rows, and equal 18px gaps. Do not restore
  the deleted landscape treatment. Use plus when closed and the inverse
  theme-aware close tile when open; there is no close control inside the tray.
- The runtime guard must compare both `responsive-40` and
  `window.__mmsPanelRoot`. Cargo can replace the `.mms` node without replacing
  the iframe window; version-only guards leave the new tray in document flow.
- Startup uses five 260ms hard cuts. The last preview cut differs from the
  landing state in theme, face, and scale; final state is the exact saved or
  breakpoint default setting.
- Explicit compact profiles are authoritative: Loop first image is
  `loop-cover` at 110vw and Montran is `booklet-wide` at 150vw. Do not move
  these assignments back to runtime-only logic.
- Current embeds: Touchbaes v10
  `E3031754669080377521238157342521` and Montran viewer v16
  `K3031744803448052252116890728249`. Touchbaes emits one stable compact
  envelope (390px proof height460, reserves 53/36/106). Montran compact uses
  tap halves only; drag/swipe does not flip. Expanded Montran keeps native
  StPageFlip interaction.
- Final Cargo proof: compact 390x844 panel is body-portaled at x0/bottom0,
  390x221 with 18/18 gaps, Small, zero overflow; expanded 2940x1100 panel is
  back under `.mms` at x50/bottom50, 250x332, Medium, Serif 22px.

## Current handoff — Round 39 Figma default sync and continuity repair
- Round 39 is a Figma/reference-document correction and is NOT published.
  Cargo code remains `responsive-40`; public remains `responsive-34`.
- Figma compact panel master `1:2899` remains 390x220. Its slider instance
  `1:2866` is now `Scale=Small`, and the only mobile panel instance `21:159`
  inherits the same Small variant. This matches Cargo's compact unsaved default;
  expanded Cargo remains Medium. Readback and screenshots verified both nodes.
- `HANDOFF-CODEX.md` and the root project index now point to Round 39, the
  current embed hashes, the five-cut startup, the single compact treatment,
  and the restored expanded left rail. No Cargo bodycopy, CSS, JavaScript,
  embedded asset, or publication state changed in this round.
- All executable items through Round 39 are closed. Physical iPhone/iPad Safari
  confirmation and the optional higher-resolution Montran source-PDF swap are
  external release gates, not unfinished draft implementation.

## Current handoff — Round 40 mobile type system and panel interaction
- Round 40 is saved and reload-verified in Cargo draft and is NOT published.
  Runtime is `responsive-42`; public remains `responsive-34`.
- Figma Type Scale now contains Desktop and Mobile S/M/L/XL modes. The compact
  source slider `1:2866` uses Compact/Medium and expanded source `1:3423` uses
  Expanded/Medium. Fresh compact and expanded Cargo sessions both default to
  Medium; saved visitor settings still win.
- Compact panel height hugs content and grows from 221px at S/M to 229px at L
  and 237px at XL. Visible plus/close artwork is 22/24/26/28px inside the fixed
  44px target; the clock-to-icon optical gap is 12px.
- Outside tap closes the compact tray. Native background scrolling does not.
  Setting changes, tray interactions, and toggle clicks leave dismissal under
  their existing explicit controls.
- iOS full bleed uses `viewport-fit=cover`, safe-area-aware header padding,
  stable final-theme page/overscroll backgrounds, and standalone
  `black-translucent` metadata. Normal Safari tabs cannot expose transparent
  Apple-controlled status or URL bars.
- Cargo reload readback exactly matches the 60,304-byte CSS source, preserves
  all three Cargo-managed text-style blocks, and contains the complete
  `responsive-42` bodycopy contract. Never publish without Ocean's explicit
  instruction.

## Current handoff — Round 41 compact control geometry and safe areas
- Round 41 is saved and reload-verified in Cargo draft and is NOT published.
  Runtime is `responsive-43`; public remains `responsive-34`.
- Figma compact panel `1:2899` was re-audited and already has the intended
  geometry: 4px slider end padding, equal 169px slider/palette spans at 390px,
  and five evenly distributed 24px swatches. No Figma mutation was needed.
- Cargo now keeps slider and palette as equal columns at every compact width;
  the obsolete below-360px 56/44 split is removed. Local proof: 320px gives
  equal 134px spans and 3.5px swatch gaps; 390px gives equal 169px spans and
  12.25px gaps. Page overflow remains zero across the compact matrix.
- The visible plus/close box keeps its approved size and position while its
  transparent pseudo target supplies the 44x44 interaction area. Pointer tap
  highlight/shadow is suppressed; keyboard focus stays visible on the optical
  frame.
- Full bleed retains `viewport-fit=cover` but removes `theme-color`, restores
  native overscroll, and leaves the physical safe-area portions of the header
  and tray transparent. Standalone mode gets capability metadata plus
  `black-translucent`; normal Safari tabs keep Apple-controlled system chrome.
- The eight-mode Figma Type Scale and matching Cargo Mobile/Desktop ladders are
  unchanged and confirmed deployed. Both unsaved breakpoint defaults are
  Medium. Never publish without Ocean's explicit instruction.

## Current handoff — Round 41b token restoration
- The initial Round 41 Cargo splice omitted `tokens.css` and briefly broke the
  entire draft across breakpoints. It was rolled back immediately, rebuilt as
  Cargo head + `tokens.css` + managed fonts + `site.css`, and reload-verified.
- Current Cargo CSS is 62,172 characters with one token marker, one layout marker,
  one managed mono region, two `--layout-u` definitions, Mobile Type Scale,
  and balanced 378/378 braces. Runtime remains `responsive-43`; not published.
- `cargo/compose-css-bundle.sh` is now the mandatory payload source. Never
  deploy `site.css` alone, even if local `test.html` looks correct.
- Actual Cargo geometry passed at 320/390/768/1023/1024/1440/1920/2940px with
  the 1024 shell transition, capped 340px rail/250px panel, restored media
  scaling, and zero page overflow.

## Current handoff — Round 42 iOS rivers, contextual type scale, and desktop panel
- Round 42 is saved and reload-verified in Cargo draft and is NOT published.
  Runtime is `responsive-44`; public remains `responsive-34`.
- Compact `.mms-river` is again the native interactive scroller with
  `pointer-events:auto` and `touch-action:pan-x pan-y`. In the actual 711px
  Cargo mobile preview, a horizontal gesture moved the visible river from
  36.5px to 336.5px and a vertical gesture over the same river moved the page
  by 180px. Page overflow remained zero.
- `viewport-fit=cover`, no `theme-color`, and standalone `black-translucent`
  remain. The mobile header's own pseudo background plate is removed, so real
  page content can extend into the safe-area backdrop. A normal Safari tab
  still controls its status and URL materials; only an installed Home Screen
  web app removes normal Safari URL chrome.
- Figma Type Scale is now a single Medium/Small/Large/XL choice. The Type Scale
  collection contains 15 Desktop and 15 Mobile primitives; 15 semantic aliases
  in Space choose the device ladder. All six text styles resolve through those
  aliases. Mobile caption sizes remain unchanged and leading is tightened to
  S18/M19/L22/XL28.
- Expanded Cargo control-panel order now matches Figma component `1:1039`:
  palette, scale, typeface, shape. The scale row is second with a 4-unit inline
  inset. Desktop caption leading remains unchanged.
- Reloaded Cargo CSS is 62,318 characters and byte-for-byte matches the local
  Cargo head + tokens + managed fonts + site bundle. It has one token marker,
  one layout marker, one managed mono region, two `--layout-u` definitions,
  Mobile Type Scale, and balanced 380/380 braces. Never publish without Ocean's
  explicit instruction.

## Current handoff — Round 43 compact panel, shaped-gap taps, and Kelly order
- Round 43 is saved and reload-verified in Cargo draft and is NOT published.
  Runtime is `responsive-45`; public remains `responsive-34`.
- Latest Figma compact panel `1:2899` is 390x179 with no title row, 24/36/42px
  optical rows, 16px gaps, and face-specific inner-label padding. Cargo matches
  it exactly at 390px and preserves the same full-width/bounded/right-aligned
  responsive modes. The dialog is labelled `site controls` without visible
  control wording. Intro copy now visibly reads `Have fun with the + control
  panel` and the plus inherits the active typeface and scale.
- Rounded and oval frame gaps no longer lose the header action to the river's
  rectangular hit layer. A trusted completed-tap forwarder opens the tray only
  when the point is inside the 44px header target and outside the visible media
  silhouette. Never disable river pointer events: iOS native horizontal and
  vertical scrolling still depends on the scroller owning the gesture start.
- Compact Kelly is explicitly 3, 2, 1, 4 and its caption remains under grid
  column 1, now image 3. Expanded Kelly remains the original two-by-two grid.
- Persisted Cargo CSS is exactly 62,184 characters, token/layout/font regions
  are intact, and braces are balanced 383/383. Cargo proof passed the 350px
  embedded mobile viewport and the 2900px expanded viewport with zero page
  overflow. Never publish without Ocean's explicit instruction.

## Current handoff — Round 44 iOS Safari full-bleed stabilization
- Round 44 is saved and reload-verified in Cargo draft and is NOT published.
  Runtime is `responsive-46`; public remains `responsive-34`.
- The homepage now establishes `viewport-fit=cover` and the visitor's final
  `--mms-edge-color` before visible content. It has no `theme-color` meta and
  uses one fixed, pointer-transparent edge canvas behind the portfolio. The
  five startup cuts remain hard and visible, but only `.mms` previews those
  temporary themes; the page edge remains the final saved/default theme.
- `refreshIOSChrome(reason)` provides a disposable, invisible iOS Safari
  compositor refresh after final startup restoration and browser lifecycle or
  intentional theme events. It changes neither scroll nor focus and never owns
  pointer input. Normal Safari status and URL controls remain browser-owned;
  the site paints real content beneath their translucent material rather than
  adding separate safe-area plates.
- Figma reference `591:409` documents the 390x844 Safari-owned top/bottom
  material, unsafe visual bleed, and inset safe interactive area. Existing
  production mobile frames were not replaced.
- Persisted Cargo CSS is exactly 63,097 characters with one token marker, one
  layout marker, one each of the managed Mono/Sans/Gothic regions, and balanced
  387/387 braces. Cargo reload proof passed at the 2900px expanded viewport and
  the embedded 350px compact viewport with Medium defaults, zero page overflow,
  and native river overflow intact. Physical iPhone Safari 26 confirmation is
  still required because Chromium cannot validate Safari-owned toolbar material.
  Never publish without Ocean's explicit instruction.

## Current handoff — Round 44b Cargo preview stacking correction
- The blank Cargo editor preview was a paint-order regression, not missing
  content. Cargo's `.page-content` is an isolated stacking context, so the new
  fixed edge canvas at z0 covered it. `#mms-edge-canvas` is now z-1 while the
  identical stable edge color remains on `html` and `body`.
- Cargo draft was reload-verified after restoring the exact bodycopy mirror:
  wordmark `MM.S`, one root, two `responsive-46` markers, no old runtime,
  visible EVIIVE media, and zero page overflow. Persisted CSS is 63,390
  characters with one token region, one layout region, and balanced 387/387
  braces. This remains DRAFT ONLY; public is still `responsive-34`.

## Current handoff — Round 45 real-content iOS edge flow
- The fixed edge-color canvas and invisible compositor approach is retired.
  Cargo draft now uses transparent html/body/Cargo wrappers and keeps `.mms`
  as the actual themed surface. The legacy `#mms-edge-canvas` reloads as a
  static zero-height node with no paint or positioning.
- Compact rivers use zero permanent inline padding plus equal scrollable flex
  spacers. Their resting inset remains intentional, while media can travel to
  the physical viewport edges during native horizontal scrolling.
- `cargo/site-head.html` is installed in Cargo's HTML region. It establishes
  `viewport-fit=cover` early and removes all `theme-color`, standalone status
  style, and app-capable metas, including late insertions from the existing
  body runtime.
- Reloaded Cargo proof: 63,341-character CSS, balanced 386/386 braces, one
  token/layout/managed-font region, transparent root wrappers, no chrome-color
  metas, zero page overflow, and a 711px compact river with 0 padding,
  3,806px scroll extent, `pan-x pan-y`, and equal 15.13px resting spacers.
- Cargo bodycopy remains `responsive-46`; the cleaned `responsive-47` mirror is
  local because the editor's raw page-mutation channel was unavailable. The
  effective obsolete edge behavior is neutralized by CSS and the early head
  hook. This remains DRAFT ONLY; public is still `responsive-34`.

## Current handoff — Round 46 Safari 26 sticky-tint correction
- Official WebKit clarification in bug 301756 confirms Safari extends a solid
  background from viewport-constrained fixed/sticky elements at obscured
  edges. The compact sticky links and intro were still theme-filled during the
  startup sequence, explaining the retained yellow toolbar.
- Deployed CSS keeps their sticky behavior but makes both backgrounds
  transparent. Runtime `responsive-48` holds only iOS Safari's first hard cut through
  two painted frames plus 180ms; all five 260ms cuts remain and other browsers
  keep their 80ms timing.
- A pre-deployment runtime probe found and fixed undeclared `isIOS`/`isSafari`
  flags in deferred media. The shared initialization-scope flags now drive both
  startup timing and iOS/Safari source selection; all critical motion loads and
  both alpha videos select their expected HEVC fallback under an iPhone UA.
- Cargo draft deployment and reload proof passed: one `.mms` root, two
  `responsive-48` markers and no `responsive-46`, live runtime
  `responsive-48`, exact viewport content `width=device-width, initial-scale=1,
  shrink-to-fit=no, viewport-fit=cover`, no browser-color or Apple standalone/
  status metas, transparent html/body/Cargo ancestors, and zero page overflow.
  At 390px the sticky links and intro remained sticky with transparent
  backgrounds; the river retained `overflow-x:auto`, `touch-action:pan-x pan-y`,
  `pointer-events:auto`, and 2,109/390px scroll/client widths. Expanded reload
  showed no regression.
- DRAFT ONLY and not published. Physical iPhone Safari verification remains
  required; do not claim the Safari-owned toolbar material is fixed solely from
  Cargo or Chromium evidence.

## Current handoff — Round 47 introduction, years, caption leading, and expanded panel
- Round 47 is saved and reload-verified in the Cargo draft. Runtime is
  `responsive-49`; bodycopy contains two current markers, no
  `responsive-48`, one MM.S root, and exactly 12 project years. The public site
  remains `responsive-34`; never publish without Ocean's explicit instruction.
- The desktop introduction now has one `col/6` contract and no inline width.
  Live Cargo at 1440px measured it at x272/664px, ending at x936 immediately
  before EVIIVE. The inline intro plus is compact-only and disappears with the
  top-right compact trigger at 1024px.
- Project years match Figma: V7/Touchbaes/Mandy Ma 2026;
  EVIIVE/Loop/Montran/Kelly's Kelly 2025; AnyDay/Curate Health/PURE LOVE 2024;
  Dead Good/WTW 2023. Existing project descriptions were not rewritten.
- Mobile S/M/L/XL caption leading is 17/18/21/27px for all four typefaces;
  desktop leading remains 17/21/25/34px. Figma variables and the Mandy Ma
  binding were updated with the Cargo tokens.
- Fine-pointer expanded panel geometry is 142.22x208.88 at 1024px, 200x232 at
  1440px, and capped at 250x290 from 1800px upward. It retains the 2x2 face
  grid, equal padding/gaps, breakpoint-Medium UI type, and the intended
  Serif 0/Sans -1/Mono 0/Gothic +2px optical label corrections. Coarse-pointer
  expanded controls remain at least 44px high. Figma panel sources are
  `1:1039` at 200x232 and `1:2899` at 390x178.
- Reloaded CSS is 65,159 characters and preserves one token region, one layout
  region, all three managed font blocks, one panel-control contract, and the
  introduction `col/6` rule. Live 390px proof retained a 390x179 panel,
  transparent sticky links/introduction, native `overflow-x:auto` rivers with
  `pan-x pan-y` and pointer events, and zero page overflow. Live 1440px proof
  also retained zero page overflow.
- DRAFT ONLY, reload-verified, and never published.

## Current handoff — Round 50 explicit media-shape frames
- Round 50 is saved and reload-verified in the Cargo draft. Runtime is
  `responsive-50`; bodycopy contains two current markers and no
  `responsive-49`. The public site remains `responsive-34`; never publish
  without Ocean's explicit instruction.
- The homepage has 68 unique media IDs with explicit policies: 59 crop, six
  artwork, and three interactive. Sixty-five decorative media items are owned
  by `.mms-frame` wrappers. V7, Touchbaes, and Montran are the three direct
  rectangular iframe children and remain unclipped and fully interactive.
- Fit is also explicit: 64 contain, one intentional WTW cover crop, and three
  none values for the interactive embeds. Straight mode leaves the wrapper
  unclipped; rounded uses the 24-unit inset; oval uses the frame ellipse. The
  image/video child itself always computes with no clip.
- The shaped-gap trusted-click forwarder now tests wrapper silhouettes and
  direct interactive embeds. Rivers remain pointer-active and retain native
  compact `pan-x pan-y` gestures; do not disable pointer events on the river.
- Reloaded CSS is exactly 65,747 characters with one token marker, one layout
  marker, one shape-policy marker, and balanced 406/406 braces. Reloaded
  bodycopy and live runtime both report responsive-50.
- Live 390px proof retained 13 rivers, 12 scrollable, pointer events enabled,
  zero page overflow, inline plus visible, and 17/18/21/27px S/M/L/XL caption
  leading. Frame clips measured none/inset-24/ellipse for straight/rounded/oval
  while child clip remained none.
- Live 1440px proof retained the 664px introduction, 200x232px panel, hidden
  compact plus, Kelly's 2x2 grid at 523.4x380.2px per item, and zero page
  overflow.
- DRAFT ONLY, reload-verified, and never published. Physical iPhone Safari
  toolbar behavior was not re-tested by Codex and remains an explicit release
  gate.

## Current handoff — Round 51 exact startup cuts and compact trigger alignment
- Round 51 is saved and reload-verified in the Cargo draft. Runtime is
  `responsive-51`; bodycopy contains two current markers, no
  `responsive-50`, and one MM.S root. The public site remains
  `responsive-34`; never publish without Ocean's explicit instruction.
- Startup exposes exactly five equal 260ms hard-cut combinations before
  restoring the saved/default state at 1300ms. The first combination paints
  synchronously; the removed saved/default pre-roll was the apparent sixth
  visual. Keep transitions at zero and do not reintroduce the former iOS
  two-frame + 180ms hold.
- The inline intro plus inherits the selected face/size/leading. Its measured
  optical shifts are Serif 0.092em, Sans -0.005em, Mono 0.128em, and Gothic
  0.08em. Cargo Medium Serif requires 1.836px and applies 1.84px.
- The compact trigger separates the visible square from its glyph while
  preserving a 44x44px target: S 22/17, M 24/20, L 26/24, XL 28/28px.
  Cargo's later button-font cascade otherwise expands the XL SVG to 30px, so
  the menu font and SVG dimensions must stay pinned to the glyph token with
  `!important`. Reloaded XL proof is square 28x28, glyph 28x28, center delta
  0/0, and target 44x44.
- Persisted CSS is 68,384 characters with one token marker, one layout marker,
  one managed Mono region, two layout-unit definitions, three icon pins, and
  balanced 409/409 braces. Compact reload proof retained transparent
  html/body/Cargo/sticky surfaces, no browser-color or Apple metas,
  `viewport-fit=cover`, native `auto`/`pan-x pan-y` rivers, and zero overflow.
  Expanded mode retained Medium Serif and zero overflow.
- DRAFT ONLY, reload-verified, and never published. Physical iPhone refresh
  testing remains necessary to confirm Safari-owned status/URL material tracks
  every startup surface.

## Current handoff — Round 52 four previews and corrected desktop panel inset
- Round 52 is saved and reload-verified in the Cargo draft. Runtime is
  `responsive-52`; bodycopy contains two current markers, no
  `responsive-51`, one MM.S root, and all 12 project taglines. The public site
  remains `responsive-34`; never publish without Ocean's explicit instruction.
- Startup is four 260ms hard-cut previews plus the final saved/default state at
  1040ms. The four preview themes exclude the landing theme, all four faces
  and scales occur exactly once, and all three shapes occur with one
  non-adjacent repeat. Transitions remain `0s`; stored visitor settings are
  restored exactly.
- Expanded panel padding is 24 design units vertically and 16 horizontally.
  Keep the `.mms dialog.mms-panel` specificity on both expanded padding rules
  because Cargo's editor preview retains a later compiled copy of its old CSS.
  Reloaded 1440px proof is x40/200x248px with 23/15px computed padding plus the
  1px border and zero page overflow.
- Persisted CSS is 68,946 characters with one token/layout region, all three
  managed font regions, two qualified panel rules, and balanced 409/409
  braces. Compact reload proof remains transparent, metadata-clean,
  `viewport-fit=cover`, natively scrollable with `pan-x pan-y`, and free of
  page-level horizontal overflow.
- Safari's normal browser UI does not reliably resample runtime CSS background
  changes at this cadence. Physical iPhone testing still shows white material
  during the cuts even though the transparent/full-bleed landing is correct.
  Do not reintroduce `theme-color`, opaque sticky edge elements, fixed color
  plates, or compositor tricks; they can retain an arbitrary preview color
  and regress the approved landing behavior.
- Round 52a updated both desktop and compact Email anchors to
  `mailto:ocean@mmmmm.studio,alvis@mmmmm.studio`. The complete bodycopy was
  saved and reloaded; proof found two dual-recipient links, no old
  single-recipient link, and live runtime `responsive-52`.
- Round 52b repaired Cargo CSS line 69 in the preserved boilerplate head. An
  accidental 1,858-character Base64 transfer fragment had been appended after
  `border: 0;`; it survived earlier splices because marker and brace checks
  passed and the head was intentionally preserved. Reloaded CodeMirror is now
  67,089 characters with clean line 69, exact local token/layout hashes,
  balanced 409/409 braces, and no Base64, overlong-line, HTML, or transfer
  residue. Expanded and live 390px compact probes retained zero page overflow;
  compact rivers remain `overflow-x:auto` with `pan-x pan-y`. `PLAYBOOK.md`
  now makes those residue checks mandatory.
- Round 52c re-audited the actual reloaded editors. CSS line 69 remains exactly
  `border: 0;`; the 67,133-byte persisted stylesheet is balanced 409/409 and
  contains no Base64, overlong line, transfer/runtime residue, or mojibake.
  Removed two genuine bodycopy mirror residues: stray `er` inside EVIIVE's
  first video and serialized desktop positioning on `#mms-tw-rig`. Reloaded
  Cargo has one MM.S root, two `responsive-52` markers, and neither residue.
  The Site Settings HTML region now matches local `site-head.html` exactly with
  one marker 48 and no stale marker 47. Cargo re-serializes five benign
  lowercase `viewbox` aliases on reload; local source remains canonical.
- `cargo/validate-cargo-payload.sh` is now the executable guard for local CSS,
  complete persisted CSS, bodycopy, and head HTML. The composer and test
  assembler call it automatically. Always run the persisted mode against the
  complete copied CodeMirror document so preserved-head contamination cannot
  bypass the local bundle checks again.
- DRAFT ONLY and never published.

## Current handoff — Round 53 mobile grids and complete Who/Write deployment
- Round 53 was saved, reload-verified, and published at 11:44 EDT on
  2026-07-14 after Ocean's explicit authorization. Home, Who, and Write use the
  current `responsive-52` runtime on the public site.
  The clean Cargo targets are Who `B2402536676` and Write `P0060651058`; never
  use the obsolete `D4042456702` or `I0096029541` pages.
- Figma Who mobile `638:432` and Write mobile `640:448` use `grid/mobile` with
  six stretch columns, 16px gutters, 20px margins, and 24px baseline rows.
  Both frames explicitly use Space/Mobile and Type Scale/Medium; `col/6`
  resolves to 350px at the 390px reference.
- Cargo's named-page compact contract uses a fluid six-column content measure.
  Who portraits scale from 176px to a 200px cap and both remain left-aligned.
  Write uses Figma-derived responsive ratios of 90.2857%, 68.5714%, 100%,
  100%, and 80%, capped at 316/316/432/664/432px. At 390px these resolve to
  316/239.98/350/350/280px; the Who portrait is 199.98x237.25px. At 1024px
  and above the existing expanded composition is unchanged.
- The complete Who and Write bodycopies were installed with the UTF-8-safe
  `TextDecoder` + `InputEvent` workflow, saved with Cmd+S, reloaded, and
  re-probed. Who contains two founder profiles and both Freight videos; Write
  contains all five writing pieces. Both videos reached readyState 4, played
  muted, and reported no error. Home was also overwritten from its clean local
  mirror and reload-verified with no temporary profile-media debris.
- The reloaded global CodeMirror stylesheet is 75,160 characters with one
  token marker, one layout marker, one each of the managed Mono/Sans/Gothic
  regions, two `--layout-u` definitions, one compact-grid contract, balanced
  457/457 braces, a 197-character maximum line, and no Base64 or
  transfer/runtime residue. The complete local bundle SHA-256 is
  `9673926131f31fa14a7bd913aa0a2654dbc561f15c648bfc2a0f0c66e5e8feb8`.
- Exact local checks at 320, 390, 430, 768, 1023, 1024, and 1440px all have
  zero page-level overflow. Public cache-busted verification confirmed clean
  `/`, `/who`, and `/write` routes, `responsive-52` with no `responsive-34`,
  zero overflow on all three pages at 390px, two playing error-free Who videos,
  five Write articles, native compact river panning, and unchanged expanded
  rail/panel geometry at 1440px. Future edits are draft-only; never publish
  another round without Ocean's explicit authorization.

## Current handoff — Round 54 named-page sticky parity
- Round 54 is saved and reload-verified in the Cargo draft. Round 53 remains
  public; no Round 54 publish action was taken.
- Compact Home, Who, and Write now use the same sticky navigation geometry:
  `top: var(--mbar-row-h)`, transparent background, z-index 10, and 24px/16px
  vertical padding. At the Medium 390px reference each has a 56px header,
  links at y56 with 178px height, first link at y80, and `--bar-h: 234px`.
- Who's compact introduction is structurally contained with Ocean only in
  `.mms-who-ocean-stage`. Ocean's z20 surfaces cover the sticky z1 intro; the
  stage boundary releases it at Ocean's bottom before the 64px Alvis gap.
  Expanded mode hides that compact instance, shows the original intro, and
  makes the stage `display: contents` so the founder grid remains two columns.
- Compact Write's five article plates now paint at z20 above its sticky links.
  No Write bodycopy or editorial width changed.
- Local 320/390/430/768/1023 release checks and 1024/1440/1920 expanded checks
  all have zero horizontal overflow. Reloaded Cargo compact Who/Write at 729px
  match the same sticky contract; expanded Home at 2900px retains the 250px
  left control panel and zero overflow.
- Persisted Cargo CSS is 76,425 bytes, passes the full residue validator, and
  has SHA-256
  `521608069f5630d8eca0c2b95b42c4b120975e09ecdf6df35a4eb598252d01b5`.
  Reloaded Who bodycopy is 41,162 characters with one root, one Ocean stage,
  one compact intro, one expanded intro, and two `responsive-52` markers.

## Current handoff — Round 55 shared three-page system and transactional build
- Round 55 was published at 15:31 EDT on 2026-07-14 after Ocean explicitly
  authorized publication of the latest draft. Public Home, Who, and Write use
  the shared Round 55 shell and `responsive-52`. All subsequent edits are
  draft-only; do not publish again without a new explicit instruction.
- Figma Serif variable `51:270`, mode `51:0`, is restored to
  `Times New Roman`; cloud readback verified the exact value. Frames `502:466`
  and `532:1208` are named `who / desktop` and `write / desktop`. Compact Who
  and Write screenshots are both 350x186px and visually match Home. There is
  no outstanding Tinos substitution or frame-name warning.
- Home, Who, and Write now assemble from canonical early-init, mobile-header,
  desktop/compact navigation, navigation-item, desktop-clock, panel, and
  panel-runtime sources. The panel source is `shared-panel.html`; the site
  marker is `data-mms-site`; the desktop rail's z-index 30 is shared CSS, not
  inline markup or Home runtime mutation. Home-only video/tweezer extras remain
  Home-only.
- `cargo/assemble-pages.py` renders and stages all three pages, validates the
  complete staged set, commits only after every check passes, revalidates the
  committed set, and rolls back committed outputs on failure. An `fcntl` lock
  serializes concurrent assemblers. Generated `home.html`, `who.html`, and
  `write.html` are normalized to mode 0644. A forced post-commit failure and a
  two-process concurrency probe both passed. Edit templates/shared partials,
  never generated outputs.
- `cargo/assemble-test.sh canonical` or `all` refreshes all three standalone
  mirrors. `validate-test-mirrors.py` compares each mirror byte-for-byte with
  `tokens.css`, `site.css`, and its generated bodycopy. Repeated canonical/all
  runs are idempotent.
- Reloaded Cargo CSS is 76,612 bytes with SHA-256
  `3b169e1f3fde3a1ae2420997a5c43a0ecdf45b8d99af9cf9f69bf351ec9f3b84`.
  Reloaded bodycopy lengths are Home 98,368, Who 41,145, and Write 39,756;
  each has one root, two `responsive-52` markers, and two correct current-page
  links. Home retains 13 bands/27 videos; Who has two people/two intro
  instances; Write has five pieces.
- Live 729px compact Home measured header `[0,0,729,56]`, navigation
  `[0,56,729,178]`, `--bar-h:234px`, transparent sticky surfaces, zero page
  overflow, and a native `auto`/`pan-x pan-y` river with 729px client and
  3,902px scroll width. Live 2900px expanded Home retained rail 340, clock
  right 50, panel x50/250x310/bottom50, CSS rail z-index 30 with no inline
  value, and zero overflow. Settled local 390px and 1440px parity passed on all
  three pages.
- Generated SHA-256 values: Home
  `f029be2ac69ee92213d14dd214b25c0b45d89a2d6184fee145f01e98a8d11ec3`,
  Who `4438d77baabf5dc16051bf28f9928df7a007233c9cc58869a497a92c8d3ebb6c`,
  Write `6595c756be6d552bae93eb1ddec7439b784af74bb92395803ac7a5eaf3064e58`.
- Public verification at 1440x900 and 390x844 passed on all three routes: one
  root, two active-body `responsive-52` markers, `data-mms-site="1"`, no
  `data-mms-home`, correct current-page links, and zero horizontal overflow.
  Home retains 13 bands/27 videos and native compact rivers; Who has two people
  and two ready, muted autoplay videos; Write has all five pieces.

## Current handoff — Round 56 startup, type, booklet, and media refinement
- Round 56 is deployed and reload-verified in the Cargo draft only. Round 55
  remains public. Never publish this draft without a fresh explicit instruction
  from Ocean.
- Runtime is `responsive-53` on Home, Who, and Write. Startup shows exactly
  four hard-cut randomized states for 500ms each, beginning before normal page
  markup and restoring the saved/default state at two seconds. iOS Safari's
  existing sticky header carries each temporary cut color, then returns to the
  transparent full-bleed state; the sticky links/introduction stay transparent.
- Gothic caption leading is Desktop 15/18/22/30px and Mobile 16/17/20/25px for
  S/M/L/XL, with body leading unchanged. Keep the higher-specificity
  `html[data-face="gothic"]` binding because Cargo's later page-local stylesheet
  clone otherwise restores the old caption leading. Reloaded Medium proof is
  18px expanded and 17px compact.
- Compact control alignment now moves the entire visual square and glyph via
  the face optical token. Gothic XL remains a centered 28px glyph in a 28px
  square with its transparent 44px hit target. Figma variables `676:351` through
  `676:355` hold the new Gothic leading and header-control alignment contracts.
- Montran v17 is hosted at Freight hash
  `U3034412351395654863674388559673`; source/host SHA-256 is
  `825cf2c3a1f130cb3445e62443985e845991204d19e0c2154cfd43a36126b49b`.
  Compact pointer input belongs to the outer river through a 46/8/46 overlay;
  stationary side taps post one page command and the center 8% is inert.
  Desktop fold/drag behavior is unchanged.
- Touchbaes booking image 3 has a Cargo-clone-proof left cover crop. Kelly
  remains 2x2 expanded and 3/2/1/4 compact, with its complete caption under
  item 3 and a measured 12px filled gap.
- Persisted Cargo CSS: 80,787 bytes, SHA-256
  `9bf5f481bde55e1a78a0c4216f1e66b54ae75827f85bf4c6378fed6197d0db9b`.
  Local bundle SHA-256:
  `140b2e694572af2570046c348ad876fd503a55b287c8e0296075d1fd7a6262ae`.
  Reloaded bodycopy lengths are Home 107,510, Who 50,255, and Write 48,866;
  every page has one root, two `responsive-53` markers, no `responsive-52`,
  and zero page-level overflow in the live expanded checks.

## Current handoff — Round 57 startup timing and named-page editorial spacing
- Round 57 is deployed and reload-verified in the Cargo draft only. Round 55
  remains public. Never publish this draft without a new explicit instruction
  from Ocean.
- Runtime `responsive-54` uses four randomized hard cuts at 375ms each, then
  restores the exact saved/default state: five visual designs total over a
  1,500ms preview controller duration. Keep transitions at 0s.
- Do not attempt direct Safari toolbar painting. Ordinary iOS Safari does not
  expose frame-synchronous status/URL-bar color control; the approved content-
  through full-bleed landing is more important than eliminating the browser's
  sampling delay. Retain the current no-`theme-color`, no-Apple-status-meta,
  no-fixed-edge-plate contract.
- Figma/Cargo spacing is now synchronized: compact Who = 64px intro-to-media +
  32px founder gap; compact Write = 32px piece gaps, 0px title-to-author, 8px
  author-to-copy; expanded Write = 64 design units between rows at 1440px.
  Figma Clout fleeing and Withered green title instances were rebound from
  literal black to semantic `text/primary` variable `5:3`.
- Cargo's named-page `h1` rule explicitly uses
  `var(--color-text-primary)`. Live reloaded White/Girly/Quirky/Contrast/Black
  tests all passed despite Cargo's global black heading rule.
- Persisted Cargo CSS is 80,915 characters, SHA-256
  `f739e6146007a7177a0f3a722e3dda50d6254f34457781f5ec7fac0acfcaef64`,
  with one token/layout block, all three managed font regions, balanced 484/484
  braces, and no residue. Reloaded bodycopy lengths are Home 107,934, Who
  50,255, Write 48,866; every page has one root, two `responsive-54` markers,
  no `responsive-53`, and zero page-level overflow.
- Compact 729px live proof retains Home native river scrolling with
  `overflow-x:auto` and `pan-x pan-y`; Who measures 64/32px and Write 32/0/8px.
  Local 1440px proof retains expanded Who 192px spacing and Write 64px row
  gaps. Dia was left in expanded Write draft mode; Publish was never invoked.

## Current handoff — Round 58 Write type and compact Kelly descender guard
- Round 58 is deployed and reload-verified in the Cargo draft only. Round 55
  remains public. Runtime stays `responsive-54`; do not publish without a new
  explicit instruction from Ocean.
- Write body/list copy now uses `--font-size-base` and `--lh-base`; author
  labels retain caption sizing; Withered green's paragraph gap follows base
  leading; compact title-to-author spacing is 8px. This arrived through the
  complete CSS parity deployment and does not alter Home or Who type.
- Kelly's compact caption must retain the higher-specificity
  `.mms [data-slot="kelly-caption"]` rule and
  `padding-bottom:max(6px, 0.25em) !important`. Cargo's later
  `.mms * { padding:0 !important; }` otherwise removes the reserve, and the
  river's `overflow-y:hidden` clips the Sans XL descender in “brought.” The
  fix preserves the approved 3/2/1/4 order, 12px filled gap, and native
  horizontal scroll.
- Persisted Cargo CSS is 81,419 bytes, SHA-256
  `f2f12e04240e1118380519c132f8d5d50ebc03fde31347946fab5708a6586ca8`;
  the complete local token/site bundle is 73,929 bytes, SHA-256
  `478a6426569c67856dd9c9a57de62a385d158465b097210b52c8b0e3f6666ba1`.

## Current handoff — Round 59 compact panel visibility contract
- Round 59 is reload-verified in the Cargo draft only; Round 55 remains public.
  Runtime stays `responsive-54` and no bodycopy changed.
- Compact panel display must require
  `html[data-panel="open"] dialog.mms-panel[open]`. Do not restore a bare
  `dialog.mms-panel[open]` compact selector: the shared dialog is native-open
  for the expanded desktop rail, and Cargo may rehydrate that markup before its
  runtime executes. The root state is the visitor-intent boundary.
- Verified locally: native `open` with no root state is hidden at 390px; the
  `+` opens it; the second activation closes it; 1023px is closed and 1024px /
  1440px restore the rail. Rivers keep native `pan-x pan-y`, with zero page
  overflow. Reloaded Cargo compact preview begins closed.
- Persisted CSS is 81,667 bytes, SHA-256
  `aa90a3a953d654e3142b59ffa7435b0cde0aec41243f831a4d7ee2024a255e08`;
  local bundle is 74,177 bytes, SHA-256
  `a0de25e79c9a6d1ef67c9dea962a5e177e33dfd8b9f75ea7d56dec1a8b4e17bb`.
  Cargo's visible `Mobile Settings` palette is editor-only chrome, not site UI.

## Current handoff — Round 60 iOS Safari edge-state update
- Cargo and the public site are verified at `responsive-55` on Home, Who, and
  Write. The shared iOS Safari compact edge contract is solid selected-theme at
  document top, transparent after vertical scrolling, a hard 180ms selected
  color pulse after an intentional theme change while scrolled, and solid again
  on returning to top. Horizontal river movement must never change this state;
  reduced-motion skips the pulse.
- Startup remains exactly four randomized hard cuts at 375ms each plus the
  final saved/default landing: five visual designs over 1,500ms, no fade.
- Cargo site HTML is marker 49 and exact 1,310-byte reload equality. It scopes
  Home/Who/Write/Cargo preview, establishes `viewport-fit=cover`, and removes
  `theme-color` plus Apple standalone/status-bar metas. Do not add a fixed edge
  plate, synthetic compositor, invisible dialog, or scrolling hack.
- Reloaded Cargo CSS is 82,127 characters, SHA-256
  `74cad2dd616a6e63f8aec53eecb24f00f9f9bb21ea1bb8092ba71c4434af8195`,
  with one token region, one layout region, all three managed font blocks, and
  exact post-reload equality. Compact sticky links/introduction and all Cargo
  wrappers remain transparent; rivers remain native `pan-x pan-y`; page
  overflow is zero. Expanded 2,900px geometry is unchanged.
- Reloaded bodycopy lengths are Home 109,997, Who 53,135, and Write 51,746;
  each has one MM.S root, two `responsive-55` markers, and no
  `responsive-54`. Ocean explicitly confirmed publication; Cargo completed at
  09:41 EDT and reported `Site is up to date`.
- Public Home, Who, and Write are independently verified with one root,
  `responsive-55`, head marker 49, no browser-color or Apple standalone/status
  metas, and zero overflow. Public 390x844 proof passes solid top, transparent
  scrolled, 180ms theme pulse, horizontal-river isolation, and return-to-top;
  public 1280x720 retains expanded geometry. ROUND 60 IS PUBLISHED.

## Current handoff — Round 61 transparent Safari edge flow
- Round 61 is published on Home, Who, and Write at `responsive-56`. The Round
  60 iOS `top` / `scrolled` / `pulse` painter and all preview-edge state were
  removed because Safari could retain the opaque sticky-row color.
- Keep `.mbar-row`, compact navigation, compact introduction, `html`, `body`,
  and Cargo wrappers transparent in every state. Retain marker 49,
  `viewport-fit=cover`, no browser-color or Apple standalone/status metadata,
  and no synthetic edge canvas or compositor layer.
- Startup remains four randomized 375ms hard cuts plus the saved/default
  landing. Rivers remain native `overflow-x:auto` with `pan-x pan-y`; compact
  and expanded layouts retain zero page-level horizontal overflow.
- Deploy global CSS only through Site Settings → CSS / HTML using the global
  CodeMirror API, preserving Cargo's head and all three managed font blocks.
  Never substitute page Code View or accessibility `set_value`; neither is a
  reliable persisted-global-CSS path.
- Complete Home, Who, and Write bodycopies were deployed through the UTF-8-safe
  `TextDecoder` + `innerHTML` + `InputEvent` workflow, saved, reloaded, and
  verified with exactly two `responsive-56` markers and no `responsive-55`.

## Current handoff — Round 62 disposable iOS startup edge sampling
- Round 62 is deployed, reload-verified, and published at 12:28 EDT. Public
  Home, Who, and Write use `responsive-57`; `responsive-56` is absent.
- Home, Who, and Write now use `responsive-57`. Each reloaded editor contains
  one MM.S root, exactly two current markers, and no `responsive-56`. The shared
  early initializer uses the global one-run sentinel `edge-preview-v2` so Cargo
  cannot execute two interleaved preview controllers in one window.
- Round 62's three bodycopies were transferred through each page's HTML Code
  View as direct UTF-8, copied back for exact equality before `Update`, saved
  with Cmd+S, and re-read after reload.
- Startup remains exactly four hard cuts at 375ms each. On compact iOS Safari,
  every cut creates a fresh disposable fixed top-and-bottom edge sampler pair at
  z-index 8 with that cut's exact theme color. The permanent header is z-index
  10 and showcases are z-index 20, so real content can pass over the temporary
  sampler and continue edge-to-edge.
- The final sampler pair is hidden and removed completely when the saved/default
  landing state settles. `.mbar-row`, compact navigation, compact introduction,
  `html`, `body`, and Cargo wrappers remain transparent after startup. Do not
  make the sampler persistent, paint a sticky surface, or add `theme-color` or
  Apple standalone/status-bar metadata.
- Local Chromium and WebKit passed four-cut timing/color, fresh sampler identity,
  duplicate-initializer suppression, complete landing removal, native river
  panning, zero overflow, and expanded regression checks. The exact reloaded
  Cargo stylesheet is 82,257 bytes with the CSS head and all three managed font
  blocks preserved.
- Public verification found one MM.S root, exactly two `responsive-57`
  markers, no browser-color meta, and zero page-level horizontal overflow on
  Home, Who, and Write. Home retains `viewport-fit=cover`; its permanent header
  is transparent and no sampler remains after landing.

## Current handoff — Round 63 sampler stacking fix and public release
- Round 63 is saved, reload-verified, and published on Home, Who, and Write.
  Runtime remains `responsive-57`; the four 375ms hard cuts, one-run
  `edge-preview-v2` sentinel, and transparent sampler-free landing remain
  unchanged.
- Root cause of the startup composition disappearing: the body-level
  `.mms-preview-edge-sampler` at z-index 8 painted above the complete `.mms`
  root stacking context at z-index 1. The nested compact header's z-index 10,
  showcase z-index 20, and open-panel z-index 40 could not escape that root.
- The sampler now uses z-index 0. Preserve the full ordering: sampler 0,
  `.mms` root 1, compact header 10, showcases 20, panel 40. Do not move the
  sampler back above the root or make it persistent. It remains disposable and
  is removed completely after the saved/default landing state.
- WebKit iPhone emulation proved the visible difference: the old rule produced
  zero navigation pixels in the top crop, while the corrected black cut kept
  MM.S, clock, and plus visible with 5,294 navigation pixels. No sampler nodes
  remained after landing.
- The complete Cargo stylesheet was saved and reload-verified in Dia. Public
  `https://mmmmm.studio` contains sampler z-index 0, no sampler z-index 8, and
  `responsive-57`; Cargo's publish panel says `Site is up to date`. ROUND 63
  IS PUBLISHED.

## Current handoff — Round 64 Safari theme canvas and Write link coverage
- Round 64 is deployed, reload-verified, and published. Runtime remains
  `responsive-57`; the startup sequence and all three bodycopies are unchanged.
- On compact ordinary iOS Safari only, `html` and `body` now provide a real
  theme-colored canvas through `--color-bg-page`. This sits behind the
  transparent Cargo/page stack and prevents the white UA fallback visible in
  Ocean's black and colored-theme screenshots. It does not paint an edge plate:
  sticky navigation, introduction, wrappers, media, and `.mms` remain
  transparent or content-owned so actual content continues to the screen edge.
- Compact Write now gives the complete `.mms-writing` sequence one continuous
  page-color surface at z-index 20. The links are available at the opening and
  stay covered after the first poem passes, including the transparent spaces
  between all later poems. Desktop Write remains static and unchanged.
- Preserve sampler 0, `.mms` 1, header 10, showcase/write surface 20, and panel
  40. Keep `theme-color` and Apple standalone/status metas absent, and retain
  early `viewport-fit=cover` plus native compact river panning.
- Local 390px all-theme and Write hit-testing, public source verification, and
  expanded 1440px regression all passed with zero page overflow. Complete local
  CSS is 75,608 bytes, SHA-256
  `21898f2285ac03db0d8dcb35df2a1d0807f3073fe49c4f6a5f1d3612c51a2fa4`;
  reload-persisted Cargo CSS is 82,973 bytes. ROUND 64 IS PUBLISHED.

## Current handoff — Round 65 compact header edge clearance
- Round 65 is published. Runtime remains `responsive-57`, and bodycopy is
  unchanged. The only behavior change is the disposable top startup sampler's
  fallback height: `max(1px, env(safe-area-inset-top))` instead of 32px.
- Keep the bottom sampler at 32px and preserve sampler 0, `.mms` 1, header 10,
  showcases/Write surface 20, and panel 40. Do not reintroduce a larger top
  fallback: at zero environment inset it physically intersects the compact
  MM.S and clock glyph boxes even when ordinary DOM stacking is correct.
- The four hard 375ms startup cuts, transparent sampler-free landing, iOS theme
  canvas, Write covering surface, `viewport-fit=cover`, and absence of
  `theme-color`/Apple standalone metadata remain unchanged.
- Reload-persisted Cargo CSS is 83,500 bytes, SHA-256
  `4934a80c87f9a17710a1a936bc437861a4df623b780a2197df69eb2f8d9aadbf`;
  the CSS head and all three Cargo-managed font regions were preserved. Public
  Home, Write, and Who contain the new rule and no old 32px top fallback.
  Cargo reports `Site is up to date`. ROUND 65 IS PUBLISHED.

## Current handoff — Round 66 bottom sampler and theme resampling
- Round 66 is published on Home, Who, and Write at `responsive-58`. Runtime
  startup remains four hard 375ms cuts; visual layout and typography are
  unchanged.
- Keep the bottom startup sampler at exactly 1px. Its former 32px fallback was
  the source of the large solid URL-toolbar plate. Keep sampler 0, `.mms` 1,
  header 10, showcases/Write surface 20, and panel 40.
- Preview controller v2's `sampleTheme(theme)` is required for iOS Safari.
  Intentional color choices create fresh chosen-color top/bottom probes for two
  painted frames plus 160ms, generation-guard rapid changes, defer the latest
  choice when startup is settling, and then remove all probes. Do not replace
  this with `theme-color` or a permanent fixed edge surface.
- Compact verification retains no panel open by default, keeps the panel open
  while choosing a theme, exposes no actual browser-color metadata, preserves
  native `pan-x pan-y`, and has zero page overflow. Expanded behavior is
  unchanged. Reload-persisted CSS is 83,702 bytes, SHA-256
  `53bdc61e25dac8a24099db4069c7b5f7d3a8f18bd1011a4de36992a62ad35bbc`.
  Cargo and all public routes report the current build. ROUND 66 IS PUBLISHED.

## Current handoff — Round 67 Touchbaes poster removal
- Public and Cargo draft Home, Who, and Write now use `responsive-59`. Round 67
  removed only the Touchbaes cover poster and preloads the live game when its
  band is vertically near the viewport.
- Keep the compact iframe envelope integer-rounded and locked after settlement;
  ignore child measurements within 1px of the current envelope. This prevents
  river-scroll flicker while retaining legitimate viewport/orientation sizing.
- Public 390x844 verification held Touchbaes at 387x460 before and after its
  horizontal reveal, with no poster, native river panning, and zero page
  overflow. Desktop rail/panel geometry is unchanged. CSS remains Round 66.
  ROUND 67 IS PUBLISHED.

## Current handoff — Round 68 selected-theme seam removal
- Round 68 is reload-verified and published on Home, Who, and Write at
  `responsive-60`. Each persisted bodycopy contains exactly two current markers
  and no `responsive-59`; Cargo reports `Site is up to date` after the 22:46 EDT
  publish.
- Preview controller version 3 keeps top/bottom edge probes for the four
  startup cuts but uses a top-only probe for an intentional palette choice.
  Never restore a selected-theme bottom probe: the nominal 1px element was
  visibly exposed as a full-width lower seam on physical iPhone Safari.
- In compact mode a theme choice keeps the newly themed tray and its full
  safe-area backing painted for two frames, then closes the tray. Typeface,
  scale, and shape choices continue to leave it open. Keep
  `dialog.mms-panel::before { inset:0; }` in the compact panel rules.
- Public iPhone WebKit proof shows the top `theme-selection` sampler on the
  immediate and first-frame states, tray closure on the second frame, and no
  sampler after 220ms. Rivers remain native `pan-x pan-y`; compact and expanded
  page overflow remain zero.
- Reload-persisted Cargo CSS is 84,006 characters, SHA-256
  `107c1a9c20fd64f7792af66faa35f8490dd315676dff22f4f0e0bcc557908648`,
  with Cargo's head and all three managed font regions intact.

## Current handoff — Round 69 GOLD STANDARD: top-only sampling, persistent tray, and Montran tap restoration
- Ocean explicitly accepted Round 69 as the MM.S standard gold version. Treat
  it as the immutable visual, interaction, and rollback baseline; branch the
  next type-scale and spacing refinements from this state and retain before/after
  checks against `cargo/GOLD-BASELINE.md`. Do not edit the matching source
  snapshot in `cargo/gold/round-69/`.
- Round 69 is reload-verified and published on Home, Who, and Write at
  `responsive-62`. The final corrected publication landed at 14:05:03Z on
  2026-07-16; public cache-busted routes contain no older responsive runtime.
- Preview controller version 4 uses top-only disposable Safari samplers for all
  four startup cuts and intentional palette selections. A theme choice keeps
  the compact tray open; the dialog itself paints the selected page color
  through its lower safe area. No bottom sampler, panel `::before`, or
  theme-click auto-close remains.
- Montran is the sole shape-responsive interactive embed. Its shell clips the
  active straight/rounded/oval treatment; V7 and Touchbaes stay rectangular.
  Compact page turns commit once on a stationary primary pointerup within 8px
  and 500ms, use the existing 700ms lock, suppress the delayed click for 450ms,
  preserve the inert center binding zone, and leave moved gestures to native
  river/page scrolling. Viewer v17 itself was not re-uploaded.
- Montran's nine-icon motion frame now uses the true 400:400 source ratio. The
  public rounded booklet computed a 24px radius, matching clip path, hidden
  overflow, and zero page overflow.
- Reload-persisted global CSS is 83,632 bytes, SHA-256
  `070fb68449dd5801ed3592a4047b3f301fc6fe7078d7b181b3c0d25df5e1e145`;
  Cargo's CSS head and all three managed font regions remain intact. The local
  complete token/site bundle is 76,142 bytes, SHA-256
  `66f61b5950dfeed1c68548dfc75b81a472d4a4fd8a543540e4d9db3dbabfae65`.
- Home carried a historical page-local full stylesheet that overrode the new
  global rules after publication. It has been replaced and reload-verified as
  the 79-byte canonical-owner comment, SHA-256
  `72aa1a231f1d838ee6b3b7f18a09682ee478bfe399788d62c7e55ebae7da2fd8`.
  Never paste the site bundle into page Code View CSS; Site Settings CSS is the
  only canonical active stylesheet.
- Public Chromium verification at 390x844 kept the tray open through a theme
  change, painted the selected tray background, retained 13 native `pan-x
  pan-y` rivers, and had zero overflow. At 1440x900 the left rail remained
  272px, the panel 200x248, the introduction 664px, and the root 1440px with no
  overflow. Who and Write also passed compact public rendering. The booklet
  pointer state machine was proven in WebKit emulation; do not claim a new
  physical-iPhone proof until Ocean confirms it on device.

## Current handoff — Round 71 poem-spacing draft
- Round 69 remains the immutable published gold baseline. Round 70 and the
  current Round 71 are Cargo drafts only. The active draft runtime is
  `responsive-64` on Home, Who, and Write; it appears exactly twice per page.
- Round 70 introduced the current Figma named-page refinements: shared MM.S home
  links, revised Who portrait/bottom anchoring, text-hugging compact Write
  passages, removed Write tagline, and 64px compact final padding.
- Round 71 removes the obsolete 16px internal top padding from each Write
  passage. Keep the title/body separation at 16px compact and 8px expanded,
  and keep compact passage-to-passage spacing at 32px.
- Cargo reload verification at 390px produced passage heights
  246/200/430/223/177px. At 1440px, passage tops are
  40/40/408/930/1248px. Both modes have zero page overflow.
- The complete stylesheet was deployed through `compose-css-bundle.sh` and
  reload-verified at 83,702 characters. Its token and site regions exactly
  match local FNV-1a checksums `a921cc79` and `f9adbbac`; all three
  Cargo-managed font blocks remain intact. Do not publish without a fresh
  explicit confirmation at the moment of Publish.

## Current handoff — Round 72 Figma copy-audit draft
- The published site remains the immutable Round 69 gold baseline. The active
  Cargo draft is now `responsive-65` on Home, Who, and Write, exactly twice per
  reload-persisted bodycopy with no `responsive-64`.
- Audited visible copy against Home desktop/mobile `83:251` / `11:31`, Who
  desktop/mobile `502:466` / `638:432`, and Write desktop/mobile `532:1208` /
  `640:448`. Approved changes: Touchbaes now reads `Book an appointment here`
  with only `here` linked to `https://www.touchbaes.ca`; Kelly's Kelly now reads
  `2025 – Graphic design • editorial`.
- Preserve the visible `eviive.ch` link. Ocean confirmed its omission from
  Figma was accidental. Who and Write require no copy changes. The extra mobile
  Figma `Clout fleeing` instance is accidental and must not be added to Cargo.
- The complete local token/site bundle was redeployed through the required
  four-region splice. Reload-persisted CSS is 83,619 characters; local token
  and site regions match exactly, the 6,283-character Cargo head and all three
  managed font blocks remain intact, no transfer residue exists, and braces
  balance 491/491.
- Reloaded Home preserves 13 native rivers, compact `pan-x pan-y`, both approved
  copy updates, the intentional EVIIVE URL, and zero compact/expanded overflow.
  Who and Write also retain zero overflow. Round 72 is draft-only; do not click
  Publish without fresh authorization.

## Current handoff — Round 73 WTW desktop-size draft
- Round 69 remains the immutable published gold baseline. The current Cargo
  draft is `responsive-66` on Home, Who, and Write, exactly twice per
  reload-persisted bodycopy with no `responsive-65`.
- The updated Figma final-WTW-video node `414:619` is 896×504px. Cargo
  `wtw-07` now uses that exact 16:9 geometry, filling the desktop river height;
  the 1920×1080 MP4, 1600×900 poster, `contain` fit, standard mobile profile,
  and bottom alignment are unchanged.
- Reloaded expanded Cargo scales the frame continuously from that Figma base
  and keeps its lower edge flush to the river. Reloaded compact Cargo keeps the
  exact 16:9 ratio, 13 native `pan-x pan-y` rivers, and zero page overflow.
  Who and Write also have zero overflow.
- The reload-persisted stylesheet is 83,618 characters. Its token and site
  regions exactly match local sources; the Cargo head and Mono/Sans/Gothic
  managed blocks remain intact, and braces balance 491/491.
- Desktop rivers have no conventional one-axis-mouse affordance: only native
  delta-X input such as a trackpad or horizontal/tilt wheel is dependable.
  Plain wheel remains vertical; Shift+wheel and automatic keyboard focus are
  browser-dependent; scrollbars are hidden and click-drag is not implemented.
  Preserve native overflow and never restore wheel interception or the rejected
  one-item stepper.
- Round 73 is draft-only. Do not click Publish without a fresh explicit
  confirmation at the moment of publication.

## Current handoff — Round 74 Touchbaes tweezer stacking draft
- The active Cargo draft is `responsive-67`; the published site remains the
  protected Round 69 gold baseline. Do not publish without a new explicit
  instruction at the moment of publication.
- Home's Touchbaes overlay is v3. Its `#mms-tw-rig` must be mounted inside the
  live `.mms` shell before every desktop placement. Keep the common stacking
  order band 10, rig 20, rail/panel 30 so a rightmost river scroll cannot paint
  the tweezer above the fixed left navigation.
- Keep the existing offset-parent-relative coordinates. They preserve the
  exact rig/game alignment after reparenting. Do not move the rig back to a
  body-level sibling or raise its z-index.
- Do not change compact suppression, stable game sizing, native horizontal
  overflow, vertical page scrolling, or desktop wheel behavior as part of this
  fix. The Round 69 gold files remain immutable.
- Home, Who, and Write reload with two `responsive-67` markers and no
  `responsive-66`; Cargo's stylesheet remains 83,618 characters with the head
  and all three managed font blocks intact. Maximum-scroll Cargo proof records
  a 10/20/30 band/rig/rail order and zero page-level overflow.

## Current handoff — Round 75 published desktop river scrubbers
- Round 75 is published on Home, Who, and Write at `responsive-68`. The
  protected Round 69 gold directory remains unchanged and continues to be the
  rollback reference.
- Home exposes 12 description-aligned scrubbers only in expanded fine-pointer
  mode. Random Pics has no control. At the 1440px Figma reference, EVIIVE's
  scrubber is 664×33px with an 84×8px minimum thumb; the invisible interaction
  target remains at least 44px. The new `col/1` token is 84px expanded and 45px
  compact.
- Keep the current behavior native-first: a scrubber may drive `scrollLeft`
  through track click, pointer drag, or keyboard input and reflect native river
  scrolling, but it must not intercept wheel input, snap, force one-item steps,
  animate scroll correction, or block vertical page scrolling. Compact and
  coarse-pointer scrubbers stay hidden.
- Keep `initRiverScrubbers()` idempotent and retain its deferred Cargo-hydration
  scans. Cargo's project bands can arrive after the first runtime pass; the
  current implementation reloads with exactly 12 controls and no duplicates.
- Reload-persisted Cargo CSS is 86,107 characters with the head and Mono/Sans/
  Gothic managed regions preserved and exact token/site parity. Its canonical
  local bundle is 78,442 bytes with SHA-256
  `76b10710b192bf2460158dc0e1af66fdaee709627ca2085009dc9836e48b5f59`.
  Independent public checks at 1440px and 390px found correct visibility,
  exact description alignment, 13 native rivers, current Who/Write pages, and
  zero page-level horizontal overflow. Cargo reported the site up to date at
  9:04am on 2026-07-20.

## Current handoff — Round 76 published scrubber media correction
- Round 76 is published on Home, Who, and Write at `responsive-70`, exactly
  twice per page with no `responsive-69`. Do not edit the protected Round 69
  gold baseline; it remains the rollback reference.
- The blank river frames were not missing assets. All 68 media IDs remain (38
  images, 27 videos, 3 iframes). Instant scrubber jumps could outrun the prior
  lazy/`IntersectionObserver` range.
- Preserve `prewarmRiverMedia()`: promote scrubber-band stills to eager and
  assign each deferred `data-poster` to its native video `poster`, while leaving
  heavy video and iframe sources deferred. Preserve the scrubber retry hook so
  late-hydrated Cargo `.mms-band` elements are also prewarmed.
- Preserve the visual correction: no pointer/programmatic focus outline or
  dotted frame, no transparent thumb halo, and a fully filled 12px
  theme-colored bar for keyboard `:focus-visible`.
- Reloaded Cargo Home has 68 media IDs, all 38 stills eager, 27 posters, 12
  visible expanded scrubbers, and zero overflow. At 390px scrubbers remain
  hidden, rivers retain native `pan-x pan-y`, and overflow remains zero. Public
  desktop Home confirms all 38 images have nonzero `naturalWidth`; public Home,
  Who, and Write all carry `responsive-70` with no previous marker.
- Reload-persisted Cargo CSS is 86,035 bytes, SHA-256
  `890ede0baedb6c6120129600c6420a76800cf2dc6a8ffbe5f81c8059d831b334`,
  with the Cargo head and all three managed font blocks preserved. Cargo Last
  Published is 10:11am on 2026-07-20.

## Current handoff — Round 77 published scrubber outline return
- Round 77 is published on Home, Who, and Write. All three stay on
  `responsive-70`; never edit the protected Round 69 gold baseline.
- Keep the desktop scrubber thumb filled only during fine-pointer hover or an
  active drag. Pointer exit must return it to an outline even when the control
  retains programmatic focus.
- Keyboard `:focus-visible` uses a 10px page-color thumb with a 2px theme-text
  border. The control itself remains outline-free, preserving the removal of
  the dotted river frame and transparent fill halo.
- The reload-persisted complete CSS is 86,130 bytes, SHA-256
  `ea17d30098b39cf22c4fd44be7df373f8415c4b7f370c287a7bae48080c1d703`,
  with Cargo's head and Mono/Sans/Gothic managed font blocks intact.
- Cargo draft and public interaction checks passed hover, drag, and pointer
  exit. At 390px all scrubbers stay hidden, rivers retain native `pan-x pan-y`,
  and page overflow is zero. Public Home, Who, and Write remain current with
  zero horizontal overflow. Cargo Last Published is 10:37am on 2026-07-20.

## Current handoff — Round 78 published Figma project-copy synchronization
- Round 78 is published. Home, Who, and Write remain on `responsive-70`, and
  the protected Round 69 gold baseline remains immutable.
- Home's project categories now follow the current Figma case. WTW's category
  is `Entertainment`, replacing `events`.
- The Figma-defined single-paragraph descriptions are now reflected in Cargo
  for V7, AnyDay, Kelly's Kelly, and Dead Good. Touchbaes remains two
  paragraphs because its booking call to action is intentionally separate; it
  now reads `Book a nail appointment here` with only `here` linked.
- This is a copy-only round. Preserve all Round 77 CSS, scrubber, media-prewarm,
  native-river, and runtime behavior. Local validation, Cargo reload
  persistence, compact and expanded checks, and independent public checks all
  passed with zero page-level horizontal overflow. Cargo Last Published is
  11:15am EDT on 2026-07-20.

## Current handoff — Round 79 published media-river restoration
- Round 79 is published. Home, Who, and Write remain on `responsive-70`; never
  edit the protected Round 69 gold baseline.
- Do not use Cargo Code View to replace a complete Home bodycopy. That path
  caused the published Round 78 page to retain only 55 media IDs by deleting
  the complete V7 and Touchbaes rivers. Always use the direct UTF-8
  `bodycopy.innerHTML` + `InputEvent` workflow and reload-probe exactly 68
  unique media IDs before publication.
- Round 79 restored all 68 canonical media IDs: V7 6/6, Touchbaes 7/7, 38
  images, 27 videos/posters, and 3 embeds. Cargo compact and expanded checks
  and independent public desktop verification all found zero page overflow.
- Preserve the Round 78 copy synchronization, including WTW `Entertainment`,
  project-category capitalization, the merged V7/AnyDay/Kelly's Kelly/Dead
  Good descriptions, and the separate Touchbaes booking line. Cargo Last
  Published is 2:05pm EDT on 2026-07-20.

## Current handoff — Round 80 published scrubber border normalization
- Round 80 is published. Home, Who, and Write remain on `responsive-70`; never
  edit the protected Round 69 gold baseline.
- The thicker post-drag scrubber border was retained `:focus-visible`, not a
  geometry error: pointer code focused the control, then mouse exit exposed the
  keyboard-only 10px/2px state. Canonical `panel.js` now blurs both pointer
  routes while preserving keyboard focus behavior.
- Cargo retained its older in-body script during publication, so the exact
  deployed `site-head.html` additionally carries one pointer-only scrubber blur
  listener. It is intentionally narrow and does not run for Tab or arrow-key
  input. Remove it only after a future published Home source is proven to carry
  the canonical `control.blur()` calls.
- Reloaded draft and independent public verification both measured the normal
  post-pointer thumb at 8px with a 1px border, no retained focus, 12 desktop
  scrubbers, 68/68 unique Home media items, and zero page overflow. Cargo Last
  Published is 2:40pm EDT on 2026-07-20.

## Current state — Round 81 whole-project audit branch
- Work is isolated on `round-81/audit-harness`. The immutable Phase 1 Round 80
  capture lives at `docs/audits/2026-07-20T175853-0400-round-80/` and was
  committed as `afc8b22`. Treat both it and `cargo/gold/round-69/` as read-only.
- Audit source and findings are committed at `c8ef564` and proposed through
  GitHub draft PR 3 against `round-81/audit-baseline`, not `main`.
- The checked-in `audit/` foundation inventories the system and 471 asset
  records, enforces JSON schemas with Ajv, and runs deterministic local,
  Cargo-snapshot, optional live-draft, and published browser targets. Its 240
  state product and 22-state pairwise matrix validate without configuration
  errors. `audit/scripts/validate-phase2.sh` is the aggregate local gate.
- Current WTW geometry is exactly 504×504 for `wtw-02`; 264 browser observations
  prove it square and free of ancestor clipping. Historical 765.2×765.2 rows are
  superseded only through the additive geometry record, never rewritten.
- Withered Green is an intentional Cargo-only motion exception. Keep exactly one
  direct `<span uses="eye-roll">` around each of its four body paragraphs and
  none on the heading. Figma shows only the static zero-degree endpoint. Do not
  classify this rotation as accidental motion or remove it during accessibility
  remediation.
- Phase 3 Figma and runtime findings are tracked under `audit/findings/` with
  hash-bound evidence. They are audit results, not authorization to change the
  palette, structure, interactions, assets, Cargo draft, or public site.
- `audit/findings/master-audit-report.md` consolidates the Phase 3 workstreams;
  `audit/findings/issue-registry.json` contains 44 deduplicated findings: 0 P0,
  16 P1, 24 P2, and 4 P3. Do not start remediation until Ocean approves a
  proposed batch. First proposed guard is a fail-closed deployment manifest;
  the current payload validator can accept missing `wtw-02` or a stale runtime.
- Fresh Home/Write/Who route runs at 390 and 1440px have zero fatal, non-200,
  page-overflow, state, or intentional-contract failures. Known detector hits
  include Random Pics clipping, accessibility issues, and expected aborted
  deferred media/PDF requests.
- No Cargo, Figma, Freight, or public mutation occurred in this audit batch.
  Preserve the user-owned untracked `cargo/home 3.html`, `cargo/who 3.html`, and
  `cargo/write 3.html` files.

## Current state — latest gold and deployment-completeness guard
- Ocean's current gold is `gold-2026-07-21-responsive-70`, representing the
  actual latest verified site rather than the older Round 80 capture. The local
  immutable snapshot is `cargo/gold/2026-07-21-responsive-70/` and records both
  canonical hashes and Cargo-serialized public hashes.
- Round 69 and Round 80 remain immutable historical references. Do not move,
  replace, edit, or retag them.
- The current gold includes WTW `wtw-02` at 504×504 and exactly four rotating
  Withered Green body paragraphs with a static heading.
- Audit PR 3 is merged. The first remediation branch is
  `agent/deployment-manifest`, based on merged commit `f650360`.
- `cargo/deployment-manifest.json` is now an explicit reviewed approval
  boundary for Ocean's site. `cargo/validate-deployment-manifest.py` checks the
  exact runtime/head markers, Home band/media order and counts, every media
  source identity, embed versions, WTW geometry, Who media, and Write inventory.
  The regular payload validator invokes it for bodycopy and head deployments.
- Never auto-regenerate the deployment manifest from current or deployed HTML.
  A damaged payload must fail instead of redefining the approved baseline.
- `audit/scripts/validate-phase2.sh` contains thirteen negative deployment fixtures
  plus the Withered Green fixtures. Run it and
  `bash cargo/assemble-test.sh canonical` before later remediation work.
- This first remediation did not change Cargo, Freight, Figma, or the public
  site and did not publish Cargo.
- The protected gold tag/release points to commit
  `07531485ca0ac4378fd3182ffa176ee6ccead7dd`. Draft PR 4 carries the guard from
  `agent/deployment-manifest` to `round-81/audit-baseline`.

## Current state — Round 82 single media playback owner
- The active cleanup branch is `round-82/media-playback-owner`, based on the
  merged latest-gold/deployment-guard baseline. It changes only
  `MMS-AUD-027` and is not deployed or published.
- The legacy `mms-video-autoplay` helper is removed from
  `cargo/home-extras.html` and generated Home mirrors. Do not restore any
  all-video selector, global interaction retry, or 2.5-second playback interval.
  `cargo/panel.js` owns deferred activation and visible/near playback.
- Run `python3 audit/scripts/validate-media-playback-owner.py`, then from
  `audit/harness` run `npm run media-owner-test` and
  `npm run gold-parity-test`. Gold must reproduce the old interval failure;
  the candidate must hold at loaded nearby attempts only after lifecycle
  events. The parity test covers all
  240 design states at compact and expanded widths plus exact masked
  screenshots, panel behavior, and native river movement.
- The ownership validator is part of `cargo/validate-cargo-payload.sh`, accepts
  the actual bodycopy being checked, and has a destructive stale-helper
  fixture. Do not reduce it to a local-source-only check. Browser gates use
  Playwright 1.61.1 and run inside the aggregate Phase 2 gate.
- The aggregate gate passes with the frozen Phase 1 hashes intact. Round 80's
  runtime-activated deferred `src` attributes are normalized only in memory;
  never weaken `cargo/validate-deployment-manifest.py` or edit the frozen
  capture.
- Before a Cargo deployment, verify muted inline visible/near autoplay on a
  physical iPhone Safari. Root-aware runtime teardown (`MMS-AUD-029`) is a
  separate next batch and must not be mixed into this one.

## Current state — Round 83 root-runtime teardown
- The active remediation branch is `round-83/root-runtime-teardown`, based on
  merged `round-81/audit-baseline`. It addresses only `MMS-AUD-029` plus the
  preservation-label correction explicitly requested by Ocean. It is not
  deployed or published.
- `cargo/panel.js` owns the shared root lifecycle through
  `window.__mmsRuntimeLifecycle`. `cargo/home-extras.html` registers the Home
  tweezer/game helper with the same owner registry. Never restore permanent
  one-shot root guards or unmanaged root-scoped listeners, timers, intervals,
  animation frames, observers, or media-query callbacks.
- The static gate is `audit/scripts/validate-root-runtime-owner.py`; the browser
  gate is `npm run runtime-root-test`. Compact and expanded each replace the
  complete root three times, then replace the dialog and Touchbaes river/iframe
  inside the same root. They require one current panel/Home owner, exact
  current-element rebinding, zero stale listeners, stable resources, zero
  errors/overflow, <=1px protected geometry drift, and intact
  panel/native-river behavior. Expanded also requires 12 visible scrubbers.
- The sole current preserve, parity, and default rollback baseline is
  `gold-2026-07-21-responsive-70`. Round 69 and Round 80 remain immutable
  historical checkpoints only. `cargo/validate-deployment-manifest.py` must
  reject every other `approved_baseline`, and `gold-parity-test.mjs` must verify
  the baseline identifier before comparison.
- `bash cargo/assemble-test.sh canonical` and
  `bash audit/scripts/validate-phase2.sh` pass in full. The latest-gold parity
  matrix passes all 240 states at compact and expanded references. No CSS,
  tokens, layout, media geometry/source, Figma, Cargo, Freight, or public-site
  mutation is part of this batch.

## Current state — Round 84 clean-gold Home source recovery
- The protected current gold remains `gold-2026-07-21-responsive-70`. Cargo
  Home was restored and published from its exact 125,651-byte bodycopy
  (SHA-256 `09555a6fe3ebaa54659057733d0f4bad4a5aaca7d9739f9853b7bfbfd3ff8c52`)
  after runtime-mutated media state was found in saved Cargo source.
- Complete Home replacements must use UTF-8-safe `bodycopy.innerHTML` plus
  `InputEvent`, Cmd+S, reload, and source-level verification. Never use Cargo
  Code View for the complete Home payload and never judge saved-source purity
  from the runtime-mutated preview DOM.
- The clean raw-source contract is 68/68 unique media IDs, two
  `responsive-70` markers, 0 live video/iframe sources, 0 readiness markers,
  0 native video posters, 0 hidden rivers, 1 eager image, 37 lazy images, and
  30 deferred `data-src` attributes.
- Round 83 is merged into `round-81/audit-baseline` at `9814a97`. Round 82/83
  remain GitHub remediation work and were not deployed by the Round 84 gold
  restore. Keep their later deployment and physical iPad verification
  separate.

## Current state — Round 85 fail-closed saved-source purity
- The active branch is `round-85/source-purity-guard`. Deployment manifest
  schema 2 now locks the clean saved-source state for Home, Who, and Write.
- Bodycopy must contain no live video/iframe/child-source URLs, native media
  posters, runtime loaded/ready/source markers, hidden rivers, or generated
  scrubbers. Image and iframe loading, video preload, deferred-source counts,
  and the sole eager Home image (`eviive-03`) must match the manifest exactly.
- Never validate saved-source purity from an activated preview DOM. Obtain the
  raw bodycopy, run `cargo/validate-cargo-payload.sh bodycopy`, then reload and
  repeat after every Cargo save. Do not weaken the manifest to accept runtime
  residue.
- `cargo/assemble-test.sh canonical` and `audit/scripts/validate-phase2.sh`
  pass, including 30 deployment negative fixtures and the complete browser
  parity/lifecycle suite. This round changes no Cargo page or visual output and
  must remain separate from the following swatch and iPad/Safari fixes.

## Current state — Round 86 circular swatch focus treatment
- Round 86 is published. Theme swatches suppress the rectangular dotted focus
  frame in both the expanded panel and compact portaled dialog. Pointer/touch
  activation applies the theme, releases focus, and keeps the panel open;
  keyboard focus remains visible as a solid circular page-color/ink ring on the
  swatch artwork.
- Do not reintroduce focus on the transparent button box or change target
  geometry to solve this treatment. `.mms-dot::before` owns the keyboard ring;
  the target cell remains structurally transparent.
- The Cargo CSS readback is exactly 86,761 UTF-8 bytes, SHA-256
  `77583f41c978f9dcae0549502b38e441e6b1243becb21f478437f3d0db620fa6`,
  with the Cargo head, all three managed font blocks, one token region, one
  layout region, and balanced 505/505 braces.
- Home, Who, and Write carry the new shared runtime and were persisted through
  the direct UTF-8-safe bodycopy/InputEvent workflow. Public checks pass with
  zero page overflow, 13 native Home rivers, 12 expanded scrubbers, and the
  protected Withered Green four-body/static-heading contract.
- The focused compact/expanded five-theme test, canonical assembly, and full
  Phase 2 gate pass. The sole current gold remains
  `gold-2026-07-21-responsive-70`; do not edit or regenerate it from the live
  runtime DOM. The next independent batch is iPad/Safari media readiness and
  coarse-pointer behavior.

## Current state — Round 87 hover-only swatch ring
- Round 87 is published and supersedes the Round 86 keyboard-ring decision.
  Theme swatches have no artwork border or ring at rest, on pointer/touch
  selection, or on keyboard focus. Only real fine-pointer hover draws the 1px
  circular artwork ring; pointer exit removes it immediately.
- Never restore a swatch `:focus-visible::before` ring or Cargo's dotted
  rectangular target outline. Keep the target cells and their compact/expanded
  geometry unchanged. Other controls retain their existing focus treatment.
- The published complete CSS is 86,459 UTF-8 bytes, SHA-256
  `2e7cd7798dcbea7ba222e967d6824507e8c4e7844903cf55e6fb69b170ea0bf9`,
  with Cargo's head, all three managed font blocks, and one token/layout region.
- Public verification passes: Home has 68/68 unique media IDs, 13 rivers, 12
  desktop scrubbers, square WTW geometry, and zero horizontal overflow; Who
  retains two videos; Write retains four rotating Withered Green body
  paragraphs and a static heading. The complete Phase 2 gate passes.
- The sole current gold is still `gold-2026-07-21-responsive-70`; it was not
  edited. Keep the next iPad/Safari media-readiness remediation separate.

## Current state — Round 88 gold swatch border with Arrow-only focus frame
- Round 88 is deployed to the Cargo draft and reload-verified; it is not
  published. The swatch artwork again has the protected gold's permanent 1px
  circular border in expanded and compact modes, with the existing fine-pointer
  hover halo unchanged.
- Keep the dotted target outline suppressed for load/autofocus, Tab-only and
  programmatic focus, pointer, and touch. Only an unmodified Arrow key on a
  focused swatch may set `data-mms-swatch-nav="arrow"`, move focus to the
  adjacent wrapping swatch, and expose the 1px dotted outline at 3px offset.
  Pointer/touch clears that mode. Do not restore Round 86's solid circular
  keyboard halo.
- The Arrow listener and transient attribute belong to the shared panel
  lifecycle. Any future panel-runtime edit must reassemble and deploy Home,
  Who, and Write together.
- Reloaded Cargo CSS is exactly 86,758 UTF-8 bytes, SHA-256
  `95c35fff5d9ec49bd3ea2f4c0878794918ad087b377c079bf3ac5de68075be4c`,
  with Cargo's head and all three managed font blocks preserved. Home, Who,
  and Write are reload-verified with their protected media and Withered Green
  contracts intact and zero page-level horizontal overflow.
- The focused compact/expanded test, canonical assembly, and complete Phase 2
  gate pass. The public site still serves Round 87 until Ocean explicitly
  authorizes a publish. `gold-2026-07-21-responsive-70` remains immutable.

## Current state — Round 89 Touchbaes iPad readiness
- The Touchbaes second asset now has a targeted manifest-safe readiness path:
  runtime-only 720px poster rendition, `preload="auto"` only after existing
  proximity activation, and one `loadeddata` play retry. Source identities,
  saved preload/poster attributes, media geometry, layout, and the protected
  gold remain unchanged. A video error keeps the poster visible.
- `npm run touchbaes-readiness-test` passes at 768x1024 and 1024x1366, and the
  complete Phase 2 gate passes. Physical iPad Safari remains the final decoder
  and autoplay proof.
- Cargo is reload-verified with the same Round 89 shared runtime on Home, Who,
  and Write, and it remains unpublished. Chrome's Home editor kept the direct
  channel blocked behind the paused V7 response, so the complete canonical Home
  was transferred through the authenticated in-app Cargo editor using direct
  `bodycopy.innerHTML` plus `InputEvent`, Cmd+S, and reload. Never replace Home
  through Code View.
- Cargo's raw saved Home record passes the schema-2 source-purity validator and
  retains 68 unique media IDs, seven Touchbaes items, no live source, no native
  poster, `preload="none"`, the original approved poster identity, zero page
  overflow, and protected 504x504 WTW geometry at 1440px. Physical iPad Safari
  remains the final Touchbaes decoder/autoplay proof.

## Current state — Round 91 Touchbaes parent message hardening
- Round 91 is a local/test-only repository batch on branch
  `round-91/touchbaes-message-hardening`; it has not been deployed to Cargo or
  published.
- The Touchbaes parent escaped rig is hardened for `MMS-AUD-033`: never assign
  child-supplied `data.html` to `innerHTML`. Keep using trusted local DOM
  construction from approved Freight tweezer/sticker URLs and bounded numeric
  placement/style values, then mount through `replaceChildren()`.
- Keep the existing child iframe v10 source unless a future batch explicitly
  creates and uploads a structured-message child. The parent can safely accept
  v10's legacy `html` field only because it is parsed as declarative data and
  not injected.
- Preserve the fallback lookup for `#mms-tw-rig`: the assembled marker is
  outside `.mms` before runtime mounting, so querying only inside `.mms` breaks
  desktop tweezer rendering.
- Zero and negative finite Touchbaes compact height messages are rejected
  before clamping. The focused embed harness covers valid rig construction,
  script/event/URL rejection, invalid coordinate hiding, height-message
  rejection, Montran readiness, and Montran turn locks.
- Verification passed: syntax checks, canonical assembly, focused
  `npm run embed-montran-test`, and the complete
  `bash audit/scripts/validate-phase2.sh`. The protected gold baseline remains
  `gold-2026-07-21-responsive-70` and was not edited.

## Current state — Round 92 active V7 and Montran source recovery
- Round 92 closes `MMS-AUD-034` in the repository only. It does not deploy or
  publish Cargo and does not change any approved visual or runtime behavior.
- The authoritative active V7 source is `work/v7-cup-src/`. Its builder must
  reproduce exactly 780,341 bytes and SHA-256
  `ee09e9c282d928f8968b91e1301bc0ba2639102a27c1bf1cd40483ab1b609d0a`.
  The older split V7 runtime was stale; do not substitute it.
- The authoritative active Montran source remains
  `work/montran-direct-pdf-v10-src/`, now recovered to exact v17 parity. Its
  builder must reproduce exactly 1,936,356 bytes and SHA-256
  `825cf2c3a1f130cb3445e62443985e845991204d19e0c2154cfd43a36126b49b`.
- `audit/contracts/active-embed-builds.json` and
  `audit/scripts/validate-embed-reproducibility.py` fail closed on missing or
  duplicate embed kinds, untracked or hash-drifted inputs, removed behavioral
  contracts, nondeterministic builds, and output divergence from frozen Round
  80 evidence. The check is mandatory in `validate-phase2.sh`.
- Focused exact-build and embed interaction checks pass, as does the complete
  Phase 2 gate. Keep `gold-2026-07-21-responsive-70` immutable. Handle Montran
  PDF allowlisting (`MMS-AUD-036`) and third-party notices (`MMS-AUD-039`) only
  in independent later batches.

## Current state — Round 93 V7 and Touchbaes protocol candidates
- The parent bridge uses exact derived child origins for V7 visibility and
  Touchbaes mode messages and includes `kind` plus `protocolVersion: 1`.
  Strict inbound versioning is enabled only by
  `data-embed-protocol="1"`; the current Home template deliberately does not
  opt in before successor Freight URLs exist. Only an absent attribute is
  legacy-compatible; a present empty, malformed, or unsupported value must
  fail closed.
- The internal owner versions are
  `responsive-70/root-lifecycle-2/embed-message-v1` for the shared panel and
  `tweezer-v3/root-lifecycle-2/embed-message-v1` for Home extras. Do not change
  the public `responsive-70` marker. Same-root reruns must tear down any exact
  lifecycle-1 owner before installing these owners.
- Preserve the active V7 recovery tree and Touchbaes v10 exactly. Hardened
  successors are isolated in `work/v7-cup-message-v1-src/` and
  `touchbaes-sticker-game-v11.html`. Their hashes and superseded identities are
  locked by `audit/contracts/embed-message-protocol-candidates.json` with
  activation state `prepared-not-active`.
- While the candidates remain prepared, the validator must prove that both
  canonical Home URLs and both deployment-manifest entries still identify the
  active legacy children and that neither iframe has `data-embed-protocol`.
  Any one-sided activation is a gate failure.
- Run `audit/scripts/validate-embed-message-protocol.py --self-test`, both
  embed browser tests, and the complete Phase 2 gate after any parent or child
  message change. Wrong source, origin, kind, version, or boolean type must
  have no effect; no candidate/parent postMessage target may be `"*"`.
- Any real activation is a separate atomic Freight plus Cargo batch. Upload
  both successors, update both immutable URLs and protocol attributes, update
  the deployment manifest, assemble, deploy, reload-verify, and only then
  promote the new active artifact contract. Do not deploy Round 93 piecemeal.

## Current state — Round 94 Montran PDF allowlist candidate
- `MMS-AUD-036` now has a separate tracked, deterministic v18 candidate in
  `work/montran-pdf-allowlist-v18-src/`; it is `prepared-not-active`. The live
  v17 source/artifact, Cargo Home URL, deployment manifest, gold tree, native
  rivers, and all visual geometry are unchanged.
- The candidate output is exactly 1,938,550 bytes with SHA-256
  `ca9ee9c69594af7c9e4a214f422413d00e43cbd5b493ec48f1f033295690e512`.
  It accepts only the exact approved Montran report URL or the same inlined
  no-parameter fallback, rejects duplicates and aliases before preload/network,
  rejects redirects, and sends no PDF Cookie or Referer.
- The frozen approved report identity is 13,634,937 bytes, SHA-256
  `664dab49810d21acaa0ffbb7d6749268215c1b655ccec11f461d67c147f02629`.
  Keep 256 KiB range loading and the existing full-fetch fallback. Artifact
  version 18 deliberately retains ready-message version 17.
- Run the dedicated candidate validator/self-test and actual-viewer browser
  test plus the full Phase 2 gate; all pass for Round 94. Never alter the
  recovered v17 tree or active
  contract to make the candidate pass. Promotion is a later atomic Freight and
  Cargo round with reload evidence; Round 94 itself is not deployed or
  published.

## Current state — Round 95 third-party runtime notice record
- `MMS-AUD-039` now has a tracked repository provenance and notice record in
  `THIRD_PARTY_NOTICES.md`. It covers exactly StPageFlip/page-flip 2.0.7 MIT,
  PDF.js/pdfjs-dist 6.1.200 Apache-2.0, and Three.js 0.160.0/r160 MIT, including
  complete upstream package license texts and exact vendored hashes.
- Keep `audit/contracts/third-party-runtime-notices.json` and
  `audit/scripts/validate-third-party-runtime-notices.py` in the full Phase 2
  gate. Any new `work/**/vendor/*` input must receive an explicit reviewed
  notice mapping; missing/truncated licenses, retained-banner drift, artifact
  identity drift, and removed/duplicated vendor payloads fail closed.
- Do not edit active or prepared embed bytes merely to insert a banner. Round
  95 preserves V7 active/prepared and Montran v17/v18 exactly, and the complete
  Phase 2 suite passes with protected visual and interaction contracts intact.
- This round is repo-only and not deployed or published. The sidecar does not
  retroactively accompany immutable Freight uploads; a future distributed
  successor must ship or accompany it through a separately versioned,
  reviewed promotion. `gold-2026-07-21-responsive-70` remains immutable.

## Current state — Round 96 Framer helper dependency advisory
- The private Framer helper is deterministic at exact `framer-api` 0.1.7 with
  exact `devalue` 5.8.2. Do not restore `latest`, loosen either pin, or move the
  serializer back into the `GHSA-77vg-94rm-hx3p` affected range (5.6.3–5.8.0).
- Preserve `audit/contracts/framer-helper-dependencies.json`,
  `audit/scripts/validate-framer-helper-dependencies.py`, and the full-gate
  invocation with isolated install, dynamic helper smoke, dependency-tree
  validation, and an online audit that requires zero findings at every
  severity. The contract, validator, config, smoke, and read-only sources must
  all remain Git-tracked.
- The smoke test must keep executing the real `index.mjs` and
  `read-design-system.mjs` against a throwing read-only Proxy and must prove
  exact read calls, output shape, missing-env refusal, failure cleanup, and
  disconnect. Static call scanning alone is not sufficient.
- No authenticated Framer credentials exist in this repository. Before the
  helper is used, complete its documented `npm ci --ignore-scripts`, smoke,
  audit, and credentialed `read:design` checks; keep `.env`, `node_modules`,
  and `design-system.json` untracked.
- Round 96 is tooling-only and was not deployed or published. All protected
  visual/runtime contracts and `gold-2026-07-21-responsive-70` remain
  unchanged; the complete Phase 2 gate passes.

## Current state — Round 97 iframe capability matrix
- `MMS-AUD-035` now has a repository-only `prepared-not-active` capability
  contract for V7, Touchbaes, and Montran. Canonical Cargo Home, the deployment
  manifest, active Freight URLs, visual geometry, and protected gold remain
  unchanged.
- The tested common policy is exactly `allow-scripts allow-same-origin`,
  `strict-origin`, no positive Permissions Policy delegation, and the finite
  deny list in `audit/contracts/iframe-capability-matrix.json`. Do not treat an
  empty `allow` attribute as deny-all; iframe syntax has no future-proof
  deny-all directive.
- Keep `validate-iframe-capability-matrix.py` and the browser
  `iframe-capability-test` in the complete Phase 2 gate. The static guard must
  continue rejecting extra powers, policy drift, candidate identity drift,
  missing proof requirements, proof-input digest or gate-wiring drift,
  untracked proof inputs, and partial Cargo/manifest activation. The browser
  proof must continue exercising the exact candidate builds, require zero
  allowed browser-supported Permissions Policy features, and retain the
  negative opaque-origin/referrer controls.
- Same-origin identity and an origin-only referrer are compatibility
  requirements for the current exact-origin child bootstrap, not optional
  permissions. They are safe as an isolation boundary only while the Cargo
  parent and Freight child remain cross-origin.
- Any real enforcement requires a separately reviewed atomic successor upload
  and Cargo promotion, reload verification, and desktop Safari plus physical
  iPhone/iPad Safari testing. Round 97 itself is not deployed or published.

## Current state — Round 98 public response-header policy
- `MMS-AUD-037` now has a repository-only, `prepared-not-active` response-layer
  contract. It does not activate a public header or authorize Cargo, Freight,
  DNS, edge, Figma, deployment, or publication changes. The protected gold
  baseline remains `gold-2026-07-21-responsive-70` and is untouched.
- Keep `audit/contracts/public-response-header-policy.json`,
  `audit/findings/evidence/2026-07-23-round98-public-response-headers.json`,
  and `audit/scripts/validate-public-response-header-policy.py` in the complete
  Phase 2 gate. The validator rejects fake meta policies, false Cargo support
  claims, premature activation, missing route/evidence coverage, Freight scope
  confusion, unsafe CSP widening, skipped report-only discovery, and premature
  HSTS expansion.
- Cargo has no documented self-service response-header setting in the reviewed
  official documentation. This is `not-documented`, not proof of platform
  impossibility. Saved Custom HTML is body-level in the frozen output and must
  never be treated as response-header delivery. CSP Report-Only,
  frame-ancestors, top-level Permissions Policy, nosniff, frame protection,
  and HSTS cannot be closed by adding `http-equiv` markup.
- The header owner, privacy-reviewed reporting endpoint, exact CSP, and Cargo
  editor/preview frame decision intentionally remain unset. Promotion requires
  support-confirmed Cargo control or separately approved edge ownership,
  report-only discovery, clean compact/expanded and physical-device evidence,
  editor/preview compatibility, transport/host audit, rollback, persistence,
  and fresh public response proof.
- Freight is a separate response owner. Never claim a first-party edge changes
  Freight headers. Keep Round 97's prepared iframe policy as the child
  containment path, and do not deploy either prepared security round without
  its separate atomic promotion evidence and explicit authorization.
- Focused verification passes 29 destructive fixtures. The complete Phase 2
  gate passes with 122/122 frozen hashes, both 240-state visual matrices,
  native rivers, WTW, Withered Green, Touchbaes/iPad, Montran, embed-policy,
  source-purity, lifecycle, and deployment-negative contracts unchanged.

## Current state — Round 99 low-collection privacy inventory
- The repository-only inventory for `MMS-AUD-040` is
  `docs/PRIVACY-DATA-INVENTORY.md`, backed by
  `audit/contracts/low-collection-privacy.json` and dated live/source evidence.
  It is not a public policy, Cargo page, legal determination, or publication
  authorization.
- The exact first-party storage contract is four optional local appearance
  keys (`mms-theme`, `mms-face`, `mms-scale`, `mms-shape`) and one tab-session
  startup key (`mms-render-sequence`). Any new key, cookie, analytics/tracker,
  beacon, form, authentication path, storage transmission, deployable bodycopy
  resource, CSS URL/import, or runtime service must fail closed until the
  inventory is deliberately updated.
- The sampled runtime origins are MM.S, Cargo build/static/type, Freight, and
  Google Fonts. Qualify all negative statements to the audited source and
  dated evidence; provider access logs, retention, downstream processing, and
  physical Safari were not audited.
- Keep `validate-low-collection-privacy.py --self-test` mandatory in Phase 2.
  A public disclosure requires separate approved copy, legal review where
  appropriate, visual placement, Cargo draft deployment, reload verification,
  and explicit publication authorization. Round 99 itself changes no Cargo,
  Freight, Figma, deployment manifest, public state, or protected gold source.

## Current state — Round 100 native-river ARIA source purity
- `MMS-AUD-003` is closed at the repository boundary without a production
  runtime or visual change. Frozen Round 80 saved source and its HTTP response
  both contain 12 native rivers with `hidden` and `aria-valuenow`; fresh
  instrumented public Chromium recorded no current runtime write to an exact
  `.mms-river`. The generated sibling scrubbers remain the only owners of
  scrollbar state.
- Keep `native_rivers` and `invalid_river_scrollbar_semantics` in every active
  deployment-manifest page source-purity object and keep the exact-class-token
  parser plus duplicate-attribute rejection in
  `validate-deployment-manifest.py`. These checks are independent of
  `hidden_rivers`, so class loss, parser ambiguity, or any reviewed scrollbar
  semantic on a native river cannot pass.
- Preserve `audit/contracts/river-aria-source-purity.json`, the dated
  root-cause evidence, the `river-aria-test` npm entrypoint, and its one Phase
  2 invocation. The browser negative control must retain all 12 frozen
  contaminants and reproduce 12 Axe `aria-allowed-attr` nodes; clean compact
  and expanded source must retain zero.
- Native rivers remain unmodified scrolling elements. The 12 sibling desktop
  scrubbers keep their scrollbar role/value semantics, compact rivers keep
  real `pan-x pan-y`, expanded horizontal wheel input keeps moving the river,
  and page overflow stays zero. Do not replace this source guard with a live
  cleanup observer.
- Round 100 changes no Cargo HTML/CSS/runtime/bodycopy, Freight, Figma, public
  state, or protected gold file. Nothing is deployed or published.
- The focused river-ARIA contract and complete Phase 2 suite pass, including
  both 240-state gold matrices and all protected interaction/lifecycle gates.

## Current state — Round 101 document language
- The repository implementation for `MMS-AUD-004` declares exact root language
  `en` without changing visual geometry. The site head owns the earliest
  assignment before route gating; the shared body initializer reasserts it
  before its duplicate-execution guard; standalone mirrors also carry literal
  `lang="en"`.
- Preserve exactly one narrower `lang="yue-Hant"` paragraph override in every
  Write source. Never move document-language cleanup into the `.mms` runtime
  teardown because the document root is outside that replaceable lifecycle.
- Keep `audit/contracts/document-language.json`, its dated root-cause evidence,
  the focused browser test, deployment-manifest language guard, and single
  Phase 2 invocation. The browser proof must continue covering Home, Who, and
  Write at 390x844 and 1440x900, all seven head route forms, body-only and
  repeated initialization, and zero failures in the three root-language Axe
  rules.
- This round regenerated canonical bodycopies and mirrors and refreshed only
  the affected Round 99 privacy source identities. It did not change privacy
  behavior, CSS, panel logic, media, native rivers, WTW, Withered Green,
  Freight, Figma, Cargo draft/public state, or protected gold evidence.
- Nothing is deployed or published. Live Cargo/public language verification
  remains a separate promotion gate after an explicitly authorized save and
  reload.

## Current state — Round 102 primary navigation
- The shared compact and expanded primary link groups are exact `nav`
  landmarks named `Primary`. The expanded `.mms-rail` must never return to an
  aside/complementary landmark, and both responsive candidates must retain
  their names even though CSS exposes only one at a time.
- Preserve the class-based geometry and interaction implementation. This is a
  semantic-only fix: do not change rail padding, sticky placement, navigation
  link order, native rivers, media, WTW, Withered Green, panel behavior, or
  protected gold as part of this contract.
- Keep the seven primary-navigation source-purity counters in every deployment
  manifest page and retain all twenty destructive deployment fixtures. Missing
  or incorrect labels, a legacy aside, class transfer, or duplicate candidate
  must fail closed before Cargo.
- Keep `audit/contracts/primary-navigation-landmark.json`, the dated evidence,
  `primary-navigation-landmark-test.mjs`, its npm script, and exactly one Phase
  2 invocation. The focused matrix spans Home/Who/Write at 390, 1023, 1024,
  and 1440 pixels and pins both accessibility and geometry.
- Round 102 is repository-only. It regenerated bodycopies and mirrors and
  refreshed only their Round 99 privacy identities; it did not deploy or
  publish Cargo or change Figma, Freight, public state, or gold evidence.

## Current state — Round 103 EVIIVE final-pair geometry
- Protected responsive-70 gold contains a latent EVIIVE final-pair mismatch:
  `eviive-05` is 558x372 but `eviive-06` is 670x377.593. Do not treat that
  specific frozen value as design authority.
- The independent Figma-derived Round 13 contract is authoritative:
  `eviive-05` stays 558x372 with `contain`; `eviive-06` stays 670x372 with
  `cover` at 1024px and above. Below 1024px, preserve the compact CSS override
  at 377.593 with `contain`; compact geometry and native river behavior remain
  unchanged.
- Preserve the deployment-manifest geometry and fit assertions, both negative
  fixtures, the additive post-baseline supersession, dated root-cause
  evidence, and `eviive-final-pair-geometry-test.mjs`. The focused browser
  matrix must keep equal top, height, and bottom within 0.25px at 1024, 1440,
  1920, and 2940px and no drift from untouched gold at 320, 390, 430, 768,
  and 1023px.
- Round 99 privacy source identities for the canonical Home template and
  generated bodycopy plus site CSS reflect this geometry-only change. Privacy
  behavior and conclusions remain unchanged.
- The focused test and complete Phase 2 gate pass with 122/122 frozen hashes,
  all 480 protected visual states, 75 deployment-negative fixtures, and every
  native-river, WTW, Withered Green, embed, iPad, and lifecycle contract
  intact.
- Protected gold and frozen Round 69/Round 80 files remain immutable. The
  supersession is applied only in memory for parity. This repository-only
  round changes no Cargo, Freight, Figma, public site, or publication state.

## Current state — Round 104 Touchbaes visible-tweezer lifecycle
- The current repository lifecycle-2 Home owner is the approved implementation:
  it owns the live `.mms` root, `#mms-tw-rig`, Touchbaes iframe, and Touchbaes
  river after Cargo root replacement. Do not revert it to the protected
  lifecycle-1 one-shot overlay.
- The mandatory `runtime-root-test` now composes lifecycle replacement with
  visible rig behavior. Exact-origin legacy v10 current-frame `rest` and
  `move` messages must display one connected three-layer trusted rig after
  expanded full-root replacement and expanded same-root river/frame
  replacement. Detached old-frame messages must have no effect, and compact
  current-frame messages must leave the desktop rig hidden.
- Preserve the existing current-owner identity, teardown, resource, panel,
  layout, zero-overflow, scrubber, native-river, and same-root version-upgrade
  assertions around that new proof. The dated root-cause evidence is
  `audit/findings/evidence/2026-07-23-round104-touchbaes-visible-rig-root-cause.json`.
- This round changes no Cargo/runtime implementation, CSS, bodycopy, mirror,
  manifest, protocol, media, Figma, Freight, public site, or protected gold.
  Do not invent a new visual or coordinate correction unless a later isolated
  failure independently proves one.
- Focused and complete Phase 2 verification pass. The repository test covers
  deterministic Chromium parent lifecycle; live Freight timing and physical
  Safari remain promotion checks. No deployment or publication occurred.

## Current state — Round 105 portfolio content semantics
- The repository implementation for `MMS-AUD-007` explicitly classifies
  non-interactive portfolio/profile media as decorative because adjacent copy
  carries the meaning. Preserve exact decorative ownership on all 65 Home
  native-media owners and both Who profile-video owners with
  `data-a11y-policy="decorative"` and `aria-hidden="true"`; all 38 decorative
  Home images retain exact empty alternatives.
- Preserve the three interactive Home embeds with exact stable titles:
  `V7 rotating coffee cup`, `touchbaes sticker game`, and
  `Montran sustainability report booklet`. They must remain outside the
  decorative inventory and visible to the accessibility tree.
- Preserve the twelve existing project figure names and their source order:
  EVIIVE, V7 Labs, touchbaes, Mandy Ma & Co., Loop Financial, Montran, AnyDay
  Financial, Kelly’s Kelly, Curate Health, PURE LOVE（純愛）, Dead Good, and
  WTW? (What’s the Word?). Random Pics remains an unlabeled interlude and no
  Home heading is added; broader heading hierarchy stays with `MMS-AUD-022`.
- Keep the exact fail-closed deployment-manifest inventory and destructive
  fixtures, `audit/contracts/portfolio-media-accessibility.json`, the dated
  root-cause evidence, the focused Chromium test, its npm entrypoint, and one
  Phase 2 invocation. The browser contract covers 390x844 and 1440x900 with
  forced media failure and rejects unstable fallback names.
- This is a semantic-only repository round. Do not change CSS, runtime,
  visible copy, layout/media geometry, media URLs, native rivers, panel
  behavior, WTW, Withered Green, Touchbaes, Montran, protected gold, Cargo,
  Freight, Figma, deployment, or publication as part of this contract.
- Focused and complete Phase 2 verification pass. The complete gate preserves
  the frozen 122-artifact baseline, 480 protected compact/expanded states and
  interactions, native rivers, WTW, Withered Green, EVIIVE final-pair
  geometry, Touchbaes readiness and visible-rig lifecycle, Montran range
  rendering and page turns, root replacement, and zero page overflow.
- The audit-only iframe proof now avoids two input-scheduling races without
  changing any product source: Touchbaes uses a current main-frame sticker
  box after layout settlement, and Montran is scrolled into view before its
  unchanged 30-second raster assertion. Keep the corresponding proof-input
  hash pinned in `iframe-capability-matrix.json`.

## Current state — Round 106 reduced-motion preference path
- `MMS-AUD-008` is only partially implemented. The repository now honors the
  operating-system Reduce Motion preference without changing the approved
  normal UI; a visible visitor pause control remains design-gated.
- Normal mode must retain one intro smiley at `animate="4"`, exactly four
  Withered Green `eye-roll` hooks, 29 looping videos, three GIF loops, V7,
  Touchbaes, Montran, and the four 375ms startup cuts.
- Reduced mode keeps videos and V7 on approved static imagery, freezes the
  three explicit GIF loops in their existing frames, suppresses only the
  smiley/Withered continuous effects, and pauses loaded owned motion when the
  document is hidden. Live preference changes restore only observer-active
  media.
- Preserve WeakMap runtime ownership; do not serialize active/frozen state
  into Cargo bodycopy. Keep the mandatory `reduced-motion-test` and its single
  Phase 2 invocation.
- Focused and complete Phase 2 verification pass without changing protected
  gold. Cargo may receive only a complete draft review deployment with reload
  verification; publication remains prohibited.

### Cargo review interruption
- Commit `aa1a8dbf5ae864b4fe1a30e90a031e3a14e652fd` and draft PR 25 are the
  atomic repository checkpoint. Full Phase 2 passes.
- The Cargo draft currently has the complete CSS bundle, site head, and saved
  Home bodycopy. Home was reloaded, but the browser connection failed before
  its mandatory post-reload raw-source extraction. Who and Write have not been
  promoted.
- Treat Cargo as a partial review deployment and do not publish. Resume from
  Home raw-source verification, then deploy Who and Write with the normal
  UTF-8-safe save/reload checks.

### Cargo draft review completed
- Round 106 is fully installed in the Cargo draft: complete CSS, site head,
  Home, Who, and Write.
- Every persisted payload was extracted after reload and passed its
  fail-closed validator. Compact/expanded probes preserved the approved
  interface and zero page-level horizontal overflow, and the complete Phase 2
  gate passed again.
- This is a draft review state only. Do not publish without Ocean's explicit
  authorization.
