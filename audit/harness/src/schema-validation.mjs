import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_ROOT = path.resolve(HERE, "../schemas");

const SCHEMA_FILES = Object.freeze({
  runManifest: "run.schema.json",
  scenarioCapture: "scenario-capture.schema.json",
  mediaObservation: "media-observation.schema.json",
});

let compiledPromise;

function errorPath(error) {
  const location = error.instancePath || "/";
  if (error.keyword === "required" && error.params?.missingProperty) {
    return `${location === "/" ? "" : location}/${error.params.missingProperty}` || "/";
  }
  return location;
}

export function formatSchemaErrors(errors = []) {
  return errors.map((error) => {
    const params = error.params && Object.keys(error.params).length
      ? ` (${JSON.stringify(error.params)})`
      : "";
    return `${errorPath(error)} ${error.message || error.keyword}${params}`;
  });
}

async function compileSchemas() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    validateFormats: true,
  });
  addFormats(ajv);

  const schemas = {};
  for (const [kind, filename] of Object.entries(SCHEMA_FILES)) {
    const schemaPath = path.join(SCHEMA_ROOT, filename);
    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    schemas[kind] = { filename, schema };
    ajv.addSchema(schema);
  }

  const validators = {};
  for (const [kind, { filename, schema }] of Object.entries(schemas)) {
    const validator = ajv.getSchema(schema.$id);
    if (!validator) throw new Error(`Ajv did not compile ${filename}`);
    validators[kind] = validator;
  }

  return Object.freeze({ ajv, schemas, validators });
}

export async function auditSchemaValidators() {
  if (!compiledPromise) compiledPromise = compileSchemas();
  return compiledPromise;
}

export async function validateAuditArtifact(kind, value, label = kind) {
  const { validators } = await auditSchemaValidators();
  const validator = validators[kind];
  if (!validator) throw new Error(`unknown audit schema kind: ${kind}`);

  const valid = validator(value);
  if (!valid) {
    const details = formatSchemaErrors(validator.errors);
    const error = new Error(
      `${label} failed ${kind} JSON Schema validation:\n${details.map((detail) => `- ${detail}`).join("\n")}`,
    );
    error.name = "AuditSchemaValidationError";
    error.schemaKind = kind;
    error.validationErrors = structuredClone(validator.errors || []);
    throw error;
  }
  return true;
}

export const auditSchemaFiles = SCHEMA_FILES;
