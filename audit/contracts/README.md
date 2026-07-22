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
