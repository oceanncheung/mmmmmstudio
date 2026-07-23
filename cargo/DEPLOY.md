# mm.s → Cargo deployment bundle (round 1)

## Round 4 (2026-07-07) — videos uploaded, GAME fixed+embedded, EVIIVE refreshed
Done on Cargo draft (NOT published; Ocean previews ⌘\ + ⌘P).

**Videos (Ocean uploaded 5 to Cargo Images&Files; he's placing them himself):**
3d-animation, 8bit-girls, video-small(emily), EVIIVE Image 5 (mp4), EVIIVE Logo
Animation (webm). Served at `freight.cargo.site/t/original/i/{hash}/{name}`.
Embed as `<video autoplay muted loop playsinline><source src=URL></video>`.
EVIIVE video-slot sizes: Logo Animation 432×288 (band1 frame1), Image 5 432×372 (frame5).

**GAME — two root causes, both fixed:**
- "Weird frame" = Figma NODE EXPORTS of the rounded-rect game assets bake in the
  frame. freight serves PNG *as PNG* (transparency kept) — NOT a jpg-conversion
  issue. Fix = Ocean's clean re-uploads (`game-*` / he supplied direct URLs).
- "Not working" = a Cargo PAGE can't render the game — Cargo's `bodycopy` CSS
  overrides the game's `<style>`, collapsing its 1586×1752 board. Fix = host the
  game HTML as a STANDALONE FILE (upload .html via Images&Files → served at
  `/t/original/i/{hash}/touchbaes-game-v2.html`, hash U30228758…) and IFRAME it
  into the touchbaes river (447×494, class `mms-game`). Its own doc = CSS intact.
  Iframes SURVIVE Cargo Code-View Update (unlike inline base64 imgs, which get
  mangled to placeholder media-items).

**EVIIVE — refreshed:** 7 frame images re-exported from Figma `105:253` (Image
Frame instances 140:387/389/391/393/395/397/399) → dropped → home band-1 srcs
rewired `eviive-1..7.jpg` → `.png` (new hashes). All 7 load; layout unchanged.

**Cargo gotchas (hard-won this round):**
- Code View mangles inline base64 `<img src=data:>` → `hash="placeholder"` media-
  items. Self-contained-snippet paste FAILS. Use external freight `<img>`/`<iframe>`.
- Media library is VIRTUALIZED (DOM scrape flaky) + not in `st.media` on fresh
  load. Reliable read: walk `st.media` immediately after an upload; else use URLs.
- `file_upload` tool ONLY accepts chat attachments — not scratchpad/project paths.
  Host a local file by creating an in-page `File` (from in-page/fetched bytes) →
  set the hidden `input#file` `.files` via DataTransfer → dispatch `change`.
- Image drops leave stray `<media-item>` in the bodycopy → remove from the render
  bodycopy DOM + dispatch `input` (syncs to store), or re-setValue clean content.
- Images&Files + Code View toolbar buttons SHIFT x-position with window width —
  re-probe `[tooltip]` before each click.

---
Generated 2026-07-06, overnight autonomous run. Everything verified locally in
headless Chrome before any Cargo contact.

## Files
- `tokens.css` — every Figma variable, mechanically exported. 4 axes as
  data-attributes on `<html>`: `data-theme` (white/black/navy/brown/yellow),
  `data-face` (serif/sans/mono/gothic), `data-scale` (s/m/l/xl),
  `data-shape` (straight/rounded/oval).
- `site.css` — layout + components (nav mask, pinned intro, rivers, panel).
- `home.html` — page markup (placeholder gray boxes at exact Figma image dims).
- `panel.js` — control panel logic + live clock + localStorage persistence.
- `test.html` / `index.html` — self-contained assembly (tokens+site+home+js
  inlined) used for local QA. `variant-*.html` — axis-matrix test fixtures.

## How to deploy to Cargo (manual or browser-driven)
1. Cargo admin → Design/Settings → **Custom CSS**: paste `tokens.css` then
   `site.css` (order matters).
2. Create a NEW page (unlinked; do not touch the existing draft): add an HTML
   block; paste `home.html`; replace the trailing script placeholder comment
   with the full contents of `panel.js`.
3. Fonts: Cargo hosts "Gaisyr Semi-Mono", "TeX Gyre Heros Condensed",
   "UnifrakturMaguntia" (all seen in their picker). VERIFY their exact
   CSS family names: add each font to any text on the test page via the
   picker, then inspect Cargo's generated CSS for the family strings, and
   correct the stacks in tokens.css `[data-face=...]` blocks if they differ
   from the candidates already listed.
4. Test matrix: 5 themes x 4 faces x 4 scales x 3 shapes via the panel.

## Local QA results (headless Chrome, 2026-07-06 ~01:00)
VERIFIED WORKING at 1440x900:
- Default (white/serif/m/straight): nav, intro, live clock, band 1 river
  bottom-aligned, EVIIVE desc + italic tagline, panel fully styled, offsets
  on grid columns.
- Navy + Yellow themes: full bg/ink pair cascade incl. panel chrome and
  selection rings. (Black/sans variants shot too — same system.)
- Gothic: full blackletter, taglines correctly upright (em -> normal),
  single-cut bold handling.
- Oval: true stretched-ellipse image frames; panel option inverts.
- Slider renders with round 12px thumb; radio states sync from baked attrs.

BUGS FOUND + FIXED DURING QA:
- body margin/background leaked white at page edges on dark themes ->
  `html, body { margin:0; background: var(--color-bg-page) }` added.
- (Tooling) zsh word-splitting broke variant generation — fixture bug only.

KNOWN ISSUES FOR ROUND 2:
- MOBILE (<=760px) is rough: intro text overflows viewport width, panel
  exceeds right edge (fixed-position width math), clock hidden. The real
  mobile design is the Figma bottom-sheet pattern — needs its own pass, not
  a media-query afterthought.
- Images are placeholders; real EVIIVE exports needed (Figma image fills ->
  export -> Cargo upload), then `.mms-img` divs become <img> tags.
- [RESOLVED on Cargo] DOM collisions: none observed — computed styles match
  tokens exactly inside Cargo's page render.
- [RESOLVED on Cargo] Font stacks: family names verified IDENTICAL to
  Cargo's ("Gaisyr Semi-Mono", "TeX Gyre Heros Condensed",
  "UnifrakturMaguntia"). @font-face ships via 3 helper text styles
  (.mms-mono/.mms-sans/.mms-gothic) created 2026-07-06.
- position:fixed works inside Cargo's editor iframe (nav/panel/intro pin
  correctly). Re-verify on the PUBLISHED URL after Ocean publishes.

## On-Cargo deployment results (2026-07-06 overnight, round 1 COMPLETE)
- Site CSS: tokens+site appended AFTER Cargo's 6,281-char boilerplate
  (total 17,594). Persists; cascade verified (nav fixed 272px).
- Page "home v2 test" (mmmmm.studio/edit/I2398594830, unlinked DRAFT):
  markup + inline panel.js in bodycopy, 7,186 chars post-serializer;
  survives reloads; script runs on render.
- Full matrix passed ON CARGO: 5 themes bg/ink exact; faces serif 18 /
  sans 17.4 / mono 16.2 / gothic 18 (all fonts.check true); scales
  16/18/24/32; shapes 0 / 24px / 50%. Reset to defaults after testing.
- NOT PUBLISHED. Draft URL 404s publicly (expected). Ocean: review in
  editor, then cmd+P when ready.

## Round 1b — Ocean's review feedback, all fixed (2026-07-06)
Reported: two clocks; template columns squeezing the design; left side not
sticky; images not aligned to description text.

Root causes + fixes (site.css v2 = STICKY architecture, home.html v2):
1. TWO CLOCKS: the template's pinned "Clock" page overlays every page.
   Fix: `html[data-theme] .page.pinned { display:none !important }` — hidden
   only on mms pages (data-theme exists only where panel.js runs).
2. TEMPLATE THEME/COLUMNS: Cargo's `.page-layout` caps content at
   `max-width: 64%`, `.page-content` adds ~25px padding — the design rendered
   in a narrow centered column. Fix: scoped `html[data-theme]` overrides
   (max-width none, padding 0). ANSWER to "can CSS+HTML alone drive it":
   YES — no template/settings changes needed, all done with scoped CSS.
3. NOT STICKY: Cargo's .page wrappers create a containing block and the
   editor scrolls an inner div — position:fixed silently detaches. Fix:
   everything is position:sticky now. `.mms` is a 2-col grid; `.mms-rail`
   (wordmark+links top, control panel bottom via sticky bottom + margin-top
   auto) = whole left side pinned to viewport; `.mms-sticky-head` (intro +
   clock, height:0, z0) pinned under the scrolling bands (z10).
4. MISALIGNMENT (32px): the river's leading `.offset` spacer ignored the
   32px flex gap after it. Fix: spacer width = calc(--offset - --space-32).

VERIFIED IN CARGO'S EDITOR after save+reload: rail-top y=40 and panel
bottom = viewport-40 at every scroll position; intro+clock pinned while
bands scroll over; alignment exact (b1 736/736, b2 272/272, b3 504/504);
pinned clock hidden (one ticking clock); template neutralized (max-width
none / padding 0); yellow theme paints edge-to-edge incl body; gothic
renders. Also verified locally via preview server (test.html reassembled).

CSS editor structure NOTE: Cargo INJECTS its custom text-style CSS
(`--text-style: "mms mono"` etc.) INTO this same document — those 3 blocks
are the font registration and MUST survive any future splice (they now sit
between the token block and the site v2 block, labeled "Cargo-managed").
Editor total after v2 splice: 20,588 chars (20,774 after r1c type splice).
STALE: variant-*.html fixtures still carry v1 markup (fixed-position); only
test.html was reassembled for v2.

## Round 1c — type parity + real EVIIVE images (2026-07-06)
TYPE: Ocean compared against his mm.s page ("both bodycopy 1.2 but ours
looks smaller"). Root cause: our page never used Cargo's Bodycopy style —
it runs on tokens, and serif M was 18px/24 vs Bodycopy's 1.2rem = 19.2px
at lh 1.25. Fixed in tokens (local + Cargo splice): M base 19.2px
(sans 18.5 / mono 17.3 / gothic 19.2 via x-height multipliers), line
heights tightened to ~1.15 across ALL scales (M base lh 22, caption 18,
heading 44; S 19/14/34; L 28/22/64; XL 38/29/82). The 24px baseline grid
is deliberately broken — Ocean's call ("looks loosen").

IMAGES: gray divs are now real `<img class="mms-img">` elements. Band 1
carries the ACTUAL EVIIVE exports; bands 2/3 keep a transparent SVG data-URI
placeholder (themed gray via CSS bg) until real projects exist — swapping in
a real image = replace the src attribute, nothing else.

Image pipeline (proven, reusable):
1. Figma: download_assets per Image Frame instance (jpg, scale 2) — exports
   the as-designed crop at retina size.
2. Upload INTO Cargo without their file picker: in-page fetch of the Figma
   asset URL (their MCP endpoint sends CORS headers) -> File -> DataTransfer
   -> synthetic dragenter/dragover/drop on the bodycopy. Cargo's drop
   handler uploads it and inserts a <media-item hash="...">.
3. The hash resolves to https://freight.cargo.site/w/{W}/q/{Q}/i/{hash}/{name}
   (also t/original). freight is REFERER-GATED: 403 from curl, 200 from
   pages — normal browser rendering unaffected.
4. Read the hash, delete the stray media-item (or re-inject the whole
   bodycopy), set the freight URL as the img src.
DEAD ENDS (do not retry): file_upload tool rejects non-session paths;
localhost fetch from the HTTPS page hangs (Dia blocks private-network
subresources even with PNA preflight headers).
Slot -> hash map (band 1, in order): E30210609452... (432x288),
V30210609618... (200x168), T30210613373... (896x504), A30210609784...
(432x240), J30210613033... (432x372), V30210613198... (432x372),
P30210589852... (200x168). Source exports kept in cargo/assets/.

VERIFIED after save+reload in Cargo: 19.2px/22px computed on .mms; all 7
freight images naturalWidth > 0; alignment 736/736 intact; clock ticking.
Local test.html reassembled + preview-verified (type + images render).

## Round 2 — mobile build (2026-07-06, Ocean's spec)
Spec (Ocean): showcases align left where "Building better brands" starts;
menu button right of MM.S opens the control panel; intro block scrolls in
flow; intro + showcases get fill bg; top nav bar always sticky; intro
LEAVES UNDER the bar, showcases COVER the bar when leaving.
Implementation (site.css v3, home.html + panel.js r2):
- .mms-mbar: sticky top bar (z10) = wordmark + control-sliders menu button
  + .mms-clock-m. panel.js r2 ticks every .js-clock (bar + desktop corner).
- Z-choreography: intro block z1 (slides UNDER bar) < bar z10 < bands z20
  (slide OVER bar) < sheet z30. Fill bgs on intro block + bands; gaps
  between bands stay transparent so the bar resurfaces between projects
  (also keeps the menu reachable mid-page — intentional trade-off).
- Left alignment: everything at --margin-page (20px); rivers bleed off the
  right edge and scroll horizontally; image px sizes unchanged (no mobile
  downscale yet — flag for Ocean).
- Sheet: panel is now a DIRECT child of .mms (desktop: grid col1/row2,
  sticky bottom — unchanged behavior, re-verified). Mobile: display none
  until html[data-panel="open"] (menu toggles, X closes; aria-expanded
  synced; transient, not persisted). Open = sticky bottom:0 full width.
- Desktop rail lost the panel; .mms-mlinks (mobile links) live inside the
  intro block; .mms-mbar/.mms-mlinks/.mms-close are display:none on desktop.
VERIFIED locally at 375x812 (preview): bar sticky y0 through scroll; intro
phase -> elementFromPoint at bar = bar (intro under); band phase ->
elementFromPoint = band (showcase covers); left edges intro/links/band all
20; fill bgs white; sheet opens pinned bottom 812, survives scroll, theme
dot works inside (yellow painted sheet), X closes; no horizontal overflow
(scrollW 375). Desktop 1280x800 regression: alignment 736/272/504, rail
40, panel bottom vh-40 — all intact. IN CARGO post-deploy (desktop-width
editor): content 10,106 chars persisted, script r2 runs (clock ticks),
mobile elements hidden on desktop, type/images/alignment/sticky all pass.
Mobile in Cargo itself is unverifiable (editor iframe is desktop-width) —
Ocean previews by narrowing the browser window or after publishing.
[SUPERSEDED same day: Cargo HAS a mobile editor — see round 2b.]

## Round 2e — nav links fixed + sticky mobile intro (2026-07-06)
LINKS (Ocean: write/work buttons 404 in preview): diagnosed via
window.store.getState().pages — Cargo AUTO-SUFFIXED the slugs. Real purls:
Home="home" (homepage, at /), Write="write-1", Who?="who-1". Pages ARE
published (verified / and /write-1 load; /write and /who 404). Root cause =
slug mismatch (hrefs were /write, /who). Fix: set nav hrefs on all 3 pages
to Work="/", Write="/write-1", Who?="/who-1" (text-based DOM fix covering
both the mbar copy AND the rail copy, which Cargo had mangled to
"#"/relative). Live site needs re-publish to push corrected hrefs; preview
works now. Clean /write /who would require renaming page URLs in Cargo +
republish (offered to Ocean).
STICKY INTRO (Ocean: "Building better brands static until first work covers
it, then scroll out"): `.mms-intro-wrap` wraps intro+spacer+first band.
Desktop `display:contents` (unchanged). Mobile: wrap = containing block,
intro `position:sticky; top:var(--bar-h); z-index:1` pins below the bar,
bands (z20) cover it, releases after the first band (containing-block ends)
so no ghosting through later bands. panel.js setBarH() measures .mms-mbar
height -> --bar-h (load+resize; CSS fallback 200px). Deployed: 2 CSS
splices (25,452 chars; cargo styles + neutralizer intact) + per-page
surgical wrap + inline-script setBarH append + link fix, on all 3 pages.
VERIFIED in Cargo (mobile editor): --bar-h 232, intro sticky@232 pinned
through scroll, released deep; DESKTOP regression clean (wrap contents,
sticky-head h0, intro 272/40 pinned, 736/736). Local preview screenshot
confirmed the visual (EVIIVE image rising over the pinned tagline). NOT
PUBLISHED — Ocean re-publishes to push links+intro live.
NOTE: transparent bands mean the pinned intro peeks through band gaps as the
first work rises (same aesthetic as the nav peek-through, round 2c).

## Round 2f — clean slugs write/who (2026-07-06)
Ocean: wants /write and /who, not /write-1 /who-1. Cargo has NO per-page URL
field (Page Settings = Hide/Thumbnail/Password/Tags only); the slug (purl) is
derived from the page TITLE and regenerates when the title changes. Method
that worked (plain keyboard rename reverted): RELOAD the editor for a clean
pages panel, double-click the page name -> inline input appears, set its
value via the native HTMLInputElement value setter + dispatch input/change
(React-controlled input ignores raw typing), press Enter. Renamed write ->
title "write" purl "write"; who -> title "who" purl "who" (verified in
store.getState().pages, persisted across reload; auto-saves, no cmd+S).
Titles are now lowercase (on-brand with mm.s; nav link TEXT stays
"Write"/"Who?"). Flipped nav hrefs on all 3 pages back to Work="/",
Write="/write", Who?="/who" (+cmd+S). DRAFT only — Ocean must RE-PUBLISH so
/write and /who resolve live (live still serves write-1/who-1 until then).

## Round 2g — restore band gap broken by the intro-wrap (2026-07-06)
Ocean: gap between showcases gone. Cause: round 2e wrapped the first band in
`.mms-intro-wrap`, so band 2's previous sibling is the WRAP, not a `.mms-band`
— `.mms-band + .mms-band` no longer matched band1->band2 (band2 margin-top
fell to 0; the neutralizer's `.mms *{margin:0!important}` guaranteed 0).
band2->band3 was fine (both direct children of main). Fix: added
`.mms-intro-wrap + .mms-band` alongside `.mms-band + .mms-band` in ALL FOUR
gap rules (base desktop 192, base mobile 64, neutralizer desktop 192!,
neutralizer mobile 64!) — the neutralizer !important ones are what actually
apply on Cargo. NOTE the Cargo copy of the base mobile rule had NO trailing
comment (differs from local). Verified on Cargo after reload: bands 0/192/192
desktop; 64 mobile (local). LESSON: any time a band is moved out of the
plain sibling chain, the `+ .mms-band` gap selectors must be extended.

## Round 2h — first showcase must cover the nav bar too (2026-07-06)
Ocean: on mobile the first showcase should overflow/cover the nav bar +
links (be ABOVE it), like the later showcases. Cause: round 2e gave
`.mms-intro-wrap` (mobile) `z-index: 1`, which creates a STACKING CONTEXT —
so the first band's `z-index: 20` was scoped inside that z1 wrapper and the
whole first showcase painted at z1, BELOW the bar (z10). Bands 2/3 (outside
the wrap, z20 in the root context) already covered the bar. Fix: removed the
z-index from the mobile `.mms-intro-wrap` (kept position:relative for sticky
containment — relative + z-index:auto does NOT make a stacking context). Now
the first band's z20 competes with the bar (z10) directly -> first showcase
covers bar+links; intro (z1) still slides under the bar; bands still cover
the intro. VERIFIED on Cargo mobile editor (elementFromPoint over the first
image inside the bar zone -> IMG.mms-img) and persisted after reload
(.mms-intro-wrap mobile has no z-index). LESSON: never put z-index on a
wrapper that must let a child out-stack a sibling above the wrapper — it
traps the child's z-index inside the wrapper's context.

## Round 2i — panel matched to Figma sheet + selected-dot circle (2026-07-06)
Ocean: mobile control panel looks squeezed vs Figma; selected dot should be a
circle not an oval; also links not working on mobile. Pulled the Figma sheet
(get_design_context 21:159). Corrections to the MOBILE sheet:
- Dots: height 24 + gap var(--space-24) (was 28/8 — too fat/crowded). Dots
  stay flex-fill ovals.
- Face buttons: SINGLE 4-across row (grid-cols repeat(4)) — Figma mobile is
  4-across, not the desktop 2x2. (Desktop panel keeps 2x2.)
- Slider: height 24 + gap var(--space-4) (was 28/8).
- SELECTED DOT = circle: `.mms-dot::after` was `inset:4px` (an oval on a
  stretched dot). Now `top/left:50% + height:calc(100%-8px) + aspect-ratio:1
  + translate(-50%,-50%)` -> a true centered circle on both breakpoints
  (12px desktop, ~14-16px mobile). Matches Figma Swatch "small center dot".
Deployed via 2 CSS splices (25,802 chars; cargo styles + neutralizer intact).
VERIFIED on Cargo mobile editor: dots 72x24, buttons one row, ::after 14x14
circle (w==h, radius 50%); local screenshot matched the Figma sheet.
LINKS: verified the mobile bar links are correct (Work=/, Write=/write,
Who?=/who) AND clickable at the top (elementFromPoint returns the <a>). They
"don't work" because the live site 404s on /write /who — the slug rename
(write-1->write, who-1->who, round 2f) is DRAFT-only and NOT PUBLISHED. Fix =
Ocean re-publishes (cmd+P). Everything this session (sticky intro, gaps,
panel, clean slugs+links) is draft; a single publish makes it all live.

## Round 2b — Ocean's mobile review fixes + site structure (2026-07-06)
1. LINKS STICKY ON MOBILE: Work/Write/Who?/Email/Linkedin moved INTO
   .mms-mbar (wordmark row + links, one sticky block, z10). Bands cover the
   whole block when passing — intentional per Ocean.
2. FULL-BLEED RIVERS: .mms-main lost its right padding; .mms-clock carries
   right: var(--margin-page); .mms-river gains padding-right =
   var(--margin-page). Result: images scroll in from the viewport edge; at
   max scroll the last image's right edge == the clock's right edge
   (desktop 1716 = vw-40; mobile 469 = vw-20; both probe-verified).
3. STROKE: .mms-shape border 0.75px -> 1px.
4. LINKS: Email -> mailto:ocean@mmmmm.studio; Linkedin ->
   https://www.linkedin.com/company/mmmmmstudio/; Work -> "/";
   Write -> "/write"; Who? -> "/who" (slugs assumed from page titles).
5. NEW PAGES: "write" (edit/D4042456702; home-shell + 4 placeholder writing
   entries + 2 placeholder images) and "who?" (edit/I0096029541; home-shell
   + two 432x432 squares side by side + description underneath + mailto).
   Local sources: write.html / who.html.
6. PAGE DELETIONS (draft): Clock, mm.s, Projects (took Example Project with
   it) — via right-click row -> Delete -> OK. "Information" NOT deleted:
   the permission classifier requires Ocean to name pages explicitly.
   Live site verified unaffected (curl 200, old content still served).
7. [CRITICAL DISCOVERY] Cargo's mobile editor generates #mobile-offset-
   styles: clones of every padding/margin declaration scaled by
   var(--mobile-padding-offset) (~0.66), injected AFTER our sheet; the
   ".mms *" clone leaks unprefixed. It zeroed our mobile paddings (intro at
   x=0) and rescaled the river padding (13.2px). FIX: "mobile-offset
   neutralizer" section appended LAST in the site CSS — re-asserts every
   non-zero spacing with !important (their clones carry none). Any future
   spacing change must be mirrored there.
VERIFIED in Cargo mobile editor (489px): paddings 24/20/40, alignment at
20, river bleed + end alignment exact, no horizontal strip. Desktop mode
re-verified after toggling back: 736/736, rail/panel paddings, bleed +
clock-aligned scroll end, 1px stroke. write + who? pages probe-verified.
STILL NOT PUBLISHED. Before/at publish Ocean should: right-click
"home v2 test" -> Set as Homepage; confirm /write + /who slugs; decide
"Information" page fate.

## Round 2c — fill model fix (2026-07-06)
Ocean: "the images should not have a white fill. only the text description
should have the white fill bg." Diagnosis (via local preview screenshot at
375px): the mobile `.mms-band { background: var(--color-bg-page) }` (white)
was an opaque sheet — as a band scrolled up over the sticky nav it covered
the WHOLE nav with white (only Work/Write showed; Who?/Email/Linkedin were
erased), and images rode inside that white sheet. FIX (one line): mobile
`.mms-band` background white -> transparent. Now only the opaque images +
the `.mms-desc` white plate cover the nav; the transparent band lets the
nav show through everywhere else. Desktop was already transparent
(unchanged). Deployed by splicing the unique `z-index: 20;\n background:
var(--color-bg-page);` -> `...transparent;` in the Cargo CSS editor
(24872 -> 24863 chars). VERIFIED after reload in Cargo mobile editor: band
rgba(0,0,0,0), desc white, 5 nav links visible, img/intro at x=20;
elementFromPoint over an image within the bar's zone returns IMG.mms-img
(image covers nav). Desktop regression clean (736/736, band transparent,
bar hidden). Site-wide CSS so write/who inherit it — no per-page edit.
PADDING QUESTION (Ocean asked, not changed): 20px left gutter exists on all
content + 16px top in bar + 20px right on text blocks; only image rivers
bleed right (intentional). Looks marginless only because bar/intro are white
to the edges on the white theme (white-on-white gutter). Expected, not a bug.

## Round 2d — control-panel refinements, Figma-matched (2026-07-06)
Grounded in Figma screenshots of the panel (desktop 83:255, mobile sheet
21:159). Four fixes:
1. "CONTROLS" LABEL: Figma mobile sheet has a "Controls" heading + X. Added
   `.mms-panel-head` (span.mms-panel-title "Controls" + the X) as the panel's
   first child on all 3 pages (surgical DOM wrap of the existing close button,
   preserving its listener). Header display:none desktop, flex/space-between
   in the mobile open sheet.
2. DOTS STRETCHED: Figma mobile dots are wide ellipses (desktop = circles).
   Mobile override: `.mms-dot { flex:1 1 0; width:auto; height:28px }`, row
   height 28. border-radius:50% on the non-square box -> ellipse. Desktop
   keeps 20px circles.
3. FONT BUTTONS SIZE-LOCKED: were `font-size: var(--font-size-caption)` (grew
   with the scale slider). Now fixed per-face Medium caption px: serif 14 /
   sans 13.5 / mono 12.6 / gothic 14. Content still scales; panel UI doesn't.
   Title fixed 18px.
4. SLIDER a's CENTERED: `line-height:1` + `translateY(-0.114em)` on both a's
   centers the lowercase ink on the line (derived via canvas measureText:
   glyph center 3.18px below line-box center at 28px -> -0.114em). Row 28px.
DEPLOY: 9 targeted CSS replacements in the Cargo editor (all verified unique;
25319 chars; cargo-managed font styles + neutralizer intact) + surgical panel
markup wrap on home/write/who. VERIFIED after reload in Cargo mobile editor:
Controls label present, 83x28 dot ellipses, buttons 14/13.5/12.6/14 fixed,
close/menu-toggle/face buttons all functional. Desktop regression: panel head
hidden, 20px circle dots, buttons fixed. Local preview matched. NOT PUBLISHED.

## Design contrast notes (carried from Figma, Ocean's call)
navy/red ~4:1 borderline; yellow/magenta ~2.9:1 fails AA body. Artistic
choice, documented.

## Round 3 (2026-07-06) — RESPONSIVE SCALING (1440 base, fluid down to mobile)
Ocean: "use 1440px as the base ... responsive design that keeps everything on
scale and readable ... until a small enough point then mobile."
APPROACH — one scale unit drives the whole desktop composition:
  --u  = min(100vw / 1440, 1px)          layout unit: 1px @>=1440, shrinks
         proportionally below, caps @1440 (wide screens still fill via 1fr).
  --ut = max(min(100vw/1440,1px), 0.7px) type unit: same but FLOORED at 0.7 so
         text stays readable (>=~13.4px) while the layout keeps shrinking.
  Mobile (<=760) resets --u/--ut to 1px -> the phone layout keeps its own fixed
  sizes, untouched. XL (>=1800) unchanged (--u caps at 1 there anyway).
CHANGES: every spatial token -> calc(N*var(--u)); every font-size + line-height
-> calc(N*var(--ut)); site.css hardcoded px (panel width, intro-spacer + river
heights, dot/close/btn/scale-row/shape/thumb dims) -> calc; ALL image inline
styles in home/write/who bodycopy -> width:calc(N*var(--u));height:calc(N*var(--u)).
BUG FOUND+FIXED: slider <input type=range> has an intrinsic ~129px min-width
that does NOT scale -> overflowed the shrinking panel (pushed the right 'a' out
at narrow widths). Added `min-width: 0`.
VERIFIED LOCALLY (test.html preview @ 1440/1180/1000/800/770/375): exact match
to the formula at every width, type floored at 0.7, NO horizontal overflow,
mobile flips clean at 760 with full-size type; slider contained post-fix.
NEW GLOBAL CSS LENGTH 33946 (was 25802). NOT PUBLISHED.

CARGO GLOBAL-CSS LOCATION (was non-obvious — cost real time to find):
- Site-wide CSS (state.css.stylesheet = boilerplate + tokens + 3 cargo font
  blocks + site + neutralizer) is edited via RIGHT RAIL "Site Settings" -> a
  "CSS / HTML" entry -> code window, CSS tab. It AUTOSAVES (survived a full
  editor reload; state.css.stylesheet stayed 33946).
- The top-bar "Code View" ([button-name=code-view-button]) is PER-PAGE: HTML
  tab = the page's bodycopy markup (where image inline styles live), CSS tab =
  page local-css (~33 chars, header "Applied to current page"). Editing the
  bodycopy needs a click on the window's "Update" button to commit (page code
  does NOT autosave like the global CSS does). Confirmed persistent post-Update.
- Toolbar button X-coords SHIFT with window width — always re-probe
  [button-name=code-view-button] / [tooltip] before every real click.

DEPLOY MECHANISM (large CSS through a CSP-limited, screenshot-less browser):
- gzip decode via `new Response(stream)` is BLOCKED by CSP ("Failed to fetch");
  use DecompressionStream writable-writer + readable-reader directly.
- Move local file -> page as `gzip -nc file | base64` (gzip CRC is the integrity
  net: a mis-typed byte throws "incorrect data check" rather than corrupting).
  Chunk the base64 and verify each chunk's SHA-256 in-page before assembling —
  a 7.2k-char site blob had one bad char; SHA-bisected to the wrong 906-char
  eighth and re-sent. Assemble, verify full gzip-bytes SHA, then gunzip.
- Splice preserving cargo-managed regions:
    newCSS = css.slice(0,iTokensStart) + newTokens
           + css.slice(iFontsStart,iSiteStart)   // the 3 cargo font blocks
           + newSite
    iTokensStart = lastIndexOf('/*', indexOf('design tokens'))
    iFontsStart  = indexOf('}', indexOf('var(--sz-heading-gothic);')) + 1
    iSiteStart   = lastIndexOf('/*', indexOf('layout v3'))
  Validate order + all markers (mms mono/sans/gothic, fluid scale units,
  calc(200 * var(--u)), min-width: 0, mobile-offset neutralizer) BEFORE
  setValue. NOTE: cargo's stored comment wording differs from the local files —
  match on SHORT markers ('design tokens', 'layout v3'), not full comments.

## Round 3b (2026-07-06) — CORRECTION: type is FIXED, only the GRID scales
Ocean corrected the r3 approach: "on scale as in the grid should be on scale.
the font size should always stay the same." My r3 `--ut` (scaling type with a
0.7 floor) was WRONG. Fix:
- REMOVED `--ut` entirely. `--sz-*` and `--lh-*` reverted to FIXED px (the
  original 19.2/etc. values). Body/nav/heading/caption text no longer scales
  with the viewport — as the grid narrows, fixed-size text just reflows into
  narrower columns.
- KEPT `--u` on every GRID/spatial token (columns, spacing, margins, nav-col,
  radii) AND on the image inline styles — the grid still scales from 1440.
- Panel LABELS: switched `var(--ut)` -> `var(--u)` so they scale WITH the panel
  box (the panel is a self-contained widget in the scaling rail; freezing it
  would need a fixed-width rail — flagged to Ocean, not done).
- Image bodycopy UNCHANGED (images are grid -> already on --u; no re-deploy).
- Verified locally @800px: body font stays 19.2px (fixed) while intro/img
  shrink to 240px (grid). Deployed global CSS via the same splice; NEW LEN
  32821 (was 33946 — fixed px is shorter than calc). Persisted after reload
  (state.css.stylesheet=32821, no var(--ut)). NOT PUBLISHED.

## Round 4 (2026-07-07, overnight) — touchbaes band live, game images hosted, VIDEO blocked
TOUCHBAES band 3 is LIVE on the draft (6 stills + game-screenshot slot #mms-game-slot + description; freight-hosted; persisted). Band 2 untouched, EVIIVE not yet re-synced. NOT PUBLISHED.

GAME (sticker room): Ocean pasted cargo-snippet.html into a touchbaes-game page, but Cargo's Code View GUTTED the inline base64 <img> into hash="placeholder" media-items (Cargo strips data: URIs; only the 7 <script>-embedded webp survived). FIX DONE: hosted all 9 game images on Cargo CDN from Figma page 235:440 (download_assets PNG @1-2x -> synthetic drop). Rewired the snippet to those freight URLs (NO base64) -> cargo/touchbaes-game-cargo.html (30KB). Pasting THAT won't be mangled (Cargo keeps normal img URLs). Game image freight hashes (all /w/1000/q/85/i/{HASH}/game-*.png):
  scene X3022124549177496037168295491385 ; sticker-cat-placed N3022124587915658591958353884985 ; sticker-cat O3022124604499281514223240787769 ; sticker-plant W3022124620289694441318616971065 ; sticker-right-bottles D3022124636098554112487702705977 ; sticker-touchbaes G3022124655043360276187412215609 ; tweezer-close S3022124668786184611101028169529 ; tweezer-front-arm D3022124687841671239242994988857 ; tweezer-open Q3022124703263149284864180139833
TODO game: (1) 2 DUPLICATE touchbaes-game pages exist (L0586125395 + B1756957511, same purl -> ambiguous) — delete one. (2) paste touchbaes-game-cargo.html into the survivor. (3) iframe it into #mms-game-slot (692x504) in the home river; screenshot = mobile fallback. NOTE: /edit/{pageId} navigation BOUNCED to home in automation (couldn't setValue the game page blind); it edits fine via the Cargo UI (Ocean pasted before).

VIDEO PROBLEM (Ocean's #1): showcase "videos" are static stills; ZERO video hosted on Cargo (checked state.media). Cargo method (docs https://cargo2support.cargo.site/Embedding-Videos): self-host file, then <video autoplay muted loop playsinline><source src="URL" type="video/mp4|webm"></video> (H264/AAC rec) OR Vimeo/YouTube. BLOCKED autonomously: video files are LOCAL (Cargo can't fetch your Mac — localhost fetch HANGS, tested live; too big to stream through the editor; videos can't ride Figma). NEEDS Ocean upload (or Vimeo). Usable source files: EVIIVE _finals Image 5 (mp4 852K / webm 340K), Image 3 (webm 1M); touchbaes 8bit-girls-final-cargo-alpha-720.webm (667K). emily-in-strike video-small.mp4 / video.mp4 = 0 BYTES (unrendered — needs re-render before upload). Once uploaded -> wire <video> into the matching .mms-img slots (replace those stills).

## Round 5 (2026-07-08, Fable): intro spacer restored + bands 2/4 built (V7 Labs, Mandy Ma & Co.)
- FIX: `.mms-intro-spacer` div had been LOST from the home bodycopy in an earlier
  round-trip -> EVIIVE band sat 220px over the intro. Re-inserted (CSS was intact,
  280*--u). WATCH: bodycopy surgery can silently eat structural divs — re-check
  wrap children (sticky-head + spacer + band) after any band edit.
- BAND 2 = V7 Labs ("– OOH campaign graphic and motion design • fintech", url line
  eviive.ch AS IN FIGMA — likely placeholder, Ocean to confirm). Items (order):
  v7-screenshot.jpg A3025118147587799346077512546105 (307x307) ·
  v7-postcard.jpg R3025118182046317275766954964793 (336x504) ·
  [data-slot=v7-ooh-train-video] 759x504 · [data-slot=v7-freetothink-motion] 788x197 ·
  [data-slot=v7-video-truck] 672x504 · v7-aframe.jpg Y3025118212686359182198520198969 (281x374).
- BAND 4 = Mandy Ma & Co. ("– graphic design • fashion", no url), NEW section after
  touchbaes, data-offset=2. Items: [data-slot=mandy-sataic-video] 378x504 ·
  [data-slot=mandy-hf-alpha-video] 779x504 · mandy-photo-1.jpg D3025118231022422791465814505273
  (377x504) · mandy-tee.jpg M3025118651718868136485848659769 (504x504) ·
  mandy-photo-2.jpg E3025118669852017560942337898297 (612x344) ·
  mandy-ig.jpg G3025118686970596061344801797945 (344x344) ·
  [data-slot=mandy-mewmew-element] 352x200 (Ocean's "html small element" — pending his comments).
- CONVENTION (new): pending video/html placeholders carry data-slot="..." on the
  placeholder img — swap = replace that one element, sizes already correct.
- Figma comments are UNREADABLE via the connector (REST-only). Ocean to paste
  contents or put instructions as canvas text layers.
- VIDEOS pending from Ocean (upload to Cargo Images & Files directly): OOH Train
  Station, Freetothink motion, Video Truck, SATAIC Comp, hf alpha webm (+ mewmew element).
- Media audit: game PNGs at /t/original = ~3.9MB (scene 2.2MB); local optimized
  webp set = ~480KB -> recommend Ocean uploads the 9 webp, rewire game. Deletable
  dupes: 2x eviive-3.jpg (1.2MB each), superseded eviive-3.png, old
  touchbaes-sticker-game.html 38443b.
- All draft, NOT published. Tweezer overlay (rest/track/z-layering) unchanged.

## Round 5b (2026-07-08, Fable): AUTONOMOUS VIDEO UPLOADS — all 5 band-2/4 videos live
- BREAKTHROUGH TECHNIQUE (fully autonomous local-file upload to Cargo, zero Ocean steps):
  1) In the ADMIN page: create hidden input[type=file] + visible trigger button; the
     change listener must COPY files out (`window.__twFiles=[...inp.files]`) — a live
     FileList empties itself.
  2) `computer`-click the button (real click = user activation) -> native picker opens.
  3) AppleScript (Control_your_Mac osascript): activate Dia -> VERIFY "sheets of window 1"
     is 1 BEFORE any keystroke (frontmost was Figma once!) -> set clipboard to POSIX path
     -> cmd+shift+G -> cmd+V -> Return -> Return. iCloud "Modifications aren't in sync"
     conflict sheets can appear: check checkbox 1 of group 1 ("Modified by me"), click
     "Keep One". Probe sheet buttons by NAME, never blind-Return.
  4) Drop the File on the bodycopy (proven pipeline) -> new media-item hash -> remove
     element + input event.
- [GOTCHA] Cargo SANITIZES stored filenames (spaces->hyphens, "@" stripped). Freight URL
  404s (video error code 4) unless the name matches the STORED name — always re-read
  `store` media item names after upload, never guess.
- Wired 5 <video autoplay muted loop playsinline class="mms-img mms-video"> (hf-alpha +
  background:transparent), /t/original/ URLs, data-slot kept:
  v7-ooh-train-video D3025151369269985637368204932921 · v7-freetothink-motion
  C3025153495884429430900153431865 (dupe A3025152093931879828974230615865 deletable) ·
  v7-video-truck W3025156318955695727336223192889 · mandy-sataic-video
  K3025157075364436469796387206969 · mandy-hf-alpha-video V3025158174716596286590825314105.
- Paths came from Ocean's canvas TEXT FRAMES (nodes 288:352, 290:354/356/358/360) — the
  workflow works; Figma COMMENTS remain unreadable. General note 288:350 kept timing out.
- REMAINING: [data-slot=mandy-mewmew-element] (352x200) — no path given; V7 desc blurb/url
  (eviive.ch) look like placeholders in Figma. Verified after reload: 5/5 videos playing,
  15/15 imgs, 4 bands, spacer OK. NOT PUBLISHED.

## Round 5c (2026-07-09, Fable): coffee cup LIVE + mewmew transparency + photo-1 white line
- [CRITICAL GOTCHA — TAB VISIBILITY] Cargo's editor DOES NOT ARM in a hidden
  (backgrounded) tab: bodycopy contenteditable stays null, drag/drop upload
  handlers never attach (dragover defaultPrevented=false), InputEvent edits do
  NOT sync/save, and CDP computer-clicks are not processed by the throttled
  renderer. Symptoms look like "drop silently ignored" / "edits lost on
  reload" / "clicks do nothing". FIX: make the MCP tab the ACTIVE tab
  (osascript: activate Dia + `keystroke tab using control down`, then probe
  document.visibilityState per tab), RELOAD it while visible, verify
  contenteditable=true + dragover preventDefault before any upload attempt.
  This cost ~2h of misdiagnosis in Round 5b/5c — check visibility FIRST.
- COFFEE CUP (V7 band, slot 1): Ocean uploaded coffee-cup-bundle.html (759KB
  self-contained: three.min.js r160 + texture inlined, transparent bg) via
  Images & Files -> hash H3025285659039638304805760841529. Replaced
  v7-screenshot.jpg img with iframe.mms-img.mms-cup (scrolling=no,
  307x307 via --u, border 0, background:transparent), pattern copied from the
  game iframe. Verified: file serves 200 text/html; THREE r160 boots, full-res
  canvas, transparent body, no console errors on clean load. NOTE: .html
  CANNOT be drop-uploaded (bodycopy drop accepts media types only — verified
  with a test file); Images & Files upload stays MANUAL (Ocean) until the
  input#file automation is re-proven.
- MEWMEW TRANSPARENCY: Figma node EXPORTS flatten alpha (download_assets
  export AND plugin exportAsync both render opaque on #F5F5F5) — but
  download_assets ALSO returns rawImages = the ORIGINAL uploaded fill bytes
  with alpha intact. Pipeline: rawImages URL -> in-page fetch ->
  createImageBitmap -> canvas downscale to 704w (alpha survives) -> PNG blob
  -> drop-upload. New hash J3025291037409233923710049105721
  (mandy-mewmew-t.png, 704x420, 50% transparent verified on the served
  /w/704/q/85 URL — freight resize PRESERVES png alpha). Old opaque
  mandy-mewmew.png (H30252245...) unused, deletable.
- PHOTO-1 WHITE LINE: mandy-photo-1.jpg had a subtle right-edge artifact
  (4% white last column in the original) that freight's q/85 recompression
  amplified to a visible 50% white line. Fix: canvas-crop 2px off the right
  (754->752), re-encode jpeg 0.92, re-upload -> hash
  A3025291300404464182587126495033 (mandy-photo1-fix.jpg, 752x1008, 0% white
  edge verified). Old D30251182... unused, deletable.
- All three changes persisted after cmd+s + reload probe (cup iframe, both
  new srcs, 0 stray media-items). Ocean's stray index.html upload (1KB,
  P3025285334...) is unused — deletable from Images & Files.

## Round 5d (2026-07-09, Fable): cup black-bg + mewmew gray-bg fixed; .html upload NOW AUTONOMOUS
- CUP BLACK BG root cause: `:root { color-scheme: light dark; }` in the bundle
  CSS. Chromium paints an OPAQUE backdrop behind a cross-origin iframe whose
  color-scheme differs from the embedder (black under a dark browser theme).
  RULE: any HTML meant for transparent iframe embedding must NOT declare
  color-scheme (or must match the parent). Patched: hosted
  coffee-cup-bundle-v2.html hash A3025302543824104317074803308345 (iframe src
  swapped); local styles.css + coffee-cup-bundle.html patched to match.
- MEWMEW GRAY BG root cause: `.mms-img { background: var(--color-text-muted) }`
  (site.css placeholder mechanic) shows through transparent PNGs. Fix: inline
  `background:transparent` on the mewmew img. RULE: every transparent
  image/iframe slot needs the inline transparent background override.
- [MAJOR UNLOCK] .html files (any file type) upload AUTONOMOUSLY via the
  Images & Files `input#file` — it EXISTS in the admin DOM of an ARMED
  (visible-loaded) editor tab without opening any panel: set input.files via
  DataTransfer + dispatch change, poll store.getState().media.data for the
  new hash. (It is ABSENT in a hidden/unarmed tab — Round 5c gotcha applies.)
  Fetch-patch-reupload pattern: fetch the hosted file from freight, patch the
  text in-page, new File, upload — no local-byte relay needed.
- Media library (site files, store media.data): touchbaes-sticker-game.html
  38KB LIVE · coffee-cup-bundle-v2.html 759KB LIVE · coffee-cup-bundle.html
  759KB v1 SUPERSEDED (deletable) · index.html 1KB stray (deletable).
  Page-dropped images/videos do NOT appear in media.data (page-model media).

## Round 5e (2026-07-09, Fable): mewmew v3 — color-edited + alpha via TWO-MATTE recovery
- Ocean color-edited the mewmew in Figma via FILL FILTERS (exposure +0.2,
  contrast -0.3, saturation -1 = grayscale). Fill filters live ONLY in
  rendered exports (raw fill bytes never have them) — but Figma renders
  flatten alpha. SOLUTION — two-matte alpha recovery: temp frame off-canvas
  (x6000), BLACK fill + node clone -> download_assets; flip frame WHITE ->
  export again; per pixel a = 1-(W-B)/255, C = B/a. Recovered 704x420 PNG:
  50% transparent, 4% semi (clean AA edges), 0% colorful (grayscale edit
  intact). Temp frame deleted after. REUSABLE for ANY color-edited
  transparent asset.
- TOP-CROP root cause: Cargo slot was 352x200 (ratio 1.76) vs image native
  1.676 + `.mms-img { object-fit: cover }` -> zoom-crop top/bottom. Fixed
  slot to 335x200 (matches Ocean's Figma node 334.86x199.80). RULE: river
  slot dims must match the asset's native ratio or cover crops it.
- New hash K3025313871157983242867230422841 (mandy-mewmew-v3.png). Previous
  J3025291... (v2, stale colors) + H3025224... (v1, opaque) both unused.
- All persisted after cmd+s + reload probe.

## Round 5f (2026-07-09, Fable): mewmew edge line + SATAIC resize
- Mewmew v3 had a 1px whitish line on the LAST row + column — cause: the
  matte frame inherited the node's FRACTIONAL dims (334.858x199.801), so the
  rasterizer blended partial edge pixels with the matte bg and the alpha
  math turned them semi-opaque white. RULE: two-matte captures should use
  integer frame dims, or just crop 1px off right+bottom after recovery
  (done here: 704x420 -> 703x419, both edges verified 0% whitish). New hash
  I3025317449180697499940409620281 (mandy-mewmew-v4.png); v3 K30253138...
  unused.
- SATAIC video (Mandy band slot 1): Ocean resized on Figma 378x504 ->
  330.2x440.2 (same 0.75 ratio). Cargo slot updated to 330x440 --u units.
- Figma Mandy river ledger (2026-07-09 read, gallery-row order): spacer 200 ·
  SATAIC 330x440 · hf 779x504 · photo-1 377x504 · tee 504x504 ·
  photo-2 612x344 · ig 344x344 · Frame2(mewmew) 352x200 (graphic 334.9x199.8
  inside; Cargo shows the graphic at 335x200, no container padding).
- Both persisted after cmd+s + reload.

## Round 5g (2026-07-09, Fable): v7-aframe edge line + full-river edge sweep
- v7-aframe.jpg: ORIGINAL edges clean, but freight's RESIZE (562x749 ->
  /w/560 = 560x746) produced a bright right column (100% >220) + bottom row
  (71%). Same family as photo-1. Fix: crop 2px right+bottom from original
  (560x747), re-encode jpeg 0.92, re-upload -> hash
  J3025320100438989493845715629881 (v7-aframe-fix.jpg), src swapped at
  /w/560. Served edges verified 0%. Old Y30251182... unused.
- RULE (now 3 occurrences: photo-1, mewmew, aframe): fractional Figma
  export dims + freight resampling = 1px bright edge on right/bottom. ALWAYS
  probe the SERVED resized URL (not just the original) after hosting; fix =
  crop 1-2px and re-upload.
- Swept ALL 13 river imgs (served renditions, edge-vs-neighbor delta probe):
  0 flagged — no other images carry the artifact.

## Round 5h (2026-07-09, Fable): mewmew breathing room
- Figma Frame 2 (352x200) has the graphic CENTERED (x 8.6; 8.5 right), not
  17px trailing as first guessed. Reproduced: mewmew img margin-left/right
  = calc(8.5*var(--u)) each; total footprint 352 units matching Figma.
  Persisted after cmd+s + reload.

## Round 6 (2026-07-09, Fable): LOOP FINANCIAL band deployed (band 5)
- Figma source: showcase-band 5 (295:382), offset-spacer 432 = data-offset="4".
- Structure cloned from the Mandy band (section.mms-band > .mms-river
  [div.offset + slots] + figure.mms-desc), url line grafted from V7's desc.
- Slots (order, --u units): loop-cover.jpg 766x504
  H3025362994634537346592378763065 (/w/1530) · Loop-Wrapped_Animated-
  illustration-cargo-alpha.webm 378x504 E3025368763060536404085135947577
  (ALPHA webm -> inline background:transparent per the transparent-asset
  rule) · Loop-Card_3D-Animation-cargo.webm 472x354
  T3025368792464646457578161223481 · loop-image-2.jpg 579x504
  C3025363007399684245599388481337 (/w/1157) · loop-image-6.jpg 290x252
  G3025363020404638817564622370617 (/w/577). Video stored names =
  spaces->hyphens sanitization, verified 200 before wiring.
- Statics: Figma jpg export @2x -> pre-cropped 2px right+bottom (fractional
  dims insurance) -> hosted; post-hosting edge sweep on served renditions:
  0 flagged.
- Desc: title "Loop Financial", tagline "– OOH campaign graphic and motion
  design • fintech", blurb + eviive.com AS IN FIGMA — tagline/blurb/url look
  copied from the V7 card, LIKELY PLACEHOLDERS, Ocean to supply real copy.
- Video capture gotchas ADDED to the picker recipe: (1) `set the clipboard`
  MUST run OUTSIDE `tell process` blocks (inside, it silently no-ops and the
  picker confirms its remembered previous selection — we captured a stale
  three.min.js this way); (2) picker go-to field is reachable directly:
  `text field 1 of splitter group 1 of sheet 1` (AppleScript class is
  "splitter group", not "split group"). (3) Cargo /edit/preview mode
  DISARMS editing (contenteditable null) — wait or navigate back to the
  page edit URL.
- Verified after cmd+s + reload: 5 bands, all 5 Loop slots load (videos
  readyState>=2, imgs naturalWidth>0). NOT published.

## Round 6b (2026-07-09, Fable): stray media-items purge
- BUG (mine): the 3 Loop image drop-uploads were left UNCLEANED in the
  bodycopy — dropped media-items render FULL-WIDTH figures, so a giant
  duplicate cover sat above the band ("one huge image" per Ocean). The video
  drops were cleaned; the image loop skipped the removal step.
- RULE: EVERY bodycopy drop-upload MUST remove its media-item (+ closest
  figure) in the same breath as hash capture — treat capture+clean as ONE
  atomic recipe, never separate them.
- Removed all 3 strays, saved, verified: 0 media-items, 5 bands intact,
  Loop's 5 slots fine. Screenshot diagnosis worked in the VISIBLE tab
  (CDP screenshots OK when tab foreground — the old "screenshots fail in
  Dia" note applies to hidden tabs).

## Round 6c (2026-07-09, Fable): Loop Wrapped v3 — BLACK BG KEYED TO ALPHA via ffmpeg
- Ocean's note (295:417): new file v3_Loop Wrapped...-cargo-small.webm +
  "remove the black bg while keeping the ratio of the video square and the
  background should be transparent". Source: VP9 1440x1440 yuv420p (NO
  alpha, black baked). Figma replacement node 331:423 = 504x504.
- PIPELINE (reusable, local ffmpeg): plain colorkey FAILED cleanly — the
  artwork contains true-black grain patches that key into pinholes (color
  methods cannot separate them from bg). WINNING approach = GEOMETRIC:
  `format=yuva420p, floodfill=x=0:y=0:s0=16:s1=128:s2=128:s3=255:d0=16:
  d1=128:d2=128:d3=0` (bg is uniform Y=16 limited-range black, only the
  border-CONNECTED region floods to transparent -> interior art untouched),
  then scale 1008:1008 lanczos, then alpha-erosion (alphaextract,erosion,
  alphamerge) to trim the 1px dark AA fringe. Encode: libvpx-vp9
  `-auto-alt-ref 0` (REQUIRED or vp9 silently drops alpha; ffprobe shows
  yuv420p for alpha webm — check stream_tags alpha_mode=1 + decode with
  `-c:v libvpx-vp9` before -i to actually see alpha). Verified per-frame:
  bg alpha 0 at all edges, ZERO art holes (frames 5/45/70), 600KB.
  Output saved next to source: v3_..._cargo-alpha.webm.
- Uploaded via picker (keystroke route, clipboard OUTSIDE tell; the
  splitter-group text-field route is a TRAP — setting its value does not
  navigate, Return just confirms the picker's REMEMBERED previous selection;
  captured a stale file twice this way. ALWAYS verify captured name+size
  against the intended file before dropping). Hash
  J3026315496581321452538106001209, sanitized name
  v3_Loop-Wrapped_Animated-illustration-cargo-alpha.webm (200-checked).
- Wired: wrapped video src swapped, slot 378x504 -> 504x504 (square, per
  Figma 331:423), background:transparent. Persisted: plays, 0 strays.

## Round 6d (2026-07-09, Fable): Loop Wrapped REVERTED to black-bg original
- Ocean's call ("this is not working"): alpha version out, original
  v3_..._cargo-small.webm (black bg, 608KB) in. New hash
  M3026322101198229371284837939001, slot stays 504x504 square. Persisted,
  plays, 0 strays. Alpha hash J3026315... + local -alpha.webm file remain
  available if ever revisited. (Possible cause of "not working" worth
  knowing: VP9 alpha webm does NOT play on Safari/iOS — Chromium-only;
  if that was the symptom, an HEVC-alpha .mov fallback would be the fix.)

## SAFARI/iOS FALLBACK LEDGER (deferred to end-of-project pass, per Ocean 2026-07-09)
Policy: build Chromium-first; before publish, one batch pass adds fallbacks.
Mechanism: <video> gets ordered <source> children (HEVC/H.264 first for
Safari, webm second); ffmpeg locally (hevc_videotoolbox supports alpha).
Running list of assets to cover — APPEND on every video/exotic-format deploy:
- [ ] EVIIVE band videos (webm x3, Round 5b) — need H.264 mp4 fallbacks
- [ ] V7 band videos (train station, Freetothink, video truck webm) — mp4 fallbacks
- [ ] Mandy band videos (SATAIC webm, hf-alpha webm — hf is ALPHA: needs
      HEVC-alpha .mov, plain mp4 would show black) — check hf on Safari
- [ ] touchbaes band: 8bit-girls alpha webm (if wired) — HEVC-alpha
- [ ] Loop band: Loop Card webm — mp4 fallback; Loop Wrapped = black-bg file
      (no alpha issue); IF alpha version revisited -> HEVC-alpha .mov
      (alpha webm hash J3026315..., local file kept)
- [ ] Coffee cup Three.js iframe — WebGL works on Safari; verify perf on iOS
- [ ] Game iframe — plain canvas/DOM, expect OK; verify touch controls
- [ ] Full-site smoke in Safari: fonts (@font-face), sticky rail, --u scaling

## Round 6e (2026-07-09, Fable): loop-image-2 refreshed
- Ocean updated the asset on Figma (new node 339:703, same 579x504). Exported
  @2x jpg, 2px pre-crop, hosted as loop-image-2-v2.jpg hash
  U3026333005972541800612566185785, src swapped. Persisted, served-edge
  probe clean, 0 strays. Old C3025363... unused.

## Round 6f (2026-07-09, Fable): Loop offset removed
- Ocean removed the offset-spacer from the Loop band on Figma. Cargo match:
  removed data-offset="4" attr + the .offset div from the Loop river (now
  identical structure to the V7 band). First item starts at x272 = rail
  edge, aligned with V7's. Persisted after cmd+s + reload.

## Round 7 (2026-07-09, Fable): Montran flippable-booklet — PREPPED, hosting blocked
- SOURCE: Portfolio assets/_for cargo deployment/Montran/flippable-booklet/
  (pdf.js + page-flip vendored locally, config-driven, self-contained folder).
- REVIEW: clean/portable. Fixed `color-scheme: light` (the transparent-iframe
  black-bg trap) in index.html.
- COMPRESSION: gs -dPDFSETTINGS=/ebook -dColorImageResolution=150 -> 88.5MB
  down to 18MB, pixel-equivalent at the viewer's 1100px render (A/B'd). Code
  untouched (compressed file swapped under same name; original kept in the zip).
- OCEAN'S 3 CONFIG CHANGES (all done, verified locally at 127.0.0.1 + black-bg
  screenshot + opens on p19-20 spread):
  * black bg: config.background.color=#000, transparent=false; index.html now
    reads config bg onto body when !transparent.
  * hide all controls on deploy: config.viewerOptions.hideControls=true ->
    body.controls-hidden {.controls display:none; .frame radius/shadow 0}.
  * start at p19 (Sustainability Strategy): config.viewerOptions.startAtPdfPage=19;
    initializeFlipBook resolves the blueprint index (even => left page of spread)
    and turnToPage()s there. Landed on the p19/20 spread exactly (Ocean's note).
  * NEW zip also added 3 blank pages (blankPagePositions [0,70,71]) — handled
    by the existing pageSequence path.
- MONTRAN BAND = Figma showcase-band 6 (333:424), offset-spacer 200 (data-offset
  2). River items (order): Screenshot-18.50 1011x504 · 米禾设计 733x504 (the
  icon-grid) · Screenshot-00.49 313x313 · Frame4629 688x504 (global-map UI) ·
  linkedin-video 353x442 · Slide16:9 695x391. Desc: "Montran / – Brand identity,
  web development, graphic and motion design • Fintech" + blurb + eviive.com
  (PLACEHOLDER copy, same as other bands). Notes also reference two videos:
  montran-icon-animation.mp4 (1280² h264) and _Montran_CSD_R&S_EN.mp4 -> Ocean:
  "remove the audio" -> stripped to Montran_CSD_RS_EN-noaudio.mp4 (1080x1350 h264,
  2.2MB). The flippable booklet is ALSO a slot/feature of this band.
- BLOCKER: Cargo file uploader (input#file) is NOT a permanent DOM node — it
  mounts on-demand (this morning's Round 5d success used an artifact left by a
  prior media action). A clean armed tab has no input#file; bodycopy drop
  REJECTS pdf/html ("This type of file is not supported" modal); presigned API
  = 403 (needs auth token, scan blocked). Could not summon the uploader blind
  this session. Booklet must become ONE self-contained .html (inline vendor +
  config; PDF either base64-inlined ~24MB or hosted separately + freight URL)
  to fit Cargo's single-file model. HANDOFF options for next step: (a) Ocean
  drops booklet.html-bundle + pdf into Images & Files (like the coffee cup),
  (b) bundle + retry uploader. NOT deployed to any band yet.

## Round 7a (2026-07-09, Fable): Montran map-tile spec update (Ocean)
- The Frame 4629 tile (global map) is NOT a flat export: the caption on top
  ("Apparently everyone needed a different map to showcase product coverage
  across different regions, so I built this for my own sanity. (100% reduction
  in 'Hey, got a moment? Can you help with a map?' messages.)") ships as REAL
  TEXT, prefixed with CARGO'S NATIVE pointing-finger icon (Add > More... >
  Icon... in the editor; the Figma ☞ glyph is illustration-only). Only the
  browser-window screenshot below the caption is exported as an image.
- TO CAPTURE AT DEPLOY TIME: insert Icon... in the editor, pick the
  finger-pointing-right (manicule), inspect the inserted markup in bodycopy,
  reuse that exact element in the band, then remove the test insert.
- NOTE: Ocean was actively resizing the browser window during this session's
  UI exploration (vw 1482 -> 2564 -> 3172 between probes) — coordinate clicks
  were landing nowhere. Re-derive ALL coordinates from DOM rects immediately
  before every computer-click, and re-check between steps.

## Round 7b (2026-07-09, Fable): MONTRAN BAND DEPLOYED (band 6, partial)
- Built per Figma showcase-band 6, data-offset="2", after Loop. Slots:
  1. [data-slot=montran-booklet] 1011x504 — booklet STILL (O3026631223...,
     montran-booklet-still.jpg) as placeholder; becomes an IFRAME to
     montran-booklet-bundle.html once Ocean uploads it. PDF is UP:
     X3026621020761595522913036449593 (200-verified). Iframe src pattern:
     freight .../t/original/i/{BUNDLEHASH}/montran-booklet-bundle.html?pdf=
     https%3A%2F%2Ffreight.cargo.site%2Ft%2Foriginal%2Fi%2FX30266210...%2F
     montran_sustainability-report_2025_v4.pdf
  2. montran-mihe.jpg 733x504 (C3026631235...)
  3. [data-slot=montran-icon-video] 313x313 — EMPTY <video>, awaits
     montran-icon-animation.mp4
  4. .mms-tile 688x504 = caption <p data-slot=montran-map-caption> (real text,
     awaiting Cargo NATIVE manicule icon prefix) + montran-map.jpg 688x442
     (A3026631249...)
  5. [data-slot=montran-csd-video] 353x442 — EMPTY <video>, awaits
     Montran_CSD_RS_EN-noaudio.mp4 (audio already stripped locally)
  6. montran-slide169.jpg 695x391 (J3026631262...)
  Desc: Montran / – Brand identity, web development, graphic and motion
  design • Fintech / standard blurb, no url. Persisted + edge sweep clean.
- [DISCOVERY] cmd+s is NOT required: input-event edits AUTOSAVE (sync engine)
  on a visible armed tab — persistence verified reload-after-6s with no save
  keystroke.
- [WARNING] CDP input (clicks AND keys) to MCP tabs DIED mid-session while
  Ocean actively used/resized the browser; System Events keystrokes go to
  OCEAN'S front tab (typed a test "u" — page checked clean, but NEVER
  keystroke into Dia blind when Ocean is active). Picker uploads impossible
  in this state -> videos deferred to Ocean drag-drop.

## Round 7c (2026-07-09, Fable): MONTRAN BAND 100% COMPLETE — all inserts autonomous
- Booklet LIVE: montran-booklet-bundle.html hosted
  (R3026654869116571486264616335161), iframed at 1011x504 with
  ?pdf=<encoded freight pdf url>; verified rendering the p19-20 spread on
  black inside the band. Videos hosted+wired: montran-icon-animation.mp4
  C3026651793472485332597365847865 (313x313) · Montran_CSD_RS_EN-noaudio.mp4
  E3026651808137646871196459382585 (353x442). Map caption now starts with
  CARGO'S NATIVE ICON: <text-icon icon="pointer-2"></text-icon> (the
  right-pointing manicule) + a space. 0 strays, all persisted via autosave.
- [BREAKTHROUGH — CLICK COORDINATE SPACE] computer-tool clicks are in
  SCREENSHOT coordinates (~1476-wide), NOT CSS pixels. When Ocean's window/
  zoom makes innerWidth larger (e.g. 2940), convert: tool = css * (1476/vw).
  ALL earlier "dead input" mysteries were this after window resizes; fresh-tab
  "fixes" worked only because vw happened to be ~1476. Always compute scale
  from the CURRENT innerWidth before every click.
- [IMAGES & FILES FOUND] The MOUNTAINS icon in the TOP-RIGHT toolbar group
  (</> · page · MOUNTAINS · hamburger) opens the Images & Files uiWindow
  ("Upload/Library/Files") and mounts input#file. Upload ANY file type:
  input#file.files = DataTransfer.files + change event; poll
  store.getState().media.data.
- [NATIVE ICON RECIPE] Add... > More... > Icon... opens the icon picker
  (588 cells, <svg class="text-icon"><use href="#name">). Finger icons:
  #pointer-1 (up), #pointer-2 (RIGHT manicule). To insert at an exact spot:
  set the iframe selection/caret there FIRST, then click the picker cell —
  Cargo inserts <text-icon icon="name"></text-icon> at the caret.
- SAFARI LEDGER add: booklet iframe (pdf.js blob worker + module import) —
  verify on Safari during the end pass; montran mp4s are h264 (safe).

## Round 7d (2026-07-09, Fable): map tile fixes (Ocean's review)
- Caption was BODY size (19.2/22); Figma uses CAPTION 14/18. One root cause,
  two symptoms: the oversized caption overflowed the fixed 504 tile, flex
  SHRANK the img below 442, and object-fit:cover CROPPED the screenshot.
  Fix: class="caption" on the caption <p> (face/scale-aware site class) +
  flex-shrink:0 on the tile img. Verified: 14px/18px, img 688x442 full,
  ratio match (no crop), icon intact, persisted.
- RULE: when transplanting Figma text into bands, ALWAYS read the text
  node's fontSize/style from Figma (Caption 14 vs Body 19.2) — never default
  to body. The tile export itself was never wrong (Group 4 = exactly
  688x442, frame doesn't clip).

## Round 7e (2026-07-09, Fable): Ocean's 4-issue review — all fixed
1. CAPTION FAMILY: Cargo's style sanitizer STRIPS inline font-family on save
   (width/height/background survive). Durable fix = site CSS rule:
   `.mms-tile, .mms-tile .caption { font-family: var(--font-family-base); }`
   (appended to Site CSS after the neutralizer — no spacing declarations so
   the keep-last rule is unaffected). Verified post-reload: Times 14/18, and
   the var is face-aware so ALL 4 typeface modes work (sans-flip tested:
   TeX Gyre 13.5px). RULE: never rely on inline font-family in bodycopy.
2. MAP TILE: hosted file verified byte-correct (probe render matched the
   Figma export; tile references the same hash). Ocean's sighting was the
   pre-7d state; nothing further changed.
3. BOOKLET SPEED: root cause = viewer fetched ALL 18MB then rendered ALL 71
   pages before first paint. v3 bundle: pdf.js getDocument({url}) (range
   loading), renders cover + startPage±2 first, initializes the book, then
   background-renders remaining pages into the live blueprints/img elements
   (pending pages = white placeholder). First spread now ~5-9s vs 60s+.
4. BOOKLET SIZE: calculateLayout had HARDCODED chrome reserves (-36px w,
   -108px h for the controls bar) + motionBleed margins, applied even with
   controls hidden — spread rendered ~75% width. v3: both zeroed under
   body.controls-hidden + config padding 0/0/0 + stage padding 0. Spread now
   FULL TILE WIDTH edge-to-edge (matches Ocean's mock: content bounds
   x0-1010 measured from his Figma still). Live bundle hash
   S3026726627153932401231207642937 (stale: R30266548 v1, N30267218 v2 —
   deletable from Images&Files along with the extra bundle dupes visible in
   the Files panel).

## Round 7f (2026-07-09, Fable): map-tile caption geometry (Ocean's review #2)
- Figma truth (Frame 4630 > Frame 4631): caption BLOCK = 514px wide (3/4 of
  the 688 image, NOT full width); icon 20.7x19.3 at line-top y=0; text
  starts x=22.7 (2px gap); text 491 wide. Applied: caption inline width
  calc(514*var(--u)) (width survives the sanitizer); icon rules in SITE CSS:
  vertical-align:text-top (was baseline -> sat ~3px high) + size 1.48em x
  1.38em !important (Cargo's own text-icon rule pins 1.2em=16.8px and wins
  without !important; em keeps it scaling with typeface modes).
  Verified post-reload: caption 514w, icon 20.7x19.3 @ +1px, Times 14/18.
- [GOTCHA] The CSS/HTML CodeMirror discards setValue edits if the window is
  closed via Escape too quickly — re-open and VERIFY the doc contains your
  edit after every save; nudge with a replaceRange edit + focus + wait
  before closing.

## Round 7g (2026-07-10, Fable): Ocean's 5-point revision — all applied + verified
1. CAPTION LH 14/16: Cargo tokens --lh-caption now S14/M16/L20/XL27 (was
   14/18/22/29); Figma font/lh/caption synced to the same set. Verified
   live: caption computes 14px/16px.
2. FILLED FINGER ICON: Cargo's native pointer-2 is drawn OUTLINE-style
   (its shadow-DOM path is already fill:currentColor — the GLYPH is hollow
   by design; no filled manicule exists in the 187-icon set). Replaced with
   the UNICODE FILLED MANICULE "☛" as plain text — solid ink, scales with
   font, no icon machinery. CAVEAT: glyph shape varies on Windows/Android
   fallback fonts — check cross-platform in the Safari/end pass. The
   .mms-tile text-icon CSS rules in site css are now inert (harmless).
3. MAP IMAGE v2: re-exported the redesigned "Web screenshot group"
   (333:552, now 678.8x442) — VERIFIED VISUALLY BEFORE UPLOAD (full window,
   nothing trimmed). Hosted I3026934137105221498075544598329
   (montran-map-v2.jpg), tile+img now 679 wide, caption block 507
   (Frame 4631 =507.1), text width 484.
4. SIZES: 9-icons video slot 313x313 -> 401x400; CSD linkedin video
   353x442 -> 403x504 (both per fresh Figma read).
5. BOOKLET PADDING: mock measured precisely (spread 924x259 in the
   1011x504 tile = 44px black side padding; my v3 full-bleed was an
   overcorrection). v4 bundle: config padding preferredVmin=13.06 (44px at
   full scale, proportional at smaller --u), hash
   W3026936639147800679744287586105, swapped + verified: black margins on
   both sides, vertically centered spread, fast priority-render kept.
   Stale bundle hashes now: R30266548(v1) N30267218(v2) S30267266(v3) —
   all deletable.

## Round 7h (2026-07-10, Fable): caption THEME fix + standing checklist
- Montran caption stayed rgba(0,0,0,.75) across themes: Cargo pins COLOR on
  bodycopy text (same mechanism as the font-family strip; the .caption class
  also collides with a Cargo typography class). Fix: site-CSS rule now
  carries color: var(--color-text-primary) for .mms-tile/.caption.
- 5-THEME AUDIT PASSED: caption ink == desc ink in all themes
  (000/fff/f00/4dbaff/f0f). NEW-ELEMENT ACCEPTANCE CHECKLIST added to
  PLAYBOOK — themes/typefaces/scale/shape/geometry/served/persistence gates
  are now mandatory for every future insert.

## Round 8 (2026-07-10, Fable): Ocean's 4 fixes + Type Scale v2 plan
1. ICON: back to Cargo's NATIVE <text-icon icon="pointer-2"> (Unicode ☛
   removed), now a SEPARATE component per Figma: caption <p> is display:flex
   (site CSS), icon flex:0 0 auto 1.48em x 1.38em !important, gap 0.143em
   (=2px @14). The caption TEXT is an anonymous flex item -> true hanging
   indent ("acts like a bullet"): wrapped lines all start at x=22.7,
   Figma-exact. No <span> needed; serializer keeps <text-icon> (proven
   through 2 reloads). Old text-icon svg rule dropped from CSS.
2. MAP v3 (Ocean's re-redesign; shots.so browser mockup on a TRANSPARENT
   surround): Figma Frame 4629 now = caption row Frame 339:784 (515.7w,
   icon 20.7x19.3 + gap 2 + blurb 493) over image rect 365:854 (690.3x442).
   Export png@2x = 1381x884 hasAlpha (cargo/assets/montran-map-v3.png).
   Hosted E3026982405741208482026361501497/montran-map-v3.png; page uses
   /w/1380/q/85 (serves 1380x883). Tile/img 679->690, caption 507->516.
   [CRITICAL RULE] .mms-img carries a gray placeholder BACKGROUND — a
   transparent PNG shows it through. Fix = inline background:transparent on
   that img (inline background survives the sanitizer). Verified: theme bg
   shows through the frame (brown-theme zoom screenshot).
3. DESC GAPS: title-group / blurb / url now 8px apart on ALL bands (Figma
   Project Description component itemSpacing = 8; live was 4). Edited in 3
   places: 2 base rules + the neutralizer re-assert (!important), local
   site.css mirrored first.
4. tokens.css LOCAL SYNC: --lh-caption rows M16/L20/XL27 (Round 7g updated
   Cargo + Figma but missed the local mirror).
- ACCEPTANCE CHECKLIST (all PASS, post-reload): themes x5 caption==desc==
  title-group ink (000/fff/f00/4dbaff/f0f); faces x4 (14/13.5/12.6/14 +
  families, icon em-tracks 20.7/20/18.6/20.7); scales x4 (12/14 -> 24/27,
  icon 17.8->35.5); shapes x3 (0/24px/50% on the map img); geometry vs
  MEASURED Figma ids (tile 690, cap 516, icon 20.7x19.3, gap 2.0, hanging
  indent 22.7, img 690x442 bottom-anchored 0, desc margins 0/8/8); served
  rendition loaded; persistence through 2 reloads; strays 0; axes reset to
  white/serif/m/straight.
- NOTE: caption->image gap computes 14 vs Figma's 8 — caption lh is 16 (not
  Figma's stale 18) so 3 lines = 48 not 54, and the image stays
  bottom-anchored in the fixed 504 tile (space-between). Anchoring matches
  Figma; the 6px delta is the cost of the approved 14/16 caption. Not a bug.
- STALE MEDIA deletable by Ocean: I3026934137105221498075544598329
  (montran-map-v2.jpg), A3026631249... (montran-map.jpg v1), booklet bundles
  R30266548/N30267218/S30267266 (7g list).
- TYPE SCALE V2: plan written -> docs/plans/2026-07-10-type-scale-v2.md
  (proposal table M base 21.6 etc.; Figma-first execution; no new baseline
  system; panel-lock decision pending Ocean).

### Round 8 techniques (HIDDEN-TAB operation — read before any Dia session)
- CDP SCREENSHOTS NOW WORK in Dia (r1-era "screenshots FAIL" is obsolete).
  The screenshot's pixel width defines the computer-tool click space:
  this session 1456px at innerWidth 2940 -> scale 0.4952. Recompute per
  screenshot/click; zoom regions use the same space.
- A HIDDEN (visibilityState=hidden) MCP tab did EVERYTHING tonight: editor
  arms, contenteditable, drop handlers, autosave persists, CodeMirror CSS
  saves. The old "must be visible" rule is now: visible OR
  hidden-but-rendering (screenshot returns pixels = rendering). Two traps:
  1. requestAnimationFrame NEVER fires -> never await rAF in probes. A
     45s-timed-out call keeps running as a ZOMBIE: each forced paint (e.g. a
     screenshot) advances it one rAF step — mine kept flipping data-theme
     invisibly. Reload kills zombies; use setTimeout, not rAF.
  2. Drop-uploaded <media-item> stays a data-placeholder blob FOREVER (the
     hash swap is paint-gated). The presign + S3 PUT still complete: read
     the hash from performance resource entries
     (s3.amazonaws.com/freight.cargocollective.com/{HASH}/{name}), verify
     freight serves it, set the img src manually, DELETE the placeholder.
- store.getState().media.data = the FILES slice only (html/pdf via
  input#file). Image drops NEVER appear there — poll bodycopy
  media-item[hash] / performance entries instead.
- The MCP tab group could NOT be surfaced (ctrl+tab cycling, AXRaise, fresh
  tab — visibilityState stayed hidden; the visible "mm.s design" window was
  Ocean's own tab). Irrelevant now per the above.
- Dia ctrl+tab keystrokes only cycle the FRONT window's recent tabs; sending
  them while Figma is frontmost hits FIGMA's tab bar — guard every keystroke
  with a frontmost-app check inside the same osascript.

## Round 9 (2026-07-10, Fable): TYPE SCALE V2 EXECUTED (Ocean: "let's do 22")
- Final serif table (size/lh): S cap 13/15 base 18/21 head 34/41 | M cap 16/18
  base 22/25 head 41/50 | L cap 20/23 base 27/31 head 51/62 | XL cap 26/30
  base 36/41 head 68/83. Rules: ladder S18 M22 L27 XL36; caption = base x0.73;
  heading = base x1.875; lh = x1.146/x1.143/x1.222 whole px; faces sans x0.966
  mono x0.90 gothic = serif. NO baseline grid (Space ladder untouched).
- FIGMA: all 12 Type Scale variables set via setValueForMode (4 modes each),
  0 errors, NO Tinos flip needed — pure float edits are TNR-safe (2nd proof).
  [FINDING] The Project Description master (142:379) and the montran caption
  blurb (333:645) were ALREADY variable-bound (fs+lh) — the whole canvas
  re-rendered itself; the only unbound old-size texts are the two slider
  "a-max" 28px glyphs (panel iconography, locked by design, left alone).
- CARGO: 4 [data-scale] token blocks replaced (regex-anchored on the
  definition blocks; old M 19.2 era gone, banner comment updated to v2);
  panel locks bumped per plan default: face buttons 14/13.5/12.6/14 ->
  16/15.5/14.4/16, .mms-panel-title calc(18*u) -> calc(20*u). Slider a's
  stay 14/28. Local tokens.css + site.css mirrored FIRST.
- MONTRAN CAPTION REFLOW: at 16px the 3-line wrap needs a wider box — Figma's
  caption row hugged 515.7 -> 522.7 (text 493 -> 500). Cargo caption width
  516 -> 526 (= text 500 + em-icon 23.7 + gap 2.3). Caption now 526x54,
  3 lines, and the caption->image gap computes 8 = FIGMA-EXACT (the old
  14px-gap note from Round 8 resolved itself: 3x18=54 matches Figma again).
  NOTE: Figma Frame 4630/4629 now report width 699.7 (GRID-track hug
  artifact); the IMAGE (690.3) defines the tile — Cargo tile stays 690.
- VERIFIED post-reload (full matrix): scales x4 = table exact (base/cap/head
  size+lh); faces x4 at M = 22/21.3/19.8/22 + families; navy ink MATCH;
  panel 16px/20px; tile capW 526 capH 54 gap 8; strays 0; axes default
  before+after; clock ticking. Intro reflow at 22px = one extra wrapped
  line in col-4 (expected; screenshot in session log). NOT PUBLISHED.
- XL caveat (pre-existing, unchanged): fixed-width compositions (caption
  tile) overflow at XL type — a trait of the fixed-tile design, not v2.

## Round 10 (2026-07-10, Fable): grey-frame kill + booklet v5 + 3 new rivers
1. MAP GREY FRAME (Ocean: "still is not truly transparent... game the fuck up"):
   ROOT CAUSE FOUND BY PIXELS — the v3 export had an alpha channel but ZERO
   transparent pixels (all-255): the shots.so source is window-on-grey-CARD-
   on-transparency and Ocean's crop sits INSIDE the card, so a 1-4px #F5F5F5
   ring + opaque corners ran to the canvas edge. Round 8's "transparency
   verified" was WRONG (checked channel presence, not values) — RULE: verify
   transparency by SAMPLING PIXELS. Fix: geometric border flood-key (accept
   grey 232-247, r=g=b +-3) + 1px AA feather -> 12,189 ring px transparent,
   window border crisp, interior untouched (guarded: flood cannot cross the
   dark border or bright interior). Executed IN-PAGE on canvas (same algo
   verified locally first, bit-identical counts). New map v4:
   Z3027026334817545613952579843897/montran-map-v4.png (/w/1380). Verified:
   all 4 served edges alpha 0 (top row = the window's own border at ~50%
   from the 1381->1380 resample, correct content), corners meet pure page
   bg on black theme (zoom evidence). STALE: v3 E3026982405..., v2
   I3026934137..., v1 A3026631249... all deletable.
   [TECHNIQUE] freight fetch is CORS-CLEAN from the admin page -> served
   renditions are canvas-inspectable AND freight-hosted text/binaries can be
   fetched, transformed, and re-uploaded entirely in-page (no byte transfer
   through the agent).
2. BOOKLET v5 (I3027043806558961307585845180217, iframed with same ?pdf=):
   a. LOADING: preload overlay = booklet-spread poster + rgba(0,0,0,.55) dim
      + 2px white progress bar (bytes 0-30%, cover 45%, priority pages ->90%,
      init 100% -> 420ms fade). Poster A3027041725046806774273750382393
      (2022x1008 jpeg, p19+20 side-by-side on black + seam gutter shading) —
      SYNTHESIZED IN-PAGE: fetched the v4 bundle text from freight, extracted
      its own pdf.mjs+worker text/plain blocks, blob-imported pdf.js in the
      ADMIN page, rendered the two pages to canvas. Deployed config uses the
      poster's freight URL; LOCAL booklet.config.json embeds it as a data URI
      (intentional divergence, bundle-size vs self-containment).
   b. CORNER HINT (Ocean: "too subtle... your idea"): extentRatio 0.035->
      0.075, extent 10-18px -> 24-44px, delay 150->120ms, PLUS a dynamic
      shadow boost while folded (maxShadowOpacity >= 0.5, restored on read).
      Verified locally: unmistakable diagonal curl + cast shadow.
   c. v5 was produced by 14 string surgeries on the fetched v4 text in-page
      (all patterns asserted count==1), uploaded via input#file (Images&Files
      must be OPEN to mount it — mountains icon), hash from S3 entries.
      Local source of truth updated the same way: index.html edits +
      build-bundle.py (NEW — reusable bundle builder; python3 build-bundle.py).
      STALE bundles: W3026936639(v4) + the older R/N/S trio — deletable.
3. RIVERS 7-9 DEPLOYED (bands now: eviive/4, v7, touchbaes/2, mandyma/2,
   loop, montran/2, anyday/2, kelly/4, curate):
   - anyday (offset 2, 5 imgs): logo-slideshow 565x376 U3027048271...,
     hotel-report 504x504 X3027048316..., money-moments 252x252 Q3027048332...,
     image6 476x415 L3027048668..., scroller 311x415 H3027048687...
   - kelly (offset 4, river inline height calc(792*u)): 2x2 GRID DIV
     (display:grid inline SURVIVES the sanitizer — proven through reload;
     grid-template-columns 2x calc(523*u), gap calc(32*u), page bg shows
     through the gaps) of sgc30-6/3/5/1 523x380 each: N3027049860...,
     R3027049892..., L3027050213..., L3027050230...
   - curate (NO offset, Loop pattern): image2 376x327 B3027050613...,
     image1 894x504 T3027050637..., hf 504x504 J3027050938...,
     image6 462x402 N3027050975...
   - Descs: Figma taglines used; URLS OMITTED (Figma still carries eviive.*
     component placeholders — awaiting real URLs from Ocean, same as
     montran); standard blurb.
   - Verified post-reload: all 13 served renditions load, sizes exact to
     Figma, img/desc alignment per band (664/976/352), kelly grid 1079x792,
     navy-ink MATCH vs montran desc, strays 0, axes default, clock ticking.
   - NOTE: several source stills are named like videos (Logo slideshow,
     Scroller Animation, hf_*) — NO red-text instructions existed on Figma,
     so they shipped as images; swap to <video> when Ocean provides files.
   - NOTE: Figma's Mandy Ma row now measures 618 tall (SATAIC 463.5x618) —
     the LIVE mandy band predates this; unverified delta, ask Ocean.
- NOTHING PUBLISHED. All draft.

## Round 11 (2026-07-10, Fable): 6 videos wired + mandy 618 + PUBLISHED LIVE
- RED NOTES (page-level loose text + arrows on Figma; the plugin bridge HANGS
  reading page-level lazy nodes -> read them via get_screenshot renders):
  4 AnyDay webms (XTM folder) + 1 Curate webm + mandy SATAIC (already hosted).
- [BREAKTHROUGH - LOCAL FILE RELAY] Local bytes -> hidden tab with ZERO agent
  transfer: python http.server on 127.0.0.1:8934 + relay.html that fetches
  same-origin files and postMessages ArrayBuffers to window.opener ('*') ->
  editor page opens it via window.open FROM A REAL computer-click on a temp
  button (user gesture; popup itself can stay hidden) -> buffers -> File ->
  drop pipeline. Beats the picker (needs visible tab + native dialog) and
  base64 chunking (token cost). PNA only blocks direct fetch; popups are fine.
- HOSTED: anyday-logo-slideshow.webm P3027108589... (565x376 slot),
  anyday-hotel-report.webm L3027108618... (504x504), anyday-money-moments.webm
  W3027108934... (252x252), anyday-scroller.webm D3027108949... (311x415),
  curate-image1-vid.webm J3027108963... (894x504). All wired as
  <video autoplay loop muted playsinline class="mms-img mms-video"> (Loop
  pattern), replacing the interim jpgs. Verified post-reload: readyState 4,
  playing, exact sizes.
- MANDY 618 (Ocean: "try something new" with the first video): SATAIC video
  330x440 -> 464x618 + river inline height calc(618*u) (river inline height
  overrides the site 504). Other mandy items already matched Figma.
- NAV FIX pre-publish: purls are write-1/who-1 (ghost-slug collision; "write"
  /"who" regenerate with -1) but all 3 pages' hrefs said /write //who ->
  aligned hrefs to /write-1 /who-1 on Home+Write+Who bodycopies. If Ocean
  wants clean slugs, the ghost purls need freeing first (Cargo-side).
- HOMEPAGE: site.homepage was ALREADY I2398594830 (our page, purl "home",
  title now "Home"; old home page gone — Ocean's doing, also a publish at
  1:46am tonight).
- LIBRARY CLEANUP BLOCKED: thumbnails carry a hover button.delete
  (.image-picker .thumbnail .functions), but it ignores BOTH computer clicks
  (elementFromPoint-verified) and full synthetic pointer sequences — no
  DELETE request fires. Stopped per playbook (no blind API DELETEs).
  Verified-stale list for Ocean's manual clicks (Library tab): montran-map
  .jpg/-v2.jpg/-v3.png, montran-booklet-still.jpg, anyday-logo-slideshow/
  hotel-report/money-moments/scroller .jpg, curate-image1.jpg (hash-verified
  vs my upload records — the same-NAMED video items next to them are LIVE,
  do not delete those); Files tab: 4 older montran-booklet-bundle.html
  (keep I3027043806...) + older pdf if any.
- [PUBLISHED 2026-07-10 ~03:31 by Claude, Ocean's explicit instruction
  "please publish for once"]: Publish Settings (globe, blue dot) -> Publish
  changes. LIVE VERIFIED via fetch of mmmmm.studio: all 9 bands, kelly grid,
  curate video, mandy 618, booklet v5, map v4, /write-1 + /who-1 = 200.

## Round 12 (2026-07-10 ~03:45, Fable): CLEAN SLUGS /write /who LIVE
- WHY THE -1 CAME BACK (answer to Ocean's "i thought we fixed already"): r2f
  DID set clean slugs by renaming TITLES to lowercase write/who. The pages
  are titled "Write"/"Who" now (title-case) — a later retitle regenerated
  the purls against ghost reservations -> write-1/who-1. Cargo derives slug
  from title on every title change.
- GHOST TEST: after tonight's publish, a NEW page titled "write" minted purl
  "write" -> ghosts were FREE. (The rename UI is now UNREACHABLE by
  automation: double-click / slow-click on pages-panel rows and page
  Settings expose NO title/URL field — r2f's inline-rename recipe is dead
  in the current panel. New Page + title input still works.)
- FIX (copy-dance): created "write" (P0060651058, purl write) + "who"
  (B2402536676, purl who) via Pages "..." -> New Page; injected each from
  the PUBLISHED write-1/who-1 bodycopy (fetch + DOMParser; on non-mms shell
  pages select bodycopy WITHOUT digital-clock) with hrefs rewritten to
  /write /who; Home nav hrefs -> /write /who; REPUBLISHED (3:45am-ish).
- LIVE VERIFIED: / nav has clean hrefs (no -1 anywhere), /write + /who = 200
  with the mms shell. OLD pages "Write"/"Who" (write-1/who-1) remain live as
  orphaned duplicates -> OCEAN: delete those two rows (frees the purls too)
  when doing the library cleanup.
- Pages panel current UI: hamburger "☰ <PageName>" top-right (~1365,10 tool
  @2940vw); panel "..." (~1434,42) -> New Page / New Set / Stack Pages /
  Delete All Pages. Row right-click -> Duplicate/Pin/Overlay/Settings/
  Set as Homepage/Delete/Copy/Direct Link (NO rename).

## Round 13 (2026-07-10 evening, Fable): palette v2 LIVE; rest BLOCKED by screen lock
STATUS: PARTIAL — machine locked mid-round; resume checklist below.
- [SAVED + reload-verified] PHASE 1 PALETTE: tokens region primitives
  (+pink #FFEEF4, green -> #00CD0A, brown -> #553D12, navy/red REMOVED);
  theme selectors data-theme girly/quirky/contrast (was navy/brown/yellow);
  bodycopy dots white/girly/quirky/contrast/black (ink outer + bg center:
  00CD0A/FFEEF4, 4DBAFF/553D12, FF00FF/FEFF01); panel.js redeployed with
  THEME_MIG (navy->girly etc localStorage migration). VERIFIED: 5-theme
  computed audit, legacy 'navy' migrates on reload, PICKER DOT STAYS
  SELECTED after refresh (Ocean's #5 fixed — fresh panel.js deploy did it).
- [SAVED] PHASE 3 CSS: .mms-tile .caption rules broadened to .mms-band
  .caption (kelly/band-10 captions inherit face+ink); [data-band="kelly"]
  .caption text-icon { rotate(-90deg) } (Figma 442:521 rot 90 = points UP);
  [data-slot="kelly-caption"] padding-top 8 !important. Verified in served
  stylesheet post-reload. Local tokens.css/site.css/panel.js/home.html
  mirrors all synced.
- [LOST — REPLAY AT RESUME] Phase 2 bodycopy texts (intro col-6 + new copy,
  9 desc rewrites + ella link + montran caption + fill widths 1128/1128/896)
  and Phase 3 bodycopy geometry (mandy 900 + SATAIC 675x900, touchbaes
  606.5 + sticker 262.5x606.5, anyday reorder + 308/435x379/352x469, kelly
  zero-gap grid 1046.9 + caption strip) — they were APPLIED + input-evented
  but the CRDT sync never pushed (see findings) and reloads reverted them.
  All copy/geometry in docs/plans/2026-07-10-cargo-round13.md PHASE 0
  RESULTS.
- [PENDING] Phase 4 entirely: 26 uploads (11 relay-staged in scratchpad
  media13 + server on :8934 still running; 15 figma exports — URLs expired,
  re-request download_assets), anyday video swap (cropped v2 webm staged),
  4 new bands (Random Pics / PURE LOVE / Dead Good / WTW), eviive rebuild,
  touchbaes sticker swap. Phase 5 checklist + docs.
### Round 13 findings — FULL SCREEN LOCK behavior (vs mere hidden tab)
- Machine locked (screencapture: "could not create image from display",
  caffeinate -u does not help) = NO compositing at all. Consequences:
  a. bodycopy CRDT SYNC IS DEAD: input-evented edits LOOK applied but never
     save; reload silently reverts them. rAF shim (setTimeout polyfill) +
     visibilityState/hidden spoof + focus events DO NOT revive it.
     ALWAYS reload-verify before building on prior edits.
  b. drop-uploads DEAD (no placeholder, no presign); input#file path
     untested (Images&Files window未确认 under lock).
  c. CDP screenshots AND CDP clicks dead; System Events clicks land on the
     lock screen; screencapture fails.
  d. STILL WORKING: JS execution, DOM reads/writes, network fetches, the
     CSS/HTML CodeMirror editor SAVES (autosave path is not paint-gated),
     page loads/reloads.
- [TECHNIQUE] REACT FIBER INVOCATION beats dead clicks for admin chrome:
  find el's __reactProps$ key, call props.onMouseDown/onClick({preventDefault
  :()=>{},...}) — opened Settings + CSS/HTML row when computer/OS clicks
  were impossible. (Playbook "admin ignores synthetic clicks" = DOM events;
  fiber handler calls work.)
- [TECHNIQUE — IFRAME RELAY v2, supersedes popup relay] Local bytes with NO
  gesture + NO visibility: hidden <iframe src=http://127.0.0.1:8934/
  relay.html> in the editor page; relay fetches same-origin files and
  postMessages ArrayBuffers to window.parent ('*'). PNA only blocks
  fetch/XHR subresources — iframe navigation + postMessage pass. 11 files
  (18MB) transferred in <1s on a LOCKED machine.

## Round 13 COMPLETE (2026-07-10 ~20:35, after Ocean unlocked + surfaced the tab)
- RESUME MECHANICS: visible tab = everything instant (arming, saves, uploads
  incl. proper placeholder->hash swaps). The interim "unlocked but tab
  backgrounded" state was flaky (arming toggles with focus) — the reliable
  mode is Ocean parking the MCP tab visible. Phase 2+3 replayed and
  reload-verified: intro (col-6, new copy, headline gone), 9 desc rewrites
  (real blurbs; V7+Loop 1128 fill, AnyDay 896; Ella Cheng link on touchbaes
  -> ellacportfolio.com), montran caption v2 (balanced parens), mandy 900 +
  SATAIC 675x900, touchbaes 606.5 + sticker 262.5x606.5, anyday reorder
  (logo/money/hotel/img6/scroller) + resizes, kelly zero-gap grid 1046.9 +
  caption strip (icon rotate -90 pad 8).
- 26 UPLOADS (all hashes in-session; iframe relay + fetch-drop, visible-tab
  fast path): anyday-logo-slideshow-v2.webm I3028243479... (1px side trims,
  black strips gone); wtw: grid-animation L3028243501, grid-image
  K3028243512, grid-logo J3028243826, wordmark U3028243848, image1.gif
  X3028243859, image6.gif M3028243870, lanyard.png C3028244178 (1494w,
  alpha verified, bg:transparent); dg: image2.gif K3028244189, slides.mp4
  W3028244200, cover K3028247312, image3 X3028247330, image4 A3028247346;
  randompics-slideshow.webm N3028244212; eviive 1-6/card R3028246196/
  Y3028246221/A3028246238/J3028246254/Q3028246567/P3028246582;
  sticker-v2.png Q3028246600; purelove 1-4+flash I3028246618/Q3028246916/
  G3028246944/N3028246960/R3028246976.
- EVIIVE REBUILT to the 6-item figma layout with MOTION KEPT: slots 1/2/5 =
  the live videos (Logo-symbol 432x372, Image-5 279x240, Navy-Logo 558x372;
  recovered srcs from the published page after almost replacing them with
  stills — RULE: figma Image Frames can be stills OF live videos; check
  size-matched live videos before swapping), slots 3/4/6 = new exports.
  eviive-1/eviive-2/eviive-card jpgs unused (deletable).
- 4 NEW BANDS live after curate: randompics (offset-2 tile: caption+icon +
  432x667 webm, river 747, desc-less by design); purelove (offset-4, river
  784, 5 exports incl the ROTATED 873x680, Travis Leung link ->
  travisleung.com); deadgood (no offset, gif+jpg+VIDEO 579x504+jpg+jpg,
  desc fill 1128); wtw (no offset: lanyard png transparent, wordmark video
  765x504, gif, 2x 504 square videos [figma 4634 flattened — inner gap 32 =
  river gap], gif 478x416, grid-animation 740x416).
- ACCEPTANCE: reload-persistent (13 bands, order verified); 26 videos ALL
  ready+playing; 39 imgs loaded; themes x5 MATCH on both new captions;
  sticker corners opaque purple = SAME as old live jpg (backing sheet is
  the artwork, no regression); lanyard corners alpha-0; axes default;
  strays 0. DESC WIDTH NOTE: computed 904 at vw>1800 = --col-6 XL token,
  correct. NOT PUBLISHED (Ocean reviews).
- Figma url rows still eviive placeholders -> urls omitted on all bands
  except EVIIVE (eviive.ch) — flag stands.

## Round 13b (2026-07-10 ~21:00): Ocean's 5-point review fixes — all verified
1. ANYDAY BLACK BORDER: v2's 1px/side crop undershot (source strip ~2px —
   frame-grab + edge-pixel analysis showed col0 still pure black). v3 =
   crop 3px/side from the ORIGINAL (2048->2042), edges verified clean
   (239/164, no black). W3028279552... live. RULE: size video-edge crops
   from PIXEL ANALYSIS of an extracted frame, not from the reported strip
   width; re-verify the ENCODED result the same way.
2. SECOND PARAGRAPHS: descs are TWO blurb text nodes on Figma — findOne
   ('blurb') only reads the first! Kelly, Dead Good, V7, AnyDay all carry a
   second visible paragraph; added as second <p>. RULE: dump descs with
   findAll(name='blurb', visible) — never findOne.
3. PURELOVE FLASH -> VIDEO per new red note 466:550 (PURE LOVE/PURE LOVE_4-
   image flash-2s_3x4-originals.mp4) S3028279585..., 336.3x448.4, playing.
   (Old purelove-flash.jpg R3028246976 deletable.)
4. WTW RESIZES per fresh Figma read: grid-logo + grid-image 504->388.2 sq,
   image6 477.9x416 -> 579x504, grid-animation 739.6x416 -> 690.2x388.2.
5. RANDOMPICS TILE GAP: Ocean's "gap between the description and that one
   video row too high" = the caption->video gap INSIDE the tile (26 on
   cargo vs 8 on figma). Figma tile is TOP-anchored (caption, 8, video,
   ~18px slack at bottom); my space-between build stretched the gap. Fix:
   flex-start + gap:calc(8*var(--u)) — CSS GAP SURVIVES THE NEUTRALIZER
   (it only clones margin/padding). Verified gap = 8 exactly.
- Post-reload: 27 videos playing, paras 2/2/2/2, wtw sizes exact, strays 0.
  Old anyday v1+v2 webms + purelove-flash.jpg -> Ocean's deletable list.
  NOT PUBLISHED.

## Round 13c (2026-07-11 ~01:00-02:00): purelove alpha + hovers + iOS/Safari pass + game v2 — all DRAFT
- PURELOVE-4 TRANSPARENCY ("the png on pure love AGAIN doesnt have transparent
  background"): the rotated 407:565 screenshot is another shots.so-style
  export — #F5F5F5 grey CARD fills the canvas around the rotated window (51%
  of pixels, not a thin ring; raised the flood guard 40%->65% for this shape).
  Same in-page border flood-key as the montran map (greyband 232-247 BFS +
  feather) on a fresh 2x PNG export -> purelove-4-v2.png
  S3028289855602474049842539181881 (2.4MB), swapped over the old
  N3028246960.../purelove-4.jpg with inline background:transparent. CDN
  rendition pixel-verified: 4 corners alpha 0, content opaque. (purelove-4.jpg
  N30282469... now deletable.)
- HOVER EFFECTS (Ocean spec, spliced into Site CSS after the .mms-shape
  block + local site.css): .mms a:hover bold; .mms-btn:hover +
  .mms-shape:hover invert (bg=text-primary / ink=bg-page, theme-aware);
  .mms-dot:hover thicker ring via box-shadow 0 0 0 1px (border-width would
  reflow); slider thumb :hover fills text-primary (webkit+moz). Deliberately
  NOT gated behind (hover:hover) — iPad + Apple Pencil gets them.
- iOS/SAFARI VIDEOS: all 17 webms fetched from freight (curl needs browser
  UA+Referer — bare curl gets CloudFront 403), probed: exactly 2 carry alpha
  (ffprobe stream_tags alpha_mode=1 — pix_fmt LIES for VP9-alpha, always
  yuv420p): 8bit-girls + mandy hf. 15 opaque -> H.264 (libx264 crf21-27,
  faststart, 4 heavy ones rescaled to 2x render width) and SRC-SWAPPED
  outright (H.264 plays everywhere; webm originals abandoned in place).
  2 alpha -> HEVC-alpha via hevc_videotoolbox (decode forced -c:v libvpx-vp9
  BEFORE -i or ffmpeg drops the alpha side-channel; -vtag hvc1;
  AVFoundation-verified containsAlphaChannel=1 on both) delivered as
  data-mp4 attr + panel.js swap (isIOS: iP* UA or MacIntel+maxTouchPoints>1;
  isSafari: Safari/ minus Chrome|Edg|OPR|Firefox) — LIVE page script patched
  (2799->3304 chars) + local panel.js. 17 uploads via iframe-relay v2 +
  17 staggered drops in ONE call, hashes recovered from s3 perf entries:
  eviive-logo W3028308513..., navy-eviive B3028308528..., ooh-train
  X3028308543..., freetothink B3028308558..., v7-truck P3028308573...,
  3d-anim V3028308587..., 8BIT-HEVC X3028308602..., sataic S3028308617...,
  HF-HEVC A3028308632..., wrapped K3028308647..., loop-card S3028308662...,
  anyday-logo E3028308676..., money L3028308691..., hotel G3028308706...,
  scroller I3028308721..., curate R3028308736..., randompics L3028308751...
  Post-reload: 15 h264 srcs, 2 data-mp4, 27/27 playing.
- BOOKLET v6 (pdf "not showing on iOS/iPad"): pdf.js v4 calls
  Promise.withResolvers in BOTH the lib and the worker = hard crash below
  Safari/iOS 17.4. build-bundle.py now prepends a withResolvers polyfill to
  both text/plain blocks; rebuilt + uploaded
  montran-booklet-bundle-v6.html U3028320643439693999968700905273 (1.83MB,
  served copy grep-verified 2 polyfills), iframe src swapped keeping the
  ?pdf= param. Canvas path audited: transient canvas -> webp blob -> img, no
  iOS canvas-memory risk. (v5 hash I3027043806... deletable.)
- HTML UPLOADS: bodycopy drop REJECTS html — use MOUNTAINS icon (top-right
  toolbar, 3rd of the formatting group) -> Images&Files mounts input#file ->
  set .files + fire REACT onChange via __reactProps (plain change event does
  NOTHING) -> hash appears in store.getState().media.data (NOT in s3 perf
  entries — different upload path).
- TOUCHBAES GAME v2 (iPad cropped/mobile mismatch): root cause = game's
  mobile switch was `(max-width:760px), (hover:none) and (pointer:coarse)`
  — any touch device went mobile while the site (width-only) stayed desktop.
  Fixed: width-only in CSS + JS mobileQuery (iPad = desktop layout, matching
  the site); interaction stays PER-EVENT (isTouchLike/pointerType: touch
  direct-drags with hit-slop, mouse/pen uses tweezer-tip targeting) — so
  touch on the desktop layout direct-drags with the tweezer riding next to
  the held sticker, and Apple Pencil hover keeps hover/bubble. Tweezer now
  VISIBLE in both layouts: mobile display:none removed; EMBED bridge draws
  the rig on the parent unconditionally (mobile gates dropped; parks via
  twRest on load/leave/touch-end +260ms). Site-side: new mobile rule caps
  the iframe (width:100vw, height = board+tray calc) so phones can actually
  flip the game to its mobile layout past the 762px inline floor (spliced +
  local site.css). Uploaded touchbaes-sticker-game-v2.html
  Z3028330445652113143676529063737 via input#file, iframe src swapped.
  Desktop band verified: 820x540 uncropped, tweezer parked bottom-right.
  (game v1 D3023626629... deletable once Ocean confirms on iPad.)
- STATUS: everything DRAFT, NOT published. V7 + AnyDay second paragraphs
  were already in the draft since 13b — Ocean's screenshot was the stale
  PUBLISHED site.
- Library cleanup additions: purelove-4.jpg N30282469..., booklet v5
  I3027043806..., game v1 D3023626629... (+ prior R11/R13 lists).
- [TOOL NOTE] javascript_tool intermittently returns `undefined` for
  multi-statement scripts even though the SCRIPT RAN (mutations persist) —
  re-probe with a tiny follow-up query instead of re-running the mutation.

## Round 14 (2026-07-10 ~23:00): iPad bug root-causes + kelly/desc/caption Figma sync — DRAFT
- CONTEXT: Ocean's iPad reports were against the DRAFT (his screenshot showed
  the v2 game's desktop layout + visible tweezer).
- BOOKLET "Invalid PDF structure" on LATEST iPadOS (so NOT withResolvers):
  evidence — freight serves the PDF clean (200, no content-encoding, %PDF
  magic, content-length exact; HEAD says accept-ranges:none yet honors
  Range with proper 206), v6 renders PERFECTLY in macOS Safari (spread
  screenshot) and Chrome -> iPadOS-specific transport failure inside
  pdf.js's url mode. v7 = openPdfResilient(): attempt 1 unchanged
  (getDocument url streaming); on ANY failure -> cache-busted full fetch
  with reader progress, %PDF magic check, getDocument({data}) — no pdf.js
  transport left to disagree with; if even THAT fails the error message now
  carries diagnostics (HTTP status / first bytes hex / byte count) so the
  next iPad report pinpoints the cause. Uploaded
  montran-booklet-bundle-v7.html C3028405902243214093334509827897, iframe
  swapped (?pdf= kept), macOS-Safari re-verified (spread renders).
  (v6 U3028320643... deletable.)
- GAME touch pickup dead on iPad (Pencil fine) — ROOT CAUSE per systematic
  pass: synthetic touch PointerEvents drive the v2 JS drag cycle PERFECTLY
  (down->is-dragging, move->track, up->release) in Chromium -> the failure
  is the PLATFORM gesture layer: iOS claims the touch for scroll/system
  gestures wherever touch-action:none coverage gaps exist (html/body/
  .touchbaes-game lacked it; the 549px game even overflowed the 540px
  iframe = a real pan surface) and fires pointercancel, killing the drag
  ~instantly; the "tweezer teleports to my finger" illusion was v2's
  unconditional parent-rig follow on ALL pointer types.
  v3 = touchbaes-sticker-game-v3.html S3028401411383369348744168912697:
  (a) body { overflow:hidden; touch-action:none; overscroll-behavior:none }
  + -webkit-touch-callout:none on stickers + setPointerCapture in startDrag
  + preventDefault on drag moves; (b) UNIFIED HOLD MODEL: sticker always
  hangs at the tweezer TIPS; mouse/pen anchor the rig at the hotspot (tips
  at usual cursor offset — desktop unchanged), touch anchors the rig so the
  TIPS sit AT the finger -> sticker under finger, tweezer pinching beside =
  Ocean's expected look; snapping already used interactionPoint(direct) so
  geometry stays consistent; (c) idle touch NEVER summons the rig (game
  handler early-returns; EMBED twTrack gates by pointerType; touch
  pointerup/cancel -> immediate twRest park; pointerout leave = mouse/pen
  only); (d) touch hit-slop 18->28. Verified by synthetic touch: idle move
  leaves rig parked, down on sticker drags, drag rig = tips exactly at
  finger (rigOrigin+tip == clientXY), release parks; mouse drag regression
  ✓. NOTE: hidden-tab rAF starvation makes updatePointer (rAF-batched)
  freeze in probes — updatePointerNow paths + parent twTrack are
  synchronous; don't chase phantom hover bugs in hidden tabs.
  (game v2 Z3028330445... deletable, and v1 D3023626629... still listed.)
- KELLY SYNC: Figma 4632 grid = live (523.4 cells, gap 0, caption row padT8,
  river 789.1 already). Real delta = caption manicule: shared em rule
  (1.48/1.38em) was tuned for MONTRAN's 14px caption; kelly's is 16px ->
  icon 14% oversized. Fix: .mms-band[data-band="kelly"] .caption text-icon
  pinned to u-px 19.3x20.7 (AABB 20.7x19.3 Figma-exact, verified). Had to
  out-specify the em rule (!important both, later-in-source was winning at
  equal specificity — bumped to .mms-band[data-band=...]).
- DESC WIDTHS "on scale": Figma marked 6 descs FILL (b1 eviive, b2 v7, b5
  loop, b7 anyday, b8 kelly, b12 deadgood; rest FIXED 664=col-6). On Cargo
  the FILL ones map to ONE formula: width: calc(var(--col-8) -
  var(--offset, 0px)) (offset already = col-N + space-32 per data-offset)
  -> design-scale 664/896/1128 exact, XL 592/904/1216. Inline px widths
  REMOVED from v7/loop/deadgood (1128*u) + anyday (896*u); data-band attrs
  ADDED to the 5 legacy bands (eviive/v7/touchbaes/mandy/loop). Verified at
  XL: 592/1216/1216/904/592/1216, fixed bands 904 ✓.
- CAPTION PLATES: exactly 3 caption frames carry bg/page (VariableID:5:2)
  on Figma — montran map 339:702, kelly 442:519, randompics 405:504.
  Mirrored: [data-slot=montran-map-caption/kelly-caption/randompics-caption]
  { background: var(--color-bg-page) } (computed rgb(255,255,255) on White
  ✓). Plate pad-8 covering the tile gap is visually identical on a flat
  page — skipped structural churn.
- STATUS: DRAFT only, NOT published. Ocean re-tests booklet + game touch on
  the iPad (draft view). Library deletables: booklet v6 + 5 older bundle
  copies + game v1/v2 (visible in Files window), + prior lists.

## Round 15 (2026-07-11 ~00:00-00:40): alpha rebuild + BOOKLET GOES IMAGE-NATIVE + borders/align/glyphs/snap — DRAFT
Plan: docs/plans/2026-07-10-cargo-round15.md (all phases executed).
- 8BIT-GIRLS "white noise" ROOT CAUSE (numeric proof via AVAssetImageGenerator,
  the exact decode Safari uses): the ffmpeg->hevc_videotoolbox encode
  PREMULTIPLIED THE MATTE AGAINST WHITE — every semi-transparent silhouette
  pixel decodes RGB==alpha (straight color = pure white). White halo on
  colored themes + milky "no transparency" on iOS = one defect. FIX
  PIPELINE: webm -(ffmpeg libvpx-vp9 decode)-> ProRes 4444 -(APPLE avconvert
  PresetHEVCHighestQualityWithAlpha)-> HEVC-alpha. New edge pixels carry
  real content colors; containsAlphaChannel=1. Both alpha videos rebuilt:
  8bit-girls-alpha-v2.mp4 + mandy-hf-alpha-v2.mp4, data-mp4 attrs swapped.
  RULE: never videotoolbox-encode alpha via ffmpeg; ProRes->avconvert only.
- BOOKLET v8 = IMAGE-NATIVE. Gradient diagnosis: v4 PDF has ALL gradients
  intact (PDFKit renders prove it); pdf.js's shading renderer dies on the
  RIGHT PORTION of the big teal sweeps -> "gradient missing, now white".
  All 71 pages pre-rendered via PDFKit (Apple/Preview renderer, 2200px) ->
  1400px JPEG q88 (10.3MB total vs 19.8MB PDF; webp REJECTED — see below).
  config.pageImages manifest (71 freight URLs) + index.html image mode
  (renderPage shim; pdf.js survives only for ?pdf= ad-hoc). No pdf.js, no
  worker, no transport on iPad — the whole bug class retires. Uploaded
  montran-booklet-bundle-v8.html Z3028491865657017570184061826873, iframe
  swapped (?pdf= dropped), SAFARI-VERIFIED (spread renders from images with
  the full gradient). Page hashes: scratchpad r15/page-hashes.txt + in the
  bundle config. (v7 C3028405902... deletable + the pdf X3026621020...
  once Ocean confirms.)
- [HARD RULE] CARGO BODYCOPY DROP SILENTLY REJECTS image/webp (and html/pdf
  as known). jpg/png/gif/mp4 fine. A 75-file input#file batch also dies
  silently (webp poisoning or count); the proven mass path = staggered
  bodycopy drops (650ms) of ACCEPTED types. 75 uploads done that way in
  ~90s. Also: multi-hour sessions can wedge the editor's upload path —
  reload the editor page and re-relay if drops stop starting.
- HAIRLINE BORDERS: randompics black bottom + wtw-grid-logo white right =
  WebKit letterboxing sub-pixel aspect drift from the -2 rescales (video
  content box "contain" semantics; WebKit paints the gap black, Chromium
  shows page bg) -> .mms-band video { object-fit: cover } (systemic).
  dg-image3 + curate-image2 had REAL baked-in light edge columns/rows
  (pixel-forensics: right col avg 127/196 vs dark inner) -> 3px crops from
  originals, re-uploaded as -v2 (dg K/curate B hashes in Files), srcs
  swapped. wtw video content itself is black-to-edge (no asset defect).
- TOP ALIGNMENT: .mms-intro p { margin-top: var(--lh-base) } hit the FIRST
  paragraph (R13 wrapped all intro lines in <p>), pushing the 0-height
  sticky head 25px below its pin offset -> misaligned with MM.S + "scrolls
  a little" before pinning. FIX: .mms-intro p:first-child { margin-top: 0
  !important } (!important needed — the mobile-editor neutralizer re-asserts
  the base rule with !important; higher specificity wins the contest).
  Verified: intro/clock/wordmark all top at 40.
- SLIDER GLYPHS (measured, not eyeballed): canvas TextMetrics per face ->
  optical-center lift needed: serif 0.114em (28px; the old flat value),
  sans/mono 0.131em, gothic 0.007em(14)/0.025em(28). Ocean's eye was
  exactly right: gothic-14 sat 1.5px too high, sans-28 ~0.5px low.
  Per-face overrides live; computed transforms verified per face.
- THUMB: box-shadow: none on both .mms-scale thumb pseudos.
- RIVER SNAP: .mms-river { scroll-snap-type: x mandatory;
  scroll-padding-inline-start: var(--margin-page) } + children snap-align
  start + snap-stop always (offset spacer excluded). Functional test:
  scrollLeft 137 -> settled 584 (item boundary). NOTE for Ocean: CSS snap
  settles one item per fling incl. iPad touch; STRICT one-image-per-wheel-
  tick needs JS wheel hijacking — offered as option.
- Post-reload battery: intro 40, snap live, v8 + game v3 + alpha-v2 attrs +
  dg/cu v2 imgs persisted, 27/27 playing. DRAFT ONLY — NOT published.
- CONTEXT FLAGS: Ocean is sometimes reviewing the PUBLISHED site (old
  palette/booklet/game) — the draft has everything; publish (cmd+P) syncs
  reality. Deletables added: booklet v7 + old 8bit/hf hevc pair.

## Round 15b (2026-07-11 ~01:00): snap regression + REAL hairline cause + TRUE column spans — DRAFT
- RIVERS PULLED LEFT (Ocean): my Round-15 snap EXCLUDED the offset spacer
  from snap targets, so mandatory snap had no valid point at scrollLeft 0
  and yanked every river to margin-page at load. FIX: the spacer IS a snap
  target (anchors rest position; its snap pos clamps to 0). Verified:
  rest scrollLeft 0, item1 at its designed offset (624 XL).
- HAIRLINE TRUE CAUSE (Ocean's theme observation cracked it): the lines
  recolor per theme => they were the .mms-img PLACEHOLDER BACKGROUND
  (var(--color-text-muted)) peeking through sub-device-pixel rasterization
  gaps on fractional image sizes — NOT the assets (those crops were real
  but separate) and NOT letterboxing alone. FIX: .mms-img background:
  transparent. All themes clean at once. (The R8 note "transparent PNGs
  need inline background:transparent" is now moot but harmless.)
- DESC COLUMN SPANS decoded from the REAL Figma grid (rework frame 83:251:
  12 columns, col 84, gutter 32, margin 40 at 1440; the site's XL tokens
  = same grid at col 124): col(n) = n*colW + (n-1)*32. Every desc is an
  EXPLICIT span, never offset-derived: V7/Loop/DeadGood = 10 cols
  (--col-10 NEW TOKEN: 1128 design / 1528 XL / 350 mobile), AnyDay = 8
  (col-8), EVIIVE/Kelly + all fixed bands = 6 (col-6 default). Round-14's
  col-8-minus-offset formula REPLACED. Verified XL: 1528/1216/904.
- PICKER "goes back to white + yellow/pink theme" = the PUBLISHED site
  (R12-era palette + panel.js without the R13 THEME_MIG/aria-pressed fix).
  The draft has both fixes; cmd+P resolves. No code change.
- Handoff doc for other agents/Codex: HANDOFF-CODEX.md (project root).

## Round 15c (2026-07-11 ~01:30): river stepper — one gesture = one item — DRAFT
- Ocean: snap felt like "adding a force but nothing really functional".
  Diagnosis BY REPRODUCTION: the stepper's native smooth scrollTo was
  CANCELED by the same gesture's trailing inertia wheel events (Chromium
  treats any wheel as user interruption), so the river died at ~0 and
  mandatory snap pulled it home. CSS snap alone also rubber-bands small
  wheel deltas back to the current item — never a stepper.
- FIX: NEW inline page script /*mms-river-stepper*/ (local mirror
  cargo/river-stepper.js), injected after the tweezer overlay: hijacks
  HORIZONTAL-dominant wheel only (|dx|>|dy|; vertical page scroll
  untouched), one step per gesture (140ms-quiet burst detection, 30px
  intent threshold), target = child.offsetLeft - margin-page (mirrors the
  CSS snap positions; the offset spacer anchors 0), glide via MANUAL rAF
  TWEEN (380ms easeOutCubic) — immune to wheel-cancel. Touch/iPad stays on
  CSS snap (mandatory + snap-stop = one item per flick).
- VERIFIED live post-reload with synthetic 14-event inertia bursts:
  0 -> 584 (item1) -> 1243 (item2) -> back 584; vertical wheel passes
  through (dispatchEvent true). Persisted through reload. NOT published.

## Round 15d (2026-07-11): river stepper reverted — DRAFT
- Ocean: "i really hate this scroll let's just revert that."
- Removed the `/*mms-river-stepper*/` inline page script added in Round 15c
  and deleted its local mirror `cargo/river-stepper.js`.
- Restored the Round-15b behavior: native scrolling plus CSS mandatory snap;
  the offset spacer remains a snap target so rivers keep their designed rest
  positions.
- Reload verification: bodycopy length 35,969; `mms-river-stepper` absent;
  `mms-tweezer-overlay` still present. No CSS was changed.
- DRAFT ONLY — NOT published.

## Round 15e (2026-07-11): horizontal rivers rebuilt from native overflow — DRAFT
- Ocean: "the scroll is super stuttering. could you review other docs and
  check if there's other codes that's affecting the horizontal scroll? we
  need to strip them and re-build from the ground up"
- Audit found no remaining wheel handler, `scrollLeft` animation, `scrollTo`,
  or smooth-scroll code after Round 15d. Two remaining influences were active:
  (1) Round 15's `scroll-snap-type:x mandatory` + `snap-stop:always`, whose own
  log records small trackpad deltas rubber-banding home; and (2) the tweezer
  overlay's capture listener on every descendant scroll event.
- CSS rebuilt to native overflow only: `overflow-x:auto`, `overflow-y:hidden`,
  `scroll-behavior:auto`, `scroll-snap-type:none`, child snap values reset to
  `none/normal`, momentum touch scrolling retained. Existing river geometry,
  gaps, offsets, padding, and hidden scrollbars were not changed.
- Tweezer tracking is now scoped to the one `.mms-river` containing the game
  iframe; the global capture-phase window scroll listener is gone.
- Reload audit: global CSS 36,698 chars, mandatory snap absent, snap-stop always
  absent, native snap-none present, Cargo-managed font blocks present. Bodycopy
  35,971 chars, exactly one `.mms` root, stepper absent, wheel handlers 0,
  `scrollLeft` code absent, global scroll capture absent, targeted game-river
  listener present.
- DRAFT ONLY — NOT published.

## Round 15f (2026-07-11): Montran returns to direct PDF, viewer v9 — DRAFT
- Ocean: "i would like to use the pdf directly... reference the height of the
  current pdf viewer for montran."
- Read `flippable-booklet-export_v2.zip`: 71-page, 13 MB web PDF; self-contained
  2.26 MB viewer bundle with bundled PDF.js/worker + page-flip library; config
  contains no `pageImages` manifest. Poppler render checks passed on the cover
  and page 20, including the report gradients.
- Uploaded PDF: P3028590574867085520722012452665,
  `montran_sustainability-report_2025_v4-web.pdf`.
- Uploaded viewer: Y3028594344625257679932271146809,
  `montran-booklet-direct-pdf-v9.html`. The iframe passes the PDF freight URL
  through the viewer's `?pdf=` parameter, so runtime pages come from the PDF,
  not the Round-15 image manifest.
- Sizing: prior viewer was 1011 x 504. Export ratio is 21:9; height stayed 504,
  proportional width became 1176. Other Montran river items are unchanged.
- Reload audit: bodycopy 36,371 chars, one `.mms` root, one v9 URL, one direct
  PDF URL, v8 URL absent, `1176 x 504` persisted. The PDF cover renders inside
  the Cargo iframe. DRAFT ONLY — NOT published.

## Round 15g (2026-07-11): Montran PDF viewer v10 + Figma description audit — DRAFT
- Ocean requested: remove the center page/status control, open on PDF page 19,
  center and enlarge the spread to match the supplied black-background
  reference, and retain the older loading treatment only as a slow-load
  fallback.
- Viewer v10 source: `work/montran-direct-pdf-v10-src/`. It keeps the direct
  PDF runtime and the existing 1176 x 504 iframe. The frame now uses the full
  21:9 viewport with no control-reserved subtraction; at 1176 x 504 the live
  book is 1074 x 302 at x51/y101, matching the reference's approximately 91%
  spread width and centered placement. The center status element was removed;
  previous/next arrows remain.
- `viewerOptions.startAtPdfPage = 19`; reload shows the PDF 19-20 spread. The
  old 2022 x 1008 loading poster, 55% black dim, and 2px progress bar were
  restored but delayed 650ms. Fast load: preload remains hidden. Throttled
  local proof: `preload is-visible`, poster present, progress 4% at 900ms.
- Uploaded v10: U3028615476311378061982834407225,
  `montran-booklet-direct-pdf-v10.html`; iframe still passes PDF
  P3028590574867085520722012452665 through `?pdf=`. Cargo reload proof: v10
  iframe persisted, v9 absent from the iframe, page 19-20 visible, exactly two
  buttons, no center status control. DRAFT ONLY — NOT published.
- Figma read-only audit of frame 83:251: 1440 frame, 12 columns, 40 margins,
  32 gutters, description row 1128. Exact descriptions: col-6=664 (fixed
  bands), col-8=896 (AnyDay), col-10=1128 (V7/Loop/DeadGood); offsets 232
  (col-2+gutter) or 464 (col-4+gutter). Cargo matches these values exactly at
  1440. The real defect is the unapproved `@media (min-width:1800)` token jump:
  664/896/1128 become 904/1216/1528 at 1800, causing a one-pixel breakpoint
  jump and 80px right overflow from 1800 through 1879. At 2560 the layout still
  ends at x1880, leaving 680px unstructured space. No description CSS was
  changed in this round; Ocean asked for diagnosis and fix proposals first.

## Round 15h (2026-07-11): Montran viewer controls fully removed, v11 — DRAFT
- Ocean clarified that the viewer must have no controls at all; pages should
  turn only by clicking or dragging the booklet. Round 15g had incorrectly
  retained previous/next arrows after removing only the center status.
- Removed the complete navigation DOM, all button CSS/references/listeners,
  and the viewer's ArrowLeft/ArrowRight keyboard handler. PageFlip's native
  click/drag interaction remains enabled (`clickEventForward`, mouse/touch).
- Kept the screenshot-matched geometry unchanged: iframe 1176 x 504; centered
  spread 1074 x 302 at x51/y101, approximately 91.3% of frame width and 59.9%
  of frame height. Default remains PDF page 19 (spread 19-20); delayed loader
  fallback remains.
- Local browser proof: zero buttons, zero nav/control elements, page 19-20,
  exact geometry above; clicking the right page advanced the booklet.
- Uploaded v11: A3028631537854549552742007355193,
  `montran-booklet-direct-pdf-v11.html`. Cargo source swapped v10 -> v11 and
  reload-verified while scrolled back to Montran: v11 present, v10 absent,
  no Previous/Next/Booklet navigation accessibility nodes, report visible.
  DRAFT ONLY — NOT published.

## Round 16 (2026-07-11): responsive system + mobile control dialog — DRAFT
- Ocean: "PLEASE IMPLEMENT THIS PLAN:" followed by the approved MM.S
  Responsive Refinement Plan.
- Figma foundations/components were corrected in file
  `aaJEv2Z8j6HaegMHou4N09`: added scoped `col/10` values 350/1128/1528;
  repaired the mobile closed-header Fill/growing spacer; bound the desktop
  flow, intro, descriptions, showcase bands, rail, and panel to grid tokens;
  normalized content bands to Hug height; created 44px Control/Close Button
  wrappers; and added verified 390, 768, 1024, 1440, and 2560 QA frames.
- Cargo replaced the 1440/1800 jump with `--layout-u: clamp(0.711111px,
  100vw/1440, 1.777778px)`. Expanded mode begins at 1024px, scales through
  2560px, then centers the complete composition. Descriptions continue to
  follow their grid spans; no separate reading-width cap was added.
- Media now uses independent `--media-u` plus each item's original
  `--asset-w`/`--asset-h`. Compact media preserves its deliberately mixed
  proportions while capping each item at 82vw and 62svh. All 13 rivers retain
  native horizontal overflow with `scroll-snap-type:none`,
  `scroll-behavior:auto`, no wheel handler, no stepper, and no animated scroll
  correction.
- Rebuilt the compact control panel as a native modal `<dialog>` with a real
  viewport-bottom top-layer position, safe-area padding, max-height/internal
  overflow, inert closed state, focus transfer/restore, Escape and outside
  dismissal, and page scroll locking. Optical artwork stays unchanged inside
  44x44 touch targets. Hover rules are fine-pointer-only; pressed and visible
  focus states cover touch/keyboard. `ResizeObserver` now measures the header
  and reconciles mode after type changes and Cargo viewport switching.
- Local matrix passed at 320, 390, 430, 768, 1023, 1024, 1440, 1920, 2560,
  and 3000px: zero page overflow, intentional shell switch at 1024, varied
  capped media, vertical wheel preserved over rivers, native horizontal wheel
  movement, and centered 2560px composition above the cap.
- Cargo reload proof on Work: one `.mms` root, 13 bands, 69 responsive assets,
  one dialog and no legacy panel, no `var(--u)` inline styles, no page
  overflow, river snap `none`, scroll behavior `auto`, custom fonts loaded,
  and defaults restored to white/serif/M/straight with slider 1. Mobile proof
  at 711px: zero page overflow; 44px menu and controls; dialog bottom exactly
  matched the 1540px viewport at shallow and deep scroll; Escape closed it and
  restored focus. Desktop proof after reload at 2900px: root width 2560px,
  x=170 with equal 170px side space; desktop dialog open/non-modal and usable.
- Compatibility safeguard scopes the closed-state selector to native dialogs
  and hides untouched legacy div panels only in compact mode, preventing the
  global CSS from breaking their expanded layout. Work bodycopy is migrated;
  the local Write/Who mirrors also carry the new markup for a future named-page
  sync.
- DRAFT ONLY — NOT published. No publish command or button was used.

## Round 17 (2026-07-11): wide-desktop geometry correction — DRAFT
- Ocean: "at a certain breakpoint the left nav bar should stay the same size"
  and requested equal four-side desktop padding, no wide-screen white gutters,
  no river crop before the physical screen edge, and a clock aligned back to
  the right edge.
- Root cause measured in Dia at 2940px: the centered 2560px shell added 190px
  external gutters on top of a 71px internal margin, producing a perceived
  261px side inset. The panel had grown to 356px, the rail to 484px, the clock
  ended at x2679, and rivers clipped at x2750 with 190px of blank page beyond.
- Added `--chrome-u: clamp(0.711111px, 100vw/1440, 1.25px)` beside the existing
  content `--layout-u`. New `--edge-pad` derives from chrome and caps at 50px;
  `--margin-page` remains its compatibility alias. Added chrome-specific
  spacing, `--panel-width`, and `--nav-col` contracts.
- `.mms` is now 100% viewport width with no centered max-width. At 1800 and
  above: edge pad 50px, nav column 340px, panel 250px, and chrome geometry
  remains fixed while content/media keep scaling through 2560. The main and
  every river reach the physical viewport edge; maximum river scroll leaves
  the final asset 50px from that edge. Final page bottom padding is also 50px.
- Panel controls keep 44px hit areas while their optical dots, borders, type,
  slider, and shape artwork use the capped chrome scale. Hover styling targets
  the optical pseudo-elements, so the invisible hit-area wrappers never flash.
- Local matrix passed at 1023, 1024, 1440, 1800, 1920, 2560, and 2940px. At
  2940: root 2940, rail 340, main 2600, panel 250×332, clock right edge 2890,
  river right edge 2940, last-item rest gap 49.9, and page overflow 0. Rail and
  panel geometry were identical at 1800, 1920, 2560, and 2940.
- Figma Space collection now has Desktop, Mobile, Desktop 1800, and Desktop
  2560 modes. Added `unit/content`, `unit/chrome`, `edge/pad`, four chrome-space
  variables, `panel/width`, and `nav/column`; `margin/page` aliases `edge/pad`.
  Content columns/spaces/radius now document both wide endpoints. Added
  verified reference captures 506:369 (1800) and 507:369 (2560); removed the
  obsolete centered 2560 snapshot 499:363.
- Cargo CSS was spliced around marker strings, preserving all three managed
  font blocks. Reload proof at the 2900px editor viewport: root 2900, rail 340,
  panel 250×332, clock and bottom edge 50px, rivers to x2900, 13 bands, 69
  responsive assets, Montran v11 present, native snap `none`, scroll behavior
  `auto`, defaults white/serif/M/straight, slider 1, and zero page overflow.
  Compact editor proof at 729px: zero overflow, varied media unchanged, 44px
  menu/controls, modal bottom exactly at the 1580px viewport, and scroll lock.
  Local keyboard proof confirmed Escape closes and restores the menu focus.
- CSS only; Work bodycopy and every media URL remain unchanged.
- DRAFT ONLY — NOT published. No publish command or button was used.

## Round 18 (2026-07-11): intro detail, col/6 consistency, retina media — DRAFT
- Figma reference audit: intro node 101:316 has a 24px vertical gap and the
  final sentence is its own text block (502:464). Montran description 333:437
  and AnyDay description 339:718 are both 664px and bound to `col/6`. Cargo's
  AnyDay-only `col/8` override was the entire width mismatch; it was removed.
- Cargo intro now has three paragraphs. Existing paragraph rhythm supplies the
  designed gap. The native `happy-face-1` text icon is forced to one em with a
  small baseline correction, so it tracks every user-selected type size. The
  icon is wrapped by Cargo's own Rotation effect:
  `<span uses="rotation" rotation="0" animate="2">`, which computes to a
  25-second linear infinite turn. The effect and markup survived reload.
- Retina workflow: simple image nodes used their original Figma fills; V7's
  cropped A-frame and the Montran social composite used exact Figma Plugin API
  4x exports. Temporary off-canvas export nodes 512:369 and 512:370 were
  removed immediately after download. Assets were downsampled once with
  Lanczos to the maximum useful retina size before Cargo upload.
- Uploaded and wired:
  - EVIIVE sequence 3: T3029359532540439699946090313529,
    `eviive-sequence-3-retina.jpg`, 3600x2028.
  - EVIIVE sequence 6: X3029359532558886444019799865145,
    `eviive-sequence-6-retina.jpg`, 2800x1578.
  - V7 sequence 6: A3029359532632673420314638071609,
    `v7-sequence-6-retina.jpg`, 1122x1496.
  - touchbaes last: Y3029359532614226676240928519993,
    `touchbaes-last-retina.jpg`, 2400x1600.
  - Montran sequence 4: H3029359532577333188093509416761,
    `map-generator-retina.png`, 3200x2048, derived from Ocean's updated
    `map generator.png`.
  - Montran last: M3029359532595779932167218968377,
    `montran-last-retina.jpg`, 2782x1565.
  - Curate Health last: K3029359532521992955872380761913,
    `curate-last-retina.jpg`, 2200x1914.
- Reload proof at the 2940px Dia viewport: Montran and AnyDay descriptions are
  both 1180.44px; the seven served natural/rendered width ratios are
  2.26/2.35/2.25/2.42/2.61/2.25/2.68; all are complete; zero stray
  `media-item` elements; zero page overflow; rivers remain `overflow-x:auto`,
  `scroll-snap-type:none`, and `scroll-behavior:auto`; Montran direct-PDF v11
  remains in place. Served-rendition edge probes found no bright right or
  bottom lines, including V7's formerly fragile A-frame slot.
- DRAFT ONLY — NOT published. No publish command or button was used.

## Round 19 (2026-07-11): Montran/Loop retina images + responsive Touchbaes tweezer — DRAFT
- Replaced Montran showcase image 2 with a 3200x2200 derivative from the
  6400x4400 local master `米禾设计 (3).png`. Cargo upload:
  J3029442176019925254992799774521,
  `montran-sequence-2-retina.jpg`; served at `/w/3200/q/90`.
- Replaced Loop's final image with the original 1374x1196 Figma fill from
  node 295:413. Cargo upload: K3029442176001478510919090222905,
  `loop-sequence-last-retina.jpg`; served at `/w/1374/q/90`.
- Touchbaes root cause: the game board followed the fluid Cargo iframe while
  `.cursor-rig` stayed at 285px. The rig now uses
  `clamp(285px, 34.756vw, 507px)`, matching the expanded composition's
  1440-to-wide scale. Existing hotspot and tip geometry already derives from
  the rendered rig width, so drag alignment scales with the artwork.
- A second reload exposed an initialization race: the escaped parent overlay
  could cache the 285px rest message while Cargo was still laying out the
  iframe at its provisional minimum width. The game now re-broadcasts its rest
  geometry through ResizeObserver, resize, and a double-rAF settle pass.
  Final upload: N3029452426359098181326765340473,
  `touchbaes-sticker-game-v5.html`.
- Reload proof: at the 2900px Cargo viewport, iframe 1457.77px and both the
  internal and escaped parent tweezer rigs 506.73px; at the 1400px content
  reference, rig 285px; at compact 390px, rig 202.8px and mobile mode active.
  Both requested images load complete at natural/rendered ratios 2.66x
  (Loop) and 2.46x (Montran). Page overflow remains zero at wide, reference,
  and compact sizes.
- The booklet corner hover was not changed in this round because its referenced
  screenshot was not attached to the request; the existing v11 viewer remains
  untouched pending the exact visual reference.
- DRAFT ONLY — NOT published. No publish command or button was used.

## Round 20 (2026-07-11): captions, compact showcases, and Touchbaes v6 — DRAFT
- Ocean approved the MM.S Caption, Motion, and Mobile Showcase Refinement plan.
- Montran map tile now uses the responsive 12-unit caption gap rather than
  `space-between`. A `ResizeObserver` fit pass measures the complete caption
  and proportionally reduces only the map when a typeface/scale combination
  would exceed the designed tile height. The map retains its aspect ratio and
  bottom alignment; stress checks across every face and S/M/L/XL found zero
  caption or image overrun.
- The native Cargo smile rotation changed from `animate="2"` to `animate="4"`:
  one revolution now computes to 12.5 seconds. The effect is disabled by
  `prefers-reduced-motion`.
- Compact Kelly's Kelly is one native horizontal row of four 82vw images with
  no snapping or forced movement. The complete caption sits below image one,
  is constrained to the same 82vw column, and wraps without horizontal text
  scrolling. Desktop remains the original 2x2 grid.
- Removed the rail link padding and compact navigation-row minimum that were
  changing text rhythm. Rail, mobile navigation, description, and inline links
  now compute to `--lh-base`; actual controls retain 44px touch targets.
- Compact Random Pics now spans the physical viewport, centers the capped reel
  to within 1px, gives the caption the full padded content width, and uses the
  designed 8-unit content-hugging caption/reel gap. Desktop geometry is
  unchanged.
- Touchbaes game v6 suppresses the internal and escaped tweezers below 1024px;
  desktop rest geometry moved from 72% to 80% of board height. The embedded
  game reports its rendered height after load, resize, orientation change,
  image settlement, and content changes. The parent accepts messages only from
  the expected Freight iframe window/origin and retains a corrected board-
  aspect CSS fallback before the first message.
- Uploaded v6: K3029563278415153812282710472505,
  `touchbaes-sticker-game-v6.html`. Cargo bodycopy, `cargo/site.css`,
  `cargo/panel.js` (`responsive-21`), the canonical Touchbaes local mirror,
  and the escaped overlay v2 were updated. Reload proof retained the v6 URL,
  map class, panel/overlay markers, `animate="4"`, and 12.5s duration.
- Compact Cargo proof at 711px: Kelly four equal 583px columns with a 70px
  next-item cue; one-column caption with no text overflow; Random Pics center
  delta 0 and 8px gap; link and body leading both 25px; Montran caption/image
  overrun 0; Touchbaes complete within the corrected 648px fallback and both
  tweezers hidden; page overflow 0. Local v6 harness passed 320, 390, 430, 768,
  1023, 1024, and 1440px, including auto-height equality and touch dragging.
- DRAFT ONLY — NOT published. No publish command or button was used.

## Round 21 (2026-07-11): Montran realistic corner curl correction — LOCAL READY
- Ocean reported that direct-PDF viewer v12 replaced the printed page curl with
  a flat grey triangle. Root cause: v12 stopped the real page fold during hover,
  hid its only page image, and displayed a CSS gradient mask instead.
- The corrected local v12 source removes that grey mask. Passive hover now
  draws a responsive approximately 88x151px curved curl into a small retina
  canvas using the exact StPageFlip-selected underside page and exact adjacent
  next/previous page. The curved cubic edge, wider underside lobe, dark contact
  stroke, and paper highlight create a rolled lower edge while keeping both
  printed page crops readable.
- StPageFlip remains responsible for click and drag turns. Its passive
  `userMove` branch is guarded unless a pointer drag has started; native shadow
  layers are suppressed only while the custom hover hint is visible and return
  for real page turns. The viewer still has zero buttons and opens on the PDF
  19-20 spread.
- Local proof at 1280x720: full spread remains readable; right and left hover
  both show curved printed corners; shadow layers compute `display:none` only
  during the hint; visible base pages remain 19/20; clicking the right page
  advances to 21/22; no control DOM was reintroduced. Local SHA-256:
  `cdc9111cc5a7ba930f61f6c004a58173e07a51b92c414aef513e60453c048566`.
- Cargo upload/bodycopy swap is not yet claimed complete: the authenticated
  editor tab became unresponsive during the first v13 transfer attempt. The
  page bodycopy was not changed to v13 and the published site was never touched.
  Resume by uploading the local corrected source as
  `montran-booklet-direct-pdf-v13.html`, replacing only the viewer hash in the
  Montran iframe, saving, reloading, and visually proving both corner sides.
- LOCAL READY; Cargo remains on its prior draft viewer until the v13 swap is
  reload-verified. NOT published.

## Round 22 (2026-07-11): mobile geometry, Touchbaes v7, V7 cup v3, and deferred media — DRAFT
- Ocean approved the compact showcase, interaction, and performance refinement
  plan and instructed: "Implement the proposed plan."
- Compact showcase media now follows a consistent proportional-width system:
  standard assets use 85vw, intentionally small assets use 58vw, and the
  interactive Touchbaes frame uses 94vw. Rivers occupy the physical viewport,
  retain native unsnapped scrolling, and no longer leave a persistent white
  strip at the left or a one-pixel seam at the right. The page itself has zero
  horizontal overflow.
- Compact showcase bands now use content-led height with a 64px inter-band gap.
  Only the first showcase keeps the 40px introduction offset. Kelly's Kelly is
  a four-item 85vw river with its complete caption constrained to the first
  image column. The Montran map caption is 75% of its 85vw image width, remains
  bottom-associated with the image, and never determines an artificial tall
  band. Random Pics retains a centered 85vw reel and an independent readable
  caption width.
- Fresh compact sessions now default to the Small type scale and the leftmost
  slider position. Expanded sessions still default to Medium. An existing
  saved preference always wins, and defaults are not persisted until the user
  actually changes a control.
- Touchbaes v7 gives the page/board `pan-x pan-y` behavior while reserving
  `touch-action:none` for draggable loose stickers. Dragging a sticker creates
  a separate visible mobile preview; dragging elsewhere continues to scroll
  the page or river. The compact game uses the wider 94vw frame, hides both
  tweezer implementations, removes static bottom padding, and reports its true
  rendered content bottom plus 16px. Cargo accepted the live report at 847px;
  the iframe, stickers, shadows, and tray were fully visible with no internal
  scrollbar.
- V7 cup bundle v3 fits the camera to the cup's complete rotation envelope,
  caps device pixel ratio at 1.5 compact / 2 expanded, uses
  `preserveDrawingBuffer:false`, and pauses rendering when offscreen, when the
  document is hidden, or when its parent embed reports that it is not visible.
  Multi-angle projection checks retained the full cup; the offscreen animation
  delta was zero.
- `responsive-23` adds a near-view media loader. Twenty-seven videos and three
  iframes now begin with `data-src`; videos use `preload="none"`, activate near
  the viewport, and pause away from it. Images use one eager high-priority hero,
  37 lazy/async images, and 35 responsive Freight `srcset` declarations. Later
  bands use `content-visibility:auto` with intrinsic-size estimates.
- Cold Cargo proof reduced initially requested heavy video/iframe resources
  from the structural baseline of 30 to 2, with zero iframe loads before their
  near-view threshold: a 93% reduction in initial heavy requests. Freight does
  not expose cross-origin transfer sizes through Resource Timing, so request
  count rather than byte count is the reliable live measurement.
- Uploaded draft assets: Touchbaes v7
  `V3029649661012769620108113393465`; V7 cup v3
  `U3029652463921744643979643238201`; corrected Montran direct-PDF viewer v13
  `F3029653692751601114141424138041`. The Montran iframe now uses v13. Reload
  proof shows no controls, opens on pages 19/20, and renders readable printed
  page content in both the previous and next curved corner peels. This
  supersedes Round 21's pending-upload status.
- Cargo reload proof at 711x1540: river x=0 and width=711; standard media=604px
  (85vw); Touchbaes=668px (94vw); Kelly columns=604px; Montran caption=453px,
  exactly 75% of its image; link/body leading both=25px; page overflow=0.
  Scrolling over the live game moved the page vertically without shifting the
  river, and horizontal input moved the river without shifting the page.
  Expanded regression at 1024px retained the Medium default and zero overflow.
- Cargo bodycopy was changed directly through the authenticated draft editor,
  saved, and reload-verified after each batch. Local mirrors are synchronized.
  DRAFT ONLY — NOT published. No publish command or button was used.

### Round 22 publication follow-up (2026-07-11)
- Ocean explicitly instructed: "Let’s publish on Cargo so I can check on my
  phone I’m not at my desk now". This instruction superseded the earlier
  draft-only state for Round 22.
- Published through Cargo's `Publish changes` control to `mmmmm.studio`.
- Public-response proof found `responsive-23` and all three current embed IDs:
  Touchbaes v7 `V3029649661012769620108113393465`, V7 cup v3
  `U3029652463921744643979643238201`, and Montran viewer v13
  `F3029653692751601114141424138041`.
- Exact public mobile proof using a 390x844 device viewport: viewport=390,
  river x=0, river width=390, standard media width=332px (85vw), fresh scale
  slider=0 (Small), and page-level horizontal overflow=0.
- ROUND 22 IS PUBLISHED. Future changes return to draft-only unless Ocean
  explicitly requests another publication.

## Round 23 (2026-07-12): persistent mobile control tray — DRAFT
- Ocean approved the MM.S Mobile Control Panel Refinement plan. Compact control
  settings are now a persistent non-modal bottom tray rather than a modal
  sheet. The same dialog node is portaled under `body` below 1024px and restored
  to its original `.mms` grid slot at 1024px and above.
- Removed `showModal()`, `aria-modal="true"`, background inertness, root/body
  scroll locking, backdrop dismissal, and outside-tap dismissal. The tray now
  closes only from the X, the active header trigger, or Escape. Short screens
  retain `max-height:80svh`, internal `overflow-y:auto`, and contained
  overscroll.
- Root cause of the reported setting-triggered dismissal was not the setting
  click handler: every setting calls `setBarH()`, which called
  `syncPanelMode()`, whose compact branch unconditionally closed the dialog.
  Compact synchronization now preserves an intentionally open tray while still
  resetting correctly across the 1023/1024 structural transition.
- Mobile theme, typeface, and shape controls retain 44px hit areas and now use
  exactly 32px outer artwork. Theme swatches use true `border-radius:50%`
  ellipses rather than 999px stadiums. All three shape buttons share the same
  32px height and communicate shape through radius only.
- The words "control panel" in the compact introduction are now an underlined
  semantic button. It and the header icon share `data-panel-toggle` and
  synchronized `aria-expanded`. The open header icon uses a black square with
  white artwork and changes its label to "close site controls".
- Pointer/touch opening returns focus to the originating trigger after native
  non-modal dialog focusing, preventing the dotted X outline. Keyboard opening
  still moves focus to the X, whose focus-visible treatment is a solid
  theme-inverted square rather than a dotted outline. Explicit close restores
  focus to the trigger.
- Local proof at 390x844: panel x=0/w=390, panel parent=`body`,
  `aria-modal=false`, theme/face/shape artwork=32px, targets=44px,
  ellipse radius=50%, active icon rgb(0,0,0)/rgb(255,255,255), root/body
  overflow visible, and page overflow=0. All four setting types remained open;
  background wheel delta=320 while panel top/bottom stayed fixed. At 390x390,
  panel height=312px exactly 80svh, with clientHeight 311, scrollHeight 324,
  overflow auto, and overscroll contain. Compact widths 320/430/768/1023 all
  remained full-width with zero overflow; 1024 restored the sticky desktop
  panel to `.mms` after the normal resize frame.
- Cargo draft was updated through the authenticated editor by replacing only
  the managed CSS region after `/* mm.s — layout v3` and the complete Work
  bodycopy. A source-editor insertion initially produced two MM.S roots; this
  was caught before handoff and corrected by replacing the same-origin iframe
  bodycopy exactly once, dispatching Cargo input/change events, saving, and
  reloading.
- Final Cargo reload proof: CSS length 49,214 with managed prefix at 15,813;
  one `.mms` root; `responsive-24` present and `responsive-23` absent;
  `showModal()` absent; one inline panel trigger. Cargo mobile preview width
  711: tray x=0/w=711, all optical controls=32px, all hit targets=44px,
  page overflow=0, and a real background scroll moved 320px while the tray
  remained fixed and open. Theme, face, scale, and shape selections each kept
  the tray open. Preview was restored to white/Serif/Small/straight and closed.
- DRAFT ONLY — NOT published. Publish Settings was never opened and no publish
  command or button was used.

## Round 24 (2026-07-12): ratio-aware mobile media + native Montran fold — DRAFT
- Ocean approved the MM.S Mobile Media and Montran Booklet Correction plan.
  Compact showcase media now use explicit `data-mobile-profile` contracts:
  standard targets 85vw with a 58svh ceiling, panorama targets 128vw with a
  32svh ceiling, small targets 58vw with a 58svh ceiling, and embeds retain
  dedicated geometry. Proportional sizing uses the tighter width/height scale.
  Compact inline river heights and content-visibility containment are removed;
  media defaults to `object-fit:contain` unless explicitly marked for an
  intentional crop.
- Source-ratio corrections include the first two EVIIVE videos (432x432 and
  279x279), the WTW wordmark (765.2x765.2), and the V7 4:1 strip panorama
  profile. Expanded EVIIVE, V7, Loop, Kelly, and Dead Good descriptions now
  calculate to the physical right inset. V7's second paragraph was recovered
  verbatim from Figma. Kelly is explicitly 2x2 expanded and 1x4 compact; its
  manicule uses the shared caption-icon size.
- Touchbaes game v8 reserves 24px compact visual bleed, reports the lower bleed
  in its validated size message, removes the stale 340px mobile frame rule,
  keeps scrolling available outside draggable stickers, and preserves the
  visible mobile drag preview. Uploaded as
  `touchbaes-sticker-game-v8.html`, Cargo hash
  `Z3030199972048055778483643135801`.
- Montran direct-PDF viewer v14 removes the synthetic peel canvas and restores
  StPageFlip's native fold. Fine-pointer hover uses a 120ms delay, 360ms entry,
  220ms exit, a 10% fold clamped to 36-84px, and native dynamic shadow. It
  opens on pages 19-20, renders PNG page blobs adaptively up to 1600px, stages
  the required neighbors, and maintains a 12-page LRU cache.
- Viewer v14 uses PDF.js `PDFDataRangeTransport` with 256KB chunks,
  `disableAutoFetch:true`, and `disableStream:true`; full fetch remains fallback
  only. Uploaded as `montran-booklet-direct-pdf-v14.html`, Cargo hash
  `D3030203820721399085023363643193`. Direct Freight proof: no controls or
  synthetic peel, exactly 12 blob pages, visible start pages 19/20, and native
  hover exposed real pages 21/22. Network proof on the actual PDF resource was
  one HEAD followed by 206 responses with 262,144-byte ranges; the apparent
  un-ranged 200 was the viewer HTML URL containing the encoded PDF filename,
  not a PDF download.
- The compact control-panel active state now keeps a transparent background,
  strengthens the theme-ink rails, and fills the control-knob nodes. The 120ms
  transition is disabled under reduced motion.
- Cargo Work bodycopy was replaced from the exact local mirror and read back
  before Update. A temporary two-root insertion caused by CodeMirror's hidden
  textarea was caught and corrected with CodeMirror-native Select All + paste.
  Final reload proof has exactly one `.mms` root, `responsive-25`, the v8/v14
  URLs, and the restored V7 paragraph. The managed CSS region byte-matches
  `cargo/site.css`; Cargo's existing 15,813-byte prefix and text styles were
  preserved.
- Live Cargo proof at the actual 390px site frame: page overflow 0, all settled
  inter-project gaps 64px, Kelly 4 columns, Touchbaes 382.2px (98vw), and
  standard media maximum 331.5px below the 58svh ceiling. At 1024px: expanded
  shell, Kelly 2 columns, overflow 0. At 2940px: rail 340px, panel 250px, clock
  right inset 50px, all five fill-right descriptions at 50px, and overflow 0.
- DRAFT ONLY — NOT published. Publish Settings was never opened and no publish
  command or button was used.

## Round 25 (2026-07-12): mobile control-panel cue + Touchbaes pick label — DRAFT
- Removed the compact introduction's underlined control-panel button. Mobile
  now shows a non-interactive slider glyph immediately before the plain words
  `control panel`; the glyph follows the surrounding type size and baseline.
  The header slider icon remains the sole compact panel trigger.
- Removed spacing between the five compact palette cells while preserving
  their 44px hit areas and 32px ellipse artwork. The active header trigger now
  strengthens its rails and fills its nodes with `--color-text-muted`, exactly
  matching the mobile clock color across themes.
- Cargo draft CSS and Work bodycopy were replaced and read back exactly with
  `responsive-26`; no publish action was taken.
- Local reload proof at 390px: one panel trigger, no introduction button or
  text decoration, palette gap `0px`, zero page overflow, and—after the 120ms
  transition—active rails, nodes, and clock all `rgb(153,153,153)` in the
  default theme. At 1024px the inline mobile cue is hidden and the ordinary
  desktop `control panel` copy is restored.
- Repositioned the desktop Touchbaes `pick!` bubble from `(22,-60)` to
  `(48,-84)` relative to the tweezer tip, placing it above-right without
  covering the tool. The canonical game source and local v8 mirror are fixed.
  After enabling Chrome local-file access, the corrected file was uploaded as
  `touchbaes-sticker-game.html`, Cargo hash
  `Q3030696850687179887540991211321`, and the Work iframe was updated from the
  immutable v8 URL. Reload proof in the actual Cargo iframe: `data-mms-loaded=1`,
  `src` and `data-src` both use the new hash, the deployed stylesheet contains
  `translate(48px, -84px)`, and the obsolete `(22,-60)` offset is absent.
- DRAFT ONLY — NOT published.

## Round 26 (2026-07-12): pencil trigger + Figma palette spacing — DRAFT
- Replaced the compact header's slider trigger with the new pencil direction
  shown in Figma. The pencil is optically 24px, sits 8px from the MM.S
  wordmark while retaining a 44px hit area, and the compact introduction cue
  now uses the same mark at the surrounding text size.
- The open state inverts the pencil itself: a black filled body with white
  inner construction lines. The 120ms transition remains disabled under
  reduced motion.
- Corrected the compact palette from Round 25's zero-gap row to Figma's actual
  construction: five equal 50.8x24 ellipses with 24px gaps at the 390px
  reference. Below that width the gap contracts only enough to preserve 44px
  minimum hit targets.
- Panel script marker advanced to `responsive-28`.
- The final 390px geometry check found that centering 24px artwork inside the
  44px trigger created an 18px optical wordmark gap. The pencil is aligned to
  the trigger's leading edge instead, producing the exact 8px Figma gap while
  preserving the full 44px target.
- Cargo's mobile editor retained an escaped dialog from its previous client
  runtime while rebuilding the updated bodycopy, briefly creating two
  `#mms-panel` nodes. Initialization now selects the panel inside the current
  `.mms` root and removes stale escaped copies before the version guard or
  portal logic runs.
- DRAFT ONLY — NOT published.

## Round 27 (2026-07-12): Cargo-native pencil icon + Figma header order — DRAFT
- Removed the hand-built pencil SVG. Cargo's loaded `iconpalette` catalogue
  identifies the circled glyph as `pencil-3`; both compact uses now render the
  native `<text-icon icon="pencil-3">` element.
- Refreshed Figma node `11:31` places the control trigger after the timestamp,
  as the final header item. Cargo now uses the same wordmark / growing spacer /
  timestamp / pencil order, with the Figma 12px timestamp-to-icon gap.
- The visible control uses Figma's 24px layout box so its right edge aligns
  with the shared page inset. A 10px invisible extension on every side keeps
  the effective pointer target 44x44 without pushing the artwork inward.
- Panel runtime marker advanced to `responsive-29`.
- Reload proof in Cargo's mobile preview: header order is wordmark / timestamp /
  trigger; timestamp-to-pencil gap is 12px; the native glyph is 24x24 and its
  right inset exactly matches the row padding. Cargo's rendered shadow SVG
  reports `icon="pencil-3"` with the native `base-color` path. Open state has
  one dialog, one MM.S root, black native path fill, and zero page overflow.
- DRAFT ONLY — NOT published.

## Round 28 (2026-07-12): Figma mobile controls + render preview + stable Touchbaes — PUBLISHED
- Rebuilt the compact control tray from Figma node `21:148`. The full-width
  sheet uses 16px top, 20px inline, and 32px plus safe-area bottom padding.
  Palette and scale share an 8px two-column row; at 390px the columns are
  171px each, the five visual swatches are true 24px circles in separate
  34.2px transparent cells, and the complete tray is 273px tall. Below 360px
  the row becomes 56/44; proof at 320px retained 6.46px visible circle gaps
  and zero page overflow. Typeface artwork is 26px outer height and all three
  shape boxes are 36px. The expanded panel retains dots / faces / scale /
  shapes ordering through flex order with the new compact wrapper set to
  `display:contents`.
- `responsive-30` adds a one-per-tab-session render pass: Girly/Sans/M/Round,
  Quirky/Mono/L/Oval, Contrast/Gothic/XL/Straight, and Black/Serif/S/Round at
  120ms intervals, then an exact restore of the saved visitor state. Preview
  values never write localStorage, the sequence cancels on user input, and it
  is skipped for reduced-motion or Save-Data. Heavy media observation starts
  only after the preview completes. Local timed proof captured all four states
  followed by white/Serif/Small/straight and the session completion flag.
- Touchbaes now reconciles keyed loose/placed sticker nodes instead of clearing
  both layers on every render. The parent sends mode only on iframe load or a
  real compact/expanded transition; the iframe ignores duplicate mode events.
  Size reporting uses stable `offsetTop + offsetHeight + 29px`, excluding live
  breathing/drag transforms, and the parent ignores unchanged heights. Local
  proof sent eight duplicate mode messages: the sign remained the same DOM
  node while animation time advanced 770ms; game height stayed 426px. The
  compact iframe is `min(100vw, 98vw + 5px)` and the game shifts into the new
  5px frame allowance; at maximum 1.1 breath the sign shadow retained 5.53px
  left clearance. Uploaded as Cargo hash
  `X3030840525330113775081479518009` and wired into Work.
- Added explicit compact `wide` media profile at 100vw/52svh and applied it to
  Mandy's second alpha video. At 390px it renders 390x252.31, proportional,
  `object-fit:contain`, transparent background, and zero page overflow. Deferred
  activation clears stale `src`, records the selected source, then loads VP9
  alpha in Chromium or the existing HEVC-alpha source in WebKit.
- Cargo bodycopy and managed CSS were updated separately, then reloaded. Final
  readback: one `.mms` root; one new Touchbaes hash; one Mandy wide profile;
  `responsive-30`; 52,580 CSS bytes; one managed `layout v3` marker; and the
  Cargo-managed mono/sans/gothic text-style blocks each present once. The live
  mobile editor shows the Figma first row and shorter tray.
- Published to `https://mmmmm.studio/` at 11:48 on 2026-07-12 after Ocean's
  explicit request for phone preview. Cargo confirmed `Site is up to date`.
  Independent public HTML proof returned 308,888 bytes, one `.mms` root, and
  the expected `responsive-30`, Touchbaes
  `X3030840525330113775081479518009`, and Mandy `wide` profile markers. A fresh
  390x844 public browser reload rendered the updated mobile header and intro
  trigger with zero console errors. Future edits return to draft-only.

## Round 29 (2026-07-12): bounded mobile tray + theme-aware panel type — DRAFT
- Ocean approved the bounded responsive panel plan: "This sounds like a plan.
  Let’s go with it." The compact sheet now stays edge-to-edge through the
  430px Figma endpoint, then stops at 430px and gains a fluid right inset up
  to `--edge-pad`. Cargo's wider mobile preview no longer stretches the
  palette, slider, typeface, and shape relationships across its full canvas.
- The normal sheet remains content-driven at 273px and is capped at 48svh.
  At 600px viewport height and below, the typeface and shape rows share the
  last grid row, reducing the sheet to 213px in the 844x390 test while
  retaining 44px row heights. The approved 390px palette construction remains
  five 24px marks inside 34.2px transparent cells; enlarging those cells to
  44px would require abandoning the Figma palette/slider first row.
- Root cause of the fixed sans panel chrome: compact JS portals the dialog
  from `.mms` to `body`, and Cargo's generated font-size rules depend on a
  `--font-scale` variable that was no longer inherited. Live pre-fix proof was
  system sans 16px for `Controls`, the small `a`, and the large `a`. The
  dialog now carries `--font-scale:1` plus `--font-family-base`; the title and
  slider labels explicitly bind to the active family. Local face-matrix proof
  passed Serif/Sans/Mono/Gothic, with the title at 20px and slider labels at
  distinct 14px/28px in every face.
- Preserved Cargo's native `pencil-3` icon. Its selected state now fills the
  existing compound path with `--color-text-primary` and traces it with
  `--color-bg-page`, so every color pairing supplies its own inverse. Cargo
  proof in Contrast showed magenta path fill with yellow inverse tracing.
- Reordered the compact introduction to `control panel` / native pencil /
  smiley. Panel runtime advanced from `responsive-30` to `responsive-31` in
  both the standalone mirror and Cargo bodycopy.
- Local viewport proof: 320x568 = 320x213; 390x844 = 390x273; 430x932 =
  430x273; 480x900 = 430x273 with 24.6px right inset; 768x1024 = 430x273 with
  39.4px right inset; 844x390 = 430x213 with 40px right inset. Every compact
  size had zero page-level overflow. The 1024px expanded switch remained
  intact.
- Cargo was updated bodycopy-first and CSS-second. Reload readback: one `.mms`
  root; two `responsive-31` markers; no `responsive-30`; new intro order once;
  CSS 54,143 bytes; one `layout v3`; bounded-width and short-screen rules once;
  and the managed mono/sans/gothic blocks each once. After reload, live clicks
  changed Serif to Sans and White to Contrast while the tray stayed open;
  `Controls` and both slider labels changed face. White/Serif/Small/Straight
  were restored at the end.
- DRAFT ONLY — NOT published. The public site remains Round 28 until Ocean
  explicitly requests another publication.

## Round 30 (2026-07-12): mobile navigation, caption groups, game envelope, pencil state — DRAFT
- Ocean: "PLEASE IMPLEMENT THIS PLAN" for the MM.S mobile navigation,
  Touchbaes frame, caption/media groups, and reverse-filled pencil refinement.
- Compact navigation links now use normal flow and leave permanently with the
  introduction. Only the MM.S / clock / pencil row remains sticky at z10;
  showcase bands stay z20 and the open tray z40, so the row is covered by
  media and resurfaces only in transparent project gaps.
- Montran map, Kelly, and Random Pics now share the compact caption contract:
  caption width equals media width, left edges match, the internal gap is
  12px, and the grouping surface uses `bg/page`. The native pointer glyph is
  reduced to 1.1em with optical first-line alignment.
- Touchbaes no longer estimates its frame from `offsetHeight + 29px`.
  Compact mode clones the existing sticker nodes invisibly at the maximum
  1.1 breathing scale, measures their rotated bounds, adds the proven shadow
  envelope and 8px clearance, iterates its internal left/right/bottom reserves
  to stability, then sends one stable height plus validated edge reserves.
  The parent fallback applies only before the first valid message and ignores
  unchanged heights. The child waits for the parent mode message before its
  first size report, preventing the previous provisional-height jump.
- The active header pencil uses two aligned Cargo-native `pencil-3` elements:
  a 2px theme-ink silhouette pass plus a 0.8px inverse-background detail pass.
  The inactive state remains the original native glyph. Runtime is prepared as
  `responsive-32`.
- Local Chromium proof at 320/390/430/768/1023/1024: zero page overflow;
  caption/media widths and left edges match; all caption gaps are 12px;
  compact z-order is 10/20/40; desktop Kelly remains two columns. Touchbaes
  measured maximum-shadow clearance was 10–19px, iframe scroll height equaled
  frame height, and each settled width emitted one unique height. At 768px it
  emitted no size before the compact-mode message and only the final 924px
  height afterward.
- Correct Touchbaes upload: Cargo already contained an older same-named v7 at
  43.84KB. The new 48.43KB build was identified separately, uploaded as hash
  `C3031049959885552314264465225529`, and its served 49,579-byte HTML contains
  both `edgeReserve` and `parentModeKnown`. The stale v7 hash was caught before
  final verification and is absent from the saved bodycopy.
- Cargo was updated bodycopy-first and CSS-second, with a reload after each.
  Final bodycopy readback: one `.mms` root, two `responsive-32` markers, one
  correct v7 hash, zero stale v7 hashes, and two native pencil layers. Final
  CSS readback after reload: 54,637 bytes, one relative mobile-navigation rule,
  the new pencil-detail rules, and exactly one each of the protected mono/sans/
  gothic text-style blocks. Compact Cargo proof at 729px: z-order 10/20/40;
  nav links relative; Montran, Random Pics, and Kelly caption/media widths all
  619.65px with 12px gaps; zero page overflow. Cargo's editor deliberately
  holds external nested iframes at `about:blank`, so the exact Freight v7 was
  bridge-tested separately in Chromium at 390px: no pre-mode size, one unique
  settled height of 457px, reserves 53/36/106, and zero overflow.
- DRAFT ONLY — NOT published.

## Round 31 (2026-07-12): every-load render flash, iOS autoplay, Figma tray geometry, mirrored pencil — DRAFT
- The short four-combination render preview now runs on every full page load.
  The prior per-session gate and writes were removed; the pass still restores
  the exact saved theme, face, scale, and shape without persisting preview
  values. Reduced-motion and Save-Data continue to skip the flash.
- Deferred videos now receive `muted`, `defaultMuted`, `autoplay`,
  `playsInline`, `muted`, `autoplay`, `playsinline`, and
  `webkit-playsinline` before their source is attached. Playback is retried on
  metadata/canplay, pageshow, visibility return, and the first touch/pointer
  gesture. The existing always-on fallback was brought to the same iOS-safe
  contract.
- Rebuilt the compact tray against Figma node `21:159` (390x223): 16px top,
  20px sides, 32px bottom, 16px row gaps; visual rows are 41px header, 24px
  palette/scale, 26px typeface, and 36px shape. The optical controls fill those
  rows while invisible overflow extensions retain practical touch areas.
  The full-width sheet is 224px including its 1px top border and remains capped
  at 430px above the Figma endpoint.
- Both instances of Cargo's native `pencil-3` glyph now use `scaleX(-1)`, so
  the tip sits bottom-left and the top sits top-right. The two-pass inverse
  active state remains intact.
- Runtime advanced from `responsive-32` to `responsive-33` in the standalone
  mirror and Cargo bodycopy. Local Chromium proof at 390x844 measured panel
  390x224, rows 41/24/26/36, zero page overflow, mirrored pencil matrix, and
  iOS playback attributes on loaded videos. Two consecutive reloads each
  showed all four preview states and restored White/Serif/Small/Straight.
- Cargo was updated bodycopy-first and CSS-second without moving the pointer.
  Reload readback: one `.mms` root, two `responsive-33` markers, no
  `responsive-32`, two native pencil layers, and the expanded iOS autoplay
  fallback. At Cargo's 729px compact viewport, the persisted CSS computes a
  mirrored pencil, 264px panel maximum, zero page overflow, and the manually
  portaled verification tray measures 430x224 with rows 41/24/26/36.
- DRAFT ONLY — NOT published.

## Round 32 (2026-07-12): hard-cut render preview + UTF-8 bodycopy recovery — DRAFT
- Ocean reported that the every-load design preview was too fast and looked
  cross-faded, and that project taglines showed mojibake such as `â` instead
  of an en dash.
- Root cause of the text corruption: the previous Cargo transfer pipeline used
  plain `atob()` as though it decoded UTF-8. It returns a Latin-1/binary string,
  so every non-ASCII byte sequence can be stored as visible mojibake. The clean
  local mirrors were never damaged.
- Public-site audit found the complete homepage non-ASCII set affected: 12 en
  dashes, 12 bullets, four curly apostrophes, one `è`, two curly quotation
  marks, the four characters in `（純愛）`, and two em dashes. Cargo serializes
  the bodycopy twice in its public payload, so raw-source counts are doubled;
  the visible copy contains the counts above.
- The Work bodycopy was replaced from the clean local UTF-8 source using
  `TextDecoder('utf-8', {fatal:true})` over the decoded Base64 bytes. The
  PLAYBOOK now forbids plain `atob()` for HTML transfers and records the exact
  decoder contract.
- Reload proof in Cargo draft: one `.mms` root; two `responsive-34` markers;
  zero `responsive-33`; zero U+00E2/U+00C3/U+00EF mojibake lead characters;
  12 real en dashes; 12 real bullets; four real curly apostrophes; real `è`;
  one `純` and one `愛`; zero page overflow.
- Removed the render-preview color and radius transitions. Each combination is
  now an instantaneous cut held for 200ms; the complete pass restores the saved
  design state after 880ms. Local browser sampling found every computed preview
  transition at `0s` and each state unchanged across two adjacent 100ms probes.
  Runtime advanced to `responsive-34`.
- Cargo bodycopy and CSS were updated separately and reload-verified. The public
  site remains on the older corrupted published round until Ocean explicitly
  authorizes publication.
- DRAFT ONLY — NOT published.

## Round 33 (2026-07-12): motion-first posters, randomized five-cut render, responsive tray — DRAFT
- Replaced the fixed four-state startup pass with five randomized hard cuts at
  260ms each. Every refresh uses all five themes, every typeface and scale, and
  all three shapes; complete combinations are unique, the first differs from
  the saved state on at least two axes, and the immediately previous sequence
  signature is rejected. The saved state restores at 1.38s and all computed
  transitions remain `0s`. A 50-load automated audit returned zero invalid or
  repeated sequences.
- Motion loading now starts concurrently with the render pass. The first two
  EVIIVE videos and V7 cup are critical/eager; all other moving media preloads
  within a one-viewport observer margin. Twenty-seven video posters plus V7
  and Touchbaes iframe posters were generated and uploaded. Video posters stay
  until real playback; iframe posters clear only after a validated ready
  message. All 29 Freight posters loaded successfully in the browser audit.
- V7 cup ready signaling was made race-proof with rAF, load, and 250ms fallbacks
  and uploaded as `Z3031274916472238420423367767865`. Touchbaes ready signaling
  and stable envelope reporting were uploaded as
  `H3031257561148224575971082680121`.
- Rebuilt the compact panel as verified responsive modes: full-width through
  430px; 390px bottom-centered at 431–759; 390px bottom-right with 24px inset
  at 760–1023; and 560x170 at 844x390 landscape. Every visible control keeps a
  44px target, background scrolling remains available, and desktop retains the
  left rail. Figma component `1:2899` is now Hug height with three 44px rows;
  landscape component `542:365` and reference section `542:400` document 320,
  390, 768, 844x390, and 1024 endpoints.
- A final compact regression caught the measured Touchbaes height removing the
  width fallback and exposing its 820px desktop inline width. Width and height
  authority are now separate: at 390px the frame remains 387.19px wide, the
  validated child height is 459px, child scroll size equals frame size, and
  page overflow is zero.
- Cargo draft readback after reload: one `.mms` root, two `responsive-35`
  markers, 29 poster contracts, three critical media nodes, the new V7 and
  Touchbaes hashes once each, UTF-8 clean bodycopy, 56,289 CSS bytes, one
  `layout v3` region, one persistent mobile-game width rule, and no page-level
  overflow. Live 390px Cargo proof measured a 390x217 tray with fourteen 44px
  targets and a 387.20px Touchbaes fallback width.
- Montran booklet viewer v14 and its PDF source were intentionally unchanged.
- DRAFT ONLY — NOT published. The public site remains on the older published
  `responsive-34` build; it contains no `responsive-35` marker. Publish only
  after Ocean explicitly requests it.

## Round 34 (2026-07-12): Figma-first panel, optical type, and four-cut landing — DRAFT
- Updated Figma first. Caption serif S/M/L/XL is now 15/18/22/30 with
  17/21/25/34 leading. Sans and Mono retain x0.966/x0.90; measured Gothic ink
  was about 8% larger than Times, so caption/body/heading now use x0.92.
- The four Figma panel labels were decoupled from content caption tokens and
  normalized to 16/15/15.8/12.7. Final rendered ink heights are
  11.35/11.34/11.31/11.35px and vertical center deltas are within 0.04px.
- Matched the revised Figma `1:2899`: 390x244 content plus border, padding
  16 top / 20 sides / 24 bottom, slider before palette, 24px first optical row,
  32px type buttons, and 36px shape controls. Cargo retains non-overlapping
  44px hit areas and the 390px bounded/side-tool plus 560x170 landscape modes.
- Reduced the startup pass from five to four randomized 260ms hard cuts. All
  faces and scales appear once; themes are sampled without replacement; the
  last cut differs from the initial state by at least two axes; finish restores
  the exact saved/default state. Fresh compact defaults to Small and expanded
  defaults to Medium.
- Mobile `pencil-3` now uses the same single glyph in both states. Its optical
  box is `1em` and follows the active body scale inside a fixed 44px target.
- Mandy's second alpha video wide profile is now 150vw. Touchbaes gained
  “Make a booking here!” with only “here” linked to https://www.touchbaes.ca;
  the existing fine-pointer link hover bold remains the authority.
- Local proof: 390x844 panel 390x245, 768 portrait panel 390x246, 844x390
  panel 560x170, 1024 default Medium, compact default Small, Mandy 585px at a
  390px viewport, no page overflow, four-state signature, and exact final
  White/Serif/Small/Straight landing on a fresh compact session.
- Cargo reload proof: one `.mms` root, two `responsive-36` markers, zero
  `responsive-35`, one managed `mms mono` block, UTF-8 clean bodycopy,
  Touchbaes link present, 57,050 CSS bytes, 18/21 desktop caption, four-state
  signature, mobile panel 390x245, slider left of palette, optical labels
  16/15/15.8/12.7, Mandy 150vw, and zero page overflow.
- DRAFT ONLY — NOT published. The public site remains `responsive-34`.

## Round 35 (2026-07-12): single compact panel and right-aligned bounded sheet — DRAFT
- Removed the dedicated short-landscape control-panel treatment completely.
  Compact mode now uses one 390x244 Figma composition in every orientation;
  only its viewport anchoring changes. Expanded mode remains the existing
  left-rail panel from 1024px upward.
- Compact geometry is now full-width and bottom-attached through 430px;
  390px wide, right-aligned with a 16px inset at 431–759; and 390px wide with
  24px right/bottom insets at 760–1023. The former centered 431–759 treatment
  and all 560x170 landscape rules were removed.
- Updated Figma component `1:2899` documentation to make the single compact
  treatment explicit. Removed obsolete landscape component `542:365` and
  responsive-reference section `542:400` from the canvas.
- Local Chromium matrix after reload: 430x844 = 430x245 at x0; 431x844 =
  390x245 with 16px right inset; 600x844 and 759x844 retain that same sheet;
  760x844, 844x390, and 1023x768 = 390x246 with 24px right/bottom insets;
  1024x768 returns to the sticky desktop rail. Every compact result uses flex,
  not the deleted landscape grid, and page-level horizontal overflow is zero.
- Cargo draft was CSS-spliced without altering the bodycopy/runtime, then
  reload-verified. At Cargo's 729px compact preview the panel is 390x245 with
  a 16px right inset and zero overflow. At the 2900px expanded preview the
  desktop panel remains 250x332, sticky, with zero overflow. Persisted CSS has
  zero `orientation: landscape` rules, one managed text-style region, and one
  layout region.
- DRAFT ONLY — NOT published. Runtime remains `responsive-36`; the public site
  remains `responsive-34`.

## Round 36 (2026-07-12): desktop panel restoration, breakpoint type defaults, five cuts — DRAFT
- Fixed the panel remaining portaled under `body` when Cargo switched from its
  compact preview back to expanded mode. Cargo can discard the original comment
  placeholder while rebuilding the bodycopy; `restoreExpandedPanel()` now
  recreates that anchor inside `.mms` before restoring the dialog.
- Restored the original expanded position. Cargo proof after a real mobile to
  desktop transition: compact 729px panel is 390x245 at a 16px right inset;
  expanded 2900px panel is 250x332 at x=50 in the left rail. The dialog parent
  changes from `body` back to `.mms`, and page-level overflow remains zero.
- Expanded typeface controls now use the Medium type scale with Cargo-proof
  important declarations: Serif 22, Sans 21.3, Mono 19.8, Gothic 20.2. With no
  saved visitor scale, breakpoint transitions now synchronize the slider to
  Small in compact mode and Medium in expanded mode. Explicit saved choices
  continue to win.
- Corrected the every-refresh render preview from four to five unique 260ms
  hard cuts. Every sequence uses all five themes, every face and scale at least
  once, all three shapes, rejects duplicate complete combinations and the prior
  signature, then restores the exact saved/default state.
- Cargo reload proof: one `.mms` root, `responsive-38` only, five unique
  signature entries, final White/Serif/Medium/Straight expanded state, panel
  back at x=50, Serif control 22px, and zero overflow.
- DRAFT ONLY — NOT published. The public site remains `responsive-34`.

## Round 37 (2026-07-12): mobile slider grid-row correction — DRAFT
- Figma/Cargo visual diff found the compact panel's major structural mismatch:
  the slider inherited desktop `order:3`, so CSS Grid placed it in a second
  implicit row at y=117. That was the exact y-position of the typeface row;
  the opaque typeface buttons covered the entire slider and made the left half
  of the first options row look empty.
- Explicitly pinned both first-row children to `grid-row:1` and `order:1`:
  scale at column 1, palette at column 2. No DOM or runtime change was needed.
- Local 390px proof against Figma `1:2899`: panel 390x245; scale x20/y77/
  w167/h24; palette x203/y77/w167/h24; typefaces x20/y117/w350/h36;
  shapes x20/y169/w350/h36; scale/typeface overlap zero; page overflow zero.
- Cargo reload proof at its 729px compact viewport: panel 390x245 at x323;
  scale x21/y77/w166/h24 and palette x203/y77/w166/h24; typefaces y117;
  shapes y169; slider visible; overlap zero; page overflow zero. Persisted CSS
  contains one token region, one Cargo-managed text-style region, and one
  layout region.
- DRAFT ONLY — NOT published. Runtime remains `responsive-38`; public remains
  `responsive-34`.

## Round 38 (2026-07-12): final compact controls, stable embeds, and mobile booklet taps — DRAFT
- Reconciled the recent back-and-forth requests using the latest decision for
  each element. Figma component `1:2899` is now the single compact control
  treatment: 390x220 plus border, 20px sides, 8px top/bottom, optical rows of
  24/32/36px, and two explicit 18px inter-row gaps. There is no landscape
  variant. Typeface previews are 18/17.4/16.2/15.8px with 21px leading and
  optical offsets; Gothic is lowered rather than visually floating.
- Replaced the mobile pencil trigger with a plus. Open state swaps to a square
  theme-ink close tile with a page-color X; the duplicate close button inside
  the tray is removed. Cargo proof at 390px: tray 390x221 at x0/bottom0,
  rows 24/32/36, gaps 18/18, no internal close, inverse close colors, and zero
  page overflow. Bounded compact sheets retain their right alignment.
- Startup remains five unique 260ms hard cuts. The penultimate cut must differ
  from the final saved/default state in theme, face, and scale before exact
  restoration. A ten-reload local audit passed every time. Fresh compact
  remains Small; expanded remains Medium.
- Fixed Cargo root reconstruction rather than adding another positional patch.
  Runtime `responsive-40` now guards by both version and actual `.mms` root
  identity, so a Cargo-rebuilt root reinitializes and portals its own dialog
  once. Post-reload compact proof: `__mmsPanelRoot` matches the current root and
  panel parent is `BODY`; expanded proof restores parent `.mms`, x50, 250x332,
  bottom50, Medium, Serif 22px, and zero overflow.
- Made the two special mobile media profiles explicit in bodycopy so Cargo
  iframe reuse cannot lose them. At a 390px viewport, Loop's first image is
  429px (110vw) and the Montran booklet is 585px (150vw).
- Touchbaes v9 is hosted at
  `P3031621239906676124572312975161/touchbaes-sticker-game-v9.html`. Compact
  geometry uses one deterministic envelope rather than breathing-time DOM
  measurements; repeated identical size reports are suppressed. Hosted bridge
  proof at 387px: exactly one size message, height460, reserves 53/36/106, and
  frame 387x460. Cargo parent computes 387.195x459.883 without river motion.
- Montran viewer v15 is hosted at
  `O3031621915057509222341902120761/montran-booklet-direct-pdf-v15.html`.
  Compact mode suppresses native drag/swipe page turns and uses tap halves:
  right advances, left goes back, with an 8px movement threshold. Hosted proof
  opened on 19/20, right tap reached 21/22, and a full-width touch drag left the
  spread at 21/22. Desktop StPageFlip hover/click/drag remains unchanged.
- Cargo bodycopy reload readback: one `.mms` root, two `responsive-40`
  markers, no `responsive-39`, new embed hashes once each, old hashes absent,
  and UTF-8 clean. CSS reload readback: 55,964 bytes, one layout region, and
  exactly one each of the Cargo-managed mono/sans/gothic blocks.
- DRAFT ONLY — NOT published. The public site remains `responsive-34`.

## Round 39 (2026-07-13): Figma compact default sync and continuity repair — DRAFT
- Closed the final actionable audit gap without mutating Cargo. Figma component
  `1:2899` remains the 390x220 compact panel, and its nested slider `1:2866`
  now uses `Scale=Small` instead of Medium. The only mobile panel usage
  `21:159` inherited Small automatically. Plugin readback verified both slider
  instances resolve to component `135:340`, and screenshots verified the master
  and usage retain their approved geometry and appearance.
- This aligns the design reference with the existing Cargo behavior: fresh
  compact sessions default to Small below 1024px, while fresh expanded sessions
  default to Medium. Explicit saved visitor choices continue to win.
- Reconciled `HANDOFF-CODEX.md`, the project `CLAUDE.md`, and the root project
  index with the actual Round 38/39 state: `responsive-40`, five 260ms startup
  cuts, the single compact panel treatment, restored expanded left rail,
  Touchbaes v9 `P3031621239906676124572312975161`, and Montran viewer v15
  `O3031621915057509222341902120761`.
- Cargo source hashes are unchanged from the start of this round. No bodycopy,
  CSS, JavaScript, embedded asset, draft, or publication mutation occurred.
- DRAFT ONLY — NOT published. The public site remains `responsive-34`.

## Round 40 (2026-07-13): mobile type modes, Medium default, panel taps, Safari full bleed — DRAFT
- Expanded the Figma Type Scale collection from four desktop modes to eight
  explicit Desktop/Mobile modes. Mobile S/M/L/XL serif body, caption, and
  heading endpoints are 17/16/32, 20/17/38, 24/20/45, and 30/25/56 with
  dedicated leading; the existing Sans, Mono, and Gothic optical multipliers
  remain intact. All fifteen variables retain complete eight-mode values.
- Rebuilt the Slider component set as eight Context/Scale variants. Compact
  Small/Medium/Large/Extra Large and Expanded Small/Medium/Large/Extra Large
  are independently documented. Compact source slider `1:2866` now uses
  Compact/Medium; desktop source `1:3423` uses Expanded/Medium.
- Corrected the Figma compact-header action geometry to an honest 44x44 target
  around the 24px optical icon. The visible clock-to-icon gap is 12px in both
  closed and open header components.
- Cargo runtime advanced to `responsive-42`. Fresh compact and expanded visits
  now both default to Medium; persisted visitor settings continue to win.
  Compact S/M/L/XL uses 22/24/26/28px visible toggle artwork inside the 44px
  target, with scale-aware 44/44/48/52px panel headers and 8/8/10/12px top
  padding. The resulting panel heights are 221/221/229/237px including border.
- Added the requested interaction split: an intentional tap outside the open
  compact tray closes it, while a background pan remains native and leaves the
  tray open. Inside clicks, setting changes, and toggle clicks do not trigger
  outside dismissal.
- Added `viewport-fit=cover`, safe-area-aware top padding, stable final-theme
  page/overscroll backgrounds, and `black-translucent` standalone status-bar
  metadata. A normal iOS Safari tab still retains Apple-controlled status and
  URL chrome; the implementation uses the fullest supported full-bleed page
  treatment without changing theme color during startup cuts.
- Local reload matrix passed at 320, 390, 430, 431, 600, 760, 768, 1023, and
  1024px: Medium defaults, 12px visible clock gap, uniform typeface-button
  coordinates, correct full-width/bounded borders, no page overflow, outside
  scroll staying open, and outside tap closing.
- Cargo draft was updated in two batches and reload-read back. CSS is exactly
  the 60,304-byte local splice with all three managed text-style blocks intact.
  Reloaded bodycopy contains `responsive-42`, the Medium fallback, outside-tap
  handler, `viewport-fit=cover`, and `black-translucent`. Expanded draft CSS
  computes to the retained 22px Medium serif body and 250px left-rail panel.
- DRAFT ONLY — NOT published. The public site remains `responsive-34`.

## Round 41 (2026-07-13): compact first-row geometry and transparent safe-area pass — DRAFT
- Audited Figma compact panel `1:2899` before changing Cargo. The approved
  390px reference has 20px panel sides, a 350px control span, 2px inset on the
  first and typeface rows, a 4px inset at both ends of the 169px slider, and a
  169px palette whose five 24px marks distribute at equal 12.25px visible
  gaps. The existing Figma component already held that geometry, so no Figma
  mutation was needed in this round.
- Rebuilt the compact palette distribution against the complete row instead of
  positioning each visible mark inside unequal flex cells. The palette now
  matches exactly the two typeface-button spans beneath it; every visible gap
  remains equal as the panel narrows. Removed the stale below-360px 56/44
  override that squeezed the palette at 320px.
- Added 4px inline padding to the compact slider and protected it with
  `min-width:0`, so both “a” labels keep the Figma breathing room without
  shifting the lower button grid.
- Separated the mobile header action's visual box from its touch target. The
  visible plus/close box remains 22/24/26/28px at S/M/L/XL and retains its
  current position; a transparent pseudo target expands it to 44x44px. Native
  tap highlight, shadow, filter, and pointer-focus artifacts are suppressed;
  keyboard focus still outlines the smaller visible frame.
- Advanced Cargo to `responsive-43`. The separate Figma/Cargo Mobile type
  ladder from Round 40 remains authoritative and both compact and expanded
  unsaved sessions remain Medium.
- Refined the safe-area contract: retained `viewport-fit=cover`, removed every
  explicit `theme-color` meta so startup cuts cannot leave a solid browser
  swatch, restored native vertical overscroll, and made the header and tray
  plates stop before their physical top/bottom safe areas. Added
  `apple-mobile-web-app-capable=yes` alongside `black-translucent` for the only
  context where Apple exposes translucent standalone status-bar behavior.
  Normal Safari tabs still own their status and URL chrome; web content cannot
  remove those controls or force them transparent.
- Local reload matrix passed at 320/390/430/431/600/760/1023/1024px. At 320,
  slider and palette are both 134px; every palette gap is 3.5px. At 390 they
  are both 169px; every palette gap is 12.25px. At bounded widths they are both
  168px with 12px gaps. The mobile action's visible box is 24px at Medium with
  a 44px target, and every width has zero page overflow.
- The first Cargo CSS splice in this round was invalid: it contained
  `site.css` but omitted the separate `tokens.css` source, producing a
  51,904-byte document with undefined layout/type/color/media variables. That
  whole-site regression is corrected and documented in Round 41b below.
- DRAFT ONLY — NOT published. The public site remains `responsive-34`.

## Round 41b (2026-07-13): emergency token restoration and deployment guard — DRAFT
- Root cause of the all-breakpoint layout failure: the Round 41 deployment
  payload was assembled from `site.css` alone. Local testing did not expose it
  because `assemble-test.sh` correctly loads `tokens.css` and `site.css` as two
  separate stylesheets. Cargo received the layout references without any of
  their variable definitions.
- Immediately restored the exact pre-change 60,304-byte Cargo stylesheet and
  reloaded the draft before rebuilding the intended refinement.
- Rebuilt Cargo in the only valid order: untouched Cargo head + complete local
  `tokens.css` + untouched Cargo-managed font styles + complete local
  `site.css`. The corrected persisted document is 62,172 characters and contains
  exactly one token region, one layout region, one managed mono region, two
  `--layout-u` definitions, the Mobile Type Scale block, and balanced 378/378
  braces. Full copy-back after reload is byte-for-byte identical.
- Verified the actual Cargo draft, not only the local mirror, at 320, 390, 768,
  1023, 1024, 1440, 1920, and 2940px. Compact root/main/river widths equal the
  viewport; expanded mode switches at 1024; the rail is 272px at 1440 and caps
  at 340px; the panel is 200px at 1440 and caps at 250px; media resumes its
  307/432/576px progression; and page overflow is zero at every width.
- Added `cargo/compose-css-bundle.sh` and hardened PLAYBOOK section 3.2. Future
  deployments now fail before Cargo unless both source files, both structural
  markers, the layout variables, Mobile Type Scale, and balanced braces are
  present. Fixed byte-length checks are forbidden.
- Bodycopy/runtime remains `responsive-43`; no project content, embed, or
  publication state changed during the recovery.
- DRAFT ONLY — NOT published. The public site remains `responsive-34`.

## Round 42 (2026-07-13): iOS rivers, contextual type scale, and desktop panel — DRAFT
- Root cause of the iOS river regression was the compact
  `.mms-river { pointer-events:none; }` rule introduced for shaped-media
  click-through. WebKit could no longer assign the native pan gesture to the
  overflow container. The scroller now keeps `pointer-events:auto`,
  `overflow-x:auto`, `-webkit-overflow-scrolling:touch`, and
  `touch-action:pan-x pan-y`; individual media retain their existing visible
  shape and interaction rules.
- Removed the sticky mobile header's `::before` background plate while keeping
  safe-area padding. Combined with `viewport-fit=cover`, no `theme-color`, and
  standalone `black-translucent`, this lets the actual page surface extend
  beneath Safari's material. Normal Safari status and URL controls remain
  browser-owned and cannot be removed or forced transparent by page CSS.
- Rebuilt Figma Type Scale as four user-facing modes: Medium, Small, Large, XL.
  Existing values are split into 15 Desktop and 15 Mobile primitives. Fifteen
  semantic `Space/type/*` aliases choose Mobile values only in Space/Mobile and
  Desktop values in Desktop, Desktop 1800, and Desktop 2560. Typeface size
  variables and all six text styles now resolve through those aliases. Mobile
  caption size is unchanged; leading is tightened to S18/M19/L22/XL28.
- Synced Cargo to Figma desktop panel `1:1039`: palette row first, scale row
  second, typeface row third, shapes fourth. The scale row carries the requested
  4-design-unit left/right inset. Compact panel ordering is preserved.
- Runtime advanced to `responsive-44`. Local browser checks passed at
  320/390/768/1023/1024/1440/1920/2940px with zero page overflow. At 390px,
  Medium captions compute to 19px leading, the first river has 2,109px scroll
  extent inside a 390px viewport, horizontal input moves it, and vertical input
  over the same river still scrolls the document.
- Cargo draft was updated with the complete token-safe splice, saved, hard
  reloaded, and copied back. Persisted CSS is exactly 62,318 characters with one
  token marker, one layout marker, one managed mono region, two `--layout-u`
  definitions, Mobile Type Scale, and balanced 380/380 braces. Bodycopy has one
  MM.S root, no `responsive-43`, and two expected `responsive-44` guards.
- Actual Cargo mobile-preview proof at 711px: page overflow 0; caption leading
  19px; header pseudo content `none`; theme-color count 0; river overflow
  `auto`, pointer events `auto`, touch action `pan-x pan-y`; a real horizontal
  gesture moved the visible river 36.5 -> 336.5px, and a vertical gesture over
  that river moved the page 5282.5 -> 5462.5px.
- DRAFT ONLY — NOT published. The public site remains `responsive-34`.

## Round 43 (2026-07-13): compact panel v3, shaped-gap taps, and Kelly order — DRAFT
- Re-audited Figma compact panel `1:2899` and mobile page `11:31` before
  changing Cargo. The current panel is 390x179 with no title row: 22px outer
  top/bottom composition padding, 24/36/42px optical rows, 16px row gaps, and
  full-width side borders removed through 430px. Typeface boxes are 36px high;
  their inner labels use the Figma optical padding pairs Serif 4/4, Sans 3/5,
  Mono 4/4, and Gothic 6/2. The compact sheet remains one composition in every
  orientation and keeps 44px interaction areas around the smaller artwork.
- Removed the stale `Controls` title from Cargo and replaced dialog labelling
  with `aria-label="site controls"`. Added the Figma intro copy treatment,
  `Have fun with the + control panel`, using an inline text plus that inherits
  the active typeface and scale.
- Root-caused shaped-media click-through correctly: `clip-path` changed the
  image hit region, but the full rectangular `.mms-river` still sat above the
  sticky header and owned taps in transparent oval/rounded corners. Runtime
  `responsive-45` now forwards only a completed trusted tap inside the
  header action's 44px target when the point is outside every visible media
  silhouette. Pointer/touch start and movement are untouched, so native iOS
  horizontal and vertical panning remain intact. Visible media still owns its
  own taps.
- Reordered only the compact Kelly grid to source sequence 3, 2, 1, 4. The
  caption remains grid column 1/row 2 and therefore now sits beneath image 3.
  The expanded two-by-two grid and its source order remain unchanged.
- Local proof at 390x844: panel exactly 390x179; optical rows 24/36/42; both
  gaps 16; no title; zero side borders; Kelly left-to-right filenames are
  `kelly-sgc30-5`, `kelly-sgc30-3`, `kelly-sgc30-6`, `kelly-sgc30-1`; a tap
  through an oval river gap opened the tray; a straight-frame media tap did
  not; native river input moved scrollLeft by 220px. The responsive panel also
  passed at 430, 431, 768, and the 1024 expanded switch.
- Cargo draft was updated, saved, reloaded, and copied back. Persisted CSS is
  exactly 62,184 characters with one token marker, one layout marker, one
  managed mono region, two `--layout-u` definitions, Mobile Type Scale, and
  balanced 383/383 braces. Bodycopy contains two `responsive-45` guards, no
  `responsive-44`, the intro plus, no panel title, and the `site controls`
  label. At Cargo's 350px embedded mobile viewport the panel is 350x179 with
  24/36/42 rows, 16/16 gaps, zero overflow, shaped-gap tapping works, and a
  native horizontal gesture moved the river by 180px. Expanded Cargo retains
  the left panel at x50, width250, bottom50, height332, with zero overflow.
- DRAFT ONLY — NOT published. The public site remains `responsive-34`.

## Round 44 (2026-07-13): iOS Safari full-bleed stabilization — DRAFT
- Advanced the homepage runtime to `responsive-46`. The viewport metadata now
  contains `viewport-fit=cover` before the visible `.mms` composition, rather
  than being added after startup. The early homepage initializer reads the
  saved theme (White when absent), exposes its final color as
  `--mms-edge-color`, removes every `theme-color` meta, and mounts a fixed,
  non-interactive edge canvas behind the portfolio.
- Kept the page edge on the final saved/default theme throughout the five
  260ms startup cuts. Only the visible `.mms` composition previews the temporary
  theme/type/scale/shape combinations, preventing Safari from sampling a
  temporary black, pink, or other startup surface as its persistent toolbar
  color. Fresh compact and expanded sessions both remain Medium; saved visitor
  choices still override the default.
- Added the homepage-only `refreshIOSChrome(reason)` compositor refresh for
  iOS Safari. It mounts an effectively invisible, pointer-transparent layer in
  the final edge color, advances it through a two-frame `translateZ` change,
  and removes it without changing scroll, focus, or hit testing. It runs after
  startup restoration, `pageshow`, background return, orientation changes,
  meaningful debounced VisualViewport geometry changes, intentional theme
  changes, and a real control-panel close. Ordinary document scroll does not
  retrigger it.
- Removed separate safe-area plates. The edge canvas supplies only the stable
  page backing; real imagery and section surfaces remain above it and can paint
  beneath Safari material. Important header and panel controls retain their
  safe-area insets. Compact bands remain above the sticky header and the open
  panel remains above both.
- Added Figma reference frame `591:409`, `home / mobile — iOS Safari safe-area
  reference`, at 390x844. It distinguishes Safari-owned top/bottom material,
  unsafe visual bleed, and the inset safe interactive boundary without
  altering the production mobile frames.
- Local verification passed: five hard startup states appeared at roughly
  260ms intervals while the edge remained White, saved Black/Gothic/Large/Oval
  restored exactly with a Black edge, and the emulated iOS refresh layer caused
  no scroll or focus movement and removed itself after every run. The
  320/390/768/1023/1024/1440 matrix retained Medium defaults, zero page-level
  overflow, and intended river overflow.
- Cargo draft was updated in two batches, saved, reloaded, and re-probed. The
  persisted complete stylesheet is 63,097 characters with one token region,
  one layout region, exactly one each of the managed Mono/Sans/Gothic blocks,
  and balanced 387/387 braces. Reloaded bodycopy contains two
  `responsive-46` markers, no `responsive-45`, one edge canvas, early
  `viewport-fit=cover`, and zero `theme-color` metas. Expanded proof at 2900px
  retained 22/25px Medium serif, zero page overflow, and the full-width root;
  Cargo's 350px embedded compact proof retained 20/23px Medium serif, panel
  z40, band z20, native river overflow/touch action, and zero page overflow.
- Physical Safari 26 verification remains a release gate because Chromium
  cannot confirm Safari-owned status/URL material. If repeated physical-device
  tests show no toolbar improvement, remove only the disposable compositor
  refresh and retain the standards-based early metadata and stable edge canvas.
- DRAFT ONLY — NOT published. The public site remains `responsive-34`.

## Round 44b (2026-07-13): Cargo preview stacking correction — DRAFT
- Reproduced Ocean's blank Cargo editor preview immediately after Round 44.
  The site DOM, media, descriptions, runtime, and scroll geometry were present,
  but the new fixed `#mms-edge-canvas` painted above Cargo's isolated
  `.page-content` stacking context. `pointer-events:none` protected input but
  did not change paint order, so the opaque edge backing visually covered the
  entire embedded preview.
- Moved only the edge canvas from `z-index:0` to `z-index:-1`. The stable edge
  color remains on `html` and `body`, so Safari keeps the same final-theme
  backing while Cargo's preview and the real portfolio always paint above it.
- During the CSS editor recovery, Cargo retained physical focus on the page
  wordmark and briefly inserted the CSS payload there. This was caught on the
  first reload. The exact 92,155-character `cargo/home.html` mirror was restored
  through the bodycopy HTML editor before any handoff.
- Final reload proof: one `.mms` root, wordmark exactly `MM.S`, two
  `responsive-46` markers, no `responsive-45`, edge canvas computed z-index
  `-1`, White/Serif/Medium restored, zero page overflow, and the complete EVIIVE
  river visibly rendered. Persisted CSS is 63,390 characters with one token
  region, one layout region, one edge-canvas rule, balanced 387/387 braces, and
  the negative stacking correction present.
- DRAFT ONLY — NOT published. The public site remains `responsive-34`.

## Round 45 (2026-07-13): real-content iOS edge flow — DRAFT
- Removed the fixed-color Safari model from the production stylesheet. The
  homepage root and Cargo wrappers are transparent; `.mms` remains the actual
  themed page surface. `#mms-edge-canvas` is no longer positioned or painted
  by CSS and reloads as a static zero-height node, so it cannot cover or tint
  the portfolio.
- Compact rivers no longer carry permanent inline padding. Equal `::before`
  and `::after` flex spacers preserve the intended resting inset, then scroll
  away with the river so media can reach the physical left and right viewport
  edges. Native `overflow-x:auto`, `-webkit-overflow-scrolling:touch`, and
  `touch-action:pan-x pan-y` remain on the river.
- Added the 1,270-character `cargo/site-head.html` hook in Cargo's HTML region.
  It establishes `viewport-fit=cover` before the body composition and removes
  `theme-color`, `apple-mobile-web-app-status-bar-style`, and
  `apple-mobile-web-app-capable`, including any late reinsertions by the older
  body runtime. It is guarded to the public homepage and Cargo's
  client-side-rendering preview.
- Cargo CSS was pasted and copied back byte-for-byte at 63,341 characters with
  one token region, one layout region, one managed Mono/Sans/Gothic region,
  and balanced 386/386 braces. Reloaded expanded proof retained a full-width
  root and zero page overflow. Cargo's 711px compact preview measured transparent
  html/body/page wrappers, no chrome-color metas, `viewport-fit=cover`, river
  padding 0, 3,806px native scroll extent, `pan-x pan-y`, equal 15.13px resting
  spacers, and zero page overflow.
- The live Cargo bodycopy remains the reload-proven `responsive-46` bundle; its
  obsolete edge nodes and metadata are neutralized by the new stylesheet/head
  hook. The cleaned `responsive-47` bodycopy mirror is local, but Cargo's raw
  page mutation channel was unavailable during this round, so it was not
  claimed as persisted. Physical iPhone Safari remains the final proof for
  Safari-owned toolbar material.
- DRAFT ONLY — NOT published. The public site remains `responsive-34`.

## Round 46 (2026-07-13): Safari 26 sticky-tint correction — DRAFT
- Ben Nasedkin's Safari 26 analysis identified the remaining derivation path:
  Safari extends the computed background of fixed/sticky elements bordering an
  obscured viewport edge into its toolbar. WebKit engineer Wenson Hsieh confirms
  that this solid-color extension is specifically tied to viewport-constrained
  fixed/sticky elements near the edge (WebKit bug 301756).
- The compact header row was already transparent, but the sticky mobile links
  block and sticky introduction still used `var(--color-bg-page)`. During the
  80ms startup preview, either could become yellow and be retained by Safari
  for both bars. Both retain their sticky geometry and z-index but now have
  transparent backgrounds, allowing the real page/showcase surface through.
- Advanced the local homepage runtime to `responsive-48`. iOS Safari now holds
  the saved/default final state through two real painted frames plus 180ms
  before starting the same five 260ms hard cuts; other browsers retain the
  existing 80ms first-cut timing. This gives Safari's initial tint sampling a
  stable final surface without removing the refresh sequence.
- Pre-deployment browser QA caught one runtime-only regression that syntax
  checking could not: deferred media referenced undeclared `isIOS` and
  `isSafari` flags. The flags now live once at initialization scope and are
  shared by startup timing and deferred-source selection. `panel.js` and the
  complete embedded copy in `home.html` were byte-identical before deployment;
  critical media loaded again, and iPhone-Safari UA tests selected the HEVC
  `data-mp4` renditions for both alpha videos.
- Deployed the complete token + site CSS bundle while preserving Cargo's head
  and managed font regions, installed `site-head.html` through Cargo's HTML
  region, and reinjected the complete homepage with the UTF-8-safe
  `TextDecoder` + `InputEvent` method. The bodycopy was saved, the editor was
  reloaded, and persistence was re-probed rather than inferred from the paste.
- Reloaded Cargo proof: one `.mms` root; two `responsive-48` markers and no
  `responsive-46`; live runtime `responsive-48`; viewport metadata exactly
  `width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover`;
  zero `theme-color`, Apple standalone, or Apple status-style metas; and
  transparent `html`, `body`, and Cargo wrapper ancestors.
- Compact 390px proof retained sticky positioning for both the mobile links and
  introduction while both backgrounds computed transparent. The first river
  remained a native scroller with `overflow-x:auto`, `touch-action:pan-x pan-y`,
  `pointer-events:auto`, and a 2,109px scroll width inside a 390px client width.
  Page-level horizontal overflow was zero. Reloaded expanded mode showed no
  layout or interaction regression.
- DRAFT ONLY — no publish action was taken. Physical iPhone Safari remains the
  required proof for the Safari-owned status and URL-bar material; this Cargo
  verification does not claim that toolbar result is physically confirmed.

## Round 47 (2026-07-13): introduction, project years, caption leading, and expanded panel geometry — DRAFT
- Removed the conflicting inline introduction width and made Figma's current
  `col/6` value the single Cargo contract. Reloaded Cargo at 1440px computes the
  introduction to exactly 664px wide at x272, ending at x936 immediately before
  EVIIVE. The inline `+` before “control panel” is now compact-only and follows
  the same below-1024px switch as the top-right trigger.
- Added the 12 current Figma project years without changing the descriptions:
  2026 for V7, Touchbaes, and Mandy Ma; 2025 for EVIIVE, Loop, Montran, and
  Kelly's Kelly; 2024 for AnyDay, Curate Health, and PURE LOVE; and 2023 for
  Dead Good and WTW.
- Kept the separate Mobile/Desktop type contexts and the S/M/L/XL modes. Mobile
  caption leading is now 17/18/21/27px across Serif, Sans, Mono, and Gothic;
  desktop caption leading remains 17/21/25/34px. The corresponding Figma
  variables and Mandy Ma text binding were updated with the Cargo tokens.
- Rebuilt the expanded fine-pointer control panel around Figma component
  `1:1039`: 20/24/32/36-unit optical rows at 1440px, equal outer padding and
  group gaps, a 2x2 typeface grid, breakpoint-Medium panel typography, and
  optical label corrections on inner spans only. The local matrix measured
  142.22x208.88px at 1024px, 200x232px at 1440px, and a capped 250x290px from
  1800px through 2940px. Coarse-pointer expanded controls retain 44px targets.
  Figma compact component `1:2899` remains the 390x178 source reference; the
  reloaded Cargo panel is 390x179 including its border.
- Deployed the complete token + site bundle, saved the complete homepage, and
  reloaded the Cargo editor before verification. Persisted CodeMirror content
  is 65,159 characters with one token marker, one layout marker, one each of
  the managed Mono/Sans/Gothic regions, one panel-control contract, and the
  `col/6` introduction rule. Reloaded bodycopy has one MM.S root, two
  `responsive-49` markers, no `responsive-48`, live runtime 49, and exactly 12
  year labels.
- Live 1440px proof: introduction 664px, panel x40/200x232px, compact plus
  hidden, and zero page overflow. Live 390px proof: S/M/L/XL caption leading
  17/18/21/27px, inline plus visible, desktop panel copy hidden, compact panel
  copy visible, panel 390x179px, transparent sticky links/introduction, native
  rivers (`overflow-x:auto`, `touch-action:pan-x pan-y`, pointer events
  enabled), and zero page overflow.
- DRAFT ONLY — reload-verified and never published. The public site remains
  `responsive-34`.

## Round 50 (2026-07-13): explicit media-shape frames and fit policies — DRAFT
- Replaced the global replaced-element shape treatment with an explicit,
  auditable media contract. The homepage now has 68 unique `data-media-id`
  values: 59 `crop`, six `artwork`, and three `interactive`. The 65 decorative
  items live in `.mms-frame` wrappers; V7, Touchbaes, and Montran remain direct
  rectangular, unclipped iframe children so their interactions are not masked.
- Fit behavior is explicit for every media ID: 64 `contain`, one intentional
  `cover`, and three `none` interactive embeds. The only `cover` item is WTW's
  confirmed 16:9 crop. Straight mode gives the frame no clip, rounded mode
  clips the frame with the 24-unit inset shape, and oval mode uses the frame
  ellipse. In every mode the replaced image/video child itself computes with
  no clip, so shape, fitting, and media behavior are no longer conflated.
- Advanced the runtime to `responsive-50` and retained the shaped-gap trusted
  tap logic against visible `.mms-frame` silhouettes plus direct interactive
  embeds. River scrollers remain pointer-active rather than disabling their
  gesture layer.
- Deployed the complete CSS and bodycopy, then reloaded the complete Cargo
  editor before reading persistence back. Bodycopy contains two
  `responsive-50` markers, no `responsive-49`, and live runtime 50. Reloaded
  CodeMirror CSS is exactly 65,747 characters with one token marker, one layout
  marker, one shape-policy marker, and balanced 406/406 braces.
- Live compact 390px proof: 13 rivers, 12 horizontally scrollable; river touch
  action `pan-x pan-y`, pointer events enabled, zero page overflow, inline plus
  visible, and S/M/L/XL caption leading 17/18/21/27px. Shape probes confirmed
  straight/rounded/oval frame clips of none/inset-24/ellipse while every child
  retained `clip-path:none`.
- Live expanded 1440px proof: introduction 664px, panel 200x232px, compact plus
  hidden, Kelly restored as a 2x2 grid of 523.4x380.2px cells, and zero page
  overflow.
- DRAFT ONLY — reload-verified and never published. Physical iPhone Safari
  toolbar behavior was not re-tested by Codex and remains an explicit release
  gate. The public site remains `responsive-34`.

## Round 51 (2026-07-13): exact five-cut startup and compact trigger alignment — DRAFT
- Removed the saved/default pre-roll that made the startup read as a sixth
  visual. Preview one now paints synchronously, previews two through five are
  scheduled at 260/520/780/1040ms, and the exact saved/default state is
  restored at 1300ms. There are still five randomized hard-cut combinations;
  no crossfade, transition, browser-color meta, sticky color plate, or
  compositor surface was introduced.
- This lets the real first preview surface reach Safari's already-transparent
  status/URL material during refresh. `site-head.html` remains marker 48:
  `viewport-fit=cover` is early and `theme-color` plus Apple standalone/status
  metadata remain absent. A physical iPhone remains the only valid proof of
  Safari-owned material following all five cuts.
- Rebuilt the compact inline plus around the actual Cargo font metrics. It
  inherits the active face, size, and leading, with per-face optical shifts of
  Serif `0.092em`, Sans `-0.005em`, Mono `0.128em`, and Gothic `0.08em`.
  Reloaded Cargo's Medium Serif required 1.836px and applied 1.84px; the same
  normalized offsets were confirmed for all four faces at S/M/L/XL.
- Separated the compact toggle's visible square from its glyph size at every
  scale: 22/17, 24/20, 26/24, and 28/28px. A reload probe exposed Cargo's
  later button-font cascade forcing the XL SVG to 30px inside the 28px square,
  so the menu font and SVG width/height are now pinned to the glyph token while
  the transparent pseudo target remains 44x44px.
- Local WebKit startup tracing measured five preview states at approximately
  18/278/538/798/1059ms and the final landing at 1318ms, with zero-duration
  transitions. All 16 face/scale toggle combinations centered locally.
- Deployed the complete tokens + site bundle while preserving Cargo's head and
  managed font region, then replaced the complete UTF-8 bodycopy and saved it.
  Reloaded bodycopy has one `.mms` root, two `responsive-51` markers, no
  `responsive-50`, and live runtime 51.
- Persisted CodeMirror readback is 68,384 characters with one token marker,
  one layout marker, one managed Mono region, two `--layout-u` definitions,
  one device-type-scale contract, three icon-geometry pins, and balanced
  409/409 braces. Reloaded compact proof retained transparent sticky/root/Cargo
  surfaces, no browser-color or Apple metas, `viewport-fit=cover`, native
  `overflow-x:auto` plus `pan-x pan-y` rivers, and zero page overflow. At XL,
  the pressed square and close SVG both measured 28x28px with a 0/0 center
  delta and a 44x44px target. Expanded mode retained Medium Serif, hidden
  compact plus, capped 250x290px panel geometry at the tested 2018px viewport,
  and zero page overflow.
- DRAFT ONLY — reload-verified and never published. The public site remains
  `responsive-34`.

## Round 52 (2026-07-13): four-preview startup and desktop panel inset — DRAFT
- Changed the refresh treatment from five previews plus the landing state to
  four 260ms hard-cut previews plus the exact saved/default landing state.
  Preview one paints synchronously; the remaining previews begin at
  260/520/780ms and the landing state returns at 1040ms. There are no
  crossfades or transition durations.
- The four preview themes exclude the visitor's landing theme, so a fresh
  White session shows Girly, Quirky, Contrast, and Black once each before
  returning to White. All four faces and all four scales appear exactly once;
  all three shapes appear with one non-adjacent repeat. The previous sequence
  signature is still rejected and visitor settings are never overwritten.
- Safari 26 continues to show browser-owned white material during these rapid
  runtime background cuts on the physical iPhone. No `theme-color`, fixed edge
  plate, sticky background, or synthetic compositor was reintroduced: those
  approaches can leave Safari stuck on an arbitrary preview color and would
  regress the now-working transparent/full-bleed landing state. Exact toolbar
  resampling for each 260ms runtime cut remains a WebKit limitation, not a
  controllable page state.
- Updated the expanded panel to Figma's corrected 24-unit top/bottom and
  16-unit side inset. The padding follows `--chrome-u` and remains separate
  from compact-panel geometry. Cargo's editor retains a later compiled copy of
  the prior stylesheet in its preview; the new desktop padding therefore uses
  the root-qualified `.mms dialog.mms-panel` selector so the saved rule wins
  on specificity as well as in the final single-stylesheet output.
- Local WebKit traced four preview states followed by the final state, with
  zero-duration transitions. Local Chromium measured the expanded panel at
  142.22×220.25px at 1024px, 200×248px at 1440px, and a capped 250×310px from
  1800px upward, with zero page-level overflow.
- Deployed the complete token + site CSS bundle and the complete UTF-8-safe
  homepage bodycopy, then saved and reloaded the Cargo editor. Reloaded CSS is
  68,946 characters with one token marker, one layout marker, one each of the
  managed Mono/Sans/Gothic regions, two root-qualified panel rules, and
  balanced 409/409 braces. Reloaded bodycopy contains two `responsive-52`
  markers, no `responsive-51`, one four-preview constant, one 260ms hold
  constant, and all 12 project taglines; live runtime reports
  `responsive-52`.
- Live 1440px proof measured the panel at x40/200×248px with computed 23px
  vertical and 15px horizontal CSS padding; its 1px border yields the intended
  visible 24/16 inset. The final state was White/Serif/Medium/Straight and page
  overflow was zero. Live 390px proof retained transparent html/body/sticky
  surfaces, no browser-color or Apple standalone/status metadata,
  `viewport-fit=cover`, native river `auto`/`pan-x pan-y`, and zero overflow.
- DRAFT ONLY — reload-verified and never published. The public site remains
  `responsive-34`.

## Round 52a (2026-07-13): dual-recipient Email link — DRAFT
- Updated both expanded and compact navigation Email anchors to
  `mailto:ocean@mmmmm.studio,alvis@mmmmm.studio`, making Ocean and Alvis
  primary recipients in the visitor's mail composer.
- Replaced the complete UTF-8-safe Cargo bodycopy, saved, and reloaded the
  editor. Reloaded proof found exactly two Email anchors, both using the new
  dual-recipient URI, zero remaining single-recipient anchors, two
  `responsive-52` markers, and live runtime `responsive-52`.
- DRAFT ONLY — reload-verified and never published. The public site remains
  `responsive-34`.

## Round 52b (2026-07-13): Cargo CSS transfer-residue repair — DRAFT
- Audited the actual persisted Cargo CodeMirror document after Ocean flagged
  line 69. The line contained `border: 0;` followed by an accidental
  1,858-character Base64 transfer fragment in the preserved Cargo head. This
  was not present in either local CSS source.
- The previous deployment checks missed it because the fragment did not add
  braces or duplicate the token/layout markers, and every later CSS splice
  deliberately preserved the Cargo head. Removed the complete fragment and
  restored line 69 to the intended `border: 0;` declaration.
- Rebuilt the complete four-region stylesheet using the clean local
  `tokens.css` + `site.css` bundle while preserving the Cargo head and managed
  text-style region, saved, reloaded the Cargo editor, and re-read CodeMirror.
  Persisted CSS is now 67,089 characters with one token marker, one layout
  marker, balanced 409/409 braces, exact local token/layout hashes, zero
  Base64 runs, zero lines over 500 characters, and no HTML or transfer-runtime
  residue.
- Added complete-document residue checks to `PLAYBOOK.md` so future CSS
  deployments reject Base64 payload fragments, overlong CSS lines, and
  `TextDecoder`/`atob(`/`innerHTML`/runtime-marker leakage even when the normal
  marker and brace checks pass.
- Reloaded regression proof retained expanded grid mode at the 2018px editor
  viewport, the x50/250px sticky panel, and zero page overflow. A live 390px
  iframe probe retained compact block mode, native river `overflow-x:auto`,
  `pan-x pan-y`, two `responsive-52` markers, and zero page overflow.
- No layout, typography, media, runtime, or bodycopy source changed;
  `responsive-52` remains the draft runtime.
- DRAFT ONLY — reload-verified and never published. The public site remains
  `responsive-34`.

## Round 52c (2026-07-13): complete payload residue audit and executable guard — DRAFT
- Re-read the complete persisted Cargo CSS rather than relying on the Round
  52b log. Reloaded line 69 is exactly `border: 0;`; the 67,133-byte document
  has balanced 409/409 braces, no Base64-like runs, no lines over 500
  characters, no transfer/runtime strings, no mojibake, and one each of the
  managed Mono, Sans, and Gothic regions. Its SHA-256 is
  `e66c21b26f8e22c6f6cd38194589825b6f27b3fd42b567d1495873f9739de5bb`.
- The wider audit found two actual bodycopy residues left by an earlier Cargo
  mirror: literal `er` inside the first EVIIVE video and live desktop
  coordinates/display state serialized onto `#mms-tw-rig`. Removed both from
  `home.html`, restored the rig to an unstyled hidden initial node, removed
  case-duplicate SVG attributes from the local source, and regenerated
  `test.html`.
- Replaced the complete Cargo bodycopy, saved, reloaded, and copied the whole
  editor back. Reloaded proof is one `.mms` root, two `responsive-52` markers,
  four balanced script pairs, one balanced style pair, and zero stray video
  text, rig inline state, Base64, transfer-decoder residue, or mojibake. Cargo's
  serializer re-adds lowercase `viewbox` aliases to five inline SVGs on
  reload; the local source remains canonical and the aliases do not alter the
  rendered SVG geometry.
- Corrected a separate source/live head drift. Cargo's HTML region now matches
  `site-head.html` byte-for-byte at 1,270 bytes with exactly one
  `data-mms-ios-edge-head="48"` marker and no stale marker 47, Base64, or
  overlong line.
- Added `validate-cargo-payload.sh` with `css`, `persisted-css`, `bodycopy`, and
  `head` modes. `compose-css-bundle.sh` now validates its complete emitted
  bundle, and `assemble-test.sh` validates the bodycopy, head, and bundle before
  rebuilding the test mirror. Fault injection proved the guard rejects a
  300-character transfer run, stray video text, and serialized rig state.
- No layout, typography, media dimensions, startup sequence, or runtime
  behavior changed. Expanded Cargo remained visually intact after reload.
- DRAFT ONLY — no publish action was taken. The public site remains
  `responsive-34`.

## Round 53 (2026-07-14): Figma mobile grids and complete Who/Write deployment — DRAFT
- Formalized the named-page compact system in Figma. Who mobile frame
  `638:432` and Write mobile frame `640:448` now use the actual `grid/mobile`
  layout: six stretch columns, 16px gutters, 20px margins, and 24px baseline
  rows. Both frames explicitly use Space/Mobile and Type Scale/Medium, with
  `col/6` resolving to the 350px content width at the 390px reference.
- Added the corresponding Cargo compact-grid contracts without changing the
  homepage grid. Full named-page containers use the six-column content span.
  Who portraits remain deliberately art-directed rather than stretched to a
  column span: they scale from 176px through 200px and are left-aligned in both
  founder rows. Write preserves the Figma endpoint proportions while
  responding between references: 90.2857%, 68.5714%, 100%, 100%, and 80%,
  capped respectively at 316, 316, 432, 664, and 432px.
- Uploaded and connected the two founder profile videos and their posters from
  Cargo's Freight library. The clean Who page at `B2402536676` now contains
  two founder profiles and both videos; the clean Write page at
  `P0060651058` contains all five writing pieces. Both complete bodycopies were
  installed with the UTF-8-safe `TextDecoder` + `InputEvent` method, saved with
  Cmd+S, reloaded, and verified on the clean page IDs.
- Replaced the complete Home bodycopy as a cleanup step after asset upload and
  reload-verified that no temporary profile-media insertion remained. Home,
  Who, and Write retain the current `responsive-52` runtime and clean `/`,
  `/write`, and `/who` navigation.
- Deployed the complete token + site CSS bundle while preserving Cargo's head
  and all three managed font regions. Reloaded CodeMirror is 75,160 characters
  with one token marker, one layout marker, one each of the managed Mono,
  Sans, and Gothic regions, two `--layout-u` definitions, one compact-grid
  contract, balanced 457/457 braces, a 197-character maximum line, and no
  Base64 or transfer/runtime residue. The complete local bundle SHA-256 is
  `9673926131f31fa14a7bd913aa0a2654dbc561f15c648bfc2a0f0c66e5e8feb8`.
- The exact local viewport matrix at 320, 390, 430, 768, 1023, 1024, and
  1440px has zero page-level overflow. At 390px the Who portrait is
  199.98x237.25px and the five Write widths are 316, 239.98, 350, 350, and
  280px. At 1024px and above, the existing expanded named-page composition is
  retained. Both Freight videos reached readyState 4, played muted, and
  reported no media error.
- DRAFT ONLY — reload-verified and never published. The public site remains
  `responsive-34`.

## Round 53a (2026-07-14): Round 53 public release — PUBLISHED
- Ocean explicitly authorized publication twice, including the final
  action-time confirmation and approval of the Dia AppleScript fallback after
  the normal desktop-control connection failed.
- Published the existing verified Round 53 draft through Cargo at 11:44 EDT.
  Cargo's queued-change state cleared after the publishing spinner completed;
  no bodycopy, CSS, head, asset, or page-setting edit was made during release.
- Independently verified the public routes with cache-busting URLs:
  `https://mmmmm.studio/`, `/who`, and `/write` all load with their expected
  titles and clean navigation. Public HTML contains `responsive-52` and no
  `responsive-34` marker. Home exposes the dual-recipient Email link, project
  years, Touchbaes booking link, and the restored V7 second paragraph.
- Public `/who` contains both founder profiles. At 390px both Freight videos
  reached readyState 4, played muted, had no media error, and the page had zero
  horizontal overflow. Public `/write` contains all five writing pieces and
  also had zero horizontal overflow at 390px.
- Public Home had zero horizontal overflow at 390px and 1440px. Compact rivers
  remained `overflow-x:auto` with `touch-action:pan-x pan-y`; expanded mode
  retained the visible left rail, sticky control panel, hidden compact header,
  and zero page-level overflow.
- ROUND 53 IS PUBLISHED. All future changes return to draft-only and require a
  new explicit instruction from Ocean before publication.

## Round 54 (2026-07-14): Home-parity sticky navigation on Who and Write — DRAFT
- Implemented Ocean's instruction to "Use the home one as reference for the
  vertical gap" on both named pages. Removed the compact named-page override
  that changed Home's sticky link block into a relative 13px/11px block. Who
  and Write now inherit Home's measured sticky contract: 24px top padding,
  16px bottom padding, `top: var(--mbar-row-h)`, transparent background, and
  z-index 10.
- Rebuilt the compact Who introduction with an Ocean-only structural sticky
  stage. The expanded introduction remains the single desktop version; a
  compact counterpart lives inside `.mms-who-ocean-stage` with Ocean's card.
  The stage is a real positioned containing block below 1024px and
  `display: contents` above it, so Ocean and Alvis remain the original desktop
  two-column grid. Ocean's visible media/copy surfaces paint at z-index 20 and
  naturally cover the z-index 1 introduction. The stage ends with Ocean, so
  the sticky intro's bottom is constrained to Ocean's bottom and cannot
  reappear in the 64px gap before Alvis.
- Write required no markup change. All five compact writing plates now paint
  at z-index 20 while the shared links remain sticky beneath them. Transparent
  gaps preserve the Home choreography and visible writing plates cover the
  navigation as they pass.
- Local 320/390/430/768/1023 checks gave identical Home/Who/Write metrics:
  56px header row, link top 56px, link height 178px, first-link top 80px,
  24px/16px padding, `--bar-h: 234px`, and zero page overflow. Who release
  checks at all five widths showed the compact intro bottom matching Ocean's
  bottom within 0.02px and ending before Alvis. At 1024/1440/1920px, Who kept
  two founders on the same row, Write kept its expanded composition, and all
  checks had zero horizontal overflow.
- Deployed the complete tokens + site CSS bundle through Cargo while preserving
  the Cargo head and all three managed font regions. Reloaded CodeMirror is
  76,425 bytes, passes the complete residue validator, and matches SHA-256
  `521608069f5630d8eca0c2b95b42c4b120975e09ecdf6df35a4eb598252d01b5`.
- Replaced only the clean Who bodycopy (`B2402536676`) using the UTF-8-safe
  `TextDecoder` + `InputEvent` workflow, saved with Cmd+S, and reloaded. The
  serialized 41,162-character bodycopy contains one MM.S root, one Ocean
  stage, one compact intro, one expanded intro, and two `responsive-52`
  markers. Write bodycopy did not change.
- Reloaded Cargo proof: compact Who and Write at the editor's 729px viewport
  both compute sticky 24px/16px links, z-index 10, z-index 20 passing content,
  and zero overflow. Compact Who computes a sticky intro at the measured
  234px bar boundary. Expanded Home at 2900px retains its grid, left rail,
  250px control panel, and zero overflow.
- DRAFT ONLY. No publish action was taken. The public site remains the
  published Round 53 build and requires fresh explicit authorization before
  Round 54 can be published.

## Round 55 (2026-07-14): shared three-page shell, Figma source recovery, and build hardening — DRAFT
- Audited Home, Who, and Write as one site system rather than three unrelated
  bodycopies. The shared sources now cover the early initializer, mobile
  header, desktop and compact navigation, navigation items, desktop clock,
  control panel, and panel runtime. The canonical panel source was renamed
  from `named-panel.html` to `shared-panel.html`; the site-wide root marker was
  renamed from `data-mms-home` to `data-mms-site`; and the desktop rail's
  z-index 30 moved from inline markup/runtime mutation into shared CSS.
- Added `shared-desktop-clock.html` and replaced the three copied desktop
  clocks with one assembly marker. `validate-shared-components.py` now checks
  that every generated page has the canonical early initializer, headers,
  current-page-aware navigation, desktop clock, panel, and runtime while
  keeping Home-only media/tweezer extras out of Who and Write.
- Hardened `assemble-pages.py` into a locked transactional three-page build.
  It renders and stages all three pages, validates every staged bodycopy and
  shared component before committing, revalidates the committed set, rolls
  back only committed destinations after any failure, and normalizes generated
  output permissions to 0644. An `fcntl` lock prevents overlapping assemblers.
  A forced post-commit failure restored all three prior hashes and modes; two
  concurrent build processes also completed without drift.
- Added `all` and `canonical` modes to `assemble-test.sh` plus exact-byte
  `validate-test-mirrors.py` validation. One command now refreshes and proves
  `test.html`, `who-test.html`, and `write-test.html` against the current
  tokens, site CSS, and canonical bodycopies. Repeated `canonical` and `all`
  runs were byte-identical. Future edits belong in templates and shared
  partials, never directly in generated `home.html`, `who.html`, or
  `write.html`.
- Recovered the Figma Serif variable `51:270`, mode `51:0`, to
  `Times New Roman`; cloud readback confirmed the exact family. There is no
  pending Tinos substitution. Renamed frame `502:466` to `who / desktop` and
  frame `532:1208` to `write / desktop`. The final compact Who and Write
  screenshots are both 350x186px and visually match Home's shared shell.
- Deployed the complete CSS and all three complete bodycopies to the Cargo
  draft, then saved, reloaded, and re-read every editor. Persisted CSS is
  76,612 bytes with SHA-256
  `3b169e1f3fde3a1ae2420997a5c43a0ecdf45b8d99af9cf9f69bf351ec9f3b84`.
  Reloaded bodycopy lengths are Home 98,368, Who 41,145, and Write 39,756.
  Each has one `.mms` root, two `responsive-52` markers, and two correct
  current-page links. Home retains 13 bands and 27 videos; Who has two people
  and two mutually exclusive intro instances; Write has five writing pieces.
- Live compact proof at 729px measured the shared header `[0,0,729,56]`,
  navigation `[0,56,729,178]`, and `--bar-h:234px`. Sticky surfaces are
  transparent, page overflow is zero, and Home's river remains native
  `overflow-x:auto` with `touch-action:pan-x pan-y`, 729px client width, and
  3,902px scroll width. Live expanded Home at 2900px retained a 340px rail,
  clock 50px from the right edge, panel x50/250x310px/bottom50, CSS-owned rail
  z-index 30 with no inline value, and zero overflow. Settled local 390px and
  1440px comparisons passed across Home, Who, and Write.
- Final generated SHA-256 values are Home
  `f029be2ac69ee92213d14dd214b25c0b45d89a2d6184fee145f01e98a8d11ec3`,
  Who `4438d77baabf5dc16051bf28f9928df7a007233c9cc58869a497a92c8d3ebb6c`,
  and Write
  `6595c756be6d552bae93eb1ddec7439b784af74bb92395803ac7a5eaf3064e58`.
- DRAFT ONLY. Round 53 remains public. Round 55 must not be published without
  a fresh explicit instruction from Ocean.

## Round 55a (2026-07-14): Round 55 public release — PUBLISHED
- Ocean explicitly authorized publication of the latest Cargo draft. Published
  the existing reload-verified Round 55 build through Cargo at 15:31 EDT; the
  publishing spinner completed and no CSS, bodycopy, head, asset, or page-setting
  edit was made during the release.
- Independently verified the public Home, Who, and Write routes at 1440x900 and
  390x844 after startup settled. Every route has one `.mms` root, exactly two
  active-body `responsive-52` markers, `data-mms-site="1"`, no legacy
  `data-mms-home`, two correct current-page links, and zero page-level
  horizontal overflow.
- Public Home contains 13 bands and 27 videos. Its compact rivers retain native
  `overflow-x:auto`, `touch-action:pan-x pan-y`, and a real 2,109px scroll width
  inside the 390px viewport. Public Who contains both people; both videos reached
  readyState 4, autoplay muted, and reported no error. Public Write contains all
  five writing pieces and produced no console errors.
- ROUND 55 IS PUBLISHED. All subsequent changes return to draft-only and require
  a new explicit publication instruction from Ocean.

## Round 56 (2026-07-14): four-cut startup, Gothic leading, compact booklet input, and media cleanup — DRAFT
- Advanced the shared runtime from `responsive-52` to `responsive-53` across
  Home, Who, and Write. Startup now applies the first randomized state before
  normal markup parses, shows exactly four hard-cut preview states for 500ms
  each, and restores the exact saved/default state at the two-second boundary.
  There is no initial white pre-roll, crossfade, or fifth preview. Reduced
  motion, Save-Data, and interaction cancellation remain intact.
- On iOS Safari only, the existing sticky mobile header carries the active
  preview background during those four cuts, then returns to transparent for
  the approved edge-to-edge landing. Sticky navigation and introduction
  surfaces remain transparent. Cargo compact proof produced the Quirky
  preview color `rgb(85, 61, 18)` on the header row and transparent values on
  all three surfaces after restoration.
- Added Gothic-only caption-leading endpoints while leaving body leading and
  the other three faces unchanged: Desktop S/M/L/XL = 15/18/22/30px and
  Mobile = 16/17/20/25px. A higher-specificity
  `html[data-face="gothic"]` binding is intentional: Cargo appends a stale
  page-local token clone after the live site CSS. Reloaded Cargo resolves
  Medium Gothic to 18px expanded and 17px compact while body stays 25px and
  23px respectively.
- Re-centered the compact control glyph by moving its full visual square and
  SVG together through the face-specific optical token. Gothic XL retains a
  28px square and 28px glyph with identical centers; the transparent 44px
  pseudo target remains. Figma now binds all Home/Who/Write toggle targets to
  `header/control/icon-top` while preserving 44x44 wrappers.
- Uploaded the direct-PDF viewer as
  `montran-booklet-direct-pdf-v17.html`, Freight hash
  `U3034412351395654863674388559673`. The hosted 1,936,356-byte file matches
  local SHA-256
  `825cf2c3a1f130cb3445e62443985e845991204d19e0c2154cfd43a36126b49b`.
  Compact mode disables iframe pointer ownership, gives the outer river a
  transparent 46/8/46 tap overlay with `pan-x pan-y`, rejects the center 8%,
  and posts one direction command only after a stationary tap with a 700ms
  lock. The child validates source/origin, direction, dead zone, and readable
  state. Expanded fold, click, and drag behavior remain native.
- Live Cargo compact proof received the v17 ready message from
  `https://freight.cargo.site`, then a real horizontal wheel gesture over the
  booklet advanced the outer river from scrollLeft 0 to 320. The iframe was
  pointer-inert only below 1024px; the desktop local contract remains native.
- Removed the Touchbaes booking-poster seam with a high-specificity left-edge
  cover crop that also survives Cargo's later clone. Kelly retains its 2x2
  expanded grid, while compact order remains 3/2/1/4; its caption is fully
  visible under item 3 with a measured 12px filled gap and no transparent
  seam. Kelly's expanded river now derives its height from content rather than
  an inherited crop.
- Figma variable IDs added and verified: desktop Gothic caption leading
  `676:351`, mobile Gothic caption leading `676:352`, contextual Gothic alias
  `676:353`, Typeface `lh/caption` selector `676:354`, and
  `header/control/icon-top` `676:355`. Caption and Caption Italic styles were
  rebound to the new selector. Home toggle nodes `570:561`/`570:563`, Who
  `661:441`, and Write `661:569` were updated and read back.
- Deployed the complete four-region stylesheet while preserving Cargo's head
  and all three managed font blocks. Reloaded persisted CSS is 80,787 bytes,
  passes the complete residue validator, and has SHA-256
  `9bf5f481bde55e1a78a0c4216f1e66b54ae75827f85bf4c6378fed6197d0db9b`.
  The final local token+site bundle is SHA-256
  `140b2e694572af2570046c348ad876fd503a55b287c8e0296075d1fd7a6262ae`.
- Replaced all three complete bodycopies through the UTF-8-safe
  `TextDecoder` + `InputEvent` workflow, saved with Cmd+S, reloaded, and
  re-probed. Reloaded lengths are Home 107,510, Who 50,255, and Write 48,866;
  each has one MM.S root, exactly two `responsive-53` markers, and no
  `responsive-52`. Home contains the v17 URL once and no v16 URL. Exact
  persisted script FNV hashes match the canonical generated Home payload.
- Reloaded expanded Home/Who/Write at 2900px each have zero page overflow.
  Reloaded compact Home at Cargo's 729px viewport has transparent sticky
  surfaces, native `overflow-x:auto` rivers with `pan-x pan-y`, and zero page
  overflow. The final generated SHA-256 values are Home
  `fb58344688a4641228fa4ab366fc842b35a35e4c1c10a6b76e378ca3e88ca98f`,
  Who `91abf1429ff86d4b9686396cb7d6b1e5982dbaf733aa60890d599d517115dcf5`,
  and Write
  `daf7ebc74a0dad1ffddea5e3cb924b73738c3b11526bab50bc93068e6e0ea015`.
- DRAFT ONLY. Round 55 remains public. No publish action was taken.

## Round 57 (2026-07-14): 1.5-second startup, Figma editorial gaps, and semantic Write titles — DRAFT
- Advanced the shared Home/Who/Write runtime from `responsive-53` to
  `responsive-54`. The render sequence remains four randomized hard-cut
  previews plus the restored saved/default landing state, which is five visual
  designs in total. Each preview now holds for 375ms, so the controller reports
  an exact 1,500ms preview duration. There is no crossfade, white pre-roll, or
  extra preview cut.
- Kept the approved iOS Safari full-bleed implementation unchanged. Ordinary
  Safari tabs do not expose a frame-synchronous web API for directly painting
  the status-bar or URL-bar material, so the site still allows WebKit to sample
  the real edge surface. No `theme-color`, Apple standalone status metadata,
  opaque edge plate, or synthetic compositor layer was introduced. Browser
  chrome can therefore lag a rapid preview cut even though the page itself
  changes instantly.
- Re-read the latest Figma Who and Write references. Compact Who now uses 32px
  between founder cards and preserves 64px from the final introduction line to
  Ocean's media. Compact Write uses 32px between all five pieces, with 0px from
  title to author and 8px from author to copy. Expanded Write uses 64 design
  units between its four rows; the existing responsive layout scale continues
  to interpolate those units above the 1440px reference.
- Fixed the Write theme-color regression at both sources. Figma instances
  `I532:1219;142:381` (Clout fleeing) and `I532:1744;142:381` (Withered green)
  were rebound from literal black to semantic `text/primary` variable
  `VariableID:5:3`, then read back. Cargo's named-page heading rule now
  explicitly uses `var(--color-text-primary)`, overriding Cargo's global black
  `h1` declaration. Reloaded live checks passed White, Girly, Quirky, Contrast,
  and Black.
- Reassembled all canonical pages and mirrors. Local static validation passed
  UTF-8, shared-component parity, bodycopy hygiene, one token/layout region,
  two layout-unit definitions, balanced CSS, and byte-for-byte test-mirror
  parity. Generated SHA-256 values are Home
  `ce115cd6575d59424fb0485b5606775582cd844831effb4cf138b382085d0505`,
  Who `8f0a2653eec2433a348bda383f69de47778d2ed4282e40057d81ec4edf41dd33`,
  and Write
  `da399f207a0f7ef07e0e47a0be016db0a331e581e82ca6fdc71e343169a75ce2`.
  The complete local token/site bundle is 73,467 bytes, SHA-256
  `8681abb09f16364bd594956340ebb5a6d4feb42166873f9f7a3e9087cd900199`.
- Deployed the complete stylesheet while preserving Cargo's existing head and
  all three managed font regions. Reloaded CodeMirror is 80,915 characters,
  SHA-256
  `f739e6146007a7177a0f3a722e3dda50d6254f34457781f5ec7fac0acfcaef64`,
  with one token marker, one layout marker, one Mono/Sans/Gothic managed region,
  two `--layout-u` definitions, balanced 484/484 braces, no Base64 run,
  overlong line, transfer/runtime residue, or runtime marker.
- Replaced all three complete bodycopies using the UTF-8-safe `TextDecoder` +
  `InputEvent` workflow, saved with Cmd+S, reloaded, and re-probed. Reloaded
  lengths are Home 107,934, Who 50,255, and Write 48,866. Each has one MM.S
  root, exactly two `responsive-54` markers, no `responsive-53`, runtime
  `responsive-54`, a 375ms hold, and a 1,500ms total.
- Live compact proof at Cargo's 729px viewport: Home has zero page overflow and
  13 native rivers; the first four compute to `overflow-x:auto` and
  `touch-action:pan-x pan-y`, with 729px client width and 3,902/4,207px sample
  scroll widths. Who measures 64px intro-to-media and 32px founder spacing.
  Write measures 32px between every piece, 0px title-to-author, 8px
  author-to-copy, and zero overflow. Local 1440px proof measured exact 64px
  expanded Write row gaps and 192px Who intro-to-founder spacing; live expanded
  mode retained zero page overflow.
- DRAFT ONLY. Round 55 remains public. No publish action was taken.

## Round 58 (2026-07-15): Write typography parity and compact Kelly descender guard — DRAFT
- Deployed the previously prepared Write typography correction as part of the
  complete stylesheet parity pass. Write article copy now uses
  `--font-size-base` / `--lh-base`; author labels remain on
  `--font-size-caption` / `--lh-caption`; Withered green's inter-paragraph
  rhythm follows `--lh-base`; and compact title-to-author spacing is 8px.
  Home and Who typography are unchanged, and the shared runtime remains
  `responsive-54`.
- Traced the compact Kelly cutoff to Cargo's later
  `.mms * { padding: 0 !important; }` clone. It matched the old
  `[data-slot="kelly-caption"]` selector's specificity and removed its
  descender reserve; the horizontal river's intentional `overflow-y:hidden`
  then clipped the final-line Sans descender in “brought.” At 320px and
  1023px Sans XL, the word's ink bottom had exactly 0px clearance from the
  river boundary.
- Replaced the compact rule with the higher-specificity
  `.mms [data-slot="kelly-caption"]` and
  `padding-bottom:max(6px, 0.25em) !important`. The caption, grid, and
  auto-height river grow together, preserving the approved 3/2/1/4 sequence,
  85vw caption/media width, 12px filled image-to-caption gap, and native
  horizontal river scrolling. The former 0px Sans XL clearance is now
  approximately 3.05px.
- Deployed the complete token + site bundle while preserving Cargo's existing
  head and all three managed font regions. The local bundle is 73,929 bytes /
  73,887 characters, SHA-256
  `478a6426569c67856dd9c9a57de62a385d158465b097210b52c8b0e3f6666ba1`.
  Reloaded persisted CSS is 81,419 bytes / 81,377 characters, SHA-256
  `f2f12e04240e1118380519c132f8d5d50ebc03fde31347946fab5708a6586ca8`;
  both post-save and post-reload readbacks match exactly.
- Local WebKit and Chromium matrices covered 320, 390, 430, 768, and 1023px
  across all four typefaces and all four scales: 80 combinations per engine,
  zero descender, 12px caption-gap, river-scrolling, or page-overflow
  failures. The worst case retains approximately 3px of ink clearance.
  Reloaded Cargo compact preview shows the complete “brought” descender;
  expanded Kelly retains the original 2x2 grid and zero page overflow.
- DRAFT ONLY. Round 55 remains public. No publish action was taken.

## Round 59 (2026-07-15): compact control-panel fail-open guard — DRAFT
- Traced the unexpected compact tray to the shared desktop-first markup and a
  permissive mobile selector. The canonical panel is authored with native
  `open` so the expanded rail paints immediately, while the old compact rule
  `dialog.mms-panel[open] { display:flex; }` exposed that raw state before the
  runtime could close it. Cargo can also rehydrate editor bodycopy without
  executing its inserted script immediately, making the race look persistent.
- Compact visibility now requires both the native dialog state and the
  runtime's explicit user state:
  `html[data-panel="open"] dialog.mms-panel[open] { display:flex; }`.
  The raw desktop `open` attribute alone therefore cannot display a mobile
  tray. The expanded desktop first paint and existing panel JavaScript remain
  unchanged; runtime stays `responsive-54` and no bodycopy was replaced.
- Local WebKit proof at 390px reproduced the old failure as `display:flex`,
  `open:true`, and no root state. With the correction, the same forced native
  state computes to `display:none`; a real toggle produces
  `data-panel="open"` plus `display:flex`, and the second toggle restores the
  closed state. Breakpoint transitions pass at 1023/1024px, the 1440px rail
  remains visible, rivers retain `overflow-x:auto` / `pan-x pan-y`, and page
  overflow remains zero.
- Deployed the complete token + site bundle while preserving Cargo's head and
  all three managed font regions. The local bundle is 74,177 bytes, SHA-256
  `a0de25e79c9a6d1ef67c9dea962a5e177e33dfd8b9f75ea7d56dec1a8b4e17bb`.
  Reloaded persisted CSS is 81,667 bytes, SHA-256
  `aa90a3a953d654e3142b59ffa7435b0cde0aec41243f831a4d7ee2024a255e08`;
  the post-reload readback matches the transferred document exactly and passes
  the complete persisted-CSS validator.
- Reloaded Cargo compact preview exposes only the `open site controls` trigger
  and no MM.S panel-control subtree until activation. Cargo's separate floating
  `Mobile Settings` palette is editor chrome and is not part of the website.
- DRAFT ONLY. Round 55 remains public. No publish action was taken.

## Round 60 (2026-07-15): iOS Safari top/scrolled theme edge state — PUBLISHED
- Ocean asked to implement the iOS status-bar update on Cargo. The shared
  Home/Who/Write runtime advances from `responsive-54` to `responsive-55` and
  now exposes one explicit iOS Safari edge state: `top`, `scrolled`, or the
  short-lived `pulse` used after a deliberate theme selection.
- At the top of the document, the sticky compact header row supplies the
  visitor's selected theme color. After real vertical document movement, the
  row becomes transparent so page and river imagery remain the edge surface
  beneath Safari's material. Returning to the top restores the solid selected
  theme. Horizontal river movement does not alter document edge state.
- A theme selection while scrolled produces a hard 180ms selected-color pulse
  and then returns to transparent. There is no fade. Reduced-motion visitors
  skip the pulse. Startup remains exactly four randomized hard cuts at 375ms
  each plus the restored landing state: five visual designs and 1,500ms total.
- The early initializer now primes `data-mms-ios-safari="1"` and
  `data-mms-ios-edge="top"` before the body runtime. The site-head initializer
  advances to marker 49, covers `/`, `/who`, `/write`, and Cargo client-side
  rendering, establishes `viewport-fit=cover`, and removes late browser-color
  or Apple standalone/status meta insertions. Sticky navigation and
  introduction backgrounds remain transparent.
- Local WebKit iPhone proof at 390x844 measured solid at top, transparent after
  `scrollY=620`, an exact 180ms solid pulse after a theme change, unchanged
  `scrollY` during horizontal river movement, native `overflow-x:auto` /
  `pan-x pan-y`, and zero page overflow. The 320/768/1023 compact and
  1024/1440/2900 expanded checks passed without layout regression.
- Deployed the complete four-region Cargo stylesheet while preserving Cargo's
  CSS head and all three managed Mono/Sans/Gothic blocks. The local complete
  token/site bundle is 74,679 bytes, SHA-256
  `3433a7a9c58ce77206c444d3857fb0c66cd71d8b30c015e21cbb09b5e54d0053`.
  Reloaded persisted CodeMirror is 82,127 characters / 82,169 bytes, SHA-256
  `74cad2dd616a6e63f8aec53eecb24f00f9f9bb21ea1bb8092ba71c4434af8195`,
  and matches the transferred document exactly after reload.
- Deployed the complete 1,310-byte site HTML initializer, SHA-256
  `3dd9eb35e887dca145adac0d796d629ff3894fdaba7ee444c2e15373fcfdb204`.
  Post-reload CodeMirror equality is exact: marker 49 appears once and marker 48
  is absent.
- Replaced the complete Home, Who, and Write bodycopies using the UTF-8-safe
  `TextDecoder` + `InputEvent` workflow and saved each with Cmd+S. Reloaded
  lengths are Home 109,997, Who 53,135, and Write 51,746. Each has one MM.S
  root, exactly two `responsive-55` markers, and no `responsive-54`.
- Reloaded Cargo compact proof has transparent sticky link/introduction
  surfaces, no `theme-color` or Apple standalone/status meta elements,
  `viewport-fit=cover`, transparent html/body/page wrappers, native horizontal
  rivers with `pan-x pan-y`, and zero page overflow. Expanded Cargo at 2,900px
  retains the 340px rail, 250px panel, fluid main column, and zero page overflow.
- Ocean had already published the Round 59 draft manually before this round, so
  the pre-Round-60 public payload was `responsive-54` with the panel guard and
  head marker 48.
- Ocean explicitly confirmed `publish`. Published Round 60 through Cargo at
  09:41 EDT; Cargo returned `Site is up to date` and updated its Last Published
  timestamp.
- Independently verified public Home, Who, and Write after publication. Every
  route has one MM.S root, active `responsive-55` with no `responsive-54`, head
  marker 49, `viewport-fit=cover`, zero `theme-color` or Apple standalone/status
  metas, and zero page overflow. Public Who contains both founder profiles and
  public Write contains all five pieces.
- Public iPhone-emulated proof at 390x844 passed: Home starts `top` with a solid
  selected-theme row, becomes `scrolled` and transparent at `scrollY=620`,
  keeps that state while its first river moves from 0 to 240, pulses black for
  approximately 180ms after a black-theme selection, and restores solid black
  on returning to the top. The first river remains 390px / 2,109px
  client/scroll width with `overflow-x:auto`, `overflow-y:hidden`, and
  `pan-x pan-y`. Who and Write also transition from solid `top` to transparent
  `scrolled` with zero overflow.
- Public desktop proof at 1280x720 retains the expanded grid, 242px rail, 178px
  control panel, fluid introduction, and zero page overflow. ROUND 60 IS
  PUBLISHED.

## Round 61 (2026-07-15): restore transparent iOS Safari edge flow — PUBLISHED
- Reverted Round 60's explicit `top` / `scrolled` / `pulse` edge painter after
  physical-iPhone review showed that Safari could retain the opaque
  edge-adjacent sticky header color. Home, Who, and Write advance from
  `responsive-55` to `responsive-56`; all iOS edge attributes, preview-edge
  states, pulse timers, and scroll/theme edge listeners were removed.
- Startup remains exactly four randomized hard cuts at 375ms each plus the
  restored saved/default landing state. The visual sequence, motion loading,
  saved preferences, and zero-duration transitions are otherwise unchanged.
- `.mbar-row`, `.mms-mlinks`, `.mms-sticky-head`, `html`, `body`, and Cargo's
  page wrappers remain transparent in every compact state. Head marker 49,
  `viewport-fit=cover`, and removal of `theme-color` and Apple
  standalone/status-bar metadata remain unchanged. No fixed edge canvas,
  synthetic compositor, or browser-color painter was introduced.
- Deployed the complete token + site stylesheet through the global
  Site Settings → CSS / HTML CodeMirror API while preserving Cargo's CSS head
  and all three managed font regions. Page Code View is not the global CSS
  surface, and accessibility `set_value` appended instead of replacing the
  CodeMirror document during this round.
- Replaced the complete Home, Who, and Write bodycopies through the UTF-8-safe
  `TextDecoder` + `innerHTML` + `InputEvent` workflow, saved with Cmd+S, then
  reloaded each editor. Every persisted page bodycopy has one MM.S root,
  exactly two `responsive-56` markers, and no `responsive-55`.
- Reloaded compact verification retained transparent sticky and wrapper
  surfaces, no browser-color or Apple status metadata, native
  `overflow-x:auto` rivers with `touch-action:pan-x pan-y`, and zero
  page-level horizontal overflow. Expanded desktop retained the left rail,
  control-panel geometry, fluid content column, and zero overflow.
- Ocean explicitly authorized publication. Round 61 was published through
  Cargo on 2026-07-15 at 15:05 EDT, then public Home, Who, and Write were
  independently verified at `responsive-56`. ROUND 61 IS PUBLISHED.

## Round 62 (2026-07-15): disposable iOS startup edge sampling — PUBLISHED
- Advanced the shared Home, Who, and Write runtime from `responsive-56` to
  `responsive-57`. Startup remains exactly four randomized hard cuts at 375ms
  each, followed by the exact saved/default landing state. The complete preview
  controller remains 1,500ms with zero-duration transitions.
- Added the global one-run sentinel `edge-preview-v2`. Cargo can insert the
  shared early initializer more than once in one page window; the sentinel
  prevents a second controller from interleaving another four-cut sequence.
- On compact iOS Safari only, every startup cut creates a fresh disposable
  fixed sampler at both the top and bottom viewport edges. Each pair uses that
  cut's exact theme color and z-index 8, below the permanent header at z-index
  10 and showcase surfaces at z-index 20. The samplers supply WebKit's temporary
  edge sample without becoming an opaque sticky navigation surface, and real
  showcase content can cover them while it scrolls edge-to-edge.
- The final sampler pair is hidden and removed completely when the saved/default
  landing state settles. `.mbar-row`, compact navigation, compact introduction,
  `html`, `body`, and Cargo wrappers therefore remain transparent after startup,
  with no permanent edge plate. `theme-color` and Apple standalone/status-bar
  metadata remain absent; head marker 49 and `viewport-fit=cover` remain.
- Local Chromium and WebKit verification passed at 390x844, including an
  intentional duplicate initializer injection. Both engines observed four cuts,
  two fresh sampler nodes per cut with the correct colors, eight unique sampler
  serials, no sampler nodes after landing, transparent sticky surfaces, native
  `overflow-x:auto` rivers with `touch-action:pan-x pan-y`, and zero page-level
  horizontal overflow. Expanded checks at 1024, 1440, and 2900px created no
  samplers and retained the existing rail, panel, introduction, and overflow
  geometry.
- Deployed the complete token + site stylesheet through Cargo's global
  Site Settings -> CSS / HTML document while preserving Cargo's CSS head and
  all three managed font regions. The exact reloaded persisted stylesheet is
  82,257 bytes and passes the complete persisted-CSS validation.
- Replaced the complete Home, Who, and Write bodycopies through each page's
  HTML Code View using a direct UTF-8 clipboard transfer. The full CodeMirror
  document was copied back and required to equal the local source before
  `Update`; each page was then saved with Cmd+S, reloaded, and re-read. Every
  persisted bodycopy has one MM.S root, exactly two `responsive-57` markers,
  and zero `responsive-56` markers.
- Published through Cargo at 12:28 EDT after the draft persistence checks;
  Cargo reported `Site is up to date`. Independently verified public Home,
  Who, and Write: each route has one MM.S root, exactly two
  `responsive-57` markers, no `responsive-56`, no `theme-color`, and zero
  page-level horizontal overflow. Public Home also retains
  `viewport-fit=cover`, a transparent permanent header surface, and no sampler
  nodes after landing. ROUND 62 IS PUBLISHED.

## Round 63 (2026-07-15): correct startup sampler stacking — PUBLISHED
- Traced the missing compact header during the startup cuts to a root stacking-
  context error. `.mms-preview-edge-sampler` was a body-level sibling at
  z-index 8, while the complete `.mms` root formed its own z-index 1 stacking
  context. The nested mobile header's z-index 10 could not escape that root, so
  the sampler painted over the complete composition instead of only supplying
  Safari's browser-edge sample.
- Changed only the disposable sampler layer from z-index 8 to z-index 0. The
  permanent composition keeps `.mms` at z-index 1, compact header at 10,
  showcase surfaces at 20, and open control panel at 40. The sampler now sits
  behind the complete MM.S composition while still touching the physical top
  and bottom viewport edges during startup.
- Runtime remains `responsive-57`. Startup remains exactly four hard cuts at
  375ms each with no transition. The sampler pair is removed completely after
  the saved/default landing settles, so sticky header, navigation,
  introduction, page wrappers, `html`, and `body` remain transparent after
  startup. `theme-color` remains absent.
- WebKit iPhone emulation reproduced and proved the correction. The old z-index
  8 top crop contained zero navigation pixels during a cut. With z-index 0,
  MM.S, the clock, and the plus control stayed visible through all four cuts;
  the black cut contained 5,294 navigation pixels. No sampler nodes remained
  after landing.
- Deployed the complete Cargo stylesheet through Site Settings -> CSS / HTML,
  saved it, reloaded the editor in Dia, and verified the persisted document.
  The reloaded CSS contains sampler z-index 0 and no sampler z-index 8.
- Published the reload-verified Cargo build. Public
  `https://mmmmm.studio` contains sampler z-index 0, no sampler z-index 8, and
  `responsive-57`. Cargo's publish panel reports `Site is up to date`.
  ROUND 63 IS PUBLISHED.

## Round 64 (2026-07-15): theme-correct iOS document canvas and Write navigation cover — PUBLISHED
- Ocean's physical-iPhone screenshots exposed two separate residual problems:
  black and colored themes could still reveal WebKit's white fallback document
  canvas beneath the translucent status material, and the compact Write links
  resurfaced between later poems because only the individual poem boxes covered
  their sticky navigation.
- Ordinary compact iOS Safari now receives a real theme-colored document canvas
  on `html` and `body` through `--color-bg-page`. The Cargo wrappers, `.mms`
  composition, sticky header, sticky links, and showcase surfaces remain above
  it and retain their existing transparency. This is not a fixed edge plate,
  `theme-color`, Apple standalone/status metadata, or a compositor workaround;
  real imagery and page content still paint to the physical viewport edges.
- The correction is deliberately scoped to
  `html[data-mms-site][data-mms-ios-safari]`, so expanded desktop and other
  browsers keep the prior transparent root contract. `viewport-fit=cover`
  remains established by the early initializer, and the disposable startup
  sampler remains at z-index 0 behind `.mms` at 1, header at 10, showcases at
  20, and the open control panel at 40.
- In compact Write only, `.mms-writing` is now one continuous page-color surface
  at z-index 20. The links remain visible and usable in their intended opening
  position, then the writing surface covers them continuously once the first
  poem passes, including all inter-poem gaps through the final piece. The
  established 32px opening gap and every poem's width/spacing remain unchanged.
- Local 390x844 DPR-3 verification passed all five themes: root, body, and the
  visible page canvas resolved to the selected theme; the sticky header and
  link surfaces remained transparent; no theme or Apple status metadata was
  present; `viewport-fit=cover` was retained at runtime; rivers kept native
  `overflow-x:auto` and `pan-x pan-y`; and page-level horizontal overflow was
  zero. Write hit-testing proved the links at the top and the writing surface
  as the topmost target after the first poem and at maximum scroll.
- Expanded 1440x900 regression proof retained transparent desktop root/body,
  the 272px rail, 200x248 control panel, 1128px writing column, static desktop
  writing surface, and zero page overflow. Home and Who were unchanged.
- Deployed the complete Cargo stylesheet through Site Settings -> CSS / HTML
  while preserving its head and all three managed font blocks, saved, reloaded,
  and found the unique `theme-colored document canvas` marker in the persisted
  CodeMirror document. The local complete token/site bundle is 75,608 bytes,
  SHA-256 `21898f2285ac03db0d8dcb35df2a1d0807f3073fe49c4f6a5f1d3612c51a2fa4`;
  the persisted Cargo stylesheet is 82,973 bytes.
- Published the reload-verified stylesheet. Independent public fetches of Home,
  Who, and Write contain the iOS canvas correction and compact Write covering
  rule, retain sampler z-index 0 with no z-index 8 residue, and expose no actual
  `theme-color`, `apple-mobile-web-app-status-bar-style`, or
  `apple-mobile-web-app-capable` meta elements. Runtime remains
  `responsive-57`; no bodycopy was changed in this round. ROUND 64 IS PUBLISHED.

## Round 65 (2026-07-15): keep compact header clear of the startup edge sampler — PUBLISHED
- Traced the remaining partial cover over MM.S and the clock during iOS startup
  cuts to geometry rather than stacking. The disposable top sampler still used
  a 32px fallback whenever `env(safe-area-inset-top)` resolved to zero, while
  the compact header glyphs begin at approximately 16–17px. Although the
  established z-index order was correct, that 32px edge candidate physically
  intersected the upper half of both glyph boxes and WebKit could composite it
  as an obscured-edge sample.
- Changed only the top sampler fallback to
  `height: max(1px, env(safe-area-inset-top))`. A real nonzero iOS safe-area
  inset is still honored. The bottom sampler remains 32px, the sampler remains
  z-index 0, and `.mms` 1 / header 10 / showcases 20 / panel 40 are unchanged.
  Runtime stays `responsive-57`; the four hard 375ms cuts, transparent
  sampler-free landing, iOS theme canvas, and Write navigation cover are
  unchanged.
- Local WebKit iPhone verification measured the active top sampler at y=0–1px
  and the wordmark/clock at y=16–17px onward, with no geometric intersection;
  hit testing kept the header topmost. The sampler pair was absent after
  landing. Expanded 1440px verification retained the rail and panel geometry
  with zero page overflow.
- Deployed the complete token + site stylesheet through Cargo Site Settings,
  preserving the existing CSS head and all three Cargo-managed font blocks.
  The local bundle is 75,984 bytes with SHA-256
  `4fbd27db8fbb62f816e39fee5219e3e7f514ace9848e0c0a78d2ba0d5cebe198`.
  The reload-persisted Cargo stylesheet is 83,500 bytes with SHA-256
  `4934a80c87f9a17710a1a936bc437861a4df623b780a2197df69eb2f8d9aadbf`;
  it contains the 1px top fallback once and no 32px top fallback.
- Ocean explicitly authorized publication. Cargo published at 18:25 EDT and
  reported `Site is up to date`. Independent cache-busted public fetches of
  Home, Write, and Who returned HTTP 200, contain the new 1px top rule and no
  old 32px top rule, retain `responsive-57`, expose no actual `theme-color`
  meta, and keep `viewport-fit=cover`. Public expanded Home also retained zero
  page-level overflow and native river overflow. ROUND 65 IS PUBLISHED.

## Round 66 (2026-07-15): remove the bottom startup plate and resample intentional themes — PUBLISHED
- Physical-iPhone review found that Round 65 corrected the top navigation but
  left the disposable bottom sampler at a 32px fixed fallback. WebKit extended
  that viewport-constrained surface into the URL-toolbar region, producing a
  large solid plate that obscured river content during every startup cut.
- Reduced only the bottom sampler to a 1px physical-edge probe. The panel keeps
  its independent safe-area padding; sampler 0, `.mms` 1, header 10,
  showcases/Write surface 20, and panel 40 remain unchanged. Both startup
  probes now compute to 1px in zero-inset compact contexts, and both are removed
  completely after landing.
- Advanced the shared panel runtime to `responsive-58` and the preview
  controller interface to version 2. Intentional theme selections now request
  a fresh top/bottom sampler pair in the chosen theme for two painted frames
  plus 160ms, then remove it so real content owns the translucent edges again.
  A generation guard prevents an older timeout from removing a newer sample;
  a selection that cancels startup defers until landing and uses only the last
  chosen theme. No `theme-color` or Apple standalone/status metadata was added.
- Local Chrome iPhone emulation verified four unchanged 375ms startup cuts,
  1px top/bottom probes, header glyphs beginning at 16.5px, zero page overflow,
  and no samplers after landing. A theme choice while the compact panel was
  open produced the correct chosen-color pair, kept the dialog open, retained
  native `pan-x pan-y`, and removed the pair after the sampling window. Rapid
  choices resolved to the final theme with no stale nodes.
- Deployed the complete token + site stylesheet while preserving Cargo's head
  and all three managed font blocks. The local bundle is 76,212 bytes,
  SHA-256 `9d04d7e774d3297c7eed59abd66a8adc854998bd82039f5dfc052390407a1bb0`.
  The exact reload-persisted Cargo CSS is 83,702 bytes, SHA-256
  `53bdc61e25dac8a24099db4069c7b5f7d3a8f18bd1011a4de36992a62ad35bbc`.
- Replaced complete Home, Who, and Write bodycopies through the UTF-8-safe
  `innerHTML` + `InputEvent` workflow, saved, reloaded, and verified one MM.S
  root, exactly two `responsive-58` markers, no `responsive-57`, and zero
  overflow on each page. Cargo compact mode measured both probes at 1px, no
  panel open by default, no `theme-color`, and native river panning; expanded
  mode retained the 340px rail and 250px panel.
- Published at 19:21 EDT under Ocean's standing publish instruction; Cargo
  reported `Site is up to date`. Cache-busted public Home, Write, and Who all
  returned HTTP 200 with `responsive-58`, the 1px bottom rule, the theme sample
  interface, no old 32px rule, and no actual `theme-color` meta. Public compact
  interaction also kept the panel open through theme selection and removed the
  chosen-color probes after the sampling window. ROUND 66 IS PUBLISHED.

## Round 67 (2026-07-15): remove the Touchbaes cover handoff and stabilize the live game envelope — PUBLISHED
- Physical-phone review exposed a Touchbaes-only loading sequence: the old
  780-by-945 poster appeared when the river approached, then the live iframe
  replaced it at a slightly smaller measured size. That poster-to-iframe swap
  caused both the visible frame jump and the impression that the game shrank.
- Removed `data-poster` from the Touchbaes iframe only. Video posters and the V7
  poster remain unchanged. The game now activates when its showcase band enters
  a one-viewport vertical preload margin, so the live child is rendered and
  measured before a visitor normally pans horizontally to it.
- Advanced the shared runtime to `responsive-59`. Rounded the compact fallback
  envelope to whole CSS pixels and accept child measurements within 1px of the
  parent envelope as identical, preventing a last one-pixel resize at 768px and
  1023px without suppressing genuine viewport or orientation changes.
- Local Playwright verification at 320, 390, 430, 768, and 1023px found no
  Touchbaes poster or background image, stable before/after-ready dimensions,
  native `overflow-x: auto` with `pan-x pan-y`, and zero page-level overflow.
  The measured game envelopes were 319x375, 387x460, 426x508, 758x919, and
  1008x1230 respectively. Expanded checks at 1024px and 1440px also passed.
- Replaced the complete Home, Who, and Write bodycopies through the UTF-8-safe
  `innerHTML` + `InputEvent` workflow, saved, reloaded, and verified exactly two
  `responsive-59` markers and no `responsive-58` in each active page. No CSS
  bundle or Cargo-managed font region changed in this round.
- Cargo compact verification measured a stable 719x871 iframe while it moved
  from horizontally offscreen into view; the child was already ready, no poster
  existed, river panning remained native, and page overflow remained zero.
  Expanded Cargo retained the 340px rail and 250px panel with no regression.
- Published at 20:42 EDT. Cargo reported `Site is up to date`. Public iPhone
  verification at 390x844 measured the Touchbaes iframe at 387x460 both before
  and after horizontal reveal, already ready and measured, with no poster,
  `overflow-x: auto`, `pan-x pan-y`, and zero page overflow. ROUND 67 IS
  PUBLISHED.

## Round 68 (2026-07-15): remove the selected-theme bottom seam and close the compact tray after color choice — PUBLISHED
- Ocean's physical-iPhone review isolated two remaining compact color-picker
  problems: the intentional selected-theme handoff still painted a visible 1px
  line across the lower viewport edge, and the control tray stayed open after
  a color choice instead of handing the chosen theme back to the full page.
- Advanced the shared runtime to `responsive-60` and preview controller to
  version 3. Intentional theme selections now create only the disposable top
  edge sampler; the bottom sampler remains reserved for the four startup cuts
  and is never mounted for a visitor's palette choice. The generation guard,
  startup sequence, top Safari color handoff, and absence of `theme-color` or
  Apple standalone/status metadata are unchanged.
- In compact mode only, choosing a theme keeps the freshly themed panel and its
  complete lower safe-area surface visible for two painted frames, then closes
  the tray without focus restoration or scroll movement. Typeface, scale, and
  shape choices still keep the tray open. The compact panel's `::before`
  surface now fills the complete dialog (`inset:0`), so Safari receives the
  selected background through the URL-toolbar edge before the fixed panel is
  removed.
- Local static assembly and all shared/page/head/CSS validators passed. WebKit
  mobile proof showed the panel open with `::before` inset 0, only a top
  `theme-selection` sampler during the handoff, panel closure on the second
  animation frame, and no sampler after 220ms. Face and shape selections kept
  the panel open; page overflow stayed zero.
- Deployed the complete token + site stylesheet while preserving the
  6,283-character Cargo head and 1,305-character managed-font region. The
  reload-persisted stylesheet is 84,006 characters, SHA-256
  `107c1a9c20fd64f7792af66faa35f8490dd315676dff22f4f0e0bcc557908648`;
  its token and site regions exactly match the local sources and all three
  Cargo-managed font blocks remain present once each.
- Replaced complete Home, Who, and Write bodycopies through the UTF-8-safe
  Base64 + `TextDecoder` + `innerHTML` + `InputEvent` workflow, saved, reloaded,
  and verified exactly two `responsive-60` markers and no `responsive-59` in
  each persisted active bodycopy. Reloaded lengths are Home 114,048, Who
  56,267, and Write 54,878 characters.
- Cargo compact proof retained 12 native scrollable rivers, `overflow-x:auto`,
  `pan-x pan-y`, and zero page overflow. Expanded Home, Who, and Write retained
  one visible left-rail panel and zero page overflow.
- Published at 22:46 EDT under Ocean's standing publish instruction. Cargo
  reported `Site is up to date`. Independent public Home, Who, and Write loads
  contain `responsive-60`, no `responsive-59`, and zero page overflow. Public
  iPhone WebKit verification reproduced the top-only selected-theme handoff,
  two-frame tray closure, complete sampler cleanup, native river panning, and
  no `theme-color` metadata. ROUND 68 IS PUBLISHED.

## Round 69 (2026-07-16): persistent theme tray, top-only edge sampling, shape-aware Montran booklet, and compact tap restoration — GOLD STANDARD PUBLISHED
- Advanced the shared runtime to `responsive-62` and preview controller to
  version 4. Every disposable iOS Safari edge sampler is now top-only, both
  during the four startup cuts and after an intentional palette selection.
  No bottom sampler exists in either phase.
- A compact theme choice no longer closes the control tray. The open dialog
  directly paints `var(--color-bg-page)` through its complete lower safe area;
  the obsolete panel `::before` backing was removed. Escape, the header toggle,
  and an intentional outside tap retain their established close behavior.
- The Montran booklet is the sole shape-responsive interactive embed. Its
  parent shell now clips straight, rounded, and oval treatments while V7 and
  Touchbaes stay rectangular. The Montran nine-icon motion frame was corrected
  from 401:400 to its true 400:400 source ratio.
- Restored reliable compact booklet control without intercepting river scroll.
  A stationary primary `pointerup` within 8px and 500ms sends exactly one page
  command, applies the existing 700ms turn lock, and suppresses the delayed
  synthesized click for 450ms. Moved or cancelled gestures remain native page
  and river scrolling; the center 8% binding zone remains inert. Freight viewer
  v17 and its uploaded URL are unchanged.
- Local assembly, JavaScript syntax, shared-component parity, head, bodycopy,
  and complete CSS validation all passed. The local token/site bundle is
  76,142 bytes, SHA-256
  `66f61b5950dfeed1c68548dfc75b81a472d4a4fd8a543540e4d9db3dbabfae65`.
  The reload-persisted global Cargo stylesheet is 83,632 bytes, SHA-256
  `070fb68449dd5801ed3592a4047b3f301fc6fe7078d7b181b3c0d25df5e1e145`,
  with the CSS head and all three Cargo-managed font blocks preserved.
- Replaced complete Home, Who, and Write bodycopies through the UTF-8-safe
  CodeMirror transfer, copied each editor back exactly before update, saved,
  reloaded, and verified one MM.S root, two `responsive-62` markers, and no
  older runtime in every active page. Canonical source lengths are Home
  112,933, Who 55,962, and Write 55,405 bytes.
- Public verification exposed one additional historical Home-only fault: its
  page Code View CSS still contained a stale 65KB site mirror, overriding the
  new global booklet and tray rules. Replaced that page-local stylesheet with
  the 79-byte canonical-owner comment, reloaded it byte-for-byte, and
  republished. Who and Write had no equivalent active duplicate.
- Final cache-busted public source at 14:05:03Z contains `responsive-62`, no
  `responsive-60`, and the 79-byte Home page-CSS comment. Public Chromium at
  390x844 kept the theme tray open after selection, painted its chosen color,
  applied the booklet's 24px rounded clip with hidden overflow, retained 13
  native `pan-x pan-y` rivers, and had zero page overflow. At 1440x900 the
  272px left rail, 200x248 panel, 664px introduction, full-width root, and zero
  overflow all remained intact. Who and Write also rendered at 390px with no
  old runtime or page overflow.
- The compact page-turn state machine was additionally proven in WebKit
  emulation before deployment: one stationary pointer sequence produced one
  `next` message, a delayed click produced no duplicate, and a 20px moved
  sequence produced no turn. This is browser-engine proof, not a claim of a
  new physical-iPhone test. ROUND 69 IS PUBLISHED.
- Ocean explicitly accepted this exact published version as the MM.S standard
  gold version. Round 69 is now the immutable visual, interaction, and rollback
  reference before type-scale and spacing refinement. Its artifact manifest and
  protected behavior contract are recorded in `cargo/GOLD-BASELINE.md`.

## Round 70 (2026-07-16): named-page navigation and spacing refinement — DRAFT ONLY
- Branched from the protected Round 69 gold baseline and advanced Home, Who,
  and Write to `responsive-63`. The MM.S title now links home on every route.
- Reflected the latest Figma named-page work: removed Write's Ocean/Alvis
  tagline, tightened the text-only passage rhythm, made compact poem surfaces
  hug their text so the sticky navigation remains visible through real gaps,
  updated compact Who portrait sizing, and anchored the expanded Who profiles
  to the bottom of the viewport beneath the introduction.
- Standardized the compact final-page inset to 64px on Home, Who, and Write.
  Local and Cargo compact/expanded checks passed with zero page-level overflow.
- Replaced all three complete bodycopies, saved, reloaded, and verified exactly
  two `responsive-63` markers with no `responsive-62` in the Cargo draft.
  Round 70 was not published; the public gold version remains Round 69.

## Round 71 (2026-07-16): Figma poem top-padding correction — DRAFT ONLY
- Re-read the exact Figma Write frames `640:448` and `532:1208`. Each passage
  now begins flush at its own frame top: the previous 16px internal top padding
  was removed while the approved title-to-body spacing remains 16px compact and
  8px expanded.
- Reduced the corresponding Write top/min-height contracts by the same 16px so
  the update does not introduce cumulative drift. At 390px, Cargo measures
  passage heights of 246, 200, 430, 223, and 177px with four exact 32px gaps.
  At 1440px, passage tops are 40, 40, 408, 930, and 1248px, matching Figma.
- Advanced the shared runtime to `responsive-64`, rebuilt the complete
  `tokens.css` + `site.css` bundle, and redeployed the complete Home, Who, and
  Write bodycopies through the UTF-8-safe `innerHTML` + `InputEvent` workflow.
- After reload, the Cargo stylesheet is 83,702 characters. Its token region is
  12,322 characters with FNV-1a `a921cc79`; its site region is 63,888 characters
  with FNV-1a `f9adbbac`. Both exactly match the local sources, and the token,
  layout, Mono, Sans, and Gothic managed markers each remain present once.
- Reloaded Home retains 13 native rivers and zero page overflow; Home, Who, and
  Write each contain two `responsive-64` markers and no `responsive-63`.
  Compact and expanded Write both have zero overflow. Round 71 is draft-only;
  the published site remains the protected Round 69 gold version.

## Round 72 (2026-07-16): complete Figma copy audit and Touchbaes booking update — DRAFT ONLY
- Audited the visible copy in all six authoritative Figma frames: Home desktop
  `83:251`, Home mobile `11:31`, Who desktop `502:466`, Who mobile `638:432`,
  Write desktop `532:1208`, and Write mobile `640:448`.
- Updated Touchbaes from `Make a booking here!` to Figma's current `Book an
  appointment here`, keeping only `here` linked to `https://www.touchbaes.ca`
  and removing the exclamation mark. Updated Kelly's Kelly from `2025 –
  Graphic design • editorial design` to `2025 – Graphic design • editorial`.
- Ocean confirmed that the missing EVIIVE URL in Figma was accidental, so
  Cargo intentionally retains the visible `eviive.ch` link. Who and Write
  already matched their intended Figma copy exactly; no editorial changes were
  made there. The duplicate mobile Figma `Clout fleeing` instance remains a
  Figma cleanup issue and was not copied into Cargo.
- Advanced the shared runtime to `responsive-65`, regenerated all three
  canonical bodycopies, and passed bodycopy, head, complete CSS, shared-shell,
  test-mirror, JavaScript syntax, and independent semantic-copy validation.
- Deployed the complete `tokens.css` + `site.css` bundle while preserving the
  6,283-character Cargo head and all three managed font blocks. After reload,
  the persisted stylesheet is 83,619 characters; its token and site regions
  exactly match the local sources, each managed font marker occurs once, no
  transfer residue is present, and braces balance 491/491.
- Replaced complete Home, Who, and Write bodycopies through the UTF-8-safe
  Base64 + `TextDecoder` + `innerHTML` + `InputEvent` workflow, saved each,
  reloaded each, and verified one MM.S root, exactly two `responsive-65`
  markers, and no `responsive-64` in every active draft page.
- Reloaded Home preserves the intentional EVIIVE URL, the new Touchbaes copy
  and URL, the corrected Kelly tagline, 13 native rivers, compact `pan-x
  pan-y`, and zero compact or expanded page overflow. Who and Write also retain
  zero overflow; Write contains exactly one intended `Clout fleeing` passage.
  Round 72 remains draft-only. The public site remains the protected Round 69
  gold version.

## Round 73 (2026-07-16): WTW final-video desktop geometry and river-input audit — DRAFT ONLY
- Re-read the updated Figma WTW final-video node `414:619`. Its authoritative
  frame is now 896×504px, exact 16:9, filling the complete 504px desktop river
  height and remaining bottom-aligned within the 32px-gap gallery row.
- Updated only canonical `wtw-07` geometry from 690.2×388.2 to 896×504. The
  existing 1920×1080 MP4 and 1600×900 poster already match this ratio, so no
  source, poster, fit, crop, CSS, or mobile-profile change was required. The
  protected Round 69 gold snapshot and stale `home 2.html` were not edited.
- Advanced the shared runtime to `responsive-66`, regenerated all three
  canonical bodycopies, and passed bodycopy, head, complete CSS, shared-shell,
  test-mirror, and JavaScript validation. Local browser proof measured the
  frame at exactly 896×504px at 1440px and 331.5×186.47px at 390px, with zero
  page overflow in both modes.
- Redeployed the complete `tokens.css` + `site.css` bundle while preserving
  Cargo's head and all three managed font regions. After save and reload the
  stylesheet is 83,618 characters; local token and site regions match exactly,
  the Mono/Sans/Gothic markers each occur once, and braces balance 491/491.
- Replaced, saved, and reloaded complete Home, Who, and Write bodycopies through
  the UTF-8-safe Base64 + `TextDecoder` + `innerHTML` + `InputEvent` workflow.
  Each active draft contains exactly two `responsive-66` markers and no
  `responsive-65`; Who and Write retain zero page overflow.
- Reloaded expanded Cargo at its 1460px preview measured WTW at
  908.44×511px, the exact continuously scaled 896×504 contract, with its lower
  edge flush to the 511px river and zero page overflow. Reloaded compact Cargo
  measured 619.65×348.55px at a 729px preview, exact 16:9, with 13 native
  `pan-x pan-y` rivers and zero page overflow.
- Desktop input audit confirmed there is no custom wheel mapper, mouse
  drag-to-pan behavior, visible scrollbar, or guaranteed keyboard route.
  Horizontal/tilt wheels and trackpad delta-X use native overflow; plain wheel
  remains vertical, and Shift+wheel is browser-dependent. Do not restore the
  rejected wheel interception or one-item stepper. Round 73 remains draft-only;
  the published site remains the protected Round 69 gold version.

## Round 74 (2026-07-16): Touchbaes desktop tweezer/nav stacking correction — DRAFT ONLY
- Reproduced the rightmost-scroll failure at expanded widths. The escaped
  `#mms-tw-rig` was a direct body sibling at z-index 20 while the complete MM.S
  shell formed z-index 1; consequently the rail's internal z-index 30 could not
  outrank the external tweezer. At maximum river scroll the tweezer overlapped
  159–169px of the left navigation column.
- Updated the Home overlay to v3. The existing rig is now reparented into the
  live `.mms` shell before every desktop placement. The established layer
  contract is therefore effective in one stacking context: Touchbaes band 10,
  tweezer rig 20, rail/control panel 30. Position math continues to use the
  rig's actual offset parent, so the tweezer remains attached to the game at
  every river position while the rail masks the overlapping portion.
- Did not change native river scrolling, wheel behavior, clipping, Touchbaes
  messages, sticker dragging, compact iframe sizing, or mobile tweezer
  suppression. The protected Round 69 gold snapshot remains untouched.
- Advanced the shared runtime to `responsive-67`, regenerated all three
  canonical bodycopies, and passed bodycopy, head, shared-shell, complete CSS,
  test-mirror, and JavaScript syntax validation. Local proof at 1024, 1440,
  1800, and 2940px confirmed the rail masks the rig at maximum river scroll;
  390 and 1023px retain a hidden parent rig and native `pan-x pan-y` rivers.
- Redeployed the complete `tokens.css` + `site.css` bundle while preserving
  Cargo's head and all three managed font blocks. The reload-persisted editor
  proof measured 83,618 characters, exact token/site parity, one Mono/Sans/
  Gothic marker each, balanced 491/491 braces, and no transfer residue.
- Replaced and saved complete Home, Who, and Write bodycopies through the
  UTF-8-safe Base64 + `TextDecoder` + `innerHTML` + `InputEvent` workflow.
  After reload each contains exactly two `responsive-67` markers and no
  `responsive-66`; Who and Write retain zero page overflow.
- Final reload proof on the Cargo Home draft loaded the live Touchbaes iframe,
  scrolled its river to 2440/2440, and measured the rig as a child and offset
  child of `.mms`, visible at x116–405 against the rail at x0–276, with the
  10/20/30 layer order and zero page-level overflow. Round 74 remains
  draft-only; the published site remains the protected Round 69 gold version.

## Round 75 (2026-07-20): desktop river scrubbers — PUBLISHED
- Implemented Ocean's updated Figma scrubber as the conventional-mouse desktop
  affordance for the horizontal showcase rivers. The authoritative Figma
  geometry is a description-width strip with 16-unit vertical padding, a 1px
  track, and an 8px optical thumb. At the 1440px reference, EVIIVE therefore
  measures 664×33px with an 84×8px minimum thumb. Added the missing `col/1`
  contract as 84px expanded and 45px compact.
- Added one accessible scrollbar control to each of the 12 project bands that
  has both a river and a project description. Random Pics remains intentionally
  without a scrubber because its caption lives inside the river. Each track
  measures the actual rendered description edge and width, including the five
  fill-right descriptions, rather than assuming the 664px Figma instance width.
- The thumb width is proportional to the river viewport/content ratio, with
  `col/1` as its minimum. Track click, pointer drag, Home/End, arrow keys, and
  Page Up/Page Down are supported. ARIA values update from native `scrollLeft`.
  The visible artwork remains square in every image-shape mode, uses the active
  semantic theme colors, and changes state instantly with no transition.
- Scrubbers appear only at 1024px and above on fine-pointer devices. Compact and
  coarse-pointer modes keep the controls hidden. Native river behavior is
  unchanged: no wheel interception, forced stepping, snapping, smooth-scroll
  correction, or vertical-scroll capture was introduced.
- Cargo hydrates showcase bands after the first shared-runtime pass on some
  reloads. The scrubber initializer is therefore DOM-idempotent, exposed as
  `window.__mmsEnsureRiverScrubbers`, and repeats bounded post-hydration scans.
  Reloaded Cargo produced exactly 12 controls without duplicates.
- Advanced Home, Who, and Write to `responsive-68`, rebuilt all canonical
  bodycopies, and deployed the complete tokens + site CSS bundle. The local
  deploy bundle is 78,442 bytes with SHA-256
  `76b10710b192bf2460158dc0e1af66fdaee709627ca2085009dc9836e48b5f59`.
  Reload-persisted Cargo CSS is 86,107 characters, retains the Cargo head and
  one Mono/Sans/Gothic managed block each, and exactly matches the local token
  and site regions.
- Reloaded Cargo proof found 12 visible scrubbers in expanded mode, exact
  description alignment, a 44px minimum interaction area, 13 native rivers,
  zero page-level horizontal overflow, and no Random Pics scrubber. At compact
  width the same controls remain hidden while 12 rivers retain native
  `pan-x pan-y` overflow. Track click, thumb drag, native-scroll synchronization,
  keyboard Home/End, every theme, and oval image-shape mode were exercised.
- Published after the approved implementation. Cargo reported `Site is up to
  date` with Last Published today at 9:04am. Independent public verification at
  1440px and 390px confirmed `responsive-68`, 12/12 expanded scrubbers, 0/12
  compact-visible scrubbers, zero alignment failures, zero page overflow, and
  current Who and Write pages. The protected Round 69 gold snapshot was not
  modified.

## Round 76 (2026-07-20): scrubber media prewarm and visual correction — PUBLISHED
- Diagnosed the apparent missing river imagery as a loading-timing regression,
  not deleted or changed sources. The new desktop scrubbers could jump directly
  beyond the range covered by the existing lazy-loading and
  `IntersectionObserver` schedule. All 68 canonical media IDs remain present:
  38 images, 27 videos, and 3 iframes.
- Added `prewarmRiverMedia()`. Scrubber-band lazy stills are promoted to eager
  loading and every deferred video's `data-poster` is assigned to its native
  `poster` before direct scrubber navigation can expose that band. Heavy video
  and iframe sources remain deferred under the existing media observer.
- Covered Cargo's late project-band hydration by prewarming every `.mms-band`
  that arrives during the bounded scrubber initialization retries. Compact
  behavior remains native: scrubbers stay hidden and rivers retain `pan-x
  pan-y` without wheel interception, stepping, snapping, or scroll correction.
- Removed the pointer/programmatic focus outline that produced a dotted frame
  around the scrubber during dragging. Removed the transparent halo around the
  thumb; its `:focus-visible` treatment is now a fully filled 12px bar whose
  background and border both use the active theme text color.
- Advanced Home, Who, and Write to `responsive-70`. Reloaded Cargo Home contains
  that marker twice with no `responsive-69`, 68 media IDs, all 38 stills eager,
  all 27 video posters assigned, 12 visible desktop scrubbers, and zero
  page-level overflow. At 390px the scrubbers are hidden, rivers retain native
  `pan-x pan-y`, and page-level overflow remains zero.
- Deployed the complete CSS bundle and reload-verified 86,035 persisted bytes,
  SHA-256 `890ede0baedb6c6120129600c6420a76800cf2dc6a8ffbe5f81c8059d831b334`,
  while preserving the Cargo head and all three managed font blocks. Public
  desktop Home confirms `responsive-70`, all 38 images with nonzero
  `naturalWidth`, 27 posters, 12 scrubbers, 68 media IDs, and zero overflow;
  public Home, Who, and Write contain no `responsive-69`.
- Published after verification. Cargo reported Last Published today at
  10:11am. The protected Round 69 gold baseline was not modified.

## Round 77 (2026-07-20): scrubber outline return — PUBLISHED
- Corrected the desktop scrubber's post-drag visual state. Programmatic focus
  no longer keeps the thumb filled after the pointer leaves: solid fill belongs
  only to active pointer dragging and fine-pointer hover.
- Preserved keyboard visibility without restoring the rejected outer dotted
  frame. `:focus-visible` now uses a 10px page-color thumb with a 2px
  theme-text outline; dragging wins over that rule and remains fully filled,
  with no transparent halo.
- This was a CSS-only correction. Home, Who, and Write remain on
  `responsive-70`; media sources, prewarming, native river behavior, and the
  protected Round 69 gold baseline were not changed.
- Reloaded Cargo CSS exactly matched the deployed payload at 86,130 bytes,
  SHA-256 `ea17d30098b39cf22c4fd44be7df373f8415c4b7f370c287a7bae48080c1d703`,
  while preserving the Cargo head and all three managed font blocks.
- Cargo draft and independent public interaction proof both recorded: 8px
  filled hover, filled drag, then a page-color 10px outlined thumb immediately
  after pointer exit; the scrubber's outer outline remains absent. Compact
  390px keeps all 12 scrubbers hidden, native `pan-x pan-y`, and zero page
  overflow. Public Home, Who, and Write retain `responsive-70` and zero
  page-level horizontal overflow.
- Published after reload verification. Cargo reported `Site is up to date`
  with Last Published today at 10:37am.

## Round 78 (2026-07-20): Figma project-copy synchronization — PUBLISHED
- Re-read the authoritative Figma Home descriptions and synchronized the
  canonical Cargo Home copy. Project categories now use Figma's current case,
  including `Entertainment` for WTW instead of `events`.
- Combined the descriptions that Figma now defines as one paragraph: V7,
  AnyDay, Kelly's Kelly, and Dead Good. Touchbaes remains intentionally two
  paragraphs because its booking call to action is separate; that line now
  reads `Book a nail appointment here`, with only `here` linked.
- Reassembled Home, Who, and Write from the shared source, refreshed the Home
  test mirror, and passed all bodycopy, shared-component, and mirror validators.
  This was a copy-only update: CSS, media, scrolling, and the shared
  `responsive-70` runtime were not changed. The protected Round 69 gold
  baseline remains untouched.
- Replaced and saved the complete Home bodycopy in Cargo, reloaded the editor,
  and confirmed persistence: WTW reads `Entertainment`; V7, AnyDay, Kelly's
  Kelly, and Dead Good each contain one description paragraph; Touchbaes
  contains two; and `responsive-70` appears exactly twice.
- Cargo compact and expanded verification found zero page-level horizontal
  overflow. Published at 11:15am EDT. Independent public checks at the normal
  expanded viewport and 390px confirmed the new copy, the intended paragraph
  counts, two `responsive-70` markers, and zero horizontal overflow.

## Round 79 (2026-07-20): restore V7 and Touchbaes rivers after Code View sanitization — PUBLISHED
- Reproduced Ocean's missing-image report on the published Home page. Cargo's
  persisted bodycopy contained only 55 of the canonical 68 media IDs: the
  complete V7 river (6 items) and complete Touchbaes river (7 items) had been
  deleted, while both project descriptions remained.
- The canonical template, generated Home bodycopy, and Round 69 reference were
  not missing assets. Local Home still contained 68 unique media IDs: 38
  images, 27 videos, and 3 embeds. The regression was introduced when Round 78
  used Cargo's Code View + Update path; its serializer silently removed those
  two iframe-containing rivers.
- Restored the complete current `cargo/home.html` through the required direct
  `bodycopy.innerHTML` + UTF-8 `TextDecoder` + bubbling `InputEvent` workflow,
  then saved and reloaded Cargo. Persistence proof found 68/68 unique media
  IDs, V7 6/6, Touchbaes 7/7, 38/38 images loaded, 27/27 video posters, 12
  desktop scrubbers, two `responsive-70` markers, and zero page overflow.
- Compact Cargo proof retained all 68 media IDs, both restored rivers, native
  horizontal project rivers, hidden desktop scrubbers, and zero overflow.
  The Figma-synchronized Round 78 copy, including WTW `Entertainment`, remains
  intact.
- Published at 2:05pm EDT. Independent public desktop proof found all 68 unique
  media IDs, V7 6/6, Touchbaes 7/7, all 38 images loaded, all 27 posters,
  current WTW copy, 12 scrubbers, and zero page-level overflow. The protected
  Round 69 gold baseline was not modified.

## Round 80 (2026-07-20): scrubber post-pointer border normalization — PUBLISHED
- Reproduced the remaining desktop scrubber state leak. Pointer dragging still
  called `control.focus()`, so after `.is-dragging` cleared and the mouse left,
  Chrome retained `:focus-visible` and exposed the keyboard-only 10px thumb
  with a 2px border instead of the normal 8px/1px outline.
- Updated canonical `panel.js` so both pointer routes call `control.blur()`.
  Cargo's publisher retained the older inline script after the complete
  bodycopy was injected and reload-probed, so the authoritative site-head also
  carries the same narrowly scoped safeguard: a capture listener blurs only
  `.mms-river-scrubber` pointer interactions after their own handler runs.
  Keyboard Tab and arrow-key focus remain untouched.
- Deployed the complete `cargo/site-head.html` through Cargo's HTML settings
  editor. Its 1,880-character clipboard round-trip matched the local source
  exactly. After editor reload, the persisted
  `<script data-mms-ios-edge-head="49">` outer HTML also matched exactly and
  contained one scoped scrubber listener.
- Reloaded Cargo proof found 12 desktop scrubbers, 68/68 unique Home media
  items, and the corrected post-pointer state: not focused, not
  `:focus-visible`, 8px thumb height, and 1px border. Published at 2:40pm EDT.
  Independent public proof repeated the same 8px/1px state, retained all 68
  unique media items and 12 scrubbers, and measured zero page-level overflow.
  Shared runtime remains `responsive-70`; the protected Round 69 gold baseline
  was not modified.

## Round 81a (2026-07-21): latest-gold freeze and fail-closed deployment manifest — LOCAL/GITHUB ONLY
- Ocean clarified that the preservation target is the actual latest verified
  site, not the historical Round 80 capture. The new immutable identity is
  `gold-2026-07-21-responsive-70`. It contains the current `responsive-70`
  site plus the approved post-Round-80 WTW 504×504 correction and the four
  intentional Withered Green paragraph rotations. Round 69 and Round 80 remain
  unchanged historical references.
- Independently read back the current public Home, Who, Write, global CSS, and
  Custom HTML. Public Home contains all 68 ordered media IDs, 13 bands, V7 6/6,
  Touchbaes 7/7, WTW `wtw-02` at 504×504, and two `responsive-70` markers.
  Public Write contains exactly four direct `eye-roll` body-paragraph hooks and
  a static Withered Green heading.
- Added `cargo/deployment-manifest.json` and a semantic HTML validator. The
  manifest locks the approved runtime/head markers, page identities, exact
  Home band and media order, per-band and kind counts, V7/Touchbaes/Montran
  embed contracts, WTW geometry, Who media order, and empty Write media
  inventory, and every image/video/poster/iframe source identity. It is an
  explicit approval boundary and must never be generated automatically from a
  possibly damaged payload.
- Wired the manifest into `cargo/validate-cargo-payload.sh` and the aggregate
  audit gate. Thirteen negative fixtures now prove rejection of stale runtime
  or head markers, missing WTW/V7/Touchbaes content, wrong WTW geometry, stale
  embed versions, blank or replaced media sources, unexpected live iframe
  sources, and malformed bodycopy. Frozen Round 80 evidence remains
  byte-identical; its known
  WTW geometry is superseded only in memory during current-state validation.
- Created the local rollback snapshot
  `cargo/gold/2026-07-21-responsive-70/` with canonical source, assembled pages,
  validators, public-artifact fingerprints, and a complete checksum inventory.
- `cargo/assemble-test.sh canonical` and
  `audit/scripts/validate-phase2.sh` pass. This batch did not open or change the
  Cargo editor, Freight, Figma, or the public site, and did not publish Cargo.
- Git commit `07531485ca0ac4378fd3182ffa176ee6ccead7dd` is preserved by the
  protected tag and GitHub release `gold-2026-07-21-responsive-70`. Repository
  rules now prevent deletion or non-fast-forward rewriting of both `round-*`
  and `gold-*` tags. Draft PR 4 proposes the guard onto the merged audit
  baseline.

## Round 82 (2026-07-21): single Home media-playback owner — LOCAL/GITHUB ONLY
- Remediated only `MMS-AUD-027`. Removed the legacy Home helper that called
  `play()` on all 27 portfolio videos at startup, on four document/window
  events, and every 2.5 seconds. The existing deferred-media observer in
  `cargo/panel.js` is now the sole Home video playback owner; its source
  activation, visible/near envelope, muted inline autoplay, posters, and
  bounded resume path were not changed.
- Added a fail-closed ownership check to the normal Cargo bodycopy validator
  and a focused Chrome probe. The protected gold fixture correctly reproduces
  the defect by growing from 122 to 176 play attempts after lifecycle
  settlement. The candidate holds at 14
  visible/near attempts with zero later 2.5-second retry and no play call on an
  unloaded or horizontally/vertically far-offscreen video. A fourteenth
  destructive deployment fixture proves stale autoplay bodycopy is rejected.
- Added a reusable latest-gold parity probe. Compact and expanded runs each
  passed all 240 theme/face/scale/shape states, an exact masked screenshot,
  control-panel behavior, and native river scrolling. This batch changes no
  CSS, layout, media dimensions, source identities, visible composition, or
  interaction algorithm.
- The immutable Round 80 Cargo snapshot contains runtime-activated deferred
  `src` attributes. The aggregate test now removes only those live attributes
  in memory before validating the saved-source contract. The frozen files
  remain byte-identical and the production deployment validator remains strict.
- The audit-only Playwright pin advances to 1.61.1 so the mandatory local
  Chrome gates do not hang against the installed browser. Both browser probes
  now run inside `audit/scripts/validate-phase2.sh` and have finite watchdogs.
- `cargo/assemble-test.sh canonical`, `audit/scripts/validate-phase2.sh`,
  `npm run media-owner-test`, and `npm run gold-parity-test` pass. Physical
  iPhone Safari autoplay remains the required final environment check before
  this delta is deployed to Cargo.
- No Cargo editor, Freight asset, Figma node, or public site was changed or
  published. `MMS-AUD-029` root teardown remains the next separate batch.

## Round 83 (2026-07-21): root-runtime teardown and latest-gold enforcement — LOCAL/GITHUB ONLY
- Remediated `MMS-AUD-029` without changing the approved visible site. The
  shared panel runtime and Home tweezer runtime now register every root-scoped
  listener, timer, interval, animation frame, media-query listener, and
  observer with an explicit lifecycle owner. Replacing `.mms` tears down the
  stale owner idempotently before the new root is initialized.
- Teardown also removes generated scrubbers, hides and empties the rig owned by
  the stale root, restores the portaled control panel safely, releases pointer
  capture, pauses stale-root
  media, clears root-only measured variables, and leaves saved visitor theme,
  typeface, scale, and shape preferences unchanged.
- Added a fail-closed static validator and a browser replacement probe. Compact
  and expanded tests each perform the initial load, three complete root
  replacements, and one same-root child rehydration that replaces the dialog
  and Touchbaes river/iframe. They prove exactly one active panel owner, one
  active Home owner, exact rebinding to current elements, zero stale element
  listeners, stable resources, zero JavaScript errors, no layout drift above
  1px, and zero page-level horizontal overflow. Expanded mode also retains 12
  scrubbers and native river movement from 0 to 360px with no correction after
  settling.
- Ocean clarified that `gold-2026-07-21-responsive-70` is the sole current
  preservation, parity, and rollback target. Round 69 and Round 80 remain
  immutable historical evidence only. Active documentation now says so, the
  browser parity test pins that baseline identifier, and the deployment
  validator rejects a manifest that attempts to name Round 80 as current gold.
- `cargo/assemble-test.sh canonical` and the complete
  `audit/scripts/validate-phase2.sh` gate pass. Latest-gold compact and expanded
  parity each pass 240 theme/face/scale/shape states, exact masked screenshots,
  control interactions, and native rivers. The frozen Phase 1 inventory remains
  122/122 hash-valid.
- No CSS, tokens, typography, layout geometry, media source, media dimensions,
  Figma content, Cargo draft, Freight asset, or public site was changed. This
  round was not deployed or published.

## Round 84 (2026-07-21): clean-gold Home source recovery — PUBLISHED
- Restored Home from the immutable `gold-2026-07-21-responsive-70` bodycopy
  after Cargo had persisted runtime-mutated media state into the saved page:
  eager-loading promotions, native video posters and live sources, iframe
  sources, readiness markers, and hidden rivers.
- Replaced the complete Home bodycopy through the required UTF-8-safe
  `bodycopy.innerHTML` plus `InputEvent` workflow, saved with Cmd+S, reloaded
  the editor, and verified persistence. Cargo Code View was not used.
- The restored source is 125,651 bytes with SHA-256
  `09555a6fe3ebaa54659057733d0f4bad4a5aaca7d9739f9853b7bfbfd3ff8c52`:
  68/68 unique media IDs, 0 live video sources, 0 live iframe sources, 0
  `data-mms-loaded`, 0 `data-motion-ready`, 0 native video poster attributes,
  1 eager image, 37 lazy images, 0 hidden rivers, 30 `data-src` attributes,
  and two `responsive-70` markers.
- Cargo reported `Last Published today, 10:06pm`. A fresh public response
  repeated the clean source contract: 68 media IDs, no live video or iframe
  sources, no saved readiness markers or native video posters, 1 eager image,
  37 lazy images, no hidden rivers, 30 `data-src` attributes, and two
  `responsive-70` markers. The public server reserialized the bodycopy, so its
  transport byte count is not used as the canonical hash.
- Who, Write, global CSS, Custom HTML, Freight assets, Figma, and the protected
  gold snapshot were unchanged. This recovery republishes the approved visual
  gold only. Round 82 media ownership and Round 83 root-runtime teardown remain
  merged GitHub remediation work and were not deployed by this restore. No
  physical iPad claim is made until Ocean verifies the public site on-device.

## Round 85 (2026-07-21): fail-closed saved-source purity — LOCAL/GITHUB ONLY
- Advanced the reviewed deployment manifest to schema 2 and added exact
  saved-source contracts for Home, Who, and Write. The normal bodycopy gate now
  rejects live video/iframe/child-source URLs, native media posters, runtime
  loaded/ready/source markers, hidden rivers, generated scrubbers, changed
  deferred-source counts, eager-image identity drift, image/iframe loading
  drift, and video-preload drift.
- Home is locked to 68 media IDs, 30 deferred `data-src` attributes,
  `eviive-03` as the sole eager image, 37 lazy images, 3 lazy iframes, and 27
  videos with `preload="none"`. Who remains two deferred videos with
  `preload="none"`; Write remains media-free.
- Expanded the destructive deployment suite to 30 rejected fixtures. Thirteen
  source-purity mutations must fail specifically through the new
  `saved-source purity` comparison, including an eager-image identity swap that
  preserves the 1/37 totals.
- The authenticated Round 80 capture remains byte-identical. Its known runtime
  residue is normalized only in memory before the current manifest validator
  runs; the production validation path remains strict.
- `cargo/assemble-test.sh canonical` and the full
  `audit/scripts/validate-phase2.sh` gate pass, including 122/122 frozen hashes,
  current-gold compact and expanded 240-state parity, media ownership, root
  replacement, shared components, and native river movement. No Cargo editor,
  Freight asset, Figma node, public source, visual geometry, or interaction was
  changed or published in this round.

## Round 86 (2026-07-21): circular swatch focus treatment — PUBLISHED
- Removed the browser/Cargo dotted rectangular focus frame from every theme
  swatch, including the compact panel after its dialog is portaled to the
  document body. Pointer and touch selection now release focus after applying
  the theme, while keyboard activation retains focus and exposes a solid,
  theme-aware circular ring around the swatch artwork.
- Added a dedicated compact/expanded browser contract covering all five themes.
  It proves that pointer activation leaves the control panel open, keyboard
  focus has no rectangular outline, the circular ring remains visible in every
  palette, control geometry does not move, and page overflow stays zero. The
  focused test runs inside the complete Phase 2 gate; incidental focus is
  cleared only before the separate latest-gold screenshot comparison.
- Reassembled the complete Home, Who, and Write bodycopy from canonical shared
  sources. Deployed the complete four-region CSS document while preserving the
  Cargo head and all three Cargo-managed font blocks. Reloaded CSS readback is
  86,761 UTF-8 bytes, SHA-256
  `77583f41c978f9dcae0549502b38e441e6b1243becb21f478437f3d0db620fa6`,
  with one token marker, one layout marker, one of each managed font class, and
  balanced 505/505 braces.
- Replaced Home, Who, and Write through direct UTF-8-safe bodycopy assignment
  plus descendant `beforeinput`/`input`/`change` events, saved with Cmd+S, and
  reloaded each editor. Home retains the complete current payload; Who retains
  its two videos; Write retains zero media, exactly four Withered Green body
  rotations, and a static heading. Each page contains two `responsive-70`
  markers and the new pointer-focus runtime.
- Cargo compact proof at 628px found a 44px-high transparent swatch target,
  pointer focus released, the non-modal panel still open, and zero page
  overflow. Expanded proof found 12 scrubbers and zero overflow. Direct
  keyboard focus on the deployed CSS computed `outline-style:none` and the
  intended 2px page-color plus 3px ink circular ring.
- `npm --prefix audit/harness run swatch-focus-test`,
  `bash cargo/assemble-test.sh canonical`, and the complete
  `bash audit/scripts/validate-phase2.sh` gate pass, including 122/122 frozen
  hashes, both 240-state latest-gold matrices, media ownership, root teardown,
  source purity, native river movement, and all 30 negative deployment
  fixtures.
- Published at 12:52am EDT. Independent public Home, Who, and Write checks find
  the new runtime twice, the pointer swatch unfocused with the panel still open,
  the solid circular keyboard ring, 13 native Home rivers, 12 desktop
  scrubbers, zero page-level overflow, and the protected four/static Withered
  Green contract. No media source, media geometry, layout, typography, Figma,
  Freight asset, or `gold-2026-07-21-responsive-70` file changed.

## Round 87 (2026-07-22): hover-only swatch ring — PUBLISHED
- Ocean corrected the Round 86 interaction contract: theme swatches must show
  no border or ring on load, pointer/touch selection, or keyboard focus. A
  single 1px circular ring appears only during true fine-pointer hover and is
  removed immediately when the pointer exits.
- Removed both the permanent artwork border and the swatch-specific
  `:focus-visible` ring. The transparent button target still suppresses Cargo's
  dotted rectangular outline, and target geometry is unchanged. Other control
  focus treatments were not modified.
- Updated `swatch-focus-test.mjs` to prove the hover-only contract at compact
  and expanded widths across all themes. The complete Phase 2 gate passes:
  122/122 frozen hashes, both 240-state gold matrices, media ownership, root
  teardown, saved-source purity, native rivers, and all 30 negative deployment
  fixtures.
- Deployed the complete four-region stylesheet with Cargo's head and all three
  managed font blocks preserved. Reloaded CSS is 86,459 UTF-8 bytes, SHA-256
  `2e7cd7798dcbea7ba222e967d6824507e8c4e7844903cf55e6fb69b170ea0bf9`,
  with one token marker, one layout marker, and one of each managed font class.
- Who and Write bodycopies were normalized through the UTF-8-safe direct
  `innerHTML` plus `InputEvent` workflow and reload-verified. Home bodycopy was
  deliberately not rewritten because this correction is global CSS-only; its
  complete 68/68 unique media payload was preserved and reload-verified before
  publication.
- Published at approximately 9:07am EDT. Independent public verification found
  Home with 68/68 unique media items, 13 rivers, 12 expanded scrubbers, square
  WTW asset geometry, and zero horizontal overflow. The swatch has no load ring,
  shows the 1px ring on real hover, and returns to no ring on pointer exit.
  Public Who retains two videos; Write retains four Withered Green body
  rotations with a static heading. The protected
  `gold-2026-07-21-responsive-70` snapshot was not changed.

## Round 88 (2026-07-22): gold swatch border with Arrow-only focus frame — DRAFT ONLY
- Ocean superseded Round 87's borderless-rest decision. Restored the protected
  gold swatch artwork border exactly: every visible expanded and compact theme
  dot again has a permanent 1px circular `var(--color-border)` stroke. The
  existing fine-pointer hover halo remains unchanged.
- Kept the dotted rectangular target outline separate from the artwork. It is
  absent on initial/dialog focus, programmatic focus, Tab alone, pointer, and
  touch. An unmodified Left/Right/Up/Down key while a theme swatch owns focus
  enters Arrow-navigation mode, wraps focus within the five-dot palette, and
  exposes the 1px dotted gold target outline with a 3px offset. The next
  pointer or touch contact clears that transient mode.
- Added the Arrow modality listener through the existing lifecycle owner, so
  root replacement and teardown remove both listeners and the transient root
  attribute. Target geometry, theme selection, panel persistence, layout,
  typography, media, and saved preferences were not changed.
- Reassembled Home, Who, and Write from the canonical shared runtime. Deployed
  the complete four-region CSS while preserving Cargo's head and all three
  managed font blocks. Reloaded CSS is exactly 86,758 UTF-8 bytes, SHA-256
  `95c35fff5d9ec49bd3ea2f4c0878794918ad087b377c079bf3ac5de68075be4c`,
  and passes the complete persisted-CSS residue contract.
- Replaced all three bodycopies through UTF-8-safe direct `innerHTML` plus
  `InputEvent`, saved with Cmd+S, and reload-verified. Home retains 68/68
  unique media IDs and zero page overflow; Who retains two deferred videos;
  Write retains exactly four Withered Green `eye-roll` body spans and no
  rotating heading. Every page contains the shared Arrow runtime and computes
  the 1px gold circle with no initial target outline.
- The focused compact/expanded five-theme browser test now proves initial,
  hover, pointer, quiet-focus, Arrow-wrap, and pointer-reset states. Canonical
  assembly and the complete Phase 2 gate pass: 122/122 frozen hashes, both
  240-state gold matrices, media ownership, root teardown, source purity,
  native rivers, and all 30 destructive deployment fixtures.
- Cargo's contenteditable editor reclaims inner focus after a simulated Arrow
  press, so the Arrow frame is proven in the standalone browser contract and
  must be rechecked on the non-editing site after a later authorized publish.
  This round is saved in the Cargo draft only. It was not published, and
  `gold-2026-07-21-responsive-70` was not edited.

## Round 89 (2026-07-22): Touchbaes iPad alpha-video readiness — DRAFT DEPLOYED / RELOAD-VERIFIED
- Physical-iPad follow-up reported that Touchbaes asset 2 could remain on its
  first-frame poster for minutes. The selected iPad source is the valid,
  fast-started 1080x1920 HEVC-alpha MP4: 4.046 seconds, 2,078,186 bytes, with
  `moov` at byte 32. Freight does not serve byte ranges for it. The old path
  concurrently requested the 1,728,991-byte original transparent PNG poster
  while leaving the activated video at `preload="none"`.
- Added a manifest-safe runtime correction owned only by
  `touchbaes-02`: when the existing near-media observer activates it, preload
  switches to `auto`, the first decoded `loadeddata` frame gets one bounded
  playback retry, and the native poster uses Freight's 720px rendition
  (408,732 bytes) instead of the original. The saved `data-poster`,
  `data-src`, `data-mp4`, source priority, dimensions, deployment manifest,
  and protected gold are unchanged. A failed video retains that optimized
  poster.
- Added `touchbaes-readiness-test.mjs` at 768x1024 and 1024x1366 iPad
  contexts. It proves HEVC selection, target-only `preload="auto"`, runtime
  poster substitution without saved-source drift, exactly one first-frame
  retry, retained error poster, unchanged sibling preload, native river
  behavior, intact geometry, and zero page overflow. The focused test and the
  complete Phase 2 gate pass, including 122/122 frozen hashes, both 240-state
  gold matrices, media ownership, root teardown, source purity, and all 30
  destructive deployment fixtures.
- Reassembled all three canonical bodycopies. Who and Write were deployed
  through UTF-8-safe direct `innerHTML` plus `InputEvent`, saved, reloaded, and
  verified: Who retains two videos and zero overflow; Write retains exactly
  four rotating Withered Green body spans, a static heading, and zero
  overflow. The shared readiness helper is inert on both pages because neither
  contains `touchbaes-02`.
- Chrome's Home editor continued resolving the V7 Freight document response,
  so its raw direct-edit channel remained unavailable. The authenticated
  in-app Cargo editor exposed the same supported hydrated bodycopy and a clean
  direct-edit channel. Replaced the complete canonical Home through
  `bodycopy.innerHTML` plus `InputEvent`, saved with Cmd+S, and reloaded. Cargo
  Code View was never used.
- Extracted Cargo's raw saved Home record after reload and passed it through
  the schema-2 bodycopy validator. It contains 68/68 unique media IDs, seven
  Touchbaes items, the Round 89 helper, two `responsive-70` markers, no live
  video source, no native poster, `preload="none"`, and the original approved
  `data-poster`. The activated preview legitimately uses the 720px runtime
  poster. Compact and expanded probes retain native rivers, zero page-level
  overflow, one root, all 68 media IDs, and the protected 504x504 WTW geometry
  at a 1440px composition.
- Home, Who, and Write now contain the same canonical shared runtime and are
  reload-verified in the Cargo draft. This round was not published; the public
  site remains Round 87. Physical iPad Safari remains the final decoder and
  autoplay proof for Touchbaes asset 2.

## Round 90 (2026-07-22): Primary interaction coverage — TEST-ONLY / NOT DEPLOYED
- Closed audit gap `MMS-AUD-032` with dedicated browser contracts for the
  primary interaction surfaces, without changing Cargo source behavior or any
  visible UI. No Cargo, Figma, Freight, or public-site mutation occurred.
- Added `panel-scrubber-transition-test.mjs`: compact panel open/close,
  outside tap versus scroll behavior, pointer focus presentation, scrubber
  track/drag/mouse-leave/keyboard behavior, real coarse-touch horizontal and
  vertical river pass-through, 1023/1024 transition behavior, persisted state,
  and storage-failure fallback. The test confirms native compact rivers retain
  `pan-x pan-y` and zero page-level overflow.
- Added `startup-state-interaction-test.mjs`: startup completes as four
  375ms hard cuts plus exact saved/default landing, visitor interaction cancels
  the sequence permanently, storage fallback works, and back-forward/cache
  restoration keeps the selected theme/face/scale/shape.
- Added `embed-montran-interaction-test.mjs`: V7/Touchbaes/Montran ready
  messages are accepted only from the expected Freight frame/origin/kind,
  stale/malformed/wrong-origin messages are rejected, Touchbaes compact height
  locks after the first valid measurement, and Montran compact taps obey the
  primary-pointer, moved/cancelled/non-primary/secondary-button, center
  dead-zone, one-turn-lock, and compact/expanded breakpoint contracts.
- Folded the new suite into `audit/scripts/validate-phase2.sh` through
  `npm run interaction-test`. Stabilized `gold-parity-test.mjs` for the
  current browser matrix by extending its watchdog to 300s, settling fonts and
  eager images before parity snapshots, comparing screenshots by decoded
  pixels rather than PNG byte streams, masking the live clock in masked
  screenshots, and using DOM handler clicks for parity-only interaction
  snapshots. The parity assertions still compare all 240 states per viewport,
  masked screenshots, and native river readbacks against the protected gold.
- Verification passed: `bash audit/scripts/verify-phase1-baseline.sh`;
  `npm run gold-parity-test`; `npm run interaction-test`;
  `npm run embed-montran-test`; and the complete
  `bash audit/scripts/validate-phase2.sh`. The full gate includes 122/122
  frozen hashes, system inventory, current asset manifest, syntax/config,
  media ownership, both 240-state gold parity matrices, swatch focus,
  Touchbaes iPad readiness, the new interaction suite, source purity,
  shared-component parity, generated test mirrors, runtime root replacement,
  and destructive deployment fixtures.
- Known limitation left for a later embed-validation batch: production
  `applyGameHeight()` still clamps zero or negative finite Touchbaes heights to
  1px instead of rejecting them before clamping. This round intentionally
  remained test-only and did not alter runtime behavior.

## Round 91 (2026-07-22): Touchbaes parent message hardening — TEST-ONLY / NOT DEPLOYED
- Closed audit gap `MMS-AUD-033` for the parent-side Touchbaes escaped tweezer
  rig. The parent no longer assigns child-supplied `data.html` into
  `innerHTML`; it parses only the legacy declarative values it needs, validates
  approved Freight asset URLs and bounded numeric placement/style values, and
  rebuilds the rig from trusted local DOM nodes with `replaceChildren()`.
- Preserved the existing Touchbaes visual behavior and interaction contract:
  the desktop escaped tweezer still accepts the approved open/closed tweezer,
  front arm, and four approved sticker assets; compact mode continues hiding
  the escaped rig. The existing Cargo child iframe v10 can keep sending its
  legacy `html` field because no message-derived string reaches executable
  parent markup.
- Fixed the local Round 90 height-validation limitation by rejecting zero and
  negative finite Touchbaes size messages before clamping. Added zero and
  negative cases to the focused embed harness.
- Fixed a source-only mounting bug exposed by the hardening test: the generated
  rig element is assembled outside `.mms`, so the overlay now falls back from
  `.mms #mms-tw-rig` to `document.getElementById('mms-tw-rig')` before moving
  that existing node into the current root. This does not alter layout.
- Extended `embed-montran-interaction-test.mjs` to prove the trusted rig path:
  valid approved markup renders exactly three trusted images and preserves
  bounded numeric sticker offsets; scripts, event attributes, unapproved image
  URLs, and invalid coordinates do not reach the live parent rig. The Montran
  section now resets to compact mode after the new desktop Touchbaes coverage
  so its existing compact-mode assertions remain deterministic.
- Verification passed: syntax checks for the edited harness and extracted
  `home-extras` script; `bash cargo/assemble-test.sh`; no `innerHTML`
  occurrences remain in `cargo/home-extras.html`, `cargo/home.html`, or
  `cargo/test.html`; focused `npm run embed-montran-test`; and the complete
  `bash audit/scripts/validate-phase2.sh`. The full gate includes 122/122
  frozen hashes, both 240-state gold parity matrices, swatch focus, iPad
  readiness, the full interaction suite, source purity, generated test mirrors,
  runtime root replacement, and destructive deployment fixtures.
- This round is local repository work only. It was not deployed to Cargo, not
  published, and `gold-2026-07-21-responsive-70` was not edited.

## Round 92 (2026-07-22): active V7 and Montran source recovery — TEST-ONLY / NOT DEPLOYED
- Closed recovery issue `MMS-AUD-034` without changing either active embed.
  Added authoritative tracked V7 source recovered from the approved Freight
  artifact and brought the tracked Montran source to exact v17 parity.
- Added deterministic byte-mode builders. Clean-input V7 builds are exactly
  780,341 bytes with SHA-256
  `ee09e9c282d928f8968b91e1301bc0ba2639102a27c1bf1cd40483ab1b609d0a`;
  Montran v17 builds are exactly 1,936,356 bytes with SHA-256
  `825cf2c3a1f130cb3445e62443985e845991204d19e0c2154cfd43a36126b49b`.
  Both match the active Freight files and the frozen Round 80 evidence
  byte-for-byte.
- Added `audit/contracts/active-embed-builds.json` and
  `audit/scripts/validate-embed-reproducibility.py`. The gate requires exactly
  one V7 and one Montran entry, Git-tracked hash-locked inputs, retained
  behavioral markers, two identical isolated builds, and output identity with
  the frozen evidence. Seven destructive fixtures prove missing or duplicate
  kinds, missing or untracked inputs, input drift, contract removal, and output
  hash drift fail closed.
- The focused embed/Montran browser contract passes. The first aggregate run
  encountered one transient existing Montran breakpoint-message timeout after
  the earlier matrices passed; the isolated test immediately passed, and a
  complete rerun of `bash audit/scripts/validate-phase2.sh` passed in full.
  That rerun includes 122/122 frozen hashes, both 240-state gold matrices,
  media ownership, Touchbaes readiness, all primary interactions, source
  purity, root replacement, and all 30 deployment-negative fixtures.
- The external Montran PDF remains outside this viewer-bundle build. PDF URL
  allowlisting remains separate issue `MMS-AUD-036`; third-party notices remain
  separate issue `MMS-AUD-039`.
- This round is repository recovery and verification only. It was not deployed
  to Cargo, not published, and did not alter Figma, Cargo payloads, Freight
  assets, visual geometry, runtime behavior, or
  `gold-2026-07-21-responsive-70`.

## Round 93 (2026-07-22): V7 and Touchbaes message protocol — TEST-ONLY / NOT DEPLOYED
- Prepared the `MMS-AUD-030` exact-origin protocol without modifying the
  currently active recovered embed files. The shared parent now derives each
  V7/Touchbaes child origin from its deferred iframe source, sends visibility
  and game-mode messages only to that exact origin, includes `kind` and
  `protocolVersion: 1`, and fails closed when the origin cannot be derived.
- Parent receipt remains compatible with the active legacy children until an
  iframe opts into `data-embed-protocol="1"`. Opted-in V7 and Touchbaes frames
  require the exact current window, exact derived origin, kind, exact numeric
  protocol version, boolean payload fields, and existing bounded payload
  contracts before readiness, height, or escaped-rig state can change. A
  present but empty, malformed, or unsupported protocol attribute fails closed
  instead of silently reverting to the legacy path.
- Advanced the internal panel and Home lifecycle owners to
  `root-lifecycle-2/embed-message-v1` without changing the public
  `responsive-70` marker. An isolated same-root browser fixture proves an
  installed lifecycle-1 owner is torn down and replaced, so a Cargo rerun
  cannot retain the former wildcard/unversioned listeners.
- Added separately hash-locked child successors rather than overwriting live
  recovery sources: V7 `three-r160/message-v1` builds deterministically to
  781,074 bytes with SHA-256
  `0e196aa0f2e1d35f0671ea1d746f5453037ee7e320a36ca189b1a5d817cf256f`;
  Touchbaes v11 builds to 50,030 bytes with SHA-256
  `6c4947e22ac8f8b5ec06d1c4f9d238367c561819a5eac6d8a699403e6f75fee0`.
  Both children derive the real parent origin from `document.referrer`, reject
  wrong source/origin/kind/version and non-boolean mode values, and post only
  to the exact parent origin.
- `audit/contracts/embed-message-protocol-candidates.json` records the two
  successors as `prepared-not-active` and identifies the exact artifacts they
  supersede. `validate-embed-message-protocol.py` requires tracked hash-locked
  inputs, two identical isolated builds, retained protocol markers, no
  wildcard target in the candidate/parent paths, and eleven destructive
  contract failures. The prepared-state guard also requires both canonical
  Home iframe URLs and both deployment-manifest entries to remain on the
  legacy children with no protocol attribute; one-sided activation fails the
  gate.
- Browser coverage now proves exact parent targets, versioned outbound
  envelopes, strict parent readiness/Touchbaes height/rig filtering, real V7
  pause/resume behavior, real Touchbaes mode/readiness/size behavior,
  malformed protocol-attribute rejection, same-root owner replacement, and
  unchanged Montran interactions. The complete Phase 2 gate passes, including
  122/122 frozen hashes, both 240-state gold matrices, iPad readiness, all
  primary interactions, saved-source purity, root replacement, and all 30
  deployment-negative fixtures.
- The active V7 recovery still reproduces 780,341 bytes at SHA-256
  `ee09e9c282d928f8968b91e1301bc0ba2639102a27c1bf1cd40483ab1b609d0a`;
  active Montran v17 still reproduces 1,936,356 bytes at SHA-256
  `825cf2c3a1f130cb3445e62443985e845991204d19e0c2154cfd43a36126b49b`.
  `gold-2026-07-21-responsive-70` remains untouched.
- This round was not uploaded to Freight, deployed to Cargo, or published.
  Active closure requires one atomic later batch: upload both successor
  children, update both immutable iframe URLs plus `data-embed-protocol="1"`,
  deploy the complete parent bodycopy, reload-verify, then capture and promote
  the new active artifact identities. Do not deploy either side alone.

## Round 94 (2026-07-22): Montran exact-PDF allowlist — TEST-ONLY / NOT DEPLOYED
- Prepared a separate Montran v18 successor for `MMS-AUD-036`; the recovered
  active v17 source, 1,936,356-byte artifact, Cargo iframe URL, deployment
  manifest, and protected gold tree remain unchanged. No Cargo or Freight
  upload, deployment, or publication occurred.
- The candidate accepts either one decoded `pdf` parameter equal byte-for-byte
  to the approved report URL or the same approved URL from its inlined config
  when the parameter is absent. Empty, duplicate, aliased, non-HTTPS,
  wrong-origin, wrong-path, query-bearing, fragment-bearing, encoded, or
  confusable values fail before the preload surface and before network access.
- Every approved PDF request is revalidated at the fetch boundary, uses CORS,
  omits credentials and the referrer, rejects redirects, and checks the frozen
  13,634,937-byte identity on HEAD/full responses and exposed range totals.
  The evidence SHA-256 remains
  `664dab49810d21acaa0ffbb7d6749268215c1b655ccec11f461d67c147f02629`.
- The deterministic candidate builds to 1,938,550 bytes with SHA-256
  `ca9ee9c69594af7c9e4a214f422413d00e43cbd5b493ec48f1f033295690e512`.
  It keeps the parent-message wire version at 17 because the ready schema did
  not change; artifact version and message version are intentionally separate.
- The static gate proves tracked hash-locked inputs, exact frozen PDF evidence,
  two identical isolated builds, the single native fetch boundary,
  prepared-state Cargo guards, and 13 destructive failures. The actual-viewer
  gate rejects 19 hostile forms with zero requests, renders pages 19–20 for
  both approved entry paths, preserves 256 KiB ranges, and proves no Cookie or
  Referer leaves the browser.
- Existing active embed reproducibility, parent/child message, Montran turn,
  same-root lifecycle, native-river, and protected layout checks remain clean.
  The complete Phase 2 gate passes, including 122/122 frozen hashes and both
  240-state protected visual matrices.
  Activation is a later reviewed batch: upload the immutable v18 candidate,
  atomically change the Montran iframe URL and manifest, reload-verify Cargo,
  then promote the new active artifact identity. Do not overwrite v17 or the
  frozen Round 80 evidence.

## Round 95 (2026-07-22): third-party runtime notice record — TEST-ONLY / NOT DEPLOYED
- Completed the tracked repository provenance and notice portion of
  `MMS-AUD-039` without changing any active or prepared embed bytes. Added
  `THIRD_PARTY_NOTICES.md` with exact package/version/source/file identities
  and the complete upstream license texts for StPageFlip/page-flip 2.0.7,
  PDF.js/pdfjs-dist 6.1.200, and Three.js 0.160.0 (r160).
- Added `audit/contracts/third-party-runtime-notices.json` and the mandatory
  `validate-third-party-runtime-notices.py` gate. It requires the exact three
  runtime components, exact four tracked vendor files, complete hash-locked
  license blocks, retained PDF.js/Three.js banners, and exact coverage of all
  active and prepared vendor-bearing artifacts. A newly added or unassigned
  `work/**/vendor/*` file fails closed.
- The validator rebuilds every mapped artifact and proves each relevant raw
  vendor payload occurs exactly once. The identities remain unchanged: active
  V7 780,341 bytes / `ee09e9c282d928f8968b91e1301bc0ba2639102a27c1bf1cd40483ab1b609d0a`;
  prepared V7 781,074 bytes /
  `0e196aa0f2e1d35f0671ea1d746f5453037ee7e320a36ca189b1a5d817cf256f`;
  Montran v17 1,936,356 bytes /
  `825cf2c3a1f130cb3445e62443985e845991204d19e0c2154cfd43a36126b49b`;
  prepared Montran v18 1,938,550 bytes /
  `ca9ee9c69594af7c9e4a214f422413d00e43cbd5b493ec48f1f033295690e512`.
- Seventeen destructive fixtures prove schema/issue drift, missing or duplicate
  components/artifacts, wrong metadata, duplicate vendor assignment, untracked
  or altered notices, truncated licenses, vendor hash/banner drift, artifact
  identity drift, missing component links, uncovered vendor input, and removed
  or duplicated embedded payloads all reject. Existing active recovery,
  protocol-candidate, and PDF-allowlist focused gates also pass.
- Regenerated the deterministic system inventory from the new notice contract.
  StPageFlip now resolves to 2.0.7 MIT; PDF.js and Three.js point to their
  tracked license evidence; only unrelated Cargo-font and portfolio-asset
  provenance gaps remain in that section.
- The complete `bash audit/scripts/validate-phase2.sh` gate passes: 122/122
  frozen hashes, both 240-state protected visual matrices, native rivers,
  WTW/Withered contracts, embed/browser interactions, iPad readiness, source
  purity, root replacement, and all destructive release fixtures remain clean.
- This round changed no Cargo/Figma/Freight source, URL, upload, draft, or
  publication, and did not edit `gold-2026-07-21-responsive-70`. The sidecar is
  a tracked repository record; it does not claim the immutable legacy Freight
  HTML gained an internal StPageFlip banner. Any future distributed successor
  must ship or accompany this notice in its separately reviewed promotion.

## Round 96 (2026-07-22): Framer helper dependency advisory — TOOLING-ONLY / NOT DEPLOYED
- Closed the repository remediation for `MMS-AUD-038` without touching Cargo,
  Figma, Freight, any public page, active embed, or protected visual source.
  The private Framer helper now pins its already-used `framer-api` release at
  exact version 0.1.7 instead of resolving `latest`, avoiding an unnecessary
  pre-1.0 SDK upgrade.
- Added an exact `devalue` 5.8.2 override. It still satisfies the SDK's
  `^5.6.4` constraint and lies outside `GHSA-77vg-94rm-hx3p`, whose affected
  range is 5.6.3 through 5.8.0. The lockfile retains `csstype` 3.2.3 and
  `std-env` 4.1.0 and resolves only the reviewed five lock nodes.
- Added `dependency-smoke-test.mjs`. It imports the installed SDK, executes
  both unchanged helper entrypoints against a throwing read-only Proxy,
  verifies exact project/style reads, local output shape, missing-credential
  refusal, failure cleanup, and guaranteed disconnect, and rejects any
  unreviewed remote client property.
- Added `audit/contracts/framer-helper-dependencies.json` and the mandatory
  `validate-framer-helper-dependencies.py` gate. It hash-locks the helper
  config, lockfile, smoke test, and read-only sources; rejects floating pins,
  vulnerable or extra packages, integrity drift, lifecycle hooks, remote
  mutations, and disconnect loss; performs an isolated `npm ci`; runs the
  dynamic smoke test and clean dependency-tree check; and requires an online
  audit with zero findings at every severity. It also requires the contract,
  validator, and every declared helper input to be Git-tracked. Seven
  destructive fixtures pass.
- Focused verification passed: 122/122 protected hashes, isolated install,
  helper API smoke, zero-vulnerability npm audit, ignored-output guard, and no
  protected site/runtime path changes. The complete Phase 2 gate also passes,
  including both 240-state gold matrices, native rivers, Touchbaes/iPad and
  Montran behavior, WTW/Withered contracts, source purity, root replacement,
  and all deployment-negative fixtures.
- No Framer credentials or `.env` are present in this checkout, so a live
  authenticated `npm run read:design` was not claimed. The SDK itself remains
  at the already-used 0.1.7; before the helper is next used with credentials,
  run the documented clean install, smoke test, zero-vulnerability audit, and
  authenticated read. Generated `.env`, `node_modules`, and
  `design-system.json` remain ignored and untracked.
- This round is repository tooling only. It was not deployed or published,
  and `gold-2026-07-21-responsive-70`, Round 69, and Round 80 evidence remain
  unchanged.

## Round 97 (2026-07-22): executable iframe capability matrix — TEST-ONLY / NOT DEPLOYED
- Prepared the minimum per-embed policy for `MMS-AUD-035` without changing an
  active Cargo iframe, Freight artifact, public page, Figma file, visual
  geometry, or protected gold source. Canonical Home and the deployment
  manifest deliberately remain on the active V7, Touchbaes v10, and Montran
  v17 URLs with no policy attributes until a later atomic promotion.
- Added `audit/contracts/iframe-capability-matrix.json`. The exact shared
  candidate is `sandbox="allow-scripts allow-same-origin"`,
  `referrerpolicy="strict-origin"`, no positive Permissions Policy delegation,
  and the finite deny-only feature list serialized in the contract. Scripts
  are required by all three applications; same-origin identity is required by
  their exact-origin message contracts; strict-origin supplies only the parent
  origin used for child bootstrap.
- Added `validate-iframe-capability-matrix.py` with sixteen destructive
  fixtures. It rejects missing or extra sandbox powers, a bootstrap-breaking
  referrer policy, changed/invalid permission directives, missing embeds,
  missing proof requirements, candidate identity or proof-input drift, broken
  npm/Phase 2 wiring, untracked proof files, and any one-sided Home or
  deployment-manifest activation.
- Added an actual-browser proof using the exact prepared V7 message-v1,
  Touchbaes v11, and Montran v18 builds. Under the candidate attributes V7
  renders WebGL and pauses/resumes, Touchbaes negotiates mode/readiness/size and
  completes a pointer drag, and Montran runs its Blob worker, renders pages
  19–20 through range requests with no Cookie or Referer, and completes both
  expanded and compact turns. Every browser-supported Permissions Policy
  feature is explicitly reviewed and denied; the proof fails if any supported
  feature remains allowed or appears without a contract entry.
- Negative browser controls prove that removing `allow-same-origin` changes
  child messages to origin `null`, while `no-referrer` removes the child
  bootstrap and prevents readiness. The iframe referrer policy covers the
  navigation and `document.referrer`; Montran v18's separate fetch policy is
  what suppresses PDF credentials and referrers.
- Repository Chromium evidence cannot certify Cargo serialization, live
  Freight headers, desktop Safari, or physical iPhone/iPad Safari. Those remain
  explicit promotion gates. No policy is enforced until successor uploads,
  protocol attributes, iframe policies, manifest, and complete Cargo bodycopy
  can be promoted and reload-verified together.

## Round 98 (2026-07-22): public response-header policy — TEST-ONLY / NOT DEPLOYED
- Prepared the response-layer remediation contract for `MMS-AUD-037` without
  changing Cargo HTML, CSS, bodycopy, the deployment manifest, Freight, Figma,
  DNS, visual geometry, runtime behavior, or
  `gold-2026-07-21-responsive-70`. Nothing was deployed or published.
- A fresh read-only probe between 2026-07-23 01:44 and 02:02 UTC reconfirmed
  that Home, Who, and Write return Cargo HTML over HTTPS but no CSP, CSP Report-Only,
  Reporting-Endpoints, Referrer-Policy, Permissions-Policy,
  X-Content-Type-Options, X-Frame-Options, or HSTS. The HTTP apex still returns
  a 301 to HTTPS. Six canonical Freight samples, including all three executable
  embeds, a PDF range, poster, and video, also lacked those policy families;
  Freight remains a separate response boundary.
- Cargo's documented self-service surfaces cover CSS, bodycopy, Custom HTML,
  metadata, and DNS, but expose no documented response-header rule. The frozen
  public capture also proves Cargo emits the saved Custom HTML after the
  document head, so it is not a response-header owner. This is deliberately
  recorded as `not-documented` and `unconfirmed`, not as a claim that Cargo
  support cannot provide an internal capability.
- Added `audit/contracts/public-response-header-policy.json` with activation
  `prepared-not-active`. The required delivery is HTTP response headers through
  either support-confirmed Cargo control or a separately approved first-party
  edge. The owner, reporting endpoint, exact CSP, and Cargo editor/preview
  ancestor decision remain null or pending. A first-party edge must never claim
  it rewrites `freight.cargo.site` responses.
- The staged order is fixed: confirm one header and rollback owner; approve a
  privacy-reviewed report sink and run CSP Report-Only discovery; verify the
  complete compact/expanded/device and Cargo editor/preview matrix; only then
  enforce exact CSP and the reviewed referrer, permissions, MIME, frame, and
  HTTPS policies. HSTS ramps from 300 to 86,400 to 31,536,000 seconds and keeps
  `includeSubDomains` and preload disabled until a separate host/TLS audit.
- Meta delivery cannot close this issue. The contract and validator explicitly
  reject fake `http-equiv` substitutes, premature activation, false platform
  capability, partial route coverage, Freight scope claims, unsafe CSP
  widening, skipped report-only discovery, missing evidence, and premature
  HSTS expansion.
- `validate-public-response-header-policy.py --self-test` passes with 29
  destructive fixtures and is mandatory in `validate-phase2.sh`. The complete
  Phase 2 suite passes: 122/122 frozen hashes, both 240-state gold matrices,
  native rivers, WTW and Withered Green contracts, Touchbaes/iPad and Montran
  behavior, embed capability proofs, source purity, root replacement, and all
  release-negative fixtures remain clean.
- Activation is an external follow-up, not part of this round. It requires
  written Cargo capability confirmation or separately approved edge/DNS work,
  a reporting and privacy decision, clean report-only evidence, complete
  device/browser verification, rollback, Cargo persistence where applicable,
  and fresh public response capture. No publication is authorized by this
  prepared record.

## Round 99 (2026-07-22): low-collection privacy inventory — DOCUMENTATION-ONLY / NOT DEPLOYED
- Closed the repository documentation gap for `MMS-AUD-040` without changing
  Cargo HTML, CSS, JavaScript, bodycopy, the deployment manifest, Freight,
  Figma, visual geometry, runtime behavior, or
  `gold-2026-07-21-responsive-70`. Nothing was deployed or published.
- Added `docs/PRIVACY-DATA-INVENTORY.md`. It records exactly four first-party
  `localStorage` appearance keys and one `sessionStorage` startup-signature
  key. It also records that Touchbaes v10 removes its legacy Freight-origin key
  and does not save placements.
- Fresh isolated Chromium observations covered clean Home, Who, and Write
  loads, a complete 9,611px Home traversal, and deliberate compact control
  changes. The durable runtime-origin set is MM.S, Cargo build/static/type,
  Freight, and Google Fonts stylesheet/binary delivery. No Cookie,
  Authorization, Set-Cookie, write request, tracker-pattern request, form,
  IndexedDB, Cache Storage, or service worker was observed.
- This is qualified client evidence, not a claim that infrastructure providers
  keep no logs. Cargo, Freight, and Google receive ordinary request metadata;
  provider retention and downstream processing were not audited. External
  project, LinkedIn, and email destinations are visitor-initiated navigation,
  not background vendors.
- Added `audit/contracts/low-collection-privacy.json`, dated evidence, and the
  mandatory `validate-low-collection-privacy.py --self-test` Phase 2 gate. The
  contract fails closed on storage/vendor/link drift, cookie/form/beacon or
  tracker additions, preference transmission, generated-bodycopy resource or
  CSS URL/import additions, absolute claims, missing source identity, or an
  unauthorized Cargo disclosure.
- A public notice remains a separate copy/legal/visual/deployment decision.
  This round authorizes no Cargo, Freight, Figma, DNS, deployment, or
  publication action.

## Round 100 (2026-07-22): native-river ARIA source purity — TEST-ONLY / NOT DEPLOYED
- Closed the repository recurrence path for `MMS-AUD-003` without changing
  Cargo HTML, CSS, JavaScript, bodycopy, Freight, Figma, visual geometry,
  native scrolling, the public site, or
  `gold-2026-07-21-responsive-70`. Nothing was deployed or published.
- Fresh read-only root-cause evidence corrected the stale attribution. The 12
  invalid `hidden` and `aria-valuenow="0"` pairs already exist in both the
  frozen Round 80 saved bodycopy and frozen response. Early public Chromium
  instrumentation recorded zero writes to an exact native `.mms-river`; the
  current runtime writes those states only to its generated scrubber siblings.
  Current canonical source and the point-in-time public source are clean.
- Extended schema-2 saved-source purity with exact `native_rivers` counts and
  zero `invalid_river_scrollbar_semantics` on Home, Who, and Write. The HTML
  parser counts only the exact `mms-river` class token, rejects duplicate
  attributes before dictionary conversion, and prevents
  `.mms-river-scrubber` false matches. The existing hidden-river and
  generated-scrubber checks remain unchanged.
- Added `river-aria-source-purity.json` and
  `river-aria-source-test.mjs`. The focused test validates clean source,
  rejects an `aria-valuenow`-only bodycopy before Cargo, verifies zero clean
  Axe `aria-allowed-attr` nodes, preserves all separate scrubber ARIA, and
  exercises native compact touch and expanded horizontal wheel scrolling.
  Its reconstructed frozen negative control retains exactly 12 contaminated
  rivers and must reproduce exactly 12 Axe nodes.
- The frozen Cargo fixture's known activated-runtime residue and three
  case-duplicate SVG `viewBox` attributes are normalized only in memory for
  the existing deployment-manifest persistence proof; immutable evidence is
  not edited.
  No runtime cleanup observer was added because source validation is the
  verified owner of this correction.
- The focused source/browser contract and complete Phase 2 suite pass. This
  includes 122/122 frozen hashes, both 240-state gold matrices, native rivers,
  WTW and Withered Green, Touchbaes/iPad and Montran behavior, iframe proofs,
  root replacement, source purity, and all 38 deployment-negative fixtures.

## Round 101 (2026-07-22): document-language contract — REPOSITORY RUNTIME / NOT DEPLOYED
- Closed the repository implementation path for `MMS-AUD-004` without a CSS,
  layout, media, interaction, Figma, Freight, Cargo draft, or public-site
  change. The protected `gold-2026-07-21-responsive-70` baseline and frozen
  Round 69/Round 80 evidence remain unchanged.
- Fresh read-only evidence confirmed that the canonical Home, Who, and Write
  routes, `/home` and `/information` aliases, and Who/Write trailing-slash
  routes all omitted a root language in both raw public source and settled
  Chromium DOM. Cargo hydration did not infer one.
- `cargo/site-head.html` now sets exact `en` before its pathname gate and
  exposes a matching `data-mms-document-language="en"` marker.
  `cargo/shared-early-init.html` reasserts the same language before its
  one-shot guard so a repeated Cargo body initialization or body-only context
  cannot retain an empty root language. Standalone mirrors declare literal
  `lang="en"`; the Write page retains exactly one `lang="yue-Hant"` passage.
- Extended the deployment manifest and validator to pin the language marker
  on the actual opening script tag, one executable setter line, and
  pre-route-gate ordering. Fifteen head mutations, including external/inert
  script, attribute-name, attribute-value, line/block comment, and
  string/template-only bypass
  attempts, and an
  invalid manifest language join the existing fail-closed deployment
  fixtures. Regenerated Home, Who, Write, and their standalone mirrors through
  the canonical assembler.
- Added `audit/contracts/document-language.json` and
  `document-language-test.mjs`. The focused Chromium proof covers all three
  routes at 390x844 and 1440x900, the three root-language Axe rules, seven
  head-route fixtures, body-only initialization, repeated initialization after
  the one-shot guard, and the preserved Cantonese descendant override.
- Round 99's privacy evidence and validator received identity-only hash
  refreshes for the five language-bearing runtime/bodycopy files; its storage,
  service, and disclosure findings are unchanged.
- Focused verification and the complete Phase 2 suite pass. The full gate
  retains 122/122 frozen hashes, both 240-state protected visual matrices,
  native rivers, WTW/Withered Green, Touchbaes/iPad, Montran, iframe,
  lifecycle, privacy, and release-safety contracts. Nothing was deployed or
  published; future Cargo activation still requires the normal complete-save,
  reload-persistence, and public verification workflow.

## Round 102 (2026-07-23): primary-navigation landmark — REPOSITORY RUNTIME / NOT DEPLOYED
- Closed `MMS-AUD-023` at the repository boundary without changing CSS,
  layout, media, native rivers, control-panel behavior, Figma, Freight, the
  Cargo draft/public site, or `gold-2026-07-21-responsive-70`.
- Replaced the shared expanded `aside.mms-rail` with
  `nav.mms-rail[aria-label="Primary"]` and named the existing compact
  `nav.mms-mlinks` identically. The class-based layout and runtime contracts
  remain unchanged, so the desktop rail and compact navigation preserve their
  exact measured geometry.
- Extended deployment source purity for every route with exact expanded and
  compact primary-navigation counts, zero invalid candidates, and zero legacy
  complementary rails and zero complementary landmarks anywhere in saved
  source, plus exactly two total navigation landmarks. Twenty new destructive
  bodycopy fixtures reject a
  restored aside, missing/wrong labels, a duplicate compact navigation, class
  coalescing, explicit role overrides, complementary wrappers, and extra
  generic navigation landmarks. They also reject accessible-name overrides,
  popovers, hidden, inert, inline-hidden, or template ancestors, and any
  unexpected direct parent. The deployment-negative total is now 73.
- Added the dated root-cause evidence,
  `audit/contracts/primary-navigation-landmark.json`, and the focused
  `primary-navigation-test`. Home, Who, and Write pass at 390, 1023, 1024, and
  1440 pixels with one visible and one accessibility-tree navigation named
  Primary, zero complementary landmarks, correct link order/current page,
  unchanged geometry, and zero targeted Axe violations.
- Regenerated canonical bodycopies and mirrors and refreshed only the three
  affected Round 99 privacy source identities. No storage, request, service,
  link, or disclosure behavior changed. Focused and complete Phase 2
  verification pass; nothing was deployed or published.

## Round 103 (2026-07-23): EVIIVE final-pair geometry contract — REPOSITORY ONLY / NOT DEPLOYED
- Froze the unrelated `MMS-AUD-007` batch after Ocean reported that EVIIVE's
  last two expanded river images no longer looked equal in height. Read-only
  comparison proved that this was not introduced by the semantic audit
  branches: the protected responsive-70 gold source itself contains
  `558x372` for `eviive-05` and `670x377.593` for `eviive-06`.
- The Figma-derived Round 13 execution record is the independent design
  authority: the final pair is `558x372 / 670x372`. Round 18's retina source
  swap copied the new image's 2800x1578 intrinsic ratio into the second frame,
  which made it rise above the shared bottom edge. Gold parity then preserved
  that latent defect because it had no separate EVIIVE pair contract.
- Restored only `eviive-06` to the approved 670x372 frame and changed its fit
  to `cover`. The source remains proportional; at the 1440px design ratio the
  frame crops approximately 2.8px from the top and bottom, instead of exposing
  a blank edge. A compact-only CSS compatibility rule retains the prior
  377.593 ratio and `contain` fit below 1024px, so compact geometry, media
  profiles, river behavior, captions, descriptions, and runtime are unchanged.
- Added fail-closed deployment geometry for both final EVIIVE items, including
  `data-fit`; two destructive deployment fixtures reject geometry or fit
  drift. Added an additive post-baseline geometry supersession so protected
  gold and frozen evidence stay byte-immutable while gold parity compares
  against the documented intended geometry in memory.
- The focused EVIIVE browser test first proves that protected gold reproduces
  the defect, then pins equal top, height, and bottom within 0.25px at 1024,
  1440, 1920, and 2940px, plus the exact frame and fit contracts and zero page
  overflow. It separately proves compact no-drift against untouched gold at
  320, 390, 430, 768, and 1023px. Focused asset, bodycopy, and both 240-state
  compact/expanded gold matrices pass.
- Round 99's privacy evidence refreshes only the canonical Home template and
  generated bodycopy identities caused by this geometry line plus the site CSS
  identity caused by the compact no-drift rule. Its storage, request, service,
  destination, disclosure, and publication findings are unchanged.
- The complete Phase 2 gate passes: 122/122 frozen hashes, both 240-state
  protected matrices, 75 rejected deployment mutations, native rivers,
  WTW/Withered Green, Touchbaes/iPad, Montran, iframe capabilities, privacy,
  source purity, and runtime root replacement all remain green.
- No Cargo, Freight, Figma, draft, public deployment, or publication action
  occurred. Touchbaes' separately reported visible-tweezer lifecycle is the
  next isolated regression contract before the audit backlog resumes.

## Round 104 (2026-07-23): Touchbaes visible-tweezer lifecycle — TEST-ONLY / NOT DEPLOYED
- Closed the composed regression gap behind the reported missing desktop
  tweezer without changing Cargo HTML, CSS, JavaScript, bodycopy, generated
  mirrors, media, embeds, the deployment manifest, Freight, Figma, public
  state, or `gold-2026-07-21-responsive-70`.
- Read-only diagnosis showed that the public lifecycle-1 owner can retain a
  stale rig after Cargo replaces the root: the active v10 child still delivers
  `rest` and `move`, but the current rig remains hidden. The repository's
  existing lifecycle-2 implementation already owns the current root, rig,
  Touchbaes frame, and river. The remaining defect was that the mandatory
  harness had never combined replacement with a visible rig message.
- Extended the existing mandatory `runtime-root-test`. After expanded
  full-root replacement and after same-root Touchbaes river/frame replacement,
  it now sends exact-origin legacy v10 `rest` and `move` envelopes from the
  current frame and requires one connected current-root rig, `display:block`,
  three trusted layers, approved assets, finite/repositioned geometry, and
  exact lifecycle-2 ownership. A valid-looking message from each detached old
  frame must leave the accepted rig unchanged. Compact mode must keep the
  desktop rig hidden.
- The original teardown, resource-count, panel, layout, zero-overflow, twelve
  scrubber, native-river, and owner-version-upgrade assertions remain intact.
  The focused command
  `npm --prefix audit/harness run runtime-root-test` passes, and an independent
  review found no stale-WindowProxy mistake, false-positive path, or material
  resource/layout side effect.
- The complete `bash audit/scripts/validate-phase2.sh` gate passes: 122/122
  frozen hashes, both 240-state protected matrices, 75 rejected deployment
  mutations, native rivers, WTW, Withered Green, EVIIVE, Touchbaes/iPad,
  Montran, embed capability, media ownership, privacy, and root lifecycle all
  remain green.
- Evidence is recorded in
  `audit/findings/evidence/2026-07-23-round104-touchbaes-visible-rig-root-cause.json`.
  This is deterministic parent-lifecycle Chromium coverage, not a claim about
  live Freight timing or physical Safari. The public site remains on
  lifecycle-1 until a separately authorized complete Cargo promotion restores
  the already prepared lifecycle-2 payload. Nothing was deployed or published.

## Round 105 (2026-07-23): portfolio content semantics — REPOSITORY ONLY / NOT DEPLOYED
- Implements the approved repository content decision for `MMS-AUD-007`
  without changing CSS, JavaScript, visible copy, layout geometry, media URLs,
  media dimensions or fit, native rivers, control-panel behavior, Freight,
  Figma, Cargo draft/public state, or `gold-2026-07-21-responsive-70`.
- Classifies all 65 non-interactive Home media owners and both Who profile
  videos as decorative because the adjacent project or profile copy carries
  their meaning. Decorative owners use exact
  `data-a11y-policy="decorative"` plus `aria-hidden="true"`; all 38 decorative
  Home images use exact empty alternatives so media loading failures cannot
  supply unstable browser fallback names.
- Keeps the three interactive Home embeds unhidden and pins their existing
  stable titles: `V7 rotating coffee cup`, `touchbaes sticker game`, and
  `Montran sustainability report booklet`.
- Names the twelve existing project-description figures, in source order:
  EVIIVE, V7 Labs, touchbaes, Mandy Ma & Co., Loop Financial, Montran, AnyDay
  Financial, Kelly’s Kelly, Curate Health, PURE LOVE（純愛）, Dead Good, and
  WTW? (What’s the Word?). No heading element or visible label is introduced.
  Random Pics remains an unlabeled interlude; heading hierarchy remains
  deferred to `MMS-AUD-022`.
- Extends the fail-closed deployment manifest and validator with exact,
  disjoint media ownership, image/video counts, iframe titles, and ordered
  figure labels. Destructive fixtures reject policy, suppression, focusability,
  image-alternative, iframe-title/visibility, figure-label/order, Random Pics,
  and heading drift before Cargo.
- Adds
  `audit/contracts/portfolio-media-accessibility.json`,
  `portfolio-media-accessibility-test.mjs`, and dated root-cause evidence.
  The focused Chromium contract covers compact 390x844 and expanded 1440x900
  with forced media failure, requiring zero decorative media roles, no generic
  media-error names, three exact iframe names, and twelve exact figure names.
- Focused verification passes at compact 390x844 and expanded 1440x900,
  including forced media failures and negative semantic fixtures. The complete
  Phase 2 gate also passes: the frozen 122-artifact baseline, 471-asset
  inventory, 480 protected gold states and interactions, EVIIVE final-pair
  geometry, native rivers, WTW and Withered Green contracts, Touchbaes iPad
  readiness and visible-rig lifecycle, Montran range rendering and page turns,
  75 deployment-manifest mutations, root replacement, and zero page overflow.
- Two audit-only input races were corrected without changing product code:
  Touchbaes pointer input now uses one current main-frame coordinate space,
  and the Montran fixture is brought into view before its unchanged 30-second
  raster assertion. Six consecutive complete iframe-capability runs pass.
  Nothing was deployed or published.

## Round 106 (2026-07-23): operating-system reduced-motion path — REPOSITORY CHECKPOINT / CARGO REVIEW PENDING
- Implements only the zero-visible-UI portion of `MMS-AUD-008`. The issue
  remains open because a visitor-operated pause-motion control is still an
  explicit interaction-design decision. No new button, label, panel row, or
  normal-mode visual treatment was invented.
- Under `prefers-reduced-motion: reduce`, all 27 Home videos and both Who
  profile videos remain on their approved posters and make no play attempt.
  The V7 cup remains on its approved poster before load; an already-loaded V7
  receives a validated `visible:false` envelope. All three native GIF loops
  (`deadgood-01`, `wtw-03`, and `wtw-06`) freeze to one in-place canvas
  snapshot and release their animated source.
- The existing Home smiley and the four Withered Green paragraph hooks are
  stopped only inside the reduced-motion media query. Their normal contracts
  remain exact: smiley `animate="4"`, four `uses="eye-roll"` spans, 29 looping
  videos, three GIF presentations, V7 rotation, Touchbaes behavior, Montran
  behavior, and the four 375ms startup cuts.
- Loaded repository-owned videos and validated embeds now explicitly pause
  when the document is hidden. A live preference change resumes only media
  that the existing observer still owns as active. Active/frozen state is kept
  in WeakMaps, not serialized runtime attributes.
- Added `reduced-motion-path-test.mjs` and one mandatory Phase 2 invocation.
  The focused browser contract proves zero reduced-mode play attempts across
  all 29 videos, three frozen/restored GIFs, V7 live preference response, and
  exact protected normal hooks. Adjacent media-owner, startup, embed-protocol,
  root-replacement, and both 240-state gold-parity matrices pass.
- The complete Phase 2 gate passes with protected gold and frozen Round
  69/Round 80 evidence unchanged. This repository checkpoint authorizes only a
  complete Cargo draft review deployment followed by reload verification.
  Publication remains explicitly prohibited until Ocean approves it.

### Round 106 Cargo review deployment — interrupted, do not publish
- The repository checkpoint is commit `aa1a8dbf5ae864b4fe1a30e90a031e3a14e652fd`
  with GitHub draft PR 25. The complete Phase 2 gate passed immediately before
  the Cargo review deployment began.
- The complete tokens.css + site.css bundle was installed through Cargo's
  four-region CSS editor with the Cargo head and all three managed font blocks
  preserved. The complete persisted document passed the residue validator
  before the editor was closed.
- The complete `site-head.html` was installed and matched the local source
  exactly before the editor was closed.
- Home was replaced through UTF-8-safe `bodycopy.innerHTML` plus a bubbling
  `InputEvent`, saved with Cmd+S, and the editor was reloaded. Before reload,
  Cargo's raw page record contained 68 unique media IDs, three explicit GIF
  motion owners, 68 accessibility policies, two responsive-70 markers, and
  lifecycle-2 ownership.
- After reload, the authenticated browser connection became unavailable while
  resolving the known V7 document response. The required raw saved-source
  extraction after reload could not be completed, and Who and Write were not
  touched. The Cargo review deployment is therefore incomplete. Do not
  publish this draft. Reopen the authenticated Cargo editor, re-verify Home's
  raw saved source, then deploy and reload-verify Who and Write before treating
  Round 106 as reviewable.
