# MM.S Framer API

Minimal Node scaffold for the [Framer Server API](https://www.framer.com/developers/server-api-quick-start). Connects to a Framer project, prints its info, disconnects.

## Prerequisites

- Node.js **22.7+** (uses the built-in `--env-file-if-exists` flag — no `dotenv` dependency)
- A Framer project + API key

## Setup

1. **Generate an API key** in Framer: open your project → **Site Settings → General** → create API key. Save it somewhere safe.
2. **Configure env:**
   ```sh
   cp .env.example .env
   ```
   Edit `.env` and set `FRAMER_PROJECT_URL` (the URL of your project, e.g. `https://framer.com/projects/<id>`) and `FRAMER_API_KEY`.
3. **Install:**
   ```sh
   npm install
   ```

## Run

### Hello world (project info)
```sh
npm start
```
Prints `Project: <name>` and the full project info object.

### Read the design system
```sh
npm run read:design
```
Pulls all color styles and text styles from the project, prints a summary, and writes `design-system.json` with structured tokens you can feed into other tooling.

Sample output:
```
Color styles (6):
  /Text color  →  rgb(0, 0, 0)   dark: rgb(255, 255, 255)
  /BGcolor  →  rgb(255, 255, 255)   dark: rgb(18, 18, 18)
  ...
Text styles (14):
  [h1] /Heading 1 → Inter 500 84px
  [p] /Body M → Inter 500 24px
  ...
Fonts in use (1): Inter
```

## Files

- `index.mjs` — entrypoint: `connect()` → `getProjectInfo()` → `disconnect()`
- `read-design-system.mjs` — pulls color/text styles + fonts, writes `design-system.json`
- `package.json` — declares `framer-api` dependency and npm scripts
- `.env.example` — template for required env vars (copy to `.env`)
- `.gitignore` — excludes `node_modules/`, `.env`, generated `design-system.json`

## What else the SDK exposes

The `framer-api` client gives access to far more than just styles. Notable methods on the client:

- **Design tokens** — `getColorStyles()`, `getTextStyles()`, `getFonts()`
- **Canvas / page tree** — `getCanvasRoot()`, `getNode(id)`, `getNodesWithType("ComponentNode" | "TextNode" | "FrameNode" | ...)`
- **Components & code files** — `getCodeFiles()`, `getCodeFile(id)`
- **CMS collections** — `getCollections()`, `getCollection(id)`, `getManagedCollections()`
- **Locales / i18n** — `getLocales()`, `getDefaultLocale()`, `getLocalizationGroups()`
- **Publishing** — `getChangedPaths()`, `publish()`, `deploy(deploymentId)`, `getPublishInfo()`

Full TypeScript types are in `node_modules/framer-api/dist/index.d.ts`.
