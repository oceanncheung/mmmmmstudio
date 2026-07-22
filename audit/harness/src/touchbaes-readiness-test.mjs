import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";
import { startStaticServer } from "./server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CARGO_ROOT = process.env.MMS_TOUCHBAES_CARGO_ROOT
  ? path.resolve(process.env.MMS_TOUCHBAES_CARGO_ROOT)
  : path.resolve(HERE, "../../../cargo");
const watchdog = setTimeout(() => {
  process.stderr.write("Touchbaes iPad readiness: FAIL (60s watchdog)\n");
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

const IPAD_SAFARI_UA =
  "Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";

async function verifyViewport(viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    userAgent: IPAD_SAFARI_UA,
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
    Object.defineProperty(window, "__mmsTouchbaesPlayAttempts", {
      configurable: false,
      enumerable: false,
      value: attempts,
    });
    HTMLMediaElement.prototype.play = function auditedPlay() {
      attempts.push({
        mediaId: this.closest("[data-media-id]")?.getAttribute("data-media-id") || "",
        eventTime: performance.now(),
      });
      return Promise.resolve();
    };
  });

  const page = await context.newPage();
  await page.goto(`${server.origin}/test.html`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-band="touchbaes"]').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => (
    document.querySelector('[data-media-id="touchbaes-02"] video')?.dataset.mmsLoaded === "1"
  ));

  const state = await page.evaluate(() => {
    const target = document.querySelector('[data-media-id="touchbaes-02"] video');
    const sibling = document.querySelector('[data-media-id="touchbaes-01"] video');
    const river = target.closest(".mms-river");
    const root = document.querySelector(".mms");
    const targetRect = target.getBoundingClientRect();
    return {
      target: {
        loaded: target.dataset.mmsLoaded,
        source: target.getAttribute("src"),
        selectedSource: target.dataset.mmsSource,
        expectedIOSSource: target.getAttribute("data-mp4"),
        preload: target.getAttribute("preload"),
        poster: target.getAttribute("poster"),
        sourcePoster: target.getAttribute("data-poster"),
        width: targetRect.width,
        height: targetRect.height,
      },
      siblingPreload: sibling.getAttribute("preload"),
      river: {
        overflowX: getComputedStyle(river).overflowX,
        touchAction: getComputedStyle(river).touchAction,
      },
      pageOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - window.innerWidth,
        document.body.scrollWidth - window.innerWidth,
        root.scrollWidth - root.clientWidth,
      ),
    };
  });

  if (state.target.loaded !== "1") throw new Error(`${viewport.width}: target was not activated`);
  if (state.target.source !== state.target.expectedIOSSource ||
      state.target.selectedSource !== state.target.expectedIOSSource) {
    throw new Error(`${viewport.width}: iPad did not select the HEVC-alpha source`);
  }
  if (state.target.preload !== "auto") {
    throw new Error(`${viewport.width}: Touchbaes alpha video retained preload=${state.target.preload}`);
  }
  if (!state.target.poster.includes("/w/720/q/85/i/") ||
      !state.target.sourcePoster.includes("/t/original/i/")) {
    throw new Error(`${viewport.width}: runtime poster rendition or saved poster identity drifted`);
  }
  if (state.siblingPreload !== "none") {
    throw new Error(`${viewport.width}: readiness preload leaked to another Touchbaes video`);
  }
  if (state.target.width <= 0 || state.target.height <= 0) {
    throw new Error(`${viewport.width}: Touchbaes alpha frame lost geometry`);
  }
  const expectedTouchAction = viewport.width < 1024 ? "pan-x pan-y" : "auto";
  if (state.river.overflowX !== "auto" || state.river.touchAction !== expectedTouchAction) {
    throw new Error(`${viewport.width}: native Touchbaes river behavior changed`);
  }
  if (state.pageOverflow !== 0) throw new Error(`${viewport.width}: page overflow ${state.pageOverflow}px`);

  const beforeRetry = await page.evaluate(() => (
    window.__mmsTouchbaesPlayAttempts.filter((item) => item.mediaId === "touchbaes-02").length
  ));
  await page.locator('[data-media-id="touchbaes-02"] video').dispatchEvent("loadeddata");
  const afterRetry = await page.evaluate(() => (
    window.__mmsTouchbaesPlayAttempts.filter((item) => item.mediaId === "touchbaes-02").length
  ));
  if (afterRetry !== beforeRetry + 1) {
    throw new Error(`${viewport.width}: first-frame readiness did not retry playback exactly once`);
  }

  await page.locator('[data-media-id="touchbaes-02"] video').dispatchEvent("error");
  const errorFallback = await page.evaluate(() => {
    const target = document.querySelector('[data-media-id="touchbaes-02"] video');
    return {
      error: target.dataset.motionError,
      poster: target.getAttribute("poster"),
    };
  });
  if (errorFallback.error !== "1" || !errorFallback.poster.includes("/w/720/q/85/i/")) {
    throw new Error(`${viewport.width}: media error did not retain the optimized poster fallback`);
  }

  await context.close();
  process.stdout.write(`Touchbaes iPad readiness ${viewport.width}x${viewport.height}: PASS\n`);
}

try {
  await verifyViewport({ width: 768, height: 1024 });
  await verifyViewport({ width: 1024, height: 1366 });
} finally {
  await browser.close();
  await server.close();
  clearTimeout(watchdog);
}
