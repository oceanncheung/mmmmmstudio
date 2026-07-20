#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOME_HTML="$ROOT/cargo/home.html"
OUTPUT_DIR="$ROOT/Portfolio assets/_for cargo deployment/_motion posters"
mkdir -p "$OUTPUT_DIR"

node - "$HOME_HTML" <<'NODE' | while IFS=$'\t' read -r index source alpha filename; do
const fs = require('fs');
const sourceFile = process.argv[2];
const html = fs.readFileSync(sourceFile, 'utf8');
const videos = [...html.matchAll(/<video\b([^>]*)>/g)];
videos.forEach((match, index) => {
  const attributes = match[1];
  const source = (attributes.match(/data-src="([^"]+)"/) || [])[1];
  if (!source) return;
  const alpha = /data-mp4=/.test(attributes);
  const path = new URL(source).pathname;
  const base = decodeURIComponent(path.split('/').pop() || `motion-${index + 1}`)
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-');
  const extension = alpha ? 'png' : 'jpg';
  process.stdout.write([index + 1, source, alpha ? '1' : '0', `${String(index + 1).padStart(2, '0')}-${base}-poster.${extension}`].join('\t') + '\n');
});
NODE
  destination="$OUTPUT_DIR/$filename"
  if [[ -s "$destination" ]]; then
    printf 'exists %s\n' "$filename"
    continue
  fi
  if [[ "$alpha" == "1" ]]; then
    ffmpeg -hide_banner -loglevel error -ss 0.3 -i "$source" -frames:v 1 \
      -vf "scale='min(1600,iw)':'min(1600,ih)':force_original_aspect_ratio=decrease:flags=lanczos,format=rgba" \
      -compression_level 8 "$destination"
  else
    ffmpeg -hide_banner -loglevel error -t 1 -i "$source" -frames:v 1 \
      -vf "thumbnail=60,scale='min(1600,iw)':'min(1600,ih)':force_original_aspect_ratio=decrease:flags=lanczos" \
      -q:v 3 "$destination"
  fi
  printf 'built %s\n' "$filename"
done

find "$OUTPUT_DIR" -type f \( -name '*-poster.jpg' -o -name '*-poster.png' \) -print0 \
  | xargs -0 ls -lh
