# Phase 1 Git and GitHub baseline

Captured read-only on 2026-07-20 from branch
`round-81/audit-baseline`. No commit, push, tag, release, pull request, Cargo
change, Figma change, or publication occurred during this capture.

## Frozen identity

- The branch, local `main`, cached `origin/main`, and live GitHub `main` all
  resolve to `dcdbd6fec9c6220486c8572d5f146248b5c3593f`.
- The audit branch is zero commits ahead and zero commits behind
  `origin/main`, and it has no upstream branch yet.
- The only pre-existing tracked worktree change was `VERSIONING.md`. Its exact
  patch is preserved separately, with SHA-256
  `4d12143e0f4106806d98bed18534663ec4346f4c487d3fe0c8d4d54ed616e1eb`.
- `git fsck --full --strict --no-reflogs` completed successfully with exit
  code 0.

## Git storage

The project-level `.git` is a symbolic link to
`/Users/oceancheung/.local/share/mmmmmstudio/git`. The prior
`.git-dataless-backup-20260720T1745` directory exists as a non-canonical
recovery artifact and is excluded through the active Git info/exclude file.
`repository-state.json` records the paths and ignore rule without including
credentials.

## Stable baselines

- Annotated tag `round-69-gold` has tag object
  `67a1f20a46fdfc9c5ac9a644a234b29193118e98` and peels to commit
  `18093409423fb5d268d64e049c31a91bbb78d51a`.
- Annotated tag `round-80-stable` has tag object
  `c138a57aa8064ffc0b8e720b306cf00193b4b2fb` and peels to commit
  `d40b930b29bea66a63c2a3a5aa244b03da5a65cf`.
- GitHub reports both associated releases as immutable.
- All 27 files in the protected `cargo/gold/round-69/` mirror match the
  corresponding canonical `cargo/*` blobs in `round-69-gold`; the Round 69
  scope document also matches.
- All nine canonical Round 80 artifacts recorded in
  `docs/versioning/ROUND-80-STABLE.md` match their documented SHA-256 values
  and the `round-80-stable` tag byte for byte.

## Remote protection state

Two active GitHub rulesets were read back:

1. `Protect main history` blocks deletion and non-fast-forward updates to
   `refs/heads/main`.
2. `Protect stable round tags` blocks deletion and non-fast-forward updates to
   `refs/tags/round-*`.

The rulesets do not require pull requests for normal fast-forward updates.
The project workflow therefore remains the policy layer that requires audit
work to use a branch and review before integration.

## Evidence map

- `repository-state.json`: branch, commit, divergence, origin, worktree, and
  external Git-directory facts.
- `pre-capture-status.txt` and `pre-capture-working-tree.diff`: the tracked
  state that existed before evidence files were created.
- `local-refs.txt`, `remote-refs.txt`, and `branches.tsv`: local and live
  remote reference inventories.
- `stable-tags.json`: annotated tag and peeled commit identities.
- `github-repository.json`, `github-releases.json`, and
  `github-rulesets.json`: selected, non-secret GitHub API readbacks.
- `integrity.json`: strict Git object-integrity result.
- `round-69-gold-tree.sha256.tsv` and
  `round-80-stable-tree.sha256.tsv`: SHA-256 and Git-object inventories for
  every file in both immutable tag trees.
- `protected-round-69-worktree.sha256.tsv` and
  `protected-round-69-vs-tag.json`: protected mirror hashes and canonical tag
  comparison.
- `round-80-canonical-comparison.json`: the nine documented Round 80
  artifacts compared across the current worktree, manifest, and stable tag.
- `protected-baseline-comparison.json`: confirms that the protected Round 69
  mirror is unchanged from the Round 80 stable tree that contains it.
- `divergence.json`: concise local/remote branch comparison.

No authentication token, cookie, credential-bearing remote URL, or private
GitHub response field is stored in this directory.
