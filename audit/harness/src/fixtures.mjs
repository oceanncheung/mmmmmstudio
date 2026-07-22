import { execFile } from "node:child_process";
import { mkdir, cp, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { BASELINE_ROOT, PROJECT_ROOT, pages } from "./config.mjs";

const execFileAsync = promisify(execFile);

const LOCAL_SOURCE_FILES = new Set([
  "assemble-named-pages.sh",
  "assemble-pages.py",
  "assemble-test.sh",
  "compose-css-bundle.sh",
  "compose-persisted-css.py",
  "home-extras.html",
  "home.html",
  "home.template.html",
  "panel.js",
  "shared-compact-nav.html",
  "shared-desktop-clock.html",
  "shared-desktop-nav.html",
  "shared-early-init.html",
  "shared-mobile-header.html",
  "shared-nav-items.html",
  "shared-panel.html",
  "site-head.html",
  "site.css",
  "tokens.css",
  "validate-cargo-payload.sh",
  "validate-shared-components.py",
  "validate-test-mirrors.py",
  "who-intro.html",
  "who.html",
  "who.template.html",
  "write.html",
  "write.template.html",
]);

function fixtureDocument({ bodycopy, css, localCss, siteHead, pageName }) {
  const pageId = pageName === "home" ? "I2398594830" : pageName === "write" ? "P0060651058" : "B2402536676";
  return `<!doctype html>
<html data-theme="white" data-face="serif" data-scale="m" data-shape="straight">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${pageName} — MM.S Cargo draft snapshot</title>
<style data-mms-cargo-global-snapshot>${css}</style>
</head>
<body data-mms-audit-fixture="cargo-draft-snapshot">
<customhtml>${siteHead}</customhtml>
<div class="content">
  <div class="pages">
    <div id="${pageId}" page-url="${pageName}" class="page">
      <div class="page-layout">
        <div class="page-content">
          <bodycopy>${bodycopy}</bodycopy>
        </div>
      </div>
      <style data-mms-cargo-page-css-snapshot>${localCss}</style>
      <style class="mobile-offset-styles"></style>
    </div>
  </div>
</div>
</body>
</html>`;
}

async function writeRoute(root, route, source) {
  const relative = route === "/" ? "index.html" : path.join(route.slice(1), "index.html");
  const destination = path.join(root, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, source, "utf8");
}

export async function prepareLocalFixture(runRoot) {
  const sourceRoot = path.join(PROJECT_ROOT, "cargo");
  const fixtureRoot = path.join(runRoot, "fixtures", "local-deterministic");
  await mkdir(fixtureRoot, { recursive: true });

  const entries = await readdir(sourceRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !LOCAL_SOURCE_FILES.has(entry.name)) continue;
    await cp(path.join(sourceRoot, entry.name), path.join(fixtureRoot, entry.name), {
      preserveTimestamps: true,
    });
  }

  const { stdout, stderr } = await execFileAsync("bash", ["assemble-test.sh", "all"], {
    cwd: fixtureRoot,
    env: { ...process.env, LC_ALL: "C" },
    maxBuffer: 10 * 1024 * 1024,
  });
  await writeFile(
    path.join(fixtureRoot, "assembly.log"),
    `${stdout}${stderr ? `\n[stderr]\n${stderr}` : ""}`,
    "utf8",
  );

  for (const [pageName, definition] of Object.entries(pages)) {
    const source = await readFile(path.join(fixtureRoot, definition.localFile), "utf8");
    await writeRoute(fixtureRoot, definition.path, source);
  }

  return fixtureRoot;
}

export async function prepareCargoDraftSnapshot(runRoot) {
  const captureRoot = path.join(BASELINE_ROOT, "cargo-draft");
  const fixtureRoot = path.join(runRoot, "fixtures", "cargo-draft-snapshot");
  await mkdir(fixtureRoot, { recursive: true });

  const [css, siteHead] = await Promise.all([
    readFile(path.join(captureRoot, "global.css"), "utf8"),
    readFile(path.join(captureRoot, "site-head.html"), "utf8"),
  ]);

  for (const [pageName, definition] of Object.entries(pages)) {
    const [bodycopy, localCss] = await Promise.all([
      readFile(path.join(captureRoot, `${pageName}.bodycopy.html`), "utf8"),
      readFile(path.join(captureRoot, `${pageName}.local.css`), "utf8"),
    ]);
    await writeRoute(
      fixtureRoot,
      definition.path,
      fixtureDocument({ bodycopy, css, localCss, siteHead, pageName }),
    );
  }

  await writeFile(
    path.join(fixtureRoot, "LIMITATIONS.txt"),
    [
      "This fixture is an exact Round 80 saved-payload readback inside representative Cargo wrapper classes.",
      "It is not a live authenticated Cargo editor and does not reproduce hydration, sanitizer timing, or managed-font authorization.",
      "See the Phase 1 cargo-draft capture and the harness run manifest for source hashes and target limitations.",
      "",
    ].join("\n"),
    "utf8",
  );

  return fixtureRoot;
}
