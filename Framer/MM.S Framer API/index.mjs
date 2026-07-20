import { connect } from "framer-api"

const projectUrl = process.env.FRAMER_PROJECT_URL
const apiKey = process.env.FRAMER_API_KEY

if (!projectUrl || !apiKey) {
  console.error("Missing FRAMER_PROJECT_URL or FRAMER_API_KEY. Copy .env.example to .env and fill in values.")
  process.exit(1)
}

const framer = await connect(projectUrl, apiKey)

try {
  const projectInfo = await framer.getProjectInfo()
  console.log(`Project: ${projectInfo.name}`)
  console.log(projectInfo)
} finally {
  await framer.disconnect()
}
