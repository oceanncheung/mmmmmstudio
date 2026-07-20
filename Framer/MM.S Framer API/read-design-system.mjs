import { connect } from "framer-api"
import { writeFile } from "node:fs/promises"

const projectUrl = process.env.FRAMER_PROJECT_URL
const apiKey = process.env.FRAMER_API_KEY

if (!projectUrl || !apiKey) {
  console.error("Missing FRAMER_PROJECT_URL or FRAMER_API_KEY. Copy .env.example to .env and fill in values.")
  process.exit(1)
}

const framer = await connect(projectUrl, apiKey)

try {
  const [colorStyles, textStyles, projectInfo] = await Promise.all([
    framer.getColorStyles(),
    framer.getTextStyles(),
    framer.getProjectInfo(),
  ])

  const colors = colorStyles.map(c => ({
    id: c.id,
    name: c.name,
    path: c.path,
    light: c.light,
    dark: c.dark,
  }))

  const text = textStyles.map(t => ({
    id: t.id,
    name: t.name,
    path: t.path,
    tag: t.tag,
    fontSize: t.fontSize,
    lineHeight: t.lineHeight,
    letterSpacing: t.letterSpacing,
    paragraphSpacing: t.paragraphSpacing,
    color: typeof t.color === "string" ? t.color : (t.color?.light ?? null),
    fontFamily: t.font?.family ?? null,
    fontWeight: t.font?.weight ?? null,
    fontStyle: t.font?.style ?? null,
    transform: t.transform,
    alignment: t.alignment,
    decoration: t.decoration,
    breakpoints: (t.breakpoints ?? []).map(b => ({
      minWidth: b.minWidth,
      fontSize: b.fontSize,
      lineHeight: b.lineHeight,
      letterSpacing: b.letterSpacing,
      paragraphSpacing: b.paragraphSpacing,
    })),
  }))

  const usedFonts = new Map()
  for (const t of textStyles) {
    for (const variant of [t.font, t.boldFont, t.italicFont, t.boldItalicFont]) {
      if (!variant) continue
      const key = `${variant.family}|${variant.weight ?? ""}|${variant.style ?? ""}`
      if (!usedFonts.has(key)) {
        usedFonts.set(key, {
          family: variant.family,
          weight: variant.weight,
          style: variant.style,
          selector: variant.selector,
        })
      }
    }
  }
  const fontList = [...usedFonts.values()]

  const out = {
    project: { id: projectInfo.id, name: projectInfo.name },
    colorStyles: colors,
    textStyles: text,
    fonts: fontList,
  }

  console.log(`Project: ${projectInfo.name}`)
  console.log("")
  console.log(`Color styles (${colors.length}):`)
  for (const c of colors) {
    const dark = c.dark ? `   dark: ${c.dark}` : ""
    console.log(`  ${c.path || c.name}  →  ${c.light}${dark}`)
  }
  console.log("")
  console.log(`Text styles (${text.length}):`)
  for (const t of text) {
    const family = t.fontFamily ? ` ${t.fontFamily}` : ""
    const weight = t.fontWeight ? ` ${t.fontWeight}` : ""
    const size = t.fontSize ? ` ${t.fontSize}` : ""
    console.log(`  [${t.tag}] ${t.path || t.name} →${family}${weight}${size}`)
  }
  console.log("")
  const families = [...new Set(fontList.map(f => f.family))].sort()
  console.log(`Fonts in use (${families.length}): ${families.join(", ")}`)
  for (const f of fontList) {
    console.log(`  ${f.family} ${f.weight ?? "?"} ${f.style ?? ""}`.trimEnd())
  }

  await writeFile("design-system.json", JSON.stringify(out, null, 2))
  console.log("")
  console.log("Wrote design-system.json")
} finally {
  await framer.disconnect()
}
