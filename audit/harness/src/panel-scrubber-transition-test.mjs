import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";
import { startStaticServer } from "./server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CARGO_ROOT = path.resolve(HERE, "../../../cargo");
const COMPACT = { width: 1023, height: 844 };
const EXPANDED = { width: 1024, height: 900 };
const EXPECTED_SETTINGS = {
  theme: "girly",
  face: "sans",
  scale: "xl",
  shape: "oval",
};
const watchdog = setTimeout(() => {
  process.stderr.write("Panel/scrubber transition probe: FAIL (90s watchdog)\n");
  process.exit(2);
}, 90000);

function assertNear(label, actual, expected, tolerance = 1) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} +/- ${tolerance}, found ${actual}`,
  );
}

async function settle(page, delay = 60) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  if (delay) await page.waitForTimeout(delay);
}

async function waitForRuntime(page) {
  await page.waitForFunction(() => {
    const root = document.querySelector(".mms");
    const panel = document.querySelector("dialog.mms-panel");
    const lifecycle = window.__mmsRuntimeLifecycle;
    return Boolean(
      root && panel && lifecycle?.owners?.panel?.root === root &&
      lifecycle.owners.panel.active() === true,
    );
  });
  await settle(page, 100);
}

async function pageOverflow(page) {
  return page.evaluate(() => Math.max(
    0,
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
    document.body.scrollWidth - document.documentElement.clientWidth,
  ));
}

async function readSettings(page) {
  return page.evaluate(() => {
    const scales = ["s", "m", "l", "xl"];
    const axes = ["theme", "face", "shape"];
    const pressed = Object.fromEntries(axes.map((axis) => [
      axis,
      Array.from(document.querySelectorAll(`[data-${axis}-set][aria-pressed="true"]`),
        (element) => element.getAttribute(`data-${axis}-set`)),
    ]));
    return {
      root: {
        theme: document.documentElement.getAttribute("data-theme"),
        face: document.documentElement.getAttribute("data-face"),
        scale: document.documentElement.getAttribute("data-scale"),
        shape: document.documentElement.getAttribute("data-shape"),
      },
      stored: {
        theme: localStorage.getItem("mms-theme"),
        face: localStorage.getItem("mms-face"),
        scale: localStorage.getItem("mms-scale"),
        shape: localStorage.getItem("mms-shape"),
      },
      pressed,
      slider: scales[Number(document.getElementById("mms-scale")?.value)] || "",
    };
  });
}

function assertSettings(state, expected, { persisted = true } = {}) {
  assert.deepEqual(state.root, expected, "root setting axes must match the selected state");
  if (persisted) {
    assert.deepEqual(state.stored, expected, "localStorage must match the selected state");
  }
  assert.deepEqual(state.pressed.theme, [expected.theme], "exactly one theme must be pressed");
  assert.deepEqual(state.pressed.face, [expected.face], "exactly one face must be pressed");
  assert.deepEqual(state.pressed.shape, [expected.shape], "exactly one shape must be pressed");
  assert.equal(state.slider, expected.scale, "slider must represent the selected scale");
}

async function readPanelState(page) {
  return page.evaluate(() => {
    const panel = document.querySelector("dialog.mms-panel");
    const trigger = document.querySelector(".mms-menu[data-panel-toggle]");
    return {
      dialogs: document.querySelectorAll("dialog.mms-panel").length,
      open: Boolean(panel?.open),
      parent: panel?.parentElement?.tagName || "",
      inRoot: Boolean(panel?.closest(".mms")),
      rootState: document.documentElement.getAttribute("data-panel"),
      modal: panel?.getAttribute("aria-modal"),
      expanded: trigger?.getAttribute("aria-expanded"),
      label: trigger?.getAttribute("aria-label"),
      activeInsidePanel: Boolean(panel?.contains(document.activeElement)),
      activeFocusVisible: Boolean(document.activeElement?.matches?.(":focus-visible")),
      activeOutlineStyle: document.activeElement
        ? getComputedStyle(document.activeElement).outlineStyle
        : "none",
      activeIsTrigger: document.activeElement === trigger,
      overflowX: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.documentElement.clientWidth,
      ),
    };
  });
}

async function selectSettings(page) {
  const dialog = page.locator("dialog.mms-panel");
  await dialog.locator('[data-theme-set="girly"]').click();
  await dialog.locator('[data-face-set="sans"]').click();
  await dialog.locator('[data-shape-set="oval"]').click();
  const slider = dialog.locator("#mms-scale");
  await slider.focus();
  await slider.press("End");
  await settle(page);
}

async function assertCompactPanelContracts(page) {
  const trigger = page.locator(".mms-menu[data-panel-toggle]");
  const dialog = page.locator("dialog.mms-panel");
  const initial = await readPanelState(page);
  assert.deepEqual(
    {
      dialogs: initial.dialogs,
      open: initial.open,
      parent: initial.parent,
      inRoot: initial.inRoot,
      rootState: initial.rootState,
      modal: initial.modal,
      expanded: initial.expanded,
      label: initial.label,
    },
    {
      dialogs: 1,
      open: false,
      parent: "BODY",
      inRoot: false,
      rootState: null,
      modal: "false",
      expanded: "false",
      label: "open site controls",
    },
    "compact panel must begin as one closed, non-modal body portal",
  );

  await trigger.click();
  await settle(page);
  let opened = await readPanelState(page);
  assert.equal(opened.open, true, "pointer trigger must open the compact panel");
  assert.equal(opened.rootState, "open", "pointer trigger must expose root panel state");
  assert.equal(opened.expanded, "true", "pointer trigger must expose expanded state");
  assert.equal(opened.label, "close site controls", "open trigger label must become a close label");
  /* Native dialog.show() may place DOM focus on its first focusable control.
     Pointer activation must keep that focus visually quiet; keyboard opening
     below remains the path that deliberately exposes focus presentation. */
  assert.equal(opened.activeFocusVisible, false,
    "pointer opening must not expose keyboard focus presentation");
  assert.notEqual(opened.activeOutlineStyle, "dotted",
    "pointer opening must not expose the dotted Arrow-navigation frame");

  await selectSettings(page);
  assertSettings(await readSettings(page), EXPECTED_SETTINGS);
  opened = await readPanelState(page);
  assert.equal(opened.open, true, "theme/face/scale/shape choices must keep the panel open");
  assert.equal(opened.rootState, "open", "setting changes must retain root open state");
  assert.equal(opened.dialogs, 1, "setting changes must not clone the panel");

  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  const panelTopBefore = await dialog.evaluate((element) => element.getBoundingClientRect().top);
  await page.mouse.move(8, 120);
  await page.mouse.wheel(0, 360);
  await settle(page, 100);
  const scrollState = await page.evaluate(() => ({
    y: window.scrollY,
    open: Boolean(document.querySelector("dialog.mms-panel")?.open),
    rootState: document.documentElement.getAttribute("data-panel"),
  }));
  assert.ok(scrollState.y > 1, "background wheel outside the panel must scroll the page");
  assert.equal(scrollState.open, true, "background scrolling must not close the panel");
  assert.equal(scrollState.rootState, "open", "background scrolling must preserve root open state");
  const panelTopAfter = await dialog.evaluate((element) => element.getBoundingClientRect().top);
  assertNear("fixed panel top during background scroll", panelTopAfter, panelTopBefore);

  const outsideParagraph = page.locator(".mms-intro p").first();
  await outsideParagraph.scrollIntoViewIfNeeded();
  await outsideParagraph.click({ position: { x: 3, y: 3 } });
  await settle(page);
  let closed = await readPanelState(page);
  assert.equal(closed.open, false, "an intentional outside tap must close the compact panel");
  assert.equal(closed.rootState, null, "outside tap must clear root panel state");
  assert.equal(closed.expanded, "false", "outside tap must collapse the trigger state");
  assert.equal(closed.activeIsTrigger, false, "outside tap must not synthesize trigger focus restoration");

  await trigger.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("dialog.mms-panel")?.open);
  await page.waitForFunction(() => document.activeElement?.id === "mms-scale");
  opened = await readPanelState(page);
  assert.equal(opened.open, true, "keyboard trigger must open the compact panel");
  assert.equal(opened.activeInsidePanel, true, "keyboard open must transfer focus into the panel");
  await page.keyboard.press("Escape");
  await settle(page);
  closed = await readPanelState(page);
  assert.equal(closed.open, false, "Escape must close the compact panel");
  assert.equal(closed.activeIsTrigger, true, "Escape must restore the originating trigger focus");

  await trigger.click();
  await settle(page);
  await trigger.click();
  await settle(page);
  closed = await readPanelState(page);
  assert.equal(closed.open, false, "the active trigger must close the compact panel");
  assert.equal(closed.rootState, null, "trigger close must clear root panel state");
  assert.equal(await pageOverflow(page), 0, "compact panel interactions must not create page overflow");
}

async function assertShortPanelScroll(page) {
  const trigger = page.locator(".mms-menu[data-panel-toggle]");
  const dialog = page.locator("dialog.mms-panel");
  await page.evaluate(() => window.scrollTo(0, 100));
  await trigger.click();
  await page.setViewportSize({ width: COMPACT.width, height: 180 });
  await settle(page, 100);
  const before = await dialog.evaluate((element) => ({
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    pageY: window.scrollY,
  }));
  assert.ok(before.scrollHeight > before.clientHeight, "short viewport must produce internal panel overflow");
  const rect = await dialog.boundingBox();
  assert.ok(rect, "short compact panel must retain geometry");
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.wheel(0, 240);
  await settle(page, 100);
  const after = await dialog.evaluate((element) => ({
    scrollTop: element.scrollTop,
    pageY: window.scrollY,
    open: element.open,
  }));
  assert.ok(after.scrollTop > before.scrollTop, "wheel inside a short panel must scroll the panel internally");
  assertNear("page position during internal panel scroll", after.pageY, before.pageY);
  assert.equal(after.open, true, "internal panel scrolling must not close the panel");
  await page.setViewportSize(COMPACT);
  await settle(page, 100);
  await page.keyboard.press("Escape");
  await settle(page);
}

async function assertCompactRiverPassThrough(page) {
  const river = page.locator('.mms-band[data-band="eviive"] > .mms-river');
  await river.scrollIntoViewIfNeeded();
  await river.hover({ position: { x: 80, y: 80 } });
  await river.evaluate((element) => { element.scrollLeft = 0; });
  await settle(page);
  const beforeHorizontal = await river.evaluate((element) => ({
    left: element.scrollLeft,
    max: element.scrollWidth - element.clientWidth,
    pageY: window.scrollY,
    overflowX: getComputedStyle(element).overflowX,
    touchAction: getComputedStyle(element).touchAction,
  }));
  assert.ok(beforeHorizontal.max > 1, "compact EVIIVE river must have horizontal range");
  assert.equal(beforeHorizontal.overflowX, "auto", "compact river must retain native horizontal overflow");
  assert.equal(beforeHorizontal.touchAction, "pan-x pan-y", "compact river must retain native two-axis panning");
  await page.mouse.wheel(Math.min(320, beforeHorizontal.max), 0);
  await settle(page, 120);
  const afterHorizontal = await river.evaluate((element) => ({
    left: element.scrollLeft,
    pageY: window.scrollY,
  }));
  assert.ok(afterHorizontal.left > beforeHorizontal.left + 1, "horizontal wheel must move the native river");
  assertNear("page position during horizontal river wheel", afterHorizontal.pageY, beforeHorizontal.pageY);

  const beforeVertical = await river.evaluate((element) => ({
    left: element.scrollLeft,
    pageY: window.scrollY,
  }));
  await page.mouse.wheel(0, 260);
  await settle(page, 120);
  const afterVertical = await river.evaluate((element) => ({
    left: element.scrollLeft,
    pageY: window.scrollY,
  }));
  assert.ok(afterVertical.pageY > beforeVertical.pageY + 1, "vertical wheel over a river must scroll the page");
  assertNear("river position during vertical page wheel", afterVertical.left, beforeVertical.left);
  assert.equal(await page.locator("html").getAttribute("data-panel"), null,
    "native river gestures must not open the panel");
}

async function waitForBreakpointState(page, expanded) {
  await page.waitForFunction((expectedExpanded) => {
    const panel = document.querySelector("dialog.mms-panel");
    const controls = Array.from(document.querySelectorAll(".mms-river-scrubber"));
    if (!panel || controls.length !== 12) return false;
    if (expectedExpanded) {
      return panel.open && Boolean(panel.closest(".mms")) &&
        controls.every((control) => !control.hidden);
    }
    return !panel.open && panel.parentElement === document.body &&
      controls.every((control) => control.hidden);
  }, expanded);
  await settle(page, 120);
}

async function readBreakpointState(page) {
  return page.evaluate(() => {
    const panel = document.querySelector("dialog.mms-panel");
    const controls = Array.from(document.querySelectorAll(".mms-river-scrubber"));
    const river = document.querySelector('.mms-band[data-band="eviive"] > .mms-river');
    return {
      panelIdentity: panel?.dataset.transitionProbe,
      panelOpen: Boolean(panel?.open),
      panelParent: panel?.parentElement?.tagName || "",
      panelInRoot: Boolean(panel?.closest(".mms")),
      panelState: document.documentElement.getAttribute("data-panel"),
      triggerExpanded: document.querySelector(".mms-menu[data-panel-toggle]")?.getAttribute("aria-expanded"),
      dialogs: document.querySelectorAll("dialog.mms-panel").length,
      scrubbers: controls.length,
      visibleScrubbers: controls.filter((control) => !control.hidden).length,
      riverTouchAction: getComputedStyle(river).touchAction,
      overflowX: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.documentElement.clientWidth,
      ),
    };
  });
}

async function assertScrubberContracts(page) {
  const scrubber = page.locator('.mms-band[data-band="eviive"] > .mms-river-scrubber');
  const river = page.locator('.mms-band[data-band="eviive"] > .mms-river');
  const description = page.locator('.mms-band[data-band="eviive"] > .mms-desc');
  const thumb = scrubber.locator(".mms-river-scrubber__thumb");
  const art = scrubber.locator(".mms-river-scrubber__thumb-art");
  await scrubber.scrollIntoViewIfNeeded();
  await settle(page, 120);

  const semantics = await scrubber.evaluate((element) => ({
    role: element.getAttribute("role"),
    tabIndex: element.tabIndex,
    orientation: element.getAttribute("aria-orientation"),
    controls: element.getAttribute("aria-controls"),
    min: element.getAttribute("aria-valuemin"),
    max: element.getAttribute("aria-valuemax"),
    now: element.getAttribute("aria-valuenow"),
    text: element.getAttribute("aria-valuetext"),
  }));
  assert.equal(semantics.role, "scrollbar", "scrubber must expose a scrollbar role");
  assert.equal(semantics.tabIndex, 0, "scrubber must remain keyboard focusable");
  assert.equal(semantics.orientation, "horizontal", "scrubber orientation must be horizontal");
  assert.equal(semantics.controls, await river.getAttribute("id"), "scrubber must reference its river");
  assert.equal(semantics.min, "0", "scrubber minimum must be zero");
  assert.equal(semantics.max, "100", "scrubber maximum must be 100");
  assert.ok(Number.isFinite(Number(semantics.now)), "scrubber must expose a numeric current value");
  assert.match(semantics.text || "", /% through .* gallery$/, "scrubber must expose readable value text");

  const [controlRect, descriptionRect] = await Promise.all([
    scrubber.boundingBox(),
    description.boundingBox(),
  ]);
  assert.ok(controlRect && descriptionRect, "scrubber and description must retain geometry");
  assertNear("scrubber left edge", controlRect.x, descriptionRect.x);
  assertNear("scrubber width", controlRect.width, descriptionRect.width);

  await river.evaluate((element) => { element.scrollLeft = 0; });
  await settle(page);
  const refreshedRect = await scrubber.boundingBox();
  assert.ok(refreshedRect, "scrubber must retain geometry before track click");
  await page.mouse.click(
    refreshedRect.x + refreshedRect.width * 0.75,
    refreshedRect.y + refreshedRect.height / 2,
  );
  await settle(page, 100);
  const afterTrack = await river.evaluate((element) => ({
    left: element.scrollLeft,
    max: element.scrollWidth - element.clientWidth,
  }));
  assert.ok(afterTrack.left > 1, "primary track click must advance the river");
  const trackAria = await scrubber.evaluate((element) => ({
    now: Number(element.getAttribute("aria-valuenow")),
    text: element.getAttribute("aria-valuetext"),
    focused: document.activeElement === element,
  }));
  assert.ok(trackAria.now > 0 && trackAria.now <= 100, "track click must update aria-valuenow");
  assert.match(trackAria.text || "", new RegExp(`^${trackAria.now}% through `),
    "aria-valuetext must agree with aria-valuenow");
  assert.equal(trackAria.focused, false, "pointer track click must not retain keyboard focus");

  const beforeSecondary = afterTrack.left;
  await page.mouse.click(
    refreshedRect.x + refreshedRect.width * 0.2,
    refreshedRect.y + refreshedRect.height / 2,
    { button: "right" },
  );
  await settle(page);
  assertNear("secondary track click", await river.evaluate((element) => element.scrollLeft), beforeSecondary);

  const thumbRect = await thumb.boundingBox();
  assert.ok(thumbRect, "scrubber thumb must retain geometry");
  await page.mouse.move(thumbRect.x + thumbRect.width / 2, thumbRect.y + thumbRect.height / 2);
  await page.mouse.down();
  await settle(page, 0);
  const draggingStyle = await art.evaluate((element) => {
    const control = element.closest(".mms-river-scrubber");
    const style = getComputedStyle(element);
    return {
      dragging: control.classList.contains("is-dragging"),
      background: style.backgroundColor,
      border: style.borderTopColor,
    };
  });
  assert.equal(draggingStyle.dragging, true, "thumb pointerdown must enter dragging state");
  assert.equal(draggingStyle.background, draggingStyle.border,
    "dragging artwork fill must meet its border without a transparent halo");
  const beforeDrag = await river.evaluate((element) => element.scrollLeft);
  await page.mouse.move(thumbRect.x + thumbRect.width / 2 + 100, thumbRect.y + thumbRect.height / 2);
  await settle(page, 0);
  const duringDrag = await river.evaluate((element) => element.scrollLeft);
  assert.ok(Math.abs(duringDrag - beforeDrag) > 1, "thumb drag must move the river proportionally");
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await settle(page, 100);
  const restingStyle = await art.evaluate((element) => {
    const control = element.closest(".mms-river-scrubber");
    const style = getComputedStyle(element);
    return {
      dragging: control.classList.contains("is-dragging"),
      height: style.height,
      borderWidth: style.borderTopWidth,
      background: style.backgroundColor,
      pageBackground: getComputedStyle(document.querySelector(".mms")).backgroundColor,
    };
  });
  assert.equal(restingStyle.dragging, false, "pointerup must leave dragging state");
  assert.equal(restingStyle.height, "8px", "mouse leave must restore the 8px resting artwork");
  assert.equal(restingStyle.borderWidth, "1px", "mouse leave must restore the 1px resting border");
  assert.equal(restingStyle.background, restingStyle.pageBackground,
    "mouse leave must restore the page-color resting fill");
  const settledLeft = await river.evaluate((element) => element.scrollLeft);
  await page.waitForTimeout(240);
  assertNear("post-drag resting river", await river.evaluate((element) => element.scrollLeft), settledLeft);

  await scrubber.focus();
  await river.evaluate((element) => { element.scrollLeft = 0; });
  await settle(page);
  const pageY = await page.evaluate(() => window.scrollY);
  await page.keyboard.press("ArrowRight");
  await settle(page);
  const arrowRight = await river.evaluate((element) => element.scrollLeft);
  assert.ok(arrowRight > 1, "ArrowRight must advance the scrubber river");
  await page.keyboard.press("ArrowLeft");
  await settle(page);
  const arrowLeft = await river.evaluate((element) => element.scrollLeft);
  assert.ok(arrowLeft < arrowRight, "ArrowLeft must reverse the scrubber river");
  await page.keyboard.press("PageDown");
  await settle(page);
  const pageDown = await river.evaluate((element) => element.scrollLeft);
  assert.ok(pageDown > arrowLeft, "PageDown must advance by a page-sized step");
  await page.keyboard.press("PageUp");
  await settle(page);
  assert.ok(await river.evaluate((element) => element.scrollLeft) < pageDown,
    "PageUp must reverse by a page-sized step");
  await page.keyboard.press("End");
  await settle(page);
  const end = await river.evaluate((element) => ({
    left: element.scrollLeft,
    max: element.scrollWidth - element.clientWidth,
  }));
  assertNear("End scrubber position", end.left, end.max);
  assert.equal(await scrubber.getAttribute("aria-valuenow"), "100", "End must expose 100 percent");
  await page.keyboard.press("Home");
  await settle(page);
  assertNear("Home scrubber position", await river.evaluate((element) => element.scrollLeft), 0);
  assert.equal(await scrubber.getAttribute("aria-valuenow"), "0", "Home must expose zero percent");
  const beforeUnrelated = await river.evaluate((element) => element.scrollLeft);
  await page.keyboard.press("a");
  await settle(page);
  assertNear("unrelated scrubber key", await river.evaluate((element) => element.scrollLeft), beforeUnrelated);
  assertNear("page position during scrubber keyboard use", await page.evaluate(() => window.scrollY), pageY);
}

async function assertBreakpointTransitions(page) {
  const trigger = page.locator(".mms-menu[data-panel-toggle]");
  await page.evaluate(() => {
    document.querySelector("dialog.mms-panel").dataset.transitionProbe = "same-dialog";
    window.scrollTo(0, 0);
  });
  await trigger.click();
  await settle(page);

  await page.setViewportSize(EXPANDED);
  await waitForBreakpointState(page, true);
  let state = await readBreakpointState(page);
  assert.deepEqual(
    {
      panelIdentity: state.panelIdentity,
      panelOpen: state.panelOpen,
      panelInRoot: state.panelInRoot,
      panelState: state.panelState,
      triggerExpanded: state.triggerExpanded,
      dialogs: state.dialogs,
      scrubbers: state.scrubbers,
      visibleScrubbers: state.visibleScrubbers,
      overflowX: state.overflowX,
    },
    {
      panelIdentity: "same-dialog",
      panelOpen: true,
      panelInRoot: true,
      panelState: null,
      triggerExpanded: "false",
      dialogs: 1,
      scrubbers: 12,
      visibleScrubbers: 12,
      overflowX: 0,
    },
    "1024px must restore the same native-open panel and all 12 scrubbers",
  );
  assertSettings(await readSettings(page), EXPECTED_SETTINGS);
  await assertScrubberContracts(page);

  await page.setViewportSize(COMPACT);
  await waitForBreakpointState(page, false);
  state = await readBreakpointState(page);
  assert.deepEqual(
    {
      panelIdentity: state.panelIdentity,
      panelOpen: state.panelOpen,
      panelParent: state.panelParent,
      panelState: state.panelState,
      triggerExpanded: state.triggerExpanded,
      dialogs: state.dialogs,
      scrubbers: state.scrubbers,
      visibleScrubbers: state.visibleScrubbers,
      riverTouchAction: state.riverTouchAction,
      overflowX: state.overflowX,
    },
    {
      panelIdentity: "same-dialog",
      panelOpen: false,
      panelParent: "BODY",
      panelState: null,
      triggerExpanded: "false",
      dialogs: 1,
      scrubbers: 12,
      visibleScrubbers: 0,
      riverTouchAction: "pan-x pan-y",
      overflowX: 0,
    },
    "1023px must portal and close the same panel while hiding scrubbers",
  );
  assertSettings(await readSettings(page), EXPECTED_SETTINGS);

  for (let round = 0; round < 2; round += 1) {
    await page.setViewportSize(EXPANDED);
    await waitForBreakpointState(page, true);
    state = await readBreakpointState(page);
    assert.equal(state.dialogs, 1, `expanded transition ${round + 2} must keep one dialog`);
    assert.equal(state.scrubbers, 12, `expanded transition ${round + 2} must keep 12 scrubbers`);
    assert.equal(state.visibleScrubbers, 12, `expanded transition ${round + 2} must show all scrubbers`);
    await page.setViewportSize(COMPACT);
    await waitForBreakpointState(page, false);
    state = await readBreakpointState(page);
    assert.equal(state.dialogs, 1, `compact transition ${round + 2} must keep one dialog`);
    assert.equal(state.scrubbers, 12, `compact transition ${round + 2} must keep 12 scrubbers`);
    assert.equal(state.visibleScrubbers, 0, `compact transition ${round + 2} must hide all scrubbers`);
  }
  assertSettings(await readSettings(page), EXPECTED_SETTINGS);
}

async function assertPersistence(page) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForRuntime(page);
  await page.waitForFunction((expected) => (
    document.documentElement.getAttribute("data-theme") === expected.theme &&
    document.documentElement.getAttribute("data-face") === expected.face &&
    document.documentElement.getAttribute("data-scale") === expected.scale &&
    document.documentElement.getAttribute("data-shape") === expected.shape
  ), EXPECTED_SETTINGS);
  assertSettings(await readSettings(page), EXPECTED_SETTINGS);
  const panel = await readPanelState(page);
  assert.equal(panel.open, false, "persisted compact reload must start with the tray closed");
  assert.equal(panel.parent, "BODY", "persisted compact reload must portal the tray under body");
  assert.equal(panel.rootState, null, "persisted compact reload must not retain open root state");
  assert.equal(panel.dialogs, 1, "persisted compact reload must keep one dialog");
  assert.equal(panel.overflowX, 0, "persisted compact reload must retain zero page overflow");
}

async function assertStorageFailure(browser, server, executablePath) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    locale: "en-CA",
    timezoneId: "America/Toronto",
  });
  await context.route("**/*", async (route) => {
    const origin = new URL(route.request().url()).origin;
    if (origin === server.origin) await route.continue();
    else await route.abort("blockedbyclient");
  });
  await context.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    const nativeGet = Storage.prototype.getItem;
    const nativeSet = Storage.prototype.setItem;
    Storage.prototype.getItem = function auditedGet(key) {
      if (this === window.localStorage && String(key).startsWith("mms-")) {
        throw new DOMException("blocked storage", "SecurityError");
      }
      return nativeGet.call(this, key);
    };
    Storage.prototype.setItem = function auditedSet(key, value) {
      if (this === window.localStorage && String(key).startsWith("mms-")) {
        throw new DOMException("blocked storage", "SecurityError");
      }
      return nativeSet.call(this, key, value);
    };
  });
  const errors = [];
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${server.origin}/test.html`, { waitUntil: "domcontentloaded" });
  await waitForRuntime(page);
  await page.locator(".mms-menu[data-panel-toggle]").click();
  await selectSettings(page);
  const state = await readSettings(page).catch(() => null);
  assert.equal(state, null,
    "the storage-failure probe must confirm direct localStorage reads are blocked");
  const live = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute("data-theme"),
    face: document.documentElement.getAttribute("data-face"),
    scale: document.documentElement.getAttribute("data-scale"),
    shape: document.documentElement.getAttribute("data-shape"),
    open: Boolean(document.querySelector("dialog.mms-panel")?.open),
  }));
  assert.deepEqual(
    { theme: live.theme, face: live.face, scale: live.scale, shape: live.shape },
    EXPECTED_SETTINGS,
    "blocked storage must not prevent in-memory control application",
  );
  assert.equal(live.open, true, "blocked storage must not close the compact panel");
  assert.deepEqual(errors, [], "blocked storage must not surface an uncaught page error");
  await context.close();
}

async function assertRealTouchRiverPassThrough(browser, server) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
    locale: "en-CA",
    timezoneId: "America/Toronto",
  });
  await context.route("**/*", async (route) => {
    const origin = new URL(route.request().url()).origin;
    if (origin === server.origin) await route.continue();
    else await route.abort("blockedbyclient");
  });
  await context.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
  });
  const errors = [];
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${server.origin}/test.html`, { waitUntil: "domcontentloaded" });
  await waitForRuntime(page);
  const river = page.locator('.mms-band[data-band="eviive"] > .mms-river');
  await river.scrollIntoViewIfNeeded();
  const box = await river.boundingBox();
  assert.ok(box, "touch fixture must expose EVIIVE river geometry");
  const session = await context.newCDPSession(page);
  const startX = box.x + Math.min(120, box.width / 3);
  const startY = box.y + Math.min(120, box.height / 3);

  await river.evaluate((element) => { element.scrollLeft = 0; });
  const beforeHorizontal = await river.evaluate((element) => ({
    left: element.scrollLeft,
    pageY: window.scrollY,
    max: element.scrollWidth - element.clientWidth,
    touchAction: getComputedStyle(element).touchAction,
  }));
  assert.ok(beforeHorizontal.max > 1, "touch fixture must retain horizontal river range");
  assert.equal(beforeHorizontal.touchAction, "pan-x pan-y",
    "touch fixture must expose both native pan axes");
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
  const afterHorizontal = await river.evaluate((element) => ({
    left: element.scrollLeft,
    pageY: window.scrollY,
  }));
  assert.ok(afterHorizontal.left > beforeHorizontal.left + 1,
    "a real coarse-pointer horizontal drag must move the native river");
  assertNear("page position during coarse horizontal drag",
    afterHorizontal.pageY, beforeHorizontal.pageY);

  /* Start the vertical arbitration proof from a fresh document so compositor
     momentum from the preceding horizontal flick cannot leak into this axis. */
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForRuntime(page);
  await river.scrollIntoViewIfNeeded();
  const verticalBox = await river.boundingBox();
  assert.ok(verticalBox, "vertical touch fixture must expose river geometry");
  const verticalX = verticalBox.x + Math.min(120, verticalBox.width / 3);
  const verticalY = verticalBox.y + Math.min(120, verticalBox.height / 3);
  await river.evaluate((element) => { element.scrollLeft = 500; });
  const beforeVertical = await river.evaluate((element) => ({
    left: element.scrollLeft,
    pageY: window.scrollY,
  }));
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: verticalX, y: verticalY, id: 2 }],
  });
  for (let step = 1; step <= 5; step += 1) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: verticalX, y: verticalY - step * 40, id: 2 }],
    });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(500);
  const afterVertical = await river.evaluate((element) => ({
    left: element.scrollLeft,
    pageY: window.scrollY,
  }));
  assert.ok(afterVertical.pageY > beforeVertical.pageY + 1,
    "a real coarse-pointer vertical drag over the river must scroll the page");
  assertNear("river position during coarse vertical drag", afterVertical.left, beforeVertical.left, 2);
  assert.equal(await pageOverflow(page), 0, "coarse touch gestures must preserve zero page overflow");
  assert.deepEqual(errors, [], "coarse touch gestures must remain error-free");
  await context.close();
}

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
  const context = await browser.newContext({
    viewport: COMPACT,
    reducedMotion: "reduce",
    locale: "en-CA",
    timezoneId: "America/Toronto",
  });
  await context.route("**/*", async (route) => {
    const origin = new URL(route.request().url()).origin;
    if (origin === server.origin) await route.continue();
    else await route.abort("blockedbyclient");
  });
  await context.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
  });
  const pageErrors = [];
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${server.origin}/test.html`, { waitUntil: "domcontentloaded" });
  await waitForRuntime(page);

  await assertCompactPanelContracts(page);
  await assertShortPanelScroll(page);
  await assertCompactRiverPassThrough(page);
  await assertBreakpointTransitions(page);
  await assertPersistence(page);
  assert.deepEqual(pageErrors, [], "primary interaction probe must not surface page errors");
  await context.close();

  await assertStorageFailure(browser, server, executablePath);
  await assertRealTouchRiverPassThrough(browser, server);
  process.stdout.write("Panel/scrubber transition contracts: PASS\n");
} finally {
  await browser.close();
  await server.close();
  clearTimeout(watchdog);
}
