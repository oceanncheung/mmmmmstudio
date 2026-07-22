# Local reproducibility report

## Result

The canonical Round 80 Cargo mirror is internally consistent and validates,
but the complete deployed experience is not yet reproducible from tracked
source alone.

## Proven reproducible contracts

- Home, Who, and Write bodycopy payload validators pass.
- Shared component parity passes across all three named pages.
- The deterministic local test mirrors pass.
- The site-head payload validator passes.
- `cargo/compose-css-bundle.sh` produces one token block plus one layout block:
  78,609 bytes, SHA-256
  `ee1c2af629f8f31c765fd43b52264d0768baf02144e7055f41b31281ed030af0`,
  with 434 opening and 434 closing braces.
- Current tracked implementation scopes have no working-tree difference from
  `HEAD`; the canonical hashes match `docs/versioning/ROUND-80-STABLE.md`.
- Home contains 13 showcase bands and 68 unique media IDs: 38 images, 27
  videos, and three iframes. Shape policies resolve to 59 crop, six artwork,
  and three interactive items.
- Touchbaes v10 and its unversioned active alias are byte-identical at SHA-256
  `2c4f2c12a8d049ab0805fb8f72f246a95e715154671d5fd8cc808407995afcb5`.

Exact command results are in `validation.txt`; complete hashes and inventories
are in the adjacent machine-readable files.

## Recovery gaps captured for later triage

Phase 1 records these reproducibility facts without assigning severity or
authorizing remediation.

### Montran booklet v17

The active local bundle is ignored generated output:

- path: `work/montran-direct-pdf-v10-src/montran-booklet-direct-pdf-v17.html`
- bytes: 1,936,356
- SHA-256:
  `825cf2c3a1f130cb3445e62443985e845991204d19e0c2154cfd43a36126b49b`

A clean build from the tracked `build-bundle.py` inputs produces 1,926,763
bytes at SHA-256
`56f5c03c64a2f6ea418484a604f14ef750bd0d3796e3d481973c839748562587`.
That rebuild lacks the deployed `FreightRangeTransport`, the 1600-pixel render
ceiling, and the v17 ready-message contract. The active viewer therefore
cannot be recovered from the tracked build inputs.

### V7 cup

The active self-contained V7 bundle is ignored and has no tracked build source
or build command:

- path: `Portfolio assets/_for cargo deployment/V7/coffee cup 3d/coffee-cup-bundle.html`
- bytes: 780,341
- SHA-256:
  `ee09e9c282d928f8968b91e1301bc0ba2639102a27c1bf1cd40483ab1b609d0a`
- embedded dependency: Three.js r160

Losing this working file would leave only its Freight URL, not a deterministic
local reconstruction path.

## Asset and dependency inventory gap

The local Home source references a large Freight dependency surface, but the
repository has no authoritative manifest that maps every Freight object to its
original source, natural dimensions, format, license, owner, and rebuild path.
The Phase 1 public capture found 98 unique Home Freight hashes plus four Who
hashes. `media-inventory.csv` records the Home DOM contract, but it is not yet
a complete asset provenance or license manifest.

## FileProvider risk

The workspace is stored in a cloud-backed location. Before audit reads began,
the read-only local scan observed 1,237 of 1,334 scoped project files as
dataless, including 129 of 130 tracked working files. Reading and hashing the
baseline necessarily hydrated part of that set.

`fileprovider-status.tsv` is the exact post-capture state: 1,930 files when
generated/test residue is included, of which 1,753 remain dataless. Excluding
generated/test residue leaves 1,280 active/support files, of which 1,103 are
dataless. Forty-eight of 130 tracked files remain dataless after capture.

Tracked files remain recoverable from the healthy Git object store. Ignored
creative sources and ignored generated bundles do not receive that guarantee.
FileProvider flags are mutable evidence and should always be interpreted with
the capture timestamp, not as a permanent property of a file.

## Candidate follow-up work for later audit phases

The ordering and severity of this work must be decided through the findings
and approval gates in later phases of the master plan.

1. Promote the exact active Montran v17 behavior into tracked source and make
   its build deterministic.
2. Preserve or reconstruct a tracked V7 source/build path.
3. Create the full Freight asset and dependency/license manifest.
4. Keep generated Cargo output reproducible only from tracked templates,
   partials, scripts, and the complete CSS composer.
5. Keep the protected Round 69 baseline immutable and use Round 80 as the
   current comparison point.
