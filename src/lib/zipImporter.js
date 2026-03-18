// ── zipImporter.js ───────────────────────────────────────────
// Reads a CWC Builder ZIP and reconstructs the full project
// state, ready to pass to updateProject().
// ─────────────────────────────────────────────────────────────

import JSZip from 'jszip'

// ── Main import function ──────────────────────────────────────
export async function importZip(file) {
  const zip = await JSZip.loadAsync(file)

  // ── Read files ────────────────────────────────────────────
  const readText = async (path) => {
    const f = zip.file(path)
    return f ? await f.async('string') : null
  }

  const manifestRaw = await readText('manifest.json')
  const codeJs      = await readText('control/code.js')      || ''
  const indexHtml   = await readText('control/index.html')   || ''
  const themeCss    = await readText('control/libraries/theme.css') || ''

  if (!manifestRaw) throw new Error('manifest.json not found in ZIP.')

  let manifest
  try {
    manifest = JSON.parse(manifestRaw)
  } catch {
    throw new Error('manifest.json is not valid JSON.')
  }

  const identity = manifest?.control?.identity  || {}
  const api      = manifest?.control?.contracts?.api || {}

  // ── Step 2 — Metadata ────────────────────────────────────
  const guidMatch = (identity.type || '').match(/guid:\/\/(.+)/)
  const metadata = {
    name:        identity.name        || '',
    guid:        guidMatch ? guidMatch[1].toLowerCase() : '',
    version:     identity.version     || '1',
    displayname: identity.displayname || identity.name || '',
    description: identity.description || '',
    iconData:    null,
    iconName:    'icon.ico',
  }

  // Try to read icon from assets/ — ICO only, skip any other format
  const iconFile = zip.file(/^assets\/.*\.ico$/i)[0]
  if (iconFile) {
    const iconBase64 = await iconFile.async('base64')
    metadata.iconData = `data:image/x-icon;base64,${iconBase64}`
    metadata.iconName = iconFile.name.replace(/^assets\//, '')
  }
  // If no ico found, iconData stays null → zipExporter uses cwc-builder.ico as default

  // ── Step 3 — Properties ───────────────────────────────────
  const propsObj = api.properties || {}
  const properties = Object.entries(propsObj).map(([name, def]) => ({
    id:           crypto.randomUUID(),
    name,
    type:         mapTypeIn(def.type),
    defaultValue: def.default !== undefined && def.default !== null
                    ? String(def.default)
                    : '',
  }))

  // ── Step 3 — Events ───────────────────────────────────────
  const eventsObj = api.events || {}
  const events = Object.entries(eventsObj).map(([name, def]) => {
    const args = def.arguments || {}
    return {
      id:         crypto.randomUUID(),
      name,
      parameters: Object.keys(args).join(', '),
      paramTypes: Object.values(args).map(a => mapTypeIn(a.type)).join(', '),
    }
  })

  // ── Step 3 — Methods ──────────────────────────────────────
  const methodsObj = api.methods || {}
  const methods = Object.entries(methodsObj).map(([name, def]) => {
    const params = def.parameters || {}
    return {
      id:         crypto.randomUUID(),
      name,
      parameters: Object.keys(params).join(', '),
      paramTypes: Object.values(params).map(p => mapTypeIn(p.type)).join(', '),
    }
  })

  // ── Step 1 — Libraries ────────────────────────────────────
  // Read all files from control/libraries/ except webcc.min.js and theme.css
  const libraryEntries = []
  zip.folder('control/libraries').forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return
    if (relativePath === 'webcc.min.js') return
    if (relativePath === 'theme.css') return
    libraryEntries.push({ relativePath, zipEntry })
  })

  const libraries = await Promise.all(
    libraryEntries.map(async ({ relativePath, zipEntry }) => ({
      id:      crypto.randomUUID(),
      name:    relativePath,
      content: await zipEntry.async('string'),
    }))
  )

  return {
    libraries,
    metadata,
    properties,
    events,
    methods,
    codeJs,
    indexHtml,
    themeCss,
  }
}

// ── Map manifest types back to internal types ─────────────────
function mapTypeIn(type) {
  switch (type) {
    case 'number':  return 'number'
    case 'boolean': return 'boolean'
    default:        return 'string'
  }
}