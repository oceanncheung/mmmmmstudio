# Montran booklet v18 PDF allowlist candidate

This directory prepares the `MMS-AUD-036` successor without modifying the
active recovered v17 source. The candidate keeps the current rendering,
interaction, 256 KiB range-loading, fallback, and message contracts, but
accepts only the exact approved Montran report URL before the preload state or
any PDF HEAD, range, or full fetch. One explicit `pdf` parameter may contain
that exact decoded URL; duplicate, empty, aliased, or unapproved values fail
closed. When the parameter is absent, the inlined configuration supplies the
same hash-locked approved URL.

The approved report is frozen by the Round 80 evidence at 13,634,937 bytes and
SHA-256
`664dab49810d21acaa0ffbb7d6749268215c1b655ccec11f461d67c147f02629`.
Every approved request uses CORS, omits credentials and the referrer, and
rejects redirects so the exact URL cannot escape the allowlist.

Build with:

```sh
python3 work/montran-pdf-allowlist-v18-src/build-bundle.py
```

The reviewed candidate output is
`montran-booklet-direct-pdf-v18.html`, 1,938,550 bytes, SHA-256
`ca9ee9c69594af7c9e4a214f422413d00e43cbd5b493ec48f1f033295690e512`.
Validate its frozen inputs, two identical isolated builds, destructive contract
fixtures, and actual-viewer network behavior with:

```sh
python3 audit/scripts/validate-montran-pdf-allowlist.py --self-test
npm --prefix audit/harness run montran-pdf-allowlist-test
```

The output is a prepared upload candidate. It retains the v17 parent-message
wire version because that schema does not change. Do not replace the active
Freight viewer or Cargo iframe URL until a later reviewed promotion batch.
