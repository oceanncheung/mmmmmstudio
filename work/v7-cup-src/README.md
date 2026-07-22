# V7 cup embed source

This directory is the authoritative tracked source for the active V7 cup
embed. Its runtime was recovered from the approved Freight artifact because
the older creative-archive `src/main.js` no longer contained the deployed
fit, visibility, DPR, or ready-message behavior.

Build the self-contained upload artifact with:

```sh
python3 work/v7-cup-src/build-bundle.py
```

The generated `coffee-cup-bundle.html` is ignored. The repository gate checks
that a clean-input build is exactly 780,341 bytes with SHA-256
`ee09e9c282d928f8968b91e1301bc0ba2639102a27c1bf1cd40483ab1b609d0a`,
matching the active Freight file.

Do not edit the generated bundle directly. Change the tracked source, update
the explicit recovery contract only after review, then upload a new version.
