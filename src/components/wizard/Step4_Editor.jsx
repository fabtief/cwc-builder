import { useEffect, useRef, useState } from 'react'
import { useProject } from '../../store/projectStore'
import { generateScaffold, generateHtml } from '../../lib/scaffoldGenerator'
import { generateManifest } from '../../lib/manifestGenerator'
import { generateMockHtml } from '../../lib/webccMock'
import { exportZip, downloadThemeCss } from '../../lib/zipExporter'
import { TEMPLATES } from '../../templates/index'

const TABS = ['code.js', 'index.html', 'theme.css', 'manifest.json']

const THEME_INFO = `/* ─────────────────────────────────────────────────────────
   theme.css — Global CWC Stylesheet
   ─────────────────────────────────────────────────────────
   This file is NOT bundled inside the CWC ZIP by default.
   It lives on the HMI device at:

       UserFiles\\CWC\\theme.css

   In TIA Portal, read it once at runtime start and assign
   its content to the "customCSS" property of each control:

       var fs = HmiRuntime.FileSystem;
       fs.ReadAllText('UserFiles\\CWC\\theme.css', function(err, css) {
           if (!err) {
               Screens('MyScreen').ScreenItems('MyTable').customCSS = css;
           }
       });

   For a global approach, store the content in a String tag
   and assign it to all CWC controls from a central script.
───────────────────────────────────────────────────────── */

`

export default function Step4_Editor({ onNext, onBack }) {
  const { project, updateProject } = useProject()

  // ── Editor state ──
  const [activeTab, setActiveTab] = useState('code.js')
  const [codeJs, setCodeJs] = useState('')
  const [indexHtml, setIndexHtml] = useState('')
  const [themeCss, setThemeCss] = useState('')
  const [manifestJson, setManifestJson] = useState('')
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const initialized = useRef(false)

  // ── Preview state ──
  const [iframeContent, setIframeContent] = useState('')
  const [iframeReady, setIframeReady] = useState(false)
  const [iframeError, setIframeError] = useState(null)
  const [propertyValues, setPropertyValues] = useState({})
  const [eventLog, setEventLog] = useState([])
  const [exporting, setExporting] = useState(false)
  const iframeRef = useRef(null)
  const iframeWindowRef = useRef(null)

  const properties = project.properties.filter(p => p.name.trim())

  // ── Init editor on first load ──
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const scaffold = project.codeJs || generateScaffold(
      project.properties,
      project.events,
      project.methods
    )
    const html = project.indexHtml || generateHtml(project.metadata, project.libraries)
    const manifest = generateManifest(
      project.metadata,
      project.properties,
      project.events,
      project.methods
    )
    const theme = project.themeCss || THEME_INFO

    setCodeJs(scaffold)
    setIndexHtml(html)
    setThemeCss(theme)
    setManifestJson(JSON.stringify(JSON.parse(manifest), null, 2))
  }, [])

  // ── Regenerate manifest when tab switches to it ──
  useEffect(() => {
    if (activeTab === 'manifest.json') {
      setManifestJson(generateManifest(
        project.metadata,
        project.properties,
        project.events,
        project.methods
      ))
    }
  }, [activeTab])

  // ── Refresh preview whenever code or html changes ──
  useEffect(() => {
    if (!codeJs && !indexHtml) return
    refreshPreview(indexHtml, codeJs)
  }, [codeJs, indexHtml])

  // ── When theme.css changes, push it to preview as customCSS property ──
  useEffect(() => {
    if (!iframeWindowRef.current) return
    const cssContent = stripThemeComments(themeCss)
    if (cssContent.trim()) {
      iframeWindowRef.current.postMessage(
        { type: 'cwc-set', name: 'customCSS', value: cssContent },
        '*'
      )
    }
  }, [themeCss])

  // ── Listen for messages from iframe ──
  useEffect(() => {
    const handler = (e) => {
      if (!e.data || !e.data.type) return
      switch (e.data.type) {
        case 'cwc-ready':
          setIframeReady(true)
          setIframeError(null)
          iframeWindowRef.current = e.source
          // Push current theme immediately after control is ready
          const cssContent = stripThemeComments(themeCss)
          if (cssContent.trim()) {
            setTimeout(() => {
              if (e.source) {
                e.source.postMessage(
                  { type: 'cwc-set', name: 'customCSS', value: cssContent },
                  '*'
                )
              }
            }, 100)
          }
          break
        case 'cwc-event':
          setEventLog(prev => [{
            id: crypto.randomUUID(),
            time: new Date().toLocaleTimeString(),
            name: e.data.name,
            params: JSON.stringify(e.data.params || {}),
            type: 'event'
          }, ...prev].slice(0, 50))
          break
        case 'cwc-propset':
          setEventLog(prev => [{
            id: crypto.randomUUID(),
            time: new Date().toLocaleTimeString(),
            name: e.data.name,
            params: String(e.data.value),
            type: 'propset'
          }, ...prev].slice(0, 50))
          break
        case 'cwc-error':
          setIframeError(e.data.message)
          setEventLog(prev => [{
            id: crypto.randomUUID(),
            time: new Date().toLocaleTimeString(),
            name: 'ERROR',
            params: e.data.message,
            type: 'error'
          }, ...prev].slice(0, 50))
          break
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [themeCss])

  // ── Helpers ──
  const refreshPreview = (html, code) => {
    setIframeReady(false)
    setIframeError(null)
    iframeWindowRef.current = null
    // Detect parent page zoom: window.devicePixelRatio reflects OS scaling,
    // but CSS zoom is exposed via window.outerWidth / window.innerWidth ratio
    const zoomFactor = window.outerWidth / window.innerWidth
    const content = generateMockHtml(
      html || indexHtml,
      code || codeJs,
      project.libraries,
      zoomFactor
    )
    setIframeContent(content)
  }

  // Strip the info comment block from theme.css before sending to preview
  const stripThemeComments = (css) => {
    return css.replace(/\/\*\s*─+[\s\S]*?─+\s*\*\/\s*/g, '').trim()
  }

  const sendProperty = (name, value, type) => {
    const parsed = parseValue(value, type)
    setPropertyValues(prev => ({ ...prev, [name]: value }))
    if (iframeWindowRef.current) {
      iframeWindowRef.current.postMessage(
        { type: 'cwc-set', name, value: parsed },
        '*'
      )
    }
  }

  const handleCodeChange = (e) => {
    setCodeJs(e.target.value)
    updateProject({ codeJs: e.target.value })
  }

  const handleHtmlChange = (e) => {
    setIndexHtml(e.target.value)
    updateProject({ indexHtml: e.target.value })
  }

  const handleThemeChange = (e) => {
    setThemeCss(e.target.value)
    updateProject({ themeCss: e.target.value })
  }

  const applyTemplate = (template) => {
    setCodeJs(template.code)
    updateProject({ codeJs: template.code })
    if (template.html) {
      setIndexHtml(template.html)
      updateProject({ indexHtml: template.html })
    }
  }

  const handleRegenerate = () => {
    const scaffold = generateScaffold(project.properties, project.events, project.methods)
    const html = generateHtml(project.metadata, project.libraries)
    setCodeJs(scaffold)
    setIndexHtml(html)
    updateProject({ codeJs: scaffold, indexHtml: html })
    setConfirmRegenerate(false)
    setActiveTab('code.js')
  }

  const handleExport = async (includeTheme) => {
    setExporting(true)
    setShowExportMenu(false)
    try {
      await exportZip(project, includeTheme)
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadTheme = () => {
    const cssContent = stripThemeComments(themeCss)
    if (cssContent.trim()) {
      downloadThemeCss(cssContent)
    }
  }

  const generatePrompt = () => {
    const props = project.properties.filter(p => p.name.trim())
    const evts = project.events.filter(e => e.name.trim())
    const meths = project.methods.filter(m => m.name.trim())
    const libs = project.libraries.filter(l => l.name.trim())

    const propsText = props.length > 0
      ? props.map(p => `  - ${p.name} (${p.type})${p.defaultValue ? ', default: ' + p.defaultValue : ''}`).join('\n')
      : '  (none)'
    const evtsText = evts.length > 0 ? evts.map(e => `  - ${e.name}`).join('\n') : '  (none)'
    const methsText = meths.length > 0 ? meths.map(m => `  - ${m.name}`).join('\n') : '  (none)'
    const libsText = libs.length > 0 ? libs.map(l => `  - ${l.name}`).join('\n') : '  (none)'
    const template = TEMPLATES[0]

    return `You are an expert in Siemens WinCC Unified Custom Web Controls (CWC).

Generate a complete code.js and index.html for a CWC with the following specification:

================================================
METADATA
================================================
Name:         ${project.metadata.name || '(not set)'}
GUID:         ${project.metadata.guid || '(not set)'}
Description:  ${project.metadata.description || '(not set)'}

================================================
LIBRARIES
================================================
All libraries are located under ./libraries/ and already included.
${libsText}

================================================
INTERFACE
================================================
Properties:
${propsText}

Events:
${evtsText}

Methods:
${methsText}

================================================
RULES
================================================
- Use only the official WinCC Unified WebCC API:
  - WebCC.start(callback, contracts, [], 10000)
  - WebCC.Properties.Name (read/write directly)
  - WebCC.onPropertyChanged.subscribe(fn) with fn({ key, value })
  - WebCC.Events.fire('EventName', { parameter })
- All libraries are included via ./libraries/[name]
- webcc.min.js must be the first script: ./libraries/webcc.min.js
- No jQuery, no ES6 import/export
- If a "customCSS" property exists, implement it by injecting a <style id="cwc-custom-style"> tag
- contracts.properties must contain all properties with default values

================================================
STARTER TEMPLATE code.js
================================================
${template.code}

================================================
STARTER TEMPLATE index.html
================================================
${template.html}

================================================
TASK
================================================
Replace placeholder properties with the ones defined above.
Build the HTML structure appropriate for the task.
Initialize libraries inside the WebCC.start() callback.
Output complete code.js and index.html — no placeholder code.`
  }

  const currentContent = () => {
    switch (activeTab) {
      case 'code.js':      return { value: codeJs,       onChange: handleCodeChange,  editable: true  }
      case 'index.html':   return { value: indexHtml,    onChange: handleHtmlChange,  editable: true  }
      case 'theme.css':    return { value: themeCss,     onChange: handleThemeChange, editable: true  }
      case 'manifest.json':return { value: manifestJson, onChange: null,              editable: false }
    }
  }

  const { value, onChange, editable } = currentContent()

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Step 4 — Editor & Preview</h2>
          <p className="text-gray-400 text-sm">
            Write your control code and preview it live. Export when ready.
          </p>
        </div>

        {/* Export button with dropdown */}
        <div className="relative">
          <div className="flex">
            <button
              onClick={() => handleExport(false)}
              disabled={exporting}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50
                         rounded-l text-sm font-medium transition-colors flex items-center gap-2"
            >
              {exporting ? '⏳ Exporting...' : '⬇ Export ZIP'}
            </button>
            <button
              onClick={() => setShowExportMenu(prev => !prev)}
              disabled={exporting}
              className="px-2.5 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50
                         rounded-r border-l border-green-500 text-sm transition-colors"
              title="Export options"
            >
              ▾
            </button>
          </div>

          {/* Dropdown menu */}
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-gray-800 border border-gray-600
                            rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-700">
                <p className="text-xs font-semibold text-gray-400">Export options</p>
              </div>
              <button
                onClick={() => handleExport(false)}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-700 transition-colors"
              >
                <div className="text-sm text-gray-200">⬇ Export ZIP (without theme.css)</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  theme.css lives on the HMI device separately
                </div>
              </button>
              <button
                onClick={() => handleExport(true)}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-700 transition-colors"
              >
                <div className="text-sm text-gray-200">⬇ Export ZIP (with theme.css)</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Bundles theme.css inside control/libraries/
                </div>
              </button>
              <div className="border-t border-gray-700">
                <button
                  onClick={handleDownloadTheme}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-700 transition-colors"
                >
                  <div className="text-sm text-gray-200">⬇ Download theme.css only</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Save to UserFiles\CWC\ on HMI device
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* ── LEFT: Editor ── */}
        <div className="flex flex-col gap-3 w-1/2 min-w-0">

          {/* Editor tabs + textarea */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden flex flex-col flex-1">
            <div className="flex border-b border-gray-700 shrink-0 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-mono whitespace-nowrap transition-colors border-r border-gray-700
                    ${activeTab === tab
                      ? 'bg-gray-800 text-blue-400 border-b-2 border-b-blue-500'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                    }`}
                >
                  {tab === 'theme.css' ? (
                    <span className="flex items-center gap-1.5">
                      theme.css
                      <span className="text-xs bg-purple-900/60 text-purple-400 px-1 rounded">CSS</span>
                    </span>
                  ) : tab === 'manifest.json' ? (
                    <span className="flex items-center gap-1.5">
                      manifest.json
                      <span className="text-xs text-gray-600">(read-only)</span>
                    </span>
                  ) : tab}
                </button>
              ))}
            </div>

            {/* theme.css info banner */}
            {activeTab === 'theme.css' && (
              <div className="bg-purple-950/40 border-b border-purple-800/50 px-4 py-2.5 shrink-0">
                <p className="text-xs text-purple-300">
                  <span className="font-semibold">theme.css</span> — Write CSS here to style your control.
                  Changes are applied live to the preview via the <code className="bg-purple-900/50 px-1 rounded">customCSS</code> property.
                  In TIA Portal, read this file from <code className="bg-purple-900/50 px-1 rounded">UserFiles\CWC\theme.css</code> and assign it to the control property.
                </p>
              </div>
            )}

            <textarea
              value={value}
              onChange={onChange}
              readOnly={!editable}
              spellCheck={false}
              className={`flex-1 w-full bg-gray-950 text-gray-300 font-mono text-sm p-4
                          focus:outline-none resize-none leading-relaxed
                          ${!editable ? 'opacity-60 cursor-default' : ''}`}
              style={{ tabSize: 4 }}
              onKeyDown={(e) => {
                if (e.key === 'Tab' && editable) {
                  e.preventDefault()
                  const start = e.target.selectionStart
                  const end = e.target.selectionEnd
                  const newValue = value.substring(0, start) + '    ' + value.substring(end)
                  onChange({ target: { value: newValue } })
                  setTimeout(() => {
                    e.target.selectionStart = e.target.selectionEnd = start + 4
                  }, 0)
                }
              }}
            />
          </div>

          {/* Sidebar tools row — Templates, Regenerate, Prompt */}
          <div className="flex gap-3">

            {/* Templates */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex-1">
              <p className="text-xs font-semibold text-gray-400 mb-2">Starter Templates</p>
              <div className="flex flex-col gap-1.5">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { applyTemplate(t); setActiveTab('code.js') }}
                    className="text-left px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded
                               border border-gray-700 hover:border-blue-500 transition-colors"
                  >
                    <div className="text-xs text-gray-200 font-medium">{t.label}</div>
                    <div className="text-xs text-gray-600">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Regenerate */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex-1">
              <p className="text-xs font-semibold text-gray-400 mb-2">From Interface</p>
              <p className="text-xs text-gray-600 mb-2">
                Generates code.js + index.html from Step 3 definition.
              </p>
              {!confirmRegenerate ? (
                <button
                  onClick={() => setConfirmRegenerate(true)}
                  className="w-full text-left px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded
                             border border-gray-700 hover:border-blue-500 transition-colors"
                >
                  <div className="text-xs text-gray-200 font-medium">↺ Regenerate</div>
                  <div className="text-xs text-gray-600">Overwrites code.js + index.html</div>
                </button>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-yellow-400">Overwrite existing code?</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleRegenerate}
                      className="flex-1 px-2 py-1.5 bg-yellow-700 hover:bg-yellow-600 rounded text-xs font-medium transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmRegenerate(false)}
                      className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AI Prompt */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex-1">
              <p className="text-xs font-semibold text-gray-400 mb-2">AI Prompt</p>
              <p className="text-xs text-gray-600 mb-2">
                Copy prompt for Claude / ChatGPT to generate code.js + index.html.
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatePrompt())
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded border transition-colors
                  ${copied
                    ? 'bg-green-900/40 border-green-600 text-green-400'
                    : 'bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-blue-500'
                  }`}
              >
                <div className="text-xs font-medium">
                  {copied ? '✓ Copied!' : '⎘ Copy Prompt'}
                </div>
                <div className="text-xs text-gray-600">Libraries, Interface & Templates</div>
              </button>
            </div>

          </div>
        </div>

        {/* ── RIGHT: Preview ── */}
        <div className="flex flex-col gap-3 w-1/2 min-w-0">

          {/* Preview iframe */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden flex flex-col flex-1">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0">
              <span className="text-xs font-medium text-gray-300">Preview</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${iframeError
                    ? 'bg-red-900/50 text-red-400'
                    : iframeReady
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-gray-800 text-gray-500'
                  }`}>
                  {iframeError ? 'Error' : iframeReady ? 'Running' : 'Loading...'}
                </span>
                <button
                  onClick={() => refreshPreview(indexHtml, codeJs)}
                  className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  title="Refresh preview"
                >
                  ↺
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([iframeContent], { type: 'text/html' })
                    const url = URL.createObjectURL(blob)
                    window.open(url, '_blank')
                    setTimeout(() => URL.revokeObjectURL(url), 10000)
                  }}
                  className="text-xs text-gray-600 hover:text-blue-400 transition-colors"
                  title="Open in new tab — no zoom or sandbox issues"
                >
                  ↗
                </button>
              </div>
            </div>

            {iframeError && (
              <div className="mx-3 mt-2 bg-red-900/30 border border-red-700 rounded px-2 py-1.5
                      text-xs text-red-300 font-mono shrink-0">
                {iframeError}
              </div>
            )}

            <div className="flex-1 bg-white min-h-0">
              <iframe
                ref={iframeRef}
                title="CWC Preview"
                sandbox="allow-scripts allow-same-origin"
                srcDoc={iframeContent}
                className="w-full h-full border-0"
              />
            </div>
          </div>

          {/* Bottom row — Property Panel, Event Log, Export Info */}
          <div className="flex gap-3 shrink-0">

            {/* Property Panel */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex-1">
              <p className="text-xs font-semibold text-gray-400 mb-2">Property Panel</p>
              {properties.length === 0 ? (
                <p className="text-xs text-gray-600 italic">No properties defined in Step 3.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {properties.map(p => (
                    <div key={p.id}>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-xs text-gray-400 font-medium">{p.name}</label>
                        <span className="text-xs text-gray-600">{p.type}</span>
                      </div>
                      <PropertyInput
                        type={p.type}
                        value={propertyValues[p.name] ?? p.defaultValue ?? ''}
                        onChange={(val) => sendProperty(p.name, val, p.type)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Event Log */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400">Event Log</p>
                {eventLog.length > 0 && (
                  <button
                    onClick={() => setEventLog([])}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
                {eventLog.length === 0 ? (
                  <p className="text-xs text-gray-600 italic">No events yet...</p>
                ) : eventLog.map(entry => (
                  <div key={entry.id} className="flex items-center gap-1.5 text-xs font-mono">
                    <span className="text-gray-600 shrink-0">{entry.time}</span>
                    <span className={`shrink-0 ${
                      entry.type === 'error' ? 'text-red-400' :
                      entry.type === 'event' ? 'text-yellow-400' : 'text-blue-400'
                    }`}>
                      {entry.type === 'event' ? '▶' : entry.type === 'error' ? '✕' : '←'}
                    </span>
                    <span className="text-gray-300 truncate">{entry.name}</span>
                    <span className="text-gray-500 truncate">{entry.params}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Info */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex-1">
              <p className="text-xs font-semibold text-gray-400 mb-2">Export Info</p>
              <div className="text-xs flex flex-col gap-1.5 text-gray-500">
                <div>
                  <span className="text-gray-400">File: </span>
                  <code className="text-blue-400 break-all">
                    {'{'}{project.metadata.guid || 'your-guid'}{'}'}.zip
                  </code>
                </div>
                <div>
                  <span className="text-gray-400">Control: </span>
                  <span>{project.metadata.name || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Libraries: </span>
                  <span>{project.libraries.filter(l => l.name).length} file(s)</span>
                </div>
                <hr className="border-gray-700 my-0.5" />
                <p className="text-gray-600">
                  theme.css → HMI device:
                  <code className="text-gray-500 block mt-0.5">UserFiles\CWC\theme.css</code>
                </p>
                <hr className="border-gray-700 my-0.5" />
                <p className="text-gray-600">
                  Remove border:
                  <code className="text-gray-500 block mt-0.5">
                    item.WindowFlags =
                    UI.Enums.HmiWindowFlag.None;
                  </code>
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Click outside to close export menu */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────

function parseValue(value, type) {
  switch (type) {
    case 'number': return parseFloat(value) || 0
    case 'boolean': return value === 'true' || value === true
    case 'array': try { return JSON.parse(value) } catch { return [] }
    default: return String(value)
  }
}

function PropertyInput({ type, value, onChange }) {
  switch (type) {
    case 'boolean':
      return (
        <div className="flex gap-2">
          {['true', 'false'].map(v => (
            <button
              key={v}
              onClick={() => onChange(v)}
              className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors
                ${String(value) === v
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              {v}
            </button>
          ))}
        </div>
      )

    case 'number':
      return (
        <div className="flex flex-col gap-1">
          <input
            type="range"
            min={0} max={100} step={1}
            value={parseFloat(value) || 0}
            onChange={e => onChange(e.target.value)}
            className="w-full accent-blue-500"
          />
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={value}
              onChange={e => onChange(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1
                         text-xs text-gray-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )

    case 'array':
      return (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={2}
          placeholder='e.g. [1, 2, 3]'
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5
                     text-xs font-mono text-gray-100 placeholder-gray-600
                     focus:outline-none focus:border-blue-500 resize-none"
        />
      )

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5
                     text-xs text-gray-100 focus:outline-none focus:border-blue-500"
        />
      )
  }
}
