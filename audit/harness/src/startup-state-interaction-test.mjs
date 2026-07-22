import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";
import { startStaticServer } from "./server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CARGO_ROOT = path.resolve(HERE, "../../../cargo");
const WATCHDOG_MS = 90_000;
const watchdog = setTimeout(() => {
  process.stderr.write("Startup/state interaction probe: FAIL (90s watchdog)\n");
  process.exit(2);
}, WATCHDOG_MS);

const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath = process.env.MMS_AUDIT_BROWSER_EXECUTABLE ||
  (process.platform === "darwin" && existsSync(macChrome) ? macChrome : "");

function installPreviewRecorder(savedState) {
  return ({ state }) => {
    try {
      localStorage.clear();
      Object.entries(state).forEach(([axis, value]) => {
        localStorage.setItem(`mms-${axis}`, value);
      });
    } catch {}
    window.__mmsPreviewProbe = { cuts: [], done: [] };
    document.addEventListener("mms-render-preview-cut", (event) => {
      window.__mmsPreviewProbe.cuts.push({
        at: performance.now(),
        detail: structuredClone(event.detail),
      });
    });
    document.addEventListener("mms-render-preview-done", (event) => {
      window.__mmsPreviewProbe.done.push({
        at: performance.now(),
        detail: structuredClone(event.detail),
      });
    });
  };
}

async function blockExternalRequests(context, localOrigin) {
  await context.route("**/*", async (route) => {
    const origin = new URL(route.request().url()).origin;
    if (origin === localOrigin) await route.continue();
    else await route.abort("blockedbyclient");
  });
}

function monitorErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.stack || error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (!/Failed to load resource: net::ERR_BLOCKED_BY_CLIENT/.test(text)) errors.push(text);
  });
  return errors;
}

async function stateSnapshot(page) {
  return page.evaluate(() => {
    const axes = ["theme", "face", "scale", "shape"];
    const state = Object.fromEntries(axes.map((axis) => [
      axis,
      document.documentElement.getAttribute(`data-${axis}`),
    ]));
    const stored = {};
    axes.forEach((axis) => {
      try { stored[axis] = localStorage.getItem(`mms-${axis}`); } catch { stored[axis] = null; }
    });
    return {
      state,
      stored,
      controller: window.__mmsRenderPreview ? {
        version: window.__mmsRenderPreview.version,
        count: window.__mmsRenderPreview.count,
        holdMs: window.__mmsRenderPreview.holdMs,
        totalMs: window.__mmsRenderPreview.totalMs,
        active: window.__mmsRenderPreview.active,
        status: window.__mmsRenderPreview.status,
        cut: window.__mmsRenderPreview.cut,
        target: structuredClone(window.__mmsRenderPreview.target),
        sequence: structuredClone(window.__mmsRenderPreview.sequence),
      } : null,
      events: structuredClone(window.__mmsPreviewProbe || { cuts: [], done: [] }),
      previewAttribute: document.documentElement.getAttribute("data-render-preview"),
      previewCutAttribute: document.documentElement.getAttribute("data-render-preview-cut"),
      slider: document.getElementById("mms-scale")?.value ?? null,
      pressed: {
        theme: Array.from(document.querySelectorAll('[data-theme-set][aria-pressed="true"]'), (node) => node.dataset.themeSet),
        face: Array.from(document.querySelectorAll('[data-face-set][aria-pressed="true"]'), (node) => node.dataset.faceSet),
        shape: Array.from(document.querySelectorAll('[data-shape-set][aria-pressed="true"]'), (node) => node.dataset.shapeSet),
      },
      roots: document.querySelectorAll(".mms").length,
      dialogs: document.querySelectorAll("dialog.mms-panel").length,
      overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
        document.documentElement.clientWidth,
    };
  });
}

async function assertSettledState(page, expected) {
  const snapshot = await stateSnapshot(page);
  assert.deepEqual(snapshot.state, expected, "render preview must settle on the exact saved/selected state");
  assert.deepEqual(snapshot.stored, expected, "settled axes must match the persisted visitor state");
  assert.equal(snapshot.previewAttribute, null, "settled page must remove the render-preview marker");
  assert.equal(snapshot.previewCutAttribute, null, "settled page must remove the preview-cut marker");
  assert.equal(snapshot.roots, 1, "state restoration must leave one MM.S root");
  assert.equal(snapshot.dialogs, 1, "state restoration must leave one control panel");
  assert.equal(snapshot.overflowX, 0, "state restoration must preserve zero page-level overflow");
  return snapshot;
}

const server = await startStaticServer(CARGO_ROOT);
const browser = await chromium.launch({
  headless: true,
  timeout: 15_000,
  ...(executablePath
    ? { executablePath }
    : { channel: process.env.MMS_AUDIT_BROWSER_CHANNEL || "chrome" }),
});

try {
  {
    const target = { theme: "quirky", face: "mono", scale: "l", shape: "rounded" };
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "no-preference",
    });
    await blockExternalRequests(context, server.origin);
    await context.addInitScript(installPreviewRecorder(target), { state: target });
    const page = await context.newPage();
    const errors = monitorErrors(page);
    await page.goto(`${server.origin}/test.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__mmsRenderPreview?.status === "done");

    const snapshot = await assertSettledState(page, target);
    assert.equal(snapshot.controller.version, 4, "startup controller version must remain explicit");
    assert.equal(snapshot.controller.count, 4, "startup must contain four preview cuts before landing");
    assert.equal(snapshot.controller.holdMs, 375, "every startup cut must keep the approved 375ms hold");
    assert.equal(snapshot.controller.totalMs, 1500, "four startup cuts must total exactly 1.5 seconds");
    assert.equal(snapshot.controller.active, false, "completed startup must release its active owner");
    assert.equal(snapshot.events.cuts.length, 4, "a normal startup must paint exactly four preview cuts");
    assert.deepEqual(snapshot.events.cuts.map((entry) => entry.detail.index), [1, 2, 3, 4]);
    assert.equal(snapshot.events.done.length, 1, "startup must emit one completion event");
    assert.equal(snapshot.events.done[0].detail.reason, "complete", "normal startup must complete naturally");
    assert.deepEqual(snapshot.controller.target, target, "controller target must equal saved visitor state");
    assert.equal(new Set(snapshot.controller.sequence.map((entry) => JSON.stringify(entry))).size, 4,
      "every preview combination must be unique");
    assert.equal(snapshot.controller.sequence.some((entry) => entry.theme === target.theme), false,
      "preview themes must not duplicate the landing theme");
    const finalCut = snapshot.controller.sequence.at(-1);
    assert.notEqual(finalCut.theme, target.theme, "final preview theme must differ from landing theme");
    assert.notEqual(finalCut.face, target.face, "final preview face must differ from landing face");
    assert.notEqual(finalCut.scale, target.scale, "final preview scale must differ from landing scale");
    assert.deepEqual(errors, [], "normal startup must remain free of runtime errors");
    process.stdout.write("Startup completion: PASS (4 x 375ms + exact landing)\n");
    await context.close();
  }

  {
    const target = { theme: "white", face: "serif", scale: "m", shape: "straight" };
    const selected = { ...target, theme: "contrast" };
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "no-preference",
    });
    await blockExternalRequests(context, server.origin);
    await context.addInitScript(installPreviewRecorder(target), { state: target });
    const page = await context.newPage();
    const errors = monitorErrors(page);
    await page.goto(`${server.origin}/test.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__mmsRenderPreview?.active === true &&
      window.__mmsPreviewProbe?.cuts?.length >= 1);
    const cutsBeforeInteraction = await page.evaluate(() => window.__mmsPreviewProbe.cuts.length);
    await page.locator('[data-theme-set="contrast"]').click();
    await page.waitForFunction(() => window.__mmsRenderPreview?.status === "done");
    await page.waitForTimeout(1700);

    const snapshot = await assertSettledState(page, selected);
    assert.equal(snapshot.events.done.length, 1, "interaction cancellation must finish exactly once");
    assert.equal(snapshot.events.done[0].detail.reason, "interaction",
      "the first real interaction must cancel the startup sequence");
    assert.equal(snapshot.events.cuts.length, cutsBeforeInteraction,
      "no preview cut may run after visitor interaction");
    assert.deepEqual(snapshot.pressed.theme, ["contrast"], "selected theme UI must stay synchronized");
    assert.deepEqual(errors, [], "interrupted startup must remain free of runtime errors");
    process.stdout.write("Startup interruption: PASS (visitor state wins permanently)\n");
    await context.close();
  }

  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    await blockExternalRequests(context, server.origin);
    const page = await context.newPage();
    const errors = monitorErrors(page);
    await page.goto(`${server.origin}/test.html`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('[data-theme-set="girly"]').click();
    await page.locator('[data-face-set="mono"]').click();
    await page.locator('[data-shape-set="oval"]').click();
    await page.locator("#mms-scale").evaluate((slider) => {
      slider.value = "3";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const expected = { theme: "girly", face: "mono", scale: "xl", shape: "oval" };
    await assertSettledState(page, expected);

    await page.goto(`${server.origin}/who-test.html`, { waitUntil: "domcontentloaded" });
    await assertSettledState(page, expected);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__mmsPanelVersion === "responsive-70");
    const restored = await assertSettledState(page, expected);
    assert.equal(restored.slider, "3", "back/forward restoration must synchronize the scale control");
    assert.deepEqual(restored.pressed.theme, ["girly"]);
    assert.deepEqual(restored.pressed.face, ["mono"]);
    assert.deepEqual(restored.pressed.shape, ["oval"]);
    assert.deepEqual(errors, [], "route and back/forward restoration must remain error-free");
    process.stdout.write("Back/forward state restoration: PASS\n");
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
  clearTimeout(watchdog);
}
