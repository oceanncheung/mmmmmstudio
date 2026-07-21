#!/usr/bin/env node

import assert from "node:assert/strict";

import { auditSchemaValidators, validateAuditArtifact } from "./schema-validation.mjs";

const state = { theme: "white", face: "serif", scale: "m", shape: "straight" };
const viewport = { name: "compact", width: 390, height: 844, dpr: 3 };

const runManifest = {
  schemaVersion: "mms-audit/v1",
  kind: "run-manifest",
  startedAt: "2026-07-21T00:00:00.000Z",
  completedAt: null,
  target: {
    name: "local-deterministic",
    kind: "fixture",
    description: "schema test",
    authority: "test fixture",
    limitations: [],
  },
  suite: "smoke",
  pageSelection: "home",
  scenarioCount: 1,
  browser: {},
  repository: {},
  baseline: {},
  safety: {},
  determinism: {
    scenarioOrder: "fixed",
    stateMatrix: "test",
    runtimeMutation: false,
    note: "schema validation test",
  },
  captures: [],
  platformProbes: [],
  mediaEvidence: {},
  summary: null,
};

const scenarioCapture = {
  schemaVersion: "mms-audit/v1",
  kind: "scenario-capture",
  capturedAt: "2026-07-21T00:00:00.000Z",
  completedAt: "2026-07-21T00:00:01.000Z",
  target: "local-deterministic",
  browser: "chrome",
  scenario: {
    id: "smoke__0000__home__compact__white-serif-m-straight",
    suite: "smoke",
    page: "home",
    viewport,
    state,
    captureProfile: {},
    url: "http://127.0.0.1:8773/",
    batchReuse: false,
  },
  fatalError: null,
  mainResponse: null,
  dom: {
    intentionalDesignContracts: {
      writeWitheredGreenEyeRoll: {
        applicable: false,
        pageName: "home",
        rootCount: 0,
        directParagraphCount: 0,
        paragraphCoverage: [],
        directParagraphHookCount: 0,
        allHookCount: 0,
        headingHookCount: 0,
        expectedCount: 4,
        valid: true,
      },
    },
  },
  computedStyles: {},
  geometry: {},
  accessibility: {},
  axe: {},
  diagnostics: {
    console: [],
    pageErrors: [],
    unhandledRejections: [],
    windowErrors: [],
    requestFailures: [],
    messagesReceived: [],
    messagesSent: [],
    messageCollection: { scope: "test", sent: "test", received: "test", limitations: [] },
  },
  network: {},
  performance: {},
  screenshot: null,
};

const mediaObservation = {
  schemaVersion: "mms-audit/v1",
  kind: "media-observation",
  scenarioId: scenarioCapture.scenario.id,
  page: "home",
  viewport,
  state,
  mediaId: "fixture-01",
  band: "fixture",
  tag: "img",
  shapePolicy: "crop",
  fit: "contain",
  mobileProfile: "standard",
  rect: {},
  ancestorClipping: {
    visibleRect: {},
    clippedPixels: {},
    retainedWidthRatio: 1,
    retainedHeightRatio: 1,
    clippingAncestors: [],
    horizontalRiverScrollportExcluded: true,
    measurementReliable: true,
    unsupportedGeometry: [],
    exception: null,
    unexpected: false,
  },
  naturalWidth: 100,
  naturalHeight: 100,
  source: "fixture.png",
  poster: "",
};

async function mustReject(kind, value, message) {
  await assert.rejects(
    validateAuditArtifact(kind, value, `negative ${kind} fixture`),
    (error) => error.name === "AuditSchemaValidationError" && error.validationErrors.length > 0,
    message,
  );
}

const compiled = await auditSchemaValidators();
assert.deepEqual(
  Object.keys(compiled.validators).sort(),
  ["mediaObservation", "runManifest", "scenarioCapture"],
  "all three artifact schemas must compile",
);

await validateAuditArtifact("runManifest", runManifest, "valid run fixture");
await validateAuditArtifact("scenarioCapture", scenarioCapture, "valid capture fixture");
await validateAuditArtifact("mediaObservation", mediaObservation, "valid media fixture");

const badRun = structuredClone(runManifest);
badRun.schemaVersion = "mms-audit/v2";
await mustReject("runManifest", badRun, "run schema drift must fail");

const badCapture = structuredClone(scenarioCapture);
delete badCapture.dom.intentionalDesignContracts.writeWitheredGreenEyeRoll.paragraphCoverage;
await mustReject("scenarioCapture", badCapture, "intentional-design evidence schema drift must fail");

const badObservation = structuredClone(mediaObservation);
badObservation.ancestorClipping.retainedWidthRatio = 1.1;
await mustReject("mediaObservation", badObservation, "media schema drift must fail");

process.stdout.write(`${JSON.stringify({
  valid: true,
  compiledSchemas: Object.keys(compiled.validators).sort(),
  negativeProofs: 3,
}, null, 2)}\n`);
