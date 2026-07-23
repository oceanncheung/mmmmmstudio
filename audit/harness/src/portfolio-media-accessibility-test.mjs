import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";
import { startStaticServer } from "./server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const CARGO_ROOT = path.join(ROOT, "cargo");
const CONTRACT_PATH = path.join(
  ROOT,
  "audit/contracts/portfolio-media-accessibility.json",
);
const CONTRACT = JSON.parse(readFileSync(CONTRACT_PATH, "utf8"));
const WATCHDOG = setTimeout(() => {
  process.stderr.write("Portfolio media accessibility contracts: FAIL (120s watchdog)\n");
  process.exit(2);
}, 120000);

function decodeHtml(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: "\"",
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const radix = entity[1].toLowerCase() === "x" ? 16 : 10;
      const digits = radix === 16 ? entity.slice(2) : entity.slice(1);
      return String.fromCodePoint(Number.parseInt(digits, radix));
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

function parseAttributes(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/\s([^\s=/>]+)(?:="([^"]*)")?/g)) {
    const [, name, value = ""] = match;
    assert.equal(
      Object.hasOwn(attributes, name),
      false,
      `duplicate ${name} attribute is forbidden: ${tag.slice(0, 160)}`,
    );
    attributes[name] = decodeHtml(value);
  }
  return attributes;
}

function markupOnly(source) {
  return source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
}

function openingTags(source) {
  return markupOnly(source).match(/<(?!\/|!)[a-z][^>]*>/gi) || [];
}

function mediaOwners(source) {
  return openingTags(source)
    .map((tag) => ({ tag, attributes: parseAttributes(tag) }))
    .filter(({ attributes }) => attributes["data-media-id"])
    .map(({ tag, attributes }) => ({
      tag,
      element: tag.match(/^<([a-z0-9-]+)/i)?.[1]?.toLowerCase() || "",
      ...attributes,
    }));
}

function exactTags(source, element) {
  const pattern = new RegExp(`<${element}\\b[^>]*>`, "gi");
  return (markupOnly(source).match(pattern) || []).map((tag) => ({
    tag,
    attributes: parseAttributes(tag),
  }));
}

function bandBlock(source, band) {
  const marker = `<section class="mms-band" data-band="${band}"`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing ${band} band`);
  const next = source.indexOf('<section class="mms-band"', start + marker.length);
  return source.slice(start, next === -1 ? source.length : next);
}

function assertExactIds(actual, expected, label) {
  assert.equal(actual.length, new Set(actual).size, `${label} must not contain duplicate IDs`);
  assert.deepEqual(actual, expected, `${label} IDs and order must remain exact`);
}

function assertHomeSource(source, label) {
  const owners = mediaOwners(source);
  const decorative = owners.filter(({ "data-a11y-policy": policy }) => policy === "decorative");
  const interactive = owners.filter(({ "data-a11y-policy": policy }) => policy === "interactive");
  const expectedDecorative = CONTRACT.scope.home.decorative_media_ids;
  const expectedInteractive = CONTRACT.scope.home.interactive_iframes;
  const contract = CONTRACT.saved_source_contract;

  assert.equal(owners.length, expectedDecorative.length + expectedInteractive.length,
    `${label}: complete Home media inventory must stay classified`);
  assertExactIds(
    decorative.map(({ "data-media-id": id }) => id),
    expectedDecorative,
    `${label}: decorative Home media`,
  );
  for (const owner of decorative) {
    assert.equal(owner[contract.decorative_policy_attribute], contract.decorative_policy_value,
      `${label}: ${owner["data-media-id"]} must retain decorative policy`);
    assert.equal(owner[contract.decorative_hidden_attribute], contract.decorative_hidden_value,
      `${label}: ${owner["data-media-id"]} must remain absent from the accessibility tree`);
    assert.equal(owner["aria-label"], undefined,
      `${label}: decorative ${owner["data-media-id"]} must not add a duplicate name`);
    assert.equal(owner.title, undefined,
      `${label}: decorative ${owner["data-media-id"]} must not add a title name`);
    assert.equal(owner.tabindex, undefined,
      `${label}: decorative ${owner["data-media-id"]} must not enter sequential focus`);
    assert.equal(owner.contenteditable, undefined,
      `${label}: decorative ${owner["data-media-id"]} must not become editable`);
  }

  assertExactIds(
    interactive.map(({ "data-media-id": id }) => id),
    expectedInteractive.map(({ media_id: id }) => id),
    `${label}: interactive Home media`,
  );
  expectedInteractive.forEach(({ media_id: id, title }) => {
    const owner = interactive.find(({ "data-media-id": mediaId }) => mediaId === id);
    assert.ok(owner, `${label}: missing interactive ${id}`);
    assert.equal(owner.element, "iframe", `${label}: ${id} must remain an iframe`);
    assert.equal(owner[contract.interactive_policy_attribute], contract.interactive_policy_value,
      `${label}: ${id} must retain interactive policy`);
    assert.equal(owner.title, title, `${label}: ${id} title must remain stable`);
    assert.equal(owner["aria-hidden"], undefined, `${label}: ${id} must remain exposed`);
  });

  const images = exactTags(source, "img");
  const videos = exactTags(source, "video");
  assert.equal(images.length, contract.home_decorative_images,
    `${label}: Home image count must remain exact`);
  assert.equal(videos.length, contract.home_decorative_videos,
    `${label}: Home video count must remain exact`);
  images.forEach(({ attributes }, index) => {
    assert.equal(attributes.alt, "", `${label}: decorative image ${index + 1} must use alt=""`);
  });
  videos.forEach(({ attributes }, index) => {
    assert.equal(Object.hasOwn(attributes, "controls"), false,
      `${label}: decorative video ${index + 1} must not expose controls`);
    assert.equal(attributes.tabindex, undefined,
      `${label}: decorative video ${index + 1} must not enter sequential focus`);
    assert.equal(attributes.contenteditable, undefined,
      `${label}: decorative video ${index + 1} must not become editable`);
  });

  const figureLabels = [];
  for (const { band, label: expectedLabel } of CONTRACT.scope.home.project_figures) {
    const figures = exactTags(bandBlock(source, band), "figure")
      .filter(({ attributes }) => (
        (attributes.class || "").split(/\s+/).includes("mms-desc")
      ));
    assert.equal(figures.length, 1, `${label}: ${band} must contain one project figure`);
    assert.equal(figures[0].attributes["aria-label"], expectedLabel,
      `${label}: ${band} project name must remain exact`);
    figureLabels.push(figures[0].attributes["aria-label"]);
  }
  assert.equal(new Set(figureLabels).size, contract.named_project_figures,
    `${label}: project figure names must remain unique`);
  assert.equal(exactTags(source, "figure").length, contract.named_project_figures,
    `${label}: no extra unnamed figure may enter Home`);

  const randomPics = bandBlock(source, CONTRACT.scope.home.unlabelled_interlude_band);
  const randomOpeningTag = randomPics.match(/^<section\b[^>]*>/)?.[0] || "";
  const randomAttributes = parseAttributes(randomOpeningTag);
  assert.equal(randomAttributes["aria-label"], undefined,
    `${label}: Random Pics remains outside the project-labelling decision`);
  assert.equal(randomAttributes["aria-labelledby"], undefined,
    `${label}: Random Pics remains outside the project-labelling decision`);
  assert.equal(exactTags(randomPics, "figure").length, 0,
    `${label}: Random Pics must not gain a project figure under MMS-AUD-007`);

  const headings = openingTags(source).filter((tag) => (
    /^<h[1-6]\b/i.test(tag) || parseAttributes(tag).role === "heading"
  ));
  assert.equal(headings.length, contract.home_headings,
    `${label}: heading hierarchy remains separately gated by MMS-AUD-022`);
}

function assertWhoSource(source, label) {
  const owners = mediaOwners(source);
  const expected = CONTRACT.scope.who.decorative_media_ids;
  const contract = CONTRACT.saved_source_contract;
  assertExactIds(
    owners.map(({ "data-media-id": id }) => id),
    expected,
    `${label}: decorative Who media`,
  );
  owners.forEach((owner) => {
    assert.equal(owner.element, "div", `${label}: ${owner["data-media-id"]} owner remains visual-neutral`);
    assert.equal(owner[contract.decorative_policy_attribute], contract.decorative_policy_value,
      `${label}: ${owner["data-media-id"]} must retain decorative policy`);
    assert.equal(owner[contract.decorative_hidden_attribute], contract.decorative_hidden_value,
      `${label}: ${owner["data-media-id"]} must remain absent from the accessibility tree`);
    assert.equal(owner["aria-label"], undefined,
      `${label}: ${owner["data-media-id"]} must not duplicate the adjacent profile name`);
    assert.equal(owner.tabindex, undefined,
      `${label}: ${owner["data-media-id"]} must not enter sequential focus`);
    assert.equal(owner.contenteditable, undefined,
      `${label}: ${owner["data-media-id"]} must not become editable`);
  });
  const videos = exactTags(source, "video");
  assert.equal(videos.length, contract.who_decorative_videos,
    `${label}: Who profile-video count must remain exact`);
  videos.forEach(({ attributes }, index) => {
    assert.equal(Object.hasOwn(attributes, "controls"), false,
      `${label}: Who decorative video ${index + 1} must not expose controls`);
  });
}

function mutateOnce(source, needle, replacement, label) {
  assert.equal(source.split(needle).length - 1, 1, `${label}: mutation needle must be unique`);
  return source.replace(needle, replacement);
}

function mutateFirst(source, needle, replacement, label) {
  assert.ok(source.includes(needle), `${label}: mutation needle must exist`);
  return source.replace(needle, replacement);
}

function assertStaticContracts() {
  assert.equal(CONTRACT.schema_version, 1, "accessibility contract schema must remain explicit");
  assert.equal(CONTRACT.issue_id, "MMS-AUD-007", "contract must close the audited issue");
  assert.equal(CONTRACT.decision.heading_hierarchy_issue, "MMS-AUD-022",
    "heading semantics must remain outside this batch");
  assert.equal(CONTRACT.scope.home.decorative_media_ids.length, 65,
    "Home must retain exactly 65 decorative image/video items");
  assert.equal(CONTRACT.scope.who.decorative_media_ids.length, 2,
    "Who must retain exactly two decorative profile videos");
  assert.equal(CONTRACT.scope.home.interactive_iframes.length, 3,
    "Home must retain exactly three named interactive embeds");
  assert.equal(CONTRACT.scope.home.project_figures.length, 12,
    "Home must retain exactly twelve named project figures");

  const manifest = JSON.parse(
    readFileSync(path.join(ROOT, CONTRACT.scope.deployment_manifest), "utf8"),
  );
  const homeSemantics = manifest.pages.home.content_semantics;
  const whoSemantics = manifest.pages.who.content_semantics;
  assert.deepEqual(
    homeSemantics.decorative_native_media.media_ids,
    CONTRACT.scope.home.decorative_media_ids,
    "deployment manifest and accessibility contract must agree on decorative Home IDs",
  );
  assert.deepEqual(
    homeSemantics.interactive_embeds.items,
    CONTRACT.scope.home.interactive_iframes,
    "deployment manifest and accessibility contract must agree on iframe titles",
  );
  assert.deepEqual(
    homeSemantics.named_project_figures.items,
    CONTRACT.scope.home.project_figures,
    "deployment manifest and accessibility contract must agree on project names",
  );
  assert.deepEqual(
    whoSemantics.decorative_native_media.media_ids,
    CONTRACT.scope.who.decorative_media_ids,
    "deployment manifest and accessibility contract must agree on decorative Who IDs",
  );

  for (const relative of CONTRACT.scope.canonical_sources.home) {
    assertHomeSource(readFileSync(path.join(ROOT, relative), "utf8"), relative);
  }
  for (const relative of CONTRACT.scope.canonical_sources.who) {
    assertWhoSource(readFileSync(path.join(ROOT, relative), "utf8"), relative);
  }

  const packageJson = JSON.parse(
    readFileSync(path.join(ROOT, "audit/harness/package.json"), "utf8"),
  );
  assert.equal(
    packageJson.scripts["portfolio-media-accessibility-test"],
    "node src/portfolio-media-accessibility-test.mjs",
    "focused proof must retain its npm entrypoint",
  );
  const phase2 = readFileSync(path.join(ROOT, CONTRACT.verification.phase2_script), "utf8");
  assert.equal(
    phase2.split("npm run portfolio-media-accessibility-test").length - 1,
    1,
    "Phase 2 must invoke the portfolio accessibility proof exactly once",
  );

  const home = readFileSync(path.join(ROOT, "cargo/home.template.html"), "utf8");
  assert.throws(
    () => assertHomeSource(
      mutateFirst(home, ' aria-hidden="true" data-a11y-policy="decorative"', ' data-a11y-policy="decorative"', "hidden"),
      "missing-hidden",
    ),
    /must remain absent/,
    "missing aria-hidden negative control must fail closed",
  );
  assert.throws(
    () => assertHomeSource(
      mutateFirst(home, 'alt=""', 'alt="decorative portfolio image"', "image-alt"),
      "named-decorative-image",
    ),
    /must use alt=""/,
    "non-empty decorative image alternative must fail closed",
  );
  assert.throws(
    () => assertHomeSource(
      mutateFirst(
        home,
        'aria-hidden="true" data-a11y-policy="decorative"',
        'aria-hidden="true" tabindex="0" data-a11y-policy="decorative"',
        "focusable-owner",
      ),
      "focusable-decorative-owner",
    ),
    /must not enter sequential focus/,
    "focusable decorative owner negative control must fail closed",
  );
  assert.throws(
    () => assertHomeSource(
      mutateFirst(
        home,
        'aria-hidden="true" data-a11y-policy="decorative"',
        'aria-hidden="true" contenteditable="true" data-a11y-policy="decorative"',
        "editable-owner",
      ),
      "editable-decorative-owner",
    ),
    /must not become editable/,
    "editable decorative owner negative control must fail closed",
  );
  assert.throws(
    () => assertHomeSource(
      mutateFirst(home, '<video autoplay=""', '<video autoplay="" controls=""', "video-controls"),
      "controlled-decorative-video",
    ),
    /must not expose controls/,
    "controlled decorative video negative control must fail closed",
  );
  assert.throws(
    () => assertHomeSource(
      mutateOnce(home, 'title="V7 rotating coffee cup"', 'title="Coffee cup"', "iframe-title"),
      "changed-iframe-title",
    ),
    /title must remain stable/,
    "changed iframe title negative control must fail closed",
  );
  assert.throws(
    () => assertHomeSource(
      mutateOnce(home, '<figure aria-label="EVIIVE"', '<figure aria-label="Eviive project"', "figure-label"),
      "changed-project-label",
    ),
    /project name must remain exact/,
    "changed project name negative control must fail closed",
  );
  assert.throws(
    () => assertHomeSource(
      mutateOnce(
        home,
        '<section class="mms-band" data-band="randompics"',
        '<section class="mms-band" data-band="randompics" aria-label="Random Pics"',
        "random-pics",
      ),
      "labelled-random-pics",
    ),
    /Random Pics remains outside/,
    "Random Pics labelling negative control must fail closed",
  );
  assert.throws(
    () => assertHomeSource(
      mutateOnce(home, '<div class="title-group">EVIIVE', '<h2>EVIIVE</h2><div class="title-group">EVIIVE', "heading"),
      "new-heading",
    ),
    /MMS-AUD-022/,
    "heading negative control must fail closed",
  );
}

async function axNodeForSelector(session, page, selector) {
  const found = await page.evaluate((targetSelector) => {
    const element = document.querySelector(targetSelector);
    element?.scrollIntoView({ block: "center", inline: "center" });
    return Boolean(element);
  }, selector);
  assert.equal(found, true, `browser fixture missing ${selector}`);
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  const { root } = await session.send("DOM.getDocument", { depth: -1, pierce: true });
  const { nodeId } = await session.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector,
  });
  assert.notEqual(nodeId, 0, `browser fixture missing ${selector}`);
  const { node } = await session.send("DOM.describeNode", { nodeId });
  const tree = await session.send("Accessibility.getPartialAXTree", {
    backendNodeId: node.backendNodeId,
    fetchRelatives: false,
  });
  const target = tree.nodes.find(({ backendDOMNodeId }) => (
    backendDOMNodeId === node.backendNodeId
  ));
  assert.ok(target, `accessibility tree missing ${selector}`);
  return target;
}

async function forceDecorativeMediaFailure(page) {
  await page.evaluate(() => {
    for (const owner of document.querySelectorAll(
      '[data-a11y-policy="decorative"][aria-hidden="true"]',
    )) {
      for (const video of owner.querySelectorAll("video")) {
        video.textContent = "Unable to play media.";
        video.dispatchEvent(new Event("error"));
      }
      for (const image of owner.querySelectorAll("img")) {
        image.dispatchEvent(new Event("error"));
      }
    }
  });
}

async function assertNoFocusableDecorativeContent(page, label) {
  const violations = await page.evaluate(() => {
    const results = [];
    const focusableSelector = [
      "a[href]",
      "area[href]",
      "button",
      "input",
      "select",
      "textarea",
      "audio[controls]",
      "video[controls]",
      "[contenteditable]:not([contenteditable=\"false\"])",
      "[tabindex]",
    ].join(",");
    for (const owner of document.querySelectorAll(
      '[data-a11y-policy="decorative"][aria-hidden="true"]',
    )) {
      const candidates = [owner, ...owner.querySelectorAll(focusableSelector)];
      for (const candidate of candidates) {
        const editable = candidate.matches(
          '[contenteditable]:not([contenteditable="false"])',
        );
        const controlledMedia = candidate.matches("audio[controls], video[controls]");
        const sequential = candidate.tabIndex >= 0;
        if (editable || controlledMedia || sequential) {
          results.push({
            mediaId: owner.getAttribute("data-media-id"),
            tag: candidate.tagName.toLowerCase(),
            tabIndex: candidate.tabIndex,
          });
        }
      }
    }
    return results;
  });
  assert.equal(
    violations.length,
    CONTRACT.browser_contract.expected_focusable_decorative_descendants,
    `${label}: aria-hidden decorative media must contain no focusable content: ` +
      JSON.stringify(violations),
  );
}

async function assertBrowserHome(context, page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${context.__mmsOrigin}/test.html`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await forceDecorativeMediaFailure(page);
  await assertNoFocusableDecorativeContent(page, `${viewport.name} Home`);
  const session = await context.newCDPSession(page);
  await session.send("DOM.enable");
  await session.send("Accessibility.enable");

  for (const id of CONTRACT.scope.home.decorative_media_ids) {
    const node = await axNodeForSelector(
      session,
      page,
      `[data-media-id="${id}"]`,
    );
    assert.equal(node.ignored, true,
      `${viewport.name}: decorative ${id} must be ignored after forced failure`);
  }
  for (const { media_id: id, title } of CONTRACT.scope.home.interactive_iframes) {
    const node = await axNodeForSelector(
      session,
      page,
      `:is(iframe[data-media-id="${id}"], [data-media-id="${id}"] iframe)`,
    );
    assert.equal(node.ignored, false, `${viewport.name}: ${id} iframe must be exposed`);
    assert.match((node.role?.value || "").toLowerCase(), /iframe/,
      `${viewport.name}: ${id} must retain iframe semantics`);
    assert.equal(node.name?.value || "", title,
      `${viewport.name}: ${id} accessible name must remain stable`);
  }
  for (const { band, label } of CONTRACT.scope.home.project_figures) {
    const node = await axNodeForSelector(
      session,
      page,
      `.mms-band[data-band="${band}"] figure.mms-desc`,
    );
    assert.equal(node.ignored, false, `${viewport.name}: ${band} figure must be exposed`);
    assert.equal((node.role?.value || "").toLowerCase(), "figure",
      `${viewport.name}: ${band} must retain figure semantics`);
    assert.equal(node.name?.value || "", label,
      `${viewport.name}: ${band} figure name must remain stable`);
  }

  const fullTree = await session.send("Accessibility.getFullAXTree");
  const exposed = fullTree.nodes.filter(({ ignored }) => !ignored);
  assert.equal(
    exposed.some(({ name }) => (
      CONTRACT.browser_contract.forbidden_accessible_names.includes(name?.value)
    )),
    false,
    `${viewport.name}: forced failures must not expose generic fallback names`,
  );
  await session.detach();
}

async function assertBrowserWho(context, page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${context.__mmsOrigin}/who-test.html`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await forceDecorativeMediaFailure(page);
  await assertNoFocusableDecorativeContent(page, `${viewport.name} Who`);
  const session = await context.newCDPSession(page);
  await session.send("DOM.enable");
  await session.send("Accessibility.enable");
  for (const id of CONTRACT.scope.who.decorative_media_ids) {
    const node = await axNodeForSelector(
      session,
      page,
      `[data-media-id="${id}"]`,
    );
    assert.equal(node.ignored, true,
      `${viewport.name}: decorative ${id} profile video must be ignored`);
  }
  const fullTree = await session.send("Accessibility.getFullAXTree");
  assert.equal(
    fullTree.nodes.some(({ ignored, name }) => (
      !ignored && CONTRACT.browser_contract.forbidden_accessible_names.includes(name?.value)
    )),
    false,
    `${viewport.name}: Who forced failures must not expose generic fallback names`,
  );
  await session.detach();
}

async function main() {
  assertStaticContracts();
  const server = await startStaticServer(CARGO_ROOT);
  const executablePath = process.env.MMS_AUDIT_BROWSER_EXECUTABLE ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  try {
    for (const viewport of CONTRACT.browser_contract.viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      context.__mmsOrigin = server.origin;
      await context.route("https://freight.cargo.site/**", (route) => route.abort("failed"));
      const page = await context.newPage();
      await assertBrowserHome(context, page, viewport);
      await assertBrowserWho(context, page, viewport);
      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
  clearTimeout(WATCHDOG);
  process.stdout.write("Portfolio media accessibility contracts: PASS\n");
}

main().catch((error) => {
  clearTimeout(WATCHDOG);
  process.stderr.write(`Portfolio media accessibility contracts: FAIL\n${error.stack || error}\n`);
  process.exitCode = 1;
});
