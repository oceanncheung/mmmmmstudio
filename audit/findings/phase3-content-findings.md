# Phase 3 content, route, and metadata findings

This is a read-only audit record for the post-Round-80 working tree and the current public `mmmmm.studio` delivery observed on 2026-07-21. It does not authorize Cargo, Figma, route, DNS, or publication changes.

Machine-readable evidence: `audit/findings/evidence/2026-07-21-phase3-content-summary.json`.

## Evidence boundary

- Canonical local sources: `cargo/home.template.html`, `cargo/write.template.html`, `cargo/who.template.html`, their assembled bodycopies, and the shared navigation/head partials.
- Current public routes: `/`, `/write`, `/who`, `/home`, `/information`, slash variants, `www`, a synthetic missing route, and four discoverable historic `/work/*` URLs.
- Public metadata: rendered `<head>`, `robots.txt`, `sitemap.xml`, favicons, Open Graph, and Twitter cards.
- Link checks: all internal navigation, the shared two-recipient email link, individual founder email links, and five HTTP destinations.
- Browser evidence: the tracked published compact/expanded Home and Write captures named and hashed in the machine-readable record.

The local and public rendered copy matches exactly after only whitespace normalization and replacing the live clock with `CLOCK`:

| Page | Local/public normalized text SHA-256 | Result |
| --- | --- | --- |
| Home | `a52c6b5aae17e9fb15f6ca906bcbcfc7a7e728d872893a5352a53a8aaa2c6129` | exact match |
| Write | `43920ccd6988e25f1e2d18d805b8e59edbe093e4b7b5261c71fc816b6372db3a` | exact match |
| Who | `017dca5e88d1dbdd9cea686f5b2a9dd6d8575994506ecbbea4b449a4c7b9856d` | exact match |

No mojibake or replacement characters were found. The current WTW label is `Entertainment`, both shared email recipients are present, and every external HTTP link returned 200.

The missing document language is already recorded in `preliminary-findings.md`; the missing media alternatives and unnamed figures are already recorded in `phase3-runtime-findings.md`. They are corroborated here but not counted again.

## P1 — Home is indexable under multiple hosts and paths without canonicalization

The same rendered Home content is independently indexable at:

- `https://mmmmm.studio/`
- `https://www.mmmmm.studio/`
- `https://mmmmm.studio/home`
- `https://mmmmm.studio/information`
- corresponding trailing-slash variants

`/home` and `/information` have the exact same normalized rendered-text hash as `/`. None of Home, Write, or Who has a `rel="canonical"`. The `www` host returns 200 instead of redirecting to the apex host. Trailing-slash variants also return 200 without normalization. Open Graph `og:url` is not a search canonical.

The sitemap escalates the problem by listing `/information` as a separate URL even though it renders the Home page. `/home` is not in the sitemap but remains indexable because it returns 200 and has no `noindex` directive.

Impact: search signals and backlinks can split across duplicate URLs, crawlers can index duplicate Home results, and Cargo's current sitemap explicitly advertises one duplicate.

Recommendation: make `https://mmmmm.studio/` the one approved authority; 301 the `www` host, `/home`, `/information`, and slash variants to their canonical equivalents. If Cargo cannot express every redirect, add self-referencing canonicals to the three real pages, canonicalize Home aliases to `/`, remove `/information` from the sitemap, and use `noindex` only as a fallback for an alias that cannot redirect.

Decision gate: Ocean must confirm whether `/information` has any legacy use or backlinks before it is removed or redirected. DNS/host redirect work must be verified separately from Cargo page settings.

## P1 — Indexed historic project routes now terminate at an empty 404

A current web search still surfaces historic work URLs, while direct probes return 404 for:

- `/work/whats-the-word`
- `/work/anyday`
- `/work/eviive`
- `/work/montran`

The current Home bands have `data-band` identifiers but no stable fragment `id`, so there is no direct project destination to preserve those old links. The generic 404 has the correct HTTP status but no rendered body, navigation, or recovery link.

Impact: existing search results and external backlinks land on a blank page; project-specific authority is discarded; visitors cannot share a stable link to a current Home project.

Recommendation: define stable Home fragments for all named projects, then map every known historic project path with a 301 to its matching fragment or to the closest surviving destination. Keep a migration table under version control and probe every mapping before publication.

Decision gate: Ocean must approve whether direct project fragments fit the intended single-page editorial experience and provide or approve the full historic slug map. Do not redirect every old project indiscriminately to `/` when a closer destination is available.

## P1 — The three pages do not expose a coherent content-heading hierarchy

Current canonical structure:

- Home has 13 project sections, 12 visual project descriptions, and **zero headings**. Project names are plain `div.title-group` nodes (`cargo/home.template.html:52-60`, repeated throughout the page).
- Write has five articles and five `h1` elements, one per piece, but no single route-level heading (`cargo/write.template.html:9-60`).
- Who has two profile articles and two `h1` elements, one per founder, but no single route-level heading (`cargo/who.template.html:12-42`).

This is not a claim that multiple `h1` elements are automatically invalid. The defect is that the heading levels do not communicate the actual page-to-project/article hierarchy. On Home, assistive and search navigation cannot discover projects by heading at all.

Impact: screen-reader heading navigation cannot expose the portfolio structure; the page hierarchy is weaker for search indexing; users cannot quickly jump between named projects or writing pieces.

Standards: WCAG 1.3.1 Info and Relationships and 2.4.6 Headings and Labels.

Recommendation: approve one route-level heading per page and mark project/profile/piece titles as the next level. The visual treatment can remain unchanged through existing classes and reset styles. Random Pics needs a content decision because its current band deliberately has only a caption and no visible project title.

Decision gate: Ocean must approve the nonvisual route labels and whether Random Pics should gain a hidden semantic label, a visible title, or cease being a `section`.

## P2 — Expanded navigation loses its navigation landmark

The compact links are wrapped in `nav.mms-mlinks`, but the expanded rail uses `aside.mms-rail` (`cargo/shared-compact-nav.html:1-3`; `cargo/shared-desktop-nav.html:1-6`). Published compact accessibility output exposes one `navigation` role. Published expanded output exposes zero `navigation` roles and one `complementary` role.

Impact: desktop screen-reader users cannot jump directly to the primary site navigation landmark even though the links remain individually operable.

Standards: WCAG 1.3.1 Info and Relationships and the landmark support for WCAG 2.4.1 Bypass Blocks.

Recommendation: expose the expanded rail's link group as a labelled primary `nav` while retaining its exact layout and stacking behavior. Do not duplicate visible links or alter the established rail geometry.

Decision gate: none for the semantic repair, but it must be regression-tested at 1024px and expanded widths because the element is also the sticky rail owner.

## P2 — Write and Who reuse Home's metadata instead of describing their content

The route titles are distinct and useful: `MM.S`, `write — MM.S`, and `who — MM.S`. However, all three routes reuse the same 163-character Home description and the same social image. The page-specific Open Graph and Twitter titles are correct, but their descriptions do not explain the writing or founders pages.

Impact: search snippets and shared cards for Write and Who can misrepresent the destination, reducing clarity and click-through confidence.

Recommendation: retain the current route-title style, write one concise page-specific description for Write and one for Who, and decide whether one studio-level social image is intentional or whether each named page needs its own share image. Keep copy in the site's sentence/lowercase voice.

Decision gate: Ocean must approve the two descriptions and any new social assets before Cargo metadata changes.

## P2 — The 404 response offers no recovery path

The synthetic missing route correctly returns HTTP 404 and uses the title `Page not found`, which is good platform behavior. Its rendered body is empty: no heading, explanation, Home link, or primary navigation.

Impact: mistyped links and historic URLs become dead ends, especially serious while old `/work/*` results remain discoverable.

Recommendation: create a minimal MM.S 404 in the same raw editorial language with a visible `Page not found` heading and links to Work, Write, Who?, and Email. Keep the HTTP response status 404.

Decision gate: approve the exact 404 copy before implementation.

## P3 — The public favicon is still Cargo's default

All three canonical pages reference `https://static.cargo.site/favicon/c3-favicon.ico`. The favicon works, but it identifies the platform rather than MM.S.

Impact: browser tabs, bookmarks, and saved shortcuts miss a small but persistent studio identity cue.

Recommendation: provide a simple MM.S favicon set and verify it in light/dark browser chrome. A web-app manifest is optional and is not required for this repair.

Decision gate: Ocean must approve the favicon artwork; do not invent one during implementation.

## Positive findings to preserve

- Home, Write, and Who local/public copy parity is exact at the audited time.
- UTF-8 delivery is intact. Curly apostrophes, en dashes, bullets, and `PURE LOVE（純愛）` survive; the Cantonese poem retains `lang="yue-Hant"` locally.
- Shared navigation points to the clean `/`, `/write`, and `/who` routes, and `aria-current="page"` is correct on every route.
- Both intended recipients are present in the shared Email URI: `ocean@mmmmm.studio` and `alvis@mmmmm.studio`. Founder-specific mail links are also correct.
- EVIIVE, Ella Cheng, Touchbaes, Travis Leung, and LinkedIn destinations all returned 200 over HTTPS.
- `robots.txt` allows ordinary crawling, declares the correct sitemap, and the sitemap is well-formed XML.
- Unknown routes return a real HTTP 404 rather than a soft 200.
- Current copy case is preserved. No audit recommendation normalizes intentional brand names or acronyms such as MM.S, EVIIVE, OOH, PURE LOVE, WTW, or AI.
- Withered Green keeps exactly four direct paragraph `uses="eye-roll"` hooks and no heading hook. Its intentional rotating text is a protected requirement, not an audit defect.
- Round 69 gold and native horizontal river behavior were not touched.

## Recommended remediation order

1. Approve canonical host/path authority and the legacy route map.
2. Add canonical/redirect coverage and remove the duplicate sitemap entry.
3. Establish a visual-neutral heading hierarchy and expanded navigation landmark.
4. Add a usable 404 before search engines send more users to removed project URLs.
5. Approve page-specific descriptions/social treatment and a custom favicon.
6. Re-run the full route, accessibility, and metadata audit after each isolated batch.

No Cargo or Figma file was edited, deployed, or published during this audit.
