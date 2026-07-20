# MM.S Gold Baseline — Round 69

Recorded on 2026-07-16 after Ocean's acceptance of the published site.

## Status

- Standard gold version: Round 69.
- Runtime: `responsive-62`.
- Final corrected publication: 2026-07-16 at 14:05:03Z.
- Scope: Home, Who, and Write.
- Purpose: visual, interaction, and rollback reference before type-scale and
  spacing refinements.
- Immutable local snapshot: `cargo/gold/round-69/`. It contains copies of the
  canonical sources, shared partials, validators, and assembled reference pages
  listed below. Do not edit files inside that directory during later rounds.
- This project is not a Git worktree. The hashes below, the reload-persisted
  Cargo state, and the Round 69 deployment record together identify the gold
  version.

Future refinement rounds must branch conceptually from this baseline, record
their before/after differences, and leave this manifest unchanged.

## Protected behavior contract

- All compact iOS Safari edge samplers are top-only. No bottom sampler exists.
- Theme selection keeps the compact control tray open; the panel has no
  `::before` backing or theme-click auto-close timer.
- Rivers use native horizontal scrolling with `pan-x pan-y` and no page-level
  horizontal overflow.
- Montran is the only shape-responsive interactive embed. V7 and Touchbaes
  remain rectangular.
- A stationary compact Montran tap turns exactly one page. Moved gestures remain
  native river or page scrolling, and the center binding zone remains inert.
- The Montran nine-icon motion asset uses its true 400:400 ratio.
- Home page Code View CSS contains only the 79-byte canonical-owner comment.
  The complete stylesheet belongs only in global Site Settings CSS.

## Verified reference geometry

- Compact public Home at 390x844: tray remains open through theme selection,
  13 native rivers retain `pan-x pan-y`, booklet clipping follows the selected
  shape, and page overflow is zero.
- Expanded public Home at 1440x900: left rail 272px, control panel 200x248,
  introduction 664px, root 1440px, and page overflow zero.
- Compact public Who and Write: no older runtime and zero page overflow.
- The booklet pointer state machine was proven in WebKit emulation. Do not
  describe that check as a new physical-iPhone test.

## Canonical local artifacts

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `tokens.css` | 12,333 | `a277d3960405266d1ae9e4ec3c4e4f2e710c72cdfe308ac15fe205d87ca5d319` |
| `site.css` | 63,809 | `9f9ced7d17226f4c9d935b7451c991be85a26edf6598344b0ea1aac39406c809` |
| complete `tokens.css + site.css` bundle | 76,142 | `66f61b5950dfeed1c68548dfc75b81a472d4a4fd8a543540e4d9db3dbabfae65` |
| `panel.js` | 32,696 | `2f99059b7209c63f7390947072be1f1044cbc7f5ead48cc91014c0263f65f3c1` |
| `shared-early-init.html` | 15,723 | `dbf6cb8d87f7ba7cbe1014520032bfcaab3943da73fd090ed2003e35bd1c9ecb` |
| `site-head.html` | 1,310 | `3dd9eb35e887dca145adac0d796d629ff3894fdaba7ee444c2e15373fcfdb204` |
| `home.template.html` | 52,811 | `1ae777474e707cd1af707b17cb8b6c1f3ddbd902e75537f357b65989fe8a21e5` |
| `who.template.html` | 3,040 | `1eb7e7aa4e3ae37ac2da9793f63e52b76e8d3bb92f60b0dd0b9b523a3f2c0e21` |
| `write.template.html` | 3,075 | `74c9df8b3681212ff0979891647c7c5793b4de2ee18729e25b5869a17cd3f5e0` |
| `compose-css-bundle.sh` | 1,276 | `3fdc8e0b0862a6066fc12c25e19eae20288806d692c9fd508efd357343977de7` |
| `assemble-test.sh` | 1,229 | `113ed1ce42a458b8b4242ad2bfc2e26ff18c787dba22bb147cb4e78b3a6fb03d` |
| `test.html` | 189,370 | `4a94d054f17401dca726cc727bbf9169b273469e92c602241cb70a52e7be05e5` |
| `who-test.html` | 132,399 | `f0cd9661e15dd93cf76715ec94dad5f28cab40420d35d6752c110b3714e3ffe3` |
| `write-test.html` | 131,842 | `0609ee2eddea37b53c484a62e6445e534314fc8a5ad3a3db9311d42158e9dc31` |

## Reload-persisted Cargo identity

- Global Site Settings CSS: 83,632 bytes, SHA-256
  `070fb68449dd5801ed3592a4047b3f301fc6fe7078d7b181b3c0d25df5e1e145`.
- Home page-local CSS: 79 bytes, SHA-256
  `72aa1a231f1d838ee6b3b7f18a09682ee478bfe399788d62c7e55ebae7da2fd8`.
- Persisted Home, Who, and Write bodycopies each contain exactly two
  `responsive-62` markers and no older runtime marker.
- Cargo's CSS head and all three Cargo-managed font blocks are intact.

## Validation entry point

Run `bash cargo/assemble-test.sh canonical` from the project root, then compare
the resulting hashes and responsive markers against this manifest. Cargo work
must still be verified after editor reload; a local pass alone is insufficient.
