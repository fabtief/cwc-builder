import { useEffect, useRef, useState } from 'react'
import { useProject } from '../../store/projectStore'
import { generateScaffold, generateHtml } from '../../lib/scaffoldGenerator'
import { generateManifest } from '../../lib/manifestGenerator'
import { generateMockHtml } from '../../lib/webccMock'
import { exportZip } from '../../lib/zipExporter'
import { TEMPLATES } from '../../templates/index'

const TABS = ['code.js', 'index.html', 'manifest.json']

export default function Step4_Editor({ onNext, onBack }) {
  const { project, updateProject } = useProject()

  // ── Editor state ──
  const [activeTab, setActiveTab] = useState('code.js')
  const [codeJs, setCodeJs] = useState('')
  const [indexHtml, setIndexHtml] = useState('')
  const [manifestJson, setManifestJson] = useState('')
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [copied, setCopied] = useState(false)
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

    setCodeJs(scaffold)
    setIndexHtml(html)
    setManifestJson(manifest)
  }, [])

  // ── Regenerate manifest when tab changes ──
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

  // ── Listen for messages from iframe ──
  useEffect(() => {
    const handler = (e) => {
      if (!e.data || !e.data.type) return
      switch (e.data.type) {
        case 'cwc-ready':
          setIframeReady(true)
          setIframeError(null)
          iframeWindowRef.current = e.source
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
  }, [])

  // ── Helpers ──
  const refreshPreview = (html, code) => {
    setIframeReady(false)
    setIframeError(null)
    setIframeWindowRef(null)
    const content = generateMockHtml(
      html || indexHtml,
      code || codeJs,
      project.libraries
    )
    setIframeContent(content)
  }

  const setIframeWindowRef = (val) => {
    iframeWindowRef.current = val
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

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportZip(project)
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setExporting(false)
    }
  }

  const generatePrompt = () => {
    const props = project.properties.filter(p => p.name.trim())
    const evts  = project.events.filter(e => e.name.trim())
    const meths = project.methods.filter(m => m.name.trim())
    const libs  = project.libraries.filter(l => l.name.trim())

    const propsText = props.length > 0
      ? props.map(p => `  - ${p.name} (${p.type})${p.defaultValue ? ', default: ' + p.defaultValue : ''}`).join('\n')
      : '  (keine)'
    const evtsText  = evts.length  > 0 ? evts.map(e  => `  - ${e.name}`).join('\n') : '  (keine)'
    const methsText = meths.length > 0 ? meths.map(m => `  - ${m.name}`).join('\n') : '  (keine)'
    const libsText  = libs.length  > 0 ? libs.map(l  => `  - ${l.name}`).join('\n') : '  (keine)'
    const template  = TEMPLATES[0]

    return `Du bist Experte für Siemens WinCC Unified Custom Web Controls (CWC).

Erstelle für mich eine vollständige code.js und index.html für ein CWC mit folgenden Angaben:

================================================
METADATEN
================================================
Name:         ${project.metadata.name || '(nicht gesetzt)'}
GUID:         ${project.metadata.guid || '(nicht gesetzt)'}
Beschreibung: ${project.metadata.description || '(nicht gesetzt)'}

================================================
LIBRARIES
================================================
Alle Libraries liegen unter ./libraries/ und sind bereits eingebunden.
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
REGELN
================================================
- Verwende ausschließlich die echte WinCC Unified WebCC API:
  - WebCC.start(callback, contracts, [], 10000)
  - WebCC.Properties.Name (direkt lesen/schreiben)
  - WebCC.onPropertyChanged.subscribe(fn) mit fn({ key, value })
  - WebCC.Events.fire('EventName', { parameter })
- Alle Libraries werden über ./libraries/[name] eingebunden
- webcc.min.js muss als erstes Script geladen werden: ./libraries/webcc.min.js
- Kein jQuery, kein ES6 import/export
- Kommentare auf Deutsch
- contracts.properties muss alle Properties mit Standardwerten enthalten

================================================
STARTER TEMPLATE code.js
================================================
${template.code}

================================================
STARTER TEMPLATE index.html
================================================
${template.html}

================================================
AUFGABE
================================================
Ersetze "MeineProperty" durch die oben definierten Properties.
Baue die HTML-Struktur passend zur Aufgabe auf.
Initialisiere die Libraries im WebCC.start() Callback.
Gib code.js und index.html vollständig aus — keinen Platzhalter-Code.`
  }

  const currentContent = () => {
    switch (activeTab) {
      case 'code.js':       return { value: codeJs,       onChange: handleCodeChange, editable: true }
      case 'index.html':    return { value: indexHtml,    onChange: handleHtmlChange, editable: true }
      case 'manifest.json': return { value: manifestJson, onChange: null,             editable: false }
    }
  }

  const { value, onChange, editable } = currentContent()

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Step 4 — Editor & Preview</h2>
          <p className="text-gray-400 text-sm">
            Write your control code and preview it live. Export when ready.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50
                     rounded text-sm font-medium transition-colors flex items-center gap-2"
        >
          {exporting ? '⏳ Exporting...' : '⬇ Export ZIP'}
        </button>
      </div>

      {/* Main layout */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* ── LEFT: Editor ── */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">

          {/* Editor tabs + textarea */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden flex flex-col flex-1">
            <div className="flex border-b border-gray-700 shrink-0">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-mono transition-colors border-r border-gray-700
                    ${activeTab === tab
                      ? 'bg-gray-800 text-blue-400 border-b-2 border-b-blue-500'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                    }`}
                >
                  {tab}
                  {tab === 'manifest.json' && (
                    <span className="ml-2 text-xs text-gray-600">(read-only)</span>
                  )}
                </button>
              ))}
            </div>

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
                if (e.key === 'Tab') {
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
                  className="w-full px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded
                             border border-gray-700 hover:border-yellow-500 text-left transition-colors"
                >
                  <div className="text-xs text-yellow-400 font-medium">↺ Regenerate</div>
                  <div className="text-xs text-gray-600">Overwrites code.js + index.html</div>
                </button>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-yellow-400">Overwrite current files?</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleRegenerate}
                      className="flex-1 px-2 py-1.5 bg-yellow-600 hover:bg-yellow-500
                                 rounded text-xs font-medium transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmRegenerate(false)}
                      className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600
                                 rounded text-xs transition-colors"
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
                className={`w-full px-2.5 py-1.5 rounded border text-left transition-colors
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
        <div className="w-80 flex flex-col gap-3 shrink-0">

          {/* Preview iframe */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden flex flex-col flex-1">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0">
              <span className="text-xs font-medium text-gray-300">Preview</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  iframeError
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

          {/* Property Panel */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shrink-0">
            <p className="text-xs font-semibold text-gray-400 mb-2">Property Panel</p>
            {properties.length === 0 ? (
              <p className="text-xs text-gray-600 italic">No properties defined.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {properties.map(prop => (
                  <div key={prop.id}>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-gray-300">{prop.name}</label>
                      <span className="text-xs text-gray-600">{prop.type}</span>
                    </div>
                    <PropertyInput
                      type={prop.type}
                      value={propertyValues[prop.name] ?? ''}
                      onChange={(val) => sendProperty(prop.name, val, prop.type)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event Log */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400">Event Log</p>
              <button
                onClick={() => setEventLog([])}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="bg-gray-950 rounded p-2 font-mono text-xs overflow-y-auto
                            flex flex-col gap-1" style={{ height: '120px' }}>
              {eventLog.length === 0 && (
                <span className="text-gray-600 italic">No events yet...</span>
              )}
              {eventLog.map(entry => (
                <div key={entry.id} className="flex gap-2">
                  <span className="text-gray-600 shrink-0">{entry.time}</span>
                  <span className={`shrink-0 ${
                    entry.type === 'error'   ? 'text-red-400' :
                    entry.type === 'event'   ? 'text-yellow-400' :
                    'text-blue-400'
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
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shrink-0">
            <p className="text-xs font-semibold text-gray-400 mb-2">Export Info</p>
            <div className="text-xs flex flex-col gap-1.5 text-gray-500">
              <div>
                <span className="text-gray-400">File: </span>
                <code className="text-blue-400 break-all">
                  {'{'}{ project.metadata.guid || 'your-guid' }{'}'}.zip
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
                Copy ZIP to:
                <code className="text-gray-500 block mt-0.5">
                  ...\UserFiles\CustomControls\
                </code>
              </p>
              <hr className="border-gray-700 my-0.5" />
              <p className="text-gray-600">
                Remove container border:
                <code className="text-gray-500 block mt-0.5">
                  item.WindowFlags = UI.Enums.HmiWindowFlag.None;
                </code>
              </p>
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
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────

function parseValue(value, type) {
  switch (type) {
    case 'number':  return parseFloat(value) || 0
    case 'boolean': return value === 'true' || value === true
    case 'array':   try { return JSON.parse(value) } catch { return [] }
    default:        return String(value)
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