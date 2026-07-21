# Post-Round-80 audit delta

This additive record preserves changes discovered after the immutable Round 80 Phase 1 capture. It does not alter or recalculate `docs/audits/2026-07-20T175853-0400-round-80/`.

## WTW second media geometry

- Latest approved Figma endpoint: square `504 x 504px` at the 1440px reference.
- Current canonical Home source: `data-media-id="wtw-02"` with `--asset-w:504;--asset-h:504`.
- Current public Cargo delivery was independently measured square at 1024, 1440, and 1920px with no vertical ancestor clipping and no page-level horizontal overflow.
- Source-control hotfix provenance: commit `bd0d2cb` on `fix/wtw-square`, proposed through GitHub PR 2. The current audit branch carries the equivalent canonical-source sync in this additive audit batch.
- The Round 80 asset rows retain their historical `765.2 x 765.2px` observation. Treat those fields as superseded for current geometry, not as permission to rewrite the frozen evidence. The machine-readable override lives in `audit/assets/post-baseline-geometry-supersessions.json`.

Superseded evidence is narrow: the `wtw-02` geometry rows in the frozen local/Cargo/public Home bodycopy and their WTW geometry-parity captures. The unchanged Freight video/poster objects and unrelated Figma, Cargo, public, and local evidence remain valid. The frozen rows stay useful as historical proof of the defect.

## Write / Withered green interaction

- Ocean explicitly requires the Withered green body text to keep rotating.
- Current canonical and published Write bodycopy contains exactly four direct `.mms-writing-withered .mms-writing-plate > p > span[uses="eye-roll"]` hooks.
- The heading is excluded.
- This is Cargo's native dynamic `eye-roll` interaction. Figma records the static resting endpoint at zero rotation; that static value does not override the approved interaction.
- The exact preservation contract lives in `audit/contracts/intentional-design-contracts.json`. Source validation fails closed on Write route identity, section presence, paragraph distribution, and complete text coverage; browser collection independently enforces the same runtime structure.

Affected evidence: current local and published Write interaction behavior. Round 69 gold and the Round 80 snapshot contain no such hooks and remain untouched as historical references.

## Required recapture

The complete local deterministic visual suite is recorded through the hash-bound provenance in `audit/assets/rendered-media-measurements.provenance.json`. Before findings become final, run the authenticated Cargo-snapshot suite from a clean output directory. A later authenticated Cargo readback should capture the post-Round-80 bodycopy explicitly rather than blending it into the frozen evidence.
