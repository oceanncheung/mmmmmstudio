# Local documentation drift

Captured during the Round 80 Phase 1 baseline. This file records drift only;
no project documentation or implementation source was changed.

## Current-source identity

- Canonical local sources are the files named in
  `docs/versioning/ROUND-80-STABLE.md` and the component/template inputs used
  by `cargo/assemble-named-pages.sh`.
- Shared runtime: `responsive-70`.
- Head marker: `data-mms-ios-edge-head="49"`.
- The protected `cargo/gold/round-69/` snapshot was not read through a build,
  edited, regenerated, or used as an output target.

## Drift requiring later documentation repair

1. `HANDOFF-CODEX.md:44-49` describes the retired
   `Montran/flippable-booklet/` image-manifest build and Touchbaes v3. The
   active embeds are Montran direct-PDF v17 and Touchbaes v10.
2. `HANDOFF-CODEX.md:57-58` says the project has no `.gitignore` and is not a
   Git repository. Round 80 is now under Git with protected stable tags and an
   external Git metadata directory.
3. `HANDOFF-CODEX.md:14-15` says to publish verified batches by default, while
   `cargo/PLAYBOOK.md:11-12` says never publish. The current audit plan is
   explicit: Cargo, Figma, and public delivery are read-only throughout the
   baseline and audit workflow.
4. `cargo/GAME-VIDEO-STATUS.md:62-69` and
   `cargo/PLAYBOOK.md:586` still say the Touchbaes band is placeholders and
   undeployed. The current Home mirror contains seven Touchbaes media IDs and
   the v10 interactive iframe.
5. `cargo/index.html` is an old standalone prototype. It contains retired
   navy/red theme tokens, a fixed-navigation architecture, and old type-scale
   values. Its generic name makes it easy to mistake for a canonical entry
   point even though the current canonical outputs are `home.html`,
   `who.html`, and `write.html`.
6. The active Touchbaes README accurately describes the original interaction
   concept but does not document the v10 parent messaging, stable compact
   envelope, or current Freight deployment contract.
7. `cargo/GOLD-BASELINE.md` records that Round 69 predates Git. That statement
   is historically accurate inside an immutable artifact and must not be
   edited. Later documentation should explain that Git was introduced after
   Round 69 instead.

## Safe disposition

- Repair these references only in a later approved documentation batch.
- Do not edit the Round 69 manifest to make historical prose look current.
- Replace or rename ambiguous prototypes only after confirming no audit or
  local-preview command depends on them.
