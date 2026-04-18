import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Ajv from 'ajv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../manifest-schema.json'), 'utf-8'))
const ajv = new Ajv({ strict: false })
const validate = ajv.compile(schema)

const FORBIDDEN_PATTERNS = [
  /\beval\s*\(/,
  /\bchild_process\b/,
  /\brequire\s*\(\s*['"]fs['"]\s*\)/,
  /\brequire\s*\(\s*['"]os['"]\s*\)/,
  /\brequire\s*\(\s*['"]path['"]\s*\)/,
  /\bdocument\.write\s*\(/,
  /\.innerHTML\s*=/,
]

function validateManifest(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  const valid = validate(manifest)
  if (!valid) {
    return { ok: false, errors: validate.errors.map(e => `${e.instancePath || 'root'}: ${e.message}`) }
  }
  return { ok: true, manifest }
}

function scanCode(dir) {
  const errors = []
  const files = fs.readdirSync(dir)
  for (const file of files) {
    if (!file.endsWith('.js')) continue
    const content = fs.readFileSync(path.join(dir, file), 'utf-8')
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) {
        errors.push(`Forbidden pattern in ${file}: ${pattern.source}`)
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
