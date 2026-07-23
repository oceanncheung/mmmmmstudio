# Intentional design contracts

These contracts record approved details that a conventional cleanup or parity audit could otherwise misclassify as defects. They supplement the immutable Round 80 evidence; they never rewrite that historical baseline.

Automated checks must preserve each required selector and behavior. A Figma static endpoint may document the resting composition while Cargo supplies an approved interaction. In that case, the interaction is an intentional parity exception rather than drift.

Current protected exception:

- Write / Withered green: all four body paragraphs retain Cargo's native `eye-roll` effect. The heading does not rotate. The effect is dynamic, so tests assert one direct hook around the complete text of each paragraph, route and section presence, and the forbidden heading placement rather than a fixed angle.

## Third-party runtime notices

`third-party-runtime-notices.json` maps every Git-tracked browser runtime under
`work/**/vendor/` to its exact version, license, upstream source, file hash,
complete license block in `THIRD_PARTY_NOTICES.md`, and active or prepared
artifact identities. `validate-third-party-runtime-notices.py` rebuilds those
artifacts and rejects uncovered vendor inputs, notice drift, missing retained
banners, artifact identity drift, or vendor payload removal/duplication.

This is a tracked repository provenance and notice record. It does not claim
that immutable Freight files uploaded before this record contain a new
internal notice; that would require a separately versioned build and promotion.

## Framer helper dependencies

`framer-helper-dependencies.json` pins the private read-only Framer helper to
reviewed package and lockfile identities outside `GHSA-77vg-94rm-hx3p`. The
validator also hash-locks its config and smoke test, limits remote calls to the
documented read methods plus `disconnect()`, and rejects floating versions,
vulnerable serializer versions, or an unreviewed remote mutation. The online
`npm run audit:dependencies` check remains required whenever this tool is used
or its lockfile changes. Every contract input must also be Git-tracked so an
untracked dirty-worktree substitute cannot pass and disappear from a fresh
clone. The public MM.S site does not ship these packages.

## Executable iframe capability matrix

`iframe-capability-matrix.json` records the tested minimum policy for the
prepared V7, Touchbaes, and Montran successors. All three require scripts and
their real Freight origin identity, retain only the parent origin through
`strict-origin`, delegate no positive Permissions Policy feature, and deny the
finite reviewed feature set listed in the contract. The Chromium proof fails
if any browser-supported feature is either missing from that set or remains
allowed. The policy is deliberately
`prepared-not-active`: the canonical Cargo payload and deployment manifest must
remain on the active iframe URLs without `sandbox`, `allow`, or
`referrerpolicy` until a later atomic successor upload and Cargo promotion.

The browser proof applies every attribute before navigation, runs the actual
candidate builds, verifies real child origins and origin-only referrers, and
exercises V7 WebGL/visibility, Touchbaes mode/size/pointer dragging, and Montran Blob
worker/range rendering plus both turn paths. It also proves that removing
`allow-same-origin` produces an opaque origin and that removing the referrer
prevents child bootstrap. The finite iframe `allow` list is not represented as
a future-proof deny-all; browsers have no such iframe syntax. Exact proof-input
digests and npm/Phase 2 wiring are guarded so a no-op proof cannot silently
replace the reviewed test.
