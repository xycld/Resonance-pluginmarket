import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

async function fetchStars(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}`
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'resonance-marketplace-bot',
  }
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`
  }

  try {
    const res = await fetch(url, { headers })
    if (!res.ok) {
      console.error(`❌ Failed to fetch ${owner}/${repo}: ${res.status}`)
      return 0
    }
    const data = await res.json()
    return data.stargazers_count ?? 0
  } catch (err) {
    console.error(`❌ Error fetching ${owner}/${repo}: ${err.message}`)
    return 0
  }
}

function getPluginList() {
  const listPath = path.resolve(__dirname, '../plugins-list')
  if (!fs.existsSync(listPath)) return []

  const plugins = []
  for (const file of fs.readdirSync(listPath)) {
    if (!file.endsWith('.json')) continue
    const plugin = JSON.parse(fs.readFileSync(path.join(listPath, file), 'utf-8'))
    if (!plugin.name || !plugin.repo) {
      console.error(`❌ Invalid plugin list entry: ${file}`)
      continue
    }
    plugins.push(plugin)
  }
  return plugins
}

async function main() {
  const plugins = getPluginList()
  if (plugins.length === 0) {
    console.log('No plugins found in plugins-list/')
    return
  }

  const stars = {}
  for (const plugin of plugins) {
    const [owner, repo] = plugin.repo.split('/')
    if (!owner || !repo) {
      console.error(`❌ Invalid repo format: ${plugin.repo}`)
      continue
    }
    const count = await fetchStars(owner, repo)
    stars[plugin.repo] = count
    console.log(`⭐ ${plugin.repo}: ${count}`)
    // Rate limit friendly: sleep 100ms between requests
    await new Promise(r => setTimeout(r, 100))
  }

  const outputPath = path.resolve(__dirname, '../stars.json')
  fs.writeFileSync(outputPath, JSON.stringify(stars, null, 2))
  console.log(`\n✅ Stars saved to stars.json`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
