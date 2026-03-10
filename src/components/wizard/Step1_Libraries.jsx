import { useRef, useState } from 'react'
import { useProject } from '../../store/projectStore'

const emptyLib = () => ({ id: crypto.randomUUID(), name: '', content: '' })

export default function Step1_Libraries({ onNext }) {
  const { project, updateProject } = useProject()
  const [libs, setLibs] = useState(
    project.libraries.length > 0 ? project.libraries : [emptyLib()]
  )

  // ── Drag-and-drop state ──
  const dragIndexRef = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  // ── Library CRUD ──
  const updateLib = (id, field, value) =>
    setLibs(prev => prev.map(lib => lib.id === id ? { ...lib, [field]: value } : lib))

  const addLib = () => setLibs(prev => [...prev, emptyLib()])

  const removeLib = (id) => {
    if (libs.length === 1) return
    setLibs(prev => prev.filter(lib => lib.id !== id))
  }

  // ── Ordering: move up / down ──
  const moveUp = (index) => {
    if (index === 0) return
    setLibs(prev => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  const moveDown = (index) => {
    if (index === libs.length - 1) return
    setLibs(prev => {
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  // ── Drag-and-drop handlers ──
  const handleDragStart = (index) => {
    dragIndexRef.current = index
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    const dragIndex = dragIndexRef.current
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragOverIndex(null)
      return
    }
    setLibs(prev => {
      const next = [...prev]
      const [dragged] = next.splice(dragIndex, 1)
      next.splice(dropIndex, 0, dragged)
      return next
    })
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  // ── File upload ──
  const handleFileUpload = (id, files) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      setLibs(prev => prev.map(lib =>
        lib.id === id
          ? { ...lib, name: lib.name.trim() || file.name, content: e.target.result }
          : lib
      ))
    }
    reader.readAsText(file)
  }

  // ── Drag-and-drop file upload into drop zone ──
  const handleDropFile = (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setLibs(prev => prev.map(lib =>
        lib.id === id
          ? { ...lib, name: lib.name.trim() || file.name, content: ev.target.result }
          : lib
      ))
    }
    reader.readAsText(file)
  }

  // ── Save & proceed ──
  const handleNext = () => {
    const filled = libs.filter(l => l.name.trim() && l.content.trim())
    updateProject({ libraries: filled })
    onNext()
  }

  const filledCount = libs.filter(l => l.name && l.content).length

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Step 1 — Libraries</h2>
      <p className="text-gray-400 mb-2">
        Add every JavaScript or CSS library your control depends on. The load order matters —
        drag rows or use the arrows to arrange them. Libraries are bundled locally; no internet
        connection is required at runtime.
      </p>
      <p className="text-xs text-gray-600 mb-6">
        Tip: Use <span className="text-blue-400">Upload file</span> to load a library from disk,
        or paste minified code directly into the text area.
      </p>

      <div className="flex flex-col gap-3">
        {libs.map((lib, index) => {
          const isJS  = lib.name.endsWith('.js')
          const isCSS = lib.name.endsWith('.css')
          const typeLabel = isCSS ? 'CSS' : isJS ? 'JS' : null

          return (
            <div
              key={lib.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`bg-gray-900 border rounded-lg p-4 transition-all
                ${dragOverIndex === index
                  ? 'border-blue-500 shadow-lg shadow-blue-900/30 scale-[1.01]'
                  : 'border-gray-700'
                }`}
            >
              {/* ── Header row ── */}
              <div className="flex items-center gap-2 mb-3">

                {/* Order badge + drag handle */}
                <div
                  className="flex items-center gap-1 cursor-grab active:cursor-grabbing select-none shrink-0"
                  title="Drag to reorder"
                >
                  <span className="text-gray-600 text-sm leading-none">⠿</span>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${dragOverIndex === index ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    {index + 1}
                  </span>
                </div>

                {/* Up / Down arrows */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    title="Move up (load earlier)"
                    className="text-gray-600 hover:text-blue-400 disabled:opacity-20
                               disabled:cursor-not-allowed text-xs leading-none px-1 transition-colors"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === libs.length - 1}
                    title="Move down (load later)"
                    className="text-gray-600 hover:text-blue-400 disabled:opacity-20
                               disabled:cursor-not-allowed text-xs leading-none px-1 transition-colors"
                  >
                    ▼
                  </button>
                </div>

                {/* Type badge */}
                {typeLabel && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0
                    ${isCSS ? 'bg-purple-900/60 text-purple-400' : 'bg-yellow-900/60 text-yellow-400'}`}>
                    {typeLabel}
                  </span>
                )}

                {/* Filename input */}
                <input
                  type="text"
                  placeholder="filename.js or filename.css"
                  value={lib.name}
                  onChange={e => updateLib(lib.id, 'name', e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm
                             text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500
                             font-mono"
                />

                {/* Upload file button */}
                <label
                  className="shrink-0 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600
                             hover:border-blue-500 rounded text-xs text-gray-400 hover:text-blue-400
                             cursor-pointer transition-colors whitespace-nowrap"
                  title="Upload a .js or .css file from disk"
                >
                  ↑ Upload file
                  <input
                    type="file"
                    accept=".js,.css,.min.js"
                    className="hidden"
                    onChange={e => handleFileUpload(lib.id, e.target.files)}
                  />
                </label>

                {/* Remove button */}
                <button
                  onClick={() => removeLib(lib.id)}
                  disabled={libs.length === 1}
                  title="Remove this library"
                  className="shrink-0 text-gray-600 hover:text-red-400 disabled:opacity-20
                             disabled:cursor-not-allowed text-sm px-2 py-1 rounded transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* ── Content area: paste or drop file ── */}
              <div
                onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                onDrop={e => handleDropFile(e, lib.id)}
              >
                {lib.content ? (
                  <>
                    <textarea
                      value={lib.content}
                      onChange={e => updateLib(lib.id, 'content', e.target.value)}
                      rows={6}
                      spellCheck={false}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm
                                 text-gray-300 placeholder-gray-600 font-mono focus:outline-none
                                 focus:border-blue-500 resize-y"
                    />
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-600">
                        {lib.content.split('\n').length.toLocaleString()} lines
                        · {(lib.content.length / 1024).toFixed(1)} KB
                      </p>
                      <button
                        onClick={() => updateLib(lib.id, 'content', '')}
                        className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                      >
                        ✕ Clear
                      </button>
                    </div>
                  </>
                ) : (
                  /* Empty state: drop zone */
                  <div className="border-2 border-dashed border-gray-700 hover:border-blue-600
                                  rounded-lg p-6 text-center transition-colors cursor-pointer group"
                    onClick={() => {
                      // Trigger hidden file input for this lib
                      document.getElementById(`file-input-${lib.id}`)?.click()
                    }}
                  >
                    <p className="text-gray-500 text-sm group-hover:text-gray-300 transition-colors">
                      Drop a <span className="text-blue-400">.js</span> or{' '}
                      <span className="text-purple-400">.css</span> file here, or{' '}
                      <span className="text-blue-400 underline cursor-pointer">click to upload</span>
                    </p>
                    <p className="text-gray-600 text-xs mt-1">— or paste code below —</p>
                    <textarea
                      placeholder="Paste library code here..."
                      value=""
                      onClick={e => e.stopPropagation()}
                      onChange={e => updateLib(lib.id, 'content', e.target.value)}
                      rows={3}
                      spellCheck={false}
                      className="mt-3 w-full bg-gray-800 border border-gray-700 rounded px-3 py-2
                                 text-sm text-gray-300 placeholder-gray-600 font-mono
                                 focus:outline-none focus:border-blue-500 resize-none"
                    />
                    <input
                      id={`file-input-${lib.id}`}
                      type="file"
                      accept=".js,.css,.min.js"
                      className="hidden"
                      onChange={e => handleFileUpload(lib.id, e.target.files)}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Add library ── */}
      <button
        onClick={addLib}
        className="mt-4 w-full border border-dashed border-gray-700 hover:border-blue-500
                   text-gray-500 hover:text-blue-400 rounded-lg py-3 text-sm transition-colors"
      >
        + Add another library
      </button>

      {/* ── Load order summary ── */}
      {libs.filter(l => l.name.trim()).length > 1 && (
        <div className="mt-4 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            Load order in index.html
          </p>
          <ol className="flex flex-col gap-1">
            {libs.filter(l => l.name.trim()).map((lib, i) => {
              const isCSS = lib.name.endsWith('.css')
              return (
                <li key={lib.id} className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-gray-600 w-4 text-right">{i + 1}.</span>
                  <span className={isCSS ? 'text-purple-400' : 'text-yellow-400'}>
                    {isCSS
                      ? `<link rel="stylesheet" href="./libraries/${lib.name}" />`
                      : `<script src="./libraries/${lib.name}"></script>`
                    }
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="flex justify-between items-center mt-8">
        <p className="text-xs text-gray-600">
          {filledCount} of {libs.length} {libs.length === 1 ? 'library' : 'libraries'} ready
        </p>
        <button
          onClick={handleNext}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  )
}