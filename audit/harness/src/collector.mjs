import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright-core";

import {
  SCHEMA_VERSION,
  computedStyleProperties,
  computedStyleSelectors,
  settle,
} from "./config.mjs";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const MESSAGE_BINDING = "__mmsAuditRecordMessage";
const NETWORK_PHASES = Object.freeze([
  "startup",
  "scroll-measurement",
  "checkpoint-traversal",
  "post-checkpoint",
]);

export const messageCollectionContract = Object.freeze({
  scope: "Every script-enabled frame reached by BrowserContext.addInitScript and the exposed collector binding.",
  sent: "Successful window.postMessage calls observed through a transparent Proxy that forwards the original receiver and arguments with Reflect.apply.",
  received: "Delivered message events observed independently in each instrumented frame.",
  limitations: Object.freeze([
    "Frames that prohibit script execution cannot be instrumented.",
    "A frame that replaces window.postMessage after initialization can bypass outbound-call capture; delivered message events remain observable where the receiver is instrumented.",
    "Browser-internal messaging, MessagePort traffic, BroadcastChannel traffic, and service-worker messaging are outside the Window.postMessage collector.",
    "Cross-origin WindowProxy access can bypass a page realm's own postMessage wrapper or attribute a call to the target realm; delivered receive records are the authoritative cross-origin evidence.",
    "Payload snapshots are best effort. Transferables and non-cloneable objects may be represented by a type summary so the collector never changes the original transfer list or payload.",
  ]),
});

function percentile(values, percentileValue) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const index = Math.min(ordered.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * ordered.length) - 1));
  return ordered[index];
}

function sanitizeForFile(value) {
  return value.replace(/[^a-z0-9_.-]+/gi, "-").replace(/^-|-$/g, "");
}

function browserObserverInit({ messageBinding }) {
  if (window.__mmsAuditObserverInstalled) return;
  Object.defineProperty(window, "__mmsAuditObserverInstalled", {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  window.__mmsAudit = {
    unhandledRejections: [],
    errors: [],
    messagesReceived: [],
    messagesSent: [],
    layoutShifts: [],
    longTasks: [],
    eventTiming: [],
    largestContentfulPaint: [],
  };

  function safeValue(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      let type = "unknown";
      try { type = Object.prototype.toString.call(value); } catch (typeError) {}
      return { unserializable: true, type };
    }
  }

  function frameRelationship(candidate) {
    try {
      if (candidate === window) return "self";
      if (candidate === window.parent) return "parent";
      if (candidate === window.top) return "top";
      for (let index = 0; index < window.frames.length; index += 1) {
        if (candidate === window.frames[index]) return `child:${index}`;
      }
    } catch (error) {}
    return "other-window";
  }

  function emitMessage(record) {
    try {
      const binding = window[messageBinding];
      if (typeof binding !== "function") return;
      const pending = binding(record);
      if (pending && typeof pending.catch === "function") pending.catch(() => {});
    } catch (error) {}
  }

  if (window.top === window) {
    window.addEventListener("unhandledrejection", (event) => {
      window.__mmsAudit.unhandledRejections.push({
        reason: String(event.reason && (event.reason.stack || event.reason.message || event.reason)),
        time: performance.now(),
      });
    });
    window.addEventListener("error", (event) => {
      window.__mmsAudit.errors.push({
        message: event.message || "resource error",
        source: event.filename || (event.target && (event.target.currentSrc || event.target.src || event.target.href)) || "",
        line: event.lineno || 0,
        column: event.colno || 0,
        time: performance.now(),
      });
    }, true);
  }
  window.addEventListener("message", (event) => {
    const record = {
      direction: "received",
      origin: event.origin,
      sourceRelationship: frameRelationship(event.source),
      data: safeValue(event.data),
      time: performance.now(),
      wallTime: Date.now(),
    };
    window.__mmsAudit.messagesReceived.push(record);
    emitMessage(record);
  });

  const postMessageDescriptor = Object.getOwnPropertyDescriptor(window, "postMessage");
  const nativePostMessage = postMessageDescriptor?.value;
  if (typeof nativePostMessage === "function") {
    const observedPostMessage = new Proxy(nativePostMessage, {
      apply(target, thisArgument, argumentsList) {
        const result = Reflect.apply(target, thisArgument, argumentsList);
        const options = argumentsList[1];
        const record = {
          direction: "sent",
          targetOrigin: typeof options === "string"
            ? options
            : (options && typeof options === "object" && "targetOrigin" in options
                ? String(options.targetOrigin)
                : ""),
          targetRelationship: frameRelationship(thisArgument),
          transferCount: Array.isArray(argumentsList[2])
            ? argumentsList[2].length
            : (options && typeof options === "object" && Array.isArray(options.transfer)
                ? options.transfer.length
                : 0),
          data: safeValue(argumentsList[0]),
          time: performance.now(),
          wallTime: Date.now(),
        };
        window.__mmsAudit.messagesSent.push(record);
        emitMessage(record);
        return result;
      },
    });
    Object.defineProperty(window, "postMessage", {
      ...postMessageDescriptor,
      value: observedPostMessage,
    });
  }

  if (window.top === window && window.PerformanceObserver) {
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__mmsAudit.largestContentfulPaint.push({
            startTime: entry.startTime,
            renderTime: entry.renderTime,
            loadTime: entry.loadTime,
            size: entry.size,
            id: entry.id || "",
            url: entry.url || "",
            element: entry.element ? `${entry.element.tagName.toLowerCase()}${entry.element.id ? `#${entry.element.id}` : ""}` : "",
          });
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch (error) {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__mmsAudit.layoutShifts.push({ value: entry.value, startTime: entry.startTime });
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch (error) {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__mmsAudit.longTasks.push({ duration: entry.duration, startTime: entry.startTime, name: entry.name });
        }
      }).observe({ type: "longtask", buffered: true });
    } catch (error) {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__mmsAudit.eventTiming.push({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            interactionId: entry.interactionId || 0,
          });
        }
      }).observe({ type: "event", buffered: true, durationThreshold: 16 });
    } catch (error) {}
  }
}

function frameDepth(frame) {
  let depth = 0;
  let current = frame;
  while (current?.parentFrame()) {
    depth += 1;
    current = current.parentFrame();
  }
  return depth;
}

export async function installAuditObservers(context, messageTraffic = []) {
  await context.exposeBinding(MESSAGE_BINDING, (source, record) => {
    const frame = source.frame;
    messageTraffic.push({
      ...record,
      observerFrameUrl: frame?.url() || "",
      observerFrameName: frame?.name() || "",
      observerFrameDepth: frame ? frameDepth(frame) : null,
      pageUrl: source.page?.url() || "",
    });
  });
  await context.addInitScript(browserObserverInit, { messageBinding: MESSAGE_BINDING });
  return messageTraffic;
}

async function waitForSettledPage(page) {
  await page.waitForTimeout(settle.initialPaintMs);
  await page.evaluate(async ({ fontTimeoutMs, mediaSettlementMs }) => {
    if (document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, fontTimeoutMs)),
      ]);
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => setTimeout(resolve, mediaSettlementMs));
  }, { fontTimeoutMs: settle.fontTimeoutMs, mediaSettlementMs: settle.mediaSettlementMs });
}

async function applyState(page, state) {
  await page.evaluate((nextState) => {
    const root = document.documentElement;
    for (const [axis, value] of Object.entries(nextState)) {
      root.setAttribute(`data-${axis}`, value);
      try { localStorage.setItem(`mms-${axis}`, value); } catch (error) {}
    }
    document.querySelectorAll("[data-theme-set]").forEach((element) => {
      element.setAttribute("aria-pressed", String(element.getAttribute("data-theme-set") === nextState.theme));
    });
    document.querySelectorAll("[data-face-set]").forEach((element) => {
      element.setAttribute("aria-pressed", String(element.getAttribute("data-face-set") === nextState.face));
    });
    document.querySelectorAll("[data-shape-set]").forEach((element) => {
      element.setAttribute("aria-pressed", String(element.getAttribute("data-shape-set") === nextState.shape));
    });
    const scale = document.querySelector("#mms-scale, .mms-scale input[type=range]");
    if (scale) {
      const values = ["s", "m", "l", "xl"];
      scale.value = String(values.indexOf(nextState.scale));
      scale.setAttribute("aria-valuetext", nextState.scale);
    }
    root.dispatchEvent(new CustomEvent("mms:audit-state", { detail: nextState }));
  }, state);
  await page.waitForTimeout(80);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

export async function collectDomAndGeometry(page) {
  return page.evaluate(({ selectors, properties }) => {
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return {
        x: value.x,
        y: value.y,
        width: value.width,
        height: value.height,
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        left: value.left,
      };
    };
    const styleRecord = (element) => {
      const computed = getComputedStyle(element);
      const styles = {};
      for (const property of properties) styles[property] = computed[property];
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id || "",
        classes: [...element.classList],
        rect: rect(element),
        styles,
      };
    };
    const absoluteUrl = (value) => {
      if (!value) return "";
      try { return new URL(value, document.baseURI).href; } catch (error) { return value || ""; }
    };
    const clippingOverflowValues = new Set(["auto", "clip", "hidden", "scroll"]);
    const selectorHint = (element) => {
      if (element.id) return `#${CSS.escape(element.id)}`;
      const band = element.getAttribute("data-band");
      if (band) return `[data-band="${CSS.escape(band)}"]`;
      const classes = [...element.classList].slice(0, 3).map((value) => `.${CSS.escape(value)}`).join("");
      return `${element.tagName.toLowerCase()}${classes}`;
    };
    const overflowClipRect = (element) => {
      const bounds = element.getBoundingClientRect();
      const scaleX = element.offsetWidth ? bounds.width / element.offsetWidth : 1;
      const scaleY = element.offsetHeight ? bounds.height / element.offsetHeight : 1;
      const left = bounds.left + (element.clientLeft * scaleX);
      const top = bounds.top + (element.clientTop * scaleY);
      return {
        left,
        top,
        right: left + (element.clientWidth * scaleX),
        bottom: top + (element.clientHeight * scaleY),
      };
    };
    const nonAxisAlignedTransform = (element) => {
      const unsupported = [];
      let current = element;
      while (current && current !== document.documentElement) {
        const computed = getComputedStyle(current);
        if (computed.perspective && computed.perspective !== "none") {
          unsupported.push({
            selector: selectorHint(current),
            property: "perspective",
            value: computed.perspective,
          });
        }
        if (computed.transform && computed.transform !== "none") {
          try {
            const matrix = new DOMMatrixReadOnly(computed.transform);
            const axisAligned = matrix.is2D &&
              Math.abs(matrix.b) < 0.0001 &&
              Math.abs(matrix.c) < 0.0001 &&
              matrix.a > 0 &&
              matrix.d > 0;
            if (!axisAligned) {
              unsupported.push({
                selector: selectorHint(current),
                property: "transform",
                value: computed.transform,
              });
            }
          } catch (error) {
            unsupported.push({
              selector: selectorHint(current),
              property: "transform",
              value: computed.transform,
            });
          }
        }
        current = current.parentElement;
      }
      return unsupported;
    };
    const ancestorClipping = (element) => {
      const original = rect(element);
      let visible = {
        left: original.left,
        top: original.top,
        right: original.right,
        bottom: original.bottom,
      };
      const clippingAncestors = [];
      const unsupportedGeometry = [];
      let ancestor = element.parentElement;
      while (ancestor) {
        const computed = getComputedStyle(ancestor);
        const clipsX = clippingOverflowValues.has(computed.overflowX);
        const clipsY = clippingOverflowValues.has(computed.overflowY);
        const owningHorizontalRiver = ancestor.matches(".mms-river") &&
          ["auto", "scroll"].includes(computed.overflowX) &&
          ancestor.scrollWidth > ancestor.clientWidth + 1;
        const applyX = clipsX && !owningHorizontalRiver;
        const applyY = clipsY;
        if (applyX || applyY) {
          for (const reason of nonAxisAlignedTransform(ancestor)) {
            if (!unsupportedGeometry.some((entry) =>
              entry.selector === reason.selector &&
              entry.property === reason.property &&
              entry.value === reason.value
            )) unsupportedGeometry.push(reason);
          }
          const boundary = overflowClipRect(ancestor);
          const before = { ...visible };
          if (applyX) {
            const nextLeft = Math.min(Math.max(visible.left, boundary.left), visible.right);
            const nextRight = Math.max(Math.min(visible.right, boundary.right), nextLeft);
            visible.left = nextLeft;
            visible.right = nextRight;
          }
          if (applyY) {
            const nextTop = Math.min(Math.max(visible.top, boundary.top), visible.bottom);
            const nextBottom = Math.max(Math.min(visible.bottom, boundary.bottom), nextTop);
            visible.top = nextTop;
            visible.bottom = nextBottom;
          }
          const delta = {
            top: Math.max(0, visible.top - before.top),
            right: Math.max(0, before.right - visible.right),
            bottom: Math.max(0, before.bottom - visible.bottom),
            left: Math.max(0, visible.left - before.left),
          };
          if (Object.values(delta).some((value) => value > 0.01)) {
            clippingAncestors.push({
              selector: selectorHint(ancestor),
              tag: ancestor.tagName.toLowerCase(),
              classes: [...ancestor.classList],
              overflowX: computed.overflowX,
              overflowY: computed.overflowY,
              boundary,
              appliedAxes: { x: applyX, y: applyY },
              clippedPixels: delta,
            });
          }
        }
        ancestor = ancestor.parentElement;
      }
      const clippedPixels = {
        top: Math.max(0, visible.top - original.top),
        right: Math.max(0, original.right - visible.right),
        bottom: Math.max(0, original.bottom - visible.bottom),
        left: Math.max(0, visible.left - original.left),
      };
      const exceptionOwner = element.closest("[data-audit-allow-clip]");
      const allowedAxes = (exceptionOwner?.getAttribute("data-audit-allow-clip") || "")
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      const exceptionReason = exceptionOwner?.getAttribute("data-audit-clip-reason")?.trim() || "";
      const allowsX = Boolean(exceptionReason && (allowedAxes.includes("x") || allowedAxes.includes("both")));
      const allowsY = Boolean(exceptionReason && (allowedAxes.includes("y") || allowedAxes.includes("both")));
      const clippedX = clippedPixels.left > 1 || clippedPixels.right > 1;
      const clippedY = clippedPixels.top > 1 || clippedPixels.bottom > 1;
      const hasValidException = Boolean(exceptionReason && exceptionOwner);
      const unsupportedIsAllowed = hasValidException &&
        (allowedAxes.includes("both") || allowedAxes.includes("x") || allowedAxes.includes("y"));
      return {
        visibleRect: {
          x: visible.left,
          y: visible.top,
          width: Math.max(0, visible.right - visible.left),
          height: Math.max(0, visible.bottom - visible.top),
          top: visible.top,
          right: visible.right,
          bottom: visible.bottom,
          left: visible.left,
        },
        clippedPixels,
        retainedWidthRatio: original.width > 0 ? Math.max(0, visible.right - visible.left) / original.width : 1,
        retainedHeightRatio: original.height > 0 ? Math.max(0, visible.bottom - visible.top) / original.height : 1,
        clippingAncestors,
        horizontalRiverScrollportExcluded: true,
        measurementReliable: unsupportedGeometry.length === 0,
        unsupportedGeometry,
        exception: exceptionOwner ? {
          selector: selectorHint(exceptionOwner),
          axes: allowedAxes,
          reason: exceptionReason,
          valid: Boolean(exceptionReason),
        } : null,
        unexpected: (clippedX && !allowsX) ||
          (clippedY && !allowsY) ||
          (unsupportedGeometry.length > 0 && !unsupportedIsAllowed),
      };
    };
    const meta = {};
    document.querySelectorAll("meta[name], meta[property]").forEach((element) => {
      meta[element.getAttribute("name") || element.getAttribute("property")] = element.getAttribute("content") || "";
    });
    const duplicateIds = [...document.querySelectorAll("[id]")]
      .map((element) => element.id)
      .filter((id, index, values) => values.indexOf(id) !== index)
      .filter((id, index, values) => values.indexOf(id) === index);

    const computedStyles = {};
    for (const selector of selectors) {
      computedStyles[selector] = [...document.querySelectorAll(selector)].slice(0, 12).map(styleRecord);
    }

    const doc = document.documentElement;
    const body = document.body;
    const pageOverflowX = Math.max(doc.scrollWidth, body ? body.scrollWidth : 0) - doc.clientWidth;
    const overflowingElements = [...document.querySelectorAll("body *")]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        if (computed.position === "fixed") return false;
        return box.right > doc.clientWidth + 1 || box.left < -1;
      })
      .slice(0, 100)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        id: element.id || "",
        classes: [...element.classList],
        mediaId: element.getAttribute("data-media-id") || "",
        band: element.closest("[data-band]")?.getAttribute("data-band") || "",
        rect: rect(element),
      }));

    const rivers = [...document.querySelectorAll(".mms-river")].map((river) => ({
      band: river.closest("[data-band]")?.getAttribute("data-band") || "",
      id: river.id || "",
      rect: rect(river),
      clientWidth: river.clientWidth,
      scrollWidth: river.scrollWidth,
      clientHeight: river.clientHeight,
      scrollHeight: river.scrollHeight,
      scrollLeft: river.scrollLeft,
      overflowX: getComputedStyle(river).overflowX,
      overflowY: getComputedStyle(river).overflowY,
      touchAction: getComputedStyle(river).touchAction,
    }));

    const media = [...document.querySelectorAll("[data-media-id]")].map((element) => {
      const replaced = element.matches("img, video") ? element : element.querySelector("img, video");
      const sourceValue =
        (replaced && (replaced.currentSrc || replaced.getAttribute("src") || replaced.getAttribute("data-src"))) ||
        element.getAttribute("src") ||
        element.getAttribute("data-src") ||
        "";
      return {
        mediaId: element.getAttribute("data-media-id") || "",
        band: element.closest("[data-band]")?.getAttribute("data-band") || "",
        tag: element.tagName.toLowerCase(),
        shapePolicy: element.getAttribute("data-shape-policy") || "",
        fit: element.getAttribute("data-fit") || "",
        mobileProfile: element.getAttribute("data-mobile-profile") || "",
        rect: rect(element),
        ancestorClipping: ancestorClipping(element),
        naturalWidth: replaced ? (replaced.naturalWidth || replaced.videoWidth || 0) : 0,
        naturalHeight: replaced ? (replaced.naturalHeight || replaced.videoHeight || 0) : 0,
        source: absoluteUrl(sourceValue),
        poster: absoluteUrl(
          (replaced && (replaced.getAttribute("poster") || replaced.getAttribute("data-poster"))) ||
          element.getAttribute("data-poster") ||
          "",
        ),
        complete: replaced && replaced.tagName === "IMG" ? replaced.complete : null,
        readyState: replaced && replaced.tagName === "VIDEO" ? replaced.readyState : null,
        errorCode: replaced && replaced.error ? replaced.error.code : null,
      };
    });

    const mmsRoot = document.querySelector(".mms");
    const pageName = mmsRoot ? (mmsRoot.getAttribute("data-page") || "home") : "";
    const witheredRoots = [...document.querySelectorAll(".mms-writing-withered")];
    const witheredRoot = witheredRoots[0] || null;
    const witheredParagraphs = [...document.querySelectorAll(
      ".mms-writing-withered .mms-writing-plate > p",
    )];
    const witheredParagraphCoverage = witheredParagraphs.map((paragraph) => {
      const directHooks = [...paragraph.children].filter(
        (child) => child.matches('span[uses="eye-roll"]'),
      );
      const outsideText = [...paragraph.childNodes].some((node) => {
        if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim());
        if (node.nodeType !== Node.ELEMENT_NODE) return false;
        if (directHooks.includes(node)) return false;
        return Boolean(node.textContent?.trim());
      });
      return {
        directHookCount: directHooks.length,
        outsideText,
        completeTextCovered: directHooks.length === 1 && !outsideText &&
          paragraph.textContent?.trim() === directHooks[0].textContent?.trim(),
      };
    });
    const witheredDirectEyeRoll = document.querySelectorAll(
      '.mms-writing-withered .mms-writing-plate > p > span[uses="eye-roll"]',
    ).length;
    const witheredAllEyeRoll = document.querySelectorAll(
      '.mms-writing-withered [uses="eye-roll"]',
    ).length;
    const witheredHeadingEyeRoll = document.querySelectorAll(
      '.mms-writing-withered h1 [uses="eye-roll"], .mms-writing-withered h1[uses="eye-roll"]',
    ).length;
    const intentionalDesignContracts = {
      writeWitheredGreenEyeRoll: {
        applicable: pageName === "write" || Boolean(witheredRoot),
        pageName,
        rootCount: witheredRoots.length,
        directParagraphCount: witheredParagraphs.length,
        paragraphCoverage: witheredParagraphCoverage,
        directParagraphHookCount: witheredDirectEyeRoll,
        allHookCount: witheredAllEyeRoll,
        headingHookCount: witheredHeadingEyeRoll,
        expectedCount: 4,
        valid: pageName !== "write" && !witheredRoot ? true : (
          pageName === "write" &&
          witheredRoots.length === 1 &&
          witheredParagraphs.length === 4 &&
          witheredParagraphCoverage.every((paragraph) =>
            paragraph.directHookCount === 1 &&
            paragraph.outsideText === false &&
            paragraph.completeTextCovered === true
          ) &&
          witheredDirectEyeRoll === 4 &&
          witheredAllEyeRoll === 4 &&
          witheredHeadingEyeRoll === 0
        ),
      },
    };

    const controls = [...document.querySelectorAll("a[href], button, input, [role=button], [tabindex]")].map((element) => ({
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role") || "",
      name: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 120) || "",
      href: element instanceof HTMLAnchorElement ? absoluteUrl(element.getAttribute("href")) : "",
      rect: rect(element),
      disabled: Boolean(element.disabled || element.getAttribute("aria-disabled") === "true"),
      tabIndex: element.tabIndex,
    }));

    return {
      document: {
        url: location.href,
        title: document.title,
        lang: doc.lang || "",
        readyState: document.readyState,
        meta,
        canonical: [...document.querySelectorAll('link[rel="canonical"]')].map((element) => absoluteUrl(element.href)),
        runtimeMarkers: {
          panelVersion: window.__mmsPanelVersion || "",
          panelRoots: document.querySelectorAll(".mms").length,
          responsive70: (document.documentElement.innerHTML.match(/responsive-70/g) || []).length,
        },
        rootState: {
          theme: doc.getAttribute("data-theme") || "",
          face: doc.getAttribute("data-face") || "",
          scale: doc.getAttribute("data-scale") || "",
          shape: doc.getAttribute("data-shape") || "",
        },
        controlState: {
          theme: document.querySelector('[data-theme-set][aria-pressed="true"]')?.getAttribute("data-theme-set") || "",
          face: document.querySelector('[data-face-set][aria-pressed="true"]')?.getAttribute("data-face-set") || "",
          scale: ["s", "m", "l", "xl"][Number(document.querySelector("#mms-scale")?.value)] || "",
          shape: document.querySelector('[data-shape-set][aria-pressed="true"]')?.getAttribute("data-shape-set") || "",
        },
        tokens: [
          "--color-bg-page",
          "--color-text-primary",
          "--font-family-base",
          "--font-size-base",
          "--line-height-base",
          "--layout-u",
          "--media-u",
          "--chrome-u",
          "--edge-pad",
        ].reduce((record, token) => {
          record[token] = getComputedStyle(doc).getPropertyValue(token).trim();
          return record;
        }, {}),
        headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((element) => ({
          level: Number(element.tagName.slice(1)),
          text: element.textContent?.trim() || "",
        })),
        links: [...document.querySelectorAll("a[href]")].map((element) => ({
          text: element.textContent?.trim() || "",
          href: absoluteUrl(element.getAttribute("href")),
          target: element.target || "",
          rel: element.rel || "",
        })),
        duplicateIds,
        intentionalDesignContracts,
      },
      computedStyles,
      geometry: {
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        document: {
          clientWidth: doc.clientWidth,
          clientHeight: doc.clientHeight,
          scrollWidth: Math.max(doc.scrollWidth, body ? body.scrollWidth : 0),
          scrollHeight: Math.max(doc.scrollHeight, body ? body.scrollHeight : 0),
          overflowX: pageOverflowX,
        },
        bands: [...document.querySelectorAll("[data-band]")].map((element) => ({
          band: element.getAttribute("data-band") || "",
          rect: rect(element),
        })),
        rivers,
        media,
        unexpectedMediaClipping: media
          .filter((record) => record.ancestorClipping.unexpected)
          .map((record) => ({
            mediaId: record.mediaId,
            band: record.band,
            rect: record.rect,
            ancestorClipping: record.ancestorClipping,
          })),
        controls,
        smallTargets: controls.filter((control) => !control.disabled && (control.rect.width < 44 || control.rect.height < 44)),
        overflowingElements,
      },
    };
  }, { selectors: computedStyleSelectors, properties: computedStyleProperties });
}

async function collectAxe(page, axeSource) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const result = await window.axe.run(document, {
      resultTypes: ["violations", "incomplete", "passes", "inapplicable"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    });
    const compact = (entry) => ({
      id: entry.id,
      impact: entry.impact,
      tags: entry.tags,
      description: entry.description,
      help: entry.help,
      helpUrl: entry.helpUrl,
      nodes: entry.nodes.map((node) => ({
        impact: node.impact,
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary || "",
      })),
    });
    return {
      testEngine: result.testEngine,
      testEnvironment: result.testEnvironment,
      timestamp: result.timestamp,
      url: result.url,
      violations: result.violations.map(compact),
      incomplete: result.incomplete.map(compact),
      counts: {
        violations: result.violations.length,
        incomplete: result.incomplete.length,
        passes: result.passes.length,
        inapplicable: result.inapplicable.length,
      },
    };
  });
}

async function collectAccessibility(cdp) {
  await cdp.send("Accessibility.enable");
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  const compactNodes = nodes.map((node) => ({
    nodeId: node.nodeId,
    ignored: node.ignored,
    role: node.role?.value || "",
    name: node.name?.value || "",
    description: node.description?.value || "",
    value: node.value?.value ?? null,
    properties: (node.properties || []).reduce((record, property) => {
      record[property.name] = property.value?.value ?? null;
      return record;
    }, {}),
    childIds: node.childIds || [],
  }));
  const roleCounts = compactNodes.reduce((counts, node) => {
    const role = node.role || "unknown";
    counts[role] = (counts[role] || 0) + 1;
    return counts;
  }, {});
  return {
    nodeCount: compactNodes.length,
    ignoredCount: compactNodes.filter((node) => node.ignored).length,
    unnamedInteractiveCount: compactNodes.filter((node) =>
      ["button", "link", "slider"].includes(node.role) && !node.name,
    ).length,
    roleCounts,
    nodes: compactNodes,
  };
}

async function measureScrollStability(page) {
  return page.evaluate(async () => {
    async function animate(getValue, setValue, destination, frames = 48) {
      const start = getValue();
      const timestamps = [];
      for (let index = 0; index <= frames; index += 1) {
        await new Promise((resolve) => requestAnimationFrame((timestamp) => {
          timestamps.push(timestamp);
          const progress = index / frames;
          setValue(start + (destination - start) * progress);
          resolve();
        }));
      }
      const deltas = timestamps.slice(1).map((time, index) => time - timestamps[index]);
      return { timestamps, deltas };
    }

    const documentScroller = document.scrollingElement;
    const originalTop = documentScroller.scrollTop;
    const maxTop = Math.max(0, documentScroller.scrollHeight - documentScroller.clientHeight);
    const vertical = await animate(
      () => documentScroller.scrollTop,
      (value) => { documentScroller.scrollTop = value; },
      Math.min(maxTop, 1200),
    );
    documentScroller.scrollTop = originalTop;

    const river = [...document.querySelectorAll(".mms-river")].find((element) => element.scrollWidth > element.clientWidth + 1);
    let horizontal = null;
    if (river) {
      const originalLeft = river.scrollLeft;
      horizontal = await animate(
        () => river.scrollLeft,
        (value) => { river.scrollLeft = value; },
        Math.min(river.scrollWidth - river.clientWidth, 1200),
      );
      river.scrollLeft = originalLeft;
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { vertical, horizontal };
  });
}

function summarizeScroll(raw) {
  const summarize = (record) => {
    if (!record) return null;
    const deltas = record.deltas.filter((value) => Number.isFinite(value) && value >= 0);
    const total = deltas.reduce((sum, value) => sum + value, 0);
    return {
      frames: deltas.length,
      meanFrameMs: deltas.length ? total / deltas.length : null,
      p95FrameMs: percentile(deltas, 95),
      maxFrameMs: deltas.length ? Math.max(...deltas) : null,
      framesOver20Ms: deltas.filter((value) => value > 20).length,
      approximateFps: total > 0 ? (deltas.length * 1000) / total : null,
    };
  };
  return { vertical: summarize(raw.vertical), horizontal: summarize(raw.horizontal) };
}

async function collectPerformance(page, cdp, scrollEnabled, phaseController) {
  const before = await page.evaluate(() => ({
    navigation: performance.getEntriesByType("navigation").map((entry) => entry.toJSON()),
    paint: performance.getEntriesByType("paint").map((entry) => entry.toJSON()),
    largestContentfulPaint: window.__mmsAudit?.largestContentfulPaint || [],
    observers: window.__mmsAudit || {},
    memory: performance.memory ? {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    } : null,
  }));
  let cdpMetrics = [];
  try {
    await cdp.send("Performance.enable");
    cdpMetrics = (await cdp.send("Performance.getMetrics")).metrics;
  } catch (error) {}
  let scroll = null;
  if (scrollEnabled) {
    phaseController?.startScrollMeasurement();
    try {
      scroll = summarizeScroll(await measureScrollStability(page));
    } finally {
      phaseController?.finishScrollMeasurement();
    }
  }
  const after = await page.evaluate(() => ({
    cls: (window.__mmsAudit?.layoutShifts || []).reduce((sum, entry) => sum + entry.value, 0),
    longTaskTotalMs: (window.__mmsAudit?.longTasks || []).reduce((sum, entry) => sum + entry.duration, 0),
    longTaskCount: (window.__mmsAudit?.longTasks || []).length,
    memory: performance.memory ? {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    } : null,
  }));
  return { before, after, cdpMetrics, scroll };
}

function responseHeadersSubset(headers) {
  const allow = new Set([
    "accept-ranges", "age", "cache-control", "content-length", "content-range",
    "content-type", "etag", "last-modified", "server", "vary", "x-cache", "x-cache-status",
  ]);
  return Object.fromEntries(Object.entries(headers).filter(([key]) => allow.has(key.toLowerCase())));
}

async function captureScreenshots(page, outputRoot, scenario, { checkpoints }) {
  const screenshotDirectory = path.join(outputRoot, "screenshots");
  await mkdir(screenshotDirectory, { recursive: true });
  const baseName = sanitizeForFile(scenario.id);
  const topName = `${baseName}--top.png`;
  await page.screenshot({
    path: path.join(screenshotDirectory, topName),
    fullPage: false,
    animations: "disabled",
  });
  const result = {
    top: path.posix.join("screenshots", topName),
    checkpoints: [],
  };
  if (!checkpoints) return result;

  const checkpointRecords = await page.evaluate(() => [...document.querySelectorAll("[data-band]")].map((element, index) => ({
    selector: `[data-band="${CSS.escape(element.getAttribute("data-band") || String(index))}"]`,
    label: `band-${element.getAttribute("data-band") || index}`,
  })));
  for (const checkpoint of checkpointRecords) {
    await page.locator(checkpoint.selector).scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForTimeout(100);
    const name = `${baseName}--${sanitizeForFile(checkpoint.label)}.png`;
    await page.screenshot({
      path: path.join(screenshotDirectory, name),
      fullPage: false,
      animations: "disabled",
    });
    result.checkpoints.push({
      label: checkpoint.label,
      selector: checkpoint.selector,
      path: path.posix.join("screenshots", name),
    });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(100);
  return result;
}

export async function launchAuditBrowser({ channel, executablePath, headed }) {
  const options = {
    headless: !headed,
    args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
  };
  if (executablePath) options.executablePath = executablePath;
  else options.channel = channel || "chrome";
  return chromium.launch(options);
}

export async function captureScenario({
  browser,
  scenario,
  url,
  outputRoot,
  targetName,
  browserLabel,
  storageState,
}) {
  const startedAt = new Date().toISOString();
  const context = await browser.newContext({
    viewport: { width: scenario.viewport.width, height: scenario.viewport.height },
    deviceScaleFactor: scenario.viewport.dpr,
    reducedMotion: scenario.suite === "states" || scenario.suite === "visual" ? "reduce" : "no-preference",
    serviceWorkers: "allow",
    locale: "en-CA",
    timezoneId: "America/Toronto",
    ...(storageState ? { storageState } : {}),
  });
  const messageTraffic = [];
  await installAuditObservers(context, messageTraffic);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const consoleEvents = [];
  const pageErrors = [];
  const requestFailures = [];
  const network = [];
  const cdpNetwork = new Map();
  const requestRecords = new Map();
  const pendingSizeReads = [];
  let networkPhase = "startup";

  page.on("console", (message) => {
    consoleEvents.push({ type: message.type(), text: message.text(), location: message.location() });
  });
  page.on("pageerror", (error) => {
    pageErrors.push({ message: error.message, stack: error.stack || "" });
  });
  page.on("request", (request) => {
    requestRecords.set(request, {
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      requestHeaders: request.headers(),
      startTime: Date.now(),
      redirectedFrom: request.redirectedFrom()?.url() || "",
      phase: networkPhase,
    });
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    requestFailures.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      errorText: failure?.errorText || "unknown",
      phase: requestRecords.get(request)?.phase || networkPhase,
    });
  });
  page.on("requestfinished", (request) => {
    pendingSizeReads.push((async () => {
      const record = requestRecords.get(request) || {};
      const response = await request.response();
      let sizes = null;
      try { sizes = await request.sizes(); } catch (error) {}
      const responseHeaders = response ? await response.allHeaders() : {};
      network.push({
        ...record,
        endTime: Date.now(),
        durationMs: record.startTime ? Date.now() - record.startTime : null,
        status: response?.status() || null,
        statusText: response?.statusText() || "",
        fromServiceWorker: response?.fromServiceWorker() || false,
        responseHeaders: responseHeadersSubset(responseHeaders),
        sizes,
      });
    })());
  });

  await cdp.send("Network.enable");
  cdp.on("Network.requestWillBeSent", (event) => {
    cdpNetwork.set(event.requestId, {
      requestId: event.requestId,
      url: event.request.url,
      method: event.request.method,
      type: event.type || "",
      initialPriority: event.request.initialPriority || "",
      timestamp: event.timestamp,
      phase: networkPhase,
    });
  });
  cdp.on("Network.responseReceived", (event) => {
    const record = cdpNetwork.get(event.requestId);
    if (!record) return;
    record.status = event.response.status;
    record.protocol = event.response.protocol;
    record.mimeType = event.response.mimeType;
    record.fromDiskCache = event.response.fromDiskCache;
    record.fromPrefetchCache = event.response.fromPrefetchCache;
    record.fromServiceWorker = event.response.fromServiceWorker;
  });

  let mainResponse = null;
  let fatalError = null;
  try {
    mainResponse = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: settle.domContentLoadedTimeoutMs,
    });
    await waitForSettledPage(page);
    await applyState(page, scenario.state);
  } catch (error) {
    fatalError = { message: error.message, stack: error.stack || "" };
  }

  const axeSource = scenario.profile.axe ? await readFile(axePath, "utf8") : null;
  let dom = null;
  let accessibility = null;
  let axe = null;
  let performance = null;
  let screenshot = null;
  if (!fatalError) {
    if (scenario.profile.dom || scenario.profile.geometry) dom = await collectDomAndGeometry(page);
    if (scenario.profile.accessibility) accessibility = await collectAccessibility(cdp);
    if (scenario.profile.axe) axe = await collectAxe(page, axeSource);
    if (scenario.profile.screenshot) {
      screenshot = await captureScreenshots(page, outputRoot, scenario, { checkpoints: false });
    }
    if (scenario.profile.performance) {
      performance = await collectPerformance(page, cdp, scenario.profile.scroll, {
        startScrollMeasurement() { networkPhase = "scroll-measurement"; },
        finishScrollMeasurement() { networkPhase = "post-checkpoint"; },
      });
    }
    if (scenario.profile.screenshot && scenario.profile.performance && scenario.page === "home") {
      networkPhase = "checkpoint-traversal";
      const checkpointCapture = await captureScreenshots(page, outputRoot, scenario, { checkpoints: true });
      screenshot.checkpoints = checkpointCapture.checkpoints;
      networkPhase = "post-checkpoint";
      await page.waitForTimeout(100);
    } else {
      networkPhase = "post-checkpoint";
    }
  }

  for (let pass = 0; pass < 3; pass += 1) {
    const observedCount = pendingSizeReads.length;
    await Promise.allSettled(pendingSizeReads.slice(0, observedCount));
    if (pendingSizeReads.length === observedCount) break;
  }
  await page.waitForTimeout(25);
  const browserSignals = fatalError ? {} : await page.evaluate(() => window.__mmsAudit || {});
  const mainHeaders = mainResponse ? await mainResponse.allHeaders() : {};
  const summarizeNetwork = (records, failures) => ({
    requestCount: records.length,
    failedCount: failures.length,
    transferBytes: records.reduce((sum, request) => sum +
      (request.sizes?.responseBodySize || 0) + (request.sizes?.responseHeadersSize || 0), 0),
    resourceBytes: records.reduce((sum, request) => sum + (request.sizes?.responseBodySize || 0), 0),
    statusCounts: records.reduce((counts, request) => {
      const key = String(request.status || "none");
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {}),
    rangeRequests: records.filter((request) => request.requestHeaders?.range || request.status === 206).length,
    cacheableResponses: records.filter((request) => request.responseHeaders?.["cache-control"]).length,
  });
  const networkSummary = {
    ...summarizeNetwork(network, requestFailures),
    byPhase: Object.fromEntries(NETWORK_PHASES.map((phase) => [
      phase,
      summarizeNetwork(
        network.filter((request) => request.phase === phase),
        requestFailures.filter((request) => request.phase === phase),
      ),
    ])),
  };

  const result = {
    schemaVersion: SCHEMA_VERSION,
    kind: "scenario-capture",
    capturedAt: startedAt,
    completedAt: new Date().toISOString(),
    target: targetName,
    browser: browserLabel,
    scenario: {
      id: scenario.id,
      suite: scenario.suite,
      page: scenario.page,
      viewport: scenario.viewport,
      state: scenario.state,
      captureProfile: scenario.profile,
      url,
    },
    fatalError,
    mainResponse: mainResponse ? {
      url: mainResponse.url(),
      status: mainResponse.status(),
      statusText: mainResponse.statusText(),
      headers: responseHeadersSubset(mainHeaders),
    } : null,
    dom: dom?.document || null,
    computedStyles: dom?.computedStyles || null,
    geometry: dom?.geometry || null,
    accessibility,
    axe,
    diagnostics: {
      console: scenario.profile.console ? consoleEvents : [],
      pageErrors,
      unhandledRejections: browserSignals.unhandledRejections || [],
      windowErrors: browserSignals.errors || [],
      requestFailures,
      messagesReceived: scenario.profile.messages
        ? messageTraffic.filter((record) => record.direction === "received")
        : [],
      messagesSent: scenario.profile.messages
        ? messageTraffic.filter((record) => record.direction === "sent")
        : [],
      messageCollection: messageCollectionContract,
    },
    network: scenario.profile.network ? {
      summary: networkSummary,
      requests: network.sort((left, right) => (left.startTime || 0) - (right.startTime || 0)),
      cdp: [...cdpNetwork.values()],
    } : { summary: networkSummary },
    performance,
    screenshot,
  };

  await context.close();
  return result;
}

export async function captureScenarioBatch({
  browser,
  scenarios,
  url,
  outputRoot,
  targetName,
  browserLabel,
  storageState,
}) {
  if (!scenarios.length) return [];
  const reference = scenarios[0];
  if (scenarios.some((scenario) =>
    scenario.page !== reference.page ||
    scenario.viewport.width !== reference.viewport.width ||
    scenario.viewport.height !== reference.viewport.height ||
    scenario.viewport.dpr !== reference.viewport.dpr,
  )) {
    throw new Error("batched scenarios must share page and viewport");
  }

  const context = await browser.newContext({
    viewport: { width: reference.viewport.width, height: reference.viewport.height },
    deviceScaleFactor: reference.viewport.dpr,
    reducedMotion: "reduce",
    serviceWorkers: "allow",
    locale: "en-CA",
    timezoneId: "America/Toronto",
    ...(storageState ? { storageState } : {}),
  });
  const messageTraffic = [];
  await installAuditObservers(context, messageTraffic);
  const page = await context.newPage();
  const consoleEvents = [];
  const pageErrors = [];
  const requestFailures = [];
  page.on("console", (message) => {
    consoleEvents.push({ type: message.type(), text: message.text(), location: message.location() });
  });
  page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack || "" }));
  page.on("requestfailed", (request) => {
    requestFailures.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      errorText: request.failure()?.errorText || "unknown",
    });
  });

  let mainResponse = null;
  let fatalError = null;
  try {
    mainResponse = await page.goto(url, { waitUntil: "domcontentloaded", timeout: settle.domContentLoadedTimeoutMs });
    await waitForSettledPage(page);
  } catch (error) {
    fatalError = { message: error.message, stack: error.stack || "" };
  }
  const mainHeaders = mainResponse ? await mainResponse.allHeaders() : {};
  const results = [];

  for (const scenario of scenarios) {
    const startedAt = new Date().toISOString();
    const consoleStart = consoleEvents.length;
    const errorStart = pageErrors.length;
    const requestFailureStart = requestFailures.length;
    const messageStart = messageTraffic.length;
    let dom = null;
    let screenshot = null;
    let stateError = fatalError;
    let browserSignals = {};
    if (!stateError) {
      try {
        const signalStart = await page.evaluate(() => ({
          rejection: window.__mmsAudit?.unhandledRejections?.length || 0,
          error: window.__mmsAudit?.errors?.length || 0,
        }));
        await applyState(page, scenario.state);
        dom = await collectDomAndGeometry(page);
        browserSignals = await page.evaluate((start) => ({
          unhandledRejections: (window.__mmsAudit?.unhandledRejections || []).slice(start.rejection),
          errors: (window.__mmsAudit?.errors || []).slice(start.error),
        }), signalStart);
        if (scenario.profile.screenshot) {
          screenshot = await captureScreenshots(page, outputRoot, scenario, { checkpoints: false });
        }
        await page.waitForTimeout(25);
      } catch (error) {
        stateError = { message: error.message, stack: error.stack || "" };
      }
    }
    results.push({
      schemaVersion: SCHEMA_VERSION,
      kind: "scenario-capture",
      capturedAt: startedAt,
      completedAt: new Date().toISOString(),
      target: targetName,
      browser: browserLabel,
      scenario: {
        id: scenario.id,
        suite: scenario.suite,
        page: scenario.page,
        viewport: scenario.viewport,
        state: scenario.state,
        captureProfile: scenario.profile,
        url,
        batchReuse: true,
      },
      fatalError: stateError,
      mainResponse: mainResponse ? {
        url: mainResponse.url(),
        status: mainResponse.status(),
        statusText: mainResponse.statusText(),
        headers: responseHeadersSubset(mainHeaders),
      } : null,
      dom: dom?.document || null,
      computedStyles: dom?.computedStyles || null,
      geometry: dom?.geometry || null,
      accessibility: null,
      axe: null,
      diagnostics: {
        console: consoleEvents.slice(consoleStart),
        pageErrors: pageErrors.slice(errorStart),
        unhandledRejections: browserSignals.unhandledRejections || [],
        windowErrors: browserSignals.errors || [],
        requestFailures: requestFailures.slice(requestFailureStart),
        messagesReceived: scenario.profile.messages
          ? messageTraffic.slice(messageStart).filter((record) => record.direction === "received")
          : [],
        messagesSent: scenario.profile.messages
          ? messageTraffic.slice(messageStart).filter((record) => record.direction === "sent")
          : [],
        messageCollection: messageCollectionContract,
      },
      network: {
        summary: {
          requestCount: 0,
          failedCount: requestFailures.slice(requestFailureStart).length,
          collection: "disabled for reused-page matrix",
        },
      },
      performance: null,
      screenshot,
    });
  }

  await context.close();
  return results;
}

export async function writeScenarioResult(outputRoot, result) {
  const directory = path.join(outputRoot, "captures");
  await mkdir(directory, { recursive: true });
  const destination = path.join(directory, `${sanitizeForFile(result.scenario.id)}.json`);
  await writeFile(destination, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return path.relative(outputRoot, destination);
}
