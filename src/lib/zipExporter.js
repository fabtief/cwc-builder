import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { generateManifest } from './manifestGenerator'
import webccMinJs from './webcc.min.js?raw'
import defaultIconUrl from '/cwc-builder.ico?url'

// ── Load default icon as base64 (ICO, lazy + cached) ─────────
let _defaultIconCache = null
async function getDefaultIconBase64() {
  if (_defaultIconCache) return _defaultIconCache
  try {
    const res    = await fetch(defaultIconUrl)
    if (!res.ok) throw new Error('fetch failed')
    const buffer = await res.arrayBuffer()
    const bytes  = new Uint8Array(buffer)
    let binary   = ''
    bytes.forEach(b => { binary += String.fromCharCode(b) })
    _defaultIconCache = btoa(binary)
    return _defaultIconCache
  } catch {
    return null // no fallback — skip icon entirely
  }
}

// ── Main export ───────────────────────────────────────────────
export async function exportZip(project, includeTheme = false) {
  const zip = new JSZip()
  const { metadata, libraries, codeJs, indexHtml, themeCss, properties, events, methods } = project
  const guid = metadata.guid

  // ── Resolve icon (ICO only) ───────────────────────────────
  let iconBase64, iconFileName
  if (metadata.iconData) {
    const match = metadata.iconData.match(/^data:[^;]+;base64,(.+)$/)
    iconBase64   = match ? match[1] : null
    iconFileName = metadata.iconName || 'icon.ico'
  } else {
    iconBase64   = await getDefaultIconBase64()
    iconFileName = 'icon.ico'
  }

  // ── manifest.json ─────────────────────────────────────────
  zip.file('manifest.json', generateManifest(metadata, properties, events, methods, iconFileName))

  // ── assets/ ───────────────────────────────────────────────
  if (iconBase64) {
    zip.folder('assets').file(iconFileName, iconBase64, { base64: true })
  }

  // ── control/ ─────────────────────────────────────────────
  const control   = zip.folder('control')
  const libFolder = control.folder('libraries')

  libFolder.file('webcc.min.js', webccMinJs)
  libraries
    .filter(l => l.name.trim() && l.content.trim())
    .forEach(l => libFolder.file(l.name, l.content))

  // ── theme.css (optional bundle) ───────────────────────────
  // Inject a <link> tag so WinCC actually loads the CSS.
  let finalIndexHtml = indexHtml || ''
  if (includeTheme && themeCss) {
    const stripped = stripThemeInfoComment(themeCss)
    if (stripped.trim()) {
      libFolder.file('theme.css', stripped)
      if (!finalIndexHtml.includes('theme.css')) {
        finalIndexHtml = finalIndexHtml.replace(
          /(<\/head>)/i,
          '  <link rel="stylesheet" href="./libraries/theme.css" />\n$1'
        )
      }
    }
  }

  control.file('index.html', finalIndexHtml)
  control.file('code.js', codeJs || '// No code defined')

  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `{${guid}}.zip`)
}

// ── Download theme.css standalone ────────────────────────────
export function downloadThemeCss(themeCss) {
  const stripped = stripThemeInfoComment(themeCss)
  if (!stripped.trim()) return
  const blob = new Blob([stripped], { type: 'text/css' })
  saveAs(blob, 'theme.css')
}

function stripThemeInfoComment(css) {
  return css.replace(/\/\*\s*──[^*]*──+\s*\*\/\s*/g, '').trim()
}