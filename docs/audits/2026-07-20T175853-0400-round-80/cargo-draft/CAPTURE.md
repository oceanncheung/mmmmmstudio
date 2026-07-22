# Cargo draft capture

Captured at `2026-07-20T18:31:10-04:00` from Cargo site `3626191` using authenticated, read-only `GET` requests to Cargo's production API. Authentication came from the already authenticated Dia session and remained in memory; no cookie, bearer token, or other credential was printed or persisted.

No Cargo editor field was changed, no save request was sent, and nothing was published.

## Sources

- Site identity and exact custom HTML: `GET https://api.cargo.site/v1/sites/3626191`
- Complete global stylesheet: `GET https://api.cargo.site/v1/sites/3626191/css`, extracted byte-for-byte from the response's `stylesheet` field
- Home: `GET https://api.cargo.site/v1/pages/3626191/id/I2398594830`
- Who: `GET https://api.cargo.site/v1/pages/3626191/id/B2402536676`
- Write: `GET https://api.cargo.site/v1/pages/3626191/id/P0060651058`

## Primary artifacts

- `global.css`: complete Cargo-managed stylesheet, including the preserved CSS head and managed font regions
- `site-head.html`: exact saved custom HTML region
- `home.bodycopy.html`, `who.bodycopy.html`, `write.bodycopy.html`: exact saved page content
- `home.local.css`, `who.local.css`, `write.local.css`: exact page-local CSS fields
- `identity.json`, `global-css.json`, `pages.json`: sanitized response identity and provenance
- `home.media.json`, `who.media.json`, `write.media.json`: Cargo page media arrays as returned by the API
- `media-inventory.tsv`: flattened media and nested video-poster metadata
- `css-endpoint-probes.json`: read-only endpoint discovery record
- `sites-3626191-css.response`: unmodified JSON response from the successful stylesheet endpoint; it contains CSS metadata and stylesheet content only

## Checks

- `global.css`: 86,129 bytes, SHA-256 `756d73e5e63bfd4551326e06888ba93574601837a9fbf552ffb3fac4d7710bb3`, 503 opening and 503 closing braces
- `site-head.html`: 1,879 bytes, SHA-256 `3e3b287a4a7800e2caf7ec1a5b3d16a0eb296d82ae6da969b60ac233632cad2a`, marker `data-mms-ios-edge-head="49"`
- Home bodycopy: 130,742 bytes, SHA-256 `03a7f20f1f5d7359d260c065ab239c8d6552f24e581118ccffeec934f9b96cd4`
- Who bodycopy: 68,236 bytes, SHA-256 `36ed459ef60f030b82e1941adac41b6b549c66c1738b6c51c96168d46e5df365`
- Write bodycopy: 67,787 bytes, SHA-256 `acd08c42532bf7138b6058a3f08302f76a7ed1fa38307704bd6f77f2b26cc2e9`
- Each bodycopy decodes as UTF-8, contains `responsive-70` twice, contains no Unicode replacement characters, and contains none of the audited mojibake prefixes.
- The Cargo API returned 260 Home media records plus 59 nested video-poster records. The Who and Write media arrays were empty.

## Limitations

- This is the saved server-side Cargo draft readback at capture time. A read-only API cannot see unsaved text sitting only in an editor input. The captured bodycopy, CSS, and custom HTML are the authoritative saved values returned by Cargo.
- Cargo returned no page-media records for Who or Write even though their bodycopies contain Freight references. Their asset dependencies must be completed from the exact bodycopies and the separate public/Freight inventories.
- The media API provides Cargo hashes, dimensions, formats, and recorded file sizes. It does not prove that each referenced Freight object is currently retrievable; network probes are recorded elsewhere in this audit.
- The endpoint probes are intentionally limited to `GET`. No mutation route was tested.
