# MM.S technical privacy and data inventory

Last reviewed: 2026-07-23 UTC

This is a technical inventory of the audited MM.S client runtime. It is not a
public privacy policy, legal notice, or statement about provider-side practices
that cannot be observed from the browser. Every negative finding below is
limited to the source and live requests reviewed on the date above.

## What the audited site code does

The audited Home, Who, and Write runtime does not add analytics, advertising
pixels, accounts, authentication, or a web form. No site code reads or writes
cookies. The sampled browser sessions sent no `Cookie` or `Authorization`
request headers and received no `Set-Cookie` response header.

Contact links are intended to open the visitor's email client. The reviewed
MM.S source does not load project, profile, LinkedIn, or email destinations as
background resources, and the sampled sessions did not contact them before
visitor activation. Browser link-preview or speculative behavior outside that
observation is not guaranteed.

## Browser storage

All first-party storage access is guarded so the site can fall back to its
defaults when storage is unavailable.

| Scope | Key | Allowed content | Purpose | Retention in the audited client |
|---|---|---|---|---|
| `localStorage` | `mms-theme` | `white`, `girly`, `quirky`, `contrast`, or `black` | remembers the selected color theme | until replaced, cleared by the visitor/browser, or evicted by the browser |
| `localStorage` | `mms-face` | `serif`, `sans`, `mono`, or `gothic` | remembers the selected typeface | until replaced, cleared by the visitor/browser, or evicted by the browser |
| `localStorage` | `mms-scale` | `s`, `m`, `l`, or `xl` | remembers the selected type scale | until replaced, cleared by the visitor/browser, or evicted by the browser |
| `localStorage` | `mms-shape` | `straight`, `rounded`, or `oval` | remembers the selected media-frame shape | until replaced, cleared by the visitor/browser, or evicted by the browser |
| `sessionStorage` | `mms-render-sequence` | four `theme:face:scale:shape` combinations joined by `|` | avoids immediately repeating the prior startup sequence | current browser-tab session |

Fresh visits do not write the four appearance defaults. Those values are
written only after a visitor selects a control. The audited runtime does not
send the five stored values through a request, beacon, form, or URL.

The active Freight-hosted Touchbaes v10 embed names the legacy
`touchbaes-sticker-room-raw-v44` key, but its current initialization deletes
that Freight-origin value, returns an empty placement map, and does not save
sticker placement.

## Services contacted to display the site

The sampled browser sessions contacted the following origins. These services
receive ordinary connection and request metadata needed to return a page or
asset, such as IP address, browser headers, requested URL, time, and any
browser-supplied referrer.

| Origin | Observed role |
|---|---|
| `https://mmmmm.studio` | first-party Home, Who, and Write documents |
| `https://build.cargo.site` | Cargo frontend styles and scripts |
| `https://static.cargo.site` | Cargo static assets and favicon |
| `https://type.cargo.site` | Cargo-hosted font files |
| `https://freight.cargo.site` | portfolio images, posters, videos, embeds, and the Montran PDF |
| `https://fonts.googleapis.com` | Google Fonts stylesheet for UnifrakturMaguntia |
| `https://fonts.gstatic.com` | Google Fonts binary for UnifrakturMaguntia |

The audit does not determine those providers' server-log retention, reuse,
legal basis, subprocessors, or deletion practices. Their current terms and
policies govern their processing.

## Visitor-initiated destinations

The current site contains internal links to `/`, `/who`, and `/write`; project
or profile links to `eviive.ch`, `ellacportfolio.com`, `touchbaes.ca`,
`travisleung.com`, and LinkedIn; and `mailto:` contact links. The reviewed
source exposes these as navigation or mail actions rather than page-load
resources, and the sampled sessions did not contact them before activation.
The destination's own policy applies after leaving MM.S.

## Audit boundary

The 2026-07-23 live evidence used isolated Chromium contexts and covered clean
Home, Who, and Write loads, a complete Home traversal, and deliberate appearance
changes. Request counts can vary with caching, viewport, lazy loading, and
timing. The durable observations are the origin set, browser-storage behavior,
and absence of the audited tracking, cookie, form, and authentication paths.
This client-side review cannot observe provider-side access logs, and it does
not certify future Cargo delivery changes or physical Safari behavior.
