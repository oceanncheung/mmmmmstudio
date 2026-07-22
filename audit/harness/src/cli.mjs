#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  BASELINE_ROOT,
  HARNESS_ROOT,
  PROJECT_ROOT,
  SCHEMA_VERSION,
  liveDraftUrlsFromEnv,
  pages,
  targetDefinitions,
} from "./config.mjs";
import { prepareCargoDraftSnapshot, prepareLocalFixture } from "./fixtures.mjs";
import { buildScenarios, scenarioCounts } from "./scenarios.mjs";
import { auditSchemaValidators, validateAuditArtifact } from "./schema-validation.mjs";
import { startStaticServer } from "./server.mjs";
import { validateConfiguration } from "./validate.mjs";

const execFileAsync = promisify(execFile);

function usage() {
  return `MM.S read-only audit harness

Usage:
  npm run list
  npm run validate
  npm run audit -- --target local-deterministic --suite smoke --page home

Options:
  --list                       Print targets, axes, suites, and scenario counts without launching a browser.
  --validate-config            Validate target inputs, 240 states, pairwise coverage, schemas, and viewport matrix.
  --target NAME                local-deterministic, cargo-draft-snapshot, cargo-draft-live, or published.
  --suite NAME                 smoke, routes, states, or visual.
  --page NAME                  home, write, who, or all.
  --channel NAME               Installed Chromium channel; defaults to chrome.
  --executable-path PATH       Explicit Chromium-compatible browser executable.
  --headed                     Show the browser window.
  --output PATH                Run output directory; defaults to audit/harness/output/<timestamp>.
  --max-scenarios NUMBER       Deterministic prefix for debugging a large suite.
  --origin URL                 Override the published origin.
  --url-home URL               Live Cargo draft Home URL.
  --url-write URL              Live Cargo draft Write URL.
  --url-who URL                Live Cargo draft Who URL.
  --storage-state PATH         Optional Playwright storage state for an authenticated read-only draft preview.
  --json                       Print machine-readable list/validation output.
  --help                       Show this help.

The harness never logs in, saves, edits, publishes, uploads, or deletes. Dataset and localStorage
changes occur only inside isolated disposable browser contexts.`;
}

function parseArgs(argv) {
  const options = {
    target: "local-deterministic",
    suite: "smoke",
    page: "home",
    channel: "chrome",
    executablePath: "",
    headed: false,
    output: "",
    maxScenarios: null,
    origin: "https://mmmmm.studio",
    liveUrls: liveDraftUrlsFromEnv(),
    storageState: process.env.MMS_AUDIT_STORAGE_STATE || "",
    list: false,
    validateConfig: false,
    json: false,
    help: false,
  };
  const valueOptions = new Set([
    "--target", "--suite", "--page", "--channel", "--executable-path", "--output",
    "--max-scenarios", "--origin", "--url-home", "--url-write", "--url-who", "--storage-state",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--headed") options.headed = true;
    else if (argument === "--list") options.list = true;
    else if (argument === "--validate-config") options.validateConfig = true;
    else if (argument === "--json") options.json = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (valueOptions.has(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
      index += 1;
      if (argument === "--target") options.target = value;
      else if (argument === "--suite") options.suite = value;
      else if (argument === "--page") options.page = value;
      else if (argument === "--channel") options.channel = value;
      else if (argument === "--executable-path") options.executablePath = value;
      else if (argument === "--output") options.output = path.resolve(value);
      else if (argument === "--max-scenarios") options.maxScenarios = Number(value);
      else if (argument === "--origin") options.origin = value.replace(/\/$/, "");
      else if (argument === "--url-home") options.liveUrls.home = value;
      else if (argument === "--url-write") options.liveUrls.write = value;
      else if (argument === "--url-who") options.liveUrls.who = value;
      else if (argument === "--storage-state") options.storageState = path.resolve(value);
    } else {
      throw new Error(`unknown option: ${argument}`);
    }
  }
  if (options.maxScenarios !== null && (!Number.isInteger(options.maxScenarios) || options.maxScenarios <= 0)) {
    throw new Error("--max-scenarios must be a positive integer");
  }
  return options;
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function collectPublishedPlatformProbes(origin) {
  const paths = ["/robots.txt", "/sitemap.xml", "/favicon.ico", "/write", "/who", "/__mms-audit-missing-route__"];
  const records = [];
  for (const pathname of paths) {
    const url = `${origin}${pathname}`;
    try {
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
      const body = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "";
      records.push({
        url,
        status: response.status,
        statusText: response.statusText,
        location: response.headers.get("location") || "",
        headers: Object.fromEntries([...response.headers].filter(([name]) => [
          "age", "cache-control", "content-length", "content-type", "etag", "last-modified",
          "server", "vary", "x-cache", "x-cache-status",
        ].includes(name.toLowerCase()))),
        bytes: body.length,
        sha256: sha256(body),
        textPreview: /^text\/(plain|xml)|application\/(xml|json)/i.test(contentType)
          ? body.toString("utf8", 0, Math.min(body.length, 2_000))
          : "",
      });
    } catch (error) {
      records.push({ url, error: error.message });
    }
  }
  return records;
}

async function repositoryCommit() {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: PROJECT_ROOT });
    return stdout.trim();
  } catch {
    return "";
  }
}

function listPayload(validation) {
  return {
    schemaVersion: SCHEMA_VERSION,
    targets: targetDefinitions,
    suites: {
      smoke: "One default-state compact and expanded capture per selected page; full collectors.",
      routes: "Compact and expanded full captures for the selected route set.",
      states: "All 240 states at compact and expanded references; DOM/style/geometry assertions only.",
      visual: "Greedy pairwise state set at every master viewport; viewport screenshots plus geometry.",
    },
    pages: Object.keys(pages),
    counts: scenarioCounts(),
    validation,
  };
}

function printList(payload, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  process.stdout.write(`MM.S audit harness\n\nTargets:\n`);
  Object.values(payload.targets).forEach((target) => {
    process.stdout.write(`  ${target.name}\n    ${target.description}\n`);
  });
  process.stdout.write(`\nState axes: 5 themes × 4 typefaces × 4 scales × 3 shapes = ${payload.counts.fullStates}\n`);
  process.stdout.write(`Pairwise state set: ${payload.counts.pairwiseStates}\n`);
  process.stdout.write(`State suite per page: ${payload.counts.statesPerPage} scenarios\n`);
  process.stdout.write(`Visual suite per page: ${payload.counts.visualPerPage} scenarios across ${payload.counts.visualViewports} viewports\n`);
  process.stdout.write(`Configuration: ${payload.validation.valid ? "valid" : "invalid"}\n`);
}

async function targetRuntime(options, runRoot) {
  if (options.target === "local-deterministic") {
    const root = await prepareLocalFixture(runRoot);
    const server = await startStaticServer(root);
    return { baseUrl: server.origin, close: server.close, sourceRoot: root };
  }
  if (options.target === "cargo-draft-snapshot") {
    const root = await prepareCargoDraftSnapshot(runRoot);
    const server = await startStaticServer(root);
    return { baseUrl: server.origin, close: server.close, sourceRoot: root };
  }
  if (options.target === "published") {
    return { baseUrl: options.origin, close: async () => {}, sourceRoot: null };
  }
  if (options.target === "cargo-draft-live") {
    return { baseUrl: "", close: async () => {}, sourceRoot: null };
  }
  throw new Error(`unknown target: ${options.target}`);
}

function scenarioUrl(options, runtime, scenario) {
  if (options.target === "cargo-draft-live") {
    const configured = options.liveUrls[scenario.page];
    if (!configured) {
      throw new Error(`cargo-draft-live requires --url-${scenario.page} or MMS_AUDIT_CARGO_DRAFT_URL_${scenario.page.toUpperCase()}`);
    }
    return configured;
  }
  return `${runtime.baseUrl}${pages[scenario.page].path}`;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${usage()}\n`);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const validation = await validateConfiguration();
  if (options.list) {
    printList(listPayload(validation), options.json);
    process.exitCode = validation.valid ? 0 : 1;
    return;
  }
  if (options.validateConfig) {
    process.stdout.write(`${JSON.stringify(validation, null, 2)}\n`);
    process.exitCode = validation.valid ? 0 : 1;
    return;
  }
  if (!validation.valid) {
    throw new Error(`configuration is invalid:\n${validation.errors.map((error) => `- ${error}`).join("\n")}`);
  }
  await auditSchemaValidators();
  if (!targetDefinitions[options.target]) throw new Error(`unknown target: ${options.target}`);

  let scenarios = buildScenarios({ suite: options.suite, pageSelection: options.page });
  if (options.maxScenarios !== null) scenarios = scenarios.slice(0, options.maxScenarios);
  const outputRoot = options.output || path.join(HARNESS_ROOT, "output", `${timestampSlug()}__${options.target}__${options.suite}`);
  await mkdir(outputRoot, { recursive: true });

  const checksumIndex = await readFile(path.join(BASELINE_ROOT, "SHA256SUMS"));
  const runManifest = {
    schemaVersion: SCHEMA_VERSION,
    kind: "run-manifest",
    startedAt: new Date().toISOString(),
    completedAt: null,
    target: targetDefinitions[options.target],
    suite: options.suite,
    pageSelection: options.page,
    scenarioCount: scenarios.length,
    browser: {
      channel: options.channel,
      executablePath: options.executablePath || null,
      headed: options.headed,
      storageStateConfigured: Boolean(options.storageState),
    },
    repository: {
      root: PROJECT_ROOT,
      commit: await repositoryCommit(),
    },
    baseline: {
      root: BASELINE_ROOT,
      checksumIndexSha256: sha256(checksumIndex),
    },
    safety: {
      mode: "read-only external targets",
      localMutation: "temporary output directory only",
      cargoMutation: false,
      figmaMutation: false,
      publish: false,
    },
    determinism: {
      scenarioOrder: "fixed",
      stateMatrix: "deterministic full Cartesian product and greedy pairwise set",
      runtimeMutation: false,
      note: "The harness does not replace Date, Math.random, cryptographic randomness, timers, or embedded-frame runtime behavior.",
    },
    captures: [],
    platformProbes: [],
    mediaEvidence: {
      observations: "media-observations.jsonl",
      summary: "media-summary.json",
    },
    summary: null,
  };
  if (options.target === "published") {
    runManifest.platformProbes = await collectPublishedPlatformProbes(options.origin);
  }
  async function writeRunManifest(label) {
    await validateAuditArtifact("runManifest", runManifest, label);
    await writeFile(path.join(outputRoot, "run.json"), `${JSON.stringify(runManifest, null, 2)}\n`, "utf8");
  }

  await writeRunManifest("initial run manifest");
  await writeFile(path.join(outputRoot, "media-observations.jsonl"), "", "utf8");

  const runtime = await targetRuntime(options, outputRoot);
  const { launchAuditBrowser, captureScenario, captureScenarioBatch, writeScenarioResult } = await import("./collector.mjs");
  let browser;
  try {
    browser = await launchAuditBrowser({
      channel: options.channel,
      executablePath: options.executablePath,
      headed: options.headed,
    });
  } catch (error) {
    await runtime.close();
    throw error;
  }

  const mediaSummary = new Map();
  async function recordResult(result) {
      await validateAuditArtifact("scenarioCapture", result, `scenario capture ${result.scenario?.id || "unknown"}`);
      const relativePath = await writeScenarioResult(outputRoot, result);
      const stateMismatch = result.dom ? Object.entries(result.scenario.state).some(
        ([axis, value]) => result.dom.rootState?.[axis] !== value || result.dom.controlState?.[axis] !== value,
      ) : null;
      const intentionalDesignContractFailures = result.dom
        ? Object.entries(result.dom.intentionalDesignContracts || {})
          .filter(([, contract]) => contract.applicable && !contract.valid)
          .map(([id]) => id)
        : [];
      runManifest.captures.push({
        scenarioId: result.scenario.id,
        path: relativePath,
        fatal: Boolean(result.fatalError),
        status: result.mainResponse?.status || null,
        pageOverflowX: result.geometry?.document?.overflowX ?? null,
        unexpectedMediaClipping: result.geometry?.unexpectedMediaClipping?.length ?? null,
        axeViolations: result.axe?.counts?.violations ?? null,
        consoleErrors: result.diagnostics.console.filter((event) => event.type === "error").length,
        requestFailures: result.diagnostics.requestFailures.length,
        stateMismatch,
        intentionalDesignContractFailures,
        screenshot: result.screenshot,
      });
      for (const media of result.geometry?.media || []) {
        const observation = {
          schemaVersion: SCHEMA_VERSION,
          kind: "media-observation",
          scenarioId: result.scenario.id,
          page: result.scenario.page,
          viewport: result.scenario.viewport,
          state: result.scenario.state,
          mediaId: media.mediaId,
          band: media.band,
          tag: media.tag,
          shapePolicy: media.shapePolicy,
          fit: media.fit,
          mobileProfile: media.mobileProfile,
          rect: media.rect,
          ancestorClipping: media.ancestorClipping,
          naturalWidth: media.naturalWidth,
          naturalHeight: media.naturalHeight,
          source: media.source,
          poster: media.poster,
        };
        await validateAuditArtifact(
          "mediaObservation",
          observation,
          `media observation ${observation.scenarioId}/${observation.mediaId}`,
        );
        await appendFile(path.join(outputRoot, "media-observations.jsonl"), `${JSON.stringify(observation)}\n`, "utf8");
        const aggregate = mediaSummary.get(media.mediaId) || {
          mediaId: media.mediaId,
          band: media.band,
          tag: media.tag,
          shapePolicy: media.shapePolicy,
          fit: media.fit,
          mobileProfile: media.mobileProfile,
          naturalWidth: media.naturalWidth,
          naturalHeight: media.naturalHeight,
          source: media.source,
          poster: media.poster,
          observationCount: 0,
          maxRenderedWidth: 0,
          maxRenderedHeight: 0,
          maxDpr: 0,
          maxRequiredPixelWidth: 0,
          maxRequiredPixelHeight: 0,
          unexpectedAncestorClipObservations: 0,
          maxClippedTop: 0,
          maxClippedRight: 0,
          maxClippedBottom: 0,
          maxClippedLeft: 0,
        };
        aggregate.observationCount += 1;
        aggregate.maxRenderedWidth = Math.max(aggregate.maxRenderedWidth, media.rect.width || 0);
        aggregate.maxRenderedHeight = Math.max(aggregate.maxRenderedHeight, media.rect.height || 0);
        aggregate.maxDpr = Math.max(aggregate.maxDpr, result.scenario.viewport.dpr || 1);
        aggregate.maxRequiredPixelWidth = Math.max(
          aggregate.maxRequiredPixelWidth,
          (media.rect.width || 0) * (result.scenario.viewport.dpr || 1),
        );
        aggregate.maxRequiredPixelHeight = Math.max(
          aggregate.maxRequiredPixelHeight,
          (media.rect.height || 0) * (result.scenario.viewport.dpr || 1),
        );
        if (media.ancestorClipping?.unexpected) aggregate.unexpectedAncestorClipObservations += 1;
        aggregate.maxClippedTop = Math.max(aggregate.maxClippedTop, media.ancestorClipping?.clippedPixels?.top || 0);
        aggregate.maxClippedRight = Math.max(aggregate.maxClippedRight, media.ancestorClipping?.clippedPixels?.right || 0);
        aggregate.maxClippedBottom = Math.max(aggregate.maxClippedBottom, media.ancestorClipping?.clippedPixels?.bottom || 0);
        aggregate.maxClippedLeft = Math.max(aggregate.maxClippedLeft, media.ancestorClipping?.clippedPixels?.left || 0);
        mediaSummary.set(media.mediaId, aggregate);
      }
      await writeRunManifest(`incremental run manifest after ${result.scenario.id}`);
  }

  try {
    if (options.suite === "states" || options.suite === "visual") {
      const groups = new Map();
      for (const scenario of scenarios) {
        const key = `${scenario.page}|${scenario.viewport.name}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(scenario);
      }
      let completed = 0;
      for (const group of groups.values()) {
        const first = group[0];
        const url = scenarioUrl(options, runtime, first);
        process.stdout.write(`[${completed + 1}-${completed + group.length}/${scenarios.length}] ${options.target} ${first.page} ${first.viewport.name} reused-page matrix\n`);
        const results = await captureScenarioBatch({
          browser,
          scenarios: group,
          url,
          outputRoot,
          targetName: options.target,
          browserLabel: options.executablePath || options.channel,
          storageState: options.storageState || null,
        });
        for (const result of results) await recordResult(result);
        completed += group.length;
      }
    } else {
      for (const scenario of scenarios) {
        const url = scenarioUrl(options, runtime, scenario);
        process.stdout.write(`[${scenario.index + 1}/${scenarios.length}] ${options.target} ${scenario.id}\n`);
        const result = await captureScenario({
          browser,
          scenario,
          url,
          outputRoot,
          targetName: options.target,
          browserLabel: options.executablePath || options.channel,
          storageState: options.storageState || null,
        });
        await recordResult(result);
      }
    }
  } finally {
    await browser.close();
    await runtime.close();
  }

  runManifest.completedAt = new Date().toISOString();
  const mediaRecords = [...mediaSummary.values()].sort((left, right) => left.mediaId.localeCompare(right.mediaId));
  await writeFile(
    path.join(outputRoot, "media-summary.json"),
    `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, kind: "media-observation-summary", media: mediaRecords }, null, 2)}\n`,
    "utf8",
  );
  runManifest.summary = {
    captures: runManifest.captures.length,
    fatal: runManifest.captures.filter((capture) => capture.fatal).length,
    non200: runManifest.captures.filter((capture) => capture.status !== 200).length,
    overflow: runManifest.captures.filter((capture) => (capture.pageOverflowX || 0) > 1).length,
    unexpectedMediaClipObservations: runManifest.captures.reduce(
      (sum, capture) => sum + (capture.unexpectedMediaClipping || 0),
      0,
    ),
    axeViolations: runManifest.captures.reduce((sum, capture) => sum + (capture.axeViolations || 0), 0),
    consoleErrors: runManifest.captures.reduce((sum, capture) => sum + capture.consoleErrors, 0),
    requestFailures: runManifest.captures.reduce((sum, capture) => sum + capture.requestFailures, 0),
    stateMismatches: runManifest.captures.filter((capture) => capture.stateMismatch).length,
    intentionalDesignContractFailures: runManifest.captures.reduce(
      (sum, capture) => sum + capture.intentionalDesignContractFailures.length,
      0,
    ),
    observedMedia: mediaRecords.length,
  };
  await writeRunManifest("completed run manifest");
  process.stdout.write(`Run complete: ${outputRoot}\n${JSON.stringify(runManifest.summary, null, 2)}\n`);
  if (
    runManifest.summary.fatal ||
    runManifest.summary.non200 ||
    runManifest.summary.unexpectedMediaClipObservations ||
    runManifest.summary.intentionalDesignContractFailures
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
