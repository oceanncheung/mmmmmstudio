#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  collectDomAndGeometry,
  installAuditObservers,
  launchAuditBrowser,
  messageCollectionContract,
} from "./collector.mjs";
import { startStaticServer } from "./server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SELF_TEST_ROOT = path.resolve(HERE, "../self-test");
const TOKEN = "mms-postmessage-self-test-v1";

function hasMessage(records, direction, kind, frameSuffix) {
  return records.some((record) =>
    record.direction === direction &&
    record.data?.kind === kind &&
    record.data?.token === TOKEN &&
    (!frameSuffix || record.observerFrameUrl.endsWith(frameSuffix)),
  );
}

const server = await startStaticServer(SELF_TEST_ROOT);
const browser = await launchAuditBrowser({
  channel: process.env.MMS_AUDIT_BROWSER_CHANNEL || "chrome",
  executablePath: process.env.MMS_AUDIT_BROWSER_EXECUTABLE || "",
  headed: false,
});

try {
  const context = await browser.newContext();
  const traffic = [];
  await installAuditObservers(context, traffic);
  const page = await context.newPage();
  await page.goto(`${server.origin}/postmessage-parent.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.complete === "true");
  await page.waitForTimeout(50);

  const semantics = await page.evaluate(() => window.__mmsSelfTest);
  assert.equal(semantics.normalReply, true, "ordinary parent/child postMessage delivery must remain intact");
  assert.equal(semantics.portReply, true, "postMessage transfer-list semantics must remain intact");
  assert.ok(semantics.elapsedMs >= 10, "Date.now must remain a live clock");
  assert.equal(semantics.dateNowIsNative, true, "Date.now must remain the browser native function");
  assert.equal(semantics.randomIsNative, true, "Math.random must remain the browser native function");
  assert.notEqual(
    semantics.randomValues[0],
    semantics.randomValues[1],
    "Math.random must remain the browser implementation rather than a fixed value",
  );

  assert.ok(
    hasMessage(traffic, "sent", "parent-to-child"),
    "collector must record the outbound parent-to-child call",
  );
  assert.ok(
    hasMessage(traffic, "received", "parent-to-child", "/postmessage-child.html"),
    "collector must record delivery in the child frame",
  );
  assert.ok(
    hasMessage(traffic, "sent", "child-to-parent"),
    "collector must record the outbound child-to-parent call",
  );
  assert.ok(
    hasMessage(traffic, "received", "child-to-parent", "/postmessage-parent.html"),
    "collector must record delivery in the parent frame",
  );

  await page.goto(`${server.origin}/geometry-clipping.html`, { waitUntil: "domcontentloaded" });
  const geometry = (await collectDomAndGeometry(page)).geometry;
  const clipped = geometry.media.find((record) => record.mediaId === "clipped-square");
  const horizontal = geometry.media.find((record) => record.mediaId === "horizontal-river-item");
  const shaped = geometry.media.find((record) => record.mediaId === "self-shaped-item");
  const deferredVideo = geometry.media.find((record) => record.mediaId === "deferred-video-wrapper");
  const rotated = geometry.media.find((record) => record.mediaId === "rotated-ancestor-item");
  assert.ok(clipped, "vertical clipping fixture must be observed");
  assert.ok(
    Math.abs(clipped.ancestorClipping.clippedPixels.top - 261.2) < 0.1,
    "collector must measure the 261.2px top clip caused by a 765.2px square in a 504px river",
  );
  assert.equal(clipped.ancestorClipping.unexpected, true, "vertical ancestor clipping must be flagged");
  assert.equal(
    geometry.unexpectedMediaClipping.some((record) => record.mediaId === "clipped-square"),
    true,
    "unexpected clipping inventory must include the clipped square",
  );
  assert.equal(
    horizontal.ancestorClipping.unexpected,
    false,
    "intentional horizontal river scrollport clipping must not be flagged",
  );
  assert.equal(
    shaped.ancestorClipping.unexpected,
    false,
    "a media frame's own rounded or oval mask must not be treated as ancestor clipping",
  );
  assert.equal(shaped.source, "", "media without a source must not inherit the document URL");
  assert.equal(shaped.poster, "", "media without a poster must not inherit the document URL");
  assert.ok(deferredVideo.source.endsWith("/video.mp4"), "deferred child media source must be collected");
  assert.ok(deferredVideo.poster.endsWith("/poster.jpg"), "deferred child media poster must be collected");
  assert.equal(
    rotated.ancestorClipping.measurementReliable,
    false,
    "non-axis-aligned transformed clipping ancestors must be reported as unmeasurable by rectangular geometry",
  );
  assert.equal(
    rotated.ancestorClipping.unexpected,
    true,
    "non-axis-aligned transformed clipping ancestors must fail closed instead of producing a false pass",
  );
  assert.equal(
    rotated.ancestorClipping.unsupportedGeometry.some((record) => record.property === "transform"),
    true,
    "rotated ancestor evidence must identify the responsible transform",
  );

  await page.setContent(`
    <div class="mms" data-page="write">
      <section class="mms-writing-withered">
        <h1>Withered green</h1>
        <div class="mms-writing-plate">
          <p><span uses="eye-roll">One</span></p>
          <p><span uses="eye-roll">Two</span></p>
          <p><span uses="eye-roll">Three</span></p>
          <p><span uses="eye-roll">Four</span></p>
        </div>
      </section>
    </div>
  `);
  const validWitheredContract = (await collectDomAndGeometry(page)).document
    .intentionalDesignContracts.writeWitheredGreenEyeRoll;
  assert.equal(validWitheredContract.applicable, true, "Write must activate the Withered Green contract");
  assert.equal(validWitheredContract.valid, true, "four complete paragraph hooks must satisfy the contract");
  assert.deepEqual(
    validWitheredContract.paragraphCoverage.map((paragraph) => paragraph.directHookCount),
    [1, 1, 1, 1],
    "every Withered Green paragraph must own exactly one direct eye-roll hook",
  );

  await page.setContent('<div class="mms" data-page="write"><p>Missing Withered Green section</p></div>');
  const missingWitheredContract = (await collectDomAndGeometry(page)).document
    .intentionalDesignContracts.writeWitheredGreenEyeRoll;
  assert.equal(missingWitheredContract.applicable, true, "a Write page remains subject to the contract when its section disappears");
  assert.equal(missingWitheredContract.valid, false, "a missing Withered Green section must fail closed");

  const summary = {
    valid: true,
    sent: traffic.filter((record) => record.direction === "sent").length,
    received: traffic.filter((record) => record.direction === "received").length,
    frames: [...new Set(traffic.map((record) => record.observerFrameUrl))].sort(),
    transferListPreserved: semantics.portReply,
    ancestorClippingVerified: true,
    witheredGreenContractVerified: true,
    runtimeMutation: false,
    limitations: messageCollectionContract.limitations,
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  await context.close();
} finally {
  await browser.close();
  await server.close();
}
