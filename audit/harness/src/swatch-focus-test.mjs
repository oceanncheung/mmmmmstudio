import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";
import { startStaticServer } from "./server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const CARGO_ROOT = path.join(REPO_ROOT, "cargo");
const VIEWPORTS = [
  { name: "compact", width: 390, height: 844 },
  { name: "expanded", width: 1440, height: 900 },
];
const THEMES = ["white", "girly", "quirky", "contrast", "black"];
const watchdog = setTimeout(() => {
  process.stderr.write("Swatch focus probe: FAIL (60s watchdog)\n");
  process.exit(2);
}, 60000);

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
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(`${server.origin}/test.html`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });

    if (viewport.width < 1024) {
      await page.locator(".mms-menu[data-panel-toggle]").click();
    }

    const white = page.locator('[data-theme-set="white"]');
    const girly = page.locator('[data-theme-set="girly"]');
    await page.mouse.move(0, 0);
    const target = await white.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const art = getComputedStyle(element, "::before");
      return {
        width: rect.width,
        height: rect.height,
        borderWidth: art.borderTopWidth,
        ring: art.boxShadow,
        active: document.activeElement === element,
        focusVisible: element.matches(":focus-visible"),
      };
    });
    const compactTargetValid = viewport.width < 1024 &&
      target.width >= 32 && Math.abs(target.height - 44) <= 0.01;
    const expandedTargetValid = viewport.width >= 1024 &&
      Math.abs(target.width - 20) <= 0.01 && Math.abs(target.height - 20) <= 0.01;
    if (!compactTargetValid && !expandedTargetValid) {
      throw new Error(
        `${viewport.name}: swatch target geometry drifted (${target.width}x${target.height})`,
      );
    }
    if (target.borderWidth !== "0px" || (target.ring && target.ring !== "none")) {
      throw new Error(`${viewport.name}: swatch has a ring before hover ${JSON.stringify(target)}`);
    }

    await white.hover();
    const hoverRing = await white.evaluate((element) =>
      getComputedStyle(element, "::before").boxShadow);
    if (!hoverRing || hoverRing === "none") {
      throw new Error(`${viewport.name}: fine-pointer hover ring is missing`);
    }
    await page.mouse.move(0, 0);
    const settledRing = await white.evaluate((element) =>
      getComputedStyle(element, "::before").boxShadow);
    if (settledRing && settledRing !== "none") {
      throw new Error(`${viewport.name}: hover ring remained after pointer exit`);
    }

    await girly.click();
    await page.waitForTimeout(30);
    const pointerState = await girly.evaluate((element) => ({
        active: document.activeElement === element,
        focusVisible: element.matches(":focus-visible"),
        outlineStyle: getComputedStyle(element).outlineStyle,
        ring: getComputedStyle(element, "::before").boxShadow,
        panelOpen: Boolean(document.querySelector("dialog.mms-panel")?.open),
      }));
    if (pointerState.active || pointerState.focusVisible || pointerState.outlineStyle === "dotted") {
      throw new Error(`${viewport.name}: pointer activation retained a focus frame`);
    }
    if (!pointerState.panelOpen) {
      throw new Error(`${viewport.name}: selecting a theme closed the control panel`);
    }
    if (!pointerState.ring || pointerState.ring === "none") {
      throw new Error(`${viewport.name}: hovered pointer selection lost its hover ring`);
    }
    await page.mouse.move(0, 0);

    for (const theme of THEMES) {
      await page.evaluate((nextTheme) => {
        document.documentElement.setAttribute("data-theme", nextTheme);
      }, theme);
      await page.keyboard.press("Tab");
      await white.focus();
      const keyboardState = await white.evaluate((element) => {
        const style = getComputedStyle(element);
        const art = getComputedStyle(element, "::before");
        const rect = element.getBoundingClientRect();
        return {
          active: document.activeElement === element,
          focusVisible: element.matches(":focus-visible"),
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          ring: art.boxShadow,
          width: rect.width,
          height: rect.height,
        };
      });
      if (!keyboardState.active || !keyboardState.focusVisible) {
        throw new Error(`${viewport.name}/${theme}: keyboard focus state did not reach swatch`);
      }
      if (keyboardState.outlineStyle !== "none") {
        throw new Error(
          `${viewport.name}/${theme}: button-box outline survived ` +
          JSON.stringify(keyboardState),
        );
      }
      if (keyboardState.ring && keyboardState.ring !== "none") {
        throw new Error(`${viewport.name}/${theme}: keyboard focus incorrectly drew a ring`);
      }
      if (Math.abs(keyboardState.width - target.width) > 0.01 ||
          Math.abs(keyboardState.height - target.height) > 0.01) {
        throw new Error(`${viewport.name}/${theme}: focus changed target geometry`);
      }
    }

    const overflow = await page.evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    if (overflow > 0) throw new Error(`${viewport.name}: page overflow is ${overflow}px`);

    process.stdout.write(`Swatch focus ${viewport.name}: PASS\n`);
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
  clearTimeout(watchdog);
}
