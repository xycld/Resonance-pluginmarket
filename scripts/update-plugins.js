import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

async function fetchLatestRelease(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'resonance-marketplace-bot',
  }
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`
  }

  try {
    const res = await fetch(url, { headers })
    if (res.status === 404) {
      // No releases, try tags
      return fetchLatestTag(owner, repo, headers)
    }
    if (!res.ok) {
      console.error(`Failed to fetch release for ${owner}/${repo}: ${res.status}`)
      return null
    }
    const data = await res.json()
    return {
      version: data.tag_name?.replace(/^v/, '') || 'unknown',
      published_at: data.published_at,
      tarball_url: data.tarball_url,
      zipball_url: data.zipball_url,
    }
  } catch (err) {
    console.error(`Error fetching release for ${owner}/${repo}: ${err.message}`)
    return null
  }
}

async function fetchLatestTag(owner, repo, headers) {
  const url = `https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`
  try {
    const res = await fetch(url, { headers })
    if (!res.ok) return null
    const data = await res.json()
    if (data.length === 0) return null
    return {
      version: data[0].name?.replace(/^v/, '') || 'unknown',
      published_at: null,
      tarball_url: data[0].tarball_url,
      zipball_url: data[0].zipball_url,
    }
  } catch (err) {
    return null
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
      console.error(`Invalid plugin list entry: ${file}`)
      continue
    }
    plugins.push(plugin)
  }
  return plugins
}

function getInstalledVersion(pluginName) {
  const dataPath = path.resolve(__dirname, '../plugins-data', pluginName, 'manifest.json')
  if (!fs.existsSync(dataPath)) return null
  const manifest = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  return manifest.version || null
}

async function main() {
  const plugins = getPluginList()
  if (plugins.length === 0) {
    console.log('No plugins found in plugins-list/')
    return
  }

  let updatesFound = 0

  for (const plugin of plugins) {
    const [owner, repo] = plugin.repo.split('/')
    if (!owner || !repo) {
      console.error(`Invalid repo format: ${plugin.repo}`)
      continue
    }

    const latest = await fetchLatestRelease(owner, repo)
    if (!latest) {
      console.log(`⚠️ ${plugin.name}: could not fetch latest version`)
      continue
    }

    const installedVersion = getInstalledVersion(plugin.name)

    if (!installedVersion) {
      console.log(`📥 ${plugin.name}: not installed yet (latest: ${latest.version})`)
      updatesFound++
    } else if (installedVersion !== latest.version) {
      console.log(`⬆️ ${plugin.name}: ${installedVersion} → ${latest.version}`)
      updatesFound++
    } else {
      console.log(`✅ ${plugin.name}: up to date (${installedVersion})`)
    }

    // Rate limit friendly
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n${updatesFound} update(s) available`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
