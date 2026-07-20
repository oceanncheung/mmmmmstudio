#!/usr/bin/env python3
"""Upload local files into the active Cargo editor and print a JSON manifest."""

from __future__ import annotations

import base64
import json
import mimetypes
import pathlib
import re
import subprocess
import sys
import tempfile
import time


DROP_TEMPLATE = r"""(() => {
  const frame = [...document.querySelectorAll('iframe')]
    .find((item) => (item.src || '').includes('client-side-rendering'));
  const doc = frame.contentDocument;
  const bodycopy = [...doc.querySelectorAll('bodycopy')]
    .find((item) => !item.querySelector('#digital-clock'));
  const binary = atob(%(payload)s);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const file = new File([bytes], %(name)s, { type: %(mime)s });
  const transfer = new DataTransfer();
  transfer.items.add(file);
  ['dragenter', 'dragover', 'drop'].forEach((type) => {
    bodycopy.dispatchEvent(new DragEvent(type, {
      bubbles: true,
      cancelable: true,
      dataTransfer: transfer
    }));
  });
  return `dropped:${file.name}:${file.size}`;
})()"""

PROBE_TEMPLATE = r"""(() => {
  const matches = performance.getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((url) => url.includes(%(name)s));
  return JSON.stringify(matches.slice(-5));
})()"""


def execute_javascript(source: str) -> str:
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as handle:
        handle.write(source)
        path = handle.name
    try:
        script = (
            'tell application "Dia"\n'
            'tell front window\n'
            'tell active tab\n'
            f'execute javascript (read POSIX file "{path}")\n'
            'end tell\n'
            'end tell\n'
            'end tell\n'
        )
        return subprocess.check_output(["osascript", "-e", script], text=True).strip()
    finally:
        pathlib.Path(path).unlink(missing_ok=True)


def upload(path: pathlib.Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    payload = base64.b64encode(path.read_bytes()).decode("ascii")
    execute_javascript(
        DROP_TEMPLATE
        % {
            "payload": json.dumps(payload),
            "name": json.dumps(path.name),
            "mime": json.dumps(mime),
        }
    )
    probe = PROBE_TEMPLATE % {"name": json.dumps(path.name)}
    deadline = time.monotonic() + 18
    while time.monotonic() < deadline:
        time.sleep(1.2)
        raw = execute_javascript(probe)
        urls = json.loads(json.loads(raw))
        for url in reversed(urls):
            match = re.search(r"freight\.cargocollective\.com/([^/]+)/", url)
            if match:
                return match.group(1)
    raise RuntimeError(f"Cargo did not return a Freight hash for {path.name}")


def main() -> int:
    if len(sys.argv) < 2:
        raise SystemExit("usage: upload-cargo-assets.py FILE [FILE ...]")
    manifest = {}
    for value in sys.argv[1:]:
        path = pathlib.Path(value).resolve()
        freight_hash = upload(path)
        manifest[path.name] = freight_hash
        print(json.dumps({path.name: freight_hash}), flush=True)
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
