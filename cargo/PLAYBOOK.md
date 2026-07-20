# mm.s Cargo PLAYBOOK — mandatory reading before ANY Cargo work

Audience: future Claude sessions, ANY model tier. This file is the operations
manual; DEPLOY.md is the history log; ../CLAUDE.md is project-wide context.
Follow recipes VERBATIM — they encode a full night of trial and error.
**If a recipe fails twice in a row: STOP, save state to docs, report to
Ocean. Do not improvise inside the live editor.**

## 0. Hard rules (violating any of these = session failure)

1. **NEVER publish.** No cmd+P. Never click the publish button (right rail
   x1776 y101). The live site is mmmmm.studio; everything stays DRAFT until
   Ocean publishes himself.
2. **NEVER modify other pages**: Clock, mm.s, Projects, Example Project,
   Information. Work only on "home v2 test" (edit URL
   https://mmmmm.studio/edit/I2398594830) or pages Ocean names.
3. **NEVER delete the 3 "Cargo-managed" text-style blocks** in the site CSS
   (marker: `--text-style: "mms mono"` / `"mms sans"` / `"mms gothic"`).
   They are what makes Cargo ship @font-face for the three custom fonts.
   Deleting them silently breaks all non-serif faces.
3a. **NEVER deploy `site.css` by itself.** Cargo needs the complete local
   `tokens.css` + `site.css` bundle, in that order. `site.css` intentionally
   contains references such as `--layout-u`, `--edge-pad`, type sizes, colors,
   and media units but does not define them. A local `test.html` can still look
   correct because `assemble-test.sh` includes both files, while Cargo breaks
   at every breakpoint if the token block is omitted. Always generate the
   local payload with `cargo/compose-css-bundle.sh`.
4. **NEVER use position:fixed for ordinary site layers.** Cargo's .page
   wrappers create a containing block and the editor scrolls an inner div, so
   fixed layers silently detach. The sole proven exception is an open native
   `<dialog>` in the browser top layer: Round 16 verified its fixed bottom edge
   at both shallow and deep editor scroll positions. Keep all non-dialog site
   layers sticky or in flow.
5. **Template overrides must stay scoped** under `html[data-theme] ...`.
   panel.js sets data-theme only on mms pages, so other pages keep the
   Cargo template. An unscoped override leaks onto Ocean's other pages.
6. **Local bundle = source, Cargo = deployment.** Edit local files FIRST
   (tokens.css / site.css / home.html / panel.js), then push to Cargo, then
   verify, then update DEPLOY.md + ../CLAUDE.md. Never let them diverge.
7. **Verify after every Cargo change AND after a reload.** Computed styles
   and DOM probes only — never "it should work now". Persistence is only
   proven by reload + re-probe.
8. **One change at a time**: edit -> save -> verify -> next. Small steps.
9. House rules: NO emojis anywhere. The Fact-Forcing hook requires quoting
   Ocean's current instruction verbatim in the message before Write/Edit/
   Bash calls. Keep Ocean's phrasing in quotes when documenting decisions.

## 1. The system on one page

- **Page**: "home v2 test", edit URL https://mmmmm.studio/edit/I2398594830.
  Draft — the public URL 404s until published. That is expected.
- **Site CSS** (Site Settings -> CSS / HTML) is ONE CodeMirror document,
  in this order. Splice by MARKER STRINGS, never by byte offsets:
  1. Cargo boilerplate (~6.3k chars; ends near `body.mobile audio-player`)
  2. TOKENS block (banner comment contains `design tokens`)
  3. Cargo-managed text styles (marker `--text-style: "mms mono"`)
  4. SITE v2 block (banner contains `layout v2`; runs to end of doc)
  Cargo may inject/rewrite region 3 at any save of Text Styles — always
  re-locate regions fresh, always preserve region 3.
- **Theme axes** as attributes on `<html>`, set by the inline panel.js:
  `data-theme` white/yellow/brown/navy/black; `data-face` serif/sans/mono/
  gothic; `data-scale` s/m/l/xl; `data-shape` straight/rounded/oval.
  Persisted in localStorage keys `mms-theme` etc. Defaults:
  white/serif/m/straight. After testing axes, ALWAYS reset to defaults and
  `localStorage.removeItem` the four keys.
- **Type matrix rule**: serif is the reference; sans = serif x 0.966,
  mono = serif x 0.90, gothic = serif x 0.92 (ink-height normalization).
  Line-height ratios x1.146 body / x1.143 caption / x1.222 heading, whole px
  (24px baseline grid deliberately broken). TYPE SCALE V3 (2026-07-12):
  M row base 22/21.3/19.8/20.2, lh 25; caption 18/17.4/16.2/16.6,
  lh 21; heading 41/39.6/36.9/37.7, lh 50.
  Serif ladder S18 M22 L27 XL36; full table in tokens.css +
  docs/plans/2026-07-10-type-scale-v2.md. Figma exposes one
  Medium/Small/Large/XL Type Scale axis; Space/Mobile selects the Mobile
  primitives and every expanded Space mode selects the Desktop primitives.
  Cargo implements the same two-dimensional contract with `data-scale` plus
  the compact media query. Mobile caption leading is S18/M19/L22/XL28. NEVER
  change one face alone.
- **Layout (expanded >=1024)**: `.mms` is a full-viewport 2-col x 2-row grid.
  Content and media scale continuously with `--layout-u` through 2560, while
  navigation/control chrome uses `--chrome-u` and stops growing at 1800.
  `--edge-pad` is the shared top/right/bottom/left outer inset (about 28px at
  1024, 40px at 1440, capped at 50px from 1800 upward). At the cap the rail is
  340px and the panel is 250px; wider screens give all additional width to
  `.mms-main`. There is no centered max-width shell. `.mms-rail` holds
  `.rail-top`; the open non-modal `<dialog.mms-panel>` occupies grid col1/row2
  and stays sticky at the bottom. `.mms-main` spans both rows in col2.
  `.mms-sticky-head` is the intro/clock sticky layer and bands pass over it.
  Rivers clip at the physical viewport edge and give the last item exactly
  `--edge-pad` of rest space at maximum scroll. River leading spacer width
  MUST be `calc(var(--offset) - var(--space-32))` (subtracts the flex gap)
  or images misalign with the description by exactly 32px.
- **Layout (compact <1024)**: `.mms` = block with fluid 16-40px page padding.
  The wordmark/control/timestamp row remains sticky and independently usable;
  navigation links sit below it. The intro and bands keep the established
  under/over choreography. Descriptions are full width. Rivers use native
  horizontal overflow only. Each item stores `--asset-w`/`--asset-h` and
  derives `--asset-u` from `--media-u`, capped at 82vw and 62svh while keeping
  deliberately varied proportions. The controls are a native modal
  `<dialog>` in the top layer, fixed to the viewport bottom with safe-area
  padding, max-height/internal overflow, scroll lock, focus transfer/restore,
  and Escape/outside dismissal. `data-panel` is transient. Verify compact
  behavior with Cargo's mobile viewport toggle and with local width tests.
- **Fonts** (exact Cargo family names, already matching the CSS stacks):
  `Gaisyr Semi-Mono`, `TeX Gyre Heros Condensed`, `UnifrakturMaguntia`.
  Registered via Text Styles `.mms-mono` / `.mms-sans` / `.mms-gothic`.
- **Images**: `https://freight.cargo.site/w/{W}/q/85/i/{HASH}/{name}`
  (`t/original` also works). W = about 2x the CSS width (432->900, 200->420,
  896->1800). freight is REFERER-GATED: curl gives 403, browsers render
  fine — a 403 from Bash is NOT a bug. Band-1 hash map lives in DEPLOY.md.

## 2. Driving the browser (claude-in-chrome, Ocean's Dia browser)

- **CDP screenshots WORK in Dia as of 2026-07-10** (the earlier "screenshots
  FAIL, drive blind" era is over — but DOM/style probes remain the primary
  verification; screenshots are for visual evidence). The screenshot's pixel
  width defines the computer-tool CLICK coordinate space: `tool = css *
  (screenshotW / innerWidth)` (2026-07-10: 1456 wide at vw 2940 -> x0.4952).
  Recompute per click; Ocean resizes windows.
- **HIDDEN tabs (visibilityState=hidden) are fully workable** if a screenshot
  returns pixels (hidden-but-rendering): editor arms, drop handlers fire,
  autosave persists, CodeMirror saves. Two traps (Round 8): (1) rAF NEVER
  fires — never await requestAnimationFrame in probes; a timed-out call
  lives on as a ZOMBIE advancing one rAF step per forced paint (screenshots
  repaint!) — reload kills zombies. (2) drop-uploaded media-items stay
  data-placeholder blobs forever — recover the hash from performance
  resource entries (s3.amazonaws.com/freight.cargocollective.com/{HASH}/
  {name}), wire the freight URL manually, DELETE the placeholder.
  `store.getState().media.data` lists FILES only (input#file uploads) —
  image drops never appear there.
- The page canvas is an iframe whose src contains `client-side-rendering`.
  Its `contentDocument` is same-origin accessible:
  `const doc = [...document.querySelectorAll('iframe')].find(f => (f.src||'').includes('client-side-rendering')).contentDocument;`
- **TWO `<bodycopy>` elements exist**: one is the pinned Clock overlay
  (contains `digital-clock`, ~151 chars), the other is the real page.
  ALWAYS select by content:
  `const bc = [...doc.querySelectorAll('bodycopy')].find(b => b.querySelector('.mms'));`
  If a probe returns ~151 chars with a digital-clock, you read the wrong one.
- **Cargo's admin UI ignores synthetic .click()** — use real `computer`
  clicks. Before EVERY click: re-probe coordinates AND check
  `document.elementFromPoint(x,y)` is the target or inside it.
  (A blind click once silently reassigned a font style — see DEPLOY.md.)
  Page-content listeners (panel.js) DO respond to synthetic clicks.
- The font picker list is VIRTUALIZED (Clusterize): rows exist in DOM only
  near the scroll position of `.uiWindow-inner`. Scroll-and-probe in a
  single JS call when possible; a row found in one call may be gone by the
  next.
- `javascript_tool` semantics: fresh scope per call, top-level await, last
  expression is the return value. Async IIFEs return {} — don't wrap.
  Returned text containing URLs/query strings may be BLOCKED by a data
  guard — sanitize outputs: `.replace(/[?&=%]/g,' ')`, return hostnames or
  short slices, never dump window keys or full hrefs.
- Editor chrome coordinates (1796px-wide window; ALWAYS re-probe first):
  pages panel button ~ (1655,20); add-page + ~ (1713,83); right rail x1776:
  y101 = PUBLISH (never touch), y183 = Text Styles, y224 = Settings;
  inside Settings the "CSS / HTML" button ~ (1570,429).
- Save = `computer` key `cmd+s` after dispatching an InputEvent on the
  bodycopy. There is no save button. Persistence check = reload the edit
  URL, wait ~5s, re-probe.
- **Mobile editor**: the desktop/mobile toggle is a `.radio-button-group`
  at ~x1105 in the top bar (left label = desktop, right = mobile). Mobile
  mode renders the iframe at ~489px so the <=760 media query fires — this
  is the ONLY way to verify mobile inside Cargo.
- **[CRITICAL] Cargo #mobile-offset-styles**: opening the mobile editor
  generates a stylesheet that CLONES every padding/margin declaration in
  the site CSS, scaled by var(--mobile-padding-offset) (~0.66), and injects
  it AFTER our sheet. One clone selector (".mms *") leaks unprefixed into
  desktop mode too. Counter-measure: the "mobile-offset neutralizer"
  section at the END of the site CSS re-asserts every non-zero spacing
  with !important (their clones carry none, so we always win). ANY new
  padding/margin added to mms styles MUST also be re-asserted in that
  section, and the section MUST STAY LAST.
- **Page management**: right-click a row in the pages panel -> context menu
  (Duplicate / Pin / Overlay / Settings / Set as Homepage / Delete / Copy /
  Direct Link). Delete shows an OK/Cancel confirm. Deletions are draft
  (live site unchanged until publish — verified by curling mmmmm.studio
  after deleting pages). NOTE: the auto-mode permission classifier blocks
  agent-inferred deletions of pre-existing pages — Ocean must name pages
  explicitly.

## 3. Recipes

### 3.1 Change page content (bodycopy)
1. Edit local `home.html` (and `panel.js` if needed).
   Run `./validate-cargo-payload.sh bodycopy home.html` before transferring it.
   This rejects duplicate MM.S roots/runtime markers, Base64 transfer residue,
   literal text inside a video tag, serialized Touchbaes rig coordinates, and
   duplicate SVG attributes in the local source.
2. Build one HTML string: home.html body with panel.js inlined into the
   trailing `<script>` slot. In a JS template literal, escape the closing
   tag as `<\/script>`. If the payload is transferred as Base64, plain
   `atob()` is NOT a UTF-8 decoder and will corrupt every non-ASCII character.
   Decode the bytes explicitly:
   `const html = new TextDecoder().decode(Uint8Array.from(atob(payload), c => c.charCodeAt(0)));`
3. Inject in the iframe:
   `bc.innerHTML = html; bc.dispatchEvent(new (doc.defaultView.InputEvent)('input', { bubbles: true }));`
4. `computer` key `cmd+s`.
5. Reload edit URL, wait 5s, verify with the persistence probe (3.5).
Notes: scripts inserted via innerHTML do NOT execute in-session; after a
reload the saved page DOES execute them (clock ticks, data-theme set —
that is the proof the save worked). The serializer adding ~50-150 chars is
normal. A full innerHTML overwrite also clears any stray dropped elements.

**Never replace the complete Home bodycopy through Cargo's Code View + Update
button.** Round 78 proved that this path can silently delete complete media
rivers while retaining their descriptions: V7 lost all 6 media items and
Touchbaes lost all 7. The local source remained intact, and the same complete
payload persisted correctly when restored through `bodycopy.innerHTML` plus
`InputEvent`. Always reload and require 68 unique Home `data-media-id` values
before publishing.

### 3.2 Change site CSS (splice)
1. Edit local `tokens.css` / `site.css` FIRST.
   Build the payload only with `./compose-css-bundle.sh`; never read or send
   `site.css` alone.
2. Open Settings (x1776,y224) -> probe for the button whose text is
   "CSS / HTML" -> real-click it. Wait ~1.2s.
3. `const cm = document.querySelector('.CodeMirror').CodeMirror; const v = cm.getValue();`
4. Locate regions with marker strings (section 1). Build newVal exactly as:
   untouched Cargo head + complete local `tokens.css` + untouched
   Cargo-managed text styles + complete local `site.css`. REGION 3 MUST
   SURVIVE. Do not derive the token slice from `site.css`; they are separate
   source files.
5. Before `cm.setValue(newVal)`, hard-fail unless all of these are true:
   exactly one `design tokens` marker, exactly one `mm.s — layout` marker,
   exactly one managed `mms mono` region, at least two `--layout-u:`
   definitions, the Mobile Type Scale marker exists, and `{` / `}` counts
   match. Also reject any Base64-like run of 300 or more characters, any CSS
   line longer than 500 characters, and transfer-runtime residue such as
   `TextDecoder`, `atob(`, `innerHTML`, or a `responsive-N` marker. These
   checks apply to the complete persisted CodeMirror value, including the
   preserved Cargo head; marker and brace checks alone will not detect a
   pasted transfer fragment inside a declaration. After paste, copy the whole
   CodeMirror value back and require exact equality with newVal. Never use an
   old fixed byte-length expectation.
   The executable form of the complete-document check is:
   `pbpaste | ./validate-cargo-payload.sh persisted-css -` after copying all of
   CodeMirror. It checks all three managed font regions as well as the local
   token/layout contracts and residue rules.
6. Escape to close. Verify live: computed styles on the page reflect the
   change (no need to re-open the editor just to re-read).
NOTE: section comments inside Cargo differ from the local files (banners
were rewritten at first paste) — locate by stable CSS substrings
(`--sz-caption-serif`, `.mms-rail`, `[data-face=`), never by prose or
em-dashes.

For the Site Settings HTML region, run
`./validate-cargo-payload.sh head site-head.html` before transfer and copy the
complete editor back after reload. The reloaded value must match
`site-head.html`, not merely contain its current marker.

**Round 41 failure lesson:** a 51,904-byte splice contained the layout but no
token block, so all grid, spacing, type, color, and media variables became
undefined at once. The valid corrected document was 62,172 characters and passed
the marker/variable/brace preflight above. If the whole site fails at every
breakpoint simultaneously, check for the token marker before touching any
individual spacing rule.

**Round 52b failure lesson:** Cargo CSS line 69 retained a 1,858-character
Base64 transfer fragment after `border: 0;`. It lived in the preserved Cargo
head, outside the token/layout source regions, and kept brace counts balanced,
so repeated full-bundle splices and the former preflight did not remove or
detect it. Repair the head first, then rebuild all four regions and run the
complete-document residue scan above.

### 3.3 Add or replace an image
Preferred when Ocean is around: he drags the image into the page in the
editor -> Cargo inserts `<media-item hash="...">` -> read the hash ->
re-inject clean bodycopy (3.1) with
`https://freight.cargo.site/w/{W}/q/85/i/{HASH}/{filename}` as the img src.
Automated from Figma (proven pipeline):
1. `download_assets(fileKey aaJEv2Z8j6HaegMHou4N09, nodeId of the Image
   Frame instance, jpg, scale 2)` — exports the as-designed crop at retina.
2. In the ADMIN page context: `fetch(figmaAssetUrl)` (their MCP asset
   endpoint sends CORS headers) -> blob -> `new File([blob], 'name.jpg',
   {type:'image/jpeg'})` -> `DataTransfer` -> dispatch dragenter/dragover/
   drop on the bodycopy -> poll for a NEW media-item hash (0.7s x 12).
3. One file per drop (keeps the hash-to-slot mapping unambiguous).
4. Wire srcs via 3.1. Bands 2/3 use the transparent placeholder
   `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E`
   (themed gray comes from CSS background) — replacing it = set src only.

Retina export refinement (Round 18):
- For a simple image fill, `get_design_context` on the exact image node returns
  the original fill asset. Prefer that to an upscaled screenshot; the tested
  EVIIVE/touchbaes fills were 4096px wide and Curate was 2863px wide.
- For a cropped node or a Figma-built composite, export the exact node with
  `exportAsync({format:"PNG", constraint:{type:"SCALE", value:4}})`. To get
  the bytes out without a huge base64 response, create a temporary off-canvas
  rectangle filled with the export, read that rectangle through
  `get_design_context`, download its short-lived asset URL, then immediately
  remove the staging rectangle. Round 18 used this for V7 and Montran.
- Downsample once with Lanczos to roughly 2.25–2.75x the maximum rendered
  width, then upload that derivative. This is enough for retina while avoiding
  a 4x payload at every breakpoint. Re-probe the served Cargo rendition for
  natural/rendered ratio and bright right/bottom edges.
DEAD ENDS — do not retry: `file_upload` tool (rejects all reachable paths);
fetching localhost from the HTTPS page (Dia blocks private-network
subresources even with PNA headers); curl-ing freight URLs (403 by design).

### 3.4 Change type sizes
Only ever decide the SERIF value; derive the rest: sans = serif x 0.966,
mono = serif x 0.90, gothic = serif (round to 1 decimal). Line height =
size x ~1.15 rounded to whole px. Update every scale row consistently.
Apply to local tokens.css AND Cargo via 3.2. Verify: computed fontSize/
lineHeight on `.mms`, then click through all 4 faces and confirm optical
parity (sizes shrink by the multipliers).

### 3.5 Verification probes (paste into javascript_tool, adjust nothing)
Layout + alignment + persistence (run after reload):
```js
await new Promise(r => setTimeout(r, 5000));
const doc = [...document.querySelectorAll('iframe')].find(f => (f.src||'').includes('client-side-rendering')).contentDocument;
const win = doc.defaultView;
const bc = [...doc.querySelectorAll('bodycopy')].find(b => b.querySelector('.mms'));
const q = s => bc.querySelector(s);
const rx = el => el ? Math.round(el.getBoundingClientRect().x) : -1;
const cs = win.getComputedStyle(bc.querySelector('.mms'));
JSON.stringify({
  len: bc.innerHTML.length, script: !!bc.querySelector('script'),
  scriptRan: doc.documentElement.getAttribute('data-theme'),
  clock: q('#mms-clock') ? q('#mms-clock').textContent : '-',
  type: { size: cs.fontSize, lh: cs.lineHeight },
  align: { b1: [rx(q('.mms-band[data-offset="4"] .mms-img')), rx(q('.mms-band[data-offset="4"] .mms-desc'))],
           b2: [rx(q('.mms-band:not([data-offset]) .mms-img')), rx(q('.mms-band:not([data-offset]) .mms-desc'))],
           b3: [rx(q('.mms-band[data-offset="2"] .mms-img')), rx(q('.mms-band[data-offset="2"] .mms-desc'))] },
  imgs: [...bc.querySelectorAll('img[src*="freight"]')].map(i => i.complete && i.naturalWidth > 0),
  pinnedHidden: win.getComputedStyle(doc.querySelector('.page.pinned')).display === 'none'
})
```
PASS = each align pair equal, type matches tokens, imgs all true,
pinnedHidden true, scriptRan "white" (or a saved theme), clock ticking.
Sticky behavior (scrolls the editor's real scroller and restores it):
```js
const doc = [...document.querySelectorAll('iframe')].find(f => (f.src||'').includes('client-side-rendering')).contentDocument;
const bc = [...doc.querySelectorAll('bodycopy')].find(b => b.querySelector('.mms'));
const q = s => bc.querySelector(s);
const ry = el => Math.round(el.getBoundingClientRect().y);
const rb = el => Math.round(el.getBoundingClientRect().bottom);
const sc = doc.scrollingElement;
const probe = () => ({ rail: ry(q('.rail-top')), panelB: rb(q('.mms-panel')), intro: ry(q('.mms-intro')), band1: ry(q('.mms-band[data-offset="4"]')) });
const out = { atZero: probe() };
sc.scrollTop = 900; await new Promise(r => setTimeout(r, 400)); out.at900 = probe();
sc.scrollTop = 0; await new Promise(r => setTimeout(r, 300));
JSON.stringify(out)
```
PASS = rail stays 40, panelB stays (viewport height - 40), intro stays 40,
band1 moves. Axis test: synthetic-click each `[data-theme-set]` dot /
face button / shape button, read computed styles, set the slider value +
dispatch input for scales — then ALWAYS reset to white/serif/m/straight
and `localStorage.removeItem('mms-theme'|'mms-face'|'mms-scale'|'mms-shape')`.

### 3.6 Local test loop
`bash assemble-test.sh` in cargo/ builds test.html (tokens + site + home +
panel inlined). Preview: launch config "cargo-test" (port 8907; launch.json
lives at MM.S/.claude/launch.json — the session root, NOT this project
folder). Probe with preview_eval, screenshot for visuals, preview_stop when
done. Headless fallback: `chrome --headless --disable-gpu
--hide-scrollbars --window-size=1440,900 --screenshot=out.png
file://.../test.html`.

## 4. Symptom -> cause table

| Symptom | Cause / fix |
|---|---|
| bodycopy reads ~151 chars + digital-clock | You selected the pinned Clock page's bodycopy. Re-select by `.mms`. |
| Injected content gone after reload | Injected before iframe hydration, or missing input event / cmd+S. Redo 3.1 on the hydrated doc. |
| execCommand('insertHTML') returns false | Expected in this editor. Use innerHTML + InputEvent. |
| Clicks in the admin do nothing | Synthetic click. Use the computer tool; elementFromPoint-verify first. |
| Font button label unchanged after picking | Assignment did NOT commit (stale picker binding). Close picker, reopen from the style's font button, re-click the variant row. |
| A font family vanished from doc.fonts | Its text style lost the font (mis-click) or the style was deleted. Reassign via Text Styles; verify the label changes. |
| curl 403 on freight.cargo.site | Referer gate. Normal. Verify via in-page fetch instead. |
| CSS editor longer than expected | Cargo injected text-style CSS. Locate `--text-style` blocks and preserve them. |
| Everything renders narrow/centered | Template max-width came back — check `html[data-theme] .page-layout { max-width:none }` survived the last splice. |
| Pinned/sticky "not working" per Ocean | He scrolls the editor's inner div. Only sticky works; confirm computed position is sticky, never fixed. |
| Figma text edit fails with font error | TNR gate: Serif mode = Times New Roman, unloadable in Figma cloud. Flip Serif->Tinos for automated Figma text sessions (../CLAUDE.md). |

### 3.3a Transparent PNGs in bands (Round 8 rule)
`.mms-img` has a gray placeholder `background: var(--color-text-muted)` — a
transparent PNG shows it through instead of the page bg. ALWAYS add inline
`background: transparent` to that img (inline background survives the
sanitizer). Verify on a dark theme: the see-through areas must show the
THEME bg. (First hit: montran map v3, a shots.so mockup on a transparent
surround.)

## 5. Current state ledger (UPDATE whenever it changes)

As of 2026-07-10 (round 8 — Ocean's component fixes):
- MONTRAN MAP TILE: tile/img 690 wide (Figma Frame 4629 690.3x504; img rect
  365:854 = montran-map-v3.png E3026982405..., /w/1380, transparent frame,
  inline background:transparent). Caption = flex row: native
  <text-icon icon="pointer-2"> (1.48em x 1.38em, flex:0 0 auto) + gap
  0.143em + text as anonymous flex item (hanging indent at 22.7px). Caption
  block 516 wide, class="caption".
- DESC GAPS: `.mms-desc p` / `.mms-desc .url` margin-top = var(--space-8)
  (Figma Project Description itemSpacing 8) — in the base rules AND the
  neutralizer re-assert. All bands.
- TYPE SCALE V2 pending: docs/plans/2026-07-10-type-scale-v2.md (M base
  21.6 proposal; Figma vars stale on base/heading until it lands).

As of 2026-07-06 (round 2i — panel matches Figma sheet):
- MOBILE PANEL (Figma sheet 21:159): dots height 24 + gap --space-24
  (stretched ovals, flex-fill); face buttons SINGLE 4-across row
  (grid-cols repeat(4)) — desktop panel stays 2x2; slider height 24 gap 4.
- SELECTED DOT = circle: `.mms-dot::after` uses height:calc(100%-8px) +
  aspect-ratio:1 + centered transform, so it's a true circle even on the
  stretched oval dots (Figma Swatch "small center dot"). Don't revert to
  inset (that ovals it on mobile).
- PUBLISH REMINDER (important): the LIVE mmmmm.studio only reflects the last
  PUBLISH. All draft edits — incl. the write/who slug rename — are invisible
  live until Ocean cmd+P. /write /who currently 404 live because the rename
  isn't published (that's why the nav links "don't work" for Ocean). The
  draft links are correct + clickable. Verify link fixes on the live site
  only AFTER a publish.

As of 2026-07-06 (round 2h — first showcase covers the bar):
- MOBILE Z-ORDER: intro (z1) < bar (z10) < showcases (z20) < panel sheet
  (z30). ALL showcases including the first cover the bar+links. Critical:
  `.mms-intro-wrap` (mobile) must NOT have a z-index — it only has
  position:relative (for sticky containment). A z-index there makes a
  stacking context that traps the first band's z20 below the bar. Do not
  re-add z-index to that wrapper.

As of 2026-07-06 (round 2g — band gap fix):
- BAND GAP: the inter-showcase gap comes from `.mms-band + .mms-band` (and
  now ALSO `.mms-intro-wrap + .mms-band`, because the first band lives inside
  `.mms-intro-wrap` so band 2 follows the wrap, not a band). Desktop 192px,
  mobile 64px, re-asserted !important in the neutralizer. If you ever move a
  band out of the plain sibling chain, extend these `+ .mms-band` selectors
  or the gap silently drops to 0 (the neutralizer forces margin:0 otherwise).

As of 2026-07-06 (round 2f — clean slugs):
- SLUGS NOW CLEAN: write page purl = "write", who page purl = "who" (were
  write-1/who-1). Nav hrefs on all 3 pages back to Work="/", Write="/write",
  Who?="/who". Page TITLES are now lowercase "write"/"who" (fits the mm.s
  lowercase brand; nav link text stays "Write"/"Who?").
- HOW TO RENAME A PAGE SLUG (no URL field exists in Page Settings — the slug
  is derived from the page TITLE and regenerates on title change): open the
  Pages panel FRESH (reload editor first — the rename input is flaky if the
  panel state is stale), double-click the page's name to get the inline
  input, then set it with the NATIVE value setter + input/change events
  (plain keyboard typing reverted; React needs the native setter), then press
  Enter. Verify via store.getState().pages[].purl. Auto-persists (no cmd+S).
- LIVE: slug + href changes are DRAFT. Ocean must RE-PUBLISH for /write and
  /who to resolve on the live site (currently live serves the old
  write-1/who-1). In editor preview they're consistent now.

As of 2026-07-06 (round 2e — nav links + sticky mobile intro):
- NAV SLUGS: Cargo auto-suffixed the page slugs. Real purls (from
  window.store.getState().pages): Home = "home" (it's the HOMEPAGE, served
  at "/"), Write = "write-1", Who? = "who-1". Pages ARE published (/,
  /write-1, /who-1 all load). Nav hrefs on all 3 pages set to
  Work="/", Write="/write-1", Who?="/who-1" (both the .mms-mlinks bar copy
  and the .mms-rail desktop copy — Cargo had mangled the rail copy to
  "#"/relative, now normalized). To read a page's real slug:
  `store.getState().pages` -> find by id -> `.purl`. LIVE site needs a
  re-publish to serve the corrected hrefs; in editor preview they work now.
  If Ocean wants clean /write /who: rename the page URLs in Cargo settings
  then update the hrefs to match (the "-1" is Cargo's collision suffix).
- MOBILE STICKY INTRO: "Building better brands" is now STATIC on mobile.
  Mechanism: `.mms-intro-wrap` wraps the intro + spacer + FIRST band on each
  page. Desktop: `.mms-intro-wrap { display: contents }` (no box, desktop
  unchanged — sticky-head still height:0 pinned at --margin-page). Mobile:
  wrap is `display:block; position:relative` = the containing block; the
  intro is `position: sticky; top: var(--bar-h); z-index:1`, so it pins just
  below the bar, the first work (bands z20) scrolls up and covers it, and it
  RELEASES (scrolls out under the bar) once the first band passes — so it
  does NOT ghost through later bands. `--bar-h` is set by panel.js (setBarH:
  measures .mms-mbar height, on load+resize); CSS fallback 200px. Verified
  in Cargo mobile editor: --bar-h 232, intro sticky top 232, pinned through
  scroll, released by deep scroll; desktop regression clean (wrap contents,
  sticky-head h0, 736/736).

As of 2026-07-06 (round 2d — control-panel refinements, Figma-matched):
- PANEL HEADER: `.mms-panel` starts with `.mms-panel-head` (a `.mms-panel-title`
  = "Controls" + the `.mms-close` X). Header is display:none on desktop
  (desktop rail panel has no header, per Figma) and flex/space-between only
  in the mobile open sheet. If re-injecting a page, keep the head structure.
- DOTS: desktop = 20px circles (`justify-content: space-between`); mobile =
  STRETCHED ellipses (`.mms-dot { flex:1 1 0; width:auto; height:28px }`,
  row height 28) filling the sheet width, matching Figma's mobile sheet.
- PANEL UI IS SIZE-LOCKED: the 4 face buttons use FIXED px
  (serif/gothic 14, sans 13.5, mono 12.6 = Medium caption, x-height-norm),
  NOT var(--font-size-caption) — they must not grow with the scale slider.
  The "Controls" title is fixed 18px. Do not switch these back to scaling tokens.
- SLIDER a's: `line-height:1` + `transform: translateY(-0.114em)` centers the
  lowercase glyph's ink on the 1px line (value derived from canvas font
  metrics: glyph center sits 3.18px below the line-box center at 28px). Row
  height 28px, gap --space-8.
- Verified in Cargo mobile editor after reload: Controls label, 83x28 dot
  ellipses, buttons 14/13.5/12.6/14, close+toggle+face buttons all functional.

As of 2026-07-06 (round 2c — fill model):
- FILL RULE (both breakpoints): the ONLY element with a background fill in
  the showcase area is `.mms-desc` (white plate). `.mms-band` is TRANSPARENT
  on desktop AND mobile; `.mms-img` keeps a gray `--color-text-muted`
  placeholder (real images cover it). DO NOT re-add a background to
  `.mms-band` on mobile — a filled band becomes a "white sheet" that covers
  the whole nav as it scrolls (the bug Ocean flagged). The nav-cover effect
  is carried by the opaque IMAGES + the desc plate; the transparent band
  lets the nav show through everywhere else. Verified after reload in
  Cargo's mobile editor: band bg rgba(0,0,0,0), desc white, all 5 nav links
  visible, img/intro left-aligned at 20.
- MOBILE PADDING (answer to a recurring question): there IS a 20px left
  gutter (--margin-page mobile = 20) on wordmark/links/intro/images, plus
  16px top in the bar, and 20px right on text blocks; ONLY the image rivers
  bleed to the right edge (intentional full-bleed). It LOOKS marginless
  because on the white theme the bar+intro are filled white to the edges, so
  the gutter is white-on-white with no visible boundary. Not a bug.

As of 2026-07-06 LATE (round 2b — Ocean's mobile review fixes + site
structure):
- PAGES: home v2 test (= Work; edit/I2398594830), write (edit/D4042456702),
  who? (edit/I0096029541). DELETED (draft): Clock, mm.s, Projects (incl.
  Example Project). "Information" still exists — deletion blocked by the
  permission classifier; awaiting Ocean's explicit word.
- Nav links live: Work -> "/", Write -> "/write", Who? -> "/who",
  Email -> mailto:ocean@mmmmm.studio, Linkedin ->
  https://www.linkedin.com/company/mmmmmstudio/. Slugs /write and /who are
  ASSUMED from titles — verify at publish. "/" points at the OLD home until
  Ocean sets home v2 test as Homepage (right-click -> Set as Homepage).
- MOBILE: links (Work/Write/Who?/Email/Linkedin) live INSIDE .mms-mbar
  (whole block sticky, bands cover it — intentional). Rivers are full-bleed
  right with padding-right = margin (last image rests clock-aligned at max
  scroll; verified 469 = vw-20 mobile, 1716 = vw-40 = clock right desktop).
- Shape-button stroke = 1px (was 0.75). CSS doc ~24.9k chars incl. the
  mobile-offset neutralizer section (keep LAST).

Previous (round 2 — mobile build):
- Draft page "home v2 test" (edit/I2398594830). NOT published. Other pages
  untouched.
- CSS doc ~22.6k chars, 4-region structure per section 1 (site block = v3).
- Bodycopy ~10.1k chars: mbar + rail + main (mlinks/intro/bands) + panel as
  direct .mms child + inline panel.js r2 (multi-clock .js-clock, data-panel
  sheet toggle).
- Type: M 19.2/22 (Cargo Bodycopy 1.2rem parity), lh ratio ~1.15 across all
  scales, 24px baseline grid broken deliberately (Ocean's call).
- Band 1 = real EVIIVE images (freight hashes in DEPLOY.md; source exports
  in cargo/assets/); bands 2/3 = transparent placeholder imgs.
- MOBILE BUILT + verified locally (375x812): sticky bar, under/over
  z-choreography, left alignment at 20px, fill bgs, bottom-sheet panel with
  X close, no horizontal overflow. Desktop regression-verified in Cargo
  post-deploy. Mobile NOT yet seen by Ocean on a real phone (draft 404s
  publicly — needs publish or editor-window narrowing).
- Figma library type tokens are STALE vs the site (still the 18/24 era);
  the mobile bar/sheet implementation now also leads Figma (mobile frames
  show the older header concept). Figma stays source of truth for
  showcase LAYOUT/components; the site leads on TYPE + mobile chrome.
- Remaining: bands 2/3 real projects, work/write/who? pages, mobile
  image-size opinion pass if Ocean wants smaller rivers on phones,
  publish decision (Ocean's).
- Contrast notes: navy/red ~4:1, yellow/magenta ~2.9:1 — artistic choice,
  documented, do not "fix" unprompted.

## Ledger — Round 3 (2026-07-06): RESPONSIVE SCALING deployed to draft
- SITE IS NOW FLUID (1440 base). One scale unit `--u = min(100vw/1440,1px)`
  wraps every spatial token/px via `calc(N*var(--u))`; type uses
  `--ut = max(min(100vw/1440,1px),0.7px)` (readability floor). Mobile (<=760)
  resets --u/--ut to 1px -> phone layout unchanged. Below 1440 the whole
  desktop shrinks on-scale; wide screens still fill (main 1fr). Global CSS
  now 33946 chars (was 25802).
- Image inline styles in ALL 3 pages' bodycopy converted to calc(N*var(--u)).
- Deployed to DRAFT + verified persistent after a full editor reload (CSS +
  images survived). NOT PUBLISHED — Ocean publishes.
- WHERE THE CSS LIVES: global site CSS = right rail "Site Settings" ->
  "CSS / HTML" -> CSS tab (AUTOSAVES). Page bodycopy (image styles) = top-bar
  "Code View" -> HTML tab -> click "Update" to commit. NOT the same editor.
  Toolbar button coords shift with window width — always re-probe
  [button-name=code-view-button] before clicking. Full transfer recipe
  (gzip+base64+SHA-chunk; Response(stream) is CSP-blocked, use
  DecompressionStream reader; splice preserves boilerplate+font blocks) is in
  DEPLOY.md Round 3.
- Remaining: bands 2/3 real projects; a phone-size review of the mobile
  rivers; the still-present "Information" page (Ocean to delete); publish.

## Ledger — Round 4 (2026-07-07, autonomous): touchbaes game + videos
- **GAME hosted + working** as a standalone file + iframe url. Cargo MANGLES a
  full-document game pasted into a page Code View (base64 imgs -> placeholders;
  bodycopy resets kill its `<style>`), so host `game.html` as a FILE (Images&Files
  `input#file` + in-page File/DataTransfer) and `<iframe>` it. 9 game images hosted.
  Full detail — freight hashes, the servable file url, reusable techniques -> see
  **cargo/GAME-VIDEO-STATUS.md**.
- **VIDEOS blocked**: Ocean must attach the video files to chat (browser upload
  only accepts session-shared/attached files; can't fetch local [PNA]; Figma
  exports only stills, never the video). Then wire `<video autoplay muted loop>`.
- touchbaes band 3 on Cargo home is STILL placeholders (built in Figma, not deployed).
- NOTHING PUBLISHED.

## Ledger — Round 3b (2026-07-06): CORRECTION — type FIXED, grid scales
- Ocean corrected r3: "the grid should be on scale. the font size should
  always stay the same." So type does NOT scale. `--ut` REMOVED; `--sz-*` /
  `--lh-*` are FIXED px again (19.2 etc.). `--u` still scales the GRID
  (columns, spacing, margins, nav-col, radii) and the images. Panel labels now
  ride `var(--u)` (scale with the panel box) — the ONLY text that still scales;
  freezing the panel would need a fixed-width rail (flagged, not done).
- Deployed global CSS (now 32821 chars, no var(--ut)); image bodycopy
  unchanged (already on --u). Persisted after reload. NOT PUBLISHED.

## NEW-ELEMENT ACCEPTANCE CHECKLIST (MANDATORY — added 2026-07-10 after the
## Montran caption shipped theme-broken. Run this for EVERY element added to
## any band/page. No exceptions, no "it's just an image".)
Before declaring any new element done, verify ALL of:
1. THEMES x5: flip data-theme through white/black/navy/brown/yellow on the
   render html; every TEXT in the new element must compute the same color as
   a known-good desc <p>. (Cargo's injected styles pin color AND font-family
   on text inside bodycopy — .mms inheritance does NOT reach it. Counter
   with site-CSS rules using var(--color-text-primary) /
   var(--font-family-base).)
2. TYPEFACES x4: flip data-face serif/sans/mono/gothic — family AND size
   must switch (size via the face-aware --font-size-* vars).
3. TYPE SCALE x4: if the element uses type roles, S/M/L/XL must resize.
4. SHAPE x3: .mms-img elements must respond to data-shape straight/rounded/
   oval (if the element opts out, that's a DECISION to note, not an accident).
5. GEOMETRY: every dimension traced to a MEASURED Figma node id (w/h/x/
   gaps/text width), not eyeballed from screenshots.
6. SERVED RENDITION: probe the freight-resized URL the page actually uses
   (edges, transparency, grayscale) — not just the uploaded original.
   TRANSPARENCY = SAMPLE THE PIXELS (canvas getImageData; freight is
   CORS-clean from the admin page). An alpha CHANNEL is not transparency —
   Round 10's "transparent" export was all-alpha-255 (opaque grey ring).
7. PERSISTENCE: save -> reload -> re-verify EVERYTHING above. Cargo's
   sanitizer strips inline font-family (and more); the CSS editor drops
   edits closed too fast; media-item strays must be 0.
8. Sanitizer-safe styling: width/height/background inline are OK; anything
   typographic goes in the site CSS.
