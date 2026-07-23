#!/usr/bin/env node

import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { launchAuditBrowser } from "./collector.mjs";
import { PROJECT_ROOT } from "./config.mjs";
import {
  APPROVED_PDF_BYTES,
  deterministicPdf,
  fulfillPdf,
} from "./montran-pdf-allowlist-test.mjs";
import { startStaticServer } from "./server.mjs";

const WATCHDOG_MS = 120_000;
const CONTRACT_PATH = path.join(PROJECT_ROOT, "audit/contracts/iframe-capability-matrix.json");
const V7_BUILDER = path.join(PROJECT_ROOT, "work/v7-cup-message-v1-src/build-bundle.py");
const TOUCH_SOURCE = path.join(
  PROJECT_ROOT,
  "Portfolio assets/_for cargo deployment/touchbaes/sticker game/",
  "touchbaes-sticker-game/touchbaes-sticker-game-v11.html",
);
const TOUCH_ASSET_ROOT = path.join(
  PROJECT_ROOT,
  "Portfolio assets/_for cargo deployment/touchbaes/sticker game/",
  "touchbaes-sticker-game/assets/optimized",
);
const MONTRAN_BUILDER = path.join(
  PROJECT_ROOT,
  "work/montran-pdf-allowlist-v18-src/build-bundle.py",
);
const MONTRAN_POLICY = path.join(
  PROJECT_ROOT,
  "work/montran-pdf-allowlist-v18-src/approved-pdf.json",
);
const PARENT_ROOT = path.join(PROJECT_ROOT, "audit/harness/self-test");
const PROTOCOL_VERSION = 1;

const TOUCH_ASSETS = Object.freeze({
  "scene.png": "scene.webp",
  "sticker-cat-placed.png": "sticker-cat-placed.webp",
  "sticker-cat.png": "sticker-cat.webp",
  "sticker-plant.png": "sticker-plant.webp",
  "sticker-right-bottles.png": "sticker-right-bottles.webp",
  "sticker-touchbaes.png": "sticker-touchbaes.webp",
  "tweezer-close.png": "tweezer-close.webp",
  "tweezer-front-arm.png": "tweezer-front-arm.webp",
  "tweezer-open.png": "tweezer-open.webp",
});

function build(builder, output, label) {
  const result = spawnSync("python3", [builder, "--output", output], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${label} build failed:\n${result.stdout}${result.stderr}`);
}

async function addFrame(page, { id, src, width, height, policy }) {
  await page.evaluate(({ frameId, frameSrc, frameWidth, frameHeight, framePolicy }) => {
    const frame = document.createElement("iframe");
    frame.id = frameId;
    frame.style.width = `${frameWidth}px`;
    frame.style.height = `${frameHeight}px`;
    frame.style.border = "0";
    frame.setAttribute("sandbox", framePolicy.sandbox);
    frame.setAttribute("referrerpolicy", framePolicy.referrerpolicy);
    frame.setAttribute("allow", framePolicy.allow);
    // Policy attributes must be present before this deferred source becomes live.
    frame.src = frameSrc;
    document.body.appendChild(frame);
  }, {
    frameId: id,
    frameSrc: src,
    frameWidth: width,
    frameHeight: height,
    framePolicy: policy,
  });
  const locator = page.locator(`#${id}`);
  const handle = await locator.elementHandle();
  const frame = await handle?.contentFrame();
  assert.ok(frame, `${id}: iframe did not create a browsing context`);
  await frame.waitForURL(src);
  return { frame, locator };
}

async function parentSend(page, id, data, targetOrigin) {
  await page.evaluate(({ frameId, payload, origin }) => {
    document.getElementById(frameId).contentWindow.postMessage(payload, origin);
  }, { frameId: id, payload: data, origin: targetOrigin });
}

async function records(page, id, marker) {
  return page.evaluate(({ sourceId, key }) => window.__mmsProtocolRecords.filter((record) => (
    record.sourceId === sourceId && record.data && record.data[key] === 1
  )), { sourceId: id, key: marker });
}

async function waitForRecord(page, id, marker) {
  await page.waitForFunction(({ sourceId, key }) => window.__mmsProtocolRecords.some((record) => (
    record.sourceId === sourceId && record.data && record.data[key] === 1
  )), { sourceId: id, key: marker });
}

async function assertFramePolicy({ frame, locator, parentOrigin, childOrigin, policy, deniedFeatures }) {
  const attributes = await locator.evaluate((element) => ({
    allow: element.getAttribute("allow"),
    referrerpolicy: element.getAttribute("referrerpolicy"),
    sandbox: element.getAttribute("sandbox"),
    src: element.getAttribute("src"),
  }));
  assert.equal(attributes.sandbox, policy.sandbox, "sandbox serialization drifted");
  assert.equal(attributes.referrerpolicy, policy.referrerpolicy, "referrer policy drifted");
  assert.equal(attributes.allow, policy.allow, "Permissions Policy serialization drifted");
  assert.equal(new URL(attributes.src).origin, childOrigin, "iframe loaded from the wrong child origin");

  const referrer = await frame.evaluate(() => document.referrer);
  assert.equal(referrer, `${parentOrigin}/`, "iframe received more or less than the parent origin");

  const permissionState = await locator.evaluate((element, features) => {
    const featurePolicy = element.permissionsPolicy || element.featurePolicy;
    if (!featurePolicy || typeof featurePolicy.features !== "function") {
      return { available: false, supported: [], allowed: [], notExplicitlyDenied: [] };
    }
    const supported = featurePolicy.features().sort();
    const allowed = typeof featurePolicy.allowedFeatures === "function"
      ? featurePolicy.allowedFeatures().sort()
      : supported.filter((feature) => featurePolicy.allowsFeature(feature));
    return {
      available: true,
      supported,
      allowed,
      notExplicitlyDenied: supported.filter((feature) => !features.includes(feature)),
    };
  }, deniedFeatures);
  assert.equal(permissionState.available, true, "browser exposes no iframe Permissions Policy API");
  assert.deepEqual(permissionState.notExplicitlyDenied, [],
    `browser exposes unreviewed Permissions Policy features: ${permissionState.notExplicitlyDenied.join(", ")}`);
  assert.deepEqual(permissionState.allowed, [],
    `iframe retained Permissions Policy capabilities: ${permissionState.allowed.join(", ")}`);
}

async function exerciseV7({ page, frame, parentOrigin, childOrigin }) {
  await frame.waitForFunction(() => Boolean(window.v7Cup));
  await waitForRecord(page, "v7", "__mmsEmbedReady");
  const ready = await records(page, "v7", "__mmsEmbedReady");
  assert.deepEqual(ready.at(-1).data, {
    __mmsEmbedReady: 1,
    kind: "v7-cup",
    protocolVersion: PROTOCOL_VERSION,
  }, "V7 readiness envelope changed");
  assert.equal(ready.at(-1).origin, childOrigin, "V7 readiness lost its real child origin");

  const before = await frame.evaluate(() => window.v7Cup.cup.rotation.y);
  await frame.waitForTimeout(120);
  const after = await frame.evaluate(() => window.v7Cup.cup.rotation.y);
  assert.ok(after > before, "V7 WebGL rotation did not advance under sandbox");

  await parentSend(page, "v7", {
    __mmsEmbedVisibility: 1,
    kind: "v7-cup",
    protocolVersion: PROTOCOL_VERSION,
    visible: false,
  }, childOrigin);
  await frame.waitForTimeout(60);
  const pausedBefore = await frame.evaluate(() => window.v7Cup.cup.rotation.y);
  await frame.waitForTimeout(120);
  const pausedAfter = await frame.evaluate(() => window.v7Cup.cup.rotation.y);
  assert.equal(pausedAfter, pausedBefore, "V7 ignored exact-origin pause under sandbox");
  await parentSend(page, "v7", {
    __mmsEmbedVisibility: 1,
    kind: "v7-cup",
    protocolVersion: PROTOCOL_VERSION,
    visible: true,
  }, childOrigin);
  await frame.waitForTimeout(120);
  assert.ok(
    await frame.evaluate((value) => window.v7Cup.cup.rotation.y > value, pausedAfter),
    "V7 did not resume under sandbox",
  );
  assert.equal(parentOrigin.startsWith("http://"), true, "fixture parent origin changed unexpectedly");
  process.stdout.write("Iframe capability V7 WebGL and exact-origin messaging: PASS\n");
}

async function exerciseTouchbaes({ page, frame, locator, childOrigin }) {
  await frame.waitForFunction(() => document.querySelector(".touchbaes-game"));
  await parentSend(page, "touchbaes", {
    __mmsGameMode: 1,
    compact: true,
    kind: "touchbaes",
    protocolVersion: PROTOCOL_VERSION,
  }, childOrigin);
  await frame.waitForFunction(() => document.documentElement.dataset.mmsCompact === "true");
  await waitForRecord(page, "touchbaes", "__mmsEmbedReady");
  await waitForRecord(page, "touchbaes", "__mmsGameSize");
  const ready = await records(page, "touchbaes", "__mmsEmbedReady");
  const sizes = await records(page, "touchbaes", "__mmsGameSize");
  assert.equal(ready.at(-1).origin, childOrigin, "Touchbaes readiness lost its real child origin");
  assert.equal(sizes.at(-1).origin, childOrigin, "Touchbaes size lost its real child origin");
  assert.equal(sizes.at(-1).data.geometryVersion, 10, "Touchbaes geometry version changed");
  assert.ok(sizes.at(-1).data.height > 0, "Touchbaes reported no height");
  await locator.evaluate((element, height) => {
    element.style.height = `${Math.max(1200, Math.ceil(height))}px`;
  }, sizes.at(-1).data.height);

  await frame.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  const sticker = frame.locator('.loose-sticker[data-sticker-id="sign"]');
  const box = await sticker.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  await page.evaluate(({ frameId, innerY }) => {
    const frameElement = document.getElementById(frameId);
    window.scrollTo(0, Math.max(0, frameElement.offsetTop + innerY - window.innerHeight / 2));
  }, { frameId: "touchbaes", innerY: box.y + box.height / 2 });
  const frameBox = await locator.boundingBox();
  assert.ok(frameBox && box.width > 0 && box.height > 0, "Touchbaes drag sticker has no geometry");
  const start = {
    x: frameBox.x + box.x + box.width / 2,
    y: frameBox.y + box.y + box.height / 2,
  };
  const topHit = await page.evaluate(({ x, y }) => {
    const hit = document.elementFromPoint(x, y);
    return {
      className: hit?.className || "",
      id: hit?.id || "",
      tagName: hit?.tagName || "",
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  }, start);
  await frame.evaluate(() => {
    window.__mmsPointerProbe = [];
    window.addEventListener("pointerdown", (event) => {
      window.__mmsPointerProbe.push({
        className: event.target?.className || "",
        pointerType: event.pointerType,
      });
    }, { capture: true, once: true });
  });
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 28, start.y + 16, { steps: 3 });
  const dragState = await frame.evaluate(() => ({
    desktop: !document.getElementById("dragSticker").hidden,
    mobile: !document.getElementById("mobileDragSticker").hidden,
    pointerProbe: window.__mmsPointerProbe,
  }));
  assert.equal(
    dragState.desktop || dragState.mobile,
    true,
    `Touchbaes pointer drag did not start: ${JSON.stringify({
      pointerProbe: dragState.pointerProbe,
      topHit,
      start,
      frameBox,
      box,
    })}`,
  );
  await page.mouse.up();
  await frame.waitForTimeout(50);
  const released = await frame.evaluate(() => ({
    desktop: !document.getElementById("dragSticker").hidden,
    dragging: document.querySelector(".touchbaes-game").classList.contains("is-dragging"),
    mobile: !document.getElementById("mobileDragSticker").hidden,
  }));
  assert.equal(released.dragging || released.desktop || released.mobile, false,
    "Touchbaes drag state did not finish after pointerup");
  process.stdout.write("Iframe capability Touchbaes mode, size, and pointer drag: PASS\n");
}

async function visiblePdfPages(frame) {
  return frame.evaluate(() => Array.from(document.querySelectorAll(".book-page"))
    .filter((page) => {
      const rect = page.getBoundingClientRect();
      const style = getComputedStyle(page);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    })
    .map((page) => Number(page.dataset.sourcePage))
    .filter(Number.isFinite)
    .sort((a, b) => a - b));
}

async function waitForVisiblePagesToChange(frame, before) {
  await frame.waitForFunction((previous) => {
    const visible = Array.from(document.querySelectorAll(".book-page"))
      .filter((page) => {
        const rect = page.getBoundingClientRect();
        const style = getComputedStyle(page);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((page) => Number(page.dataset.sourcePage))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    return JSON.stringify(visible) !== JSON.stringify(previous);
  }, before, { timeout: 5_000 });
}

async function exerciseMontran({ page, frame, locator, childOrigin, pdfRequests }) {
  await waitForRecord(page, "montran", "__mmsBookletReady");
  const ready = await records(page, "montran", "__mmsBookletReady");
  assert.deepEqual(ready.at(-1).data, {
    __mmsBookletReady: 1,
    kind: "montran-booklet",
    version: 17,
  }, "Montran readiness envelope changed");
  assert.equal(ready.at(-1).origin, childOrigin, "Montran readiness lost its real child origin");

  await frame.waitForFunction(() => {
    const page19 = document.querySelector('.book-page[data-source-page="19"] img');
    const page20 = document.querySelector('.book-page[data-source-page="20"] img');
    return document.querySelectorAll(".book-page").length === 72 &&
      page19?.src.startsWith("blob:") && page20?.src.startsWith("blob:");
  }, null, { timeout: 30_000 });
  await frame.waitForFunction(() => {
    const visible = Array.from(document.querySelectorAll(".book-page"))
      .filter((page) => {
        const rect = page.getBoundingClientRect();
        const style = getComputedStyle(page);
        return rect.width > 0 && rect.height > 0 &&
          style.display !== "none" && style.visibility !== "hidden";
      })
      .map((page) => Number(page.dataset.sourcePage));
    return visible.includes(19) && visible.includes(20);
  }, null, { timeout: 5_000 });
  assert.ok(pdfRequests.length >= 2, "Montran made no HEAD/range requests under sandbox");
  assert.ok(pdfRequests.every((request) => !request.cookie), "Montran PDF request leaked a cookie");
  assert.ok(pdfRequests.every((request) => !request.referer), "Montran PDF request leaked a referrer");
  assert.ok(pdfRequests.some((request) => request.method === "HEAD"), "Montran skipped its HEAD probe");
  assert.ok(pdfRequests.some((request) => request.range), "Montran did not use range loading");

  const expandedBefore = await visiblePdfPages(frame);
  assert.ok(expandedBefore.includes(19) && expandedBefore.includes(20),
    `Montran did not open on pages 19–20: ${expandedBefore}`);
  await locator.scrollIntoViewIfNeeded();
  const turnSurface = frame.locator(".stf__block");
  const surface = await turnSurface.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  assert.ok(surface.width > 0 && surface.height > 0, "Montran turn surface has no geometry");
  await turnSurface.click({
    position: { x: surface.width * 0.78, y: surface.height * 0.5 },
  });
  await waitForVisiblePagesToChange(frame, expandedBefore);
  const expandedAfter = await visiblePdfPages(frame);
  assert.notDeepEqual(expandedAfter, expandedBefore, "Montran expanded click did not turn a page");

  await parentSend(page, "montran", { __mmsBookletMode: 1, compact: true }, childOrigin);
  await frame.waitForTimeout(50);
  await parentSend(page, "montran", {
    __mmsBookletTurn: 1,
    direction: "previous",
    position: 0.25,
  }, childOrigin);
  await waitForVisiblePagesToChange(frame, expandedAfter);
  const compactAfter = await visiblePdfPages(frame);
  assert.notDeepEqual(compactAfter, expandedAfter, "Montran compact parent turn did not change the spread");
  process.stdout.write("Iframe capability Montran range rendering and expanded/compact turns: PASS\n");
}

async function exerciseNegativeControls({ page, source, parentOrigin, childOrigin, policy }) {
  const opaque = await addFrame(page, {
    id: "v7-opaque",
    src: source,
    width: 320,
    height: 320,
    policy: { ...policy, sandbox: "allow-scripts" },
  });
  await opaque.frame.waitForFunction(() => Boolean(window.v7Cup));
  await waitForRecord(page, "v7-opaque", "__mmsEmbedReady");
  const opaqueReady = await records(page, "v7-opaque", "__mmsEmbedReady");
  assert.equal(opaqueReady.at(-1).origin, "null", "missing allow-same-origin did not create an opaque origin");
  assert.notEqual(opaqueReady.at(-1).origin, childOrigin, "opaque child retained exact-origin identity");

  const noReferrer = await addFrame(page, {
    id: "v7-no-referrer",
    src: source,
    width: 320,
    height: 320,
    policy: { ...policy, referrerpolicy: "no-referrer" },
  });
  await noReferrer.frame.waitForFunction(() => Boolean(window.v7Cup));
  assert.equal(await noReferrer.frame.evaluate(() => document.referrer), "",
    "no-referrer negative control retained a bootstrap referrer");
  await noReferrer.frame.waitForTimeout(300);
  assert.equal((await records(page, "v7-no-referrer", "__mmsEmbedReady")).length, 0,
    "child announced readiness without a validated parent origin");
  assert.equal(parentOrigin.startsWith("http://"), true, "fixture parent origin changed unexpectedly");
  process.stdout.write("Iframe capability origin/referrer negative controls: PASS\n");
}

async function run() {
  const watchdog = setTimeout(() => {
    process.stderr.write(`Iframe capability test exceeded ${WATCHDOG_MS}ms\n`);
    process.exit(2);
  }, WATCHDOG_MS);
  const tempRoot = await mkdtemp(path.join(tmpdir(), "mms-iframe-capability-"));
  let parentServer = null;
  let childServer = null;
  let browser = null;
  try {
    const contract = JSON.parse(await readFile(CONTRACT_PATH, "utf8"));
    const approvedPolicy = JSON.parse(await readFile(MONTRAN_POLICY, "utf8"));
    const deniedFeatures = contract.policy.permissions_policy.denied_features;
    const policy = {
      allow: contract.policy.permissions_policy.serialized,
      referrerpolicy: contract.policy.referrerpolicy,
      sandbox: contract.policy.sandbox_tokens.join(" "),
    };
    const v7Path = path.join(tempRoot, "v7.html");
    const touchPath = path.join(tempRoot, "touchbaes.html");
    const montranPath = path.join(tempRoot, "montran.html");
    build(V7_BUILDER, v7Path, "V7 capability candidate");
    await copyFile(TOUCH_SOURCE, touchPath);
    build(MONTRAN_BUILDER, montranPath, "Montran capability candidate");
    const pdf = deterministicPdf(APPROVED_PDF_BYTES);

    const touchAssetBodies = new Map();
    for (const [remoteName, localName] of Object.entries(TOUCH_ASSETS)) {
      touchAssetBodies.set(remoteName, await readFile(path.join(TOUCH_ASSET_ROOT, localName)));
    }

    parentServer = await startStaticServer(PARENT_ROOT);
    childServer = await startStaticServer(tempRoot);
    browser = await launchAuditBrowser({
      channel: process.env.MMS_AUDIT_BROWSER_CHANNEL || "chrome",
      executablePath: process.env.MMS_AUDIT_BROWSER_EXECUTABLE || "",
      headed: false,
    });
    const context = await browser.newContext({
      viewport: { width: 1400, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      locale: "en-CA",
      timezoneId: "America/Toronto",
    });
    await context.addCookies([{
      name: "mms_capability_cookie_probe",
      value: "must-not-leave-browser",
      domain: "freight.cargo.site",
      path: "/",
      secure: true,
      sameSite: "None",
    }]);
    const pdfRequests = [];
    const iframeNavigations = [];
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const headers = await request.allHeaders();
      if (url.origin === parentServer.origin || url.origin === childServer.origin) {
        if (request.resourceType() === "document" && url.origin === childServer.origin) {
          iframeNavigations.push({ path: url.pathname, referer: headers.referer || "" });
        }
        await route.continue();
        return;
      }
      if (request.url() === approvedPolicy.approved_pdf_url) {
        pdfRequests.push({
          cookie: headers.cookie || "",
          method: request.method(),
          range: headers.range || "",
          referer: headers.referer || "",
        });
        await fulfillPdf(route, pdf);
        return;
      }
      const touchBody = touchAssetBodies.get(path.basename(url.pathname));
      if (url.origin === "https://freight.cargo.site" && touchBody) {
        await route.fulfill({ status: 200, contentType: "image/webp", body: touchBody });
        return;
      }
      await route.abort("blockedbyclient");
    });

    const pageErrors = [];
    const popups = [];
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
    page.on("popup", (popup) => popups.push(popup.url()));
    page.setDefaultTimeout(12_000);
    await page.goto(`${parentServer.origin}/embed-protocol-parent.html`, { waitUntil: "domcontentloaded" });

    const v7Source = `${childServer.origin}/v7.html`;
    const v7 = await addFrame(page, {
      id: "v7",
      src: v7Source,
      width: 420,
      height: 420,
      policy,
    });
    await assertFramePolicy({
      ...v7,
      parentOrigin: parentServer.origin,
      childOrigin: childServer.origin,
      policy,
      deniedFeatures,
    });
    await exerciseV7({
      page,
      frame: v7.frame,
      parentOrigin: parentServer.origin,
      childOrigin: childServer.origin,
    });

    const touch = await addFrame(page, {
      id: "touchbaes",
      src: `${childServer.origin}/touchbaes.html`,
      width: 900,
      height: 700,
      policy,
    });
    await assertFramePolicy({
      ...touch,
      parentOrigin: parentServer.origin,
      childOrigin: childServer.origin,
      policy,
      deniedFeatures,
    });
    await exerciseTouchbaes({
      page,
      frame: touch.frame,
      locator: touch.locator,
      childOrigin: childServer.origin,
    });

    const montran = await addFrame(page, {
      id: "montran",
      src: `${childServer.origin}/montran.html?pdf=${encodeURIComponent(approvedPolicy.approved_pdf_url)}`,
      width: 1176,
      height: 504,
      policy,
    });
    await assertFramePolicy({
      ...montran,
      parentOrigin: parentServer.origin,
      childOrigin: childServer.origin,
      policy,
      deniedFeatures,
    });
    await exerciseMontran({
      page,
      frame: montran.frame,
      locator: montran.locator,
      childOrigin: childServer.origin,
      pdfRequests,
    });
    await exerciseNegativeControls({
      page,
      source: v7Source,
      parentOrigin: parentServer.origin,
      childOrigin: childServer.origin,
      policy,
    });

    for (const pathName of ["/v7.html", "/touchbaes.html", "/montran.html"]) {
      const request = iframeNavigations.find((record) => record.path === pathName);
      assert.ok(request, `${pathName}: iframe navigation was not observed`);
      assert.equal(request.referer, `${parentServer.origin}/`, `${pathName}: navigation referrer was not origin-only`);
    }
    assert.deepEqual(popups, [], "sandboxed embeds opened an unexpected browsing context");
    assert.deepEqual(pageErrors, [], `page errors occurred:\n${pageErrors.join("\n")}`);
    await context.close();
    process.stdout.write("Iframe minimum capability matrix browser proof: PASS\n");
  } finally {
    if (browser) await browser.close();
    if (childServer) await childServer.close();
    if (parentServer) await parentServer.close();
    await rm(tempRoot, { recursive: true, force: true });
    clearTimeout(watchdog);
  }
}

await run();
