# MM.S Round 80 Phase 1 baseline

This directory freezes the inputs needed to begin the MM.S whole-project audit without mixing revisions. The capture started at `2026-07-20T17:58:53-04:00` on `round-81/audit-baseline` from repository commit `dcdbd6fec9c6220486c8572d5f146248b5c3593f`.

Round 80 (`responsive-70`) is the current stable comparison point. The historical Round 69 gold mirror remains protected and was verified against its immutable tag; it was not modified.

## What is captured

- `local/`: canonical local Cargo mirrors, generated complete CSS bundle, validation results, runtime/embed markers, media inventory, FileProvider state, documentation drift, and reproducibility evidence.
- `cargo-draft/`: authenticated read-only Cargo API readback of the exact saved Home, Who, and Write bodycopies, page-local CSS, complete global CSS including Cargo-managed regions, site head, and Cargo media metadata.
- `public/`: published Home, Write, and Who responses and headers, extracted Cargo state, dependency inventories, cache/range probes, browser console logs, and desktop/mobile viewport screenshots.
- `figma/`: read-only Figma file/page inventory, approved reference-node geometry, variables, components, and matching screenshots.
- `freight/`: 103 referenced underlying Freight objects with URLs, formats, byte sizes, natural dimensions/codecs, cache metadata, and streamed SHA-256 digests.
- `git/`: repository identity, working-tree provenance, strict object-integrity result, stable tag/release identities, GitHub protection rules, and protected Round 69/Round 80 comparisons.

Every retained artifact is indexed by the root `SHA256SUMS`. Subdirectories may also carry capture-local checksum indexes.

## Cross-source anchors

- Saved Cargo draft and published Cargo state matched byte for byte for the complete global CSS, site head, and all three primary bodycopies at capture time.
- All three saved bodycopies contain `responsive-70` twice. Home references Touchbaes v10 and Montran booklet v17.
- The canonical local source files match the immutable Round 80 stable tag, while their assembled/source-oriented byte representation is intentionally retained separately from Cargo's saved payloads.
- All 103 referenced Freight objects returned HTTP 200 and were content-hashed; all 99 image/video objects have measured natural dimensions.

## Source precedence

When two sources differ, later audit work must resolve intent in this order:

1. Explicit latest Ocean decision.
2. Current approved Figma endpoint for visual intent.
3. Reload-verified Cargo draft for deployed behavior.
4. Local source mirror for implementation intent.
5. Historical logs for diagnosis only.

## Safety and scope

This was an evidence capture, not a remediation batch. Cargo, Figma, Freight, and the public site were read-only. No Cargo field was saved, no Figma object was changed, no Freight object was uploaded, and the site was not published.

Phase 1 records capture facts and scoped limitations only. Severity scoring, prioritized findings, design decisions, and remediation belong to later phases of the master plan.

See `INVALIDATION.md` before reusing or selectively refreshing any section, and `LIMITATIONS.md` before treating this snapshot as a complete system inventory.
