import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { generateManifest } from './manifestGenerator'
import webccMinJs from './webcc.min.js?raw'

const ICON_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAADUlEQVQ4jWNgYGD4DwABBAEAWamVswAAAABJRU5ErkJggg=='

export async function exportZip(project) {
  const zip = new JSZip()
  const { metadata, libraries, codeJs, indexHtml, properties, events, methods } = project
  const guid = metadata.guid

  // ── manifest.json — Wurzelverzeichnis ──
  zip.file('manifest.json', generateManifest(metadata, properties, events, methods))

  // ── assets/ — Icon ──
  const assets = zip.folder('assets')
  assets.file('icon.png', ICON_PNG_BASE64, { base64: true })

  // ── control/ ──
  const control = zip.folder('control')

  // index.html — unverändert, Pfade kommen aus Template
  control.file('index.html', indexHtml)

  // code.js
  control.file('code.js', codeJs || '// No code defined')

  // ── control/libraries/ — webcc.min.js + alle User-Libraries ──
  const libFolder = control.folder('libraries')

  // webcc.min.js immer zuerst
  libFolder.file('webcc.min.js', webccMinJs)

  // User-Libraries
  libraries
    .filter(l => l.name.trim() && l.content.trim())
    .forEach(l => libFolder.file(l.name, l.content))

  // ── Export ──
  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `{${guid}}.zip`)
}