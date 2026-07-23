# MM.S website

Source and release-control repository for the MM.S Cargo website.

- Current approved gold: `gold-2026-07-21-responsive-70`
- Immutable historical references: `round-69-gold` and `round-80-stable`
- Remediation branches descend from the current gold through the audited
  `round-81/audit-baseline` line; no branch name by itself authorizes Cargo
  deployment or publication.

Start with [`VERSIONING.md`](VERSIONING.md), [`HANDOFF-CODEX.md`](HANDOFF-CODEX.md),
and [`cargo/PLAYBOOK.md`](cargo/PLAYBOOK.md).

The current audited browser-storage and service inventory is documented in
[`docs/PRIVACY-DATA-INVENTORY.md`](docs/PRIVACY-DATA-INVENTORY.md). It is a
technical repository record, not a published privacy policy or legal notice.

GitHub records source and verified release history. It does not deploy or
publish Cargo; Cargo draft and public state must still be verified separately.

Round 100 closes the repository side of `MMS-AUD-003` without changing the
site runtime or visuals. The deployment manifest now pins the exact native
river count and rejects scrollbar role/value semantics on `.mms-river`
independently of the existing hidden-river guard. The focused Chromium contract preserves the separate
desktop scrubber semantics and native compact/expanded river behavior while
retaining the frozen contaminated Cargo bodycopy as a negative control.

Round 101 closes the repository side of `MMS-AUD-004` with a visually neutral
document-language contract. The early site head and shared body initializer
set the English root language, standalone mirrors declare `lang="en"`, and the
Write page retains its narrower `yue-Hant` passage override. This repository
change has not been deployed or published to Cargo.

Round 102 closes the repository side of `MMS-AUD-023` without changing visual
geometry. Both responsive versions of the shared primary links are now named
`Primary` navigation landmarks; the expanded rail no longer presents itself
as complementary content. The deployment manifest, focused Chromium matrix,
and Phase 2 gate reject missing names, legacy rail semantics, duplicate
candidates, incorrect current-page state, and geometry drift. This repository
change has not been deployed or published to Cargo.
