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
- Audit/remediation continuity update, 2026-07-22: Round 90 lives on branch
  `round-90/primary-interaction-coverage` as a test-only batch. It was not
  deployed to Cargo, Figma, Freight, or the public site. It adds primary
  interaction coverage for the compact panel, scrubbers, native rivers,
  startup state, embed readiness, Touchbaes sizing messages, and Montran
  compact turn filtering. The complete `bash audit/scripts/validate-phase2.sh`
  gate passed after stabilizing the gold parity harness for the current browser
  matrix. Protected gold `cargo/gold/2026-07-21-responsive-70` was not edited.
  Remaining known limitation: production `applyGameHeight()` still clamps zero
  or negative finite Touchbaes heights to 1px; handle that in a later
  embed-validation batch, not as part of Round 90's test-only scope.
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

## Current handoff — Round 81 whole-project audit (read-only)
- The audit is on Git branch `round-81/audit-harness`. Phase 1 is frozen at
  `docs/audits/2026-07-20T175853-0400-round-80/`, commit `afc8b22`; never edit
  that evidence or `cargo/gold/round-69/`. Post-baseline facts are additive in
  `docs/audits/2026-07-20-post-round-80-delta.md`.
- The audit implementation/findings commit is `c8ef564`; GitHub draft PR 3
  targets `round-81/audit-baseline`. Review or merge that PR before starting a
  remediation branch; do not target `main` directly from the audit branch.
- `audit/` contains the system and asset inventories, exact JSON schemas, the
  deterministic local/Cargo-snapshot/published browser harness, machine-readable
  intentional-design contracts, and evidence-backed findings. Run
  `audit/scripts/validate-phase2.sh` before committing later audit work.
- WTW `wtw-02` is protected at the current approved 504×504 endpoint. The
  complete 264-capture visual matrix observed it square and unclipped at every
  state/width. Do not restore the superseded 765.2×765.2 geometry.
- Ocean explicitly requires the four Withered Green body paragraphs to keep
  Cargo's native `uses="eye-roll"` motion. The heading remains static. Source,
  payload, schema, and browser checks fail closed if the section, route marker,
  four direct hooks, or complete paragraph coverage drift.
- Fresh all-route local and public runs cover Home, Write, and Who at 390 and
  1440px. Both have zero fatal errors, non-200 main responses, page overflow,
  state mismatches, or intentional-contract failures. Nonzero run exits record
  detected site findings and are not automatically harness failures.
- Current decision-gated findings include the 1024px Touchbaes crop, expanded
  Random Pics crop, Cargo river-ARIA mutation, missing document language,
  expressive-theme contrast failures, inaccessible media structure, continuous
  motion without a pause pathway, published startup over-fetch, and several
  Figma panel/Write structure drifts. Do not remediate palette, visible design,
  or interaction findings until Ocean approves a batch.
- The consolidated report is `audit/findings/master-audit-report.md`; the
  44-item registry is `audit/findings/issue-registry.json` (0 P0, 16 P1,
  24 P2, 4 P3). The highest systemic guards are the deployment completeness
  manifest, single media/runtime owner with teardown, and deterministic V7/
  Montran recovery. The current validator can otherwise pass a missing
  `wtw-02` or consistently stale runtime marker.
- The live Figma audit was read-only. No Cargo editor, Freight asset, Figma node,
  or public page was changed or published during this audit batch.
- Preserve the user-owned untracked files `cargo/home 3.html`, `cargo/who 3.html`,
  and `cargo/write 3.html`; never stage or overwrite them.

## Current handoff — latest gold and first remediation guard (2026-07-21)
- PR 3 is merged into `round-81/audit-baseline`. Remediation work continues on
  `agent/deployment-manifest`; do not restart from the older audit branch.
- Ocean designated the actual latest verified site as the current gold. Use
  `gold-2026-07-21-responsive-70`, not Round 80, as the default comparison and
  rollback target. Its immutable local snapshot is
  `cargo/gold/2026-07-21-responsive-70/`. Keep `round-69-gold` and
  `round-80-stable` unchanged as historical references.
- The current gold includes the post-Round-80 corrections: WTW `wtw-02` is
  504×504, and Withered Green keeps exactly four rotating body paragraphs with
  a static heading.
- The first approved remediation is the fail-closed deployment manifest:
  `cargo/deployment-manifest.json` plus
  `cargo/validate-deployment-manifest.py`. It locks exact page/runtime/media/
  embed/geometry/source contracts and is invoked by the normal Cargo payload
  gate. Never regenerate the manifest automatically from current HTML.
- The aggregate audit gate includes thirteen destructive negative fixtures for the
  deployment manifest as well as the three Withered Green fixtures. Run both
  `bash cargo/assemble-test.sh canonical` and
  `bash audit/scripts/validate-phase2.sh` before the next remediation batch.
- This guard/gold batch is local/GitHub-only. It did not mutate Cargo, Freight,
  Figma, or the public site and did not publish Cargo.
- Gold commit `07531485ca0ac4378fd3182ffa176ee6ccead7dd`, tag, and GitHub release
  are remote and protected. Draft PR 4 targets `round-81/audit-baseline` from
  `agent/deployment-manifest`.

## Current handoff — Round 82 media playback ownership (2026-07-21)
- Work is isolated on `round-82/media-playback-owner` from merged
  `round-81/audit-baseline`. It remediates only `MMS-AUD-027` and remains
  local/GitHub-only.
- `cargo/home-extras.html` no longer contains the legacy all-video autoplay
  interval. `cargo/panel.js` remains unchanged and is the sole owner of deferred
  video activation, visible/near playback, pause, and bounded resume behavior.
- `audit/scripts/validate-media-playback-owner.py` prevents the legacy marker,
  unbounded video selector, or Home-extras interval from returning. It accepts
  the bodycopy under test and is invoked by the normal Cargo payload gate, so
  reload persistence cannot silently retain the old owner. The browser probe
  is `npm run media-owner-test`; latest-gold visual/interaction parity is
  `npm run gold-parity-test`.
- Gold reproduces the old defect at 122 then 176 play attempts. The candidate
  passes with 14 loaded visible/near attempts and no post-lifecycle growth.
  Lifecycle/interaction events and both horizontal and vertical distance are
  covered. Both
  240-state compact and expanded parity matrices, masked screenshots, panel
  interactions, and native river checks match
  `gold-2026-07-21-responsive-70` exactly.
- The complete canonical assembly and Phase 2 audit gate pass, including 14
  destructive deployment fixtures and both mandatory browser probes. The immutable
  Round 80 snapshot stays unchanged; runtime-added deferred `src` attributes
  are stripped only from an in-memory fixture while the production manifest
  validator continues to reject them.
- The audit-only Playwright dependency is pinned at 1.61.1; both browser tests
  have finite watchdogs after the older pin intermittently stalled at launch.
- Do not deploy or publish this batch yet. Physical iPhone Safari must confirm
  that visible/near muted inline video still autoplays. The next independent
  remediation is `MMS-AUD-029`, explicit root-runtime teardown.

## Current handoff — Round 83 root-runtime teardown (2026-07-21)
- The active branch is `round-83/root-runtime-teardown`, based on merged
  `round-81/audit-baseline`. It remediates `MMS-AUD-029` and remains
  local/GitHub-only; no Cargo or public deployment occurred.
- `window.__mmsRuntimeLifecycle` is the single owner registry for the current
  `.mms` root. The panel owner and Home tweezer owner dispose stale listeners,
  timers, intervals, animation frames, observers, generated scrubbers, stale
  rig content/state, panel portal state, measured root variables, and stale
  media state when the replacement runtime initializes. Teardown is
  idempotent.
- `audit/scripts/validate-root-runtime-owner.py` is invoked by the normal Cargo
  payload gate and the aggregate audit gate. Its destructive self-test rejects
  permanent root guards, unmanaged element/global/media-query listeners, raw
  timers or animation frames, and unwrapped resize/intersection observers.
- `npm run runtime-root-test` covers compact 390x844 and expanded 1440x900.
  Both modes pass an initial load, three full root replacements, and a
  same-root dialog plus Touchbaes river/iframe rehydration with one active
  panel/Home owner, exact current-element rebinding, zero stale element
  listeners, stable resource counts, no errors, no overflow, and protected
  geometry within 1px. Expanded mode retains 12 scrubbers, an open current-root
  panel, and native EVIIVE river movement that settles unchanged.
- Ocean's current preservation target is exclusively
  `gold-2026-07-21-responsive-70`. Round 69 and Round 80 are immutable
  historical references, not the default parity or rollback target. The
  deployment validator now requires the exact current-gold identifier, and the
  parity test checks both its gold fixture and candidate manifest before
  opening a browser.
- Canonical assembly and the full Phase 2 gate pass, including 122/122 frozen
  hashes, latest-gold 240-state compact/expanded parity, media ownership,
  manifest negative fixtures, and root replacement. Do not deploy this batch
  until separately authorized and physically verify the earlier autoplay
  ownership change on iPhone Safari before any eventual Cargo publication.

## Current handoff — Round 84 clean-gold Home recovery (2026-07-21)
- Round 83 is merged into `round-81/audit-baseline` through PR 6 (merge
  `9814a97`; remediation commit `733877c`). The repository was clean and
  tracking `origin/round-81/audit-baseline` before this documentation update.
- Cargo Home was restored and published from the exact immutable
  `cargo/gold/2026-07-21-responsive-70/home.html` bodycopy because
  runtime-mutated media attributes had been saved into Cargo source. The
  restore used UTF-8-safe `bodycopy.innerHTML` plus `InputEvent`, Cmd+S, editor
  reload, and fresh persistence checks; never use Cargo Code View for complete
  Home replacement.
- Require 68 unique media IDs and two `responsive-70` markers in Home. In the
  raw saved and published source require zero live video/iframe `src`, zero
  `data-mms-loaded`/`data-motion-ready`, zero native video `poster`, zero
  hidden rivers, 1 eager image, 37 lazy images, and 30 deferred `data-src`
  attributes. Do not use the runtime-mutated live DOM for these source
  assertions.
- This is a source-purity recovery to the approved visual gold. It does not
  deploy the Round 82 or Round 83 remediation deltas. Keep
  `gold-2026-07-21-responsive-70` immutable; Round 69 and Round 80 remain
  historical checkpoints only.
- Next separate batches are a fail-closed source-purity preflight, the swatch
  focus treatment, iPad Montran pointer-mode alignment, and durable Safari
  poster readiness. Do not mix them with this recovery.

## Current handoff — Round 85 saved-source purity (2026-07-21)
- Work is isolated on `round-85/source-purity-guard`. The deployment manifest
  is schema 2 and requires an exact `source_purity` contract for every page.
- `cargo/validate-deployment-manifest.py` parses markup structurally, so runtime
  JavaScript strings do not cause false positives. It compares live
  video/iframe/child sources, native posters, runtime markers, river state,
  generated scrubbers, deferred-source counts, eager-image identities,
  image/iframe loading, and video preload against the reviewed manifest.
- The normal `cargo/validate-cargo-payload.sh bodycopy` path invokes this gate.
  Future Cargo saves must be checked from the raw saved bodycopy, not the
  runtime-mutated preview DOM. A mismatch must block deployment rather than
  redefining the manifest.
- The aggregate gate contains 30 destructive deployment fixtures; thirteen
  purity fixtures assert that this exact guard caused rejection. The protected
  gold and frozen Round 80 evidence remain immutable.
- Canonical assembly and the complete Phase 2 gate pass. This batch is
  validation-only and is not a Cargo deployment. The next independent visual
  batch is the color-swatch focus treatment.

## Current handoff — Round 86 circular swatch focus treatment (2026-07-21)
- Round 86 is published on Home, Who, and Write. Theme swatches never use the
  dotted rectangular browser/Cargo focus box. Pointer and touch selection blur
  after applying the theme and leave the non-modal panel open; keyboard
  activation retains focus with a solid circular ring made from page color and
  theme ink.
- Keep the swatch interaction box geometry unchanged. Compact still uses the
  transparent distributed target cell and expanded fine-pointer mode still
  uses the optical dot size. The focus ring belongs to `.mms-dot::before`, not
  the transparent button box.
- The complete persisted CSS is 86,761 UTF-8 bytes with SHA-256
  `77583f41c978f9dcae0549502b38e441e6b1243becb21f478437f3d0db620fa6`.
  It retains the Cargo head, all three managed font blocks, one token region,
  one layout region, and balanced 505/505 braces.
- Home, Who, and Write were replaced through the direct UTF-8-safe bodycopy plus
  descendant InputEvent workflow and reload-verified. Never use Cargo Code View
  `Update` for complete page replacement; opening the view reads an activated
  runtime DOM and is not valid saved-source purity evidence.
- The focused swatch contract, canonical assembly, and complete Phase 2 gate
  pass. Public verification found zero page overflow, 13 Home rivers, 12
  scrubbers, pointer focus released with the panel open, and a keyboard-only
  circular ring. Write still has four rotating Withered Green paragraphs and a
  static heading. The sole current gold remains
  `gold-2026-07-21-responsive-70` and was not changed.
- The next separate remediation is the iPad/Safari media batch: Touchbaes second
  asset readiness, Montran coarse-pointer interaction, and durable poster/load
  behavior. Do not mix it into the completed swatch round.

## Current handoff — Round 87 hover-only swatch ring (2026-07-22)
- Round 87 supersedes only Round 86's swatch-focus decision. There is no theme
  swatch border or ring at rest, after pointer/touch selection, or during
  keyboard focus. The only visible ring is the 1px circular artwork ring while
  a fine pointer is actively hovering the swatch.
- Keep `.mms-dot` target geometry transparent and unchanged. Base and compact
  `.mms-dot::before` borders remain `0`; the hover rule remains inside
  `(hover: hover) and (pointer: fine)`. Do not restore a swatch
  `:focus-visible::before` rule or a dotted button outline.
- The published four-region CSS is 86,459 UTF-8 bytes, SHA-256
  `2e7cd7798dcbea7ba222e967d6824507e8c4e7844903cf55e6fb69b170ea0bf9`.
  Cargo's head and three managed font regions remain intact.
- Public Home is verified at 68/68 unique media IDs, 13 rivers, 12 expanded
  scrubbers, square WTW asset geometry, and zero horizontal overflow. Who is
  verified with two videos; Write is verified with four rotating Withered Green
  body paragraphs and a static heading. All pages retain two `responsive-70`
  markers.
- The full Phase 2 gate passes. The sole current gold remains
  `gold-2026-07-21-responsive-70` and was not edited. The next separate
  remediation remains the iPad/Safari media-readiness batch.

## Current handoff — Round 88 gold swatch border with Arrow-only focus frame (2026-07-22)
- Round 88 is saved and reload-verified in the Cargo draft but is not
  published. It supersedes Round 87's borderless-rest decision: expanded and
  compact theme dots again use the protected gold's permanent 1px circular
  artwork border. Fine-pointer hover still adds the existing outer halo.
- The dotted rectangular target frame is quiet on load, dialog autofocus,
  programmatic focus, Tab alone, pointer, and touch. It appears only after an
  unmodified Arrow key moves focus within the five swatches, wraps at the row
  ends, and is cleared by the next pointer/touch contact. Do not restore Round
  86's solid two-layer circular keyboard halo.
- The transient `data-mms-swatch-nav="arrow"` state and document listeners are
  owned by the shared panel lifecycle and are removed during teardown. Home,
  Who, and Write were rebuilt from that one shared runtime and deployed through
  the UTF-8-safe direct bodycopy/InputEvent workflow.
- Reloaded Cargo CSS is 86,758 UTF-8 bytes, SHA-256
  `95c35fff5d9ec49bd3ea2f4c0878794918ad087b377c079bf3ac5de68075be4c`,
  with the Cargo head, all three managed font regions, one token region, and
  one layout region preserved. Home has 68/68 unique media IDs and zero
  overflow; Who retains two videos; Write retains four rotating Withered
  Green body spans and a static heading.
- The focused browser test, canonical assembly, and complete Phase 2 gate pass.
  The editor's contenteditable shell cannot retain inner swatch focus after a
  simulated Arrow press, so repeat that one visual interaction on the public
  non-editing page only after Ocean explicitly authorizes publication.
- The sole current gold remains `gold-2026-07-21-responsive-70` and is
  unchanged. Keep the separate iPad/Safari media-readiness remediation next.

## Current handoff — Round 89 Touchbaes iPad readiness (2026-07-22)
- Round 89 fixes only the reported Touchbaes second-asset stall. The runtime
  identifies `[data-media-id="touchbaes-02"] video`, selects its existing
  HEVC-alpha fallback on iPad/Safari, sets `preload="auto"` only when the
  near-media observer activates it, retries once at `loadeddata`, and uses the
  720px Freight poster rendition at runtime. Saved media attributes, manifest,
  dimensions, layout, and `gold-2026-07-21-responsive-70` are unchanged.
- The original poster is 1,728,991 bytes; the 720px runtime rendition is
  408,732 bytes. The 2,078,186-byte MP4 is valid and fast-started but Freight
  reports no range support. The focused 768x1024 and 1024x1366 iPad contract
  and the complete Phase 2 gate pass.
- Home, Who, and Write now contain the updated shared runtime and are
  reload-verified in the Cargo draft. Chrome's Home editor remained blocked by
  the paused V7 document response, so Home was transferred through the
  authenticated in-app Cargo editor using the required UTF-8-safe direct
  `bodycopy.innerHTML` plus `InputEvent` path, Cmd+S, and reload. Code View was
  never used.
- Cargo's raw saved Home record passes the schema-2 source-purity validator:
  68/68 unique media IDs, seven Touchbaes items, the Round 89 helper, two
  `responsive-70` markers, no live source, no native poster, `preload="none"`,
  and the original approved poster identity. Compact and expanded probes retain
  native rivers, zero page-level horizontal overflow, and WTW at 504x504 in
  the 1440px composition. Who and Write retain their protected media and
  four/static Withered Green contracts.
- The remaining acceptance gate is physical iPad Safari playback of the second
  Touchbaes asset. Do not publish without Ocean's explicit authorization.

## Current handoff — Round 91 Touchbaes parent message hardening (2026-07-22)
- Round 91 is local repository work on branch
  `round-91/touchbaes-message-hardening`; it is not deployed to Cargo and is
  not published.
- It closes `MMS-AUD-033`: the parent Touchbaes escaped tweezer rig no longer
  writes child-supplied `data.html` to `innerHTML`. The parent accepts only
  approved Freight tweezer/sticker URLs and bounded numeric placement/style
  fields parsed from the legacy message, then builds trusted DOM nodes with
  `replaceChildren()`.
- The existing Touchbaes child iframe v10 is intentionally unchanged for this
  round. Its legacy `html` message is treated only as a declarative carrier;
  no message-derived string reaches live parent markup. Compact mode still
  suppresses the escaped rig; desktop visual behavior is preserved.
- The source overlay now locates the generated `#mms-tw-rig` even though the
  assembled marker starts outside `.mms`, then mounts that same node into the
  current root. Do not revert this to a `.mms`-only query.
- The Round 90 height limitation is also closed: zero and negative finite
  Touchbaes height messages are rejected before clamping.
- Verification passed: extracted `home-extras` script syntax, harness syntax,
  `bash cargo/assemble-test.sh`, no `innerHTML` occurrences in the Touchbaes
  home extras/generated mirrors, focused `npm run embed-montran-test`, and the
  complete `bash audit/scripts/validate-phase2.sh`.
- `gold-2026-07-21-responsive-70` remains immutable and unchanged.

## Current handoff — Round 92 active embed source recovery (2026-07-22)
- Round 92 is repository-only work on branch
  `round-92/embed-source-recovery`; it is not deployed to Cargo and is not
  published.
- `work/v7-cup-src/` is now the authoritative tracked source for the active V7
  cup. Its deterministic builder must continue producing exactly 780,341 bytes
  with SHA-256
  `ee09e9c282d928f8968b91e1301bc0ba2639102a27c1bf1cd40483ab1b609d0a`.
  Do not restore the stale older split runtime or edit the generated upload
  bundle directly.
- `work/montran-direct-pdf-v10-src/index.html` is now the authoritative
  recovered v17 viewer source. Its builder must continue producing exactly
  1,936,356 bytes with SHA-256
  `825cf2c3a1f130cb3445e62443985e845991204d19e0c2154cfd43a36126b49b`.
- `audit/scripts/validate-embed-reproducibility.py --self-test` is part of the
  normal Phase 2 gate. It requires both unique embeds, tracked and hash-locked
  inputs, approved source contracts, deterministic isolated double builds, and
  exact frozen output identity. Do not weaken it to a local generated-file
  comparison.
- Focused exact-build and embed interaction checks pass, and the complete
  Phase 2 gate passes with protected visual parity and frozen hashes intact.
  The protected `gold-2026-07-21-responsive-70` tree was not edited.
- Keep `MMS-AUD-036` PDF URL allowlisting and `MMS-AUD-039` third-party notices
  as separate later batches because either can change distribution behavior or
  bytes. No Cargo deployment is required for Round 92 itself.

## Current handoff — Round 93 prepared embed protocol promotion (2026-07-22)
- Round 93 is repository-only work on `round-93/embed-message-protocol`; it has
  not been uploaded to Freight, deployed to Cargo, or published. The protected
  `gold-2026-07-21-responsive-70` tree is unchanged.
- The canonical parent sources are `cargo/panel.js` and
  `cargo/home-extras.html`. They now send V7 visibility and Touchbaes mode
  messages to exact child origins with `kind` and `protocolVersion: 1`.
  Inbound protocol enforcement is opt-in through
  `data-embed-protocol="1"`, preserving the active legacy children until an
  atomic URL promotion. Only an absent attribute selects the legacy path;
  empty, malformed, or unsupported present values fail closed.
- Internal lifecycle owners are now
  `responsive-70/root-lifecycle-2/embed-message-v1` and
  `tweezer-v3/root-lifecycle-2/embed-message-v1`. Keep the visible/public
  `responsive-70` marker unchanged. The root-replacement harness must keep
  proving that exact lifecycle-1 owners are deactivated and replaced on the
  same `.mms` root.
- Do not edit `work/v7-cup-src/`: it remains the exact source for the active
  780,341-byte V7 artifact. The hardened candidate lives in
  `work/v7-cup-message-v1-src/` and must build to 781,074 bytes, SHA-256
  `0e196aa0f2e1d35f0671ea1d746f5453037ee7e320a36ca189b1a5d817cf256f`.
- Do not overwrite Touchbaes v10 or its active alias. The upload candidate is
  `touchbaes-sticker-game-v11.html`, 50,030 bytes, SHA-256
  `6c4947e22ac8f8b5ec06d1c4f9d238367c561819a5eac6d8a699403e6f75fee0`.
  Geometry version stays 10; only the cross-window protocol advances.
- The mandatory focused checks are
  `python3 audit/scripts/validate-embed-message-protocol.py --self-test`,
  `npm --prefix audit/harness run embed-montran-test`, and
  `npm --prefix audit/harness run embed-message-protocol-test`, plus
  `npm --prefix audit/harness run runtime-root-test`. The complete
  `bash audit/scripts/validate-phase2.sh` gate passes. The prepared activation
  validator must continue rejecting any one-sided URL, manifest, or protocol
  attribute change.
- Promotion must be atomic: upload both candidate children to new immutable
  Freight URLs; update both Home template URLs and add
  `data-embed-protocol="1"`; update the reviewed deployment manifest; assemble
  all pages; deploy the complete parent and Home payload together; reload and
  verify; then record the new active hashes. Never switch only the parent or
  only one child, because Touchbaes mode/height/tweezer negotiation would fail.

## Current handoff — Round 94 prepared Montran PDF allowlist (2026-07-22)
- Round 94 is repository-only on `round-94/montran-pdf-allowlist`. It prepares
  issue `MMS-AUD-036` without uploading to Freight, changing Cargo, publishing,
  touching Figma, or modifying `gold-2026-07-21-responsive-70`.
- The upload candidate lives in `work/montran-pdf-allowlist-v18-src/` and must
  build to 1,938,550 bytes, SHA-256
  `ca9ee9c69594af7c9e4a214f422413d00e43cbd5b493ec48f1f033295690e512`.
  Do not edit or replace `work/montran-direct-pdf-v10-src/`; it remains the
  recovered active v17 source and must continue reproducing 1,936,356 bytes,
  SHA-256 `825cf2c3a1f130cb3445e62443985e845991204d19e0c2154cfd43a36126b49b`.
- The only allowed PDF is the exact Freight report recorded by the frozen
  Round 80 evidence at 13,634,937 bytes and SHA-256
  `664dab49810d21acaa0ffbb7d6749268215c1b655ccec11f461d67c147f02629`.
  Duplicate or unapproved query values reject before preload/network. All PDF
  requests revalidate the exact URL, reject redirects, omit credentials and
  referrers, and preserve the existing 256 KiB range plus full fallback flow.
- Artifact version is 18; the unchanged Montran ready-message wire version is
  still 17. Do not advance the wire version or parent bridge for this issue.
- Mandatory checks are
  `python3 audit/scripts/validate-montran-pdf-allowlist.py --self-test`,
  `npm --prefix audit/harness run montran-pdf-allowlist-test`, active embed and
  Montran interaction tests, and the complete `validate-phase2.sh` gate. All
  pass, including 122/122 frozen hashes and both 240-state visual matrices. The
  candidate validator must continue rejecting one-sided Home/manifest
  activation while its contract says `prepared-not-active`.
- A future promotion must upload v18 to a new immutable Freight URL, update the
  canonical Home iframe and deployment manifest together, assemble/deploy the
  complete payload, reload-verify Cargo, and only then record the new active
  identity. Until that happens, the public/direct v17 viewer remains outside
  this prepared allowlist fix.

## Current handoff — Round 95 third-party runtime notice record (2026-07-22)
- Round 95 is repository-only on `round-95/third-party-notices`. It completes
  the tracked provenance/notice record for `MMS-AUD-039`; nothing was uploaded
  to Freight, deployed to Cargo, published, or changed in Figma, and
  `gold-2026-07-21-responsive-70` remains untouched.
- `THIRD_PARTY_NOTICES.md` is the consolidated record for exactly three
  vendored browser runtimes: StPageFlip/page-flip 2.0.7 MIT, PDF.js 6.1.200
  Apache-2.0, and Three.js 0.160.0/r160 MIT. It contains the complete upstream
  package license text for each. Touchbaes has no third-party browser runtime
  dependency and must not receive an invented notice entry.
- `audit/contracts/third-party-runtime-notices.json` pins the exact four vendor
  files and maps them to active V7, prepared V7 message-v1, active Montran v17,
  and prepared Montran v18. The new validator is mandatory in
  `validate-phase2.sh`; it rejects any uncovered `work/**/vendor/*` file,
  metadata/license/banner/hash drift, incomplete artifact mapping, output
  identity drift, or missing/duplicated vendor payload.
- Preserve these exact outputs: V7 active 780,341 bytes / `ee09e9c…b609d0a`;
  V7 prepared 781,074 bytes / `0e196aa…17cf256f`; Montran v17 1,936,356 bytes /
  `825cf2c…126b49b`; Montran v18 1,938,550 bytes /
  `ca9ee9c…690e512`. Do not add banners to the recovered vendor files, builders,
  or generated HTML under this round because doing so changes immutable
  artifact identities.
- Focused notice/reproducibility/protocol/PDF gates and the complete Phase 2
  suite pass, including 17 notice-negative fixtures, 122/122 frozen hashes,
  both 240-state visual matrices, and protected native-river/WTW/Withered
  behavior.
- Accuracy boundary: this is a tracked repository notice, not proof that an
  already-uploaded Freight HTML file now contains the StPageFlip MIT text.
  A future versioned successor must ship or accompany the notice, receive a
  new reviewed hash, and be promoted separately.

## Current handoff — Round 96 Framer helper dependency advisory (2026-07-22)
- Round 96 is tooling-only repository work on
  `round-96/framer-dependency-advisory`. It addresses `MMS-AUD-038` without
  modifying Cargo, Figma, Freight, site runtime, embed artifacts, visual
  geometry, or `gold-2026-07-21-responsive-70`.
- Keep the private helper on exact `framer-api` 0.1.7. This is the same SDK
  release the former lockfile used, now deterministic instead of `latest`.
  Keep the exact `devalue` 5.8.2 override; it is outside
  `GHSA-77vg-94rm-hx3p` and satisfies the SDK's existing `^5.6.4` range.
- The mandatory repository contract is
  `audit/contracts/framer-helper-dependencies.json`; the validator is
  `audit/scripts/validate-framer-helper-dependencies.py`. It must continue to
  run from `validate-phase2.sh` with destructive fixtures, an isolated clean
  install, dynamic entrypoint smoke test, clean dependency tree, and online
  zero-vulnerability audit at `audit-level=low`. It must also reject any
  declared contract, validator, config, smoke, or read-only source that is not
  present in the Git index.
- `Framer/MM.S Framer API/dependency-smoke-test.mjs` executes both actual
  helper entrypoints against a Proxy that exposes only `getProjectInfo`,
  `getColorStyles`, `getTextStyles`, and `disconnect`. It verifies exact local
  design-output structure, disconnect on success/failure, and refusal to
  connect without credentials. Do not weaken it to source regex alone.
- No credentials are stored here, so the live authenticated design read is a
  documented external confirmation rather than a claimed test result. Before
  the helper is next used, run `npm ci --ignore-scripts`, `npm test`,
  `npm run audit:dependencies`, then `npm run read:design` with the approved
  environment and inspect the generated JSON. Never commit `.env`,
  `node_modules`, or `design-system.json`.
- Focused checks and the complete Phase 2 suite pass, including 122/122 frozen
  hashes, both 240-state matrices, native rivers, WTW and Withered Green,
  Touchbaes/iPad and Montran behavior, source purity, runtime teardown, and
  deployment-negative fixtures. Nothing was deployed or published.

## Current handoff — Round 97 iframe capability matrix (2026-07-22)
- Round 97 is repository-only on `round-97/iframe-capability-matrix`. It
  prepares `MMS-AUD-035`; it does not activate an iframe policy, upload a
  successor, deploy Cargo, publish, change Figma, or touch
  `gold-2026-07-21-responsive-70`.
- Preserve `audit/contracts/iframe-capability-matrix.json` and
  `audit/scripts/validate-iframe-capability-matrix.py`. The exact candidate is
  scripts plus same-origin sandbox tokens, `strict-origin`, zero positive
  delegated features, and the reviewed finite deny list. Do not add popup,
  top-navigation, form, download, modal, fullscreen, pointer-lock, or storage
  sandbox grants.
- `allow-same-origin` is not optional while the children and parent enforce
  exact origins. Without it the browser reports child origin `null`.
  `strict-origin` is also not optional while prepared children derive their
  parent target from `document.referrer`; `no-referrer` and `same-origin`
  break cross-origin readiness. Keep parent and Freight origins distinct.
- The browser proof must continue to build and exercise the exact prepared V7
  message-v1, Touchbaes v11, and Montran v18 artifacts. It verifies origin-only
  iframe navigation, real child origins, zero allowed browser-supported
  Permissions Policy features, V7 rotation and visibility, Touchbaes
  mode/size/pointer dragging, and Montran PDF range rendering plus
  expanded/compact turns. Exact proof-input digests and npm/Phase 2 wiring are
  fail-closed. The Montran PDF request itself stays protected
  by v18's separate no-credential/no-referrer fetch boundary.
- Activation is a later atomic external batch. Upload immutable successors,
  set the policy before deferred `src` assignment, promote the prepared message
  protocol and Montran allowlist together with Cargo/manifest changes,
  reload-verify, and test desktop Chromium/Safari plus physical iPhone/iPad
  Safari. Until then all canonical iframe policy attributes must stay absent.

## Current handoff — Round 98 public response-header policy (2026-07-22)
- Round 98 is repository-only on
  `round-98/public-security-header-contract`. It prepares `MMS-AUD-037`; it
  does not configure or claim live headers, deploy Cargo, upload Freight,
  change DNS/Figma, publish, or touch `gold-2026-07-21-responsive-70`.
- Preserve `audit/contracts/public-response-header-policy.json`, the live
  evidence at
  `audit/findings/evidence/2026-07-23-round98-public-response-headers.json`,
  and `audit/scripts/validate-public-response-header-policy.py`. The validator
  is mandatory in `validate-phase2.sh` and currently passes 29 destructive
  fixtures plus the complete Phase 2 suite.
- The first-party Home/Who/Write documents and sampled Freight responses still
  lack CSP, CSP Report-Only, Reporting-Endpoints, Referrer-Policy,
  Permissions-Policy, nosniff, frame protection, and HSTS. HTTP redirects to
  HTTPS, but redirect presence is not HSTS.
- Cargo's official self-service documentation does not expose HTTP
  response-header rules. Record this as `not-documented`; do not convert it to
  `impossible` without an authoritative Cargo response. Saved Custom HTML is
  emitted after the frozen document head and cannot be credited as a response
  header. Never add policy `http-equiv` tags to `cargo/site-head.html` as a
  substitute.
- Keep activation `prepared-not-active`, `header_owner`,
  `reporting_endpoint`, and exact CSP unset until external decisions are made.
  The only allowed owner paths are support-confirmed Cargo configuration or a
  separately approved first-party edge. A first-party edge cannot change
  `freight.cargo.site` responses; Round 97 iframe containment remains the
  prepared child boundary.
- Promotion order is owner/rollback confirmation, privacy-reviewed report
  sink, CSP Report-Only discovery, clean compact/expanded/browser/device and
  Cargo editor/preview evidence, then exact enforcement. Frame ancestors and
  X-Frame-Options must not be guessed before editor/preview framing is tested.
  HSTS must use the documented canary ramp with no subdomains or preload before
  a complete host/TLS audit.
- No Cargo/Freight/DNS action is part of Round 98. Any activation is a separate
  explicitly authorized architecture and deployment batch with fresh public
  header evidence, rollback, and full protected-contract verification.

## Current handoff — Round 99 low-collection privacy inventory (2026-07-22)
- `MMS-AUD-040` has a repository-only technical inventory at
  `docs/PRIVACY-DATA-INVENTORY.md`. It is not a visitor-facing privacy policy,
  legal notice, Cargo route, or publication authorization.
- Preserve the exact first-party storage set: `mms-theme`, `mms-face`,
  `mms-scale`, and `mms-shape` in local storage only after deliberate control
  selection; `mms-render-sequence` in session storage for the current tab.
  The active Touchbaes v10 child removes its legacy Freight-origin placement
  key and does not save current placements.
- Preserve `audit/contracts/low-collection-privacy.json`, the 2026-07-23 live
  evidence, and `validate-low-collection-privacy.py` in the complete Phase 2
  gate. It must reject unrecorded storage, cookie/form/beacon/tracker paths,
  storage transmission, service/link drift, generated-bodycopy resources, CSS
  URL/import additions, unsupported absolute claims, untracked inputs, and any
  unapproved Cargo disclosure.
- The observed service set is MM.S, Cargo build/static/type, Freight, and
  Google Fonts. Provider-side logs and retention were not observable, so never
  turn the record into a claim that the site or its providers collect nothing.
- Round 99 changes repository documentation and tests only. No Cargo/Freight/
  Figma/deployment/public state or protected visual and interaction contract
  changes, and `gold-2026-07-21-responsive-70` remains immutable.
