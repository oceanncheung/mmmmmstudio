import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
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
const CONTRACT_PATH = path.join(ROOT, "audit/contracts/river-aria-source-purity.json");
const CONTRACT = JSON.parse(readFileSync(CONTRACT_PATH, "utf8"));
const TEST_SOURCE = readFileSync(path.join(CARGO_ROOT, "test.html"), "utf8");
const HOME_SOURCE = readFileSync(path.join(CARGO_ROOT, "home.html"), "utf8");
const AXE_SOURCE = readFileSync(path.join(ROOT, "audit/harness/node_modules/axe-core/axe.min.js"), "utf8");
const SERIALIZED_PATH = "/river-aria-serialized.html";
const SEMANTIC_CONTROL_PATH = "/river-aria-scrollbar-semantics.html";
const WATCHDOG = setTimeout(() => {
  process.stderr.write("River ARIA source-purity contracts: FAIL (90s watchdog)\n");
  process.exit(2);
}, 90000);

function injectAttributesIntoBandRivers(source, attributes, bands) {
  let mutated = source;
  for (const band of bands) {
    const bandNeedle = `<section class="mms-band" data-band="${band}"`;
    const bandIndex = mutated.indexOf(bandNeedle);
    assert.notEqual(bandIndex, -1, `fixture must contain ${band} band`);
    const nextBandIndex = mutated.indexOf('<section class="mms-band"', bandIndex + bandNeedle.length);
    const riverIndex = mutated.indexOf('class="mms-river"', bandIndex);
    assert.ok(
      riverIndex !== -1 && (nextBandIndex === -1 || riverIndex < nextBandIndex),
      `fixture must contain a direct project river after ${band}`,
    );
    const insertion = attributes.map(([name, value]) => `${name}="${value}"`).join(" ");
    mutated = `${mutated.slice(0, riverIndex)}${insertion} ${mutated.slice(riverIndex)}`;
  }
  return mutated;
}

function exactRiverTags(source) {
  const tags = source.match(/<[^>]+>/g) || [];
  return tags.filter((tag) => {
    const classMatch = tag.match(/\sclass="([^"]*)"/);
    return Boolean(classMatch && classMatch[1].split(/\s+/).includes("mms-river"));
  });
}

function countRiverAttribute(source, attribute) {
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return exactRiverTags(source).filter((tag) => (
    new RegExp(`\\s${escapedAttribute}(?=\\s|=|/?>)`).test(tag)
  )).length;
}

function countRiverScrollbarSemantics(source) {
  const attributes = CONTRACT.saved_source_contract.forbidden_native_river_scrollbar_semantics;
  return exactRiverTags(source).filter((tag) => attributes.some((semantic) => {
    if (semantic === "role=scrollbar") {
      const match = tag.match(/\srole="([^"]*)"/i);
      return Boolean(match && match[1].toLowerCase().split(/\s+/).includes("scrollbar"));
    }
    return new RegExp(`\\s${semantic}(?=\\s|=|/?>)`, "i").test(tag);
  })).length;
}

function runBodycopyValidator(source, label) {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "mms-river-aria-"));
  const fixture = path.join(temporaryRoot, `${label}.html`);
  writeFileSync(fixture, source, "utf8");
  const result = spawnSync(
    "python3",
    [path.join(CARGO_ROOT, "validate-deployment-manifest.py"), "bodycopy", fixture, "home"],
    { cwd: ROOT, encoding: "utf8" },
  );
  rmSync(temporaryRoot, { recursive: true, force: true });
  return result;
}

function assertStaticContracts() {
  assert.equal(CONTRACT.schema_version, 1, "river ARIA contract schema must remain explicit");
  assert.equal(CONTRACT.issue_id, "MMS-AUD-003", "river ARIA contract must close the audited issue");
  assert.deepEqual(
    CONTRACT.saved_source_contract.manifest_counters,
    { native_rivers: 13, invalid_river_scrollbar_semantics: 0 },
    "contract must pin native-river identity and prohibit scrollbar semantics",
  );
  assert.deepEqual(
    CONTRACT.saved_source_contract.forbidden_native_river_scrollbar_semantics,
    [
      "role=scrollbar",
      "aria-orientation",
      "aria-valuemin",
      "aria-valuemax",
      "aria-valuenow",
      "aria-valuetext",
    ],
    "contract must prohibit the complete reviewed scrollbar-semantic set",
  );
  const rootCauseEvidence = JSON.parse(
    readFileSync(path.join(ROOT, CONTRACT.root_cause_evidence), "utf8"),
  );
  assert.equal(rootCauseEvidence.issue, CONTRACT.issue_id,
    "root-cause evidence must address the contracted audit issue");
  assert.equal(rootCauseEvidence.current_public_dom.expanded_1280x720.hidden_mms_river_elements, 0,
    "current expanded public evidence must remain free of hidden rivers");
  assert.equal(
    rootCauseEvidence.current_public_dom.expanded_1280x720.mms_river_elements_with_aria_valuenow,
    0,
    "current expanded public evidence must remain free of river value ARIA",
  );
  assert.equal(rootCauseEvidence.early_browser_instrumentation.writes_targeting_an_exact_mms_river, 0,
    "root-cause evidence must not attribute the defect to the current runtime");

  const packageJson = JSON.parse(
    readFileSync(path.join(ROOT, "audit/harness/package.json"), "utf8"),
  );
  assert.equal(
    packageJson.scripts["river-aria-test"],
    "node src/river-aria-source-test.mjs",
    "focused browser proof must retain its npm entrypoint",
  );
  const phase2 = readFileSync(path.join(ROOT, "audit/scripts/validate-phase2.sh"), "utf8");
  assert.equal(
    phase2.split("npm run river-aria-test").length - 1,
    1,
    "complete Phase 2 must invoke the focused proof exactly once",
  );

  for (const relative of CONTRACT.scope.canonical_sources) {
    const source = readFileSync(path.join(ROOT, relative), "utf8");
    assert.equal(
      exactRiverTags(source).length,
      CONTRACT.saved_source_contract.total_native_rivers,
      `${relative} must retain the exact native-river inventory`,
    );
    assert.equal(
      countRiverAttribute(source, "hidden"),
      0,
      `${relative} must not persist hidden on a native river`,
    );
    assert.equal(
      countRiverScrollbarSemantics(source),
      0,
      `${relative} must not persist scrubber semantics on a native river`,
    );
  }

  const clean = runBodycopyValidator(HOME_SOURCE, "clean");
  assert.equal(clean.status, 0, `canonical Home must pass saved-source validation: ${clean.stderr}`);

  const semanticValues = {
    "role=scrollbar": ["role", "scrollbar"],
    "aria-orientation": ["aria-orientation", "horizontal"],
    "aria-valuemin": ["aria-valuemin", "0"],
    "aria-valuemax": ["aria-valuemax", "100"],
    "aria-valuenow": ["aria-valuenow", "0"],
    "aria-valuetext": ["aria-valuetext", "0% through gallery"],
  };
  for (const semantic of CONTRACT.saved_source_contract.forbidden_native_river_scrollbar_semantics) {
    const fixture = injectAttributesIntoBandRivers(
      HOME_SOURCE,
      [semanticValues[semantic]],
      [CONTRACT.saved_source_contract.scrubber_eligible_bands[0]],
    );
    assert.equal(countRiverAttribute(fixture, "hidden"), 0,
      `${semantic} fixture must not rely on hidden`);
    assert.equal(countRiverScrollbarSemantics(fixture), 1,
      `${semantic} fixture must contaminate exactly one native river`);
    const rejected = runBodycopyValidator(fixture, semantic.replace(/[^a-z]+/gi, "-"));
    assert.notEqual(rejected.status, 0,
      `saved-source validation must reject native-river ${semantic}`);
    assert.match(rejected.stderr, /saved-source purity/,
      `${semantic} must fail through the saved-source contract`);
  }

  const duplicateClass = HOME_SOURCE.replace(
    'class="mms-river"',
    'class="mms-river" class="not-river"',
    1,
  );
  const rejectedDuplicate = runBodycopyValidator(duplicateClass, "duplicate-class");
  assert.notEqual(rejectedDuplicate.status, 0,
    "saved-source validation must reject duplicate class attributes");
  assert.match(rejectedDuplicate.stderr, /duplicate attributes: \['class'\]/,
    "duplicate class must fail before last-value dictionary conversion");

  const lostRiver = HOME_SOURCE.replace('class="mms-river"', 'class="not-river"', 1);
  assert.equal(exactRiverTags(lostRiver).length, 12,
    "lost-river fixture must remove exactly one native-river token");
  const rejectedLostRiver = runBodycopyValidator(lostRiver, "lost-river");
  assert.notEqual(rejectedLostRiver.status, 0,
    "saved-source validation must reject a missing native river");
  assert.match(rejectedLostRiver.stderr, /saved-source purity/,
    "native-river loss must fail through the saved-source contract");

  const frozen = readFileSync(path.join(ROOT, CONTRACT.frozen_cargo_evidence.path), "utf8");
  assert.equal(
    countRiverAttribute(frozen, "hidden"),
    CONTRACT.frozen_cargo_evidence.affected_rivers,
    "frozen Cargo evidence must retain all hidden river residue",
  );
  assert.equal(
    countRiverAttribute(frozen, "aria-valuenow"),
    CONTRACT.frozen_cargo_evidence.affected_rivers,
    "frozen Cargo evidence must retain all river value-ARIA residue",
  );
}

function makeSerializedFixture() {
  const bands = CONTRACT.saved_source_contract.scrubber_eligible_bands;
  const source = injectAttributesIntoBandRivers(
    TEST_SOURCE,
    [["aria-valuenow", CONTRACT.frozen_cargo_evidence.aria_valuenow_value], ["hidden", ""]],
    bands,
  );
  assert.equal(
    countRiverAttribute(source, "hidden"),
    CONTRACT.browser_contract.serialized_contamination_control.expected_affected_rivers,
    "serialized browser control must contain the exact hidden-river count",
  );
  assert.equal(
    countRiverAttribute(source, "aria-valuenow"),
    CONTRACT.browser_contract.serialized_contamination_control.expected_affected_rivers,
    "serialized browser control must contain the exact value-ARIA count",
  );
  return source;
}

function makeScrollbarSemanticFixture() {
  const attributes = [
    ["role", "scrollbar"],
    ["aria-orientation", "horizontal"],
    ["aria-valuemin", "0"],
    ["aria-valuemax", "100"],
    ["aria-valuenow", "0"],
    ["aria-valuetext", "0% through gallery"],
  ];
  let source = TEST_SOURCE;
  attributes.forEach((attribute, index) => {
    source = injectAttributesIntoBandRivers(
      source,
      [attribute],
      [CONTRACT.saved_source_contract.scrubber_eligible_bands[index]],
    );
  });
  assert.equal(
    countRiverScrollbarSemantics(source),
    CONTRACT.browser_contract.semantic_ownership_negative_control.expected_affected_rivers,
    "semantic browser control must contaminate one river per prohibited semantic",
  );
  return source;
}

async function waitForRuntime(page) {
  await page.waitForFunction((expected) => {
    const root = document.querySelector(".mms");
    const owner = window.__mmsRuntimeLifecycle?.owners?.panel;
    return Boolean(
      root &&
      owner?.root === root &&
      owner.active() === true &&
      document.querySelectorAll(".mms-river-scrubber").length === expected,
    );
  }, CONTRACT.saved_source_contract.scrubber_eligible_rivers);
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  await page.waitForTimeout(100);
}

async function installAxe(page) {
  await page.addScriptTag({ content: AXE_SOURCE });
}

async function ariaAllowedAttrNodes(page) {
  const results = await page.evaluate(async () => window.axe.run(document, {
    runOnly: { type: "rule", values: ["aria-allowed-attr"] },
  }));
  return results.violations.flatMap((violation) => violation.nodes);
}

async function readRuntimeState(page) {
  return page.evaluate(() => {
    const rivers = Array.from(document.querySelectorAll(".mms-band > .mms-river"));
    const scrubbers = Array.from(document.querySelectorAll(".mms-band > .mms-river-scrubber"));
    const scrollbarAria = [
      "aria-orientation",
      "aria-valuemin",
      "aria-valuemax",
      "aria-valuenow",
      "aria-valuetext",
    ];
    const invalidRivers = rivers.filter((river) => (
      river.hasAttribute("hidden") ||
      (river.getAttribute("role") || "").toLowerCase().split(/\s+/).includes("scrollbar") ||
      scrollbarAria.some((attribute) => river.hasAttribute(attribute))
    ));
    return {
      rivers: rivers.length,
      invalidRivers: invalidRivers.length,
      invalidBands: invalidRivers.map((river) => river.closest(".mms-band")?.dataset.band || ""),
      scrubbers: scrubbers.length,
      visibleScrubbers: scrubbers.filter((control) => getComputedStyle(control).display !== "none").length,
      scrubberSemantics: scrubbers.map((control) => ({
        role: control.getAttribute("role"),
        orientation: control.getAttribute("aria-orientation"),
        controls: control.getAttribute("aria-controls"),
        min: control.getAttribute("aria-valuemin"),
        max: control.getAttribute("aria-valuemax"),
        now: control.getAttribute("aria-valuenow"),
        text: control.getAttribute("aria-valuetext"),
        controlsExists: Boolean(document.getElementById(control.getAttribute("aria-controls") || "")),
      })),
      overflowX: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.documentElement.clientWidth,
      ),
      eviive: (() => {
        const river = document.querySelector('.mms-band[data-band="eviive"] > .mms-river');
        const style = getComputedStyle(river);
        return {
          overflowX: style.overflowX,
          touchAction: style.touchAction,
          scrollRange: river.scrollWidth - river.clientWidth,
        };
      })(),
    };
  });
}

function assertSeparateScrubberSemantics(state, expanded) {
  const expected = CONTRACT.browser_contract.separate_scrubber_semantics;
  assert.equal(
    state.scrubbers,
    CONTRACT.browser_contract.clean_source.generated_scrubbers,
    "runtime must retain 12 generated scrubbers as separate nodes",
  );
  for (const semantics of state.scrubberSemantics) {
    assert.equal(semantics.role, expected.role, "scrubber must retain scrollbar role");
    assert.equal(semantics.orientation, expected.orientation, "scrubber must remain horizontal");
    assert.equal(semantics.min, expected.value_min, "scrubber minimum must remain zero");
    assert.equal(semantics.max, expected.value_max, "scrubber maximum must remain 100");
    assert.equal(semantics.controlsExists, expected.controls_native_river,
      "scrubber aria-controls must resolve to its native river");
    if (expanded) {
      assert.match(semantics.now || "", /^(?:0|[1-9][0-9]?|100)$/,
        "visible scrubber must expose a numeric current value");
      assert.match(semantics.text || "", /% through .* gallery$/,
        "visible scrubber must expose readable value text");
    }
  }
}

async function createContext(browser, server, fixtureSources, viewport, mobile) {
  const context = await browser.newContext({
    viewport,
    ...(mobile ? {
      screen: viewport,
      isMobile: true,
      hasTouch: true,
    } : {}),
    reducedMotion: "reduce",
    locale: "en-CA",
    timezoneId: "America/Toronto",
  });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === server.origin && fixtureSources[url.pathname]) {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: fixtureSources[url.pathname],
      });
    } else if (url.origin === server.origin) {
      await route.continue();
    } else {
      await route.abort("blockedbyclient");
    }
  });
  await context.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
  });
  return context;
}

async function assertCompactTouchPan(context, page) {
  const river = page.locator('.mms-band[data-band="eviive"] > .mms-river');
  await river.scrollIntoViewIfNeeded();
  const box = await river.boundingBox();
  assert.ok(box, "compact fixture must expose EVIIVE geometry");
  await river.evaluate((element) => { element.scrollLeft = 0; });
  const session = await context.newCDPSession(page);
  const startX = box.x + Math.min(120, box.width / 3);
  const startY = box.y + Math.min(120, box.height / 3);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: startX, y: startY, id: 1 }],
  });
  for (let step = 1; step <= 5; step += 1) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: startX - step * 40, y: startY, id: 1 }],
    });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(500);
  assert.ok(
    await river.evaluate((element) => element.scrollLeft) > 1,
    "compact coarse-pointer drag must move the native river",
  );
}

async function assertExpandedNativeScroll(page) {
  const river = page.locator('.mms-band[data-band="eviive"] > .mms-river');
  await river.scrollIntoViewIfNeeded();
  await river.evaluate((element) => { element.scrollLeft = 0; });
  const box = await river.boundingBox();
  assert.ok(box, "expanded fixture must expose EVIIVE geometry");
  await page.mouse.move(box.x + Math.min(200, box.width / 2), box.y + Math.min(200, box.height / 2));
  await page.mouse.wheel(320, 0);
  await page.waitForTimeout(300);
  assert.ok(
    await river.evaluate((element) => element.scrollLeft) > 1,
    "expanded horizontal wheel input must move the native river",
  );
}

async function assertCleanBrowser(browser, server, fixtureSources, mode) {
  const viewport = CONTRACT.browser_contract.viewports[mode];
  const compact = mode === "compact";
  const context = await createContext(browser, server, fixtureSources, viewport, compact);
  const page = await context.newPage();
  await page.goto(`${server.origin}/test.html`, { waitUntil: "domcontentloaded" });
  await waitForRuntime(page);
  await installAxe(page);
  const state = await readRuntimeState(page);
  assert.equal(state.rivers, CONTRACT.saved_source_contract.total_native_rivers,
    `${mode} fixture must retain all native rivers`);
  assert.equal(state.invalidRivers, 0, `${mode} clean fixture must retain clean native river semantics`);
  assert.equal(state.overflowX, 0, `${mode} clean fixture must retain zero page overflow`);
  assert.equal(state.eviive.overflowX, "auto", `${mode} river must retain native overflow`);
  assert.equal(state.eviive.touchAction, viewport.touch_action,
    `${mode} river touch-action must remain unchanged`);
  assert.ok(state.eviive.scrollRange > 1, `${mode} river must retain horizontal range`);
  assert.equal(state.visibleScrubbers, compact ? 0 : 12,
    `${mode} scrubber visibility must remain unchanged`);
  assertSeparateScrubberSemantics(state, !compact);
  assert.equal((await ariaAllowedAttrNodes(page)).length, 0,
    `${mode} clean fixture must have zero aria-allowed-attr nodes`);
  if (compact) await assertCompactTouchPan(context, page);
  else await assertExpandedNativeScroll(page);
  await context.close();
}

async function assertSerializedNegativeControl(browser, server, fixtureSources, mode) {
  const viewport = CONTRACT.browser_contract.viewports[mode];
  const context = await createContext(browser, server, fixtureSources, viewport, mode === "compact");
  const page = await context.newPage();
  await page.goto(`${server.origin}${SERIALIZED_PATH}`, { waitUntil: "domcontentloaded" });
  await waitForRuntime(page);
  await installAxe(page);
  const state = await readRuntimeState(page);
  const expected = CONTRACT.browser_contract.serialized_contamination_control;
  assert.equal(state.invalidRivers, expected.expected_affected_rivers,
    `${mode} serialized control must reproduce all contaminated rivers`);
  assert.deepEqual(state.invalidBands.sort(), [...CONTRACT.saved_source_contract.scrubber_eligible_bands].sort(),
    `${mode} serialized control must affect only scrubber-eligible rivers`);
  assertSeparateScrubberSemantics(state, mode === "expanded");
  const nodes = await ariaAllowedAttrNodes(page);
  assert.equal(nodes.length, expected.expected_aria_allowed_attr_nodes,
    `${mode} serialized control must reproduce the frozen Axe failure count`);
  await context.close();
}

async function assertSemanticOwnershipNegativeControl(browser, server, fixtureSources, mode) {
  const viewport = CONTRACT.browser_contract.viewports[mode];
  const context = await createContext(browser, server, fixtureSources, viewport, mode === "compact");
  const page = await context.newPage();
  await page.goto(`${server.origin}${SEMANTIC_CONTROL_PATH}`, { waitUntil: "domcontentloaded" });
  await waitForRuntime(page);
  await installAxe(page);
  const state = await readRuntimeState(page);
  const expected = CONTRACT.browser_contract.semantic_ownership_negative_control;
  assert.equal(state.invalidRivers, expected.expected_affected_rivers,
    `${mode} semantic control must expose every prohibited native-river semantic`);
  assertSeparateScrubberSemantics(state, mode === "expanded");
  assert.equal((await ariaAllowedAttrNodes(page)).length, expected.expected_aria_allowed_attr_nodes,
    `${mode} semantic control must reproduce each invalid value-ARIA case`);
  await context.close();
}

assertStaticContracts();
const serializedSource = makeSerializedFixture();
const semanticControlSource = makeScrollbarSemanticFixture();
const fixtureSources = {
  [SERIALIZED_PATH]: serializedSource,
  [SEMANTIC_CONTROL_PATH]: semanticControlSource,
};
const server = await startStaticServer(CARGO_ROOT);
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
  await assertCleanBrowser(browser, server, fixtureSources, "compact");
  await assertCleanBrowser(browser, server, fixtureSources, "expanded");
  await assertSerializedNegativeControl(browser, server, fixtureSources, "compact");
  await assertSerializedNegativeControl(browser, server, fixtureSources, "expanded");
  await assertSemanticOwnershipNegativeControl(browser, server, fixtureSources, "compact");
  await assertSemanticOwnershipNegativeControl(browser, server, fixtureSources, "expanded");
  process.stdout.write("River ARIA source-purity contracts: PASS\n");
} finally {
  await browser.close();
  await server.close();
  clearTimeout(WATCHDOG);
}
