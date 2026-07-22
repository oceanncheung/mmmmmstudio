#!/usr/bin/env node

import assert from "node:assert/strict";

import { launchAuditBrowser } from "./collector.mjs";
import { PROJECT_ROOT } from "./config.mjs";
import { startStaticServer } from "./server.mjs";

const WATCHDOG_MS = 90_000;
const COMPACT_VIEWPORT = { width: 390, height: 844 };
const EXPANDED_VIEWPORT = { width: 1024, height: 844 };
const FREIGHT_ORIGIN = "https://freight.cargo.site";
const WRONG_ORIGIN = "https://wrong.invalid";
const EMBED_PROTOCOL_VERSION = 1;
const MALFORMED_EMBED_PROTOCOL_VALUES = ["", "v1", "1x", "01"];
const TWEEZER_OPEN_SRC = `${FREIGHT_ORIGIN}/t/original/i/T3022869107490037873358127281977/tweezer-open.png`;
const TWEEZER_CLOSED_SRC = `${FREIGHT_ORIGIN}/t/original/i/N3022869107453144385210708178745/tweezer-close.png`;
const TWEEZER_FRONT_SRC = `${FREIGHT_ORIGIN}/t/original/i/V3022869107471591129284417730361/tweezer-front-arm.png`;
const APPROVED_STICKER_SRC = `${FREIGHT_ORIGIN}/t/original/i/F3022869107379357408915869972281/sticker-cat.png`;

const SELECTORS = Object.freeze({
  v7: 'iframe[data-embed-kind="v7-cup"]',
  touchbaes: 'iframe[data-embed-kind="touchbaes"]',
  montran: 'iframe[data-slot="montran-booklet"]',
});

const FIXTURE_HTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>MM.S embed contract fixture</title></head>
<body>
<script>
(() => {
  const received = [];
  window.addEventListener("message", (event) => {
    received.push({ data: event.data, origin: event.origin });
  });
  Object.defineProperty(window, "__mmsEmbedFixture", {
    configurable: false,
    enumerable: false,
    value: {
      clear() { received.length = 0; },
      records() { return received.map((record) => ({ data: record.data, origin: record.origin })); },
      send(data, targetOrigin) { window.parent.postMessage(data, targetOrigin); },
    },
  });
})();
</script>
</body>
</html>`;

function protocolEnvelope(kind, payload) {
  return { protocolVersion: EMBED_PROTOCOL_VERSION, kind, ...payload };
}

async function setEmbedProtocol(page, selector, value) {
  const frame = page.locator(selector);
  await frame.evaluate((element, protocol) => {
    element.setAttribute("data-embed-protocol", protocol);
  }, value);
  assert.equal(
    await frame.getAttribute("data-embed-protocol"),
    value,
    `${selector} did not retain the exact protocol attribute value`,
  );
}

async function fixtureFrame(page, selector) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: "attached" });
  const source = await locator.getAttribute("data-src");
  assert.ok(source, `${selector} is missing its deferred source`);
  await locator.evaluate((element, nextSource) => {
    element.setAttribute("loading", "eager");
    if (!element.dataset.mmsSource) element.dataset.mmsSource = nextSource;
    element.dataset.mmsLoaded = "1";
    if (element.getAttribute("src") !== nextSource) element.setAttribute("src", nextSource);
  }, source);
  const handle = await locator.elementHandle();
  const frame = await handle?.contentFrame();
  assert.ok(frame, `${selector} did not create a browsing context`);
  await frame.waitForURL((url) => url.origin === FREIGHT_ORIGIN);
  await frame.waitForFunction(() => Boolean(window.__mmsEmbedFixture));
  return frame;
}

async function navigateFixture(page, selector, url) {
  const locator = page.locator(selector);
  const handle = await locator.elementHandle();
  assert.ok(handle, `${selector} is unavailable for fixture navigation`);
  await locator.evaluate((element, nextUrl) => element.setAttribute("src", nextUrl), url);
  const frame = await handle.contentFrame();
  assert.ok(frame, `${selector} lost its browsing context during navigation`);
  const expectedOrigin = new URL(url).origin;
  await frame.waitForURL((currentUrl) => currentUrl.origin === expectedOrigin);
  await frame.waitForFunction(() => Boolean(window.__mmsEmbedFixture));
  return frame;
}

async function addStaleFixture(page) {
  await page.evaluate((source) => {
    const existing = document.getElementById("mms-stale-embed-fixture");
    if (existing) existing.remove();
    const frame = document.createElement("iframe");
    frame.id = "mms-stale-embed-fixture";
    frame.hidden = true;
    frame.src = source;
    document.body.appendChild(frame);
  }, `${FREIGHT_ORIGIN}/m/stale-contract-fixture.html`);
  const handle = await page.locator("#mms-stale-embed-fixture").elementHandle();
  const frame = await handle?.contentFrame();
  assert.ok(frame, "stale fixture did not create a browsing context");
  await frame.waitForURL((url) => url.origin === FREIGHT_ORIGIN);
  await frame.waitForFunction(() => Boolean(window.__mmsEmbedFixture));
  return frame;
}

async function clearFixture(frame) {
  await frame.evaluate(() => window.__mmsEmbedFixture.clear());
}

async function fixtureRecords(frame) {
  return frame.evaluate(() => window.__mmsEmbedFixture.records());
}

async function sendFromFixture(frame, data, parentOrigin) {
  await frame.evaluate(({ payload, origin }) => {
    window.__mmsEmbedFixture.send(payload, origin);
  }, { payload: data, origin: parentOrigin });
}

function messagesWith(records, marker) {
  return records.filter((record) => record.data && record.data[marker] === 1);
}

async function waitForMessage(frame, marker, expectedValue) {
  await frame.waitForFunction(({ key, value }) => (
    window.__mmsEmbedFixture.records().some((record) => (
      record.data && record.data[key] === 1 &&
      (value === undefined || record.data.compact === value)
    ))
  ), { key: marker, value: expectedValue }, { timeout: 15_000 });
}

async function exerciseParentOutbound({ page, v7Frame, touchbaesFrame, parentOrigin }) {
  await waitForMessage(touchbaesFrame, "__mmsGameMode", true);
  const modes = messagesWith(await fixtureRecords(touchbaesFrame), "__mmsGameMode");
  assert.ok(modes.length >= 1, "Touchbaes did not receive its parent mode envelope");
  assert.deepEqual(modes.at(-1).data, protocolEnvelope("touchbaes", {
    __mmsGameMode: 1,
    compact: true,
  }), "Touchbaes parent mode envelope is not versioned exactly");
  assert.equal(modes.at(-1).origin, parentOrigin, "Touchbaes mode came from the wrong parent origin");

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  await page.locator(SELECTORS.v7).scrollIntoViewIfNeeded();
  await waitForMessage(v7Frame, "__mmsEmbedVisibility");
  let visibility = messagesWith(await fixtureRecords(v7Frame), "__mmsEmbedVisibility");
  const latestVisibility = visibility.at(-1);
  assert.equal(latestVisibility.data.protocolVersion, EMBED_PROTOCOL_VERSION,
    "V7 visibility is missing its protocol version");
  assert.equal(latestVisibility.data.kind, "v7-cup", "V7 visibility has the wrong kind");
  assert.equal(typeof latestVisibility.data.visible, "boolean", "V7 visibility is not a strict boolean");
  assert.equal(latestVisibility.origin, parentOrigin, "V7 visibility came from the wrong parent origin");

  const originalSource = await page.locator(SELECTORS.v7).getAttribute("data-src");
  assert.ok(originalSource, "V7 source disappeared before exact-target validation");
  v7Frame = await navigateFixture(page, SELECTORS.v7, `${WRONG_ORIGIN}/v7-outbound-target.html`);
  await clearFixture(v7Frame);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  await page.locator(SELECTORS.v7).scrollIntoViewIfNeeded();
  await page.waitForTimeout(125);
  visibility = messagesWith(await fixtureRecords(v7Frame), "__mmsEmbedVisibility");
  assert.equal(visibility.length, 0, "wrong-origin V7 frame received an exact-origin visibility message");

  v7Frame = await navigateFixture(page, SELECTORS.v7, originalSource);
  await clearFixture(v7Frame);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  await page.locator(SELECTORS.v7).scrollIntoViewIfNeeded();
  await waitForMessage(v7Frame, "__mmsEmbedVisibility");
  visibility = messagesWith(await fixtureRecords(v7Frame), "__mmsEmbedVisibility");
  assert.ok(visibility.every((record) => (
    record.data.protocolVersion === EMBED_PROTOCOL_VERSION &&
    record.data.kind === "v7-cup" &&
    typeof record.data.visible === "boolean" &&
    record.origin === parentOrigin
  )), "restored V7 received a malformed visibility envelope");
  process.stdout.write("Exact parent embed targets and versioned outbound envelopes: PASS\n");
  return v7Frame;
}

async function resetReadiness(page, selector) {
  await page.locator(selector).evaluate((element) => {
    delete element.dataset.motionReady;
    element.style.backgroundImage = "linear-gradient(rgb(1, 2, 3), rgb(1, 2, 3))";
  });
}

async function readinessState(page, selector) {
  return page.locator(selector).evaluate((element) => ({
    ready: element.dataset.motionReady || "",
    backgroundImage: element.style.backgroundImage,
  }));
}

async function assertReadinessUntouched(page, selector, label) {
  const state = await readinessState(page, selector);
  assert.equal(state.ready, "", `${label}: rejected readiness changed the ready marker`);
  assert.notEqual(state.backgroundImage, "none", `${label}: rejected readiness removed the poster`);
}

async function gameHeightState(page) {
  return page.locator(SELECTORS.touchbaes).evaluate((frame) => ({
    measured: frame.dataset.gameMeasured || "",
    inlineHeight: frame.style.getPropertyValue("height"),
    inlinePriority: frame.style.getPropertyPriority("height"),
    computedHeight: frame.getBoundingClientRect().height,
    rootHeight: document.querySelector(".mms")?.style.getPropertyValue("--mobile-game-px-height") || "",
  }));
}

async function rigState(page) {
  return page.evaluate(() => {
    const rig = document.getElementById("mms-tw-rig");
    if (!rig) return null;
    const images = Array.from(rig.querySelectorAll("img"), (image) => ({
      className: image.className,
      src: image.src,
      hidden: image.hidden,
      width: image.style.width,
      dragR: image.style.getPropertyValue("--drag-r"),
      dragOffsetX: image.style.getPropertyValue("--drag-offset-x"),
      dragOffsetY: image.style.getPropertyValue("--drag-offset-y"),
      dragOriginX: image.style.getPropertyValue("--drag-origin-x"),
      dragOriginY: image.style.getPropertyValue("--drag-origin-y"),
      onerror: image.getAttribute("onerror"),
      onload: image.getAttribute("onload"),
    }));
    return {
      display: getComputedStyle(rig).display,
      left: rig.style.left,
      top: rig.style.top,
      width: rig.style.width,
      scriptCount: rig.querySelectorAll("script").length,
      imageCount: images.length,
      images,
    };
  });
}

function assertGameStateEqual(actual, expected, label) {
  assert.equal(actual.measured, expected.measured, `${label}: measured marker changed`);
  assert.equal(actual.inlineHeight, expected.inlineHeight, `${label}: inline height changed`);
  assert.equal(actual.inlinePriority, expected.inlinePriority, `${label}: inline priority changed`);
  assert.equal(actual.rootHeight, expected.rootHeight, `${label}: root height token changed`);
  assert.ok(
    Math.abs(actual.computedHeight - expected.computedHeight) <= 0.01,
    `${label}: computed height changed from ${expected.computedHeight} to ${actual.computedHeight}`,
  );
}

async function exerciseGenericReadiness({ page, v7Frame, touchbaesFrame, staleFrame, parentOrigin }) {
  await resetReadiness(page, SELECTORS.v7);
  await resetReadiness(page, SELECTORS.touchbaes);

  for (const [label, payload] of [
    ["null payload", null],
    ["primitive payload", "ready"],
    ["missing marker", protocolEnvelope("v7-cup", {})],
    ["missing kind", { __mmsEmbedReady: 1, protocolVersion: EMBED_PROTOCOL_VERSION }],
    ["wrong kind", protocolEnvelope("touchbaes", { __mmsEmbedReady: 1 })],
    ["missing protocol version", { __mmsEmbedReady: 1, kind: "v7-cup" }],
    ["stale protocol version", { __mmsEmbedReady: 1, kind: "v7-cup", protocolVersion: 0 }],
    ["future protocol version", { __mmsEmbedReady: 1, kind: "v7-cup", protocolVersion: 2 }],
    ["string protocol version", { __mmsEmbedReady: 1, kind: "v7-cup", protocolVersion: "1" }],
  ]) {
    await sendFromFixture(v7Frame, payload, parentOrigin);
    await page.waitForTimeout(25);
    await assertReadinessUntouched(page, SELECTORS.v7, `generic ${label}`);
  }

  await sendFromFixture(staleFrame, protocolEnvelope("v7-cup", { __mmsEmbedReady: 1 }), parentOrigin);
  await page.waitForTimeout(25);
  await assertReadinessUntouched(page, SELECTORS.v7, "generic stale source");

  const originalV7Source = await page.locator(SELECTORS.v7).getAttribute("data-src");
  assert.ok(originalV7Source, "V7 source disappeared before wrong-origin test");
  v7Frame = await navigateFixture(page, SELECTORS.v7, `${WRONG_ORIGIN}/v7-current-window.html`);
  await sendFromFixture(v7Frame, protocolEnvelope("v7-cup", { __mmsEmbedReady: 1 }), parentOrigin);
  await page.waitForTimeout(25);
  await assertReadinessUntouched(page, SELECTORS.v7, "generic wrong origin");
  v7Frame = await navigateFixture(page, SELECTORS.v7, originalV7Source);
  await resetReadiness(page, SELECTORS.v7);

  for (const malformedProtocol of MALFORMED_EMBED_PROTOCOL_VALUES) {
    await setEmbedProtocol(page, SELECTORS.v7, malformedProtocol);
    await sendFromFixture(v7Frame, protocolEnvelope("v7-cup", { __mmsEmbedReady: 1 }), parentOrigin);
    await page.waitForTimeout(25);
    await assertReadinessUntouched(
      page,
      SELECTORS.v7,
      `generic malformed protocol attribute ${JSON.stringify(malformedProtocol)}`,
    );
  }
  await setEmbedProtocol(page, SELECTORS.v7, String(EMBED_PROTOCOL_VERSION));
  await sendFromFixture(v7Frame, protocolEnvelope("v7-cup", { __mmsEmbedReady: 1 }), parentOrigin);
  await page.waitForFunction((selector) => (
    document.querySelector(selector)?.dataset.motionReady === "1"
  ), SELECTORS.v7);
  const v7State = await readinessState(page, SELECTORS.v7);
  const untouchedGame = await readinessState(page, SELECTORS.touchbaes);
  assert.equal(v7State.backgroundImage, "none", "valid V7 readiness retained its poster");
  assert.equal(untouchedGame.ready, "", "valid V7 readiness changed the Touchbaes iframe");

  await sendFromFixture(touchbaesFrame, protocolEnvelope("touchbaes", { __mmsEmbedReady: 1 }), parentOrigin);
  await page.waitForFunction((selector) => (
    document.querySelector(selector)?.dataset.motionReady === "1"
  ), SELECTORS.touchbaes);
  const gameState = await readinessState(page, SELECTORS.touchbaes);
  assert.equal(gameState.backgroundImage, "none", "valid Touchbaes readiness retained its poster");

  process.stdout.write("Embed readiness source/origin/kind validation: PASS\n");
  return { v7Frame, touchbaesFrame };
}

async function exerciseTouchbaesSize({ page, touchbaesFrame, staleFrame, parentOrigin }) {
  const originalSource = await page.locator(SELECTORS.touchbaes).getAttribute("data-src");
  assert.ok(originalSource, "Touchbaes source disappeared before size validation");

  touchbaesFrame = await navigateFixture(
    page,
    SELECTORS.touchbaes,
    `${WRONG_ORIGIN}/touchbaes-current-window.html`,
  );
  await page.waitForTimeout(50);
  const wrongOriginBaseline = await gameHeightState(page);
  await sendFromFixture(touchbaesFrame, {
    __mmsGameSize: 1,
    protocolVersion: EMBED_PROTOCOL_VERSION,
    kind: "touchbaes",
    geometryVersion: 10,
    compact: true,
    height: Math.ceil(wrongOriginBaseline.computedHeight) + 40,
    edgeReserve: { left: 24, right: 24, bottom: 24 },
  }, parentOrigin);
  await page.waitForTimeout(25);
  assertGameStateEqual(await gameHeightState(page), wrongOriginBaseline, "Touchbaes wrong origin");

  touchbaesFrame = await navigateFixture(page, SELECTORS.touchbaes, originalSource);
  await page.waitForTimeout(75);
  const baseline = await gameHeightState(page);
  assert.equal(baseline.measured, "", "Touchbaes height was already locked before the size test");

  const candidateHeight = Math.ceil(baseline.computedHeight) + 41;
  const validSize = {
    __mmsGameSize: 1,
    protocolVersion: EMBED_PROTOCOL_VERSION,
    kind: "touchbaes",
    geometryVersion: 10,
    compact: true,
    height: candidateHeight,
    edgeReserve: { left: 24, right: 24, bottom: 24 },
  };

  await sendFromFixture(staleFrame, validSize, parentOrigin);
  await page.waitForTimeout(25);
  assertGameStateEqual(await gameHeightState(page), baseline, "Touchbaes stale source");

  const rejectedCases = [
    ["malformed payload", null],
    ["non-numeric marker", { ...validSize, __mmsGameSize: "1" }],
    ["missing kind", { ...validSize, kind: undefined }],
    ["wrong kind", { ...validSize, kind: "v7-cup" }],
    ["missing protocol version", { ...validSize, protocolVersion: undefined }],
    ["stale protocol version", { ...validSize, protocolVersion: 0 }],
    ["future protocol version", { ...validSize, protocolVersion: 2 }],
    ["string protocol version", { ...validSize, protocolVersion: "1" }],
    ["stale geometry version", { ...validSize, geometryVersion: 9 }],
    ["compact mismatch", { ...validSize, compact: false }],
    ["non-boolean compact", { ...validSize, compact: "true" }],
    ["NaN height", { ...validSize, height: Number.NaN }],
    ["infinite height", { ...validSize, height: Number.POSITIVE_INFINITY }],
    ["zero height", { ...validSize, height: 0 }],
    ["negative height", { ...validSize, height: -1 }],
    ["missing reserves", { ...validSize, edgeReserve: undefined }],
    ["negative reserve", { ...validSize, edgeReserve: { left: -1, right: 24, bottom: 24 } }],
    ["oversized reserve", { ...validSize, edgeReserve: { left: 24, right: 321, bottom: 24 } }],
  ];
  for (const [label, payload] of rejectedCases) {
    await sendFromFixture(touchbaesFrame, payload, parentOrigin);
    await page.waitForTimeout(25);
    assertGameStateEqual(await gameHeightState(page), baseline, `Touchbaes ${label}`);
  }

  for (const malformedProtocol of MALFORMED_EMBED_PROTOCOL_VALUES) {
    await setEmbedProtocol(page, SELECTORS.touchbaes, malformedProtocol);
    await sendFromFixture(touchbaesFrame, validSize, parentOrigin);
    await page.waitForTimeout(25);
    assertGameStateEqual(
      await gameHeightState(page),
      baseline,
      `Touchbaes malformed protocol attribute ${JSON.stringify(malformedProtocol)}`,
    );
  }
  await setEmbedProtocol(page, SELECTORS.touchbaes, String(EMBED_PROTOCOL_VERSION));
  await sendFromFixture(touchbaesFrame, validSize, parentOrigin);
  await page.waitForFunction((selector) => (
    document.querySelector(selector)?.dataset.gameMeasured === "true"
  ), SELECTORS.touchbaes);
  const accepted = await gameHeightState(page);
  assert.equal(accepted.measured, "true", "valid Touchbaes size did not lock the frame");
  assert.equal(accepted.inlineHeight, `${candidateHeight}px`, "valid Touchbaes size used the wrong height");
  assert.equal(accepted.inlinePriority, "important", "valid Touchbaes height lost its priority");
  assert.equal(accepted.rootHeight, `${candidateHeight}px`, "valid Touchbaes size did not update its root token");

  await sendFromFixture(touchbaesFrame, { ...validSize, height: candidateHeight + 73 }, parentOrigin);
  await page.waitForTimeout(50);
  assertGameStateEqual(await gameHeightState(page), accepted, "Touchbaes later-height lock");

  process.stdout.write("Touchbaes size-message validation and stable-height lock: PASS\n");
  return touchbaesFrame;
}

async function exerciseTouchbaesTrustedRig({ page, touchbaesFrame, parentOrigin }) {
  await page.setViewportSize(EXPANDED_VIEWPORT);
  await page.waitForFunction(() => !window.matchMedia("(max-width: 1023px)").matches);

  const validHtml = [
    `<img class="tweezer-back" src="${TWEEZER_CLOSED_SRC}" alt="">`,
    `<img class="drag-sticker" src="${APPROVED_STICKER_SRC}" alt="" style="width: 96px; --drag-r: -8deg; --drag-offset-x: -72px; --drag-offset-y: -64px; --drag-origin-x: 72px; --drag-origin-y: 64px;">`,
    `<img class="tweezer-front" src="${TWEEZER_FRONT_SRC}" alt="">`,
  ].join("");

  await sendFromFixture(touchbaesFrame, {
    __tw: 1,
    protocolVersion: EMBED_PROTOCOL_VERSION,
    kind: "touchbaes",
    t: "move",
    tx: 12,
    ty: 34,
    w: 285,
    html: validHtml,
  }, parentOrigin);
  await page.waitForFunction(() => getComputedStyle(document.getElementById("mms-tw-rig")).display === "block");
  let state = await rigState(page);
  assert.equal(state.imageCount, 3, "trusted Touchbaes rig did not build exactly three images");
  assert.equal(state.scriptCount, 0, "trusted Touchbaes rig created script nodes");
  assert.equal(state.images[0].src, TWEEZER_CLOSED_SRC, "trusted rig used the wrong back tweezer");
  assert.equal(state.images[1].src, APPROVED_STICKER_SRC, "trusted rig used the wrong sticker");
  assert.equal(state.images[1].hidden, false, "trusted sticker was hidden");
  assert.equal(state.images[1].width, "96px", "trusted sticker width was not preserved");
  assert.equal(state.images[1].dragR, "-8deg", "trusted sticker rotation was not preserved");
  assert.equal(state.images[1].dragOffsetX, "-72px", "trusted sticker x offset was not preserved");
  assert.equal(state.images[1].dragOffsetY, "-64px", "trusted sticker y offset was not preserved");
  assert.equal(state.images[1].dragOriginX, "72px", "trusted sticker x origin was not preserved");
  assert.equal(state.images[1].dragOriginY, "64px", "trusted sticker y origin was not preserved");
  assert.equal(state.images[2].src, TWEEZER_FRONT_SRC, "trusted rig used the wrong front arm");

  const acceptedState = state;
  for (const [label, payload] of [
    ["non-numeric marker", protocolEnvelope("touchbaes", { __tw: true, t: "hide" })],
    ["missing protocol", { __tw: 1, kind: "touchbaes", t: "hide" }],
    ["stale protocol", protocolEnvelope("touchbaes", { __tw: 1, protocolVersion: 0, t: "hide" })],
    ["future protocol", protocolEnvelope("touchbaes", { __tw: 1, protocolVersion: 2, t: "hide" })],
    ["wrong kind", protocolEnvelope("v7-cup", { __tw: 1, t: "hide" })],
  ]) {
    await sendFromFixture(touchbaesFrame, payload, parentOrigin);
    await page.waitForTimeout(25);
    const rejectedState = await rigState(page);
    assert.equal(rejectedState.display, acceptedState.display, `${label} changed rig display`);
    assert.equal(rejectedState.left, acceptedState.left, `${label} moved the rig horizontally`);
    assert.equal(rejectedState.top, acceptedState.top, `${label} moved the rig vertically`);
    assert.equal(rejectedState.imageCount, acceptedState.imageCount, `${label} rebuilt the rig`);
  }

  const maliciousHtml = [
    `<img class="tweezer-back" src="${TWEEZER_OPEN_SRC}" onerror="window.__bad=1" alt="">`,
    `<script>window.__bad=1</script>`,
    `<img class="drag-sticker" src="https://evil.invalid/sticker.png" onload="window.__bad=1" style="width: 111px; --drag-r: 22deg; background: url(javascript:alert(1));">`,
    `<img class="tweezer-front" src="${TWEEZER_FRONT_SRC}" alt="">`,
  ].join("");
  await sendFromFixture(touchbaesFrame, {
    __tw: 1,
    protocolVersion: EMBED_PROTOCOL_VERSION,
    kind: "touchbaes",
    t: "move",
    tx: 13,
    ty: 35,
    w: 285,
    html: maliciousHtml,
  }, parentOrigin);
  await page.waitForTimeout(50);
  state = await rigState(page);
  assert.equal(state.scriptCount, 0, "message-derived script reached the parent rig");
  assert.equal(state.images.some((image) => image.src.startsWith("https://evil.invalid/")), false,
    "unapproved Touchbaes sticker URL reached the parent rig");
  assert.equal(state.images.some((image) => image.onerror || image.onload), false,
    "message-derived event handler reached the parent rig");
  assert.equal(await page.evaluate(() => window.__bad), undefined,
    "message-derived executable markup ran in the parent");

  await sendFromFixture(touchbaesFrame, {
    __tw: 1,
    protocolVersion: EMBED_PROTOCOL_VERSION,
    kind: "touchbaes",
    t: "move",
    tx: Number.POSITIVE_INFINITY,
    ty: 0,
    w: 285,
    html: validHtml,
  }, parentOrigin);
  await page.waitForTimeout(50);
  assert.equal((await rigState(page)).display, "none", "invalid Touchbaes rig coordinates remained visible");
  process.stdout.write("Touchbaes trusted parent rig validation: PASS\n");
  return touchbaesFrame;
}

async function exerciseMontranReadiness({ page, montranFrame, staleFrame, parentOrigin }) {
  await page.setViewportSize(COMPACT_VIEWPORT);
  await page.waitForFunction(() => window.matchMedia("(max-width: 1023px)").matches);
  await page.waitForTimeout(100);
  await clearFixture(montranFrame);
  await clearFixture(staleFrame);

  await sendFromFixture(staleFrame, {
    __mmsBookletReady: 1,
    kind: "montran-booklet",
    version: 17,
  }, parentOrigin);
  await page.waitForTimeout(30);
  assert.equal(messagesWith(await fixtureRecords(staleFrame), "__mmsBookletMode").length, 0,
    "stale Montran source received a mode reply");
  assert.equal(messagesWith(await fixtureRecords(montranFrame), "__mmsBookletMode").length, 0,
    "stale Montran source triggered a reply to the current frame");

  const originalSource = await page.locator(SELECTORS.montran).getAttribute("data-src");
  assert.ok(originalSource, "Montran source disappeared before readiness validation");
  montranFrame = await navigateFixture(page, SELECTORS.montran, `${WRONG_ORIGIN}/montran-current-window.html`);
  await page.waitForTimeout(50);
  await clearFixture(montranFrame);
  await sendFromFixture(montranFrame, {
    __mmsBookletReady: 1,
    kind: "montran-booklet",
    version: 17,
  }, parentOrigin);
  await page.waitForTimeout(30);
  assert.equal(messagesWith(await fixtureRecords(montranFrame), "__mmsBookletMode").length, 0,
    "wrong-origin Montran frame received a mode message; target origin is not exact");

  montranFrame = await navigateFixture(page, SELECTORS.montran, originalSource);
  await page.waitForTimeout(75);
  await clearFixture(montranFrame);

  for (const [label, payload] of [
    ["null payload", null],
    ["primitive payload", "ready"],
    ["missing marker", { kind: "montran-booklet", version: 17 }],
    ["wrong kind", { __mmsBookletReady: 1, kind: "touchbaes", version: 17 }],
    ["stale version", { __mmsBookletReady: 1, kind: "montran-booklet", version: 16 }],
    ["future version", { __mmsBookletReady: 1, kind: "montran-booklet", version: 18 }],
  ]) {
    await sendFromFixture(montranFrame, payload, parentOrigin);
    await page.waitForTimeout(25);
    assert.equal(messagesWith(await fixtureRecords(montranFrame), "__mmsBookletMode").length, 0,
      `Montran ${label} produced a mode reply`);
  }

  await sendFromFixture(montranFrame, {
    __mmsBookletReady: 1,
    kind: "montran-booklet",
    version: 17,
  }, parentOrigin);
  await waitForMessage(montranFrame, "__mmsBookletMode", true);
  const modes = messagesWith(await fixtureRecords(montranFrame), "__mmsBookletMode");
  assert.equal(modes.length, 1, "valid Montran readiness did not produce exactly one mode reply");
  assert.deepEqual(modes[0].data, { __mmsBookletMode: 1, compact: true },
    "valid Montran readiness returned the wrong mode envelope");
  assert.equal(modes[0].origin, parentOrigin, "Montran mode arrived from the wrong parent origin");

  process.stdout.write("Montran readiness source/origin/kind/version validation: PASS\n");
  return montranFrame;
}

async function placeBookletGesture(page) {
  const gesture = page.locator(".mms-booklet-gesture");
  await gesture.waitFor({ state: "attached" });
  await page.locator('[data-band="montran"]').scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const shell = document.querySelector(".mms-booklet-shell");
    const river = shell?.closest(".mms-river");
    if (!shell || !river) throw new Error("Montran gesture geometry is missing");
    const targetScroll = shell.offsetLeft + (shell.offsetWidth / 2) - (window.innerWidth / 2);
    river.scrollLeft = Math.max(0, targetScroll);
    const rect = shell.getBoundingClientRect();
    window.scrollBy(0, rect.top - Math.max(96, (window.innerHeight - rect.height) / 2));
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const box = await gesture.boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0, "compact Montran gesture has no visible geometry");
  return { gesture, box };
}

function pointIn(box, fraction) {
  return {
    x: box.x + (box.width * fraction),
    y: box.y + (box.height * 0.5),
  };
}

async function dispatchSyntheticPointer(page, direction, { type = "pointerup", isPrimary = true, button = 0 } = {}) {
  await page.locator(`[data-booklet-turn="${direction}"]`).evaluate((target, options) => {
    const rect = target.getBoundingClientRect();
    const eventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 73,
      pointerType: "touch",
      isPrimary: options.isPrimary,
      button: options.button,
      buttons: options.button === 0 ? 1 : 2,
      clientX: rect.left + (rect.width / 2),
      clientY: rect.top + (rect.height / 2),
    };
    target.dispatchEvent(new PointerEvent("pointerdown", eventInit));
    target.dispatchEvent(new PointerEvent(options.type, { ...eventInit, buttons: 0 }));
  }, { type, isPrimary, button });
}

async function turnMessages(frame) {
  return messagesWith(await fixtureRecords(frame), "__mmsBookletTurn");
}

async function exerciseMontranTurns({ page, montranFrame, parentOrigin }) {
  await clearFixture(montranFrame);
  const { gesture, box } = await placeBookletGesture(page);
  const gestureStyles = await gesture.evaluate((element) => ({
    display: getComputedStyle(element).display,
    touchAction: getComputedStyle(element).touchAction,
    buttonTouchActions: [...element.querySelectorAll("button")].map((button) => getComputedStyle(button).touchAction),
  }));
  assert.equal(gestureStyles.display, "grid", "compact Montran gesture is not active");
  assert.equal(gestureStyles.touchAction, "pan-x pan-y", "Montran gesture blocks native panning");
  assert.deepEqual(gestureStyles.buttonTouchActions, ["pan-x pan-y", "pan-x pan-y"],
    "Montran tap halves block native panning");

  const center = pointIn(box, 0.5);
  await page.mouse.click(center.x, center.y);
  await page.waitForTimeout(30);
  assert.equal((await turnMessages(montranFrame)).length, 0, "Montran center gap turned a page");

  const left = pointIn(box, 0.23);
  await page.mouse.move(left.x, left.y);
  await page.mouse.down();
  await page.mouse.move(left.x + 20, left.y);
  await page.mouse.up();
  await page.waitForTimeout(30);
  assert.equal((await turnMessages(montranFrame)).length, 0, "moved Montran gesture turned a page");

  await page.mouse.move(left.x, left.y);
  await page.mouse.down();
  await page.waitForTimeout(525);
  await page.mouse.up();
  await page.waitForTimeout(30);
  assert.equal((await turnMessages(montranFrame)).length, 0, "held Montran gesture turned a page");

  await dispatchSyntheticPointer(page, "previous", { type: "pointercancel" });
  await page.waitForTimeout(30);
  assert.equal((await turnMessages(montranFrame)).length, 0, "cancelled Montran gesture turned a page");

  await dispatchSyntheticPointer(page, "previous", { isPrimary: false });
  await page.waitForTimeout(30);
  assert.equal((await turnMessages(montranFrame)).length, 0, "non-primary Montran gesture turned a page");

  await dispatchSyntheticPointer(page, "previous", { button: 2 });
  await page.waitForTimeout(30);
  assert.equal((await turnMessages(montranFrame)).length, 0, "secondary-button Montran gesture turned a page");

  await page.mouse.click(left.x, left.y);
  await page.waitForTimeout(75);
  let turns = await turnMessages(montranFrame);
  assert.equal(turns.length, 1, "one left tap did not produce exactly one Montran turn");
  assert.deepEqual(turns[0].data, {
    __mmsBookletTurn: 1,
    position: 0.25,
    direction: "previous",
  }, "left Montran tap produced the wrong turn envelope");
  assert.equal(turns[0].origin, parentOrigin, "left Montran turn arrived from the wrong parent origin");

  const right = pointIn(box, 0.77);
  await page.mouse.click(right.x, right.y);
  await page.waitForTimeout(75);
  turns = await turnMessages(montranFrame);
  assert.equal(turns.length, 1, "Montran accepted a second turn inside the 700ms lock");

  await page.waitForTimeout(700);
  await page.mouse.click(right.x, right.y);
  await page.waitForTimeout(75);
  turns = await turnMessages(montranFrame);
  assert.equal(turns.length, 2, "right Montran tap after the lock did not produce one turn");
  assert.deepEqual(turns[1].data, {
    __mmsBookletTurn: 1,
    position: 0.75,
    direction: "next",
  }, "right Montran tap produced the wrong turn envelope");
  assert.equal(turns[1].origin, parentOrigin, "right Montran turn arrived from the wrong parent origin");

  await clearFixture(montranFrame);
  await page.setViewportSize(EXPANDED_VIEWPORT);
  await page.waitForFunction(() => !window.matchMedia("(max-width: 1023px)").matches);
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await waitForMessage(montranFrame, "__mmsBookletMode", false);
  let modeMessages = messagesWith(await fixtureRecords(montranFrame), "__mmsBookletMode");
  assert.ok(modeMessages.length >= 1, "expanded transition did not notify Montran");
  assert.ok(modeMessages.every((record) => record.data.compact === false),
    "expanded transition emitted a stale compact mode");
  assert.ok(modeMessages.every((record) => record.origin === parentOrigin),
    "expanded mode arrived from the wrong parent origin");
  assert.equal(await gesture.evaluate((element) => getComputedStyle(element).display), "none",
    "Montran compact gesture remained visible after expansion");

  await clearFixture(montranFrame);
  await dispatchSyntheticPointer(page, "next");
  await page.waitForTimeout(30);
  assert.equal((await turnMessages(montranFrame)).length, 0,
    "expanded Montran accepted the compact parent turn path");

  await clearFixture(montranFrame);
  await page.setViewportSize(COMPACT_VIEWPORT);
  await page.waitForFunction(() => window.matchMedia("(max-width: 1023px)").matches);
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await waitForMessage(montranFrame, "__mmsBookletMode", true);
  modeMessages = messagesWith(await fixtureRecords(montranFrame), "__mmsBookletMode");
  assert.ok(modeMessages.length >= 1, "compact transition did not notify Montran");
  assert.ok(modeMessages.every((record) => record.data.compact === true),
    "compact transition emitted a stale expanded mode");
  assert.ok(modeMessages.every((record) => record.origin === parentOrigin),
    "compact mode arrived from the wrong parent origin");
  assert.equal(await gesture.evaluate((element) => getComputedStyle(element).display), "grid",
    "Montran compact gesture did not return after contraction");

  process.stdout.write("Montran compact turn filtering, lock, and breakpoint mode: PASS\n");
}

async function run() {
  const watchdog = setTimeout(() => {
    process.stderr.write(`Embed/Montran interaction test exceeded ${WATCHDOG_MS}ms\n`);
    process.exit(2);
  }, WATCHDOG_MS);
  let server = null;
  let browser = null;
  try {
    server = await startStaticServer(`${PROJECT_ROOT}/cargo`);
    browser = await launchAuditBrowser({
      channel: process.env.MMS_AUDIT_BROWSER_CHANNEL || "chrome",
      executablePath: process.env.MMS_AUDIT_BROWSER_EXECUTABLE || "",
      headed: false,
    });
    const context = await browser.newContext({
      viewport: COMPACT_VIEWPORT,
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
      locale: "en-CA",
      timezoneId: "America/Toronto",
    });
    await context.route("**/*", async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.origin === server.origin) {
        await route.continue();
      } else if (
        (requestUrl.origin === FREIGHT_ORIGIN && requestUrl.pathname.includes("/m/")) ||
        requestUrl.origin === WRONG_ORIGIN
      ) {
        await route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: FIXTURE_HTML,
        });
      } else {
        await route.abort("blockedbyclient");
      }
    });

    const pageErrors = [];
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
    page.setDefaultTimeout(7_500);
    await page.goto(`${server.origin}/test.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const lifecycle = window.__mmsRuntimeLifecycle;
      const root = document.querySelector(".mms");
      return lifecycle?.apiVersion === 1 &&
        lifecycle.owners?.panel?.root === root && lifecycle.owners.panel.active() === true &&
        lifecycle.owners?.home?.root === root && lifecycle.owners.home.active() === true;
    });

    let [v7Frame, touchbaesFrame, montranFrame] = await Promise.all([
      fixtureFrame(page, SELECTORS.v7),
      fixtureFrame(page, SELECTORS.touchbaes),
      fixtureFrame(page, SELECTORS.montran),
    ]);
    await page.locator(SELECTORS.v7).evaluate((frame, version) => {
      frame.setAttribute("data-embed-protocol", String(version));
    }, EMBED_PROTOCOL_VERSION);
    await page.locator(SELECTORS.touchbaes).evaluate((frame, version) => {
      frame.setAttribute("data-embed-protocol", String(version));
    }, EMBED_PROTOCOL_VERSION);
    const staleFrame = await addStaleFixture(page);
    await page.waitForTimeout(1_700);
    v7Frame = await exerciseParentOutbound({
      page,
      v7Frame,
      touchbaesFrame,
      parentOrigin: server.origin,
    });
    await Promise.all([v7Frame, touchbaesFrame, montranFrame, staleFrame].map(clearFixture));

    ({ v7Frame, touchbaesFrame } = await exerciseGenericReadiness({
      page,
      v7Frame,
      touchbaesFrame,
      staleFrame,
      parentOrigin: server.origin,
    }));
    touchbaesFrame = await exerciseTouchbaesSize({
      page,
      touchbaesFrame,
      staleFrame,
      parentOrigin: server.origin,
    });
    touchbaesFrame = await exerciseTouchbaesTrustedRig({
      page,
      touchbaesFrame,
      parentOrigin: server.origin,
    });
    montranFrame = await exerciseMontranReadiness({
      page,
      montranFrame,
      staleFrame,
      parentOrigin: server.origin,
    });
    await exerciseMontranTurns({ page, montranFrame, parentOrigin: server.origin });

    assert.deepEqual(pageErrors, [], `page errors occurred: ${pageErrors.join("\n")}`);
    await context.close();
    process.stdout.write("Embed and Montran interaction test: PASS\n");
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
    clearTimeout(watchdog);
  }
}

await run();
