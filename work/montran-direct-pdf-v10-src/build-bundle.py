#!/usr/bin/env python3
"""Build montran-booklet-bundle.html from index.html + vendor + config.
Self-contained single file: page-flip inlined classic, pdf.js + worker as
text/plain blocks -> blob imports, config JSON inlined. PDF stays external
(passed via ?pdf= query param on the deployed iframe)."""
import base64, json, pathlib, sys

root = pathlib.Path(__file__).parent
html = (root / "index.html").read_text()
pageflip = (root / "vendor/page-flip.browser.js").read_text()
# Promise.withResolvers ships in Safari/iOS 17.4+ only; pdf.js v4 uses it in
# BOTH the main library and the worker. Prepend a polyfill to each blob so
# older iPads (16.x-17.3) don't die on load.
POLYFILL = (
    "if(!Promise.withResolvers){Promise.withResolvers=function(){"
    "var a,b,p=new Promise(function(res,rej){a=res;b=rej;});"
    "return{promise:p,resolve:a,reject:b};};}\n"
)
pdfmjs = POLYFILL + (root / "vendor/pdf.min.mjs").read_text()
worker = POLYFILL + (root / "vendor/pdf.worker.min.mjs").read_text()
cfg = json.load(open(root / "booklet.config.json"))
poster = root / "loading-poster.jpg"
if poster.exists():
    cfg.setdefault("viewerOptions", {})["loadingPoster"] = (
        "data:image/jpeg;base64," + base64.b64encode(poster.read_bytes()).decode("ascii")
    )

def swap(doc, old, new, label):
    n = doc.count(old)
    if n != 1:
        sys.exit(f"ABORT: pattern '{label}' found {n} times (expected 1)")
    return doc.replace(old, new)

html = swap(
    html,
    '<script src="./vendor/page-flip.browser.js"></script>',
    "<script>\n" + pageflip + "\n</script>\n"
    '    <script type="text/plain" id="tw-pdfjs-src">' + pdfmjs + "</script>\n"
    '    <script type="text/plain" id="tw-worker-src">' + worker + "</script>",
    "page-flip tag",
)
html = swap(
    html,
    'import * as pdfjsLib from "./vendor/pdf.min.mjs";\n\n'
    '      pdfjsLib.GlobalWorkerOptions.workerSrc = "./vendor/pdf.worker.min.mjs";',
    'const __pdfjsBlob = URL.createObjectURL(new Blob([document.getElementById("tw-pdfjs-src").textContent], {type:"text/javascript"}));\n'
    "      const pdfjsLib = await import(__pdfjsBlob);\n\n"
    '      pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([document.getElementById("tw-worker-src").textContent], {type:"text/javascript"}));',
    "pdfjs import",
)
html = swap(
    html,
    'config = await fetch("./booklet.config.json").then((response) => {\n'
    '            if (!response.ok) throw new Error("booklet.config.json could not be loaded.");\n'
    "            return response.json();\n"
    "          });",
    "config = " + json.dumps(cfg) + ";",
    "config fetch",
)
out = root / "montran-booklet-bundle.html"
out.write_text(html)
print(f"built {out.name}: {out.stat().st_size} bytes")
