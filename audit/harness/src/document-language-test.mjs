import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";
import { startStaticServer } from "./server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const CARGO_ROOT = path.join(ROOT, "cargo");
const CONTRACT_PATH = path.join(ROOT, "audit/contracts/document-language.json");
const CONTRACT = JSON.parse(readFileSync(CONTRACT_PATH, "utf8"));
const AXE_SOURCE = readFileSync(
  path.join(ROOT, "audit/harness/node_modules/axe-core/axe.min.js"),
  "utf8",
);
const ROOT_SETTER = "document.documentElement.setAttribute('lang', 'en');";
const STANDALONE_ROOT = '<html lang="en"';
const WATCHDOG = setTimeout(() => {
  process.stderr.write("Document language contracts: FAIL (120s watchdog)\n");
  process.exit(2);
}, 120000);

function count(source, needle) {
  return source.split(needle).length - 1;
}

function extractInlineScript(source, label) {
  const match = source.match(/^\s*<script\b[^>]*>([\s\S]*?)<\/script>\s*$/);
  assert.ok(match, `${label} must remain one inline script`);
  return match[1];
}

function assertWriteOverrideContract(source, label) {
  const expectedLanguage = CONTRACT.implementation_contract.write_descendant_override.language;
  const expectedCount = CONTRACT.implementation_contract.write_descendant_override.expected_count;
  const exactCount = count(source, `lang="${expectedLanguage}"`);
  assert.equal(
    exactCount,
    expectedCount,
    `${label} must retain exactly ${expectedCount} ${expectedLanguage} override`,
  );
  const descendantLanguageAttributes = (source.match(/\slang="[^"]+"/g) || [])
    .filter((attribute) => attribute !== ' lang="en"');
  assert.deepEqual(
    descendantLanguageAttributes,
    [` lang="${expectedLanguage}"`],
    `${label} must not drift the Write descendant language`,
  );
}

function assertStaticContracts() {
  assert.equal(CONTRACT.schema_version, 1, "document-language schema must remain explicit");
  assert.equal(CONTRACT.issue_id, "MMS-AUD-004", "contract must close the audited issue");
  assert.equal(CONTRACT.root_language, "en", "root language must remain exact en");
  assert.deepEqual(
    CONTRACT.browser_contract.axe_rules,
    ["html-has-lang", "html-lang-valid", "html-xml-lang-mismatch"],
    "contract must retain the complete root-language Axe rule set",
  );

  const evidence = JSON.parse(
    readFileSync(path.join(ROOT, CONTRACT.scope.root_cause_evidence), "utf8"),
  );
  assert.equal(evidence.issue, CONTRACT.issue_id, "root-cause evidence must match the contract");
  assert.equal(
    evidence.language_decision.root_language,
    CONTRACT.root_language,
    "root-cause evidence must support exact en",
  );
  assert.equal(
    evidence.language_decision.write_descendant_override,
    CONTRACT.implementation_contract.write_descendant_override.language,
    "root-cause evidence must preserve the Cantonese descendant override",
  );

  const headContract = CONTRACT.implementation_contract.site_settings_head;
  const headSource = readFileSync(path.join(ROOT, headContract.path), "utf8");
  assert.equal(count(headSource, headContract.marker), 1, "head language marker must be unique");
  assert.equal(count(headSource, headContract.setter), 1, "head language setter must be unique");
  assert.ok(
    headSource.indexOf(headContract.setter) < headSource.indexOf(headContract.setter_precedes),
    "head language setter must execute before the pathname gate",
  );

  const fallbackContract = CONTRACT.implementation_contract.shared_body_fallback;
  const sharedSource = readFileSync(path.join(ROOT, fallbackContract.path), "utf8");
  assert.equal(count(sharedSource, fallbackContract.setter), 1,
    "shared fallback setter must be unique");
  assert.ok(
    sharedSource.indexOf(fallbackContract.setter) <
      sharedSource.indexOf(fallbackContract.setter_precedes),
    "shared fallback must execute before the one-shot guard",
  );

  for (const relative of CONTRACT.scope.canonical_bodycopies) {
    const source = readFileSync(path.join(ROOT, relative), "utf8");
    assert.equal(
      count(source, ROOT_SETTER),
      1,
      `${relative} must contain exactly one shared language fallback`,
    );
  }
  for (const relative of CONTRACT.scope.standalone_mirrors) {
    const source = readFileSync(path.join(ROOT, relative), "utf8");
    assert.ok(
      source.startsWith(`<!doctype html>${STANDALONE_ROOT}`),
      `${relative} must declare literal lang=en on its standalone root`,
    );
    assert.equal(
      count(source, ROOT_SETTER),
      1,
      `${relative} must contain exactly one shared language fallback`,
    );
  }

  for (const relative of CONTRACT.implementation_contract.write_descendant_override.sources) {
    assertWriteOverrideContract(readFileSync(path.join(ROOT, relative), "utf8"), relative);
  }
  const writeTemplate = readFileSync(path.join(ROOT, "cargo/write.template.html"), "utf8");
  assert.throws(
    () => assertWriteOverrideContract(writeTemplate.replace(' lang="yue-Hant"', "", 1), "missing"),
    /retain exactly/,
    "missing Write override negative control must fail closed",
  );
  assert.throws(
    () => assertWriteOverrideContract(
      writeTemplate.replace(' lang="yue-Hant"', ' lang="yue-Hant" lang="yue-Hant"', 1),
      "duplicate",
    ),
    /retain exactly/,
    "duplicate Write override negative control must fail closed",
  );
  assert.throws(
    () => assertWriteOverrideContract(
      writeTemplate.replace('lang="yue-Hant"', 'lang="zh-Hant"', 1),
      "incorrect",
    ),
    /retain exactly/,
    "incorrect Write override negative control must fail closed",
  );

  const packageJson = JSON.parse(
    readFileSync(path.join(ROOT, "audit/harness/package.json"), "utf8"),
  );
  assert.equal(
    packageJson.scripts["document-language-test"],
    "node src/document-language-test.mjs",
    "focused proof must retain its npm entrypoint",
  );
  const phase2 = readFileSync(path.join(ROOT, "audit/scripts/validate-phase2.sh"), "utf8");
  assert.equal(
    count(phase2, "npm run document-language-test"),
    1,
    "complete Phase 2 must invoke the focused proof exactly once",
  );
}

function writeHeadFixtures(root, siteHead) {
  const routes = CONTRACT.scope.head_fixture_routes;
  const document = () => (
    "<!doctype html><html><head><meta charset=\"utf-8\">" +
    siteHead +
    `<script>window.__mmsLanguageImmediatelyAfterHead={` +
    `path:window.location.pathname,lang:document.documentElement.getAttribute("lang")};` +
    "</script></head><body></body></html>"
  );
  for (const route of routes) {
    const relative = route.replace(/^\/|\/$/g, "");
    const directory = relative ? path.join(root, relative) : root;
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, "index.html"), document(), "utf8");
  }
}

function writeBodyOnlyFixtures(root) {
  for (const relative of Object.values(CONTRACT.scope.pages)) {
    const source = readFileSync(path.join(ROOT, relative), "utf8");
    assert.ok(source.includes(STANDALONE_ROOT), `${relative} must start with lang=en`);
    const bodyOnly = source.replace(STANDALONE_ROOT, "<html");
    assert.ok(!bodyOnly.includes(STANDALONE_ROOT), `${relative} fixture must remove root lang`);
    writeFileSync(path.join(root, path.basename(relative)), bodyOnly, "utf8");
  }
}

async function assertAxeLanguageRules(page, label) {
  await page.addScriptTag({ content: AXE_SOURCE });
  const results = await page.evaluate(async (rules) => window.axe.run(document, {
    runOnly: { type: "rule", values: rules },
  }), CONTRACT.browser_contract.axe_rules);
  assert.deepEqual(
    results.violations.map((violation) => violation.id),
    [],
    `${label} must have zero root-language Axe violations`,
  );
}

async function verifyCanonicalMirrors(browser, origin) {
  for (const [viewportName, viewport] of Object.entries(
    CONTRACT.browser_contract.viewports,
  )) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    for (const [pageName, relative] of Object.entries(CONTRACT.scope.pages)) {
      await page.goto(`${origin}/${path.basename(relative)}`, {
        waitUntil: "domcontentloaded",
      });
      const language = await page.evaluate(() =>
        document.documentElement.getAttribute("lang"));
      assert.equal(
        language,
        CONTRACT.browser_contract.expected_root_language,
        `${pageName}/${viewportName} must expose exact root lang=en`,
      );
      if (pageName === "write") {
        const overrides = await page.locator('[lang="yue-Hant"]').count();
        assert.equal(overrides, 1, `Write/${viewportName} must retain one yue-Hant passage`);
      }
      await assertAxeLanguageRules(page, `${pageName}/${viewportName}`);
      process.stdout.write(`Document language ${pageName}/${viewportName}: PASS\n`);
    }
    await context.close();
  }
}

async function verifyHeadRoutes(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  for (const route of CONTRACT.scope.head_fixture_routes) {
    await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
    const state = await page.evaluate(() => ({
      captured: window.__mmsLanguageImmediatelyAfterHead,
      current: document.documentElement.getAttribute("lang"),
    }));
    assert.deepEqual(
      state,
      {
        captured: { path: route, lang: CONTRACT.root_language },
        current: CONTRACT.root_language,
      },
      `${route} must receive exact en from the head before route gating`,
    );
  }
  await context.close();
  process.stdout.write(
    `Document language head routes: PASS (${CONTRACT.scope.head_fixture_routes.length})\n`,
  );
}

async function verifyBodyOnlyFallback(browser, origin, sharedJavaScript) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  for (const [pageName, relative] of Object.entries(CONTRACT.scope.pages)) {
    await page.goto(`${origin}/${path.basename(relative)}`, {
      waitUntil: "domcontentloaded",
    });
    const initial = await page.evaluate(() => ({
      lang: document.documentElement.getAttribute("lang"),
      guard: window.__mmsEarlyPreviewStarted,
    }));
    assert.equal(initial.lang, CONTRACT.root_language,
      `${pageName} body-only fixture must receive shared fallback`);
    assert.ok(initial.guard, `${pageName} body-only fixture must exercise the one-shot guard`);

    await page.evaluate(() => document.documentElement.removeAttribute("lang"));
    await page.addScriptTag({ content: sharedJavaScript });
    const rerun = await page.evaluate(() => ({
      lang: document.documentElement.getAttribute("lang"),
      guard: window.__mmsEarlyPreviewStarted,
    }));
    assert.equal(
      rerun.lang,
      CONTRACT.browser_contract.body_only_fallback.expected_root_language,
      `${pageName} shared fallback must run before the existing one-shot guard`,
    );
    assert.equal(rerun.guard, initial.guard,
      `${pageName} fallback rerun must not restart the preview initializer`);
  }
  await context.close();
  process.stdout.write("Document language body-only fallback: PASS\n");
}

assertStaticContracts();

const headRoot = mkdtempSync(path.join(os.tmpdir(), "mms-lang-head-"));
const bodyRoot = mkdtempSync(path.join(os.tmpdir(), "mms-lang-body-"));
const siteHead = readFileSync(path.join(CARGO_ROOT, "site-head.html"), "utf8");
const sharedSource = readFileSync(path.join(CARGO_ROOT, "shared-early-init.html"), "utf8");
writeHeadFixtures(headRoot, siteHead);
writeBodyOnlyFixtures(bodyRoot);

const cargoServer = await startStaticServer(CARGO_ROOT);
const headServer = await startStaticServer(headRoot);
const bodyServer = await startStaticServer(bodyRoot);
const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath = process.env.MMS_AUDIT_BROWSER_EXECUTABLE ||
  (process.platform === "darwin" && existsSync(macChrome) ? macChrome : "");
const browser = await chromium.launch({
  headless: true,
  timeout: 15000,
  ...(executablePath
    ? { executablePath }
    : { channel: process.env.MMS_AUDIT_BROWSER_CHANNEL || "chrome" }),
});

try {
  await verifyCanonicalMirrors(browser, cargoServer.origin);
  await verifyHeadRoutes(browser, headServer.origin);
  await verifyBodyOnlyFallback(
    browser,
    bodyServer.origin,
    extractInlineScript(sharedSource, "shared early initializer"),
  );
} finally {
  await browser.close();
  await cargoServer.close();
  await headServer.close();
  await bodyServer.close();
  rmSync(headRoot, { recursive: true, force: true });
  rmSync(bodyRoot, { recursive: true, force: true });
  clearTimeout(WATCHDOG);
}

process.stdout.write("Document language contracts: PASS\n");
