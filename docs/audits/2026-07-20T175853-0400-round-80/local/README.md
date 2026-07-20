# Local source baseline

This directory records the canonical local Round 80 source state and the embedded-source material needed to compare implementation intent with Cargo and Figma.

- `source-manifest.tsv`: paths, roles, Git/provider states, byte sizes, timestamps, and SHA-256 values for 80 scoped local artifacts.
- `canonical-hashes.sha256`: hashes of the canonical Round 80 code inputs and assembled outputs.
- `complete-css-bundle.css`: deterministic output of `cargo/compose-css-bundle.sh`.
- `validation.txt`: raw output from the named-page, shared-component, test-mirror, site-head, and complete-CSS checks.
- `runtime-markers.json`: shared runtime, head marker, media/band counts, and embed contracts.
- `media-inventory.csv`: all 68 Home media IDs and their DOM delivery contracts.
- `embed-manifest.json`: local and Freight identities for V7, Touchbaes, and Montran.
- `fileprovider-status.tsv`: exact post-capture FileProvider state; reading baseline content hydrated some previously dataless files.
- `reproducibility.md`: objective recovery-path evidence retained for later triage.
- `documentation-drift.md`: stale documentation references recorded without changing source documentation.

All canonical validators passed at capture time. No project implementation file was changed by this local capture.
