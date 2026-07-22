#!/usr/bin/env node

import assert from "node:assert/strict";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { launchAuditBrowser } from "./collector.mjs";
import { PROJECT_ROOT } from "./config.mjs";
import { startStaticServer } from "./server.mjs";

const WATCHDOG_MS = 60_000;
const PROTOCOL_VERSION = 1;
const V7_BUILDER = path.join(PROJECT_ROOT, "work/v7-cup-message-v1-src/build-bundle.py");
const TOUCH_SOURCE = path.join(
  PROJECT_ROOT,
  "Portfolio assets/_for cargo deployment/touchbaes/sticker game/",
  "touchbaes-sticker-game/touchbaes-sticker-game-v11.html",
);
const PARENT_ROOT = path.join(PROJECT_ROOT, "audit/harness/self-test");

function envelope(kind, payload) {
  return { protocolVersion: PROTOCOL_VERSION, kind, ...payload };
}

async function addFrame(page, id, source) {
  await page.evaluate(({ frameId, frameSource }) => {
    const frame = document.createElement("iframe");
    frame.id = frameId;
    frame.src = frameSource;
    frame.style.width = "420px";
    frame.style.height = "420px";
    document.body.appendChild(frame);
  }, { frameId: id, frameSource: source });
  const handle = await page.locator(`#${id}`).elementHandle();
  const frame = await handle?.contentFrame();
  assert.ok(frame, `${id} did not create a browsing context`);
  await frame.waitForURL(source);
  return frame;
}

async function records(page, sourceId, marker) {
  return page.evaluate(({ id, key }) => window.__mmsProtocolRecords.filter((record) => (
    record.sourceId === id && record.data && record.data[key] === 1
  )), { id: sourceId, key: marker });
}

async function clearRecords(page) {
  await page.evaluate(() => { window.__mmsProtocolRecords.length = 0; });
}

async function parentSend(page, id, data, targetOrigin) {
  await page.evaluate(({ frameId, payload, origin }) => {
    document.getElementById(frameId).contentWindow.postMessage(payload, origin);
  }, { frameId: id, payload: data, origin: targetOrigin });
}

async function syntheticChildMessage(frame, { data, origin, source }) {
  await frame.evaluate(({ payload, senderOrigin, sender }) => {
    window.dispatchEvent(new MessageEvent("message", {
      data: payload,
      origin: senderOrigin,
      source: sender === "parent" ? window.parent : window,
    }));
  }, { payload: data, senderOrigin: origin, sender: source });
}

async function v7Rotation(frame) {
  return frame.evaluate(() => window.v7Cup.cup.rotation.y);
}

async function assertV7Advancing(frame, label) {
  const before = await v7Rotation(frame);
  await frame.waitForTimeout(120);
  const after = await v7Rotation(frame);
  assert.ok(after > before, `${label}: V7 rotation stopped (${before} -> ${after})`);
}

async function assertV7Stopped(frame, label) {
  await frame.waitForTimeout(60);
  const before = await v7Rotation(frame);
  await frame.waitForTimeout(120);
  const after = await v7Rotation(frame);
  assert.equal(after, before, `${label}: V7 rotation advanced (${before} -> ${after})`);
}

async function exerciseV7({ page, frame, parentOrigin, childOrigin }) {
  await frame.waitForFunction(() => Boolean(window.v7Cup));
  await page.waitForFunction(() => window.__mmsProtocolRecords.some((record) => (
    record.sourceId === "v7" && record.data?.__mmsEmbedReady === 1
  )));
  const ready = await records(page, "v7", "__mmsEmbedReady");
  assert.equal(ready.length, 1, "V7 did not emit exactly one readiness message");
  assert.deepEqual(ready[0].data, envelope("v7-cup", { __mmsEmbedReady: 1 }),
    "V7 readiness envelope is malformed");
  assert.equal(ready[0].origin, childOrigin, "V7 readiness came from the wrong child origin");
  await assertV7Advancing(frame, "initial state");

  const pause = envelope("v7-cup", { __mmsEmbedVisibility: 1, visible: false });
  const rejected = [
    ["wrong parent origin", { data: pause, origin: childOrigin, source: "parent" }],
    ["wrong parent window", { data: pause, origin: parentOrigin, source: "self" }],
    ["wrong kind", { data: { ...pause, kind: "touchbaes" }, origin: parentOrigin, source: "parent" }],
    ["missing version", { data: { __mmsEmbedVisibility: 1, kind: "v7-cup", visible: false }, origin: parentOrigin, source: "parent" }],
    ["stale version", { data: { ...pause, protocolVersion: 0 }, origin: parentOrigin, source: "parent" }],
    ["future version", { data: { ...pause, protocolVersion: 2 }, origin: parentOrigin, source: "parent" }],
    ["string version", { data: { ...pause, protocolVersion: "1" }, origin: parentOrigin, source: "parent" }],
    ["non-boolean visibility", { data: { ...pause, visible: 0 }, origin: parentOrigin, source: "parent" }],
  ];
  for (const [label, message] of rejected) {
    await syntheticChildMessage(frame, message);
    await assertV7Advancing(frame, label);
  }

  await parentSend(page, "v7", pause, childOrigin);
  await assertV7Stopped(frame, "valid pause");
  await syntheticChildMessage(frame, {
    data: envelope("v7-cup", { __mmsEmbedVisibility: 1, visible: true }),
    origin: parentOrigin,
    source: "self",
  });
  await assertV7Stopped(frame, "wrong-window resume");
  await parentSend(page, "v7", envelope("v7-cup", {
    __mmsEmbedVisibility: 1,
    visible: true,
  }), childOrigin);
  await assertV7Advancing(frame, "valid resume");
  process.stdout.write("V7 child source/origin/kind/version protocol: PASS\n");
}

async function exerciseTouchbaes({ page, frame, parentOrigin, childOrigin }) {
  await frame.waitForFunction(() => document.querySelector(".touchbaes-game"));
  const mode = envelope("touchbaes", { __mmsGameMode: 1, compact: true });
  const rejected = [
    ["wrong parent origin", { data: mode, origin: childOrigin, source: "parent" }],
    ["wrong parent window", { data: mode, origin: parentOrigin, source: "self" }],
    ["wrong kind", { data: { ...mode, kind: "v7-cup" }, origin: parentOrigin, source: "parent" }],
    ["missing version", { data: { __mmsGameMode: 1, kind: "touchbaes", compact: true }, origin: parentOrigin, source: "parent" }],
    ["stale version", { data: { ...mode, protocolVersion: 0 }, origin: parentOrigin, source: "parent" }],
    ["future version", { data: { ...mode, protocolVersion: 2 }, origin: parentOrigin, source: "parent" }],
    ["string version", { data: { ...mode, protocolVersion: "1" }, origin: parentOrigin, source: "parent" }],
    ["non-boolean compact", { data: { ...mode, compact: 1 }, origin: parentOrigin, source: "parent" }],
  ];
  for (const [label, message] of rejected) {
    await syntheticChildMessage(frame, message);
    const state = await frame.evaluate(() => document.documentElement.dataset.mmsCompact || "");
    assert.equal(state, "", `${label}: Touchbaes accepted a rejected mode`);
  }
  assert.equal((await records(page, "touchbaes", "__mmsEmbedReady")).length, 0,
    "Touchbaes became ready before a valid parent mode");
  assert.equal((await records(page, "touchbaes", "__mmsGameSize")).length, 0,
    "Touchbaes measured before a valid parent mode");

  await parentSend(page, "touchbaes", mode, childOrigin);
  await frame.waitForFunction(() => document.documentElement.dataset.mmsCompact === "true");
  await page.waitForFunction(() => window.__mmsProtocolRecords.some((record) => (
    record.sourceId === "touchbaes" && record.data?.__mmsEmbedReady === 1
  )));
  await page.waitForFunction(() => window.__mmsProtocolRecords.some((record) => (
    record.sourceId === "touchbaes" && record.data?.__mmsGameSize === 1
  )));
  const ready = await records(page, "touchbaes", "__mmsEmbedReady");
  assert.deepEqual(ready.at(-1).data, envelope("touchbaes", { __mmsEmbedReady: 1 }),
    "Touchbaes readiness envelope is malformed");
  assert.equal(ready.at(-1).origin, childOrigin, "Touchbaes readiness came from the wrong child origin");
  const sizes = await records(page, "touchbaes", "__mmsGameSize");
  const size = sizes.at(-1);
  assert.equal(size.data.kind, "touchbaes", "Touchbaes size kind is missing");
  assert.equal(size.data.protocolVersion, PROTOCOL_VERSION, "Touchbaes size version is missing");
  assert.equal(size.data.geometryVersion, 10, "Touchbaes geometry version changed");
  assert.equal(typeof size.data.compact, "boolean", "Touchbaes size compact state is not boolean");
  assert.ok(Number.isFinite(size.data.height) && size.data.height > 0, "Touchbaes size height is invalid");
  assert.equal(size.origin, childOrigin, "Touchbaes size came from the wrong child origin");
  process.stdout.write("Touchbaes child source/origin/kind/version protocol: PASS\n");
}

async function run() {
  const watchdog = setTimeout(() => {
    process.stderr.write(`Embed message protocol test exceeded ${WATCHDOG_MS}ms\n`);
    process.exit(2);
  }, WATCHDOG_MS);
  const tempRoot = await mkdtemp(path.join(tmpdir(), "mms-embed-message-v1-"));
  let parentServer = null;
  let childServer = null;
  let browser = null;
  try {
    const v7Output = path.join(tempRoot, "v7.html");
    const build = spawnSync("python3", [V7_BUILDER, "--output", v7Output], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
    });
    assert.equal(build.status, 0, `V7 candidate build failed:\n${build.stdout}${build.stderr}`);
    await copyFile(TOUCH_SOURCE, path.join(tempRoot, "touchbaes.html"));
    parentServer = await startStaticServer(PARENT_ROOT);
    childServer = await startStaticServer(tempRoot);
    browser = await launchAuditBrowser({
      channel: process.env.MMS_AUDIT_BROWSER_CHANNEL || "chrome",
      executablePath: process.env.MMS_AUDIT_BROWSER_EXECUTABLE || "",
      headed: false,
    });
    const context = await browser.newContext({ viewport: { width: 900, height: 700 } });
    await context.route("**/*", async (route) => {
      const origin = new URL(route.request().url()).origin;
      if (origin === parentServer.origin || origin === childServer.origin) await route.continue();
      else await route.abort("blockedbyclient");
    });
    const pageErrors = [];
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
    page.setDefaultTimeout(10_000);
    await page.goto(`${parentServer.origin}/embed-protocol-parent.html`, { waitUntil: "domcontentloaded" });
    const v7Frame = await addFrame(page, "v7", `${childServer.origin}/v7.html`);
    await exerciseV7({
      page,
      frame: v7Frame,
      parentOrigin: parentServer.origin,
      childOrigin: childServer.origin,
    });
    await clearRecords(page);
    const touchFrame = await addFrame(page, "touchbaes", `${childServer.origin}/touchbaes.html`);
    await exerciseTouchbaes({
      page,
      frame: touchFrame,
      parentOrigin: parentServer.origin,
      childOrigin: childServer.origin,
    });
    assert.deepEqual(pageErrors, [], `page errors occurred: ${pageErrors.join("\n")}`);
    await context.close();
    process.stdout.write("Embed message protocol child integration: PASS\n");
  } finally {
    if (browser) await browser.close();
    if (childServer) await childServer.close();
    if (parentServer) await parentServer.close();
    await rm(tempRoot, { recursive: true, force: true });
    clearTimeout(watchdog);
  }
}

await run();
