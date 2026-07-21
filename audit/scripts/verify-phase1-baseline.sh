#!/bin/sh
# Prove that Phase 2 still rests on the frozen, hashed Round 80 capture.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
BASELINE="$ROOT/docs/audits/2026-07-20T175853-0400-round-80"
EXPECTED_MANIFEST_SHA="efe8a99a378e769db0fd4cf1fbc10033096673d66a5acce00192f1b7198983a6"

actual_manifest_sha=$(shasum -a 256 "$BASELINE/SHA256SUMS" | awk '{print $1}')
if [ "$actual_manifest_sha" != "$EXPECTED_MANIFEST_SHA" ]; then
  echo "Phase 1 manifest hash mismatch: $actual_manifest_sha" >&2
  exit 1
fi

(
  cd "$BASELINE"
  shasum -a 256 -c SHA256SUMS >/dev/null
)

entry_count=$(wc -l < "$BASELINE/SHA256SUMS" | tr -d ' ')
if [ "$entry_count" != "122" ]; then
  echo "Phase 1 manifest entry count mismatch: $entry_count" >&2
  exit 1
fi

echo "Phase 1 baseline: PASS ($entry_count artifacts, manifest $actual_manifest_sha)"
