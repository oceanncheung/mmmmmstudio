import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";
import { startStaticServer } from "./server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const CANDIDATE_ROOT = path.join(REPO_ROOT, "cargo");
const GOLD_ROOT = process.env.MMS_GOLD_ROOT
  ? path.resolve(process.env.MMS_GOLD_ROOT)
  : path.join(CANDIDATE_ROOT, "gold/2026-07-21-responsive-70");
const APPROVED_GOLD_ID = "gold-2026-07-21-responsive-70";
const VIEWPORTS = [
  { width: 390, height: 844, name: "compact" },
  { width: 1440, height: 900, name: "expanded" },
];
const THEMES = ["white", "girly", "quirky", "contrast", "black"];
const FACES = ["serif", "sans", "mono", "gothic"];
const SCALES = ["s", "m", "l", "xl"];
const SHAPES = ["straight", "rounded", "oval"];
const watchdog = setTimeout(() => {
  process.stderr.write("Gold parity probe: FAIL (120s watchdog)\n");
  process.exit(2);
}, 120000);
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
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "white");
    document.documentElement.setAttribute("data-face", "serif");
    document.documentElement.setAttribute("data-scale", "m");
    document.documentElement.setAttribute("data-shape", "straight");
    document.documentElement.removeAttribute("data-panel");
  });
  if (compact) {
    await page.locator(".mms-menu[data-panel-toggle]").click();
  }
  await page.locator('[data-theme-set="girly"]').click();
  const panel = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute("data-theme"),
    panelState: document.documentElement.getAttribute("data-panel"),
    dialogOpen: Boolean(document.querySelector("dialog.mms-panel")?.open),
    dialogCount: document.querySelectorAll("dialog.mms-panel").length,
  }));
  const river = await page.evaluate(() => {
    const target = Array.from(document.querySelectorAll(".mms-river"))
      .find((element) => element.scrollWidth > element.clientWidth + 1);
    if (!target) return null;
    target.scrollLeft = 0;
    target.scrollLeft = 97;
    return {
      scrollLeft: Math.round(target.scrollLeft),
      touchAction: getComputedStyle(target).touchAction,
      overflowX: getComputedStyle(target).overflowX,
    };
  });
  return { panel, river };
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
    await Promise.all([gold.waitForTimeout(1800), candidate.waitForTimeout(1800)]);
    const neutralCss = `
      *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
      video, iframe { visibility: hidden !important; }
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
    const [goldPng, candidatePng] = await Promise.all([
      gold.screenshot({ animations: "disabled" }),
      candidate.screenshot({ animations: "disabled" }),
    ]);
    if (!goldPng.equals(candidatePng)) throw new Error(`masked screenshot drift at ${viewport.name}`);

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
