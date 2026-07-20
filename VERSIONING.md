# MM.S local version-control policy

This directory is a code-only Git repository. Git protects source, deployment
instructions, embedded-app code, and verified release baselines. It does not
publish Cargo, modify Figma, or replace Cargo's reload verification.

The private GitHub remote is `origin` at
`https://github.com/oceanncheung/mmmmmstudio`. GitHub provides off-device
backup, comparison, and release history; it is not an automatic deployment
target. Local commits do not authorize a Cargo deployment or publication.

## Stable versions

- `round-69-gold`: an archival root reconstructed from the immutable files in
  `cargo/gold/round-69/` and exposed on branch `archive/round-69`. This tag is
  the approved visual, interaction, and rollback baseline. Its tree contains
  only the canonical Cargo files that were actually archived for Round 69; it
  does not claim to reconstruct unarchived project or platform state.
- `round-80-stable`: the first stable commit on `main` and the next accepted
  stable point after Round 69. It contains the complete current code-only
  workspace, including the protected Round 69 archive and Round 80's scrubber
  safeguard.

The two tags are intentionally separate Git roots. Round 69 is a verified but
partial retrospective archive, so making it the literal parent of the complete
Round 80 workspace would invent history that was never captured. Future work
descends from `round-80-stable` on `main`.

Stable tags are immutable. Do not move, replace, or force-update them. GitHub
release immutability is enabled for the private remote, and the published
`Round 69 gold` and `Round 80 stable` releases enforce that policy by locking
their associated tags.

## What belongs in Git

- Cargo templates, shared partials, CSS, JavaScript, validators, generated
  bodycopy mirrors, deployment logs, and rollback manifests.
- Figma/Cargo planning and audit documentation.
- Source code and configuration for the Montran viewer, Touchbaes game, V7
  embed, and other interactive components.
- Small runtime assets required to reproduce an embedded application.

Large portfolio originals, videos, PDFs, design working files, generated
bundles, browser traces, installed dependencies, and secrets stay outside Git.
Their Freight URLs, hashes, dimensions, and ownership belong in manifests.

The active Touchbaes code remains in its established project path inside
`Portfolio assets/`. Those specific tracked files were force-added once while
the rest of that archive remains ignored; ordinary edits to tracked files are
still detected normally.

## Working method

1. Begin each batch from a clean stable point and create a branch named
   `round-<number>/<short-description>`.
2. Edit canonical local source first. Generated Cargo bodycopies must come from
   the assembler and must never be hand-edited.
3. Run local validation and commit the intended source change before touching
   Cargo.
4. Deploy to Cargo using `cargo/PLAYBOOK.md`, reload, and verify persistence.
5. Record the exact deployed result in `cargo/DEPLOY.md` and commit that record.
6. Publish only under the current project authorization rules, then verify the
   cache-busted public artifact independently.
7. Create an annotated stable tag only after the public result passes every
   release gate.

Git state, Cargo draft state, and Cargo public state are three separate things.
A local commit never proves that Cargo saved or published the same artifact.

## Safe comparison and rollback

Prefer a separate worktree instead of replacing the active working directory:

```sh
git worktree add ../mms-round-80-reference round-80-stable
```

Inspect one historical file without changing the working tree:

```sh
git show round-80-stable:cargo/site.css
```

Do not use destructive reset or checkout commands against uncommitted work.
