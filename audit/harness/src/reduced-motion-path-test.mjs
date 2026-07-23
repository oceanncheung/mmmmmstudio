import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";
import { startStaticServer } from "./server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, "../../..");
const CARGO_ROOT = path.join(PROJECT_ROOT, "cargo");
const WATCHDOG_MS = 120_000;
const watchdog = setTimeout(() => {
  process.stderr.write(`Reduced-motion path test exceeded ${WATCHDOG_MS}ms\n`);
  process.exit(2);
}, WATCHDOG_MS);

function count(source, pattern) {
  return Array.from(source.matchAll(pattern)).length;
}

function cssBlock(source, marker) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing CSS block: ${marker}`);
  const open = source.indexOf("{", start);
  assert.notEqual(open, -1, `missing opening brace for ${marker}`);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated CSS block: ${marker}`);
}

function assertSourceContract() {
  const home = readFileSync(path.join(CARGO_ROOT, "home.template.html"), "utf8");
  const who = readFileSync(path.join(CARGO_ROOT, "who.template.html"), "utf8");
  const write = readFileSync(path.join(CARGO_ROOT, "write.template.html"), "utf8");
  const css = readFileSync(path.join(CARGO_ROOT, "site.css"), "utf8");
  const reduced = cssBlock(css, "@media (prefers-reduced-motion: reduce)");
  const normal = css.replace(reduced, "");

  assert.equal(count(home, /<video\b/g), 27, "Home continuous-video inventory changed");
  assert.equal(count(who, /<video\b/g), 2, "Who continuous-video inventory changed");
  assert.equal(count(home, /\buses="rotation"/g), 1,
    "Home must retain exactly one rotating intro glyph");
  assert.match(
    home,
    /<span\b(?=[^>]*\banimate="4")(?=[^>]*\buses="rotation")[^>]*>/,
    "normal Home intro glyph must retain Cargo rotation speed 4",
  );
  assert.equal(count(write, /\buses="eye-roll"/g), 4,
    "Write must retain exactly four Withered Green rotation hooks");
  assert.equal(count(home, /\bdata-motion-kind="gif-loop"/g), 3,
    "Home must explicitly identify all three native GIF loops");
  assert.match(reduced, /\.mms-intro \[uses="rotation"\][^{]*\{[^}]*animation:\s*none\s*!important/s);
  assert.match(
    reduced,
    /\.mms-writing-withered[^{}]*\[uses="eye-roll"\][^{]*\{[^}]*animation:\s*none\s*!important/s,
  );
  assert.doesNotMatch(
    normal,
    /\[uses="(?:rotation|eye-roll)"\][^{]*\{[^}]*animation:\s*none\s*!important/s,
    "intentional rotations may only be suppressed inside Reduce Motion",
  );
  process.stdout.write(
    "Reduced-motion source contract: PASS (29 videos, 3 GIFs, smiley + 4 Withered hooks preserved)\n",
  );
}

const onePixelGif = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  "base64",
);
const v7Fixture = Buffer.from(`<!doctype html><meta charset="utf-8">
<script>
addEventListener('message', function (event) {
  if (!event.data || event.data.__mmsEmbedVisibility !== 1) return;
  parent.postMessage({ __mmsReducedProbe: 1, data: event.data }, '*');
});
parent.postMessage({
  __mmsEmbedReady: 1,
  protocolVersion: 1,
  kind: 'v7-cup'
}, '*');
</script>`);

async function routeFixtures(context, localOrigin) {
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === localOrigin) {
      await route.continue();
      return;
    }
    if (url.hostname === "freight.cargo.site" &&
        /(?:dg-image2|wtw-image1|wtw-image6)\.gif$/i.test(url.pathname)) {
      await route.fulfill({ status: 200, contentType: "image/gif", body: onePixelGif });
      return;
    }
    if (url.hostname === "freight.cargo.site" &&
        /coffee-cup-bundle\.html$/i.test(url.pathname)) {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: v7Fixture,
      });
      return;
    }
    await route.abort("blockedbyclient");
  });
}

function installMotionRecorder() {
  const plays = [];
  const pauses = [];
  const embedMessages = [];
  Object.defineProperties(window, {
    __mmsReducedPlayIds: { value: plays },
    __mmsReducedPauseIds: { value: pauses },
    __mmsReducedEmbedMessages: { value: embedMessages },
  });
  const mediaId = (element) => element.closest("[data-media-id]")?.dataset.mediaId || "";
  HTMLMediaElement.prototype.play = function auditedPlay() {
    plays.push(mediaId(this));
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function auditedPause() {
    pauses.push(mediaId(this));
  };
  addEventListener("message", (event) => {
    if (event.data?.__mmsReducedProbe === 1) embedMessages.push(structuredClone(event.data.data));
  });
}

async function settle(page) {
  await page.waitForFunction(() => window.__mmsPanelVersion === "responsive-70");
  await page.waitForTimeout(150);
}

async function traverseVideos(page) {
  const frames = page.locator(".mms-frame:has(> video)");
  const total = await frames.count();
  for (let index = 0; index < total; index += 1) {
    await frames.nth(index).scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
  }
  return total;
}

async function browserContract() {
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
      reducedMotion: "reduce",
    });
    await routeFixtures(context, server.origin);
    await context.addInitScript(installMotionRecorder);
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

    await page.goto(`${server.origin}/test.html`, { waitUntil: "domcontentloaded" });
    await settle(page);
    assert.equal(await traverseVideos(page), 27, "Home video traversal count changed");
    for (const id of ["deadgood-01", "wtw-03", "wtw-06"]) {
      await page.locator(`[data-media-id="${id}"]`).scrollIntoViewIfNeeded();
    }
    await page.waitForFunction(() => (
      document.querySelectorAll(
        'img[data-motion-kind="gif-loop"].is-motion-frozen',
      ).length === 3 &&
      document.querySelectorAll("canvas.mms-reduced-motion-still:not([hidden])").length === 3
    ));
    let snapshot = await page.evaluate(() => ({
      plays: [...window.__mmsReducedPlayIds],
      frozenGifs: Array.from(
        document.querySelectorAll('img[data-motion-kind="gif-loop"]'),
        (image) => ({
          frozen: image.classList.contains("is-motion-frozen"),
          hasSource: image.hasAttribute("src"),
        }),
      ),
      v7Loaded: document.querySelector('[data-media-id="v7-01"] iframe')?.dataset.mmsLoaded || "",
      introAnimate: document.querySelector('.mms-intro [uses="rotation"]')?.getAttribute("animate"),
    }));
    assert.deepEqual(snapshot.plays, [], "Reduce Motion must make zero Home video play attempts");
    assert.ok(snapshot.frozenGifs.every((gif) => gif.frozen === true && gif.hasSource === false),
      "Reduce Motion must release every frozen GIF source");
    assert.equal(snapshot.v7Loaded, "", "Reduce Motion must leave V7 on its static poster");
    assert.equal(snapshot.introAnimate, "4", "normal intro rotation hook must remain in markup");

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator('[data-media-id="v7-01"]').scrollIntoViewIfNeeded();
    assert.equal(await traverseVideos(page), 27);
    await page.waitForFunction(() => new Set(window.__mmsReducedPlayIds.filter(Boolean)).size === 27);
    await page.waitForFunction(() => window.__mmsReducedEmbedMessages.some((message) => (
      message.kind === "v7-cup" && message.visible === true && message.protocolVersion === 1
    )));
    snapshot = await page.evaluate(() => ({
      ids: [...new Set(window.__mmsReducedPlayIds.filter(Boolean))],
      frozen: document.querySelectorAll(
        'img[data-motion-kind="gif-loop"].is-motion-frozen',
      ).length,
      gifSources: Array.from(
        document.querySelectorAll('img[data-motion-kind="gif-loop"]'),
        (image) => image.hasAttribute("src"),
      ),
    }));
    assert.equal(snapshot.ids.length, 27, "normal mode must retain all 27 Home video loops");
    assert.equal(snapshot.frozen, 0, "normal mode must restore native GIF presentation");
    assert.ok(snapshot.gifSources.every(Boolean), "normal mode must restore all GIF sources");

    const playsBeforeSecondReduce = await page.evaluate(() => window.__mmsReducedPlayIds.length);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => window.__mmsReducedEmbedMessages.some((message) => (
      message.kind === "v7-cup" && message.visible === false && message.protocolVersion === 1
    )));
    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: false }));
      document.dispatchEvent(new Event("visibilitychange"));
      document.dispatchEvent(new Event("touchstart", { bubbles: true }));
      document.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        pointerType: "touch",
      }));
    });
    await page.waitForTimeout(150);
    assert.equal(
      await page.evaluate(() => window.__mmsReducedPlayIds.length),
      playsBeforeSecondReduce,
      "lifecycle triggers must not restart Home motion while reduction is active",
    );

    await page.goto(`${server.origin}/who-test.html`, { waitUntil: "domcontentloaded" });
    await settle(page);
    assert.equal(await traverseVideos(page), 2, "Who video traversal count changed");
    assert.deepEqual(
      await page.evaluate(() => window.__mmsReducedPlayIds),
      [],
      "Reduce Motion must make zero Who video play attempts",
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    assert.equal(await traverseVideos(page), 2);
    await page.waitForFunction(() => new Set(window.__mmsReducedPlayIds.filter(Boolean)).size === 2);
    assert.equal(
      await page.evaluate(() => new Set(window.__mmsReducedPlayIds.filter(Boolean)).size),
      2,
      "normal mode must retain both Who profile loops",
    );
    assert.deepEqual(pageErrors, [], `reduced-motion browser errors:\n${pageErrors.join("\n")}`);

    await context.close();
    process.stdout.write(
      "Reduced-motion browser contract: PASS (29 videos, 3 GIFs, V7 live preference response)\n",
    );
  } finally {
    await browser.close();
    await server.close();
  }
}

try {
  assertSourceContract();
  await browserContract();
} finally {
  clearTimeout(watchdog);
}
