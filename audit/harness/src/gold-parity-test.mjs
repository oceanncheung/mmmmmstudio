import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

import { chromium } from "playwright-core";
import { startStaticServer } from "./server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const CANDIDATE_ROOT = path.join(REPO_ROOT, "cargo");
const GOLD_ROOT = process.env.MMS_GOLD_ROOT
  ? path.resolve(process.env.MMS_GOLD_ROOT)
  : path.join(CANDIDATE_ROOT, "gold/2026-07-21-responsive-70");
const APPROVED_GOLD_ID = "gold-2026-07-21-responsive-70";
const GEOMETRY_SUPERSESSIONS = JSON.parse(readFileSync(
  path.join(REPO_ROOT, "audit/assets/post-baseline-geometry-supersessions.json"),
  "utf8",
)).supersessions;
const VIEWPORTS = [
  { width: 390, height: 844, name: "compact" },
  { width: 1440, height: 900, name: "expanded" },
];
const THEMES = ["white", "girly", "quirky", "contrast", "black"];
const FACES = ["serif", "sans", "mono", "gothic"];
const SCALES = ["s", "m", "l", "xl"];
const SHAPES = ["straight", "rounded", "oval"];
const watchdog = setTimeout(() => {
  process.stderr.write("Gold parity probe: FAIL (300s watchdog)\n");
  process.exit(2);
}, 300000);
const STYLE_PROPERTIES = [
  "display", "position", "boxSizing", "width", "height", "minWidth", "maxWidth",
  "minHeight", "maxHeight", "paddingTop", "paddingRight", "paddingBottom",
  "paddingLeft", "marginTop", "marginRight", "marginBottom", "marginLeft", "gap",
  "rowGap", "columnGap", "fontFamily", "fontSize", "lineHeight", "color",
  "backgroundColor", "borderTopWidth", "borderRightWidth", "borderBottomWidth",
  "borderLeftWidth", "borderTopLeftRadius", "borderTopRightRadius",
  "borderBottomRightRadius", "borderBottomLeftRadius", "overflowX", "overflowY",
  "objectFit", "objectPosition", "touchAction", "pointerEvents", "zIndex", "transform",
];

function stable(value) {
  return JSON.stringify(value);
}

function pngPixels(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) throw new Error("expected PNG screenshot");
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let bitDepth = 0;
  let interlace = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += length + 12;
  }
  const channels = { 0: 1, 2: 3, 6: 4 }[colorType];
  if (bitDepth !== 8 || !channels || interlace !== 0 || !width || !height) {
    throw new Error(`unsupported PNG screenshot format: bitDepth=${bitDepth} colorType=${colorType} interlace=${interlace}`);
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const rowStart = y * stride;
    const previousRowStart = rowStart - stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? pixels[rowStart + x - channels] : 0;
      const up = y > 0 ? pixels[previousRowStart + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[previousRowStart + x - channels] : 0;
      const average = Math.floor((left + up) / 2);
      const predictor = (() => {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        if (pa <= pb && pa <= pc) return left;
        return pb <= pc ? up : upLeft;
      })();
      const base = raw[rawOffset + x];
      const value = [base, base + left, base + up, base + average, base + predictor][filter];
      if (value === undefined) throw new Error(`unsupported PNG row filter ${filter}`);
      pixels[rowStart + x] = value & 0xff;
    }
    rawOffset += stride;
  }
  return { width, height, colorType, pixels };
}

function screenshotsMatch(left, right) {
  if (left.equals(right)) return true;
  const leftPixels = pngPixels(left);
  const rightPixels = pngPixels(right);
  return leftPixels.width === rightPixels.width &&
    leftPixels.height === rightPixels.height &&
    leftPixels.colorType === rightPixels.colorType &&
    leftPixels.pixels.equals(rightPixels.pixels);
}

function assertCurrentGold(root, label) {
  const manifestPath = path.join(root, "deployment-manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`${label} must contain deployment-manifest.json`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.approved_baseline !== APPROVED_GOLD_ID) {
    throw new Error(
      `${label} must identify ${APPROVED_GOLD_ID}; found ${manifest.approved_baseline}`,
    );
  }
}

async function settle(page) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function settleAssets(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    const imageSettled = Promise.all(Array.from(document.images, (image) => {
      if (image.complete) return Promise.resolve();
      if (image.loading === "lazy") return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    }));
    await Promise.race([
      imageSettled,
      new Promise((resolve) => { setTimeout(resolve, 2500); }),
    ]);
  });
  await settle(page);
}

async function applyApprovedGeometrySupersessions(page) {
  await page.evaluate((supersessions) => {
    supersessions.forEach((item) => {
      if (item.page !== "home" || item.status !== "current") return;
      const element = document.querySelector(`[data-media-id="${CSS.escape(item.media_id)}"]`);
      if (!element) throw new Error(`missing approved geometry supersession target: ${item.media_id}`);
      element.style.setProperty("--asset-w", String(item.current_value.width_css_px));
      element.style.setProperty("--asset-h", String(item.current_value.height_css_px));
      Object.entries(item.current_attributes || {}).forEach(([name, value]) => {
        element.setAttribute(name, String(value));
      });
    });
  }, GEOMETRY_SUPERSESSIONS);
}

async function applyState(page, state) {
  await page.evaluate(({ theme, face, scale, shape }) => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-face", face);
    root.setAttribute("data-scale", scale);
    root.setAttribute("data-shape", shape);
    for (const axis of ["theme", "face", "shape"]) {
      const current = { theme, face, shape }[axis];
      document.querySelectorAll(`[data-${axis}-set]`).forEach((control) => {
        control.setAttribute("aria-pressed", String(control.getAttribute(`data-${axis}-set`) === current));
      });
    }
    const slider = document.getElementById("mms-scale");
    if (slider) slider.value = String(["s", "m", "l", "xl"].indexOf(scale));
    document.querySelectorAll(".js-clock").forEach((clock) => { clock.textContent = "00:00:00"; });
  }, state);
  await settle(page);
}

async function snapshot(page) {
  return page.evaluate(({ styleProperties }) => {
    const selectors = [
      ".mms", ".mms-mbar", ".mms-nav", ".mms-panel", ".mms-intro-wrap",
      ".mms-intro", ".mms-band", ".mms-river", ".mms-desc", ".mms-frame",
      ".mms-river-scrubber", "[data-media-id]",
    ];
    const roundedRect = (element) => {
      const rect = element.getBoundingClientRect();
      const round = (number) => Math.round(number * 1000) / 1000;
      return {
        x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height),
        top: round(rect.top), right: round(rect.right), bottom: round(rect.bottom), left: round(rect.left),
      };
    };
    const records = [];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element, index) => {
        const computed = getComputedStyle(element);
        const styles = {};
        styleProperties.forEach((property) => { styles[property] = computed[property]; });
        records.push({
          selector,
          index,
          mediaId: element.getAttribute("data-media-id") || "",
          band: element.getAttribute("data-band") || "",
          rect: roundedRect(element),
          styles,
        });
      });
    });
    return {
      state: {
        theme: document.documentElement.getAttribute("data-theme"),
        face: document.documentElement.getAttribute("data-face"),
        scale: document.documentElement.getAttribute("data-scale"),
        shape: document.documentElement.getAttribute("data-shape"),
      },
      document: {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      bands: Array.from(document.querySelectorAll("[data-band]"), (element) => element.getAttribute("data-band")),
      media: Array.from(document.querySelectorAll("[data-media-id]"), (element) => element.getAttribute("data-media-id")),
      records,
    };
  }, { styleProperties: STYLE_PROPERTIES });
}

async function interactionSnapshot(page, compact) {
  return page.evaluate(({ compactMode }) => {
    document.documentElement.setAttribute("data-theme", "white");
    document.documentElement.setAttribute("data-face", "serif");
    document.documentElement.setAttribute("data-scale", "m");
    document.documentElement.setAttribute("data-shape", "straight");
    document.documentElement.removeAttribute("data-panel");
    if (compactMode) document.querySelector(".mms-menu[data-panel-toggle]")?.click();
    document.querySelector('[data-theme-set="girly"]')?.click();
    const panel = {
      theme: document.documentElement.getAttribute("data-theme"),
      panelState: document.documentElement.getAttribute("data-panel"),
      dialogOpen: Boolean(document.querySelector("dialog.mms-panel")?.open),
      dialogCount: document.querySelectorAll("dialog.mms-panel").length,
    };
    const target = Array.from(document.querySelectorAll(".mms-river"))
      .find((element) => element.scrollWidth > element.clientWidth + 1);
    if (!target) return { panel, river: null };
    target.scrollLeft = 0;
    target.scrollLeft = 97;
    const river = {
      scrollLeft: Math.round(target.scrollLeft),
      touchAction: getComputedStyle(target).touchAction,
      overflowX: getComputedStyle(target).overflowX,
    };
    return { panel, river };
  }, { compactMode: compact });
}

assertCurrentGold(GOLD_ROOT, "gold fixture");
assertCurrentGold(CANDIDATE_ROOT, "candidate Cargo source");
const goldServer = await startStaticServer(GOLD_ROOT);
const candidateServer = await startStaticServer(CANDIDATE_ROOT);
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
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
      locale: "en-CA",
      timezoneId: "America/Toronto",
    });
    await context.route("**/*", async (route) => {
      const origin = new URL(route.request().url()).origin;
      if (origin === goldServer.origin || origin === candidateServer.origin) await route.continue();
      else await route.abort("blockedbyclient");
    });
    await context.addInitScript(() => {
      try { localStorage.clear(); } catch {}
      HTMLMediaElement.prototype.play = () => Promise.resolve();
    });
    const gold = await context.newPage();
    const candidate = await context.newPage();
    await Promise.all([
      gold.goto(`${goldServer.origin}/test.html`, { waitUntil: "domcontentloaded" }),
      candidate.goto(`${candidateServer.origin}/test.html`, { waitUntil: "domcontentloaded" }),
    ]);
    await applyApprovedGeometrySupersessions(gold);
    await Promise.all([gold.waitForTimeout(1800), candidate.waitForTimeout(1800)]);
    await Promise.all([settleAssets(gold), settleAssets(candidate)]);
    const neutralCss = `
      *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
      video, iframe { visibility: hidden !important; }
      .js-clock { visibility: hidden !important; }
      .mms-panel .mms-dot::before { border: 0 !important; box-shadow: none !important; }
    `;
    await Promise.all([gold.addStyleTag({ content: neutralCss }), candidate.addStyleTag({ content: neutralCss })]);

    let checked = 0;
    for (const theme of THEMES) {
      for (const face of FACES) {
        for (const scale of SCALES) {
          for (const shape of SHAPES) {
            const state = { theme, face, scale, shape };
            await Promise.all([applyState(gold, state), applyState(candidate, state)]);
            const [goldState, candidateState] = await Promise.all([snapshot(gold), snapshot(candidate)]);
            if (stable(goldState) !== stable(candidateState)) {
              throw new Error(`gold parity drift at ${viewport.name} ${stable(state)}`);
            }
            checked += 1;
          }
        }
      }
    }

    await Promise.all([
      applyState(gold, { theme: "white", face: "serif", scale: "m", shape: "straight" }),
      applyState(candidate, { theme: "white", face: "serif", scale: "m", shape: "straight" }),
    ]);
    // Layout parity must not preserve an incidental browser focus artifact.
    // Swatch focus treatment has its own compact/expanded five-theme probe.
    await Promise.all([
      gold.evaluate(() => document.activeElement?.blur()),
      candidate.evaluate(() => document.activeElement?.blur()),
    ]);
    await Promise.all([settle(gold), settle(candidate)]);
    // Swatch artwork is normalized above for exact layout screenshots. Its
    // load, hover, pointer, touch, and keyboard states are owned separately by
    // swatch-focus-test.mjs.
    const [goldPng, candidatePng] = await Promise.all([
      gold.screenshot({ animations: "disabled" }),
      candidate.screenshot({ animations: "disabled" }),
    ]);
    if (!screenshotsMatch(goldPng, candidatePng)) throw new Error(`masked screenshot drift at ${viewport.name}`);

    const [goldInteraction, candidateInteraction] = await Promise.all([
      interactionSnapshot(gold, viewport.width < 1024),
      interactionSnapshot(candidate, viewport.width < 1024),
    ]);
    if (stable(goldInteraction) !== stable(candidateInteraction)) {
      throw new Error(`interaction drift at ${viewport.name}`);
    }
    if (!candidateInteraction.river || candidateInteraction.river.scrollLeft <= 0 ||
        (viewport.width < 1024 && candidateInteraction.river.touchAction !== "pan-x pan-y")) {
      throw new Error(`native river contract failed at ${viewport.name}`);
    }

    process.stdout.write(`Gold parity ${viewport.name}: PASS (${checked} states + screenshot + interactions)\n`);
    await context.close();
  }
} finally {
  await browser.close();
  await goldServer.close();
  await candidateServer.close();
  clearTimeout(watchdog);
}
