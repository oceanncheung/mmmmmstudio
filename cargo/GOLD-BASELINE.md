# MM.S current gold baseline

The sole current preservation, parity, and rollback target is
`gold-2026-07-21-responsive-70`.

Its immutable local snapshot is
`cargo/gold/2026-07-21-responsive-70/`. The complete identity, protected
behavior contract, canonical and serialized-public hashes, and verification
entry points are recorded in that directory's `GOLD-BASELINE.md` and
`SHA256SUMS`.

## Current protected identity

- Runtime: `responsive-70`, exactly twice on Home, Who, and Write.
- Head marker: `data-mms-ios-edge-head="49"`.
- Git tag: `gold-2026-07-21-responsive-70`.
- Tag target: `07531485ca0ac4378fd3182ffa176ee6ccead7dd`.
- Deployment manifest baseline: `gold-2026-07-21-responsive-70`.
- Included post-Round-80 corrections: WTW `wtw-02` at 504 x 504 and exactly
  four intentional Withered Green paragraph rotations.

Round 69 and Round 80 remain immutable historical references at
`round-69-gold` and `round-80-stable`. They may be inspected for history, but
must not be used as the default preservation target and must never be moved or
overwritten.

## Remediation rule

Optimization, performance, security, and maintainability work must prove
visual and behavioral parity against the current gold. It may not alter the
approved layout, media geometry, typography, native rivers, control-panel
behavior, or project-specific interactions without a new explicit design
decision from Ocean.

Run both gates before accepting a remediation batch:

```sh
bash cargo/assemble-test.sh canonical
bash audit/scripts/validate-phase2.sh
```

Git state alone never proves a Cargo draft or publication. Cargo deployment
and publication still require their separate authorization and verification
workflow.
