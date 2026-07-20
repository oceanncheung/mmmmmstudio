#!/bin/bash
# Compatibility entrypoint. The shared assembler now builds Home, Who, and
# Write so their shell, navigation, panel, and runtime cannot drift.
set -euo pipefail
cd "$(dirname "$0")"
python3 assemble-pages.py
