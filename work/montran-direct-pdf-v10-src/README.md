# Montran booklet embed source

This directory is the authoritative tracked source for the active Montran v17
viewer. `index.html` was recovered by reversing only the tracked builder's
vendor, PDF.js import, and configuration inlining steps from the approved v17
artifact.

Build the self-contained upload artifact with:

```sh
python3 work/montran-direct-pdf-v10-src/build-bundle.py
```

The generated bundle is ignored. The repository gate checks that a clean-input
build is exactly 1,936,356 bytes with SHA-256
`825cf2c3a1f130cb3445e62443985e845991204d19e0c2154cfd43a36126b49b`,
matching the active Freight file.

The PDF remains an external approved Freight asset and is not part of this
viewer-bundle build. PDF URL restriction is tracked separately as
`MMS-AUD-036`; do not fold that behavioral change into source recovery.
