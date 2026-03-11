import { useEffect, useRef, useState } from 'react'
import { useProject } from '../../store/projectStore'
import { generateScaffold, generateHtml, generateThemeCss } from '../../lib/scaffoldGenerator'
import { generateManifest } from '../../lib/manifestGenerator'
import { generateMockHtml } from '../../lib/webccMock'
import { exportZip, downloadThemeCss } from '../../lib/zipExporter'
import { TEMPLATES } from '../../templates/index'

// ── Tab definitions ──────────────────────────────────────────
const TABS = [
  { id: 'code.js',       label: 'code.js',       badge: 'JS',   badgeColor: 'bg-yellow-900/60 text-yellow-400' },
  { id: 'index.html',    label: 'index.html',     badge: 'HTML', badgeColor: 'bg-blue-900/60 text-blue-300'    },
  { id: 'theme.css',     label: 'theme.css',      badge: 'CSS',  badgeColor: 'bg-purple-900/60 text-purple-400'},
  { id: 'manifest.json', label: 'manifest.json',  badge: null,   badgeColor: null                              },
]

export default function Step4_Editor({ onNext, onBack }) {
  const { project, updateProject } = useProject()

  // ── Editor state ──
  const [activeTab, setActiveTab] = useState('code.js')
  const [codeJs, setCodeJs]       = useState('')
  const [indexHtml, setIndexHtml] = useState('')
  const [themeCss, setThemeCss]   = useState('')
  const [manifestJson, setManifestJson] = useState('')
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [copied, setCopied]         = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showExportInfo, setShowExportInfo] = useState(false)
  const [previewBg, setPreviewBg]           = useState('#ffffff')
  const initialized = useRef(false)

  // ── Preview state ──
  const [iframeContent, setIframeContent]   = useState('')
  const [iframeReady, setIframeReady]       = useState(false)
  const [iframeError, setIframeError]       = useState(null)
  const [propertyValues, setPropertyValues] = useState({})
  const [eventLog, setEventLog]             = useState([])
  const [exporting, setExporting]           = useState(false)
  const iframeRef       = useRef(null)
  const iframeWindowRef = useRef(null)

  const properties = project.properties.filter(p => p.name.trim())

  // ── Init on first load ───────────────────────────────────
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const scaffold = project.codeJs     || generateScaffold(project.properties, project.events, project.methods)
    const html     = project.indexHtml  || generateHtml(project.metadata, project.libraries)
    const theme    = project.themeCss   || generateThemeCss(project.properties)
    const manifest = generateManifest(project.metadata, project.properties, project.events, project.methods)

    setCodeJs(scaffold)
    setIndexHtml(html)
    setThemeCss(theme)
    setManifestJson(JSON.stringify(JSON.parse(manifest), null, 2))
  }, [])

  // ── Refresh manifest when switching to it ───────────────
  useEffect(() => {
    if (activeTab === 'manifest.json') {
      setManifestJson(generateManifest(project.metadata, project.properties, project.events, project.methods))
    }
  }, [activeTab])

  // ── Auto-refresh preview on code/html change ────────────
  useEffect(() => {
    if (!codeJs && !indexHtml) return
    refreshPreview(indexHtml, codeJs)
  }, [codeJs, indexHtml])

  // ── Push theme.css to preview as customCSS ───────────────
  useEffect(() => {
    if (!iframeWindowRef.current) return
    const css = stripThemeComments(themeCss)
    if (css.trim()) {
      iframeWindowRef.current.postMessage({ type: 'cwc-set', name: 'customCSS', value: css }, '*')
    }
  }, [themeCss])

  // ── Listen for iframe messages ───────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!e.data || !e.data.type) return
      switch (e.data.type) {
        case 'cwc-ready':
          setIframeReady(true)
          setIframeError(null)
          iframeWindowRef.current = e.source
          const css = stripThemeComments(themeCss)
          if (css.trim()) {
            setTimeout(() => {
              if (e.source) e.source.postMessage({ type: 'cwc-set', name: 'customCSS', value: css }, '*')
            }, 100)
          }
          break
        case 'cwc-event':
          setEventLog(prev => [{
            id: crypto.randomUUID(), time: new Date().toLocaleTimeString(),
            name: e.data.name, params: JSON.stringify(e.data.params || {}), type: 'event'
          }, ...prev].slice(0, 50))
          break
        case 'cwc-propset':
          setEventLog(prev => [{
            id: crypto.randomUUID(), time: new Date().toLocaleTimeString(),
            name: e.data.name, params: String(e.data.value), type: 'propset'
          }, ...prev].slice(0, 50))
          break
        case 'cwc-error':
          setIframeError(e.data.message)
          setEventLog(prev => [{
            id: crypto.randomUUID(), time: new Date().toLocaleTimeString(),
            name: 'ERROR', params: e.data.message, type: 'error'
          }, ...prev].slice(0, 50))
          break
        case 'cwc-console':
          setEventLog(prev => [{
            id: crypto.randomUUID(), time: new Date().toLocaleTimeString(),
            name: e.data.level, params: e.data.message, type: 'console-' + e.data.level
          }, ...prev].slice(0, 50))
          break
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [themeCss])

  // ── Helpers ──────────────────────────────────────────────
  const refreshPreview = (html, code) => {
    setIframeReady(false)
    setIframeError(null)
    iframeWindowRef.current = null
    const zoomFactor = window.outerWidth / window.innerWidth
    setIframeContent(generateMockHtml(html || indexHtml, code || codeJs, project.libraries, zoomFactor))
  }

  const stripThemeComments = (css) =>
    css.replace(/\/\*\s*──[^*]*──+\s*\*\/\s*/g, '').trim()

  const sendProperty = (name, value, type) => {
    const parsed = parseValue(value, type)
    setPropertyValues(prev => ({ ...prev, [name]: value }))
    if (iframeWindowRef.current) {
      iframeWindowRef.current.postMessage({ type: 'cwc-set', name, value: parsed }, '*')
    }
  }

  // ── Change handlers ──────────────────────────────────────
  const handleCodeChange  = (e) => { setCodeJs(e.target.value);    updateProject({ codeJs: e.target.value })    }
  const handleHtmlChange  = (e) => { setIndexHtml(e.target.value); updateProject({ indexHtml: e.target.value }) }
  const handleThemeChange = (e) => { setThemeCss(e.target.value);  updateProject({ themeCss: e.target.value })  }

  // ── Regenerate ───────────────────────────────────────────
  const handleRegenerate = () => {
    const scaffold = generateScaffold(project.properties, project.events, project.methods)
    const html     = generateHtml(project.metadata, project.libraries)
    const theme    = generateThemeCss(project.properties)
    setCodeJs(scaffold)
    setIndexHtml(html)
    setThemeCss(theme)
    updateProject({ codeJs: scaffold, indexHtml: html, themeCss: theme })
    setConfirmRegenerate(false)
    setActiveTab('code.js')
  }

  // ── Export ───────────────────────────────────────────────
  const handleExport = async (includeTheme) => {
    setExporting(true)
    setShowExportMenu(false)
    try { await exportZip(project, includeTheme) }
    catch (e) { console.error('Export failed:', e) }
    finally { setExporting(false) }
  }

  const handleDownloadTheme = () => {
    const css = stripThemeComments(themeCss)
    if (css.trim()) downloadThemeCss(css)
    setShowExportMenu(false)
  }

  // ── AI Prompt ────────────────────────────────────────────
  const generatePrompt = () => {
    const props = project.properties.filter(p => p.name.trim())
    const evts  = project.events.filter(e => e.name.trim())
    const meths = project.methods.filter(m => m.name.trim())
    const libs  = project.libraries.filter(l => l.name.trim())
    const hasCustomCss = props.some(p => p.name === 'customCSS')

    const fmt = (arr, fn) => arr.length > 0 ? arr.map(fn).join('\n') : '  (none)'

    // Use current editor content — fall back to starter template only if empty
    const template      = TEMPLATES[0]
    const currentCodeJs = codeJs    || template.code
    const currentHtml   = indexHtml || template.html
    const currentCss    = project.themeCss || null

    const customCssRule = hasCustomCss ? `
- The customCSS property MUST update a <style id="cwc-custom-style"> tag:
    case 'customCSS':
        var styleTag = document.getElementById('cwc-custom-style');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'cwc-custom-style';
            document.head.appendChild(styleTag);
        }
        styleTag.textContent = data.value || '';
        break;` : ''

    const cssSection = currentCss ? `
================================================
CURRENT theme.css
================================================
${currentCss}
` : ''

    return `You are an expert in Siemens WinCC Unified Custom Web Controls (CWC).

Extend or improve the EXISTING files below — use them as your starting point.
Do NOT rewrite from scratch. Keep all existing working logic and only add or adjust what is needed.

================================================
METADATA
================================================
Name:         ${project.metadata.name || '(not set)'}
GUID:         ${project.metadata.guid || '(not set)'}
Description:  ${project.metadata.description || '(not set)'}

================================================
LIBRARIES
================================================
All libraries are located under ./libraries/ and already included in index.html.
${fmt(libs, l => `  - ${l.name}`)}

================================================
INTERFACE
================================================
Properties:
${fmt(props, p => `  - ${p.name} (${p.type})${p.defaultValue ? ', default: ' + p.defaultValue : ''}`)}

Events:
${fmt(evts, e => `  - ${e.name}`)}

Methods:
${fmt(meths, m => `  - ${m.name}`)}

================================================
RULES
================================================
- Use only the official WinCC Unified WebCC API:
  WebCC.start(callback, contracts, [], 10000)
  WebCC.Properties.Name  (read/write)
  WebCC.onPropertyChanged.subscribe(fn)  with fn({ key, value })
  WebCC.Events.fire('EventName', { parameter })
- Libraries are already loaded — do not add extra <script> or <link> tags
- webcc.min.js is always the first script loaded
- No ES6 import/export — UMD/IIFE only
- contracts.properties must contain ALL properties with correct types and defaults
- canvas is hidden by default — enable with canvas.style.display = 'block' only for canvas-based libs${customCssRule}

================================================
CURRENT code.js
================================================
${currentCodeJs}

================================================
CURRENT index.html
================================================
${currentHtml}
${cssSection}
================================================
TASK
================================================
Based on the existing files above:
1. Ensure every property in the interface has a correct case in setProperty()
2. Ensure the contracts object contains all properties, events and methods
3. Implement any TODO sections using the available libraries
4. If customCSS is defined, verify the <style id="cwc-custom-style"> injection is present
5. Output the complete updated code.js and index.html (and theme.css if it was provided)
   — full files only, no placeholders, no truncation`
  }

  // ── Current tab content ──────────────────────────────────
  const currentContent = () => {
    switch (activeTab) {
      case 'code.js':       return { value: codeJs,       onChange: handleCodeChange,  editable: true  }
      case 'index.html':    return { value: indexHtml,    onChange: handleHtmlChange,  editable: true  }
      case 'theme.css':     return { value: themeCss,     onChange: handleThemeChange, editable: true  }
      case 'manifest.json': return { value: manifestJson, onChange: null,              editable: false }
      default:              return { value: '',            onChange: null,              editable: false }
    }
  }

  const { value, onChange, editable } = currentContent()

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Step 4 — Editor & Preview</h2>
          <p className="text-gray-400 text-sm">Write your control code and preview it live. Export when ready.</p>
        </div>

        {/* Export button group + info toggle */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Export Info toggle */}
          <button
            onClick={() => setShowExportInfo(prev => !prev)}
            className={`text-xs px-2.5 py-1.5 rounded border transition-colors
              ${showExportInfo
                ? 'bg-gray-700 border-gray-500 text-gray-300'
                : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500'
              }`}
            title="Export info"
          >
            ℹ Info
          </button>

          {/* Export ZIP split button */}
          <div className="relative">
            <div className="flex">
              <button
                onClick={() => handleExport(false)}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50
                           rounded-l text-sm font-medium transition-colors"
              >
                {exporting ? '⏳ Exporting...' : '⬇ Export ZIP'}
              </button>
              <button
                onClick={() => setShowExportMenu(prev => !prev)}
                disabled={exporting}
                className="px-2.5 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50
                           rounded-r border-l border-green-500 text-sm transition-colors"
                title="Export options"
              >
                ▾
              </button>
            </div>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-gray-800 border border-gray-600
                              rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-700">
                  <p className="text-xs font-semibold text-gray-400">Export options</p>
                </div>
                <button onClick={() => handleExport(false)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-700 transition-colors">
                  <div className="text-sm text-gray-200">⬇ Export ZIP (without theme.css)</div>
                  <div className="text-xs text-gray-500 mt-0.5">theme.css lives on the HMI device separately</div>
                </button>
                <button onClick={() => handleExport(true)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-700 transition-colors">
                  <div className="text-sm text-gray-200">⬇ Export ZIP (with theme.css)</div>
                  <div className="text-xs text-gray-500 mt-0.5">Bundles theme.css inside control/libraries/</div>
                </button>
                <div className="border-t border-gray-700">
                  <button onClick={handleDownloadTheme}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-700 transition-colors">
                    <div className="text-sm text-gray-200">⬇ Download theme.css only</div>
                    <div className="text-xs text-gray-500 mt-0.5">Save to UserFiles\CWC\ on HMI device</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Export Info panel (collapsible) ─────────────── */}
      {showExportInfo && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 flex gap-8 text-xs shrink-0">
          <div className="flex flex-col gap-1 text-gray-500">
            <span className="text-gray-400 font-semibold mb-0.5">Output file</span>
            <code className="text-blue-400">{'{'}{project.metadata.guid || 'your-guid'}{'}'}.zip</code>
            <span>{project.metadata.name || '—'}</span>
            <span>{project.libraries.filter(l => l.name).length} librar{project.libraries.filter(l => l.name).length === 1 ? 'y' : 'ies'}</span>
          </div>
          <div className="flex flex-col gap-1 text-gray-500">
            <span className="text-gray-400 font-semibold mb-0.5">theme.css on device</span>
            <code className="text-gray-400">UserFiles\CWC\theme.css</code>
            <span>Read via HmiRuntime.FileSystem</span>
            <span>Assign to control's customCSS property</span>
          </div>
          <div className="flex flex-col gap-1 text-gray-500">
            <span className="text-gray-400 font-semibold mb-0.5">Remove border in TIA Portal</span>
            <code className="text-gray-400">item.WindowFlags =</code>
            <code className="text-gray-400">  UI.Enums.HmiWindowFlag.None;</code>
          </div>
        </div>
      )}

      {/* ── Main layout ─────────────────────────────────── */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* ── LEFT: Editor ── */}
        <div className="flex flex-col gap-3 w-1/2 min-w-0">

          {/* Editor panel */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden flex flex-col flex-1">

            {/* Tabs */}
            <div className="flex border-b border-gray-700 shrink-0 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-mono whitespace-nowrap transition-colors border-r border-gray-700
                    ${activeTab === tab.id
                      ? 'bg-gray-800 text-blue-400 border-b-2 border-b-blue-500'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                    }`}
                >
                  <span className="flex items-center gap-1.5">
                    {tab.label}
                    {tab.badge && (
                      <span className={`text-xs px-1 rounded ${tab.badgeColor}`}>{tab.badge}</span>
                    )}
                    {tab.id === 'manifest.json' && (
                      <span className="text-xs text-gray-600">(read-only)</span>
                    )}
                  </span>
                </button>
              ))}
            </div>

            {/* theme.css info banner */}
            {activeTab === 'theme.css' && (
              <div className="bg-purple-950/40 border-b border-purple-800/50 px-4 py-2 shrink-0">
                <p className="text-xs text-purple-300">
                  Changes are applied live to the preview via the{' '}
                  <code className="bg-purple-900/50 px-1 rounded">customCSS</code> property.
                  In TIA Portal, deploy this file to{' '}
                  <code className="bg-purple-900/50 px-1 rounded">UserFiles\CWC\theme.css</code>.
                </p>
              </div>
            )}

            {/* Editor textarea */}
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
                  const end   = e.target.selectionEnd
                  const next  = value.substring(0, start) + '    ' + value.substring(end)
                  onChange({ target: { value: next } })
                  setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = start + 4 }, 0)
                }
              }}
            />
          </div>

          {/* ── Tools row: Regenerate + AI Prompt ── */}
          <div className="flex gap-3">

            {/* Regenerate */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex-1">
              <p className="text-xs font-semibold text-gray-400 mb-1">From Interface</p>
              <p className="text-xs text-gray-600 mb-2">
                Regenerates code.js, index.html and theme.css from your Step 3 definition.
              </p>
              {!confirmRegenerate ? (
                <button
                  onClick={() => setConfirmRegenerate(true)}
                  className="w-full text-left px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded
                             border border-gray-700 hover:border-blue-500 transition-colors"
                >
                  <div className="text-xs text-gray-200 font-medium">↺ Regenerate all files</div>
                  <div className="text-xs text-gray-600">Overwrites code.js, index.html, theme.css</div>
                </button>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-yellow-400">Overwrite code.js, index.html and theme.css?</p>
                  <div className="flex gap-1.5">
                    <button onClick={handleRegenerate}
                      className="flex-1 px-2 py-1.5 bg-yellow-700 hover:bg-yellow-600 rounded text-xs font-medium transition-colors">
                      Yes
                    </button>
                    <button onClick={() => setConfirmRegenerate(false)}
                      className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AI Prompt */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex-1">
              <p className="text-xs font-semibold text-gray-400 mb-1">AI Prompt</p>
              <p className="text-xs text-gray-600 mb-2">
                Copy a prompt for Claude / ChatGPT to generate code.js + index.html.
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
                <div className="text-xs font-medium">{copied ? '✓ Copied!' : '⎘ Copy Prompt'}</div>
                <div className="text-xs text-gray-600">Libraries, Interface & Templates</div>
              </button>
            </div>

          </div>
        </div>

        {/* ── RIGHT: Preview ── */}
        <div className="flex flex-col gap-3 w-1/2 min-w-0">

          {/* Preview panel */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden flex flex-col flex-1">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0">
              <span className="text-xs font-medium text-gray-300">Preview</span>
              <div className="flex items-center gap-2">

                {/* Background color picker */}
                <div className="flex items-center gap-1" title="Preview background color">
                  {['#ffffff', '#f0f4f9', '#1a1a2e', '#e8e8e8', 'transparent'].map(color => (
                    <button
                      key={color}
                      onClick={() => setPreviewBg(color)}
                      title={color}
                      className={`w-4 h-4 rounded-sm border transition-all
                        ${previewBg === color ? 'border-blue-400 scale-110' : 'border-gray-600 hover:border-gray-400'}`}
                      style={{
                        background: color === 'transparent'
                          ? 'repeating-conic-gradient(#aaa 0% 25%, #fff 0% 50%) 0 0 / 8px 8px'
                          : color
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={previewBg === 'transparent' ? '#ffffff' : previewBg}
                    onChange={e => setPreviewBg(e.target.value)}
                    className="w-4 h-4 rounded-sm border border-gray-600 cursor-pointer bg-transparent"
                    title="Custom color"
                    style={{ padding: 0 }}
                  />
                </div>

                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  iframeError ? 'bg-red-900/50 text-red-400' :
                  iframeReady ? 'bg-green-900/50 text-green-400' :
                                'bg-gray-800 text-gray-500'
                }`}>
                  {iframeError ? 'Error' : iframeReady ? 'Running' : 'Loading...'}
                </span>
                <button
                  onClick={() => refreshPreview(indexHtml, codeJs)}
                  className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  title="Refresh preview"
                >↺</button>
                <button
                  onClick={() => {
                    const blob = new Blob([iframeContent], { type: 'text/html' })
                    const url  = URL.createObjectURL(blob)
                    window.open(url, '_blank')
                    setTimeout(() => URL.revokeObjectURL(url), 10000)
                  }}
                  className="text-xs text-gray-600 hover:text-blue-400 transition-colors"
                  title="Open in new tab"
                >↗</button>
              </div>
            </div>

            {iframeError && (
              <div className="mx-3 mt-2 bg-red-900/30 border border-red-700 rounded px-2 py-1.5
                              text-xs text-red-300 font-mono shrink-0">
                {iframeError}
              </div>
            )}

            <div className="flex-1 min-h-0" style={{ background: previewBg }}>
              <iframe
                ref={iframeRef}
                title="CWC Preview"
                sandbox="allow-scripts allow-same-origin"
                srcDoc={iframeContent}
                className="w-full h-full border-0"
              />
            </div>
          </div>

          {/* ── Bottom row: Property Panel + Event Log ── */}
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
                  <button onClick={() => setEventLog([])}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
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
                    <span className={`shrink-0 ${logColor(entry.type)}`}>
                      {logIcon(entry.type)}
                    </span>
                    <span className={`shrink-0 ${logColor(entry.type)}`}>{entry.name}</span>
                    <span className="text-gray-500 truncate">{entry.params}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Navigation ──────────────────────────────────── */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Click-outside overlay for export menu */}
      {showExportMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────

function logColor(type) {
  switch (type) {
    case 'error':          return 'text-red-400'
    case 'console-error':  return 'text-red-400'
    case 'console-warn':   return 'text-yellow-400'
    case 'console-trace':  return 'text-purple-400'
    case 'event':          return 'text-yellow-400'
    case 'propset':        return 'text-blue-400'
    case 'console-log':
    case 'console-info':
    default:               return 'text-gray-400'
  }
}

function logIcon(type) {
  switch (type) {
    case 'error':
    case 'console-error':  return '✕'
    case 'console-warn':   return '⚠'
    case 'console-trace':  return '◈'
    case 'event':          return '▶'
    case 'propset':        return '←'
    case 'console-info':   return 'ℹ'
    case 'console-log':
    default:               return '›'
  }
}

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
            <button key={v} onClick={() => onChange(v)}
              className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors
                ${String(value) === v ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {v}
            </button>
          ))}
        </div>
      )
    case 'number':
      return (
        <div className="flex flex-col gap-1">
          <input type="range" min={0} max={100} step={1}
            value={parseFloat(value) || 0}
            onChange={e => onChange(e.target.value)}
            className="w-full accent-blue-500" />
          <input type="number" value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1
                       text-xs text-gray-100 focus:outline-none focus:border-blue-500" />
        </div>
      )
    case 'array':
      return (
        <textarea value={value} onChange={e => onChange(e.target.value)}
          rows={2} placeholder='e.g. [1, 2, 3]'
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5
                     text-xs font-mono text-gray-100 placeholder-gray-600
                     focus:outline-none focus:border-blue-500 resize-none" />
      )
    default:
      return (
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5
                     text-xs text-gray-100 focus:outline-none focus:border-blue-500" />
      )
  }
}
