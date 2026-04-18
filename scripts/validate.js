import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Ajv from 'ajv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let schema
let validate

try {
  const schemaContent = fs.readFileSync(path.resolve(__dirname, '../manifest-schema.json'), 'utf-8')
  schema = JSON.parse(schemaContent)
} catch (err) {
  console.error(`❌ Failed to load manifest schema: ${err.message}`)
  process.exit(1)
}

const ajv = new Ajv({ strict: false })
try {
  validate = ajv.compile(schema)
} catch (err) {
  console.error(`❌ Failed to compile schema: ${err.message}`)
  process.exit(1)
}

const FORBIDDEN_PATTERNS = [
  /\beval\s*\(/,
  /\bchild_process\b/,
  /\brequire\s*\(\s*['"]fs['"]\s*\)/,
  /\brequire\s*\(\s*['"]os['"]\s*\)/,
  /\brequire\s*\(\s*['"]path['"]\s*\)/,
  /\brequire\s*\(\s*['"]node:fs['"]\s*\)/,
  /\brequire\s*\(\s*['"]node:os['"]\s*\)/,
  /\brequire\s*\(\s*['"]node:path['"]\s*\)/,
  /\bdocument\.write\s*\(/,
  /\.innerHTML\s*=/,
]

function validateManifest(manifestPath) {
  let manifest
  try {
    const content = fs.readFileSync(manifestPath, 'utf-8')
    manifest = JSON.parse(content)
  } catch (err) {
    return { ok: false, errors: [`Failed to read or parse manifest.json: ${err.message}`] }
  }
  const valid = validate(manifest)
  if (!valid) {
    return { ok: false, errors: validate.errors.map(e => `${e.instancePath || 'root'}: ${e.message}`) }
  }
  return { ok: true, manifest }
}

function scanCode(dir) {
  const errors = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      errors.push(...scanCode(fullPath))
    } else if (entry.isFile() && /\.(js|mjs|cjs)$/i.test(entry.name)) {
      let content
      try {
        content = fs.readFileSync(fullPath, 'utf-8')
      } catch (err) {
        errors.push(`Failed to read ${fullPath}: ${err.message}`)
        continue
      }
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          errors.push(`Forbidden pattern in ${fullPath}: ${pattern.source}`)
        }
      }
    }
  }
  return errors
}

function main() {
  const pluginDir = process.argv[2]
  if (!pluginDir) {
    console.error('Usage: node validate.js <plugin-dir>')
    process.exit(1)
  }

  const manifestPath = path.join(pluginDir, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ manifest.json not found')
    process.exit(1)
  }

  const manifestResult = validateManifest(manifestPath)
  if (!manifestResult.ok) {
    console.error('❌ Manifest validation failed:')
    manifestResult.errors.forEach(e => console.error(`   - ${e}`))
    process.exit(1)
  }

  const scanErrors = scanCode(pluginDir)
  if (scanErrors.length > 0) {
    console.error('❌ Code scan failed:')
    scanErrors.forEach(e => console.error(`   - ${e}`))
    process.exit(1)
  }

  console.log('✅ Validation passed')
}

main()
