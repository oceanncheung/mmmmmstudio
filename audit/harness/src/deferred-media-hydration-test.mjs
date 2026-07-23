import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";
import { startStaticServer } from "./server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CARGO_ROOT = path.resolve(HERE, "../../../cargo");
const WATCHDOG_MS = 60_000;
const watchdog = setTimeout(() => {
  process.stderr.write(`Deferred-media hydration test exceeded ${WATCHDOG_MS}ms\n`);
  process.exit(2);
}, WATCHDOG_MS);

const server = await startStaticServer(CARGO_ROOT);
const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath = process.env.MMS_AUDIT_BROWSER_EXECUTABLE ||
  (process.platform === "darwin" && existsSync(macChrome) ? macChrome : "");
const browser = await chromium.launch({
  headless: true,
  timeout: 15_000,
  args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
  ...(executablePath
    ? { executablePath }
    : { channel: process.env.MMS_AUDIT_BROWSER_CHANNEL || "chrome" }),
});

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: "no-preference",
  });
  await context.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === server.origin) await route.continue();
    else await route.abort("blockedbyclient");
  });
  await context.addInitScript(() => {
    HTMLMediaElement.prototype.play = function auditedPlay() {
      return Promise.resolve();
    };
  });

  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

  await page.goto(`${server.origin}/test.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__mmsPanelVersion === "responsive-70");

  const replaced = await page.evaluate(() => {
    const replaceDeferred = (element) => {
      const clone = element.cloneNode(true);
      clone.removeAttribute("src");
      clone.removeAttribute("data-mms-loaded");
      clone.removeAttribute("data-mms-source");
      clone.removeAttribute("data-motion-ready");
      if (clone.tagName === "VIDEO") clone.setAttribute("preload", "none");
      if (clone.tagName === "IFRAME") clone.setAttribute("loading", "lazy");
      element.replaceWith(clone);
      return clone;
    };

    const critical = Array.from(
      document.querySelectorAll('[data-motion-priority="critical"][data-src]'),
      replaceDeferred,
    );
    const touchbaes = replaceDeferred(
      document.querySelector('iframe[data-embed-kind="touchbaes"]'),
    );
    touchbaes.closest(".mms-band").scrollIntoView({ block: "center" });
    return {
      critical: critical.length,
      currentVideos: document.querySelectorAll(".mms video").length,
      touchbaesCurrent: document.querySelector(
        'iframe[data-embed-kind="touchbaes"]',
      ) === touchbaes,
    };
  });

  assert.deepEqual(replaced, {
    critical: 3,
    currentVideos: 27,
    touchbaesCurrent: true,
  });

  await page.waitForFunction(() => (
    Array.from(
      document.querySelectorAll('[data-motion-priority="critical"][data-src]'),
    ).every((element) => (
      element.dataset.mmsLoaded === "1" &&
      element.getAttribute("src") === element.getAttribute("data-src")
    ))
  ));
  await page.waitForFunction(() => {
    const frame = document.querySelector('iframe[data-embed-kind="touchbaes"]');
    return frame?.dataset.mmsLoaded === "1" &&
      frame.getAttribute("src") === frame.getAttribute("data-src");
  });

  const result = await page.evaluate(() => ({
    criticalLoaded: document.querySelectorAll(
      '[data-motion-priority="critical"][data-mms-loaded="1"]',
    ).length,
    touchbaesLoaded: document.querySelector(
      'iframe[data-embed-kind="touchbaes"]',
    )?.dataset.mmsLoaded || "",
    videos: document.querySelectorAll(".mms video").length,
    roots: document.querySelectorAll(".mms").length,
    dialogs: document.querySelectorAll("dialog.mms-panel").length,
  }));
  assert.deepEqual(result, {
    criticalLoaded: 3,
    touchbaesLoaded: "1",
    videos: 27,
    roots: 1,
    dialogs: 1,
  });

  assert.deepEqual(pageErrors, [], `unexpected page errors: ${pageErrors.join("\n")}`);

  process.stdout.write(
    "Deferred-media hydration test: PASS (node hydration recovered)\n",
  );
  await context.close();
} finally {
  await browser.close();
  await server.close();
  clearTimeout(watchdog);
}
