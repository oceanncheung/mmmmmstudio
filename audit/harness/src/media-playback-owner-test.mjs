import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";
import { startStaticServer } from "./server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CARGO_ROOT = process.env.MMS_MEDIA_OWNER_CARGO_ROOT
  ? path.resolve(process.env.MMS_MEDIA_OWNER_CARGO_ROOT)
  : path.resolve(HERE, "../../../cargo");
const watchdog = setTimeout(() => {
  process.stderr.write("Media playback browser probe: FAIL (60s watchdog)\n");
  process.exit(2);
}, 60000);
const server = await startStaticServer(CARGO_ROOT);
const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath = process.env.MMS_AUDIT_BROWSER_EXECUTABLE ||
  (process.platform === "darwin" && existsSync(macChrome) ? macChrome : "");
const browser = await chromium.launch({
  headless: true,
  timeout: 15000,
  args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
  ...(executablePath
    ? { executablePath }
    : { channel: process.env.MMS_AUDIT_BROWSER_CHANNEL || "chrome" }),
});

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: "en-CA",
    timezoneId: "America/Toronto",
  });
  await context.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === server.origin) await route.continue();
    else await route.abort("blockedbyclient");
  });
  await context.addInitScript(() => {
    const attempts = [];
    Object.defineProperty(window, "__mmsPlaybackAttempts", {
      configurable: false,
      enumerable: false,
      value: attempts,
    });
    HTMLMediaElement.prototype.play = function auditedPlay() {
      const frame = this.closest("[data-media-id]") || this;
      const rect = frame.getBoundingClientRect();
      attempts.push({
        mediaId: frame.getAttribute("data-media-id") || "",
        loaded: this.dataset.mmsLoaded || "",
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        at: performance.now(),
      });
      return Promise.resolve();
    };
  });

  const page = await context.newPage();
  await page.goto(`${server.origin}/test.html`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  const settledCount = await page.evaluate(() => window.__mmsPlaybackAttempts.length);
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: false }));
    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.dispatchEvent(new Event("touchstart", { bubbles: true }));
    document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
  });
  await page.waitForTimeout(150);
  const afterLifecycleCount = await page.evaluate(() => window.__mmsPlaybackAttempts.length);
  await page.waitForTimeout(3100);
  const attempts = await page.evaluate(() => window.__mmsPlaybackAttempts);

  if (!settledCount) throw new Error("observer-owned playback made no visible/near play attempt");
  if (attempts.length !== afterLifecycleCount) {
    throw new Error(`play attempts continued after lifecycle settlement (${afterLifecycleCount} -> ${attempts.length})`);
  }
  const unloaded = attempts.filter((attempt) => attempt.loaded !== "1");
  if (unloaded.length) {
    throw new Error(`playback reached ${unloaded.length} video(s) before deferred activation`);
  }
  const far = attempts.filter((attempt) => (
    attempt.bottom < -attempt.viewportHeight ||
    attempt.top > attempt.viewportHeight * 2 ||
    attempt.right < -attempt.viewportWidth ||
    attempt.left > attempt.viewportWidth * 2
  ));
  if (far.length) {
    throw new Error(`playback reached far-offscreen media: ${far.map((item) => item.mediaId).join(", ")}`);
  }

  process.stdout.write(
    `Media playback browser probe: PASS (${attempts.length} visible/near attempts; no 2.5s retry)\n`,
  );
  await context.close();
} finally {
  await browser.close();
  await server.close();
  clearTimeout(watchdog);
}
