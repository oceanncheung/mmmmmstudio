import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const HARNESS_ROOT = path.resolve(HERE, "..");
export const PROJECT_ROOT = path.resolve(HARNESS_ROOT, "../..");
export const BASELINE_ROOT = path.join(
  PROJECT_ROOT,
  "docs/audits/2026-07-20T175853-0400-round-80",
);

export const SCHEMA_VERSION = "mms-audit/v1";

export const axes = Object.freeze({
  theme: Object.freeze(["white", "girly", "quirky", "contrast", "black"]),
  face: Object.freeze(["serif", "sans", "mono", "gothic"]),
  scale: Object.freeze(["s", "m", "l", "xl"]),
  shape: Object.freeze(["straight", "rounded", "oval"]),
});

export const defaultState = Object.freeze({
  theme: "white",
  face: "serif",
  scale: "m",
  shape: "straight",
});

export const pages = Object.freeze({
  home: Object.freeze({ path: "/", localFile: "test.html", snapshotFile: "home.html" }),
  write: Object.freeze({ path: "/write", localFile: "write-test.html", snapshotFile: "write.html" }),
  who: Object.freeze({ path: "/who", localFile: "who-test.html", snapshotFile: "who.html" }),
});

export const viewports = Object.freeze({
  compact: Object.freeze({ name: "compact", width: 390, height: 844, dpr: 2 }),
  expanded: Object.freeze({ name: "expanded", width: 1440, height: 900, dpr: 1 }),
  visual: Object.freeze([
    Object.freeze({ name: "mobile-320", width: 320, height: 720, dpr: 2 }),
    Object.freeze({ name: "mobile-390", width: 390, height: 844, dpr: 3 }),
    Object.freeze({ name: "mobile-430", width: 430, height: 932, dpr: 3 }),
    Object.freeze({ name: "bounded-edge-431", width: 431, height: 932, dpr: 2 }),
    Object.freeze({ name: "bounded-600", width: 600, height: 900, dpr: 2 }),
    Object.freeze({ name: "tablet-768", width: 768, height: 1024, dpr: 2 }),
    Object.freeze({ name: "compact-edge-1023", width: 1023, height: 900, dpr: 1 }),
    Object.freeze({ name: "expanded-edge-1024", width: 1024, height: 900, dpr: 1 }),
    Object.freeze({ name: "desktop-1440", width: 1440, height: 900, dpr: 1 }),
    Object.freeze({ name: "desktop-1920", width: 1920, height: 1080, dpr: 1 }),
    Object.freeze({ name: "desktop-2560", width: 2560, height: 1440, dpr: 1 }),
    Object.freeze({ name: "dia-wide-2940", width: 2940, height: 1600, dpr: 1 }),
  ]),
});

export const targetDefinitions = Object.freeze({
  "local-deterministic": Object.freeze({
    name: "local-deterministic",
    kind: "fixture",
    description: "Temporary copy of the canonical Cargo sources assembled with the checked-in build scripts.",
    authority: "current local implementation",
    limitations: [
      "Does not include Cargo sanitizer, editor hydration, managed font injection, CDN, or public routing.",
      "Freight media and embeds remain remote dependencies unless the caller blocks network access.",
    ],
  }),
  "cargo-draft-snapshot": Object.freeze({
    name: "cargo-draft-snapshot",
    kind: "fixture",
    description: "Deterministic fixture built from Phase 1 saved Cargo bodycopy, complete global CSS, and site head.",
    authority: "Round 80 authenticated Cargo readback",
    limitations: [
      "Represents the saved draft payload and representative wrapper classes, not a live authenticated editor runtime.",
      "Cannot prove current editor hydration, sanitizer behavior, authenticated fonts, or unsaved changes after the baseline timestamp.",
    ],
  }),
  "cargo-draft-live": Object.freeze({
    name: "cargo-draft-live",
    kind: "remote-optional",
    description: "Optional authenticated Cargo draft preview supplied through MMS_AUDIT_CARGO_DRAFT_URL_* environment variables.",
    authority: "live authenticated draft when explicitly configured",
    limitations: [
      "Disabled unless all requested route URLs are provided by environment or CLI configuration.",
      "The harness never logs in, saves, edits, publishes, or mutates Cargo.",
    ],
  }),
  published: Object.freeze({
    name: "published",
    kind: "remote",
    description: "Public mmmmm.studio routes for domain, CDN, cache, metadata, and routing evidence.",
    authority: "current public delivery",
    limitations: [
      "Network and cache results vary by location and capture time.",
      "A public response cannot prove the state of an unpublished Cargo draft.",
    ],
  }),
});

export const captureProfiles = Object.freeze({
  smoke: Object.freeze({
    dom: true,
    geometry: true,
    accessibility: true,
    axe: true,
    console: true,
    messages: true,
    network: true,
    performance: true,
    scroll: true,
    screenshot: true,
  }),
  routes: Object.freeze({
    dom: true,
    geometry: true,
    accessibility: true,
    axe: true,
    console: true,
    messages: true,
    network: true,
    performance: true,
    scroll: false,
    screenshot: true,
  }),
  states: Object.freeze({
    dom: true,
    geometry: true,
    accessibility: false,
    axe: false,
    console: true,
    messages: true,
    network: false,
    performance: false,
    scroll: false,
    screenshot: false,
  }),
  visual: Object.freeze({
    dom: true,
    geometry: true,
    accessibility: false,
    axe: false,
    console: true,
    messages: false,
    network: false,
    performance: false,
    scroll: false,
    screenshot: true,
  }),
});

export const computedStyleProperties = Object.freeze([
  "display",
  "position",
  "zIndex",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "touchAction",
  "pointerEvents",
  "color",
  "backgroundColor",
  "fontFamily",
  "fontSize",
  "lineHeight",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderRadius",
  "clipPath",
  "objectFit",
  "objectPosition",
  "visibility",
  "opacity",
]);

export const computedStyleSelectors = Object.freeze([
  "html",
  "body",
  ".mms",
  ".mms-mbar",
  ".mms-rail",
  ".mms-panel",
  ".mms-intro",
  ".mms-band",
  ".mms-river",
  ".mms-desc",
  ".mms-frame",
  ".mms-river-scrubber",
]);

export const settle = Object.freeze({
  domContentLoadedTimeoutMs: 30_000,
  initialPaintMs: 1_850,
  fontTimeoutMs: 5_000,
  mediaSettlementMs: 1_000,
});

export function liveDraftUrlsFromEnv() {
  return {
    home: process.env.MMS_AUDIT_CARGO_DRAFT_URL_HOME || "",
    write: process.env.MMS_AUDIT_CARGO_DRAFT_URL_WRITE || "",
    who: process.env.MMS_AUDIT_CARGO_DRAFT_URL_WHO || "",
  };
}
