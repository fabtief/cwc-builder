import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { generateManifest } from './manifestGenerator'
import webccMinJs from './webcc.min.js?raw'

// Default icon — tiny transparent PNG used when no icon is uploaded
const DEFAULT_ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAADUlEQVQ4jWNgYGD4DwABBAEAWamVswAAAABJRU5ErkJggg=='

// ── Main export ───────────────────────────────────────────────
export async function exportZip(project, includeTheme = false) {
  const zip = new JSZip()
  const { metadata, libraries, codeJs, indexHtml, themeCss, properties, events, methods } = project
  const guid = metadata.guid

  // ── Resolve icon ──────────────────────────────────────────
  // iconData is stored as a base64 data URL: "data:<mime>;base64,<data>"
  const iconName = (metadata.iconName || 'icon.png')
  let iconBase64 = DEFAULT_ICON_BASE64
  if (metadata.iconData) {
    const match = metadata.iconData.match(/^data:[^;]+;base64,(.+)$/)
    if (match) iconBase64 = match[1]
  }
  const iconPath = `./assets/${iconName}`

  // ── manifest.json ─────────────────────────────────────────
  zip.file('manifest.json', generateManifest(metadata, properties, events, methods, iconPath))

  // ── assets/ ───────────────────────────────────────────────
  const assets = zip.folder('assets')
  assets.file(iconName, iconBase64, { base64: true })

  // ── control/libraries/ ───────────────────────────────────
  const control   = zip.folder('control')
  const libFolder = control.folder('libraries')

  // webcc.min.js always first
  libFolder.file('webcc.min.js', webccMinJs)

  // User libraries
  libraries
    .filter(l => l.name.trim() && l.content.trim())
    .forEach(l => libFolder.file(l.name, l.content))

  // ── theme.css (optional bundle) ───────────────────────────
  // When bundled, we MUST inject a <link> tag into index.html
  // so the CSS is actually loaded at runtime. Without this the
  // file exists in the ZIP but WinCC never applies it.
  let finalIndexHtml = indexHtml || ''
  if (includeTheme && themeCss) {
    const stripped = stripThemeInfoComment(themeCss)
    if (stripped.trim()) {
      libFolder.file('theme.css', stripped)
      // Inject <link> before </head> if not already present
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

  // ── Generate and save ─────────────────────────────────────
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

// ── Strip the CWC Builder info comment block from theme.css ──
function stripThemeInfoComment(css) {
  return css.replace(/\/\*\s*──[^*]*──+\s*\*\/\s*/g, '').trim()
}
