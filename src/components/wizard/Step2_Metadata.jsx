import { useState } from 'react'
import { useProject } from '../../store/projectStore'

const generateGuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export default function Step2_Metadata({ onNext, onBack }) {
  const { project, updateProject } = useProject()
  const [metadata, setMetadata] = useState(
    project.metadata.guid
      ? project.metadata
      : { ...project.metadata, guid: generateGuid() }
  )
  const [errors, setErrors] = useState({})

  const update = (field, value) => {
    setMetadata(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  const validate = () => {
    const e = {}
    if (!metadata.name.trim()) e.name = 'Control name is required'
    if (!metadata.guid.trim()) e.guid = 'GUID is required'
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(metadata.guid))
      e.guid = 'Invalid GUID format'
    return e
  }

  const handleNext = () => {
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }
    updateProject({ metadata })
    onNext()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Step 2 — Metadata</h2>
      <p className="text-gray-400 mb-6">
        Define the identity of your Custom Web Control as it will appear in TIA Portal.
      </p>

      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 flex flex-col gap-5">

        {/* Control Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Control Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. GaugeControl"
            value={metadata.name}
            onChange={e => update('name', e.target.value)}
            className={`w-full bg-gray-800 border rounded px-3 py-2 text-sm text-gray-100
                        placeholder-gray-500 focus:outline-none transition-colors
                        ${errors.name ? 'border-red-500' : 'border-gray-600 focus:border-blue-500'}`}
          />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          <p className="text-xs text-gray-600 mt-1">
            This name will be shown in TIA Portal under "My Controls".
          </p>
        </div>

        {/* GUID */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            GUID <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={metadata.guid}
              onChange={e => update('guid', e.target.value.toLowerCase())}
              className={`flex-1 bg-gray-800 border rounded px-3 py-2 text-sm font-mono text-gray-100
                          placeholder-gray-500 focus:outline-none transition-colors
                          ${errors.guid ? 'border-red-500' : 'border-gray-600 focus:border-blue-500'}`}
            />
            <button
              onClick={() => update('guid', generateGuid())}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium
                         text-gray-300 transition-colors whitespace-nowrap"
            >
              ↺ Regenerate
            </button>
          </div>
          {errors.guid && <p className="text-xs text-red-400 mt-1">{errors.guid}</p>}
          <p className="text-xs text-gray-600 mt-1">
            Unique identifier for this control. The ZIP file will be named <code className="text-blue-400">{'{'}${metadata.guid || 'your-guid'}{'}'}.zip</code>
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description <span className="text-gray-600 text-xs font-normal">(optional)</span>
          </label>
          <textarea
            placeholder="Brief description of what this control does..."
            value={metadata.description}
            onChange={e => update('description', e.target.value)}
            rows={3}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm
                       text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500
                       resize-none"
          />
        </div>

      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors"
        >
          ← Back
        </button>
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