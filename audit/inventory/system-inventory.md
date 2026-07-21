# MM.S system inventory

Generated deterministically from Phase 1 baseline `2026-07-20T175853-0400-round-80` and Round 80 stable source. This is an inventory, not a findings or remediation report.

## Baseline contract

- Stable reference: `round-80-stable` at `d40b930b29bea66a63c2a3a5aa244b03da5a65cf`.
- Protected reference: `round-69-gold` at `18093409423fb5d268d64e049c31a91bbb78d51a`.
- Evidence root: `docs/audits/2026-07-20T175853-0400-round-80`.
- Root manifest: 122 of 122 entries verified; SHA-256 `efe8a99a378e769db0fd4cf1fbc10033096673d66a5acce00192f1b7198983a6`.
- External systems were read-only during capture; this generator performs no network or platform writes.

## Figma design source

The read-only `web design` capture (`aaJEv2Z8j6HaegMHou4N09`) contains **6 variable collections**, **119 variables**, **71 component/component-set records**, and **8 approved reference endpoints**.

| Collection | Modes | Variables |
|---|---|---:|
| Primitives | Value | 11 |
| Color | White, Black, Girly, Quirky, Contrast | 6 |
| Space | Desktop, Mobile, Desktop 1800, Desktop 2560 | 48 |
| Type Scale | Medium, Small, Large, XL | 32 |
| Typeface | Serif, Sans, Mono, Gothic | 9 |
| UI State | State | 13 |

| Endpoint | Node | Size | Layout |
|---|---|---|---|
| home / desktop — rework (WIP) | `83:251` | 1440 x 942 | NONE |
| home / mobile | `11:31` | 390 x 844 | VERTICAL |
| who / desktop | `502:466` | 1440 x 942 | NONE |
| who / mobile | `638:432` | 390 x 1279.1400146484375 | VERTICAL |
| write / desktop | `532:1208` | 1440 x 942 | NONE |
| write / mobile | `640:448` | 390 x 1938 | VERTICAL |
| Control Panel | `1:1039` | 200 x 248 | VERTICAL |
| Control Panel / Sheet | `1:2899` | 390 x 178 | VERTICAL |

Capture limitation: full-file and full Home-page traversal exceeded the Figma bridge request window and returned HTTP 504. The inventory retains approved Home endpoints and screenshots, variables, components, and the other page inventories; the unavailable scope is the complete full Home tree.

## Pages and shared shell

| Page | Public route | Cargo page ID | Primary content |
|---|---|---|---|
| Home | `https://mmmmm.studio/` | `I2398594830` | 13 showcase bands, 68 media items |
| Write | `https://mmmmm.studio/write` | `P0060651058` | 5 writing pieces |
| Who | `https://mmmmm.studio/who` | `B2402536676` | 2 founder profiles |

Every page includes the compact header, expanded rail, compact navigation, live clocks, and the shared non-modal control panel. Both wordmark surfaces link to `/`.

## Home showcase bands

| Order | Band | Project heading | Media | Policies |
|---:|---|---|---:|---|
| 1 | `eviive` | EVIIVE 2025 – Brand identity and web design • Biotech | 6 | crop 6 |
| 2 | `v7` | V7 Labs 2026 – OOH campaign graphic and motion design • Artificial Intelligence | 6 | crop 5, interactive 1 |
| 3 | `touchbaes` | touchbaes 2026 – Brand identity, illustration and 3d animation • Fashion & Beauty | 7 | artwork 1, crop 5, interactive 1 |
| 4 | `mandy` | Mandy Ma & Co. 2026 – Graphic design • Fashion | 7 | artwork 2, crop 5 |
| 5 | `loop` | Loop Financial 2025 – OOH campaign graphic and motion design • Fintech | 5 | crop 5 |
| 6 | `montran` | Montran 2025 – Brand identity, web development, graphic and motion design • Fintech | 6 | artwork 1, crop 4, interactive 1 |
| 7 | `anyday` | AnyDay Financial 2024 – Brand identity, graphic and motion design • Fintech | 5 | crop 5 |
| 8 | `kelly` | Kelly’s Kelly 2025 – Graphic design • Editorial | 4 | crop 4 |
| 9 | `curate` | Curate Health 2024 – Graphic design • Wellness | 4 | crop 4 |
| 10 | `randompics` | -- | 1 | crop 1 |
| 11 | `purelove` | PURE LOVE（純愛） 2024 – Art direction • Personal project | 5 | artwork 1, crop 4 |
| 12 | `deadgood` | Dead Good 2023 – Brand identity and graphic design • Photography studio | 5 | crop 5 |
| 13 | `wtw` | WTW? (What’s the Word?) 2023 – Brand identity and graphic design • Entertainment | 7 | artwork 1, crop 6 |

## State system and startup

The control state is `5` themes x `4` typefaces x `4` scales x `3` shapes = **240** combinations.

- Themes: `white, girly, quirky, contrast, black`.
- Typefaces: `serif, sans, mono, gothic`.
- Scales: `s, m, l, xl`.
- Shapes: `straight, rounded, oval`.
- Fresh default: `{'theme': 'white', 'typeface': 'serif', 'scale': 'm', 'image_shape': 'straight'}`.
- Startup: 4 hard cuts x 375 ms = 1500 ms, then exact stored/default restoration.
- Frozen runtime marker: `responsive-70` ({'responsive-70': 2}); head marker `49`.

## Media and embeds

Home owns 68 media items: {'iframe': 3, 'img': 38, 'video': 27}. The frozen Freight manifest covers 103 underlying objects and records SHA-256 for every response.

| Embed | Active version | Delivery | Reproducible from tracked source | Ready contract |
|---|---|---|---|---|
| v7-cup | three-r160 | `https://freight.cargo.site/m/Z3031274916472238420423367767865/coffee-cup-bundle.html` | false | `{"__mmsEmbedReady": 1, "kind": "v7-cup"}` |
| touchbaes | 10 | `https://freight.cargo.site/m/E3031754669080377521238157342521/touchbaes-sticker-game-v10.html` | true | `{"__mmsEmbedReady": 1, "kind": "touchbaes"}` |
| montran-booklet | 17 | `https://freight.cargo.site/m/U3034412351395654863674388559673/montran-booklet-direct-pdf-v17.html` | false | `{"__mmsBookletReady": 1, "kind": "montran-booklet", "version": 17}` |

Video delivery uses deferred sources, posters, muted inline autoplay, proximity preloading, and visibility pausing. The parent validates iframe source windows and message kinds; wildcard-origin messages remain in the V7/Touchbaes/generic visibility contracts and are recorded for later security audit.

## Cargo platform and metadata

- Site ID `3626191`, Cargo version `Cargo3`, domain `mmmmm.studio`, homepage `I2398594830`.
- Global CSS: 86,129 bytes, SHA-256 `756d73e5e63bfd4551326e06888ba93574601837a9fbf552ffb3fac4d7710bb3`.
- Deterministic local CSS bundle: 78,609 bytes, SHA-256 `ee1c2af629f8f31c765fd43b52264d0768baf02144e7055f41b31281ed030af0`.
- Cargo-managed font blocks: 3; these are preserved rather than generated by the local CSS composer.
- Custom head enforces `viewport-fit=cover` and removes theme-color and Apple standalone/status metadata.
- All three captured public routes returned 200 with zero redirects and no canonical link elements. robots.txt, sitemap, redirect rules, and complete page settings were not part of Phase 1 and remain explicit evidence gaps.

### Cargo override contracts

| Contract | Selectors | Required behavior |
|---|---|---|
| wrapper_transparency | `html[data-mms-site] .page, html[data-mms-site] .page-layout, html[data-mms-site] .page-content, html[data-mms-site] bodycopy` | Cargo wrappers remain transparent so the MM.S composition and edge-to-edge media own the visible surface |
| layout_width_and_padding | `html[data-theme] .page-layout, html[data-theme] .page-content` | removes Cargo max-width and page-content padding |
| bodycopy_width | `html[data-theme] bodycopy` | removes Cargo bodycopy max-width so the internal responsive grid owns width |
| pinned_page_suppression | `html[data-theme] .page.pinned` | hides Cargo's pinned duplicate page surface |
| compact_dialog_portal | `dialog.mms-panel` | the one non-modal dialog is moved under body in compact mode so fixed positioning is not trapped by transformed Cargo wrappers, then restored to the expanded rail |
| mobile_offset_neutralizer | `.mms, .mms *, .mms-rail, .mms-panel, .mms-main, .mms-river, .mms-desc` | reasserts owned margins and padding after Cargo's generated #mobile-offset-styles clones |

The neutralized Cargo wrapper stack is `.page > .page-layout > .page-content > bodycopy > .mms`. The compact dialog is portaled outside transformed wrappers, pinned duplicates are suppressed, and the mobile-offset neutralizer must stay after general spacing rules.

## Browser capabilities and fallbacks

| Capability | Captured use | Fallback |
|---|---|---|
| CSS Grid, Flexbox, clamp, and sticky positioning | responsive shell, bands, panels, and fluid grid | no polyfill captured; unsupported browsers receive normal CSS cascade where declarations are ignored |
| native horizontal overflow and touch panning | portfolio rivers remain natively scrollable by touch and trackpad | desktop scrubbers add pointer and keyboard scrolling; native overflow remains the base interaction |
| HTMLDialogElement non-modal show/close | one control panel moves between compact body portal and expanded rail | no dialog polyfill is captured; the source open attribute preserves expanded initial visibility but compact behavior requires dialog methods |
| localStorage | persists theme, typeface, scale, and shape | all storage access is guarded by try/catch and defaults remain available |
| sessionStorage | avoids repeating the prior startup sequence signature | try/catch makes signature persistence optional; a new sequence is still generated |
| cryptographic random values | randomizes startup combinations | explicit Math.random fallback |
| matchMedia, reduced motion, and Save-Data | selects compact/fine-pointer behavior and skips startup motion for user or network preference | absent APIs evaluate as not reduced and not Save-Data; core content remains available |
| requestAnimationFrame | startup hard-cut paint confirmation and scrubber synchronization | explicit 16 ms setTimeout fallback for the startup controller; no general animation polyfill captured |
| IntersectionObserver | prewarms rivers and activates deferred video/iframe sources near the viewport | explicit eager activation of every deferred element when unavailable |
| ResizeObserver | updates scrubbers, Montran map fit, and compact header measurements | load/resize/orientation listeners and scheduled measurements are retained; no ResizeObserver polyfill captured |
| muted inline autoplay and posters | plays motion inline on iOS while preserving a static first frame until readiness | play rejection is caught and the poster/background remains visible |
| visibility lifecycle | pauses/resumes video and notifies iframe motion when the page or media is not visible | if messaging is unavailable, posters and document content remain; iframe internal motion control is not guaranteed |
| validated iframe postMessage | accepts ready messages from the expected V7, Touchbaes, and Montran frame | iframe posters remain until a valid ready message; outbound visibility/mode messages use captured wildcard targets |
| WebGL embed | renders the V7 Three.js cup inside a cross-origin Freight iframe | static iframe poster remains until the validated ready signal; no alternate live renderer captured |
| PDF canvas and HTTP range transport | renders the Montran booklet selectively inside a Freight iframe | the frozen manifest records range transport and a 1600 px ceiling but does not prove the active full-download fallback; the poster/loader is the captured parent fallback |
| viewport-fit and safe-area environment variables | allows content bleed while protecting compact header and panel controls on iOS | regular viewport padding and a 1 px sampler minimum apply when safe-area values resolve to zero |
| Pointer Events and keyboard control | drag/tap interactions plus scrubber arrows, page keys, Home, and End | native river scrolling remains available where custom pointer handling does not own the gesture |

## Runtime origin boundaries

| Origin | Classification | Runtime role | Frozen evidence |
|---|---|---|---|
| `https://mmmmm.studio` | first-party-document | published HTML document, navigation targets, site metadata and RSS | `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/identity.json`, `docs/audits/2026-07-20T175853-0400-round-80/public/home.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/public-baseline.json`, `docs/audits/2026-07-20T175853-0400-round-80/public/who.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/write.html` |
| `https://cargo.site` | platform-vendor-identity | Cargo 3 service vendor represented by the frozen site identity | classified contract; no literal URL observed |
| `https://freight.cargo.site` | platform-cdn-and-cross-origin-embed | images, video, posters, PDF, V7/Touchbaes/Montran iframes | `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/home.bodycopy.html`, `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/who.bodycopy.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/home.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/public-baseline.json`, `docs/audits/2026-07-20T175853-0400-round-80/public/who.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/write.html` |
| `https://static.cargo.site` | platform-static | Cargo-managed static UI and favicon assets | `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/global.css`, `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/identity.json`, `docs/audits/2026-07-20T175853-0400-round-80/public/home.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/who.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/write.html` |
| `https://build.cargo.site` | platform-frontend-stylesheet | Cargo frontend CSS loaded by each published document | `docs/audits/2026-07-20T175853-0400-round-80/public/home.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/who.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/write.html` |
| `https://type.cargo.site` | platform-font-cdn | Cargo-managed webfont files referenced by published @font-face rules | `docs/audits/2026-07-20T175853-0400-round-80/public/home.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/who.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/write.html` |
| `https://api.cargo.site` | operational-api-not-page-runtime | authenticated Cargo capture and deployment readback | `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/identity.json`, `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/pages.json` |
| `https://abcdinamo.com` | font-license-attribution-comment | provider URL present only in captured CSS license comments | `docs/audits/2026-07-20T175853-0400-round-80/public/home.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/who.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/write.html` |
| `http://www.webtype.com` | font-license-attribution-comment | provider URL present only in captured CSS license comments | `docs/audits/2026-07-20T175853-0400-round-80/public/home.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/who.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/write.html` |
| `mailto:` | external-protocol-handler | contact action | `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/home.bodycopy.html`, `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/who.bodycopy.html`, `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/write.bodycopy.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/home.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/who.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/write.html` |
| `https://ellacportfolio.com` | outbound-navigation | project or profile destination | `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/home.bodycopy.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/home.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/who.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/write.html` |
| `https://eviive.ch` | outbound-navigation | project or profile destination | `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/home.bodycopy.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/home.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/who.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/write.html` |
| `https://www.linkedin.com` | outbound-navigation | project or profile destination | `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/home.bodycopy.html`, `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/who.bodycopy.html`, `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/write.bodycopy.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/home.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/who.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/write.html` |
| `https://www.touchbaes.ca` | outbound-navigation | project or profile destination | `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/home.bodycopy.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/home.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/who.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/write.html` |
| `https://www.travisleung.com` | outbound-navigation | project or profile destination | `docs/audits/2026-07-20T175853-0400-round-80/cargo-draft/home.bodycopy.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/home.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/who.html`, `docs/audits/2026-07-20T175853-0400-round-80/public/write.html` |

## Third-party and platform dependencies

| Dependency | Version | License evidence | Capability |
|---|---|---|---|
| Cargo 3 | Cargo3 | hosted platform; license not represented in repository | custom HTML, global CSS, page bodycopy, Cargo custom elements |
| Cargo frontend stylesheet | cbf2d0 capture path; package version unresolved | hosted platform; license not represented in repository | Cargo document shell, platform components, base responsive presentation |
| Cargo Freight | platform-managed | hosted platform; asset rights are not captured by the CDN response | immutable media delivery, responsive image renditions, HTTP range requests for PDF |
| PDF.js | 6.1.200 | Apache-2.0 notice present in tracked vendor file | PDF parsing, range transport, canvas page rendering |
| StPageFlip | unresolved; vendored minified file has no version marker | unresolved; no license notice observed in vendored file | desktop fold, drag and tap page turning, page shadow |
| Three.js | r160 | not captured in the frozen embed manifest; no license claim is inferred | WebGL rendering, GLTF loading, animation loop |
| Touchbaes game runtime | 10 | not captured in the frozen embed manifest | pointer and touch drag, responsive size reporting, visibility and mode messages |
| Cargo-hosted fonts | platform-managed | provider attribution comments are captured; complete license texts are not | Cargo Diatype, Cargo Marist, Gaisyr Semi-Mono, TeX Gyre Heros Condensed, UnifrakturMaguntia |

## Build, deployment, and recovery

- `python3 cargo/assemble-pages.py`: generate named-page bodycopy from templates and shared partials.
- `bash cargo/compose-css-bundle.sh`: compose the complete tokens.css plus site.css payload.
- `python3 cargo/compose-persisted-css.py PERSISTED_CSS`: splice the preserved Cargo head, local tokens, all three Cargo-managed text-style blocks, and local site CSS with strict marker/order checks.
- `bash cargo/assemble-test.sh`: assemble the deterministic Home test mirror.
- `bash cargo/assemble-named-pages.sh`: assemble named-page test mirrors.
- `bash cargo/build-motion-posters.sh`: build motion posters.
- `python3 cargo/upload-cargo-assets.py FILE [FILE ...]`: manual authenticated Dia/Cargo drag-and-drop upload plus Freight resource probe. Side effect: writes to Cargo/Freight; never run during read-only audit.

Deployment remains manual and Cargo-specific: compose the complete CSS, preserve the Cargo head and three managed font blocks, replace the complete bodycopy with the UTF-8-safe innerHTML + bubbling InputEvent method, save, reload, and verify persistence. Publication is a separate action requiring explicit authorization.

Rollback evidence is layered: immutable Round 69 gold, Round 80 stable, the hashed Phase 1 baseline, and the deployment ledger.

## Evidence gaps

### Cargo platform configuration

Missing: redirect rules, robots.txt behavior, sitemap behavior, complete page-design settings, social-preview configuration provenance.

Next evidence: authenticated read-only Cargo settings capture plus public endpoint probes.

### Third-party provenance

Missing: StPageFlip version and license notice, Cargo-hosted font versions and licenses, license/owner metadata for every portfolio asset.

Next evidence: vendor lockfile or upstream source record and an asset provenance manifest.

### Reproducible embeds

Missing: tracked V7 source/build command, tracked Montran v17 behavior matching the active bundle.

Next evidence: promote exact active sources and add deterministic bundle tests after audit approval.

### Rendered media requirements

Missing: measured maximum render size by viewport/state, DPR coverage, verified transparency intent for every object, source-file ownership mapping.

Next evidence: Phase 2 browser harness output plus the separate asset manifest.

## Regeneration

```sh
python3 audit/scripts/generate-system-inventory.py
python3 audit/scripts/generate-system-inventory.py --check
```

`--check` first verifies the pinned root SHA256SUMS hash and all 122 frozen Phase 1 entries, then fails if either committed inventory differs from a clean regeneration or if the 13-band, 68-media, 240-state contracts drift.
