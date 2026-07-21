# HANDOFF — mm.s website (for Codex or any successor agent)

Written 2026-07-11 by Claude (Fable 5) at Ocean's request. Everything a new
agent needs to continue this project without the prior chat history.

## Who you work for and how
- Ocean (designer, montran.com email; this is his personal studio project).
- He names work loosely; YOU resolve context and work via ABSOLUTE paths.
- NO EMOJIS anywhere (replies, files, layer names). Plain [DONE]/[WARNING].
- Quote his instructions verbatim when justifying changes (repo hooks may
  demand it — a "Fact-Forcing Gate" intercepts Write/Edit and asks for
  consumers, affected surface, and the user's verbatim instruction).
- Publishing rule updated by Ocean on 2026-07-15: after an implemented Cargo
  batch is reload-verified, deploy and publish by default unless Ocean
  explicitly requests draft-only. Never publish unfinished or unverified work.
- Verify everything you claim: reload-and-reprobe after edits (autosave is
  the save mechanism; persistence is proven ONLY by reload), pixel-check
  images (sample pixels, never trust alpha-channel presence), and prefer
  numeric/DOM evidence over screenshots.

## START HERE (reading order)
1. `~/CLAUDE.md` — top-level index of ALL Ocean's projects (keyword map,
   per-project status lines). Auto-loads for Claude; Codex should read it.
2. `mm.s website/CLAUDE.md` — this project's locked decisions, Figma
   inventory, and dated status entries under "## Open items" (newest first).
3. `mm.s website/cargo/PLAYBOOK.md` — THE operating manual for the Cargo
   editor automation. A standing memory rule says: any cargo.site work
   starts by reading PLAYBOOK.md and following it verbatim.
4. `mm.s website/cargo/DEPLOY.md` — append-only ops log. Every round's
   as-built record, every freight upload hash, every gotcha. Rounds 13-15b
   at the bottom describe the current live-draft state.
5. `mm.s website/docs/plans/` — per-round plan docs (round13, round15,
   type-scale-v2).

## Paths
- Project root: `/Users/oceancheung/Documents/Startup/MM.S/mm.s website/`
- Canonical local Cargo sources are `cargo/tokens.css`, `cargo/site.css`,
  `cargo/panel.js`, the three `*.template.html` files, and the `shared-*.html`
  partials. `cargo/home.html`, `cargo/who.html`, and `cargo/write.html` are
  generated outputs: edit their templates/partials, then run
  `cargo/assemble-named-pages.sh`. The saved/reloaded Cargo editors remain the
  deployed-draft truth; `cargo/DEPLOY.md` records every verified checkpoint.
- Asset sources: `Portfolio assets/_for cargo deployment/<project>/...`
  - Booklet: `Montran/flippable-booklet/` (index.html + build-bundle.py +
    booklet.config.json with the pageImages manifest + vendor pdf.js).
    Build: `python3 build-bundle.py` -> montran-booklet-bundle.html.
  - Sticker game: `touchbaes/sticker game/touchbaes-sticker-game/
    touchbaes-sticker-game.html` (v3 logic: width-only breakpoint, unified
    tweezer-tips hold model, touch-action:none everywhere).
- Claude's memory (facts that survive sessions):
  `~/.claude/projects/-Users-oceancheung-Documents-Startup-MM-S/memory/`
  — MEMORY.md is the index; individual .md files hold single facts
  (no-emojis rule, playbook-first rule, transparent asset URLs, the
  native-picker/AppleScript upload recipe).
- Claude session transcripts: `~/.claude/projects/<slug>/*.jsonl`;
  session summaries: `~/.claude/session-data/`.
- There is NO .claudeignore / .gitignore in this project; it is NOT a git
  repo. The continuity mechanism is CLAUDE.md + DEPLOY.md + PLAYBOOK.md.
- Scratch/temp work: use your own temp dir; prior sessions used
  `/private/tmp/claude-501/...../scratchpad/` (r15/ holds the 71 PDFKit
  page renders + page-hashes.txt + alpha rebuild intermediates).

## The live site
- Cargo editor URL: mmmmm.studio/edit/I2398594830 (the "home v2 test"
  page). Published site: https://mmmmm.studio.
- The page is ONE bodycopy: `.mms` markup + 3 inline scripts (panel.js
  copy, mms-video-autoplay, mms-tweezer-overlay). Site CSS lives in
  Settings -> CSS / HTML (one CodeMirror doc: Cargo boilerplate + font
  faces + tokens + site sections — locate regions by stable CSS
  substrings, never prose).
- 13 bands (eviive, v7, touchbaes, mandy, loop, montran, anyday, kelly,
  curate, randompics, purelove, deadgood, wtw), all with data-band attrs.
- Theme engine: html[data-theme|face|scale|shape]; palette v2 (white,
  girly #FFEEF4/#00CD0A, quirky #553D12/#4DBAFF, contrast #FEFF01/#FF00FF,
  black); Type Scale v2 (S18/M22/L27/XL36); 12-col grid tokens --col-2/4/
  6/8/10 (design col 84/gutter 32; XL col 124; mobile fixed).
- Desc column spans: V7/Loop/DeadGood = col-10, AnyDay = col-8, everything
  else col-6; offsets via data-offset (col-2/col-4 + gutter).
- iOS delivery: all opaque videos are H.264 MP4; the two ALPHA videos
  (8bit-girls, mandy hf) are webm + data-mp4 HEVC-alpha fallback swapped
  by panel.js on iOS/Safari. HARD RULE: never encode alpha HEVC with
  ffmpeg's videotoolbox (it premultiplies the matte against white — the
  "white noise" bug); pipeline is webm -> ProRes 4444 (ffmpeg, decode with
  -c:v libvpx-vp9 BEFORE -i) -> avconvert PresetHEVCHighestQualityWithAlpha.
- The current Montran viewer is direct-PDF v17 at Freight hash
  `U3034412351395654863674388559673`, receiving the uploaded 71-page PDF
  `P3028590574867085520722012452665` via `?pdf=`. It opens on PDF page 19 and
  exposes no visible controls. Expanded mode retains native page fold/click/
  drag behavior; compact mode delegates one-page taps to the parent overlay so
  native river and page scrolling remain available. Older viewer versions are
  superseded.

## Cargo automation (condensed; PLAYBOOK.md is authoritative)
- Drive the editor through a real browser (Ocean parks the tab visible;
  hidden tabs lose rAF and upload placeholder swaps; a LOCKED Mac silently
  reverts bodycopy edits — reload and re-verify if state looks stale).
- Edits = DOM mutation inside the client-side-rendering iframe + dispatch an
  `InputEvent` on the bodycopy, then Cmd+S. Verify persistence by reloading the
  editor and re-reading the bodycopy.
- Site CSS must be edited only in the global Site Settings → CSS / HTML
  CodeMirror document through its CodeMirror API. Never use a page's Code View
  or accessibility `set_value` for global CSS: the former is the wrong editing
  surface and the latter appended rather than replacing during Round 61.
  Preserve Cargo's CSS head and all three managed font blocks, save, reload,
  and re-read the global CodeMirror value.
- Uploads: images/videos (jpg/png/gif/mp4) = synthetic DataTransfer DROP on
  the bodycopy, staggered ~650ms for batches; hashes recovered from
  s3.amazonaws.com/freight.cargocollective.com/<HASH>/<name> performance
  entries; then REMOVE the inserted media-items + input event. html files =
  Images&Files window (MOUNTAINS icon, top-right toolbar group) -> mounts
  input#file -> set .files + fire the REACT onChange via __reactProps (a
  plain change event does nothing); hash appears in
  store.getState().media.data. WEBP IS SILENTLY REJECTED everywhere —
  convert to JPEG first. PDFs also rejected on bodycopy.
- Local-file ingestion into the page: iframe relay — serve files on
  127.0.0.1 (python3 -m http.server 8934), inject a hidden iframe of a
  relay.html that fetches and postMessages ArrayBuffers to window.parent.
- Freight is CORS-clean from the admin page (fetch + canvas pixel work);
  from curl it needs a browser User-Agent + Referer or CloudFront 403s.
- Clicks on editor chrome: computer-tool coords are SCREENSHOT-space
  (~1476 wide) vs CSS space (innerWidth ~2940) — scale = capture/innerW;
  recompute EVERY time (window resizes). When CDP clicks fail, use
  __reactProps onMouseDown/onClick with real-ish event objects, or
  dispatch real MouseEvents on the button element.
- The MCP javascript tool intermittently returns `undefined` even though
  the script RAN — re-probe with a tiny follow-up query; never re-run
  mutations blindly. Long awaits exceed the tool window; poll in
  follow-up calls.
- Figma: file `aaJEv2Z8j6HaegMHou4N09` (web-design) + palette source
  `vH7YGHsIpUpm22AgeivInX`. Page-level metadata reads can HANG — target
  node IDs. Descs have TWO "blurb" text nodes (findAll, never findOne).
  The rework frame 83:251 carries the 12-col layout grid.

## Current state (2026-07-16, Round 69 GOLD STANDARD PUBLISHED)
- Ocean explicitly accepted Round 69 as the MM.S standard gold version. It is
  the visual, interaction, and rollback baseline for all subsequent type-scale
  and spacing refinements. Preserve its exact artifact record in
  `cargo/GOLD-BASELINE.md` and immutable source snapshot in
  `cargo/gold/round-69/`; compare future rounds against them instead of
  overwriting the baseline.
- Round 69 is reload-verified and published on Home, Who, and Write. Runtime is
  `responsive-62`; every persisted active bodycopy contains exactly two current
  markers and no older responsive runtime.
- Every compact iOS Safari edge sampler is top-only, including all four startup
  cuts and intentional palette selections. Never restore a bottom sampler: its
  nominal edge probe was visibly exposed as a full-width lower seam.
- A compact theme choice keeps the control tray open for continued
  experimentation. The dialog itself directly paints the selected page color
  through its lower safe area. Do not restore the removed panel `::before`
  backing or any theme-click auto-close timer.
- Ordinary compact iOS Safari now gives `html` and `body` a real
  `--color-bg-page` canvas behind the otherwise transparent Cargo/page stack.
  This prevents WebKit from blending its top material against a white UA
  fallback on black and colored themes while preserving real edge-to-edge page
  and imagery painting. Keep wrappers and sticky surfaces transparent; do not
  replace this with `theme-color`, Apple standalone metadata, or a fixed plate.
- Compact Write uses one continuous `.mms-writing` page-color surface at
  z-index 20. Its sticky links remain usable at the opening and are covered
  continuously after the first poem passes, including every later poem gap.
- Compact iOS Safari startup uses a fresh disposable top fixed edge sampler for
  each of the four 375ms hard cuts. It sits at z-index 0 behind the complete
  `.mms` root at z-index 1, uses the cut's exact theme color, and is removed
  entirely at landing. Permanent sticky navigation, introduction, page
  wrappers, `html`, and `body` remain transparent so real content continues
  edge-to-edge through the browser-owned material after startup.
- Cargo CSS is split locally across `tokens.css` and `site.css`. The current
  persisted document contains both, plus the preserved Cargo-managed font
  region. Always use `cargo/compose-css-bundle.sh`; sending `site.css` alone
  removes every responsive variable and breaks the complete site. Round 41b
  records the recovered incident and actual Cargo matrix.
- Figma Type Scale now exposes only Medium/Small/Large/XL. It contains 15
  hidden Desktop primitives and 15 hidden Mobile primitives. Fifteen semantic
  `Space/type/*` variables select Mobile values in Space/Mobile and Desktop
  values in all three expanded Space modes. Mobile serif
  body/caption/heading endpoints remain 17/16/32, 20/17/38, 24/20/45, and
  30/25/56. Serif, Sans, and Mono mobile caption leading is 17/18/21/27;
  Gothic uses 16/17/20/25. All six local text styles are rebound through the
  semantic aliases.
- Figma component `1:2899` remains the single compact control-panel reference.
  Its current Medium source reference is 390x178 with no title row, 24/36/42px
  optical rows, 16px gaps, and 22px top/bottom composition padding. Typeface
  label padding pairs are Serif 4/4, Sans 3/5, Mono 4/4, and Gothic 6/2.
  Fresh compact and expanded sessions both start Medium; saved choices persist.
- Compact uses one composition in every orientation: full-width through 430px;
  a 390px bottom-right sheet with 16px right inset at 431–759px; and a 390px
  bottom-right sheet with 24px right/bottom insets at 760–1023px. There is no
  landscape-specific panel. Expanded mode restores the original left rail at
  1024px and above.
- The compact header uses plus when closed and the theme-aware inverse close
  tile when open. It has a real 44x44 target, scale-aware 22/24/26/28px optical
  artwork, and a 12px visible clock-to-icon gap. There is no close control
  inside the tray. The runtime guard must compare both `responsive-62` and
  `window.__mmsPanelRoot`; Cargo can
  replace `.mms` without replacing the iframe window.
- An intentional outside tap closes the open compact tray; a background scroll
  gesture stays native and leaves it open. Theme, face, scale, and shape changes
  and all other inside clicks keep the tray open.
- Montran is the only shape-responsive interactive embed. Its parent
  `.mms-booklet-shell` owns straight/rounded/oval clipping; V7 and Touchbaes
  remain rectangular. On compact screens, a stationary primary pointerup within
  8px and 500ms sends one previous/next command, with a 700ms turn lock and
  450ms delayed-click suppression. Moved/cancelled gestures remain native river
  or page scrolling, and the center 8% binding zone is inert.
- Home page Code View CSS must contain only the 79-byte canonical-owner comment.
  A stale full-site mirror there overrode the global stylesheet until Round 69.
  Global Site Settings CSS is the sole active site stylesheet; Who and Write do
  not carry the duplicate.
- The Round 46 full-bleed contract is real scrolling content, not a synthetic
  color plate: early `viewport-fit=cover`, transparent html/body/Cargo wrappers,
  no browser-color metas, and no positioned edge canvas or compositor surface.
  Compact river insets are scrollable flex spacers rather than permanent
  padding, so media reaches the physical viewport edges while scrolling.
  `cargo/site-head.html` removes late chrome-color meta insertions from the
  existing body runtime. Normal Safari status and URL controls remain
  browser-owned; physical iPhone Safari is still required to verify their
  translucent material.
- Compact rivers must keep `pointer-events:auto`, `overflow-x:auto`,
  `-webkit-overflow-scrolling:touch`, and `touch-action:pan-x pan-y` on the
  scroller itself. Do not restore the Round 41 `pointer-events:none` rule; it
  prevented native iOS horizontal gestures.
- Rounded/oval gaps use the trusted-click forwarder carried into
  `responsive-53`. It acts
  only after a completed tap inside the header action's 44px target, rejects
  points inside visible media silhouettes, and never handles pointer/touch
  start or movement. It tests the explicit `.mms-frame` silhouettes and direct
  interactive embeds. Do not replace it with river `pointer-events:none`.
- The compact first row explicitly pins `.mms-scale` to grid column 1 and
  `.row.dots` to column 2, both at `grid-row:1; order:1`. Do not remove these
  declarations; the inherited desktop ordering otherwise hides the slider
  behind the typeface row.
- The compact slider carries 4px inline padding. Slider and palette must remain
  equal columns at every compact width; never restore the obsolete below-360px
  56/44 split. The five 24px palette marks distribute across the complete
  palette span with equal visible gaps and align to the two lower buttons.
- Startup uses four unique 375ms hard cuts plus the exact saved/default landing
  state: five visual states over 1.5 seconds. There is no saved/default pre-roll
  or crossfade. Motion initializes concurrently and moving media retain poster
  fallbacks.
- Explicit compact profiles are authoritative: Loop's first image is
  `loop-cover` at 110vw, Mandy's second alpha video is 150vw, and Montran is
  `booklet-wide` at 150vw.
- Current embeds: V7 cup `Z3031274916472238420423367767865`; Touchbaes v10
  `E3031754669080377521238157342521`; Montran viewer v17
  `U3034412351395654863674388559673`. Touchbaes reports one stable compact
  envelope. Montran compact gives swipe/drag ownership to the native outer
  river and turns one spread only after a stationary side tap; the center 8%
  is inert. Expanded Montran keeps native StPageFlip interaction.
- Compact Kelly order is 3, 2, 1, 4, with the caption beneath the first visible
  item (image 3). Expanded remains the original two-by-two source order.
- Final verified geometry: compact 390x844 panel is body-portaled at x0/bottom0,
  390x179, Medium, and zero overflow; expanded fine-pointer geometry is
  142.22x220.25 at 1024, 200x248 at 1440, and capped at 250x310 from 1800
  through 2940. Coarse-pointer expanded controls retain 44px targets.
- Expanded control-panel order is palette, scale, typeface, shape. Fine-pointer
  rows use the Figma 20/24/32/36 optical geometry, equal outer padding and
  group gaps, and a 2x2 typeface grid. The scale row is second and has a
  4-design-unit inline inset, matching Figma component `1:1039` at 200x232.
- Figma frame `591:409`, `home / mobile — iOS Safari safe-area reference`,
  documents Safari-owned material, unsafe visual bleed, and safe interactive
  padding without replacing the production mobile frames.
- `#mms-edge-canvas` is legacy runtime output only. It must have no fixed
  positioning, paint, or nonzero height. Do not restore the Round 44 fixed
  edge-color layer or `refreshIOSChrome()` compositor model.
- The introduction now has one `col/6` width contract and no inline override;
  it measures exactly 664px at the 1440 reference. All 12 Figma project years
  are present. The inline intro plus exists only below 1024px.
- Media shape is owned by 65 `.mms-frame` wrappers, never by their replaced
  image/video children. The 68 unique media IDs are classified as 59 crop, six
  artwork, and three interactive, with fit policies 64 contain, one cover, and
  three none. V7, Touchbaes, and Montran remain direct rectangular unclipped
  iframe children. Straight/rounded/oval clip only the wrapper as
  none/inset-24/ellipse; child clip remains none.
- Figma Serif variable `51:270`, mode `51:0`, is restored to
  `Times New Roman` and cloud readback verified that exact value. Frames
  `502:466` and `532:1208` are now named `who / desktop` and
  `write / desktop`; there is no outstanding Tinos or frame-name warning.
- Round 55's shared-shell, build, and live Cargo checks are closed. An optional
  higher-resolution Montran source-PDF swap remains asset-dependent and does
  not authorize publication.

## Round 55 published checkpoint
- Home, Who, and Write now assemble from canonical early-init, mobile-header,
  navigation, desktop-clock, panel, and panel-runtime sources. The canonical
  panel is `shared-panel.html`; the root marker is `data-mms-site`; and rail
  z-index 30 is CSS-owned with no inline/runtime mutation. Home-only media and
  tweezer extras remain Home-only.
- `cargo/assemble-pages.py` is a transactionally staged, `fcntl`-locked
  three-page build. It validates all staged outputs before committing,
  revalidates after commit, rolls back committed files after failure, and
  normalizes generated bodycopies to mode 0644. Rollback and concurrent-build
  probes passed. Edit templates and shared partials, not generated bodycopies.
- `cargo/assemble-test.sh canonical` refreshes all three standalone mirrors;
  `validate-test-mirrors.py` proves them byte-for-byte against tokens, CSS,
  and bodycopy sources. Repeated `canonical` and `all` runs are idempotent.
- The Cargo draft was saved, reloaded, and re-read. Persisted CSS is 76,612
  bytes, SHA-256
  `3b169e1f3fde3a1ae2420997a5c43a0ecdf45b8d99af9cf9f69bf351ec9f3b84`.
  Reloaded bodycopy lengths are Home 98,368, Who 41,145, and Write 39,756;
  each has one root, two `responsive-52` markers, and two correct current-page
  links. Home has 13 bands/27 videos, Who has two people/two intro instances,
  and Write has five pieces.
- Live 729px compact Home measures header `[0,0,729,56]`, links
  `[0,56,729,178]`, and `--bar-h:234px`; sticky surfaces are transparent,
  overflow is zero, and the river is native `auto`/`pan-x pan-y` with
  729/3902 client/scroll widths. Live 2900px expanded Home retains rail 340,
  clock right 50, panel x50/250x310/bottom50, CSS rail z-index 30, and zero
  overflow. Local settled 390px and 1440px parity passes on all three pages.
- Figma Serif `51:270` / `51:0` reads `Times New Roman`; desktop frames are
  `who / desktop` (`502:466`) and `write / desktop` (`532:1208`). Compact Who
  and Write screenshots are both 350x186px and visually match Home.
- Generated SHA-256 values: Home
  `f029be2ac69ee92213d14dd214b25c0b45d89a2d6184fee145f01e98a8d11ec3`,
  Who `4438d77baabf5dc16051bf28f9928df7a007233c9cc58869a497a92c8d3ebb6c`,
  Write `6595c756be6d552bae93eb1ddec7439b784af74bb92395803ac7a5eaf3064e58`.
  Round 55 was published at 15:31 EDT after Ocean's explicit authorization.
- Public Home, Who, and Write were independently checked at 1440x900 and
  390x844. All have one root, two active-body `responsive-52` markers,
  `data-mms-site="1"`, no `data-mms-home`, two correct current links, and zero
  overflow. Home has 13 bands/27 videos and native compact rivers; Who has both
  people and two ready, muted autoplay videos; Write has all five pieces.

## Round 54 draft checkpoint
- At this historical checkpoint the public site was Round 53 and Round 54 was
  saved only in the Cargo draft. Round 55a later superseded this publication
  state.
- Compact Home, Who, and Write now share one measured sticky navigation
  contract. At the default 390px reference all three measure a 56px header,
  links at y56 with 178px height, first link at y80, 24px/16px vertical
  padding, and `--bar-h: 234px`. The former named-page 13px/11px relative-link
  override is gone.
- Who has two responsive intro instances with mutually exclusive display: the
  original expanded intro and a compact intro inside
  `.mms-who-ocean-stage`. The compact stage contains only the intro and Ocean,
  so native sticky containment releases the intro at Ocean's bottom before
  Alvis. Do not replace this with a scroll flag or move Alvis into the stage.
- Compact founder and writing surfaces paint at z-index 20 above sticky links
  z10 and the Who intro z1. The structural wrappers have no z-index, transform,
  containment, or clipped overflow. This preserves WebKit sticky behavior and
  the transparent Safari edge contract.
- Expanded `.mms-who-ocean-stage` must remain `display: contents`; it preserves
  the existing two-column Ocean/Alvis grid. Compact stage must remain a real
  `position: relative; overflow: visible` containing block.
- Reloaded persisted CSS is 76,425 bytes with SHA-256
  `521608069f5630d8eca0c2b95b42c4b120975e09ecdf6df35a4eb598252d01b5`.
  Reloaded Who bodycopy is 41,162 characters with one stage, one compact intro,
  one expanded intro, one root, and two `responsive-52` markers. Write bodycopy
  is unchanged; the shared CSS supplies its sticky behavior.
- Local 320/390/430/768/1023 and expanded 1024/1440/1920 matrices have zero
  horizontal overflow. Cargo compact proof at 729px and expanded Home proof at
  2900px also pass. Runtime remains `responsive-52`.

## Round 53 deployed checkpoint
- Figma Who mobile `638:432` and Write mobile `640:448` now carry the real
  `grid/mobile` system: six stretch columns, 16px gutters, 20px margins, and
  24px baseline rows. Both use Space/Mobile and Type Scale/Medium; `col/6` is
  350px at the 390px reference.
- Cargo uses compact grid variables for the full named-page measure while
  retaining the art direction inside it. Who portraits scale from 176px to a
  200px cap and both are left-aligned. Write uses responsive width ratios of
  90.2857%, 68.5714%, 100%, 100%, and 80%, capped at 316/316/432/664/432px.
  The 390px results are 316/239.98/350/350/280px; the Who portrait is
  199.98x237.25px.
- Clean Cargo page IDs are Who `B2402536676` and Write `P0060651058`. Their
  complete UTF-8 bodycopies were saved and reload-verified: Who has two
  founders and two working Freight videos; Write has five writing pieces.
  The clean Home bodycopy was also restored after uploads and contains no
  profile-media debris.
- Reloaded persisted CSS is 75,160 characters with one token/layout region,
  one each of the managed Mono/Sans/Gothic regions, two layout-unit
  definitions, one compact-grid contract, balanced 457/457 braces, a
  197-character maximum line, and no Base64 or transfer/runtime residue. The
  complete local bundle SHA-256 is
  `9673926131f31fa14a7bd913aa0a2654dbc561f15c648bfc2a0f0c66e5e8feb8`.
- The exact local 320/390/430/768/1023/1024/1440 matrix has zero page-level
  overflow. Both videos reached readyState 4, played muted, and reported no
  error. Expanded layout from 1024px upward remains unchanged.
- Published public proof: Home, Who, and Write all load from the clean routes;
  public HTML contains `responsive-52` and no `responsive-34`. At 390px Home,
  Who, and Write each have zero page-level overflow; both Who videos are
  readyState 4, playing muted, and error-free. Home retains native `auto`
  rivers with `pan-x pan-y`. At 1440px Home retains the expanded rail and
  sticky panel with zero overflow.

## Round 46 deployed checkpoint
- Safari 26's remaining yellow toolbar sample was traced to the compact sticky
  links and sticky introduction, which still carried `--color-bg-page` during
  the startup cuts. The deployed CSS makes both transparent without changing
  their sticky geometry. `responsive-48` also holds the first iOS Safari cut
  for two painted frames plus 180ms so the final/default surface wins initial
  sampling.
- Cargo was reloaded after the complete CSS/head/bodycopy deployment. Proof:
  one `.mms` root, `responsive-48` twice and no `responsive-46`, runtime
  `responsive-48`, `viewport-fit=cover`, no browser-color or Apple standalone/
  status metas, transparent root/Cargo ancestors, native 390px river scrolling
  (`auto`, `pan-x pan-y`, pointer events enabled), and zero page overflow.
  Expanded mode retained its prior geometry.
- This proves the Cargo draft persisted, not the physical Safari toolbar
  outcome. A real iPhone Safari test is still required before describing the
  top or bottom browser material as fixed.

## Round 47 deployed checkpoint
- Cargo was reloaded after the complete responsive-49 deployment. Persisted
  bodycopy contains one MM.S root, two `responsive-49` markers, no
  `responsive-48`, live runtime 49, and exactly 12 project-year labels.
- Reloaded CodeMirror CSS is 65,159 characters and retains one token region,
  one layout region, one each of the managed Mono/Sans/Gothic blocks, one
  panel-control contract, and the `col/6` introduction rule.
- Live 1440px proof measured the introduction at 664px and the fine-pointer
  panel at x40/200x232px; the compact plus was absent and page overflow was
  zero. Live 390px proof measured caption leading at 17/18/21/27px, panel
  390x179px, compact plus visible, compact copy visible, desktop copy hidden,
  transparent sticky links/introduction, native `auto`/`pan-x pan-y` rivers,
  enabled pointer events, and zero page overflow.
- Figma sources are documented at panel nodes `1:1039` (200x232 expanded) and
  `1:2899` (390x178 compact). The type variable and Mandy Ma binding sync are
  complete. This remains DRAFT ONLY and was never published.

## Round 50 deployed checkpoint
- The complete Cargo editor was reloaded after deployment. Persisted bodycopy
  contains two `responsive-50` markers, no `responsive-49`, live runtime 50,
  68 unique media IDs, 65 frame wrappers, policy counts 59 crop/six artwork/
  three interactive, and fit counts 64 contain/one cover/three none.
- V7, Touchbaes, and Montran are the three direct interactive iframe children;
  they remain rectangular and unclipped. Shape probes returned frame clips
  none/inset-24/ellipse for straight/rounded/oval while every replaced child
  retained no clip.
- Reloaded CodeMirror CSS is exactly 65,747 characters with one token marker,
  one layout marker, one shape-policy marker, and balanced 406/406 braces.
- Live 390px proof retained 13 rivers, 12 native horizontal scrollers,
  `pan-x pan-y`, pointer events enabled, zero page overflow, compact plus, and
  17/18/21/27px caption leading. Live 1440px proof retained the 664px intro,
  200x232px panel, hidden compact plus, Kelly's 2x2 523.4x380.2px grid, and
  zero page overflow.
- This remains DRAFT ONLY and was never published. Physical iPhone Safari
  toolbar behavior was not re-tested by Codex and remains an explicit release
  gate.

## Round 51 deployed checkpoint
- Cargo was reloaded after the complete responsive-51 deployment. Persisted
  bodycopy contains one MM.S root, two `responsive-51` markers, no
  `responsive-50`, and live runtime 51. The public site remains
  `responsive-34`.
- Startup now paints preview one synchronously, keeps five equal 260ms hard
  cuts, and restores the saved/default state at 1300ms. The removed pre-roll
  was the apparent sixth visual. Do not restore the iOS two-frame + 180ms hold,
  add transitions, or reintroduce browser-color metadata.
- The compact inline plus is face-aware and uses measured optical shifts:
  Serif 0.092em, Sans -0.005em, Mono 0.128em, and Gothic 0.08em. Cargo Medium
  Serif measured a required 1.836px versus the applied 1.84px.
- The compact trigger retains a 44x44px target while its square/glyph pairs are
  S 22/17, M 24/20, L 26/24, and XL 28/28px. Cargo's later button font cascade
  requires the menu font and SVG dimensions to remain `!important`; without
  those pins, XL becomes a 30px SVG inside a 28px square. Reloaded Cargo
  measured the fixed XL square and glyph at 28x28px with zero center offset.
- Persisted CSS readback is 68,384 characters, one token/layout/managed region,
  two `--layout-u` definitions, three icon pins, and balanced 409/409 braces.
  Compact reload proof retained transparent root/sticky/Cargo surfaces, no
  browser-color or Apple metas, `viewport-fit=cover`, native auto/pan-x pan-y
  rivers, and zero page overflow. Expanded mode retained Medium Serif and zero
  page overflow.
- DRAFT ONLY and never published. A physical iPhone refresh remains required
  to confirm that Safari's translucent material follows each preview surface;
  Cargo and WebKit automation cannot prove browser-owned chrome.

## Round 52 deployed checkpoint
- Cargo was reloaded after the complete `responsive-52` deployment. Persisted
  bodycopy contains two current markers, no `responsive-51`, one four-preview
  constant, one 260ms hold constant, and all 12 project taglines. The live
  runtime reports `responsive-52`; the public site remains `responsive-34`.
- Startup is now four 260ms hard-cut previews plus the exact saved/default
  landing state at 1040ms. Preview themes exclude the landing theme, all four
  faces and scales appear exactly once, and all three shapes appear with one
  non-adjacent repeat. Transitions remain `0s` and visitor settings are
  restored exactly.
- Expanded panel padding is 24 design units vertically and 16 horizontally.
  Keep the `.mms dialog.mms-panel` qualifier on both expanded padding rules:
  Cargo's editor preview retains a later compiled copy of the former CSS, and
  the extra specificity is required for the current draft rule to win there.
  Reloaded 1440px proof is x40/200x248px with 23/15px computed padding plus the
  1px border and zero page overflow.
- Persisted CSS is 68,946 characters with one token/layout region, all three
  managed font regions, two qualified panel rules, and balanced 409/409
  braces. Compact reload proof remains transparent, metadata-clean,
  `viewport-fit=cover`, natively scrollable with `pan-x pan-y`, and free of
  page-level horizontal overflow.
- Physical iPhone Safari still displays white browser-owned material during
  the rapid runtime background cuts. Do not reintroduce `theme-color`, opaque
  sticky edges, fixed color plates, or compositor tricks: they can retain an
  arbitrary preview color and regress the approved transparent/full-bleed
  landing. Exact per-cut toolbar resampling remains a WebKit limitation.
- Round 52a updated both desktop and compact Email anchors to
  `mailto:ocean@mmmmm.studio,alvis@mmmmm.studio`. The complete bodycopy was
  saved and reloaded; proof found two dual-recipient links, no old
  single-recipient link, and live runtime `responsive-52`.
- Round 52b removed an accidental 1,858-character Base64 transfer fragment
  appended to Cargo CSS line 69 in the preserved boilerplate head. The clean
  four-region stylesheet was saved and reload-verified at 67,089 characters:
  line 69 is `border: 0;`, token/layout hashes match the local files, braces
  are 409/409, and there are zero Base64 runs, overlong CSS lines, HTML tags,
  or transfer-runtime strings. Expanded mode retained grid/panel geometry and
  zero overflow; a live 390px probe retained block mode, native `auto` river
  scrolling, `pan-x pan-y`, and zero overflow. The stylesheet content and
  runtime remain otherwise unchanged at `responsive-52`.
- Round 52c independently re-read the live CSS and confirmed line 69 is still
  exactly `border: 0;`. Persisted CSS is 67,133 bytes, SHA-256
  `e66c21b26f8e22c6f6cd38194589825b6f27b3fd42b567d1495873f9739de5bb`,
  balanced 409/409, and clean of Base64, overlong lines, transfer/runtime
  residue, and mojibake. The audit also removed stray `er` from EVIIVE's first
  video and serialized Touchbaes rig coordinates from the local and Cargo
  bodycopy. Reloaded bodycopy has one root, two `responsive-52` markers, and
  none of those residues. Cargo's serializer re-adds five lowercase `viewbox`
  aliases to inline SVGs; local `home.html` retains only canonical `viewBox`.
- Cargo's Site Settings HTML now matches `site-head.html` byte-for-byte with
  exactly one edge-head marker 48 and no marker 47. Use
  `validate-cargo-payload.sh` for all future CSS, persisted-CSS, bodycopy, and
  head preflights; the composer and local test assembler now invoke it.
- DRAFT ONLY and never published.

## Historical state (2026-07-11 ~02:10)
- All of Ocean's Round-13..15b items are implemented and reload-verified:
  palette v2, texts, geometry, hovers, iOS video delivery, booklet v11
  direct-PDF (page 19 default; centered; zero controls), game v3 touch model,
  kelly manicule, desc column spans,
  caption plates (montran/kelly/randompics = bg/page), intro/clock top
  alignment at 40, per-face slider glyph centering, thumb shadow off,
  native horizontal river overflow (Round 15e removed all snap and wheel
  interception after the snap implementation proved stuttery),
  .mms-img background transparent (the theme-colored hairline fix).
- AWAITING OCEAN: iPad re-test of the booklet (v11) + sticker game (v3) +
  the 8bit-girls alpha (new HEVC pair) IN THE DRAFT; then cmd+P. Note he
  sometimes reviews the PUBLISHED site — "yellow theme / white picker dot"
  symptoms mean he's on the published R12-era build, not the draft.
- Files-library cleanup (manual, Ocean): old booklet bundles v1-v7 + the
  19.8MB pdf, game v1/v2, superseded hevc pair + purelove-4.jpg + items in
  DEPLOY.md R11/R13/R14/R15 lists.
- Open design questions: Figma url rows still placeholder (only EVIIVE has
  a live url); possible JS wheel-hijack for STRICT one-image-per-wheel-tick
  scrolling (offered, not built); montran caption plate width 700 vs live
  526 (visually identical today, revisit if plates get a non-bg color).
  Description frames match the 1440 Figma grid exactly; the Cargo-only XL
  token jump at 1800 causes abrupt wider measures and 80px overflow until the
  viewport reaches 1880. Ocean asked for proposals before changing this CSS.

## Working style that kept this project healthy
- Plan first for multi-item requests (docs/plans/YYYY-MM-DD-*.md), execute
  phase by phase, verify each phase, then write the as-built into
  DEPLOY.md and refresh both CLAUDE.md status lines before ending.
- Root-cause before fixing (the repo's debugging discipline): reproduce,
  gather numeric evidence (pixel sampling, AVFoundation decode, TextMetrics
  math, curl header probes), THEN change code. Symptom patches have
  repeatedly been wrong here (letterbox vs placeholder-bg vs in-asset
  edges were three different hairline causes).

## Current handoff — Round 56 responsive-53 draft
- Round 56 is saved and reload-verified in Cargo as a draft. Round 55 remains
  public; do not publish Round 56 without a new explicit instruction from
  Ocean.
- Home, Who, and Write now use `responsive-53`. Each reloaded bodycopy has one
  MM.S root, exactly two current markers, and no `responsive-52`. Home's
  Montran iframe points once to
  `U3034412351395654863674388559673/montran-booklet-direct-pdf-v17.html`
  and contains no v16 URL.
- Startup is exactly four hard-cut randomized previews at 500ms each, with the
  first cut applied before normal markup and the saved/default landing restored
  at two seconds. On iOS Safari, the existing sticky header temporarily carries
  the cut color; it and the other sticky surfaces return to transparent after
  restoration. Do not add a fifth cut, white pre-roll, theme-color metadata,
  crossfade, or synthetic fixed edge canvas.
- Gothic caption leading is deliberately independent from Gothic body leading:
  Desktop S/M/L/XL = 15/18/22/30px and Mobile = 16/17/20/25px. Keep the
  `html[data-face="gothic"]` caption-leading override; its extra specificity is
  required because Cargo appends a later page-local clone of the previous token
  sheet. Reloaded Medium proof is 18px expanded and 17px compact.
- Montran v17 makes the compact iframe pointer-inert and gives its parent a
  46/8/46 transparent gesture overlay. Swipes and horizontal wheel gestures
  therefore move the native river; the center 8% does nothing; a stationary
  side tap posts exactly one validated direction command under a 700ms lock.
  Desktop fold/click/drag behavior remains native. Live Cargo received the v17
  ready handshake and a real wheel over the booklet moved the river 0 to 320.
- Touchbaes image 3 uses a high-specificity left-edge cover crop to remove the
  source seam. Kelly is still 2x2 expanded and 3/2/1/4 compact; its caption is
  under item 3, fully visible, and separated by a 12px page-color gap.
- Figma additions: `676:351` desktop Gothic caption leading, `676:352` mobile,
  `676:353` contextual alias, `676:354` Typeface caption-leading selector, and
  `676:355` header control top alignment. Caption styles and Home/Who/Write
  compact toggle targets were rebound and read back.
- Final persisted CSS is 80,787 bytes, SHA-256
  `9bf5f481bde55e1a78a0c4216f1e66b54ae75827f85bf4c6378fed6197d0db9b`.
  It preserves Cargo's head and all three managed font regions and passes the
  complete persisted-CSS validator. The complete local bundle SHA-256 is
  `140b2e694572af2570046c348ad876fd503a55b287c8e0296075d1fd7a6262ae`.
- Reloaded bodycopy lengths: Home 107,510; Who 50,255; Write 48,866. Expanded
  Home/Who/Write at 2900px and compact Home at 729px all have zero page-level
  overflow. Compact rivers remain `overflow-x:auto` with `pan-x pan-y`.

## Current handoff — Round 57 responsive-54 editorial refinement
- Round 57 is saved and reload-verified in the Cargo draft. Round 55 remains
  public; never publish Round 57 without a fresh explicit instruction from
  Ocean.
- Home, Who, and Write now use `responsive-54`. The startup controller has four
  hard-cut preview states at 375ms each, then restores the exact saved/default
  state. This is five visual designs total and 1,500ms of preview time, not five
  preview cuts plus a sixth landing.
- Keep the existing Safari full-bleed edge treatment. A normal iOS Safari tab
  has no page API that can synchronously set status-bar and URL-bar material on
  every rapid cut. Do not add `theme-color`, Apple standalone status metadata,
  fixed edge plates, or compositor tricks; WebKit may visually lag a cut, but
  the approved transparent/content-through landing remains intact.
- Latest Figma spacing contracts: compact Who has 64px from the last intro line
  to Ocean media and 32px between founders; compact Write has 32px between all
  five pieces, 0px title-to-author, and 8px author-to-copy; expanded Write has
  64 design units between its four rows at 1440px. Figma Write nodes
  `I532:1219;142:381` and `I532:1744;142:381` are now bound to semantic
  `text/primary` variable `5:3` instead of literal black.
- Cargo explicitly binds named-page `h1` color to
  `var(--color-text-primary)`. Reloaded theme checks passed all five themes,
  including Cargo's later global black `h1` rule.
- Reloaded Cargo CSS is 80,915 characters, SHA-256
  `f739e6146007a7177a0f3a722e3dda50d6254f34457781f5ec7fac0acfcaef64`.
  It preserves the head and all three managed font regions and passes the full
  residue/brace/marker audit. Reloaded bodycopy lengths are Home 107,934, Who
  50,255, and Write 48,866; each has one root, two `responsive-54` markers, no
  `responsive-53`, and zero page-level overflow.
- Live compact Cargo proof at 729px: Home rivers remain native
  `overflow-x:auto`/`pan-x pan-y`; Who is 64/32px; Write is 32/0/8px. Local
  1440px proof gives expanded Write 64px row gaps and Who 192px
  intro-to-founders. The Dia editor was returned to expanded mode after the
  compact probes.

## Current handoff — Round 58 Write typography and Kelly descender fix
- Round 58 is saved and reload-verified in the Cargo draft. Round 55 remains
  public; never publish Round 58 without fresh explicit authorization from
  Ocean. Runtime remains `responsive-54`.
- Write article copy uses the responsive base size/leading, author labels
  remain caption-sized, Withered green's paragraph rhythm follows base
  leading, and compact title-to-author spacing is 8px. The complete CSS
  deployment kept Home and Who typography unchanged.
- Compact Kelly now uses
  `.mms [data-slot="kelly-caption"] { padding-bottom:max(6px, 0.25em) !important; }`.
  The extra specificity defeats Cargo's later
  `.mms * { padding:0 !important; }` clone, while the reserve keeps the final
  Sans descender clear of the river's `overflow-y:hidden` boundary. Preserve
  the 3/2/1/4 order, 12px filled gap, and native river scrolling.
- Reloaded persisted CSS is 81,419 bytes, SHA-256
  `f2f12e04240e1118380519c132f8d5d50ebc03fde31347946fab5708a6586ca8`;
  the local complete bundle is 73,929 bytes, SHA-256
  `478a6426569c67856dd9c9a57de62a385d158465b097210b52c8b0e3f6666ba1`.

## Current handoff — Round 59 compact panel fail-open fix
- Round 59 is deployed and reload-verified in the Cargo draft only. Round 55
  remains public. Runtime stays `responsive-54`; never publish without fresh
  explicit authorization from Ocean.
- Keep the compact visibility selector as
  `html[data-panel="open"] dialog.mms-panel[open]`. The shared dialog retains
  native `open` for the expanded rail's immediate paint, but that attribute
  alone must never expose the compact tray. Cargo can rehydrate bodycopy before
  its inserted runtime executes, which is why the former bare `[open]` selector
  appeared as a panel the visitor had not opened.
- Local proof passes closed/user-open/user-closed at 390px and the 1023/1024px
  transition; desktop 1440px remains open, rivers remain native
  `overflow-x:auto` / `pan-x pan-y`, and page overflow is zero. Reloaded Cargo
  compact preview contains the `open site controls` trigger and no MM.S panel
  controls before activation.
- Reloaded persisted CSS is 81,667 bytes, SHA-256
  `aa90a3a953d654e3142b59ffa7435b0cde0aec41243f831a4d7ee2024a255e08`;
  the local complete bundle is 74,177 bytes, SHA-256
  `a0de25e79c9a6d1ef67c9dea962a5e177e33dfd8b9f75ea7d56dec1a8b4e17bb`.
  All Cargo-managed regions survived and the complete validator passes.
- Cargo's floating `Mobile Settings` box belongs to the editor UI. It is not
  the MM.S control panel and will never appear on the site itself.

## Current handoff — Round 60 iOS Safari status-bar edge state
- Round 60 is deployed, reload-verified, and published. Home, Who, and
  Write use `responsive-55`; every reloaded bodycopy has one MM.S root, exactly
  two `responsive-55` markers, and no `responsive-54`.
- The iOS Safari compact header has an explicit `top` / `scrolled` / `pulse`
  contract. Top is solid in the selected theme, vertical scrolling makes the
  row transparent, a deliberate scrolled theme selection pulses solid for
  180ms, and returning to top restores solid. Horizontal river motion does not
  change edge state. Reduced motion skips the pulse.
- Startup remains four hard 375ms previews plus the restored landing state:
  five visual designs over 1,500ms, with no fade or extra cut.
- The exact reloaded persisted stylesheet is 82,127 characters, SHA-256
  `74cad2dd616a6e63f8aec53eecb24f00f9f9bb21ea1bb8092ba71c4434af8195`.
  Cargo's CSS head and all three managed font blocks survived unchanged.
- The exact reloaded site HTML is 1,310 bytes, SHA-256
  `3dd9eb35e887dca145adac0d796d629ff3894fdaba7ee444c2e15373fcfdb204`.
  It uses edge-head marker 49, scopes `/`, `/who`, `/write`, and Cargo preview,
  establishes `viewport-fit=cover`, and removes browser-color and Apple
  standalone/status metas.
- Reloaded Cargo compact mode has transparent html/body/page wrappers,
  transparent sticky link/introduction surfaces, native `overflow-x:auto`
  rivers with `pan-x pan-y`, and zero page overflow. Expanded mode at 2,900px
  retains the intended rail/panel geometry and zero overflow.
- Ocean manually published the Round 59 draft before Round 60, then explicitly
  confirmed publication of Round 60. Cargo completed at 09:41 EDT and reported
  `Site is up to date`.
- Public `/`, `/who`, and `/write` are independently verified at
  `responsive-55` with no `responsive-54`, head marker 49, no browser-color or
  Apple standalone/status metas, and zero page overflow. Public 390x844 proof
  passes solid top, transparent scrolled, approximately 180ms theme pulse,
  horizontal-river isolation, and return-to-top restoration. Public 1280x720
  expanded Home retains its rail/panel/grid geometry. ROUND 60 IS PUBLISHED.

## Current handoff — Round 61 transparent iOS Safari edge restoration
- Round 61 is deployed, reload-verified, and published. Home, Who, and Write
  use `responsive-56`; each persisted bodycopy has one MM.S root, exactly two
  current markers, and no `responsive-55`.
- Round 60's `top` / `scrolled` / `pulse` sticky edge painter was removed
  completely. Do not restore opaque edge-adjacent sticky backgrounds, preview
  edge attributes, theme pulses, fixed color plates, or compositor tricks.
- `.mbar-row`, compact navigation, compact introduction, `html`, `body`, and
  Cargo wrappers remain transparent. Marker 49 and `viewport-fit=cover`
  remain; browser-color and Apple standalone/status metadata remain absent.
- Startup remains four 375ms hard cuts plus the restored landing state.
  Compact rivers retain native `overflow-x:auto` and `pan-x pan-y`; page-level
  horizontal overflow remains zero. Expanded rail, panel, and content geometry
  are unchanged.
- Global CSS changes must use Site Settings → CSS / HTML and the global
  CodeMirror API. Page Code View is not the global stylesheet, and
  accessibility `set_value` did not replace the CodeMirror document reliably.

## Current handoff — Round 62 disposable startup edge samplers
- Round 62 was deployed, reload-verified, and published at 12:28 EDT. Public
  Home, Who, and Write all use `responsive-57`; `responsive-56` is absent.
- Home, Who, and Write use `responsive-57`. Each reloaded bodycopy contains one
  MM.S root, exactly two `responsive-57` markers, and no `responsive-56`.
  The shared early initializer has a global `edge-preview-v2` sentinel so a
  Cargo duplicate insertion cannot start a second, interleaved preview sequence.
- Round 62's three bodycopies were transferred through each page's HTML Code
  View as direct UTF-8, copied back for exact equality before `Update`, saved
  with Cmd+S, and verified again after reload.
- Startup remains four 375ms hard cuts. On compact iOS Safari, each cut creates
  a new disposable fixed top and bottom sampler pair at z-index 8 with the exact
  cut theme color. The pair sits behind the sticky header and showcase surfaces,
  so content can cover it and continue to the physical viewport edges.
- The samplers are hidden and removed completely when the saved/default landing
  state settles. Do not convert them into a persistent header background or
  edge canvas. `.mbar-row`, compact navigation, compact introduction, `html`,
  `body`, and Cargo wrappers must remain transparent after startup. Keep
  `theme-color` and Apple standalone/status metadata absent.
- Local Chromium and WebKit passed the duplicate-initializer, four-cut color,
  fresh-node, removal, native-river, zero-overflow, and expanded-regression
  checks. Cargo's reloaded stylesheet is exactly 82,257 bytes with its head and
  three managed font regions preserved.
- Post-publication checks found one MM.S root, exactly two current runtime
  markers, no browser-color meta, and zero page-level horizontal overflow on
  every public route. Home retains `viewport-fit=cover`, and its permanent
  header is transparent after startup.

## Current handoff — Round 63 sampler stacking correction
- Round 63 is deployed, reload-verified, and published. Runtime remains
  `responsive-57`; startup remains four 375ms hard cuts and the transparent,
  sampler-free saved/default landing.
- Round 62's body-level sampler at z-index 8 painted above the complete `.mms`
  root stacking context at z-index 1. The nested header z-index 10, showcase
  z-index 20, and panel z-index 40 could not escape that root, so the sampler
  erased the visible composition during startup. The sampler now uses z-index
  0; preserve `.mms` 1, header 10, showcases 20, and panel 40.
- WebKit iPhone emulation measured zero navigation pixels with the old z-index
  8 top crop and 5,294 navigation pixels during the corrected black cut. MM.S,
  clock, and plus stay visible through all four cuts, and the disposable
  samplers are absent after landing.
- The complete Cargo stylesheet was saved and reload-verified in Dia. Public
  `https://mmmmm.studio` contains sampler z-index 0, no sampler z-index 8, and
  `responsive-57`; Cargo reports `Site is up to date`. ROUND 63 IS PUBLISHED.

## Current handoff — Round 64 iOS canvas and compact Write coverage
- Round 64 is reload-verified and published. Runtime stays `responsive-57`;
  startup remains four hard 375ms cuts plus the restored landing state, and no
  Home/Who/Write bodycopy changed.
- Preserve the iOS-only root canvas rule on
  `html[data-mms-site][data-mms-ios-safari]` and its `body`. It uses the current
  `--color-bg-page` behind the transparent Cargo/page stack so Safari cannot
  fall back to a white document canvas on dark or colored themes. It is a
  backing canvas, not a visible top plate: compact navigation, introduction,
  Cargo wrappers, `.mms`, and media surfaces keep their existing transparency.
- Preserve compact Write's continuous `.mms-writing` surface at z-index 20.
  The sticky link block is intentionally still present and usable at the top;
  once the first poem reaches it, this one continuous surface covers the links
  through all subsequent poem gaps and the final piece.
- Keep the established ordering sampler 0, `.mms` 1, header 10, showcase/write
  surface 20, panel 40. Do not add `theme-color`, Apple standalone/status metas,
  a fixed edge plate, or a synthetic compositor.
- Local all-theme compact checks, Write hit-testing, public source checks, and
  expanded 1440px regression passed. The local complete CSS bundle is 75,608
  bytes with SHA-256
  `21898f2285ac03db0d8dcb35df2a1d0807f3073fe49c4f6a5f1d3612c51a2fa4`;
  reload-persisted Cargo CSS is 82,973 bytes. ROUND 64 IS PUBLISHED.

## Current handoff — Round 65 compact header/sampler geometry correction
- Round 65 is deployed, reload-verified, and published. Runtime remains
  `responsive-57`; no Home, Who, or Write bodycopy changed.
- The disposable top startup sampler now uses
  `height: max(1px, env(safe-area-inset-top))` instead of a 32px fallback.
  Preserve this asymmetry: a real iOS top inset is still honored, while the
  bottom sampler intentionally keeps its 32px fallback. This prevents the top
  edge candidate from physically intersecting MM.S and the clock when the
  environment inset resolves to zero.
- Preserve the complete layer contract: sampler 0, `.mms` 1, header 10,
  showcases/Write surface 20, and panel 40. The four hard 375ms cuts,
  transparent sampler-free landing, iOS theme canvas, early
  `viewport-fit=cover`, and absence of browser-color/Apple standalone metadata
  are unchanged.
- The complete local bundle is 75,984 bytes, SHA-256
  `4fbd27db8fbb62f816e39fee5219e3e7f514ace9848e0c0a78d2ba0d5cebe198`.
  Reload-persisted Cargo CSS is 83,500 bytes, SHA-256
  `4934a80c87f9a17710a1a936bc437861a4df623b780a2197df69eb2f8d9aadbf`,
  with the CSS head and all three managed font regions preserved.
- Cargo reported `Site is up to date` after the 18:25 EDT publish. Public Home,
  Write, and Who all return HTTP 200 with the new 1px rule, no old 32px top
  rule, `responsive-57`, no actual `theme-color` meta, and
  `viewport-fit=cover`. ROUND 65 IS PUBLISHED.

## Current handoff — Round 66 bottom-edge and selected-theme correction
- Round 66 is deployed, reload-verified, and published. Home, Who, and Write
  now use `responsive-58`; each persisted bodycopy has one MM.S root, exactly
  two current markers, no `responsive-57`, and zero page overflow.
- Keep the disposable bottom sampler at exactly `height: 1px`. The old 32px
  fallback triggered WebKit's solid URL-edge extension and visibly blocked
  content. The top rule still honors a real top safe-area inset while using a
  1px fallback; the panel owns its safe-area padding separately.
- Preview controller version 2 exposes `sampleTheme(theme)`. Intentional
  palette choices use fresh 1px top/bottom probes for two frames plus 160ms,
  then remove them. Preserve the generation guard, the deferred latest-theme
  path when a choice cancels startup, and the absence of `theme-color`/Apple
  standalone metadata. The compact panel must remain open during a choice.
- Startup remains exactly four hard 375ms cuts. Preserve sampler 0, `.mms` 1,
  header 10, showcases/Write surface 20, and panel 40; native river panning and
  the transparent content-through landing are unchanged.
- Reload-persisted Cargo CSS is 83,702 bytes, SHA-256
  `53bdc61e25dac8a24099db4069c7b5f7d3a8f18bd1011a4de36992a62ad35bbc`;
  the local complete bundle is 76,212 bytes, SHA-256
  `9d04d7e774d3297c7eed59abd66a8adc854998bd82039f5dfc052390407a1bb0`.
  Public Home, Who, and Write were verified after the 19:21 EDT publish.
  ROUND 66 IS PUBLISHED.

## Current handoff — Round 67 Touchbaes live-first loading
- Round 67 is deployed, reload-verified, and published on Home, Who, and Write
  at `responsive-59`. The Touchbaes iframe no longer has a cover/poster; other
  video and V7 posters are unchanged.
- Preserve the Touchbaes band-level vertical preload observer. It activates the
  real game one viewport before the band, allowing the child to settle before
  horizontal reveal while leaving the generic deferred-media system intact.
- Compact fallback and child measurements are rounded to whole CSS pixels, and
  a difference of at most 1px is treated as the same locked envelope. Do not
  restore scroll-driven or breathing-driven iframe resizing.
- Public iPhone verification at 390x844 held the frame at 387x460 before and
  after reveal, with the child ready, no poster/background, native `pan-x
  pan-y`, and zero page overflow. Expanded Cargo retained the 340px rail and
  250px panel. CSS remains the Round 66 bundle. ROUND 67 IS PUBLISHED.

## Current handoff — Round 68 top-only theme handoff and compact tray closure
- Public and Cargo Home, Who, and Write use `responsive-60`; no active
  bodycopy contains `responsive-59`. Cargo published at 22:46 EDT and reports
  `Site is up to date`.
- Preview controller version 3 distinguishes startup from intentional color
  selection. Startup keeps its disposable top/bottom pair. A palette choice
  mounts only the top sampler for two frames plus 160ms and never creates a
  bottom probe, eliminating the visible lower seam.
- On compact screens a theme choice closes the tray on the second painted
  frame. The tray's page-color `::before` surface fills the entire fixed dialog
  with `inset:0` until closure so Safari can resample the selected lower edge.
  Face, size, and shape controls remain open for continued experimentation.
- Preserve the absence of `theme-color` and Apple standalone/status metadata,
  native `overflow-x:auto` / `pan-x pan-y` rivers, and zero page overflow.
  Do not restore a bottom selected-theme sampler or close the panel for noncolor
  controls.
- Reload-persisted Cargo CSS is 84,006 characters, SHA-256
  `107c1a9c20fd64f7792af66faa35f8490dd315676dff22f4f0e0bcc557908648`.
  The Cargo head and all three managed font blocks are intact. Persisted
  bodycopy lengths are Home 114,048, Who 56,267, and Write 54,878.

## Current handoff — Round 69 GOLD STANDARD: persistent tray and compact booklet control
- Public and Cargo Home, Who, and Write now use `responsive-62`; no active
  bodycopy contains an older responsive marker. The final corrected publication
  landed at 14:05:03Z on 2026-07-16.
- Preview controller version 4 uses top-only disposable iOS Safari samplers for
  both startup cuts and intentional theme changes. The compact tray stays open
  after a color choice and directly paints its selected background through the
  lower safe area. No bottom sampler or panel `::before` backing remains.
- The Montran booklet shell now follows the frame-shape setting while V7 and
  Touchbaes remain rectangular. Compact booklet turns commit once on a
  stationary pointerup and suppress the delayed synthesized click; moved
  gestures remain native scrolling. The Montran nine-icon asset is square at
  400:400.
- Global reload-persisted CSS is 83,632 bytes, SHA-256
  `070fb68449dd5801ed3592a4047b3f301fc6fe7078d7b181b3c0d25df5e1e145`.
  The local token/site bundle is 76,142 bytes, SHA-256
  `66f61b5950dfeed1c68548dfc75b81a472d4a4fd8a543540e4d9db3dbabfae65`.
  Cargo's head and all three managed font blocks remain intact.
- Home's stale page-local full stylesheet was the final public override. It is
  now a reload-persisted 79-byte comment, SHA-256
  `72aa1a231f1d838ee6b3b7f18a09682ee478bfe399788d62c7e55ebae7da2fd8`.
  Do not repopulate page Code View CSS; use global Site Settings CSS only.
- Public 390px proof keeps the tray open through theme selection, applies the
  booklet clip, preserves all native `pan-x pan-y` rivers, and has zero page
  overflow. Public 1440px proof retains the 272px left rail, 200x248 panel,
  664px introduction, and zero overflow. The compact tap state machine was
  verified in WebKit emulation; physical-iPhone verification remains Ocean's
  real-device acceptance surface.

## Current handoff — Rounds 70–71 named-page spacing drafts
- Round 69 remains the published gold standard. Rounds 70 and 71 exist only in
  the Cargo draft; never describe them as public until Ocean confirms Publish.
- All three Cargo draft bodycopies use `responsive-64` exactly twice and contain
  no `responsive-63`. Round 70 added the shared home link, current Figma Who and
  Write layouts, compact 64px final padding, text-hugging compact poem plates,
  and the expanded Who bottom anchor.
- Round 71 is the latest Figma Write correction. Preserve zero internal top
  padding on `.mms-writing-piece` and compact `.mms-writing-plate`. The title
  gap remains 16px compact and 8px expanded; inter-poem gaps remain 32px.
- The authoritative 390px poem heights are 246/200/430/223/177px. The
  authoritative 1440px passage tops are 40/40/408/930/1248px. These values were
  measured after Cargo save and reload, not only in the local mirror.
- The reload-persisted global stylesheet is 83,702 characters. Token and site
  regions exactly match the local sources (FNV-1a `a921cc79` and `f9adbbac`),
  with the CSS head and all three Cargo-managed font blocks preserved.
- Home retains 13 native rivers and zero overflow; Who and Write also retain
  zero page-level overflow. Do not publish Round 71 without a fresh explicit
  confirmation immediately before the Cargo Publish action.

## Current handoff — Round 72 Figma copy-audit draft
- Round 69 remains the protected published gold baseline. Round 72 is the
  active Cargo draft at `responsive-65`; Home, Who, and Write each contain the
  marker exactly twice and contain no `responsive-64` after save and reload.
- The six current Home/Who/Write desktop and mobile Figma frames were audited
  for visible editorial copy. The only approved Cargo changes are Touchbaes
  `Book an appointment here` with `here` linked to
  `https://www.touchbaes.ca`, and Kelly's Kelly `2025 – Graphic design •
  editorial`. Ocean confirmed that Cargo must retain `eviive.ch`; its absence
  in Figma was accidental.
- Who and Write copy already match their intended Figma sources. Do not copy
  the accidental second mobile `Clout fleeing` instance into Cargo; the
  canonical Write page contains the passage once.
- Reload-persisted Cargo CSS is 83,619 characters. Its token and site regions
  exactly match the local sources, the Cargo head remains 6,283 characters,
  the Mono/Sans/Gothic managed blocks each occur once, braces balance 491/491,
  and no transfer residue is present.
- Reloaded Home retains 13 rivers, compact `pan-x pan-y`, the intentional
  EVIIVE link, both approved copy corrections, and zero compact/expanded
  overflow. Who and Write also have zero overflow. Round 72 is draft-only;
  do not describe it as public or click Publish without fresh authorization.

## Current handoff — Round 73 WTW desktop-size draft
- The published site remains the protected Round 69 gold baseline. Round 73 is
  the active Cargo draft at `responsive-66`; Home, Who, and Write each contain
  that marker exactly twice and no `responsive-65` after save and reload.
- Figma node `414:619` is authoritative for the final WTW video: 896×504px,
  exact 16:9, full river height, bottom aligned. Cargo `wtw-07` now uses
  `--asset-w:896;--asset-h:504`; its existing 1920×1080 source and 1600×900
  poster remain unchanged. Do not edit `cargo/gold/round-69/` or stale
  `cargo/home 2.html`.
- Reloaded Cargo CSS is 83,618 characters. Local token and site regions match
  exactly, the Cargo head and all three managed font blocks remain intact, and
  braces balance 491/491. Home has zero compact/expanded page overflow; compact
  retains 13 native `pan-x pan-y` rivers. Who and Write also have zero overflow.
- Desktop rivers still rely only on native horizontal overflow. A horizontal
  or tilt wheel works; a plain wheel scrolls the page. There is no mouse
  click-drag, visible scrollbar, wheel remapping, or guaranteed cross-browser
  keyboard route. Any future mouse affordance must preserve native vertical
  scrolling and must not restore the rejected wheel interception or stepper.
- Round 73 is draft-only. Do not publish without a fresh explicit confirmation
  immediately before the Cargo Publish action.

## Current handoff — Round 74 Touchbaes tweezer stacking draft
- Round 69 remains the protected published gold baseline. The active Cargo
  draft is now `responsive-67` on Home, Who, and Write, exactly twice per
  reload-persisted bodycopy with no `responsive-66`.
- The desktop Touchbaes overlay is v3. Keep the existing `#mms-tw-rig` inside
  the live `.mms` shell before placement; this is what lets the rail/control
  panel at z-index 30 mask the rig at z-index 20 while the project band remains
  at z-index 10. Do not move the rig back to `body` or another shell sibling.
- Preserve the current offset-parent-relative placement math. Reparenting was
  proven not to change the tweezer's screen position, only its stacking owner.
  At Cargo's reloaded 1460px preview and maximum river scroll, the rig spans
  x116–405 and the rail x0–276; the rail paints above their 159px overlap.
- Compact behavior is unchanged: no escaped tweezer is shown, native rivers
  remain `overflow-x:auto` with `pan-x pan-y`, the game envelope stays locked,
  and page overflow is zero. Desktop wheel/input behavior is also unchanged.
- Reload-persisted Cargo CSS is 83,618 characters with exact local token/site
  parity, the CSS head and all three managed font blocks preserved, and
  balanced 491/491 braces. Who and Write also reload at `responsive-67` with
  zero overflow.
- Round 74 is draft-only. Do not click Publish without fresh explicit
  authorization immediately before publication.

## Current handoff — Round 75 published desktop river scrubbers
- Round 75 is the current published site. Home, Who, and Write run
  `responsive-68`; public and reload-persisted Cargo checks found that marker
  twice per page and no `responsive-67`. The protected
  `cargo/gold/round-69/` snapshot remains unchanged and is still the rollback
  reference.
- Expanded fine-pointer Home now has 12 accessible project-river scrubbers.
  Each scrubber is aligned to its rendered project description, not a fixed
  global measure. Random Pics intentionally has none. The proportional thumb
  has `col/1` as its minimum (84px at the 1440px reference), while its optical
  height stays 8px inside a minimum 44px interaction target.
- Preserve the interaction contract: track click, pointer drag, keyboard, and
  native `scrollLeft` synchronization are allowed; never add wheel interception,
  snapping, forced stepping, smooth correction, or capture of vertical page
  scrolling. Compact and coarse-pointer scrubbers stay hidden and all rivers
  remain native `pan-x pan-y` overflow.
- Cargo can hydrate the project bands after the runtime's first pass. Keep the
  scrubber initializer DOM-idempotent and retain the deferred hydration scans;
  they are required for the reload-proven 12-control result without duplicates.
- The reload-persisted global stylesheet is 86,107 characters, preserves the
  Cargo CSS head and all three managed font blocks, and has exact local token
  and site parity. The canonical local CSS deploy bundle is 78,442 bytes with
  SHA-256 `76b10710b192bf2460158dc0e1af66fdaee709627ca2085009dc9836e48b5f59`.
  Public desktop/compact verification found zero page overflow and no Who or
  Write regression. Cargo reported the site published and up to date at 9:04am
  on 2026-07-20.

## Current handoff — Round 76 published scrubber media correction
- Round 76 is the current published site. Home, Who, and Write run
  `responsive-70`; public and reload-persisted checks find that marker twice
  per page and no `responsive-69`. The protected `cargo/gold/round-69/`
  rollback baseline remains untouched.
- No media sources were lost. Home retains 68 canonical media IDs: 38 images,
  27 videos, and 3 iframes. The Round 75 scrubber could jump outside the old
  lazy/`IntersectionObserver` range before nearby assets had begun loading,
  which temporarily exposed blank frames.
- Keep `prewarmRiverMedia()`. In desktop scrubber mode it promotes arrived
  scrubber-band stills from lazy to eager and copies `data-poster` to the
  native video `poster`; actual video and iframe sources must remain deferred.
  Keep the bounded retry integration because Cargo may hydrate `.mms-band`
  elements after the first runtime pass.
- Preserve the corrected scrubber visual contract: pointer or programmatic
  focus creates no outline or dotted river frame, the thumb has no transparent
  halo, and keyboard `:focus-visible` uses a fully filled 12px theme-text bar.
- Reloaded Cargo Home proves 68 media IDs, all 38 images eager, 27 video
  posters, 12 visible desktop scrubbers, and zero page overflow. Compact 390px
  keeps scrubbers hidden, native `pan-x pan-y`, and zero overflow. Public
  desktop Home additionally proves all 38 stills have nonzero `naturalWidth`;
  public Home, Who, and Write all run `responsive-70`.
- The reload-persisted complete CSS is 86,035 bytes with SHA-256
  `890ede0baedb6c6120129600c6420a76800cf2dc6a8ffbe5f81c8059d831b334`.
  Cargo reported Last Published at 10:11am on 2026-07-20.

## Current handoff — Round 77 published scrubber outline return
- Round 77 is the current published site. Home, Who, and Write remain on
  `responsive-70`; the protected Round 69 gold rollback baseline is untouched.
- Preserve the scrubber state contract: fine-pointer hover and active dragging
  use a fully filled theme-text thumb. Once the pointer leaves, retained focus
  must resolve to the page-color outline state, never remain filled.
- `:focus-visible` is a 10px thumb with a 2px theme-text border and page-color
  center. The scrubber control itself has no browser outline, so the rejected
  dotted river frame and transparent halo do not return.
- The reload-persisted complete CSS is 86,130 bytes, SHA-256
  `ea17d30098b39cf22c4fd44be7df373f8415c4b7f370c287a7bae48080c1d703`,
  with the Cargo head and all three managed font blocks preserved.
- Cargo draft and public verification both passed hover, drag, pointer-exit,
  and focus-state checks. Compact 390px still hides scrubbers, retains native
  `pan-x pan-y`, and has zero overflow. Public Home, Who, and Write all retain
  `responsive-70` and zero page overflow. Cargo Last Published is 10:37am on
  2026-07-20.

## Current handoff — Round 78 published Figma copy synchronization
- Round 78 is the current published site. Home, Who, and Write remain on
  `responsive-70`; the protected Round 69 gold rollback baseline is untouched.
- Home project categories now match Figma's current capitalization. WTW is
  `2023 – Brand identity and graphic design • Entertainment`, not `events`.
- V7, AnyDay, Kelly's Kelly, and Dead Good each use the single merged paragraph
  currently defined in Figma. Touchbaes intentionally remains two paragraphs,
  with `Book a nail appointment here` as the separate linked call to action.
- This round changed only canonical Home copy. It did not alter CSS, media,
  scrubbers, native river behavior, or the shared runtime. Local validators,
  reload persistence, compact and expanded Cargo checks, and independent
  public checks all passed with zero page-level horizontal overflow.
- Cargo reported `Site is up to date` and Last Published today at 11:15am EDT
  on 2026-07-20.

## Current handoff — Round 79 published V7 and Touchbaes river restoration
- Round 79 is the current published site. Home, Who, and Write remain on
  `responsive-70`; the protected Round 69 gold rollback baseline is untouched.
- Never deploy the complete Home bodycopy through Cargo Code View. Round 78's
  Code View serializer silently deleted the full V7 river (6 items) and full
  Touchbaes river (7 items) while preserving both descriptions.
- The canonical source was intact. Round 79 restored the complete generated
  Home through the required direct `bodycopy.innerHTML` + UTF-8 `TextDecoder`
  + `InputEvent` route, saved, reloaded, and published it.
- Reloaded Cargo and independent public proof both find 68 unique media IDs,
  V7 6/6, Touchbaes 7/7, 38 images, 27 videos/posters, the three embeds, and
  zero page-level overflow. The Round 78 Figma copy sync remains present,
  including WTW `Entertainment` and the four merged descriptions.
- Cargo reported `Site is up to date` and Last Published today at 2:05pm EDT
  on 2026-07-20.

## Current handoff — Round 80 published scrubber border normalization
- Round 80 is the current published site. Home, Who, and Write remain on
  `responsive-70`; the protected Round 69 gold rollback baseline is untouched.
- Pointer-driven scrubber focus no longer leaks into the keyboard-only visual
  state. After click or drag and pointer exit, the published thumb returns to
  its normal 8px height and 1px border with no retained focus. The 10px/2px
  `:focus-visible` treatment remains reserved for keyboard access.
- Canonical `panel.js` uses `control.blur()` in both pointer paths. Cargo's
  publisher retained the prior inline bodycopy script during this round, so
  deployed `site-head.html` also carries a narrowly scoped capture listener
  that blurs only pointer-originated `.mms-river-scrubber` focus. Keep that
  listener until a future complete bodycopy publication is independently
  proven to contain the canonical blur calls.
- Reloaded Cargo and independent public proof both found 12 scrubbers, all 68
  unique Home media IDs, and zero page-level overflow. Cargo Last Published is
  2:40pm EDT on 2026-07-20.

## Current handoff — Round 81 published WTW square-video correction
- Round 81 is published. Home, Who, and Write remain on `responsive-70`; the
  protected Round 69 gold baseline remains immutable.
- Preserve the WTW-specific expanded river-height rule. The `wtw-02` source,
  poster, frame, and live video are square, but the former generic 504-unit
  river clipped the 765.2-unit asset by 261.2 units from the top. The corrected
  river uses `height: auto` with the existing 504-unit minimum so the complete
  square is visible and bottom alignment remains unchanged.
- Reload-persisted Cargo CSS is 86,543 bytes with SHA-256
  `b02243254016e0f40964ffa062aa49dd7acc38c8eeadfcc0420f2e130a8c5f27`;
  the Cargo head and all three managed font blocks remain intact. Public proof
  at 1024, 1440, and 1920px found square geometry, zero clipping, a native
  1600×1600 loaded video, `object-fit: contain`, and zero page overflow. Cargo
  Last Published is 8:57pm EDT on 2026-07-20.
# Round 82 correction — WTW display geometry

- Figma is authoritative for the WTW second asset: nodes `409:599` / `409:613` specify 504×504, not 765.2×765.2.
- `cargo/home.html` now declares `wtw-02` as `--asset-w:504;--asset-h:504`.
- The Round 81 WTW river auto-height override has been removed from `cargo/site.css`.
- Do not size a Cargo frame from its source raster/video dimensions; verify the intended Figma display frame first.
- Round 82 is published. At 1440px the public frame and river are both exactly
  504px high, with zero clipping; 1024px and 1920px are also square and
  unclipped. The public bodycopy retains all 68 media IDs and contains no stray
  CSS text.
