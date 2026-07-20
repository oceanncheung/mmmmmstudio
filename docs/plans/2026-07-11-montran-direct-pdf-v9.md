# Montran direct-PDF booklet v9

Ocean: "i would like to use the pdf directly. read this zip and deploy to
montran. reference the height of the current pdf viewer for montran and if the
new version doesnt have the same height please scale it proportionally to the
same height."

## As built

- Source: `Portfolio assets/_for cargo deployment/Montran/flippable-booklet-export_v2.zip`.
- Confirmed the export is PDF-native: 71-page PDF, bundled PDF.js worker and
  page-flip library, no `pageImages` manifest.
- PDF render-checked with Poppler on the cover and page 20; gradients, type,
  images, and page edges rendered correctly.
- Uploaded the 13 MB PDF and the 2.26 MB self-contained viewer bundle to Cargo.
- Replaced the Montran v8 image-native iframe with v9 and passed the uploaded
  PDF directly through the viewer's `?pdf=` parameter.
- Preserved the old viewer height of 504 design pixels. The new export is 21:9,
  so its proportional width is 1176 design pixels.
- Reload verified: one page root, one v9 viewer URL, one direct PDF URL, old v8
  URL absent, `1176 x 504` persisted, and the PDF cover renders in the iframe.

Draft only. Never publish.
