import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  BASELINE_ROOT,
  HARNESS_ROOT,
  PROJECT_ROOT,
  axes,
  captureProfiles,
  pages,
  targetDefinitions,
  viewports,
} from "./config.mjs";
import { allStates, buildPairwiseStates, verifyPairwise } from "./pairwise.mjs";
import { scenarioCounts } from "./scenarios.mjs";
import { auditSchemaValidators } from "./schema-validation.mjs";

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export async function validateConfiguration() {
  const errors = [];
  const warnings = [];
  const states = allStates();
  const pairwise = buildPairwiseStates();
  const pairwiseValidation = verifyPairwise(pairwise);

  const axisProduct = Object.values(axes).reduce((product, values) => product * values.length, 1);
  if (axisProduct !== 240) errors.push(`state-axis product must be 240, found ${axisProduct}`);
  if (states.length !== axisProduct) errors.push(`full state generator returned ${states.length}, expected ${axisProduct}`);
  if (new Set(states.map((state) => JSON.stringify(state))).size !== states.length) {
    errors.push("full state generator contains duplicates");
  }
  if (!pairwiseValidation.valid) errors.push(`pairwise set misses ${pairwiseValidation.missing.length} value pairs`);

  const requiredWidths = [320, 390, 430, 431, 600, 768, 1023, 1024, 1440, 1920, 2560, 2940];
  const actualWidths = new Set(viewports.visual.map((viewport) => viewport.width));
  for (const width of requiredWidths) {
    if (!actualWidths.has(width)) errors.push(`visual viewport matrix is missing ${width}px`);
  }

  const requiredTargets = ["local-deterministic", "cargo-draft-snapshot", "cargo-draft-live", "published"];
  for (const target of requiredTargets) {
    if (!targetDefinitions[target]) errors.push(`target definition is missing: ${target}`);
  }
  for (const [profileName, profile] of Object.entries(captureProfiles)) {
    for (const key of ["dom", "geometry", "accessibility", "axe", "console", "messages", "network", "performance", "scroll", "screenshot"]) {
      if (typeof profile[key] !== "boolean") errors.push(`capture profile ${profileName}.${key} must be boolean`);
    }
  }

  const requiredFiles = [
    path.join(PROJECT_ROOT, "cargo", "assemble-test.sh"),
    path.join(BASELINE_ROOT, "cargo-draft", "global.css"),
    path.join(BASELINE_ROOT, "cargo-draft", "site-head.html"),
    ...Object.keys(pages).map((page) => path.join(BASELINE_ROOT, "cargo-draft", `${page}.bodycopy.html`)),
    ...Object.keys(pages).map((page) => path.join(BASELINE_ROOT, "cargo-draft", `${page}.local.css`)),
    path.join(BASELINE_ROOT, "SHA256SUMS"),
    path.join(PROJECT_ROOT, "audit", "contracts", "intentional-design-contracts.json"),
    path.join(PROJECT_ROOT, "audit", "contracts", "intentional-design-contracts.schema.json"),
    path.join(HARNESS_ROOT, "self-test", "postmessage-parent.html"),
    path.join(HARNESS_ROOT, "self-test", "postmessage-child.html"),
    path.join(HARNESS_ROOT, "src", "self-test.mjs"),
  ];
  for (const file of requiredFiles) {
    if (!(await exists(file))) errors.push(`required baseline input is missing: ${file}`);
  }
  for (const schemaName of ["run.schema.json", "scenario-capture.schema.json", "media-observation.schema.json", "collection-contract.json"]) {
    const schemaPath = path.join(HARNESS_ROOT, "schemas", schemaName);
    if (!(await exists(schemaPath))) {
      errors.push(`required schema is missing: ${schemaPath}`);
      continue;
    }
    try {
      const schema = JSON.parse(await readFile(schemaPath, "utf8"));
      if (schema.schemaVersion !== "mms-audit/v1" && schema.properties?.schemaVersion?.const !== "mms-audit/v1") {
        errors.push(`schema does not declare mms-audit/v1: ${schemaPath}`);
      }
    } catch (error) {
      errors.push(`schema is not valid JSON: ${schemaPath}: ${error.message}`);
    }
  }
  try {
    const compiled = await auditSchemaValidators();
    const compiledKinds = Object.keys(compiled.validators).sort();
    const expectedKinds = ["mediaObservation", "runManifest", "scenarioCapture"];
    if (JSON.stringify(compiledKinds) !== JSON.stringify(expectedKinds)) {
      errors.push(`Ajv schema compiler returned ${compiledKinds.join(", ")}; expected ${expectedKinds.join(", ")}`);
    }
  } catch (error) {
    errors.push(`Ajv failed to compile the audit artifact schemas: ${error.message}`);
  }
  if (await exists(path.join(BASELINE_ROOT, "SHA256SUMS"))) {
    const checksums = await readFile(path.join(BASELINE_ROOT, "SHA256SUMS"), "utf8");
    if (!checksums.includes("cargo-draft/global.css")) warnings.push("root checksum index does not mention cargo-draft/global.css");
  }

  const intentionalContractsPath = path.join(
    PROJECT_ROOT,
    "audit",
    "contracts",
    "intentional-design-contracts.json",
  );
  if (await exists(intentionalContractsPath)) {
    try {
      const payload = JSON.parse(await readFile(intentionalContractsPath, "utf8"));
      const withered = payload.contracts?.find((contract) => contract.id === "write-withered-green-eye-roll");
      const expectedSelector = '.mms-writing-withered .mms-writing-plate > p > span[uses="eye-roll"]';
      const expectedForbidden = '.mms-writing-withered h1 [uses="eye-roll"], .mms-writing-withered h1[uses="eye-roll"]';
      if (
        !withered ||
        withered.status !== "required" ||
        !withered.authority ||
        withered.page !== "write" ||
        withered.selector !== expectedSelector ||
        withered.expected_count !== 4 ||
        withered.forbidden_selector !== expectedForbidden ||
        withered.implementation?.provider !== "Cargo native effect" ||
        withered.implementation?.effect !== "eye-roll" ||
        withered.implementation?.fixed_angle_required !== false
      ) {
        errors.push("intentional-design contract must preserve the complete Withered green eye-roll structure");
      }
    } catch (error) {
      errors.push(`intentional-design contract is not valid JSON: ${intentionalContractsPath}: ${error.message}`);
    }
  }

  const collectionContractPath = path.join(HARNESS_ROOT, "schemas", "collection-contract.json");
  if (await exists(collectionContractPath)) {
    try {
      const contract = JSON.parse(await readFile(collectionContractPath, "utf8"));
      const expectedPhases = ["startup", "scroll-measurement", "checkpoint-traversal", "post-checkpoint"];
      if (JSON.stringify(contract.networkPhases) !== JSON.stringify(expectedPhases)) {
        errors.push(`network phase contract must be ${expectedPhases.join(", ")}`);
      }
      if (!Array.isArray(contract.postMessageLimitations) || contract.postMessageLimitations.length < 4) {
        errors.push("postMessage limitation contract is incomplete");
      }
    } catch (error) {
      // The schema parse loop above already records the malformed JSON.
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    counts: scenarioCounts(),
    axes,
    pairwiseCoverage: {
      valid: pairwiseValidation.valid,
      stateCount: pairwise.length,
      missingPairs: pairwiseValidation.missing,
    },
    targets: targetDefinitions,
    viewports: {
      compact: viewports.compact,
      expanded: viewports.expanded,
      visual: viewports.visual,
    },
  };
}
