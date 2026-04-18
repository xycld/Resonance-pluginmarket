import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import archiver from 'archiver'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const COMPULSORY_FIELDS = ['name', 'author', 'version', 'description']
const OPTIONAL_FIELDS = ['permissions', 'hooks', 'providers', 'entry', 'ui_entry', 'cover', 'api_version']

async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('error', reject)
    stream.on('data', chunk => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

async function packDirectory(srcDir, destZip) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destZip)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => resolve())
    archive.on('error', reject)
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') reject(err)
    })

    archive.pipe(output)
    archive.directory(srcDir, false)
    archive.finalize()
  })
}

function getPluginList() {
  const listPath = path.resolve(__dirname, '../plugins-list')
  if (!fs.existsSync(listPath)) return {}

  const map = {}
  for (const file of fs.readdirSync(listPath)) {
    if (!file.endsWith('.json')) continue
    const plugin = JSON.parse(fs.readFileSync(path.join(listPath, file), 'utf-8'))
    if (plugin.name) map[plugin.name] = plugin
  }
  return map
}

function getStars() {
  const starsPath = path.resolve(__dirname, '../stars.json')
  if (!fs.existsSync(starsPath)) return {}
  return JSON.parse(fs.readFileSync(starsPath, 'utf-8'))
}

async function main() {
  const dataPath = path.resolve(__dirname, '../plugins-data')
  const outputPath = path.resolve(__dirname, '../plugins.json')
  const previewDir = path.resolve(__dirname, '../previews')

  if (!fs.existsSync(dataPath)) {
    console.log('No plugins-data/ found')
    fs.writeFileSync(outputPath, JSON.stringify({ schema_version: 1, last_updated: new Date().toISOString(), plugins: [] }, null, 2))
    return
  }

  fs.mkdirSync(previewDir, { recursive: true })

  const pluginListMap = getPluginList()
  const starsMap = getStars()
  const plugins = []

  const entries = fs.readdirSync(dataPath)
  for (const entry of entries) {
    const pluginDir = path.join(dataPath, entry)
    const manifestPath = path.join(pluginDir, 'manifest.json')
    if (!fs.existsSync(manifestPath)) continue

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

    // Validate compulsory fields
    for (const field of COMPULSORY_FIELDS) {
      if (!manifest[field]) {
        console.error(`❌ ${entry} missing field: ${field}`)
        continue
      }
    }

    // Pack ZIP
    const zipName = `${manifest.name}-${manifest.version}.zip`
    const zipPath = path.join(pluginDir, zipName)
    await packDirectory(pluginDir, zipPath)

    const zipStats = fs.statSync(zipPath)
    const zipSha256 = await sha256File(zipPath)

    // Size check
    const sizeKiB = zipStats.size / 1024
    if (sizeKiB > 5120) {
      console.error(`❌ ${entry} ZIP exceeds 5MB, skipping`)
      fs.unlinkSync(zipPath)
      continue
    } else if (sizeKiB > 1024) {
      console.warn(`⚠️ ${entry} ZIP exceeds 1MB (${Math.round(sizeKiB)}KiB)`)
    }

    // Extract preview
    let coverUrl = undefined
    if (manifest.cover) {
      const coverSrc = path.join(pluginDir, manifest.cover)
      if (fs.existsSync(coverSrc)) {
        const ext = path.extname(manifest.cover) || '.png'
        const coverDest = path.join(previewDir, `${manifest.name}${ext}`)
        fs.copyFileSync(coverSrc, coverDest)
        coverUrl = `previews/${manifest.name}${ext}`
      }
    }

    // Build registry entry
    const pluginEntry = {
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      permissions: manifest.permissions || [],
      hooks: manifest.hooks || [],
      api_version: manifest.api_version || '3.0',
      has_ui: !!manifest.ui_entry,
      cover_url: coverUrl,
      download_url: `plugins-data/${manifest.name}/${zipName}`,
      source_repo: pluginListMap[manifest.name]?.repo ? `https://github.com/${pluginListMap[manifest.name].repo}` : undefined,
      stars: starsMap[pluginListMap[manifest.name]?.repo] ?? 0,
      size: zipStats.size,
      sha256: zipSha256,
    }

    // Optional fields
    for (const field of OPTIONAL_FIELDS) {
      if (manifest[field] !== undefined) {
        pluginEntry[field] = manifest[field]
      }
    }

    plugins.push(pluginEntry)
    console.log(`📦 ${manifest.name} ${manifest.version} packed (${Math.round(sizeKiB)}KiB)`)
  }

  const index = {
    schema_version: 1,
    last_updated: new Date().toISOString(),
    plugins: plugins.sort((a, b) => a.name.localeCompare(b.name))
  }

  fs.writeFileSync(outputPath, JSON.stringify(index, null, 2))
  console.log(`\n✅ Generated plugins.json with ${plugins.length} plugins`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
