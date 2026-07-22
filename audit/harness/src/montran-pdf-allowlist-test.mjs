#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { launchAuditBrowser } from "./collector.mjs";
import { PROJECT_ROOT } from "./config.mjs";

const WATCHDOG_MS = 120_000;
const CANDIDATE_ROOT = path.join(PROJECT_ROOT, "work/montran-pdf-allowlist-v18-src");
const CANDIDATE_BUILDER = path.join(CANDIDATE_ROOT, "build-bundle.py");
const POLICY_PATH = path.join(CANDIDATE_ROOT, "approved-pdf.json");
const REJECTION_MESSAGE = "This booklet can load only the approved Montran report.";
const PAGE_COUNT = 24;
const RANGE_CHUNK_SIZE = 262_144;
const APPROVED_PDF_BYTES = 13_634_937;
const CANDIDATE_URL = (
  "https://freight.cargo.site/m/mms-audit/montran-booklet-direct-pdf-v18.html"
);

function appendAscii(chunks, state, value) {
  const payload = Buffer.from(value, "latin1");
  chunks.push(payload);
  state.length += payload.length;
}

function deterministicPdf(targetLength, pageCount = PAGE_COUNT) {
  const chunks = [];
  const state = { length: 0 };
  const offsets = [];
  const pageObjectStart = 4;
  const objectCount = pageObjectStart + pageCount;
  const streamPayload = Buffer.from("q\nQ\n", "latin1");
  const addObject = (number, body) => {
    offsets[number] = state.length;
    appendAscii(chunks, state, `${number} 0 obj\n${body}\nendobj\n`);
  };

  appendAscii(chunks, state, "%PDF-1.4\n%MMSS\n");
  addObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  const pageReferences = Array.from(
    { length: pageCount },
    (_, index) => `${pageObjectStart + index} 0 R`,
  ).join(" ");
  addObject(2, `<< /Type /Pages /Count ${pageCount} /Kids [${pageReferences}] >>`);

  offsets[3] = state.length;
  appendAscii(chunks, state, `3 0 obj\n<< /Length ${streamPayload.length} >>\nstream\n`);
  chunks.push(streamPayload);
  state.length += streamPayload.length;
  appendAscii(chunks, state, "\nendstream\nendobj\n");

  for (let index = 0; index < pageCount; index += 1) {
    addObject(
      pageObjectStart + index,
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1600 900] " +
        "/Resources << >> /Contents 3 0 R >>",
    );
  }

  const xrefEntries = ["0000000000 65535 f \n"];
  for (let number = 1; number < objectCount; number += 1) {
    xrefEntries.push(`${String(offsets[number]).padStart(10, "0")} 00000 n \n`);
  }
  const createSuffix = (xrefOffset) => Buffer.from(
    `xref\n0 ${objectCount}\n${xrefEntries.join("")}` +
      `trailer\n<< /Size ${objectCount} /Root 1 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF\n`,
    "latin1",
  );
  let paddingLength = targetLength - state.length;
  let suffix = Buffer.alloc(0);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const xrefOffset = state.length + paddingLength;
    suffix = createSuffix(xrefOffset);
    const nextPaddingLength = targetLength - state.length - suffix.length;
    if (nextPaddingLength === paddingLength) break;
    paddingLength = nextPaddingLength;
  }
  assert.ok(paddingLength >= 0, "PDF fixture target is smaller than its structural content");
  assert.equal(
    state.length + paddingLength + suffix.length,
    targetLength,
    "PDF fixture could not converge on the frozen byte total",
  );
  chunks.push(Buffer.alloc(paddingLength, 0x0a));
  state.length += paddingLength;
  chunks.push(suffix);
  state.length += suffix.length;
  return Buffer.concat(chunks, state.length);
}

function pdfQuery(value) {
  return `?pdf=${encodeURIComponent(value)}`;
}

function duplicatePdfQuery(first, second) {
  return `?pdf=${encodeURIComponent(first)}&pdf=${encodeURIComponent(second)}`;
}

function parseRange(value, totalLength) {
  const match = /^bytes=(\d+)-(\d*)$/.exec(value || "");
  if (!match) return null;
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : totalLength - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0) return null;
  if (start >= totalLength || requestedEnd < start) return null;
  return { start, end: Math.min(requestedEnd, totalLength - 1) };
}

async function fulfillPdf(route, pdf) {
  const request = route.request();
  const commonHeaders = {
    "access-control-allow-origin": "*",
    "accept-ranges": "bytes",
    "cache-control": "no-store",
    "content-type": "application/pdf",
  };
  if (request.method() === "HEAD") {
    await route.fulfill({
      status: 200,
      headers: { ...commonHeaders, "content-length": String(pdf.length) },
    });
    return;
  }
  const range = parseRange(request.headers().range, pdf.length);
  if (range) {
    const body = pdf.subarray(range.start, range.end + 1);
    await route.fulfill({
      status: 206,
      headers: {
        ...commonHeaders,
        "content-length": String(body.length),
        "content-range": `bytes ${range.start}-${range.end}/${pdf.length}`,
      },
      body,
    });
    return;
  }
  await route.fulfill({
    status: 200,
    headers: { ...commonHeaders, "content-length": String(pdf.length) },
    body: pdf,
  });
}

async function exerciseRejected({ context, candidateUrl, label, query, requestLog }) {
  requestLog.length = 0;
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
  page.setDefaultTimeout(12_000);
  try {
    await page.goto(`${candidateUrl}${query}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction((message) => {
      const node = document.getElementById("message");
      return node && !node.hidden && node.textContent === message;
    }, REJECTION_MESSAGE);
    await page.waitForTimeout(75);
    assert.equal(requestLog.length, 0, `${label}: rejected URL caused PDF network activity`);
    const state = await page.evaluate(() => ({
      message: document.getElementById("message")?.textContent || "",
      messageHidden: document.getElementById("message")?.hidden ?? true,
      preloadHidden: document.getElementById("preload")?.hidden ?? false,
      pageCount: document.querySelectorAll(".book-page").length,
    }));
    assert.deepEqual(state, {
      message: REJECTION_MESSAGE,
      messageHidden: false,
      preloadHidden: true,
      pageCount: 0,
    }, `${label}: rejected viewer state is not fail-closed`);
    assert.deepEqual(pageErrors, [], `${label}: page errors occurred: ${pageErrors.join("\n")}`);
  } finally {
    await page.close();
  }
}

async function exerciseApproved({ context, candidateUrl, approvedPdfUrl, label, query, requestLog }) {
  requestLog.length = 0;
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
  page.setDefaultTimeout(30_000);
  try {
    await page.goto(`${candidateUrl}${query}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const page19 = document.querySelector('.book-page[data-source-page="19"] img');
      const page20 = document.querySelector('.book-page[data-source-page="20"] img');
      return document.querySelectorAll(".book-page").length === 72 &&
        page19?.src.startsWith("blob:") && page20?.src.startsWith("blob:");
    });
    const state = await page.evaluate(() => ({
      messageHidden: document.getElementById("message")?.hidden ?? false,
      pageCount: document.querySelectorAll(".book-page").length,
      page19: document.querySelector('.book-page[data-source-page="19"] img')?.src || "",
      page20: document.querySelector('.book-page[data-source-page="20"] img')?.src || "",
    }));
    assert.equal(state.messageHidden, true, `${label}: viewer retained an error message`);
    assert.equal(state.pageCount, 72, `${label}: viewer created the wrong booklet page count`);
    assert.match(state.page19, /^blob:/, `${label}: PDF page 19 was not rendered`);
    assert.match(state.page20, /^blob:/, `${label}: PDF page 20 was not rendered`);
    assert.deepEqual(pageErrors, [], `${label}: page errors occurred: ${pageErrors.join("\n")}`);

    assert.ok(requestLog.length >= 2, `${label}: approved PDF did not make HEAD and range requests`);
    assert.ok(requestLog.every((record) => record.url === approvedPdfUrl),
      `${label}: PDF loader requested a URL outside the exact allowlist`);
    assert.ok(requestLog.every((record) => !record.cookie),
      `${label}: approved PDF request leaked a Cookie header`);
    assert.ok(requestLog.every((record) => !record.referer),
      `${label}: approved PDF request leaked a Referer header`);
    const heads = requestLog.filter((record) => record.method === "HEAD");
    assert.equal(heads.length, 1, `${label}: approved PDF did not make exactly one HEAD probe`);
    const ranged = requestLog.filter((record) => record.method === "GET" && record.range);
    assert.ok(ranged.length >= 1, `${label}: approved PDF did not use range loading`);
    assert.equal(ranged[0].range, `bytes=0-${RANGE_CHUNK_SIZE - 1}`,
      `${label}: initial PDF range changed`);
    const fullGets = requestLog.filter((record) => record.method === "GET" && !record.range);
    assert.equal(
      fullGets.length,
      0,
      `${label}: approved range load fell back to a full download\n${JSON.stringify(requestLog, null, 2)}`,
    );
  } finally {
    await page.close();
  }
}

async function run() {
  const watchdog = setTimeout(() => {
    process.stderr.write(`Montran PDF allowlist test exceeded ${WATCHDOG_MS}ms\n`);
    process.exit(2);
  }, WATCHDOG_MS);
  const tempRoot = await mkdtemp(path.join(tmpdir(), "mms-montran-pdf-allowlist-"));
  let browser = null;
  try {
    const policy = JSON.parse(await readFile(POLICY_PATH, "utf8"));
    const approvedPdfUrl = policy.approved_pdf_url;
    assert.equal(policy.schema_version, 1, "unsupported approved-PDF policy fixture");
    assert.equal(typeof approvedPdfUrl, "string", "approved PDF URL is missing from policy");
    assert.equal(new URL(approvedPdfUrl).href, approvedPdfUrl, "approved PDF URL is not canonical");
    assert.equal(policy.expected_bytes, APPROVED_PDF_BYTES, "approved PDF byte total changed");

    const candidateName = "montran-booklet-direct-pdf-v18.html";
    const candidatePath = path.join(tempRoot, candidateName);
    const build = spawnSync("python3", [CANDIDATE_BUILDER, "--output", candidatePath], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
    });
    assert.equal(build.status, 0, `Montran allowlist candidate build failed:\n${build.stdout}${build.stderr}`);
    const candidateHtml = await readFile(candidatePath);

    const pdf = deterministicPdf(policy.expected_bytes);
    assert.equal(pdf.length, policy.expected_bytes, "PDF fixture does not match the frozen byte total");
    assert.ok(pdf.length > RANGE_CHUNK_SIZE, "PDF fixture does not exercise multiple range chunks");
    browser = await launchAuditBrowser({
      channel: process.env.MMS_AUDIT_BROWSER_CHANNEL || "chrome",
      executablePath: process.env.MMS_AUDIT_BROWSER_EXECUTABLE || "",
      headed: false,
    });
    const context = await browser.newContext({
      viewport: { width: 1176, height: 504 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      locale: "en-CA",
      timezoneId: "America/Toronto",
    });
    await context.addCookies([{
      name: "mms_pdf_auth_probe",
      value: "must-not-leave-browser",
      domain: "freight.cargo.site",
      path: "/",
      secure: true,
      sameSite: "None",
    }]);
    const storedCookies = await context.cookies(approvedPdfUrl);
    assert.ok(
      storedCookies.some((cookie) => cookie.name === "mms_pdf_auth_probe"),
      "credential-omission probe cookie was not installed",
    );
    let requestLog = [];
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (request.url().split("?", 1)[0] === CANDIDATE_URL) {
        await route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: candidateHtml,
        });
        return;
      }
      if (request.resourceType() === "fetch" || request.resourceType() === "xhr") {
        const requestHeaders = await request.allHeaders();
        requestLog.push({
          cookie: requestHeaders.cookie || "",
          method: request.method(),
          range: requestHeaders.range || "",
          referer: requestHeaders.referer || "",
          url: request.url(),
        });
        await fulfillPdf(route, pdf);
        return;
      }
      await route.abort("blockedbyclient");
    });

    const candidateUrl = CANDIDATE_URL;
    assert.equal(
      new URL(candidateUrl).origin,
      new URL(approvedPdfUrl).origin,
      "credential probe must reproduce the production same-origin boundary",
    );
    const wrongOriginPdf = "https://evil.invalid/cors-readable.pdf";
    const approvedPath = new URL(approvedPdfUrl).pathname;
    const negativeCases = [
      ["empty parameter", "?pdf="],
      ["duplicate approved then arbitrary", duplicatePdfQuery(approvedPdfUrl, wrongOriginPdf)],
      ["duplicate arbitrary then approved", duplicatePdfQuery(wrongOriginPdf, approvedPdfUrl)],
      ["HTTP downgrade", pdfQuery(approvedPdfUrl.replace(/^https:/, "http:"))],
      ["protocol-relative URL", pdfQuery(approvedPdfUrl.replace(/^https:/, ""))],
      ["data URL", pdfQuery("data:application/pdf;base64,JVBERi0xLjQKJSVFT0Y=")],
      ["blob URL", pdfQuery("blob:https://freight.cargo.site/00000000-0000-0000-0000-000000000000")],
      ["arbitrary CORS-readable origin", pdfQuery(wrongOriginPdf)],
      ["same Freight origin wrong object", pdfQuery(approvedPdfUrl.replace(
        "P3028590574867085520722012452665",
        "P0000000000000000000000000000000",
      ))],
      ["root-relative path", pdfQuery(approvedPath)],
      ["approved URL with query", pdfQuery(`${approvedPdfUrl}?download=1`)],
      ["approved URL with fragment", pdfQuery(`${approvedPdfUrl}#page=19`)],
      ["double-encoded approved URL", pdfQuery(encodeURIComponent(approvedPdfUrl))],
      ["percent-encoded path alias", pdfQuery(approvedPdfUrl.replace("montran_", "%6Dontran_"))],
      ["dot-segment path alias", pdfQuery(approvedPdfUrl.replace(
        "/montran_sustainability-report_2025_v4-web.pdf",
        "/alias/../montran_sustainability-report_2025_v4-web.pdf",
      ))],
      ["userinfo host trick", pdfQuery(approvedPdfUrl.replace(
        "https://freight.cargo.site/",
        "https://freight.cargo.site@evil.invalid/",
      ))],
      ["suffix host trick", pdfQuery(approvedPdfUrl.replace(
        "freight.cargo.site",
        "freight.cargo.site.evil.invalid",
      ))],
      ["Unicode host confusable", pdfQuery(approvedPdfUrl.replace("freight", "freіght"))],
      ["default-port alias", pdfQuery(approvedPdfUrl.replace("freight.cargo.site", "freight.cargo.site:443"))],
    ];

    for (const [label, query] of negativeCases) {
      await exerciseRejected({ context, candidateUrl, label, query, requestLog });
    }
    process.stdout.write(`Montran PDF allowlist negatives: PASS (${negativeCases.length} rejected before fetch)\n`);

    await exerciseApproved({
      context,
      candidateUrl,
      approvedPdfUrl,
      label: "exact encoded approved URL",
      query: pdfQuery(approvedPdfUrl),
      requestLog,
    });
    await exerciseApproved({
      context,
      candidateUrl,
      approvedPdfUrl,
      label: "approved no-parameter fallback",
      query: "",
      requestLog,
    });
    await context.close();
    process.stdout.write("Montran approved PDF exact/no-parameter range loading: PASS\n");
    process.stdout.write("Montran PDF allowlist actual-viewer test: PASS\n");
  } finally {
    if (browser) await browser.close();
    await rm(tempRoot, { recursive: true, force: true });
    clearTimeout(watchdog);
  }
}

await run();
