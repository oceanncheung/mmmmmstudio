# MM.S Gold Baseline — 2026-07-21 (`responsive-70`)

Ocean designated this exact latest verified site state as the current gold
baseline on 2026-07-21. It supersedes Round 80 as the default comparison and
rollback target without changing either historical release.

## Identity

- Immutable identifier and Git tag: `gold-2026-07-21-responsive-70`.
- Canonical source ancestry: commit `f650360e32b4b51da128c6cadc8fd1dedc2550b7`
  plus the fail-closed deployment manifest shipped with this snapshot.
- Shared runtime: `responsive-70`, exactly twice on Home, Who, and Write.
- Head marker: `data-mms-ios-edge-head="49"`.
- Scope: Home, Who, Write, shared CSS/runtime, and deployment validation.
- Public source was read back independently on 2026-07-21 before the snapshot
  was declared gold.

Round 69 remains the older accepted rollback in `cargo/gold/round-69/` and tag
`round-69-gold`. Round 80 remains the historical pre-delta release at tag
`round-80-stable`. Neither tag nor snapshot may be moved or overwritten.

## Post-Round-80 corrections included

- WTW media `wtw-02` is the approved square 504×504 frame.
- Withered Green contains exactly four rotating body-paragraph hooks; its
  heading remains static.
- These are part of the current gold and must not be lost by a rollback to the
  older Round 80 artifact.

## Protected contracts

- Home contains 13 project bands and 68 ordered media IDs: 38 images, 27
  videos, and 3 iframes.
- V7 contains 6 media items; Touchbaes contains 7.
- Expanded Home contains 12 desktop river scrubbers.
- Project rivers remain native horizontal scrollers with `pan-x pan-y`; no
  wheel interception, forced stepping, snapping, or animated correction.
- Home, Who, and Write have zero page-level horizontal overflow at verified
  compact and expanded references.
- V7, Touchbaes v10, and Montran v17 embed URLs and required attributes are
  locked by `deployment-manifest.json`.
- Every approved image, video, poster, fallback, and iframe source identity is
  locked per media ID. Unexpected live deferred-media sources are rejected.
- Who contains two founders and two videos.
- Write contains five pieces. Only the four Withered Green body paragraphs use
  Cargo's native `eye-roll`; the heading does not.
- Cargo publication still requires editor reload persistence and independent
  public verification. Git state alone never authorizes or proves publication.

## Canonical local artifacts

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `tokens.css` | 12,385 | `70178291f00dfeacaae9fc7c0fde2d7f444cb26456d969b7d2523d0274a71d98` |
| `site.css` | 66,224 | `c47485c1c3b55fc6b5cb577a7ad3c2115cd2cb6fdc7f3f1261ef20ae6a51f6f1` |
| `panel.js` | 45,079 | `a5e7f492f987804df0b1ea999ae4d25aeabf49dbe81c39e6749cb8cfd9f68987` |
| `site-head.html` | 1,880 | `d677c1a7e81a20482d1aa02959284f51775f0fe39411521ef91d9a972657fd56` |
| `home.html` | 125,651 | `09555a6fe3ebaa54659057733d0f4bad4a5aaca7d9739f9853b7bfbfd3ff8c52` |
| `who.html` | 68,399 | `d15ae1d4af733983a70f3182e8374b5daad0d54301e9e713783c26976dbbe383` |
| `write.html` | 68,020 | `871140a2b7091a55495bf89e31adad1a82ac4108d2d5a88761ad1f9464655e33` |
| `test.html` | 204,555 | `31ed9668a38731982730db9c79b252e55c5acaf3c6d71085a4d99c22912ced60` |
| `who-test.html` | 147,303 | `8e7d2442bf6b7f121ad27ee5a98b52c547d3983832bbd5f7558c7725c74306cb` |
| `write-test.html` | 146,924 | `e1dbf0472bb4ee6a3bb9e0f0aa94b3b26a6dba0d7f63ac590abf55ef9a05515d` |

## Serialized public identity

Cargo serializes bodycopy and managed CSS differently from the canonical local
sources, so the published hashes are recorded separately.

| Public artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Home bodycopy | 136,477 | `43477c0a61845bf6a62eed4821b804bd0942b788406a619648a6619994b44d52` |
| Who bodycopy | 68,236 | `36ed459ef60f030b82e1941adac41b6b549c66c1738b6c51c96168d46e5df365` |
| Write bodycopy | 67,947 | `8039ff87b81cc58538513d5e83bd91680d81ddaa046a948cf7cea20b7d122088` |
| Global CSS | 86,098 | `78cb397ff758dc6b33181f95a1483a75c332a022f6693801c96c3b4d9e8e59fc` |
| Custom HTML | 1,879 | `3e3b287a4a7800e2caf7ec1a5b3d16a0eb296d82ae6da969b60ac233632cad2a` |

The local `site-head.html` differs from Cargo's serialized Custom HTML only by
its final newline. The global CSS semantic difference from the local composed
bundle is limited to Cargo-managed regions and their serialization.

## Validation

From the project root, run:

```sh
bash cargo/assemble-test.sh canonical
bash audit/scripts/validate-phase2.sh
```

Both checks must pass before any later Cargo deployment. The deployment
manifest is an approval boundary and must never be regenerated automatically
from a possibly damaged payload.
