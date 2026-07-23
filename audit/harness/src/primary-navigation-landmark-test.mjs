import assert from "node:assert/strict";
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
const CONTRACT_PATH = path.join(
  ROOT,
  "audit/contracts/primary-navigation-landmark.json",
);
const CONTRACT = JSON.parse(readFileSync(CONTRACT_PATH, "utf8"));
const AXE_SOURCE = readFileSync(
  path.join(ROOT, "audit/harness/node_modules/axe-core/axe.min.js"),
  "utf8",
);
const CANDIDATE_SELECTOR = "nav.mms-rail, nav.mms-mlinks";
const WATCHDOG = setTimeout(() => {
  process.stderr.write("Primary navigation landmark contracts: FAIL (120s watchdog)\n");
  process.exit(2);
}, 120000);

function closeEnough(actual, expected, label) {
  assert.ok(
    Math.abs(actual - expected) <= CONTRACT.browser_contract.geometry_tolerance_px,
    `${label}: expected ${expected}px ± ` +
      `${CONTRACT.browser_contract.geometry_tolerance_px}px, received ${actual}px`,
  );
}

function assertVector(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label}: vector length must remain stable`);
  actual.forEach((value, index) => closeEnough(value, expected[index], `${label}[${index}]`));
}

function sourceCandidateCounts(source) {
  const tags = source.match(/<(?:nav|aside)\b[^>]*>/gi) || [];
  const exactClasses = (tag) => {
    const match = tag.match(/\sclass="([^"]*)"/i);
    return new Set((match?.[1] || "").trim().split(/\s+/).filter(Boolean));
  };
  const exactLabel = (tag) => tag.match(/\saria-label="([^"]*)"/i)?.[1] || "";
  const records = tags.map((tag) => ({
    tag: tag.match(/^<([a-z]+)/i)?.[1]?.toLowerCase() || "",
    classes: exactClasses(tag),
    label: exactLabel(tag),
  })).filter(({ classes }) => classes.has("mms-rail") || classes.has("mms-mlinks"));
  return {
    records,
    exact: records.filter(({ tag, classes, label }) => (
      tag === "nav" &&
      label === CONTRACT.accessible_name &&
      (classes.has("mms-rail") || classes.has("mms-mlinks"))
    )),
    legacyComplementaryRails: records.filter(({ tag, classes }) => (
      tag === "aside" && classes.has("mms-rail")
    )),
  };
}

function assertStaticContract() {
  assert.equal(CONTRACT.schema_version, 1, "navigation contract schema must remain explicit");
  assert.equal(CONTRACT.issue_id, "MMS-AUD-023", "contract must close the audited issue");
  assert.equal(CONTRACT.accessible_name, "Primary", "primary navigation name must remain exact");
  assert.deepEqual(
    CONTRACT.browser_contract.axe_rules,
    ["aria-allowed-role", "landmark-one-main", "landmark-unique", "region"],
    "semantic regression must retain the complete reviewed Axe rule set",
  );

  for (const [pageName, pageContract] of Object.entries(CONTRACT.scope.pages)) {
    const source = readFileSync(path.join(ROOT, pageContract.path), "utf8");
    const candidates = sourceCandidateCounts(source);
    assert.equal(
      candidates.records.length,
      CONTRACT.browser_contract.expected_dom_candidates,
      `${pageName} must contain exactly two responsive primary-navigation candidates`,
    );
    assert.equal(
      candidates.exact.length,
      CONTRACT.browser_contract.expected_dom_candidates,
      `${pageName} candidates must both be named nav landmarks`,
    );
    assert.equal(
      candidates.legacyComplementaryRails.length,
      0,
      `${pageName} must not serialize a complementary desktop rail`,
    );
  }

  const packageJson = JSON.parse(
    readFileSync(path.join(ROOT, "audit/harness/package.json"), "utf8"),
  );
  assert.equal(
    packageJson.scripts["primary-navigation-test"],
    "node src/primary-navigation-landmark-test.mjs",
    "focused browser proof must retain its npm entrypoint",
  );
  const phase2 = readFileSync(
    path.join(ROOT, CONTRACT.verification.phase2_script),
    "utf8",
  );
  assert.equal(
    phase2.split("npm run primary-navigation-test").length - 1,
    1,
    "Phase 2 must invoke the primary-navigation proof exactly once",
  );
}

async function settle(page) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  await page.waitForTimeout(50);
}

async function installAxe(page) {
  await page.addScriptTag({ content: AXE_SOURCE });
}

async function readAxeViolations(page) {
  return page.evaluate(async (rules) => {
    const results = await window.axe.run(document, {
      runOnly: { type: "rule", values: rules },
    });
    return results.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    }));
  }, CONTRACT.browser_contract.axe_rules);
}

async function readAccessibilityLandmarks(context, page) {
  const session = await context.newCDPSession(page);
  await session.send("Accessibility.enable");
  const tree = await session.send("Accessibility.getFullAXTree");
  await session.detach();
  return tree.nodes
    .filter((node) => !node.ignored)
    .filter((node) => ["navigation", "complementary"].includes(node.role?.value))
    .map((node) => ({
      role: node.role.value,
      name: node.name?.value || "",
    }));
}

async function readNavigationState(context, page, viewportContract) {
  const dom = await page.evaluate(({
    candidateSelector,
    visibleSelector,
    hiddenSelector,
  }) => {
    const candidates = Array.from(document.querySelectorAll(candidateSelector));
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0;
    };
    const visibleLandmarks = candidates.filter(visible);
    const visibleNavigation = document.querySelector(visibleSelector);
    const hiddenNavigation = document.querySelector(hiddenSelector);
    const style = visibleNavigation ? getComputedStyle(visibleNavigation) : null;
    const rect = visibleNavigation?.getBoundingClientRect();
    const railTop = visibleNavigation?.querySelector(".rail-top");
    const railTopStyle = railTop ? getComputedStyle(railTop) : null;
    const railTopRect = railTop?.getBoundingClientRect();
    const serializeRect = (value) => value
      ? [value.x, value.y, value.width, value.height]
      : null;
    return {
      candidateCount: candidates.length,
      visibleCount: visibleLandmarks.length,
      visibleSelectorExists: Boolean(visibleNavigation),
      hiddenSelectorExists: Boolean(hiddenNavigation),
      hiddenSelectorVisible: hiddenNavigation ? visible(hiddenNavigation) : null,
      visibleTag: visibleNavigation?.tagName.toLowerCase() || "",
      visibleLabel: visibleNavigation?.getAttribute("aria-label") || "",
      links: visibleNavigation
        ? Array.from(visibleNavigation.querySelectorAll("a")).map((link) => ({
          name: (link.textContent || "").trim(),
          href: link.getAttribute("href"),
          current: link.getAttribute("aria-current"),
        }))
        : [],
      rect: serializeRect(rect),
      padding: style
        ? [
          parseFloat(style.paddingTop),
          parseFloat(style.paddingRight),
          parseFloat(style.paddingBottom),
          parseFloat(style.paddingLeft),
        ]
        : null,
      railTopRect: serializeRect(railTopRect),
      railTopPosition: railTopStyle?.position || "",
      railTopTop: railTopStyle ? parseFloat(railTopStyle.top) : null,
      railTopZIndex: railTopStyle?.zIndex || "",
      complementaryRails: document.querySelectorAll("aside.mms-rail").length,
    };
  }, {
    candidateSelector: CANDIDATE_SELECTOR,
    visibleSelector: viewportContract.visible_selector,
    hiddenSelector: viewportContract.hidden_selector,
  });
  return {
    dom,
    landmarks: await readAccessibilityLandmarks(context, page),
  };
}

function assertLinkContract(state, pageName, pageContract, mode) {
  const expectedNames = mode === "compact"
    ? CONTRACT.browser_contract.compact_link_names
    : CONTRACT.browser_contract.expanded_link_names;
  assert.deepEqual(
    state.links.map(({ name }) => name),
    expectedNames,
    `${pageName}/${mode} must retain the expected navigation link order`,
  );
  const currentLinks = state.links.filter(({ current }) => current === "page");
  assert.equal(currentLinks.length, 1, `${pageName}/${mode} must expose one current-page link`);
  assert.equal(
    currentLinks[0].href,
    pageContract.current_href,
    `${pageName}/${mode} current-page href must remain exact`,
  );
  assert.equal(
    state.links.filter(({ current }) => current && current !== "page").length,
    0,
    `${pageName}/${mode} must not expose an invalid aria-current value`,
  );
}

function assertGeometry(state, viewportName, viewportContract) {
  const expected = viewportContract.geometry;
  if (viewportContract.mode === "compact") {
    assertVector(state.rect, expected.rect, `${viewportName} compact navigation rect`);
    assertVector(state.padding, expected.padding, `${viewportName} compact navigation padding`);
    return;
  }
  assertVector(
    state.rect.slice(0, 3),
    expected.rail_rect,
    `${viewportName} expanded rail x/y/width`,
  );
  assertVector(
    state.padding,
    expected.rail_padding,
    `${viewportName} expanded rail padding`,
  );
  assertVector(
    state.railTopRect,
    expected.rail_top_rect,
    `${viewportName} expanded rail-top rect`,
  );
  assert.equal(
    state.railTopPosition,
    expected.rail_top_position,
    `${viewportName} rail-top must remain sticky`,
  );
  closeEnough(
    state.railTopTop,
    expected.rail_top_top,
    `${viewportName} rail-top inset`,
  );
  assert.equal(
    state.railTopZIndex,
    expected.rail_top_z_index,
    `${viewportName} rail-top z-index must remain stable`,
  );
}

async function verifyPageMatrix(browser, server) {
  for (const [viewportName, viewportContract] of Object.entries(
    CONTRACT.browser_contract.viewports,
  )) {
    for (const [pageName, pageContract] of Object.entries(CONTRACT.scope.pages)) {
      const context = await browser.newContext({
        viewport: {
          width: viewportContract.width,
          height: viewportContract.height,
        },
        reducedMotion: "reduce",
        locale: "en-CA",
        timezoneId: "America/Toronto",
      });
      const page = await context.newPage();
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === server.origin) {
          await route.continue();
        } else {
          await route.abort();
        }
      });
      await page.goto(`${server.origin}/${path.basename(pageContract.path)}`, {
        waitUntil: "domcontentloaded",
      });
      await settle(page);
      await installAxe(page);
      const { dom, landmarks } = await readNavigationState(
        context,
        page,
        viewportContract,
      );
      assert.equal(
        dom.candidateCount,
        CONTRACT.browser_contract.expected_dom_candidates,
        `${pageName}/${viewportName} must retain two responsive candidates`,
      );
      assert.equal(
        dom.visibleCount,
        CONTRACT.browser_contract.expected_visible_navigation_landmarks,
        `${pageName}/${viewportName} must expose exactly one visible navigation`,
      );
      assert.equal(dom.visibleSelectorExists, true,
        `${pageName}/${viewportName} must contain its visible-mode navigation`);
      assert.equal(dom.hiddenSelectorExists, true,
        `${pageName}/${viewportName} must contain its hidden-mode navigation`);
      assert.equal(dom.hiddenSelectorVisible, false,
        `${pageName}/${viewportName} alternate navigation must remain hidden`);
      assert.equal(dom.visibleTag, "nav",
        `${pageName}/${viewportName} visible candidate must be a nav element`);
      assert.equal(dom.visibleLabel, CONTRACT.accessible_name,
        `${pageName}/${viewportName} visible candidate must be named Primary`);
      assert.equal(dom.complementaryRails, 0,
        `${pageName}/${viewportName} must not retain an aside rail`);
      assertLinkContract(dom, pageName, pageContract, viewportContract.mode);
      assertGeometry(dom, viewportName, viewportContract);

      const navigationLandmarks = landmarks.filter(({ role }) => role === "navigation");
      const complementaryLandmarks = landmarks.filter(({ role }) => role === "complementary");
      assert.equal(
        navigationLandmarks.length,
        CONTRACT.browser_contract.expected_ax_navigation_landmarks,
        `${pageName}/${viewportName} AX tree must expose exactly one navigation landmark`,
      );
      assert.deepEqual(
        navigationLandmarks.map(({ name }) => name),
        [CONTRACT.accessible_name],
        `${pageName}/${viewportName} AX navigation must be named Primary`,
      );
      assert.equal(
        complementaryLandmarks.length,
        CONTRACT.browser_contract.expected_ax_complementary_landmarks,
        `${pageName}/${viewportName} AX tree must contain no complementary rail`,
      );
      assert.deepEqual(
        await readAxeViolations(page),
        [],
        `${pageName}/${viewportName} must have zero reviewed landmark violations`,
      );
      process.stdout.write(`Primary navigation ${pageName}/${viewportName}: PASS\n`);
      await context.close();
    }
  }
}

function writeNegativeFixtures(root) {
  const source = readFileSync(path.join(ROOT, CONTRACT.scope.pages.home.path), "utf8");
  const wrapExpanded = (opening, closing) => source.replace(
    /(<nav aria-label="Primary" class="mms-rail">.*?<\/nav>)/s,
    `${opening}$1${closing}`,
  );
  const mutations = {
    "legacy-aside.html": source.replace(
      '<nav aria-label="Primary" class="mms-rail">',
      '<aside aria-label="Primary" class="mms-rail">',
    ).replace("</nav>", "</aside>"),
    "missing-name.html": source.replace(
      '<nav aria-label="Primary" class="mms-rail">',
      '<nav class="mms-rail">',
    ),
    "wrong-name.html": source.replace(
      '<nav aria-label="Primary" class="mms-rail">',
      '<nav aria-label="Portfolio" class="mms-rail">',
    ),
    "wrong-current.html": source.replace(
      '<a href="/" aria-current="page">Work</a>',
      '<a href="/">Work</a>',
    ),
    "nested-aside.html": wrapExpanded("<aside>", "</aside>"),
    "nested-complementary-role.html": wrapExpanded(
      '<div role="complementary">',
      "</div>",
    ),
    "both-visible.html": `${source}\n<!-- Round 102 dual-visibility negative control -->\n`,
  };
  for (const [filename, fixture] of Object.entries(mutations)) {
    assert.notEqual(fixture, source, `${filename} negative control must mutate canonical Home`);
    writeFileSync(path.join(root, filename), fixture, "utf8");
  }
}

async function verifyNegativeControls(browser, server) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  for (const filename of ["legacy-aside.html", "missing-name.html", "wrong-name.html"]) {
    await page.goto(`${server.origin}/${filename}`, { waitUntil: "domcontentloaded" });
    await settle(page);
    const state = await page.evaluate((label) => {
      const exact = document.querySelectorAll(
        `nav.mms-rail[aria-label="${label}"],nav.mms-mlinks[aria-label="${label}"]`,
      ).length;
      return {
        exact,
        legacy: document.querySelectorAll("aside.mms-rail").length,
      };
    }, CONTRACT.accessible_name);
    assert.ok(
      state.exact !== CONTRACT.browser_contract.expected_dom_candidates || state.legacy !== 0,
      `${filename} must violate the primary-navigation source contract`,
    );
  }

  await page.goto(`${server.origin}/wrong-current.html`, { waitUntil: "domcontentloaded" });
  await settle(page);
  const current = await page.locator(
    'nav.mms-rail[aria-label="Primary"] a[aria-current="page"]',
  ).count();
  assert.equal(current, 0, "wrong-current control must remove expanded current-page state");

  await page.goto(`${server.origin}/legacy-aside.html`, { waitUntil: "domcontentloaded" });
  await settle(page);
  const legacyLandmarks = await readAccessibilityLandmarks(context, page);
  assert.equal(
    legacyLandmarks.filter(({ role }) => role === "complementary").length,
    1,
    "legacy aside control must reproduce complementary landmark ownership",
  );

  for (const filename of ["nested-aside.html", "nested-complementary-role.html"]) {
    await page.goto(`${server.origin}/${filename}`, { waitUntil: "domcontentloaded" });
    await settle(page);
    const nestedLandmarks = await readAccessibilityLandmarks(context, page);
    assert.equal(
      nestedLandmarks.filter(({ role }) => role === "navigation").length,
      1,
      `${filename} must retain the nested navigation landmark`,
    );
    assert.equal(
      nestedLandmarks.filter(({ role }) => role === "complementary").length,
      1,
      `${filename} must reproduce the forbidden complementary wrapper`,
    );
  }

  await page.goto(`${server.origin}/both-visible.html`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await page.addStyleTag({ content: ".mms-mlinks { display:block !important; }" });
  await installAxe(page);
  const duplicateVisible = await page.evaluate(() => (
    Array.from(document.querySelectorAll("nav.mms-rail,nav.mms-mlinks"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return getComputedStyle(element).display !== "none" && rect.width > 0 && rect.height > 0;
      }).length
  ));
  assert.equal(duplicateVisible, 2, "dual-visibility control must expose both candidates");
  const duplicateAxe = await readAxeViolations(page);
  assert.ok(
    duplicateAxe.some(({ id }) => id === "landmark-unique"),
    "dual-visibility control must fail landmark uniqueness",
  );
  await context.close();
  process.stdout.write("Primary navigation negative controls: PASS (7)\n");
}

assertStaticContract();

const cargoServer = await startStaticServer(CARGO_ROOT);
const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "mms-primary-nav-"));
writeNegativeFixtures(fixtureRoot);
const fixtureServer = await startStaticServer(fixtureRoot);
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
  await verifyPageMatrix(browser, cargoServer);
  await verifyNegativeControls(browser, fixtureServer);
  clearTimeout(WATCHDOG);
  process.stdout.write("Primary navigation landmark contracts: PASS\n");
} finally {
  await browser.close();
  await cargoServer.close();
  await fixtureServer.close();
  rmSync(fixtureRoot, { recursive: true, force: true });
}
