import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { connect } from "framer-api"

assert.equal(typeof connect, "function", "framer-api must retain the connect() export")

const fixtureRoot = await mkdtemp(join(tmpdir(), "mms-framer-helper-smoke-"))
const packageRoot = join(fixtureRoot, "node_modules", "framer-api")
await mkdir(packageRoot, { recursive: true })
await writeFile(join(fixtureRoot, "package.json"), JSON.stringify({ private: true, type: "module" }))
await writeFile(
  join(packageRoot, "package.json"),
  JSON.stringify({ name: "framer-api", version: "0.0.0-test", type: "module", exports: "./index.mjs" }),
)
await writeFile(
  join(packageRoot, "index.mjs"),
  `import { appendFile } from "node:fs/promises"

const values = {
  getProjectInfo: { id: "project-id", name: "MM.S" },
  getColorStyles: [{ id: "color-1", name: "Ink", path: "/Ink", light: "#000000", dark: "#ffffff" }],
  getTextStyles: [{
    id: "text-1", name: "Body", path: "/Body", tag: "p", fontSize: 20, lineHeight: 24,
    letterSpacing: 0, paragraphSpacing: 12, color: { light: "#000000" },
    font: { family: "Test Serif", weight: 400, style: "normal", selector: "test-serif-400" },
    boldFont: null, italicFont: null, boldItalicFont: null, transform: "none", alignment: "left",
    decoration: "none", breakpoints: [{ minWidth: 768, fontSize: 22, lineHeight: 26, letterSpacing: 0, paragraphSpacing: 14 }],
  }],
}

async function record(method) {
  await appendFile(process.env.MMS_TEST_LOG, JSON.stringify({ method }) + "\\n")
}

export async function connect(projectUrl, apiKey) {
  if (!projectUrl || !apiKey) throw new Error("explicit test credentials required")
  await record("connect")
  return new Proxy({}, {
    get(_target, property) {
      if (property === "then") return undefined
      if (property === "disconnect") {
        return async () => record("disconnect")
      }
      if (!(property in values)) {
        throw new Error("unreviewed Framer client property: " + String(property))
      }
      return async () => {
        await record(String(property))
        if (process.env.MMS_TEST_FAIL_METHOD === property) throw new Error("fixture read failure")
        return values[property]
      }
    },
  })
}
`,
)

for (const file of ["index.mjs", "read-design-system.mjs"]) {
  await cp(new URL(file, import.meta.url), join(fixtureRoot, file))
}

let runSequence = 0

function run(file, overrides = {}) {
  runSequence += 1
  const environment = {
    ...process.env,
    FRAMER_PROJECT_URL: "https://framer.com/projects/read-only-fixture",
    FRAMER_API_KEY: "fixture-key",
    MMS_TEST_LOG: join(fixtureRoot, `${file}.${runSequence}.log`),
    ...overrides,
  }
  for (const [key, value] of Object.entries(environment)) {
    if (value === undefined) delete environment[key]
  }
  return new Promise(resolve => {
    const child = spawn(process.execPath, [file], { cwd: fixtureRoot, env: environment })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", chunk => { stdout += chunk })
    child.stderr.on("data", chunk => { stderr += chunk })
    child.on("close", status => resolve({ status, stdout, stderr, log: environment.MMS_TEST_LOG }))
  })
}

async function readLog(path) {
  try {
    return (await readFile(path, "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line).method)
  } catch (error) {
    if (error.code === "ENOENT") return []
    throw error
  }
}

const infoRun = await run("index.mjs")
assert.equal(infoRun.status, 0, infoRun.stderr)
assert.deepEqual(await readLog(infoRun.log), ["connect", "getProjectInfo", "disconnect"])
assert.match(infoRun.stdout, /Project: MM\.S/)

const designRun = await run("read-design-system.mjs")
assert.equal(designRun.status, 0, designRun.stderr)
assert.deepEqual(
  (await readLog(designRun.log)).sort(),
  ["connect", "disconnect", "getColorStyles", "getProjectInfo", "getTextStyles"].sort(),
)
const design = JSON.parse(await readFile(join(fixtureRoot, "design-system.json"), "utf8"))
assert.deepEqual(design.project, { id: "project-id", name: "MM.S" })
assert.equal(design.colorStyles.length, 1)
assert.equal(design.textStyles.length, 1)
assert.deepEqual(design.fonts, [{ family: "Test Serif", weight: 400, style: "normal", selector: "test-serif-400" }])

await writeFile(join(fixtureRoot, "design-system.json"), "sentinel")
const failedRun = await run("read-design-system.mjs", { MMS_TEST_FAIL_METHOD: "getColorStyles" })
assert.notEqual(failedRun.status, 0, "a failed remote read must fail the helper")
assert.equal(await readFile(join(fixtureRoot, "design-system.json"), "utf8"), "sentinel")
assert.ok((await readLog(failedRun.log)).includes("disconnect"), "a failed read must still disconnect")

const missingEnvRun = await run("index.mjs", { FRAMER_PROJECT_URL: undefined, FRAMER_API_KEY: undefined })
assert.equal(missingEnvRun.status, 1)
assert.deepEqual(await readLog(missingEnvRun.log), [])

assert.deepEqual(
  new Set(await readdir(fixtureRoot)),
  new Set([
    "package.json",
    "node_modules",
    "index.mjs",
    "read-design-system.mjs",
    "design-system.json",
    "index.mjs.1.log",
    "read-design-system.mjs.2.log",
    "read-design-system.mjs.3.log",
  ]),
  "the helper entrypoints must not create unreviewed local output",
)
console.log("Framer helper dependency/API smoke test: PASS")
