#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { launchAuditBrowser } from "./collector.mjs";
import { PROJECT_ROOT } from "./config.mjs";
import { startStaticServer } from "./server.mjs";

const WATCHDOG_MS = 90_000;
const REPLACEMENT_COUNT = 3;
const TOTAL_GENERATIONS = REPLACEMENT_COUNT + 2;
const SETTLE_MS = 1_650;

function lifecycleProbeInit() {
  const native = {
    addEventListener: EventTarget.prototype.addEventListener,
    removeEventListener: EventTarget.prototype.removeEventListener,
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    setInterval: window.setInterval.bind(window),
    clearInterval: window.clearInterval.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    ResizeObserver: window.ResizeObserver,
    IntersectionObserver: window.IntersectionObserver,
  };

  const listeners = [];
  const timeouts = new Set();
  const intervals = new Set();
  const animationFrames = new Set();
  const resizeObservers = new Set();
  const intersectionObservers = new Set();
  const javascriptErrors = [];
  const mqlPrototype = window.MediaQueryList && window.MediaQueryList.prototype;
  const nativeMqlAddListener = mqlPrototype && mqlPrototype.addListener;
  const nativeMqlRemoveListener = mqlPrototype && mqlPrototype.removeListener;

  function captureValue(options) {
    return typeof options === "boolean" ? options : Boolean(options && options.capture);
  }

  function trackedListenerContext(target) {
    if (target === window || target === document ||
        Boolean(window.MediaQueryList && target instanceof window.MediaQueryList)) {
      return { scope: "global", root: null };
    }
    if (!(target instanceof Element)) return null;
    let root = target.closest(".mms");
    if (!root && target.matches("dialog.mms-panel")) root = document.querySelector(".mms");
    return root ? { scope: "element", root } : null;
  }

  EventTarget.prototype.addEventListener = function addEventListener(type, listener, options) {
    const context = trackedListenerContext(this);
    const once = Boolean(options && typeof options === "object" && options.once);
    // Native once-listeners remove themselves outside the patched removal
    // path and are not long-lived lifecycle resources, so exclude them.
    if (listener && context && !once) {
      const capture = captureValue(options);
      let record = listeners.find((candidate) =>
        candidate.active && candidate.target === this && candidate.type === type &&
        candidate.listener === listener && candidate.capture === capture
      );
      if (!record) {
        record = { target: this, type, listener, capture, active: true, ...context };
        listeners.push(record);
        const signal = options && typeof options === "object" ? options.signal : null;
        if (signal) {
          if (signal.aborted) record.active = false;
          else native.addEventListener.call(signal, "abort", () => { record.active = false; }, { once: true });
        }
      }
    }
    return native.addEventListener.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function removeEventListener(type, listener, options) {
    // Teardown commonly runs after Cargo has detached the old root.  Match
    // records by identity even when the target can no longer be classified
    // through closest('.mms'), otherwise successful removals look like leaks.
    if (listener) {
      const capture = captureValue(options);
      listeners.forEach((record) => {
        if (record.active && record.target === this && record.type === type &&
            record.listener === listener && record.capture === capture) {
          record.active = false;
        }
      });
    }
    return native.removeEventListener.call(this, type, listener, options);
  };

  if (mqlPrototype && typeof nativeMqlAddListener === "function") {
    mqlPrototype.addListener = function addListener(listener) {
      if (listener) {
        let record = listeners.find((candidate) =>
          candidate.active && candidate.target === this && candidate.type === "change" &&
          candidate.listener === listener && candidate.capture === false
        );
        if (!record) listeners.push({
          target: this,
          type: "change",
          listener,
          capture: false,
          active: true,
          scope: "global",
          root: null,
        });
      }
      return nativeMqlAddListener.call(this, listener);
    };
    mqlPrototype.removeListener = function removeListener(listener) {
      listeners.forEach((record) => {
        if (record.active && record.target === this && record.type === "change" &&
            record.listener === listener && record.capture === false) {
          record.active = false;
        }
      });
      return nativeMqlRemoveListener.call(this, listener);
    };
  }

  window.setTimeout = function setTimeout(callback, delay, ...args) {
    if (typeof callback !== "function") return native.setTimeout(callback, delay, ...args);
    let id = 0;
    id = native.setTimeout(function trackedTimeout(...callbackArgs) {
      timeouts.delete(id);
      return callback.apply(this, callbackArgs);
    }, delay, ...args);
    timeouts.add(id);
    return id;
  };
  window.clearTimeout = function clearTimeout(id) {
    timeouts.delete(id);
    return native.clearTimeout(id);
  };

  window.setInterval = function setInterval(callback, delay, ...args) {
    const id = native.setInterval(callback, delay, ...args);
    intervals.add(id);
    return id;
  };
  window.clearInterval = function clearInterval(id) {
    intervals.delete(id);
    return native.clearInterval(id);
  };

  window.requestAnimationFrame = function requestAnimationFrame(callback) {
    let id = 0;
    id = native.requestAnimationFrame((time) => {
      animationFrames.delete(id);
      callback(time);
    });
    animationFrames.add(id);
    return id;
  };
  window.cancelAnimationFrame = function cancelAnimationFrame(id) {
    animationFrames.delete(id);
    return native.cancelAnimationFrame(id);
  };

  function trackedObserver(NativeObserver, activeSet) {
    if (typeof NativeObserver !== "function") return NativeObserver;
    function TrackedObserver(callback) {
      const observer = new NativeObserver(callback);
      const targets = new Set();
      const nativeObserve = observer.observe.bind(observer);
      const nativeUnobserve = typeof observer.unobserve === "function"
        ? observer.unobserve.bind(observer)
        : null;
      const nativeDisconnect = observer.disconnect.bind(observer);
      observer.observe = function observe(target, options) {
        targets.add(target);
        activeSet.add(observer);
        return nativeObserve(target, options);
      };
      if (nativeUnobserve) {
        observer.unobserve = function unobserve(target) {
          targets.delete(target);
          if (!targets.size) activeSet.delete(observer);
          return nativeUnobserve(target);
        };
      }
      observer.disconnect = function disconnect() {
        targets.clear();
        activeSet.delete(observer);
        return nativeDisconnect();
      };
      return observer;
    }
    TrackedObserver.prototype = NativeObserver.prototype;
    Object.setPrototypeOf(TrackedObserver, NativeObserver);
    return TrackedObserver;
  }

  if (native.ResizeObserver) {
    window.ResizeObserver = trackedObserver(native.ResizeObserver, resizeObservers);
  }
  if (native.IntersectionObserver) {
    window.IntersectionObserver = trackedObserver(native.IntersectionObserver, intersectionObservers);
  }

  window.addEventListener("error", (event) => {
    if (event.error || event.message) {
      javascriptErrors.push(String(event.error?.stack || event.error?.message || event.message));
    }
  });
  window.addEventListener("unhandledrejection", (event) => {
    javascriptErrors.push(String(event.reason?.stack || event.reason?.message || event.reason));
  });

  window.__mmsLifecycleProbe = {
    snapshot() {
      const activeListeners = listeners.filter((record) => record.active);
      const currentRoot = document.querySelector(".mms");
      const elementListeners = activeListeners.filter((record) => record.scope === "element");
      const staleElementListeners = elementListeners.filter((record) =>
        record.root !== currentRoot || !record.target?.isConnected
      );
      return {
        timeouts: timeouts.size,
        intervals: intervals.size,
        intersectionObservers: intersectionObservers.size,
        resizeObservers: resizeObservers.size,
        animationFrames: animationFrames.size,
        listeners: activeListeners.length,
        elementListeners: elementListeners.length,
        staleElementListeners: staleElementListeners.length,
        listenerTypes: activeListeners.reduce((result, record) => {
          result[record.type] = (result[record.type] || 0) + 1;
          return result;
        }, {}),
        elementListenerTypes: elementListeners.reduce((result, record) => {
          result[record.type] = (result[record.type] || 0) + 1;
          return result;
        }, {}),
        javascriptErrors: [...javascriptErrors],
      };
    },
  };
}

function withWatchdog(task, timeoutMs) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`runtime root replacement test exceeded ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([task, timeout]).finally(() => clearTimeout(timer));
}

function assertNear(label, actual, expected, tolerance = 1) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label} drifted by more than ${tolerance}px: expected ${expected}, found ${actual}`,
  );
}

const RESOURCE_KEYS = [
  "timeouts",
  "intervals",
  "intersectionObservers",
  "resizeObservers",
  "animationFrames",
  "listeners",
  "elementListeners",
  "staleElementListeners",
];

function assertResourceParity(label, actual, expected) {
  for (const property of RESOURCE_KEYS.filter((name) => !["listeners", "elementListeners"].includes(name))) {
    assert.equal(actual[property], expected[property], `${label}: active ${property} must remain stable`);
  }
  // Blocked Freight video requests can settle and discard media error wiring
  // during the test window.  Allow that single type to decrease, while every
  // other lifecycle-owned listener category must remain exact and totals may
  // never grow.
  assert.ok(actual.listeners <= expected.listeners, `${label}: active listeners must not grow`);
  assert.ok(actual.elementListeners <= expected.elementListeners, `${label}: active element listeners must not grow`);
  assert.ok((actual.listenerTypes.error || 0) <= (expected.listenerTypes.error || 0), `${label}: error listeners must not grow`);
  assert.ok(
    (actual.elementListenerTypes.error || 0) <= (expected.elementListenerTypes.error || 0),
    `${label}: element error listeners must not grow`,
  );
  const withoutMediaError = (types) => Object.fromEntries(
    Object.entries(types).filter(([type]) => type !== "error"),
  );
  assert.deepEqual(
    withoutMediaError(actual.listenerTypes),
    withoutMediaError(expected.listenerTypes),
    `${label}: non-media listener types must remain stable`,
  );
  assert.deepEqual(
    withoutMediaError(actual.elementListenerTypes),
    withoutMediaError(expected.elementListenerTypes),
    `${label}: non-media element listener types must remain stable`,
  );
  assert.equal(actual.staleElementListeners, 0, `${label}: no stale root element listeners may survive`);
}

function assertResourcesDoNotGrow(label, actual, expected) {
  for (const property of RESOURCE_KEYS) {
    assert.ok(
      actual[property] <= expected[property],
      `${label}: active ${property} grew from ${expected[property]} to ${actual[property]}`,
    );
  }
  for (const [type, count] of Object.entries(actual.listenerTypes)) {
    assert.ok(count <= (expected.listenerTypes[type] || 0), `${label}: listener type ${type} grew`);
  }
  for (const [type, count] of Object.entries(actual.elementListenerTypes)) {
    assert.ok(count <= (expected.elementListenerTypes[type] || 0), `${label}: element listener type ${type} grew`);
  }
  assert.equal(actual.staleElementListeners, 0, `${label}: no stale root element listeners may survive`);
}

async function rehydrateSameRoot(page, { bodycopy, runtime, extras, expanded }) {
  const before = await page.evaluate(({ bodycopy: source, runtime: runtimeSource, extras: extrasSource }) => {
    const lifecycle = window.__mmsRuntimeLifecycle;
    const currentRoot = document.querySelector(".mms");
    const currentDialog = document.querySelector("dialog.mms-panel");
    const currentRiver = currentRoot?.querySelector('.mms-band[data-band="touchbaes"] > .mms-river');
    const currentGame = currentRiver?.querySelector('iframe[data-embed-kind="touchbaes"]');
    if (!lifecycle || !currentRoot || !currentDialog || !currentRiver || !currentGame) {
      throw new Error("same-root child rehydration fixture is incomplete");
    }

    const sourceTemplate = document.createElement("template");
    sourceTemplate.innerHTML = source;
    const sourceRoot = sourceTemplate.content.querySelector(".mms");
    const freshDialog = sourceRoot?.querySelector("dialog.mms-panel");
    const freshRiver = sourceRoot?.querySelector('.mms-band[data-band="touchbaes"] > .mms-river');
    const freshGame = freshRiver?.querySelector('iframe[data-embed-kind="touchbaes"]');
    if (!freshDialog || !freshRiver || !freshGame) {
      throw new Error("same-root source children are incomplete");
    }

    const oldOwners = {
      panel: lifecycle.owners.panel,
      home: lifecycle.owners.home,
    };
    const rootIdentity = currentRoot;
    currentDialog.remove();
    currentRoot.appendChild(freshDialog);
    currentRiver.replaceWith(freshRiver);

    const execute = (scriptSource) => {
      const script = document.createElement("script");
      script.textContent = scriptSource;
      document.body.appendChild(script);
      script.remove();
    };
    execute(runtimeSource);

    const extrasTemplate = document.createElement("template");
    extrasTemplate.innerHTML = extrasSource;
    const rig = extrasTemplate.content.querySelector("#mms-tw-rig");
    if (!document.getElementById("mms-tw-rig") && rig) document.body.appendChild(rig.cloneNode(true));
    extrasTemplate.content.querySelectorAll("script").forEach((script) => execute(script.textContent || ""));

    window.__mmsSameRootRehydration = {
      rootIdentity,
      oldDialog: currentDialog,
      oldRiver: currentRiver,
      oldGame: currentGame,
      freshDialog,
      freshRiver,
      freshGame,
      oldOwners,
    };
    if (!window.__mmsRootReplacementOwners) window.__mmsRootReplacementOwners = [];
    if (!window.__mmsRootReplacementOwners.some((generation) =>
      generation.panel === oldOwners.panel && generation.home === oldOwners.home
    )) window.__mmsRootReplacementOwners.push(oldOwners);

    return {
      rootRetained: document.querySelector(".mms") === rootIdentity,
      oldDialogConnected: currentDialog.isConnected,
      oldRiverConnected: currentRiver.isConnected,
      oldGameConnected: currentGame.isConnected,
    };
  }, { bodycopy, runtime, extras });

  assert.equal(before.rootRetained, true, "same-root rehydration must retain the .mms element identity");
  assert.equal(before.oldDialogConnected, false, "same-root rehydration must detach the old dialog");
  assert.equal(before.oldRiverConnected, false, "same-root rehydration must detach the old Touchbaes river");
  assert.equal(before.oldGameConnected, false, "same-root rehydration must detach the old Touchbaes iframe");

  await page.waitForFunction((shouldBeExpanded) => {
    const state = window.__mmsSameRootRehydration;
    const lifecycle = window.__mmsRuntimeLifecycle;
    const currentRoot = document.querySelector(".mms");
    const currentPanel = lifecycle?.owners?.panel;
    const currentHome = lifecycle?.owners?.home;
    const dialog = document.querySelector("dialog.mms-panel");
    const river = currentRoot?.querySelector('.mms-band[data-band="touchbaes"] > .mms-river');
    const game = river?.querySelector('iframe[data-embed-kind="touchbaes"]');
    if (!state || currentRoot !== state.rootIdentity || dialog !== state.freshDialog ||
        river !== state.freshRiver || game !== state.freshGame ||
        currentPanel === state.oldOwners.panel || currentHome === state.oldOwners.home ||
        currentPanel?.root !== currentRoot || currentHome?.root !== currentRoot ||
        currentPanel.active() !== true || currentHome.active() !== true ||
        state.oldOwners.panel.active() !== false || state.oldOwners.home.active() !== false) return false;
    if (shouldBeExpanded && (!dialog.open || dialog.closest(".mms") !== currentRoot ||
        document.querySelectorAll(".mms-river-scrubber").length !== 12)) return false;
    if (!window.__mmsRootReplacementOwners.some((generation) =>
      generation.panel === currentPanel && generation.home === currentHome
    )) window.__mmsRootReplacementOwners.push({ panel: currentPanel, home: currentHome });
    return true;
  }, expanded);
  await page.waitForTimeout(SETTLE_MS);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  if (expanded) {
    const dialog = page.locator("dialog.mms-panel");
    await dialog.locator('[data-theme-set="girly"]').click();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "girly", "rehydrated expanded panel must remain interactive");
    assert.equal(await dialog.evaluate((element) => element.open), true, "rehydrated expanded panel must remain open after selection");
    await dialog.locator('[data-theme-set="white"]').click();
    await page.evaluate(() => {
      const frame = window.__mmsSameRootRehydration.freshGame;
      frame.dataset.gameMeasured = "true";
      frame.style.setProperty("height", "1px", "important");
      frame.dispatchEvent(new Event("load"));
    });
    await page.waitForFunction(() => {
      const frame = window.__mmsSameRootRehydration.freshGame;
      return !frame.dataset.gameMeasured && Math.round(frame.getBoundingClientRect().height) > 1;
    });
  } else {
    await page.evaluate(() => {
      const frame = window.__mmsSameRootRehydration.freshGame;
      const origin = new URL(frame.dataset.mmsSource || frame.getAttribute("data-src") || frame.src, location.href).origin;
      const height = Math.round(frame.getBoundingClientRect().height);
      window.dispatchEvent(new MessageEvent("message", {
        data: {
          __mmsGameSize: 1,
          geometryVersion: 10,
          compact: true,
          height,
          edgeReserve: { left: 24, right: 24, bottom: 24 },
        },
        origin,
        source: frame.contentWindow,
      }));
    });
    await page.waitForFunction(() => window.__mmsSameRootRehydration.freshGame.dataset.gameMeasured === "true");
  }

  await page.waitForTimeout(SETTLE_MS);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return page.evaluate(() => {
    const state = window.__mmsSameRootRehydration;
    const lifecycle = window.__mmsRuntimeLifecycle;
    return {
      rootRetained: document.querySelector(".mms") === state.rootIdentity,
      panelRebound: lifecycle.owners.panel !== state.oldOwners.panel,
      homeRebound: lifecycle.owners.home !== state.oldOwners.home,
      oldPanelInactive: state.oldOwners.panel.active() === false,
      oldHomeInactive: state.oldOwners.home.active() === false,
      dialogCurrent: document.querySelector("dialog.mms-panel") === state.freshDialog,
      riverCurrent: state.rootIdentity.querySelector('.mms-band[data-band="touchbaes"] > .mms-river') === state.freshRiver,
      gameCurrent: state.rootIdentity.querySelector('iframe[data-embed-kind="touchbaes"]') === state.freshGame,
      resources: window.__mmsLifecycleProbe.snapshot(),
    };
  });
}

async function run() {
  let server = null;
  let browser = null;
  try {
    server = await startStaticServer(path.join(PROJECT_ROOT, "cargo"));
    browser = await launchAuditBrowser({
      channel: process.env.MMS_AUDIT_BROWSER_CHANNEL || "chrome",
      executablePath: process.env.MMS_AUDIT_BROWSER_EXECUTABLE || "",
      headed: false,
    });

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
    });
    await context.addInitScript(lifecycleProbeInit);
    await context.route("https://freight.cargo.site/**", (route) => route.abort("blockedbyclient"));

    const pageErrors = [];
    const consoleErrors = [];
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (!/Failed to load resource: net::ERR_BLOCKED_BY_CLIENT/.test(text)) consoleErrors.push(text);
    });
    page.setDefaultTimeout(7_500);

    await page.goto(`${server.origin}/test.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const lifecycle = window.__mmsRuntimeLifecycle;
      const currentRoot = document.querySelector(".mms");
      return lifecycle?.apiVersion === 1 &&
        lifecycle.owners?.panel?.root === currentRoot &&
        lifecycle.owners?.home?.root === currentRoot &&
        lifecycle.owners.panel.active() === true &&
        lifecycle.owners.home.active() === true;
    });
    await page.waitForTimeout(SETTLE_MS);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    const homeSource = await readFile(path.join(PROJECT_ROOT, "cargo/home.html"), "utf8");
    const panelSource = await readFile(path.join(PROJECT_ROOT, "cargo/panel.js"), "utf8");
    const extrasSource = await readFile(path.join(PROJECT_ROOT, "cargo/home-extras.html"), "utf8");

    const initial = await page.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`missing protected layout selector: ${selector}`);
        const bounds = element.getBoundingClientRect();
        return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
      };
      window.__mmsRootReplacementOwners = [{
        panel: window.__mmsRuntimeLifecycle.owners.panel,
        home: window.__mmsRuntimeLifecycle.owners.home,
      }];
      return {
        resources: window.__mmsLifecycleProbe.snapshot(),
        layout: {
          root: rect(".mms"),
          header: rect(".mms-mbar"),
          intro: rect(".mms-intro-wrap"),
          firstBand: rect('.mms-band[data-band="eviive"]'),
          overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
            document.documentElement.clientWidth,
        },
      };
    });

    for (let index = 0; index < REPLACEMENT_COUNT; index += 1) {
      await page.evaluate(({ bodycopy, runtime, extras }) => {
        const oldOwners = window.__mmsRuntimeLifecycle ? {
          panel: window.__mmsRuntimeLifecycle.owners.panel,
          home: window.__mmsRuntimeLifecycle.owners.home,
        } : null;
        const bodyTemplate = document.createElement("template");
        bodyTemplate.innerHTML = bodycopy;
        const freshRoot = bodyTemplate.content.querySelector(".mms");
        const currentRoot = document.querySelector(".mms");
        if (!freshRoot || !currentRoot) throw new Error("root replacement fixture is incomplete");
        currentRoot.replaceWith(freshRoot);

        const execute = (source) => {
          const script = document.createElement("script");
          script.textContent = source;
          document.body.appendChild(script);
          script.remove();
        };
        execute(runtime);

        const extrasTemplate = document.createElement("template");
        extrasTemplate.innerHTML = extras;
        const rig = extrasTemplate.content.querySelector("#mms-tw-rig");
        if (!document.getElementById("mms-tw-rig") && rig) document.body.appendChild(rig.cloneNode(true));
        extrasTemplate.content.querySelectorAll("script").forEach((script) => execute(script.textContent || ""));

        if (!window.__mmsRootReplacementOwners) window.__mmsRootReplacementOwners = [];
        if (oldOwners && !window.__mmsRootReplacementOwners.some((generation) =>
          generation.panel === oldOwners.panel && generation.home === oldOwners.home
        )) window.__mmsRootReplacementOwners.push(oldOwners);
      }, { bodycopy: homeSource, runtime: panelSource, extras: extrasSource });

      await page.waitForFunction((expectedOwners) => {
        const currentRoot = document.querySelector(".mms");
        const lifecycle = window.__mmsRuntimeLifecycle;
        const panel = lifecycle?.owners?.panel;
        const home = lifecycle?.owners?.home;
        if (lifecycle?.apiVersion !== 1 || panel?.root !== currentRoot || home?.root !== currentRoot ||
            panel.active() !== true || home.active() !== true) return false;
        if (!window.__mmsRootReplacementOwners.some((generation) =>
          generation.panel === panel && generation.home === home
        )) window.__mmsRootReplacementOwners.push({ panel, home });
        return window.__mmsRootReplacementOwners.length === expectedOwners;
      }, index + 2);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }

    await page.waitForTimeout(SETTLE_MS);
    const compactBeforeSameRoot = await page.evaluate(() => window.__mmsLifecycleProbe.snapshot());
    assertResourcesDoNotGrow("compact full-root replacements", compactBeforeSameRoot, initial.resources);
    const compactSameRoot = await rehydrateSameRoot(page, {
      bodycopy: homeSource,
      runtime: panelSource,
      extras: extrasSource,
      expanded: false,
    });
    assertResourceParity("compact same-root child rehydration", compactSameRoot.resources, compactBeforeSameRoot);
    await page.waitForTimeout(SETTLE_MS);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    const ownership = await page.evaluate(() => {
      const generations = window.__mmsRootReplacementOwners || [];
      const currentRoot = document.querySelector(".mms");
      const currentPanel = window.__mmsRuntimeLifecycle?.owners?.panel;
      const currentHome = window.__mmsRuntimeLifecycle?.owners?.home;
      return {
        apiVersion: window.__mmsRuntimeLifecycle?.apiVersion || null,
        total: generations.length,
        activePanelOwners: generations.filter((generation) => generation.panel?.active() === true).length,
        activeHomeOwners: generations.filter((generation) => generation.home?.active() === true).length,
        panelActive: generations.map((generation) => generation.panel?.active() === true),
        homeActive: generations.map((generation) => generation.home?.active() === true),
        exposedSignalsAborted: generations.map((generation) => ({
          panel: generation.panel?.signal ? generation.panel.signal.aborted : null,
          home: generation.home?.signal ? generation.home.signal.aborted : null,
        })),
        currentPanelRootMatches: currentPanel?.root === currentRoot,
        currentHomeRootMatches: currentHome?.root === currentRoot,
        currentRootConnected: Boolean(currentRoot?.isConnected),
        roots: document.querySelectorAll(".mms").length,
        dialogs: document.querySelectorAll("dialog.mms-panel").length,
        rigs: document.querySelectorAll("#mms-tw-rig").length,
      };
    });
    assert.equal(ownership.apiVersion, 1, "runtime lifecycle API version must remain explicit");
    assert.equal(ownership.total, TOTAL_GENERATIONS, "every root and same-root runtime generation must be observable");
    assert.equal(ownership.activePanelOwners, 1, "exactly one panel owner must remain active");
    assert.equal(ownership.activeHomeOwners, 1, "exactly one Home owner must remain active");
    assert.deepEqual(
      ownership.panelActive,
      [false, false, false, false, true],
      "every prior panel owner must be inactive and only the current owner may remain active",
    );
    assert.deepEqual(
      ownership.homeActive,
      [false, false, false, false, true],
      "every prior Home owner must be inactive and only the current owner may remain active",
    );
    ownership.exposedSignalsAborted.forEach((generation, index) => {
      const expected = index < TOTAL_GENERATIONS - 1;
      if (generation.panel !== null) assert.equal(generation.panel, expected, "exposed panel signal must match owner activity");
      if (generation.home !== null) assert.equal(generation.home, expected, "exposed Home signal must match owner activity");
    });
    assert.equal(ownership.currentPanelRootMatches, true, "current panel owner must own the current .mms root");
    assert.equal(ownership.currentHomeRootMatches, true, "current Home owner must own the current .mms root");
    assert.equal(ownership.currentRootConnected, true, "current runtime owner root must remain connected");
    assert.equal(ownership.roots, 1, "root replacement must leave exactly one .mms root");
    assert.equal(ownership.dialogs, 1, "root replacement must leave exactly one control-panel dialog");
    assert.equal(ownership.rigs, 1, "root replacement must leave exactly one Touchbaes rig");

    const trigger = page.locator(".mms-menu[data-panel-toggle]");
    const dialog = page.locator("dialog.mms-panel");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false", "compact trigger must start collapsed");
    assert.equal(await dialog.evaluate((element) => element.open), false, "compact dialog must start closed");
    assert.equal(await page.locator("html").getAttribute("data-panel"), null, "compact panel state must start closed");

    await trigger.click();
    assert.equal(await trigger.getAttribute("aria-expanded"), "true", "trigger must expose the open state");
    assert.equal(await dialog.evaluate((element) => element.open), true, "dialog must open with its trigger");
    assert.equal(await page.locator("html").getAttribute("data-panel"), "open", "root panel state must open with dialog");

    await dialog.locator('[data-theme-set="girly"]').click();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "girly", "theme selection must reach the current owner");
    assert.equal(await trigger.getAttribute("aria-expanded"), "true", "theme selection must not collapse the trigger state");
    assert.equal(await dialog.evaluate((element) => element.open), true, "theme selection must not close the dialog");
    assert.equal(await page.locator("html").getAttribute("data-panel"), "open", "theme selection must not clear root panel state");

    await page.keyboard.press("Escape");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false", "Escape must collapse the current trigger");
    assert.equal(await dialog.evaluate((element) => element.open), false, "Escape must close the current dialog");
    assert.equal(await page.locator("html").getAttribute("data-panel"), null, "Escape must clear root panel state");
    assert.equal(await trigger.evaluate((element) => document.activeElement === element), true, "Escape must restore focus to the current trigger");
    await page.waitForTimeout(100);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    const final = await page.evaluate(() => {
      const rect = (selector) => {
        const bounds = document.querySelector(selector).getBoundingClientRect();
        return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
      };
      return {
        resources: window.__mmsLifecycleProbe.snapshot(),
        layout: {
          root: rect(".mms"),
          header: rect(".mms-mbar"),
          intro: rect(".mms-intro-wrap"),
          firstBand: rect('.mms-band[data-band="eviive"]'),
          overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
            document.documentElement.clientWidth,
        },
      };
    });

    for (const selector of ["root", "header", "intro", "firstBand"]) {
      for (const property of ["x", "y", "width", "height"]) {
        assertNear(`${selector}.${property}`, final.layout[selector][property], initial.layout[selector][property]);
      }
    }
    assert.equal(initial.layout.overflowX, 0, "initial compact fixture must have zero page-level horizontal overflow");
    assert.equal(final.layout.overflowX, 0, "root replacement must preserve zero page-level horizontal overflow");

    assertResourceParity("compact post-rehydration behavior", final.resources, compactSameRoot.resources);
    assert.deepEqual(final.resources.javascriptErrors, [], "browser runtime must not report errors or unhandled rejections");
    assert.deepEqual(pageErrors, [], "Playwright must not observe page errors");
    assert.deepEqual(consoleErrors, [], "browser console must remain free of application errors");

    const compactReport = {
      valid: true,
      replacements: REPLACEMENT_COUNT,
      ownership,
      sameRoot: compactSameRoot,
      resources: final.resources,
      protectedLayoutTolerancePx: 1,
      overflowX: final.layout.overflowX,
    };
    await context.close();

    const expandedContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    await expandedContext.addInitScript(lifecycleProbeInit);
    await expandedContext.route("https://freight.cargo.site/**", (route) => route.abort("blockedbyclient"));

    const expandedPageErrors = [];
    const expandedConsoleErrors = [];
    const expandedPage = await expandedContext.newPage();
    expandedPage.on("pageerror", (error) => expandedPageErrors.push(error.stack || error.message));
    expandedPage.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (!/Failed to load resource: net::ERR_BLOCKED_BY_CLIENT/.test(text)) expandedConsoleErrors.push(text);
    });
    expandedPage.setDefaultTimeout(7_500);

    await expandedPage.goto(`${server.origin}/test.html`, { waitUntil: "domcontentloaded" });
    await expandedPage.waitForFunction(() => {
      const lifecycle = window.__mmsRuntimeLifecycle;
      const currentRoot = document.querySelector(".mms");
      return lifecycle?.apiVersion === 1 &&
        lifecycle.owners?.panel?.root === currentRoot &&
        lifecycle.owners?.home?.root === currentRoot &&
        lifecycle.owners.panel.active() === true &&
        lifecycle.owners.home.active() === true &&
        document.querySelectorAll(".mms-river-scrubber").length === 12;
    });
    await expandedPage.waitForTimeout(SETTLE_MS);
    await expandedPage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    const expandedInitial = await expandedPage.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`missing protected expanded layout selector: ${selector}`);
        const bounds = element.getBoundingClientRect();
        return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
      };
      const currentRoot = document.querySelector(".mms");
      const panel = document.querySelector("dialog.mms-panel");
      const scrubbers = Array.from(document.querySelectorAll(".mms-river-scrubber"));
      window.__mmsRootReplacementOwners = [{
        panel: window.__mmsRuntimeLifecycle.owners.panel,
        home: window.__mmsRuntimeLifecycle.owners.home,
      }];
      return {
        resources: window.__mmsLifecycleProbe.snapshot(),
        panel: {
          open: Boolean(panel?.open),
          current: Boolean(panel && panel.closest(".mms") === currentRoot),
        },
        scrubbers: {
          total: scrubbers.length,
          hidden: scrubbers.filter((control) => control.hidden).length,
        },
        layout: {
          root: rect(".mms"),
          rail: rect(".mms-rail"),
          panel: rect("dialog.mms-panel"),
          intro: rect(".mms-intro-wrap"),
          firstBand: rect('.mms-band[data-band="eviive"]'),
          firstScrubber: rect('.mms-band[data-band="eviive"] > .mms-river-scrubber'),
          overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
            document.documentElement.clientWidth,
        },
      };
    });
    assert.equal(expandedInitial.panel.open, true, "expanded desktop panel must start open");
    assert.equal(expandedInitial.panel.current, true, "expanded desktop panel must belong to the current root");
    assert.equal(expandedInitial.scrubbers.total, 12, "expanded desktop must expose exactly 12 river scrubbers");
    assert.equal(expandedInitial.scrubbers.hidden, 0, "all expanded desktop scrubbers must be available");

    for (let index = 0; index < REPLACEMENT_COUNT; index += 1) {
      await expandedPage.evaluate(({ bodycopy, runtime, extras }) => {
        const oldOwners = window.__mmsRuntimeLifecycle ? {
          panel: window.__mmsRuntimeLifecycle.owners.panel,
          home: window.__mmsRuntimeLifecycle.owners.home,
        } : null;
        const bodyTemplate = document.createElement("template");
        bodyTemplate.innerHTML = bodycopy;
        const freshRoot = bodyTemplate.content.querySelector(".mms");
        const currentRoot = document.querySelector(".mms");
        if (!freshRoot || !currentRoot) throw new Error("expanded root replacement fixture is incomplete");
        currentRoot.replaceWith(freshRoot);

        const execute = (source) => {
          const script = document.createElement("script");
          script.textContent = source;
          document.body.appendChild(script);
          script.remove();
        };
        execute(runtime);

        const extrasTemplate = document.createElement("template");
        extrasTemplate.innerHTML = extras;
        const rig = extrasTemplate.content.querySelector("#mms-tw-rig");
        if (!document.getElementById("mms-tw-rig") && rig) document.body.appendChild(rig.cloneNode(true));
        extrasTemplate.content.querySelectorAll("script").forEach((script) => execute(script.textContent || ""));

        if (!window.__mmsRootReplacementOwners) window.__mmsRootReplacementOwners = [];
        if (oldOwners && !window.__mmsRootReplacementOwners.some((generation) =>
          generation.panel === oldOwners.panel && generation.home === oldOwners.home
        )) window.__mmsRootReplacementOwners.push(oldOwners);
      }, { bodycopy: homeSource, runtime: panelSource, extras: extrasSource });

      await expandedPage.waitForFunction((expectedOwners) => {
        const currentRoot = document.querySelector(".mms");
        const lifecycle = window.__mmsRuntimeLifecycle;
        const panel = lifecycle?.owners?.panel;
        const home = lifecycle?.owners?.home;
        const dialog = document.querySelector("dialog.mms-panel");
        if (lifecycle?.apiVersion !== 1 || panel?.root !== currentRoot || home?.root !== currentRoot ||
            panel.active() !== true || home.active() !== true || !dialog?.open ||
            dialog.closest(".mms") !== currentRoot ||
            document.querySelectorAll(".mms-river-scrubber").length !== 12) return false;
        if (!window.__mmsRootReplacementOwners.some((generation) =>
          generation.panel === panel && generation.home === home
        )) window.__mmsRootReplacementOwners.push({ panel, home });
        return window.__mmsRootReplacementOwners.length === expectedOwners;
      }, index + 2);
      await expandedPage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }

    await expandedPage.waitForTimeout(SETTLE_MS);
    const expandedBeforeSameRoot = await expandedPage.evaluate(() => window.__mmsLifecycleProbe.snapshot());
    assertResourcesDoNotGrow("expanded full-root replacements", expandedBeforeSameRoot, expandedInitial.resources);
    const expandedSameRoot = await rehydrateSameRoot(expandedPage, {
      bodycopy: homeSource,
      runtime: panelSource,
      extras: extrasSource,
      expanded: true,
    });
    assertResourceParity("expanded same-root child rehydration", expandedSameRoot.resources, expandedBeforeSameRoot);
    await expandedPage.waitForTimeout(SETTLE_MS);
    await expandedPage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    const expandedOwnership = await expandedPage.evaluate(() => {
      const generations = window.__mmsRootReplacementOwners || [];
      const currentRoot = document.querySelector(".mms");
      const currentPanel = window.__mmsRuntimeLifecycle?.owners?.panel;
      const currentHome = window.__mmsRuntimeLifecycle?.owners?.home;
      const dialog = document.querySelector("dialog.mms-panel");
      return {
        apiVersion: window.__mmsRuntimeLifecycle?.apiVersion || null,
        total: generations.length,
        activePanelOwners: generations.filter((generation) => generation.panel?.active() === true).length,
        activeHomeOwners: generations.filter((generation) => generation.home?.active() === true).length,
        panelActive: generations.map((generation) => generation.panel?.active() === true),
        homeActive: generations.map((generation) => generation.home?.active() === true),
        exposedSignalsAborted: generations.map((generation) => ({
          panel: generation.panel?.signal ? generation.panel.signal.aborted : null,
          home: generation.home?.signal ? generation.home.signal.aborted : null,
        })),
        currentPanelRootMatches: currentPanel?.root === currentRoot,
        currentHomeRootMatches: currentHome?.root === currentRoot,
        currentRootConnected: Boolean(currentRoot?.isConnected),
        panelOpen: Boolean(dialog?.open),
        panelInCurrentRoot: Boolean(dialog && dialog.closest(".mms") === currentRoot),
        roots: document.querySelectorAll(".mms").length,
        dialogs: document.querySelectorAll("dialog.mms-panel").length,
        rigs: document.querySelectorAll("#mms-tw-rig").length,
        scrubbers: document.querySelectorAll(".mms-river-scrubber").length,
        hiddenScrubbers: Array.from(document.querySelectorAll(".mms-river-scrubber"))
          .filter((control) => control.hidden).length,
      };
    });
    assert.equal(expandedOwnership.apiVersion, 1, "expanded runtime lifecycle API version must remain explicit");
    assert.equal(expandedOwnership.total, TOTAL_GENERATIONS, "every expanded root and same-root generation must be observable");
    assert.equal(expandedOwnership.activePanelOwners, 1, "exactly one expanded panel owner must remain active");
    assert.equal(expandedOwnership.activeHomeOwners, 1, "exactly one expanded Home owner must remain active");
    assert.deepEqual(
      expandedOwnership.panelActive,
      [false, false, false, false, true],
      "every prior expanded panel owner must be inactive and only the current owner may remain active",
    );
    assert.deepEqual(
      expandedOwnership.homeActive,
      [false, false, false, false, true],
      "every prior expanded Home owner must be inactive and only the current owner may remain active",
    );
    expandedOwnership.exposedSignalsAborted.forEach((generation, index) => {
      const expected = index < TOTAL_GENERATIONS - 1;
      if (generation.panel !== null) assert.equal(generation.panel, expected, "expanded panel signal must match owner activity");
      if (generation.home !== null) assert.equal(generation.home, expected, "expanded Home signal must match owner activity");
    });
    assert.equal(expandedOwnership.currentPanelRootMatches, true, "expanded panel owner must own the current .mms root");
    assert.equal(expandedOwnership.currentHomeRootMatches, true, "expanded Home owner must own the current .mms root");
    assert.equal(expandedOwnership.currentRootConnected, true, "expanded runtime owner root must remain connected");
    assert.equal(expandedOwnership.panelOpen, true, "expanded desktop panel must remain open after replacements");
    assert.equal(expandedOwnership.panelInCurrentRoot, true, "expanded desktop panel must remain in the current root");
    assert.equal(expandedOwnership.roots, 1, "expanded replacement must leave exactly one .mms root");
    assert.equal(expandedOwnership.dialogs, 1, "expanded replacement must leave exactly one control-panel dialog");
    assert.equal(expandedOwnership.rigs, 1, "expanded replacement must leave exactly one Touchbaes rig");
    assert.equal(expandedOwnership.scrubbers, 12, "expanded replacement must leave exactly 12 current scrubbers");
    assert.equal(expandedOwnership.hiddenScrubbers, 0, "expanded replacement must keep every scrubber available");

    const expandedFinal = await expandedPage.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`missing protected expanded layout selector: ${selector}`);
        const bounds = element.getBoundingClientRect();
        return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
      };
      return {
        resources: window.__mmsLifecycleProbe.snapshot(),
        layout: {
          root: rect(".mms"),
          rail: rect(".mms-rail"),
          panel: rect("dialog.mms-panel"),
          intro: rect(".mms-intro-wrap"),
          firstBand: rect('.mms-band[data-band="eviive"]'),
          firstScrubber: rect('.mms-band[data-band="eviive"] > .mms-river-scrubber'),
          overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
            document.documentElement.clientWidth,
        },
      };
    });

    for (const selector of ["root", "rail", "panel", "intro", "firstBand", "firstScrubber"]) {
      for (const property of ["x", "y", "width", "height"]) {
        assertNear(
          `expanded.${selector}.${property}`,
          expandedFinal.layout[selector][property],
          expandedInitial.layout[selector][property],
        );
      }
    }
    assert.equal(expandedInitial.layout.overflowX, 0, "initial expanded fixture must have zero page-level horizontal overflow");
    assert.equal(expandedFinal.layout.overflowX, 0, "expanded replacement must preserve zero page-level horizontal overflow");

    assertResourceParity("expanded post-rehydration behavior", expandedFinal.resources, expandedSameRoot.resources);

    const eviiveRiver = expandedPage.locator('.mms-band[data-band="eviive"] > .mms-river');
    await eviiveRiver.hover({ position: { x: 40, y: 40 } });
    const riverBefore = await eviiveRiver.evaluate((river) => {
      river.scrollLeft = 0;
      const styles = getComputedStyle(river);
      return {
        scrollLeft: river.scrollLeft,
        scrollMax: river.scrollWidth - river.clientWidth,
        overflowX: styles.overflowX,
        touchAction: styles.touchAction,
      };
    });
    assert.ok(riverBefore.scrollMax > 1, "expanded EVIIVE river must have native horizontal scroll range");
    assert.ok(
      riverBefore.overflowX === "auto" || riverBefore.overflowX === "scroll",
      `expanded EVIIVE river must retain native horizontal overflow, found ${riverBefore.overflowX}`,
    );
    await expandedPage.mouse.wheel(Math.min(360, riverBefore.scrollMax), 0);
    await expandedPage.waitForTimeout(140);
    const riverAfter = await eviiveRiver.evaluate((river) => river.scrollLeft);
    assert.ok(riverAfter > riverBefore.scrollLeft + 1, "a native horizontal wheel gesture must move the expanded EVIIVE river");
    await expandedPage.waitForTimeout(240);
    const riverSettled = await eviiveRiver.evaluate((river) => river.scrollLeft);
    assertNear("expanded EVIIVE native river resting position", riverSettled, riverAfter);

    assert.deepEqual(expandedFinal.resources.javascriptErrors, [], "expanded browser runtime must not report errors or unhandled rejections");
    assert.deepEqual(expandedPageErrors, [], "Playwright must not observe expanded page errors");
    assert.deepEqual(expandedConsoleErrors, [], "expanded browser console must remain free of application errors");

    const expandedReport = {
      valid: true,
      viewport: "1440x900",
      replacements: REPLACEMENT_COUNT,
      ownership: expandedOwnership,
      sameRoot: expandedSameRoot,
      scrubbers: expandedOwnership.scrubbers,
      resources: expandedFinal.resources,
      nativeRiver: {
        scrollMax: riverBefore.scrollMax,
        scrollLeftAfterWheel: riverAfter,
        settledScrollLeft: riverSettled,
        overflowX: riverBefore.overflowX,
        touchAction: riverBefore.touchAction,
      },
      protectedLayoutTolerancePx: 1,
      overflowX: expandedFinal.layout.overflowX,
    };

    process.stdout.write(`${JSON.stringify({
      valid: true,
      compact: compactReport,
      expanded: expandedReport,
    }, null, 2)}\n`);
    await expandedContext.close();
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
  }
}

await withWatchdog(run(), WATCHDOG_MS);
