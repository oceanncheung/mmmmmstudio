import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";
import { startStaticServer } from "./server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const CANDIDATE_ROOT = path.join(REPO_ROOT, "cargo");
const GOLD_ROOT = path.join(CANDIDATE_ROOT, "gold/2026-07-21-responsive-70");
const VIEWPORTS = [
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2940, height: 1200 },
];
const TOLERANCE = 0.25;
const watchdog = setTimeout(() => {
  process.stderr.write("EVIIVE final-pair geometry: FAIL (90s watchdog)\n");
  process.exit(2);
}, 90_000);

function near(label, left, right) {
  assert.ok(
    Math.abs(left - right) <= TOLERANCE,
    `${label}: expected ${left} and ${right} within ${TOLERANCE}px`,
  );
}

async function pairGeometry(page) {
  return page.evaluate(() => {
    const read = (mediaId) => {
      const frame = document.querySelector(`[data-media-id="${mediaId}"]`);
      if (!frame) throw new Error(`missing ${mediaId}`);
      const media = frame.querySelector("img, video");
      if (!media) throw new Error(`missing media child for ${mediaId}`);
      const rect = frame.getBoundingClientRect();
      return {
        mediaId,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        assetWidth: frame.style.getPropertyValue("--asset-w"),
        assetHeight: frame.style.getPropertyValue("--asset-h"),
        dataFit: frame.getAttribute("data-fit"),
        objectFit: getComputedStyle(media).objectFit,
      };
    };
    return {
      first: read("eviive-05"),
      second: read("eviive-06"),
      overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
        document.documentElement.clientWidth,
    };
  });
}

const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath = process.env.MMS_AUDIT_BROWSER_EXECUTABLE ||
  (process.platform === "darwin" && existsSync(macChrome) ? macChrome : "");
const browser = await chromium.launch({
  headless: true,
  timeout: 15_000,
  ...(executablePath
    ? { executablePath }
    : { channel: process.env.MMS_AUDIT_BROWSER_CHANNEL || "chrome" }),
});
const candidateServer = await startStaticServer(CANDIDATE_ROOT);
const goldServer = await startStaticServer(GOLD_ROOT);

try {
  const goldContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await goldContext.route("**/*", async (route) => {
    const origin = new URL(route.request().url()).origin;
    if (origin === goldServer.origin) await route.continue();
    else await route.abort("blockedbyclient");
  });
  const goldPage = await goldContext.newPage();
  await goldPage.goto(`${goldServer.origin}/test.html`, { waitUntil: "domcontentloaded" });
  const gold = await pairGeometry(goldPage);
  assert.ok(
    Math.abs(gold.first.height - gold.second.height) > 1,
    "protected gold must reproduce the latent EVIIVE final-pair height defect",
  );
  await goldContext.close();

  const results = [];
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    await context.route("**/*", async (route) => {
      const origin = new URL(route.request().url()).origin;
      if (origin === candidateServer.origin) await route.continue();
      else await route.abort("blockedbyclient");
    });
    const page = await context.newPage();
    await page.goto(`${candidateServer.origin}/test.html`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
    const result = await pairGeometry(page);
    near(`${viewport.width}px top`, result.first.top, result.second.top);
    near(`${viewport.width}px height`, result.first.height, result.second.height);
    near(`${viewport.width}px bottom`, result.first.bottom, result.second.bottom);
    assert.equal(result.first.assetWidth, "558");
    assert.equal(result.first.assetHeight, "372");
    assert.equal(result.first.dataFit, "contain");
    assert.equal(result.first.objectFit, "contain");
    assert.equal(result.second.assetWidth, "670");
    assert.equal(result.second.assetHeight, "372");
    assert.equal(result.second.dataFit, "cover");
    assert.equal(result.second.objectFit, "cover");
    assert.equal(result.overflowX, 0, `${viewport.width}px page overflow must remain zero`);
    results.push({ viewport: `${viewport.width}x${viewport.height}`, ...result });
    await context.close();
  }

  process.stdout.write(
    `EVIIVE final-pair geometry: PASS (${results.length} expanded viewports; gold defect reproduced)\n`,
  );
} finally {
  await browser.close();
  await candidateServer.close();
  await goldServer.close();
  clearTimeout(watchdog);
}
