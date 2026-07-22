#!/usr/bin/env python3
"""Build the Montran v18 exact-PDF allowlist successor deterministically."""

import argparse
import base64
import json
from pathlib import Path
import sys
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
SHARED = ROOT.parent / "montran-direct-pdf-v10-src"
POLYFILL = (
    "if(!Promise.withResolvers){Promise.withResolvers=function(){"
    "var a,b,p=new Promise(function(res,rej){a=res;b=rej;});"
    "return{promise:p,resolve:a,reject:b};};}\n"
)
APPROVED_PDF_URL = (
    "https://freight.cargo.site/t/original/i/"
    "P3028590574867085520722012452665/"
    "montran_sustainability-report_2025_v4-web.pdf"
)
APPROVED_PDF_BYTES = 13_634_937
APPROVED_PDF_SHA256 = (
    "664dab49810d21acaa0ffbb7d6749268215c1b655ccec11f461d67c147f02629"
)


def replace_once(document: str, old: str, new: str, label: str) -> str:
    count = document.count(old)
    if count != 1:
        raise SystemExit(f"ABORT: pattern {label!r} found {count} times (expected 1)")
    return document.replace(old, new)


def build(output: Path) -> None:
    document = (SHARED / "index.html").read_text(encoding="utf-8")
    pageflip = (SHARED / "vendor/page-flip.browser.js").read_text(encoding="utf-8")
    pdfmjs = POLYFILL + (SHARED / "vendor/pdf.min.mjs").read_text(encoding="utf-8")
    worker = POLYFILL + (SHARED / "vendor/pdf.worker.min.mjs").read_text(encoding="utf-8")
    config = json.loads((SHARED / "booklet.config.json").read_text(encoding="utf-8"))
    policy = json.loads((ROOT / "approved-pdf.json").read_text(encoding="utf-8"))
    if policy.get("schema_version") != 1:
        raise SystemExit("ABORT: unsupported approved-PDF policy schema")
    approved_pdf_url = policy.get("approved_pdf_url")
    approved_pdf_bytes = policy.get("expected_bytes")
    approved_pdf_sha256 = policy.get("expected_sha256")
    parsed_pdf_url = urlsplit(approved_pdf_url) if isinstance(approved_pdf_url, str) else None
    if (
        approved_pdf_url != APPROVED_PDF_URL
        or approved_pdf_bytes != APPROVED_PDF_BYTES
        or approved_pdf_sha256 != APPROVED_PDF_SHA256
        or parsed_pdf_url is None
        or parsed_pdf_url.scheme != "https"
        or parsed_pdf_url.netloc != "freight.cargo.site"
        or parsed_pdf_url.query
        or parsed_pdf_url.fragment
    ):
        raise SystemExit("ABORT: approved PDF identity does not match frozen evidence")

    policy_source = (ROOT / "pdf-policy.js").read_text(encoding="utf-8")
    policy_source = replace_once(
        policy_source,
        "__MMS_APPROVED_PDF_URL_JSON__",
        json.dumps(approved_pdf_url),
        "approved PDF policy token",
    )
    policy_source = replace_once(
        policy_source,
        "__MMS_APPROVED_PDF_BYTES__",
        str(approved_pdf_bytes),
        "approved PDF byte-count token",
    )
    document = replace_once(
        document,
        "          showPreload();\n\n"
        "          const pdfParameter = new URLSearchParams(location.search).get(\"pdf\");\n"
        "          const pdfUrl = pdfParameter || config.pdfFile;",
        "          const pdfParameters = new URLSearchParams(location.search).getAll(\"pdf\");\n"
        "          if (pdfParameters.length > 1) rejectUnapprovedPdf();\n"
        "          const pdfUrl = resolveApprovedPdfUrl(\n"
        "            pdfParameters.length === 1 ? pdfParameters[0] : config.pdfFile,\n"
        "          );\n"
        "          showPreload();",
        "PDF URL resolution",
    )
    pdf_fetch_count = document.count("fetch(url,")
    if pdf_fetch_count != 4:
        raise SystemExit(
            f"ABORT: PDF fetch call count is {pdf_fetch_count} (expected 4)"
        )
    document = document.replace("fetch(url,", "fetchApprovedPdf(url,")
    document = replace_once(
        document,
        "      async function loadBooklet() {",
        policy_source + "\n\n      async function loadBooklet() {",
        "allowlist policy insertion",
    )
    document = replace_once(
        document,
        "          if (imageMode && !pdfParameter) {",
        "          if (imageMode && pdfParameters.length === 0) {",
        "legacy PDF-parameter reference",
    )

    config["pdfFile"] = approved_pdf_url
    poster = SHARED / "loading-poster.jpg"
    if poster.exists():
        config.setdefault("viewerOptions", {})["loadingPoster"] = (
            "data:image/jpeg;base64," + base64.b64encode(poster.read_bytes()).decode("ascii")
        )

    document = replace_once(
        document,
        '<script src="./vendor/page-flip.browser.js"></script>',
        "<script>\n" + pageflip + "\n</script>\n"
        '    <script type="text/plain" id="tw-pdfjs-src">' + pdfmjs + "</script>\n"
        '    <script type="text/plain" id="tw-worker-src">' + worker + "</script>",
        "page-flip tag",
    )
    document = replace_once(
        document,
        'import * as pdfjsLib from "./vendor/pdf.min.mjs";\n\n'
        '      pdfjsLib.GlobalWorkerOptions.workerSrc = "./vendor/pdf.worker.min.mjs";',
        'const __pdfjsBlob = URL.createObjectURL(new Blob([document.getElementById("tw-pdfjs-src").textContent], {type:"text/javascript"}));\n'
        "      const pdfjsLib = await import(__pdfjsBlob);\n\n"
        '      pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([document.getElementById("tw-worker-src").textContent], {type:"text/javascript"}));',
        "pdfjs import",
    )
    document = replace_once(
        document,
        'config = await fetch("./booklet.config.json").then((response) => {\n'
        '            if (!response.ok) throw new Error("booklet.config.json could not be loaded.");\n'
        "            return response.json();\n"
        "          });",
        "config = " + json.dumps(config) + ";",
        "config fetch",
    )

    required_output_markers = (
        "const APPROVED_PDF_URL = ",
        f"const APPROVED_PDF_BYTES = {APPROVED_PDF_BYTES};",
        'const pdfParameters = new URLSearchParams(location.search).getAll("pdf");',
        "if (pdfParameters.length > 1) rejectUnapprovedPdf();",
        'redirect: "error"',
        'credentials: "omit"',
        'referrerPolicy: "no-referrer"',
        "class FreightRangeTransport",
        "const chunkSize = 262144",
        "__mmsBookletReady: 1",
        "version: 17",
    )
    for marker in required_output_markers:
        if marker not in document:
            raise SystemExit(f"ABORT: built candidate lost marker {marker!r}")
    if document.count("fetchApprovedPdf(url,") != 5:
        raise SystemExit("ABORT: built candidate does not contain four guarded PDF fetches")
    if document.count("const response = await fetch(url, requestOptions);") != 1:
        raise SystemExit("ABORT: built candidate native fetch boundary changed")
    for forbidden in (
        'new URLSearchParams(location.search).get("pdf")',
        "const pdfParameter =",
        "pdfParameter || config.pdfFile",
        "if (imageMode && !pdfParameter)",
    ):
        if forbidden in document:
            raise SystemExit(f"ABORT: built candidate retained unsafe marker {forbidden!r}")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(document.encode("utf-8"))
    print(f"built {output}: {output.stat().st_size} bytes")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "montran-booklet-direct-pdf-v18.html",
        help="output bundle path",
    )
    return parser.parse_args()


if __name__ == "__main__":
    try:
        build(parse_args().output.resolve())
    except (OSError, ValueError, TypeError) as error:
        raise SystemExit(f"ABORT: {error}") from error
