# Baseline invalidation rules

This baseline is section-addressable. A later change invalidates only the evidence that depends on the changed source, plus the root checksum index.

- Local Cargo mirror or embedded source changes invalidate `local/` and any cross-source comparison that references the changed file.
- A saved Cargo draft change invalidates the affected artifacts in `cargo-draft/` and `cargo-draft/published-parity.json`.
- A Cargo publication invalidates `public/`, the draft/public parity record, and the published-bodycopy-derived Freight dependency set.
- A Figma node, component, variable, or reference-frame change invalidates the corresponding `figma/` records and screenshots; unrelated Figma records remain valid.
- A Freight object whose URL, byte size, ETag, or SHA-256 changes invalidates that row in `freight/asset-manifest.csv`. A bodycopy dependency change also invalidates the referenced-object inventory.
- A Git commit, tag, release, ruleset, remote, or worktree-state change invalidates the corresponding `git/` evidence only.
- Any changed artifact requires regeneration of the root `SHA256SUMS` before the baseline can again be treated as frozen.

Do not silently recapture a changed section in place. Record the reason and capture time, retain the unaffected evidence, and make the new section revision explicit.
