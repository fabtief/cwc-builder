import { useState } from 'react'
import { useProject } from '../../store/projectStore'

const emptyLib = () => ({ id: crypto.randomUUID(), name: '', content: '' })

export default function Step1_Libraries({ onNext }) {
  const { project, updateProject } = useProject()
  const [libs, setLibs] = useState(
    project.libraries.length > 0 ? project.libraries : [emptyLib()]
  )

  const updateLib = (id, field, value) => {
    setLibs(prev => prev.map(lib => lib.id === id ? { ...lib, [field]: value } : lib))
  }

  const addLib = () => setLibs(prev => [...prev, emptyLib()])

  const removeLib = (id) => {
    if (libs.length === 1) return
    setLibs(prev => prev.filter(lib => lib.id !== id))
  }

  const handleNext = () => {
    const filled = libs.filter(l => l.name.trim() && l.content.trim())
    updateProject({ libraries: filled })
    onNext()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Step 1 — Libraries</h2>
      <p className="text-gray-400 mb-6">
        Paste the content of each JavaScript or CSS library your control depends on.
        Give each file a meaningful name (e.g. <code className="text-blue-400">gauge.min.js</code>).
      </p>

      <div className="flex flex-col gap-6">
        {libs.map((lib, index) => (
          <div key={lib.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4">

            {/* Header row */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Library {index + 1}
              </span>
              <input
                type="text"
                placeholder="filename.js"
                value={lib.name}
                onChange={e => updateLib(lib.id, 'name', e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm
                           text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => removeLib(lib.id)}
                disabled={libs.length === 1}
                className="text-gray-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed
                           text-sm px-2 py-1 rounded transition-colors"
              >
                ✕ Remove
              </button>
            </div>

            {/* Content textarea */}
            <textarea
              placeholder="Paste library code here..."
              value={lib.content}
              onChange={e => updateLib(lib.id, 'content', e.target.value)}
              rows={8}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm
                         text-gray-300 placeholder-gray-600 font-mono focus:outline-none
                         focus:border-blue-500 resize-y"
            />

            {/* Line count indicator */}
            {lib.content && (
              <p className="text-xs text-gray-600 mt-1">
                {lib.content.split('\n').length.toLocaleString()} lines · {(lib.content.length / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Add library button */}
      <button
        onClick={addLib}
        className="mt-4 w-full border border-dashed border-gray-700 hover:border-blue-500
                   text-gray-500 hover:text-blue-400 rounded-lg py-3 text-sm transition-colors"
      >
        + Add another library
      </button>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8">
        <p className="text-xs text-gray-600">
          {libs.filter(l => l.name && l.content).length} of {libs.length} libraries filled
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