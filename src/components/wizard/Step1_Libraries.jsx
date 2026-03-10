import { useEffect, useState } from 'react'
import { useProject } from '../../store/projectStore'
import { checkAllLibraries, summarizeIssues } from '../../lib/libraryChecker'

const emptyLib = () => ({ id: crypto.randomUUID(), name: '', content: '' })

export default function Step1_Libraries({ onNext }) {
  const { project, updateProject } = useProject()
  const [libs, setLibs] = useState(
    project.libraries.length > 0 ? project.libraries : [emptyLib()]
  )
  const [issues, setIssues]     = useState({})
  const [dragOverId, setDragOverId] = useState(null)
  const [dragId, setDragId]         = useState(null)

  // ── Re-run checks whenever libs change ───────────────────
  useEffect(() => {
    setIssues(checkAllLibraries(libs))
  }, [libs])

  // ── Lib mutations ─────────────────────────────────────────
  const updateLib = (id, field, value) =>
    setLibs(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))

  const addLib = () => setLibs(prev => [...prev, emptyLib()])

  const removeLib = (id) => {
    if (libs.length === 1) return
    setLibs(prev => prev.filter(l => l.id !== id))
  }

  const moveLib = (id, dir) => {
    setLibs(prev => {
      const idx = prev.findIndex(l => l.id === id)
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  // ── Drag to reorder ───────────────────────────────────────
  const handleDragStart = (e, id) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (e, id) => {
    e.preventDefault()
    setDragOverId(id)
  }
  const handleDrop = (e, targetId) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) return
    setLibs(prev => {
      const arr   = [...prev]
      const fromI = arr.findIndex(l => l.id === dragId)
      const toI   = arr.findIndex(l => l.id === targetId)
      const [item] = arr.splice(fromI, 1)
      arr.splice(toI, 0, item)
      return arr
    })
    setDragId(null)
    setDragOverId(null)
  }
  const handleDragEnd = () => { setDragId(null); setDragOverId(null) }

  // ── File upload ───────────────────────────────────────────
  const handleFileUpload = (id, file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setLibs(prev => prev.map(l => l.id === id
        ? { ...l, name: l.name || file.name, content: e.target.result }
        : l
      ))
    }
    reader.readAsText(file)
  }

  // ── Next ──────────────────────────────────────────────────
  const handleNext = () => {
    const filled = libs.filter(l => l.name.trim() && l.content.trim())
    updateProject({ libraries: filled })
    onNext()
  }

  const summary     = summarizeIssues(issues)
  const filledCount = libs.filter(l => l.name && l.content).length

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Step 1 — Libraries</h2>
      <p className="text-gray-400 mb-4">
        Paste the content of each JavaScript or CSS library your control depends on.
        Give each file a meaningful name (e.g. <code className="text-blue-400">datatables.min.js</code>).
        Load order matters — jQuery must come before DataTables.
      </p>

      {/* ── Global issue summary banner ── */}
      {(summary.errors > 0 || summary.warnings > 0) && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg border text-xs flex items-center gap-3
          ${summary.errors > 0
            ? 'bg-red-950/40 border-red-700 text-red-300'
            : 'bg-yellow-950/40 border-yellow-700 text-yellow-300'
          }`}>
          <span className="text-base">{summary.errors > 0 ? '⛔' : '⚠'}</span>
          <span>
            {summary.errors > 0 && <strong>{summary.errors} error{summary.errors !== 1 ? 's' : ''}</strong>}
            {summary.errors > 0 && summary.warnings > 0 && ' and '}
            {summary.warnings > 0 && <strong>{summary.warnings} warning{summary.warnings !== 1 ? 's' : ''}</strong>}
            {summary.infos > 0 && (!summary.errors && !summary.warnings) && <strong>{summary.infos} note{summary.infos !== 1 ? 's' : ''}</strong>}
            {' '}detected — review before proceeding.
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {libs.map((lib, index) => {
          const libIssues = issues[lib.id] || []
          const hasError  = libIssues.some(i => i.level === 'error')
          const hasWarn   = libIssues.some(i => i.level === 'warn')
          const isJs      = lib.name.endsWith('.js')
          const isCss     = lib.name.endsWith('.css')

          return (
            <div
              key={lib.id}
              draggable
              onDragStart={e => handleDragStart(e, lib.id)}
              onDragOver={e => handleDragOver(e, lib.id)}
              onDrop={e => handleDrop(e, lib.id)}
              onDragEnd={handleDragEnd}
              className={`bg-gray-900 rounded-lg border transition-colors
                ${dragOverId === lib.id ? 'border-blue-500 bg-blue-950/20' :
                  hasError              ? 'border-red-700/70' :
                  hasWarn               ? 'border-yellow-700/70' :
                                          'border-gray-700'
                }`}
            >
              {/* ── Card header ── */}
              <div className="flex items-center gap-2 px-4 pt-3 pb-2">

                {/* Drag handle */}
                <span className="text-gray-600 cursor-grab active:cursor-grabbing select-none"
                  title="Drag to reorder">⠿</span>

                {/* Load order index */}
                <span className="text-xs text-gray-600 font-mono w-4 text-center shrink-0">{index + 1}</span>

                {/* Filename */}
                <input
                  type="text"
                  placeholder="filename.js or filename.css"
                  value={lib.name}
                  onChange={e => updateLib(lib.id, 'name', e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm
                             text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />

                {/* Type badge */}
                {isJs  && <span className="text-xs bg-yellow-900/60 text-yellow-400 px-1.5 py-0.5 rounded shrink-0">JS</span>}
                {isCss && <span className="text-xs bg-purple-900/60 text-purple-400 px-1.5 py-0.5 rounded shrink-0">CSS</span>}

                {/* Issue count badge */}
                {libIssues.length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 font-medium
                    ${hasError ? 'bg-red-900/60 text-red-300' :
                      hasWarn  ? 'bg-yellow-900/60 text-yellow-300' :
                                 'bg-gray-700 text-gray-400'}`}>
                    {hasError ? '⛔' : hasWarn ? '⚠' : 'ℹ'} {libIssues.length}
                  </span>
                )}

                {/* Reorder arrows */}
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => moveLib(lib.id, -1)} disabled={index === 0}
                    className="px-1.5 py-1 text-gray-600 hover:text-gray-300 disabled:opacity-20
                               disabled:cursor-not-allowed text-xs transition-colors" title="Move up">▲</button>
                  <button onClick={() => moveLib(lib.id, 1)} disabled={index === libs.length - 1}
                    className="px-1.5 py-1 text-gray-600 hover:text-gray-300 disabled:opacity-20
                               disabled:cursor-not-allowed text-xs transition-colors" title="Move down">▼</button>
                </div>

                {/* Remove */}
                <button onClick={() => removeLib(lib.id)} disabled={libs.length === 1}
                  className="text-gray-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed
                             text-xs px-2 py-1 rounded transition-colors shrink-0">
                  ✕
                </button>
              </div>

              {/* ── Inline issue list ── */}
              {libIssues.length > 0 && (
                <div className="mx-4 mb-2 flex flex-col gap-1">
                  {libIssues.map(issue => (
                    <div key={issue.code}
                      className={`flex gap-2 items-start text-xs px-3 py-1.5 rounded border
                        ${issue.level === 'error' ? 'bg-red-950/50 border-red-800/60 text-red-300' :
                          issue.level === 'warn'  ? 'bg-yellow-950/50 border-yellow-800/60 text-yellow-300' :
                                                    'bg-gray-800/80 border-gray-700 text-gray-400'}`}>
                      <span className="shrink-0 mt-px">
                        {issue.level === 'error' ? '⛔' : issue.level === 'warn' ? '⚠' : 'ℹ'}
                      </span>
                      <span><strong>{issue.label}:</strong> {issue.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Content area ── */}
              <div className="px-4 pb-3">
                <label
                  className="block cursor-pointer"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault()
                    const file = e.dataTransfer.files[0]
                    if (file) handleFileUpload(lib.id, file)
                  }}
                >
                  <textarea
                    placeholder="Paste library code here, or drop a .js / .css file onto this card..."
                    value={lib.content}
                    onChange={e => updateLib(lib.id, 'content', e.target.value)}
                    rows={lib.content ? 6 : 3}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm
                               text-gray-300 placeholder-gray-600 font-mono focus:outline-none
                               focus:border-blue-500 resize-y"
                  />
                  <input type="file" accept=".js,.css" className="hidden"
                    onChange={e => handleFileUpload(lib.id, e.target.files[0])} />
                </label>

                {/* Stats row */}
                {lib.content && (
                  <p className="text-xs text-gray-600 mt-1">
                    {lib.content.split('\n').length.toLocaleString()} lines
                    · {(lib.content.length / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Add library button ── */}
      <button onClick={addLib}
        className="mt-4 w-full border border-dashed border-gray-700 hover:border-blue-500
                   text-gray-500 hover:text-blue-400 rounded-lg py-3 text-sm transition-colors">
        + Add library
      </button>

      {/* ── Load order summary ── */}
      {filledCount > 0 && (
        <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-400 mb-2">Load order</p>
          <div className="flex flex-col gap-0.5">
            {libs.filter(l => l.name.trim()).map((l, i) => (
              <div key={l.id} className="flex items-center gap-2 text-xs font-mono text-gray-500">
                <span className="text-gray-700 w-4 text-right shrink-0">{i + 1}.</span>
                {l.name.endsWith('.css')
                  ? <span className="text-purple-400">&lt;link rel="stylesheet" href="./libraries/{l.name}" /&gt;</span>
                  : <span className="text-yellow-400">&lt;script src="./libraries/{l.name}"&gt;&lt;/script&gt;</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="flex justify-between items-center mt-6">
        <p className="text-xs text-gray-600 flex items-center gap-3">
          <span>{filledCount} of {libs.length} librar{libs.length === 1 ? 'y' : 'ies'} filled</span>
          {summary.errors > 0   && <span className="text-red-400">⛔ {summary.errors} error{summary.errors !== 1 ? 's' : ''}</span>}
          {summary.warnings > 0 && <span className="text-yellow-500">⚠ {summary.warnings} warning{summary.warnings !== 1 ? 's' : ''}</span>}
          {summary.infos > 0    && <span className="text-gray-500">ℹ {summary.infos} note{summary.infos !== 1 ? 's' : ''}</span>}
        </p>
        <button onClick={handleNext}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors">
          Next →
        </button>
      </div>
    </div>
  )
}
