import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { generateManifest } from './manifestGenerator'
import webccMinJs from './webcc.min.js?raw'

const ICON_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAADUlEQVQ4jWNgYGD4DwABBAEAWamVswAAAABJRU5ErkJggg=='

// ── Export CWC ZIP ────────────────────────────────────────────
// includeTheme: true  → bundles theme.css inside the ZIP (control/libraries/theme.css)
// includeTheme: false → ZIP without theme.css (theme lives on HMI device separately)
export async function exportZip(project, includeTheme = false) {
  const zip = new JSZip()
  const { metadata, libraries, codeJs, indexHtml, themeCss, properties, events, methods } = project
  const guid = metadata.guid

  // ── manifest.json ──
  zip.file('manifest.json', generateManifest(metadata, properties, events, methods))

  // ── assets/ ──
  const assets = zip.folder('assets')
  assets.file('icon.png', ICON_PNG_BASE64, { base64: true })

  // ── control/ ──
  const control = zip.folder('control')
  control.file('index.html', indexHtml)
  control.file('code.js', codeJs || '// No code defined')

  // ── control/libraries/ ──
  const libFolder = control.folder('libraries')
  libFolder.file('webcc.min.js', webccMinJs)

  // User libraries
  libraries
    .filter(l => l.name.trim() && l.content.trim())
    .forEach(l => libFolder.file(l.name, l.content))

  // theme.css — only if user chose to bundle it
  if (includeTheme && themeCss && themeCss.trim()) {
    libFolder.file('theme.css', themeCss)
  }

  // ── Export ──
  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `{${guid}}.zip`)
}

// ── Download theme.css as standalone file ────────────────────
export function downloadThemeCss(themeCss) {
  const blob = new Blob([themeCss], { type: 'text/css' })
  saveAs(blob, 'theme.css')
}
