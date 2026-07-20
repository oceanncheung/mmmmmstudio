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
    one). ~one script; ask Codex to "sync color pairings". **Panel dots = radio
    controller** (color-theme/*-state vars bound to State props; ONE reaction
    each: 5 radio sets + SET_VARIABLE_MODE Color). **Literal-era fills were
    audited + bound** for theming: desc-master texts, intro texts, slider
    a-glyphs (all 4 variants), root bg, nav mask — all on text/primary /
    bg/page now. Panels NOT color-pinned (deliberate: the inverted-panel look
    was good in the earlier Black demo); Type-Scale pin stays. Transparent
    bands + themed root = the whole page re-colors from one dot click.
  - **Typeface** (4 modes): Serif="Tinos" (TNR twin) · Sans="Inter" ·
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
  **FLIP IS LIVE (Ocean, 2026-07-05 PM): Typeface Serif mode = "Times New
  Roman"** — the file renders true TNR in desktop. Automation constraint
  ACTIVE: cloud `use_figma` cannot author/edit/style/REPARENT any text-bearing
  node (even appendChild throws). For automated text/structure sessions: flip
  Serif → "Tinos" in desktop (Variables → Typeface → font/family), work, flip
  back. Vector-only nodes (icons, swatches, shapes) stay automatable anytime.
- **Components page reorg (2026-07-05 PM, IN PROGRESS):** sections created —
  icons / atoms / molecules / panels (2 options) / sheets (2 options); header
  + expansion rules annotated (literal-Tinos page chrome); Check Icon deleted
  (0 uses); text-free components placed (3 icons + Corner Radius, Swatch,
  Image Shape Option, Image Shape). **PENDING the next Tinos flip:** move
  Link, Timestamp, Nav, Slider, Buttons, both Panels, both Sheets into their
  sections. ALSO NOTE: Ocean's canvas now uses the OPTION 2 family everywhere
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

## Gotchas
- Figma cloud connector has **no Times New Roman / Times / Georgia** — Tinos is
  the loadable stand-in (verified via `listAvailableFontsAsync`, 2026-07-05).
- Figma variable scope enum is `WIDTH_HEIGHT` (not `WIDTH_AND_HEIGHT`).
- **Concurrent editing collides (observed 2026-07-05):** Ocean edits the file
  live in desktop while Codex scripts run. Casualties that session: sheet
  title text overwritten, serif/sans/mono label overrides wiped (both
  restored). Ocean also added an `Icon#1:0` boolean + hidden "Corner Radius"
  instance to the `Button` master — HIS edit, kept. When automating: re-inspect
  before mutating nodes touched earlier; treat unexpected diffs as human edits,
  not script bugs — repair content, never revert the human's structural changes
  without asking.
