import { useRef, useState } from 'react'
import { useProject } from '../../store/projectStore'

const generateGuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })

// Default icon — tiny transparent PNG as fallback
const DEFAULT_ICON_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAADUlEQVQ4jWNgYGD4DwABBAEAWamVswAAAABJRU5ErkJggg=='
const DEFAULT_ICON_NAME = 'icon.png'

export default function Step2_Metadata({ onNext, onBack }) {
  const { project, updateProject } = useProject()
  const [metadata, setMetadata] = useState(
    project.metadata.guid
      ? project.metadata
      : { ...project.metadata, guid: generateGuid() }
  )
  const [errors, setErrors] = useState({})
  const [iconDragOver, setIconDragOver] = useState(false)
  const iconInputRef = useRef(null)

  const update = (field, value) => {
    setMetadata(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  // ── Icon upload ───────────────────────────────────────────
  const handleIconFile = (file) => {
    if (!file) return
    const allowed = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/jpeg', 'image/gif']
    // .ico files sometimes report as application/octet-stream — allow by extension too
    const isIco = file.name.endsWith('.ico')
    if (!allowed.includes(file.type) && !isIco) {
      alert('Please upload an .ico, .png, .jpg or .gif file.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      update('iconData', e.target.result)
      update('iconName', file.name)
    }
    reader.readAsDataURL(file)
  }

  const clearIcon = () => {
    update('iconData', null)
    update('iconName', DEFAULT_ICON_NAME)
    if (iconInputRef.current) iconInputRef.current.value = ''
  }

  // ── Validate + Next ───────────────────────────────────────
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
    if (Object.keys(e).length > 0) { setErrors(e); return }
    updateProject({ metadata })
    onNext()
  }

  const iconSrc = metadata.iconData || DEFAULT_ICON_DATA

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Step 2 — Metadata</h2>
      <p className="text-gray-400 mb-6">
        Define the identity of your Custom Web Control as it will appear in TIA Portal.
      </p>

      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 flex flex-col gap-5">

        {/* ── Control Name ── */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Control Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. DataTableControl"
            value={metadata.name}
            onChange={e => update('name', e.target.value)}
            className={`w-full bg-gray-800 border rounded px-3 py-2 text-sm text-gray-100
                        placeholder-gray-500 focus:outline-none transition-colors
                        ${errors.name ? 'border-red-500' : 'border-gray-600 focus:border-blue-500'}`}
          />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          <p className="text-xs text-gray-600 mt-1">
            Shown in TIA Portal under "My Controls".
          </p>
        </div>

        {/* ── GUID ── */}
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
            Unique identifier. ZIP will be named{' '}
            <code className="text-blue-400">{'{' + (metadata.guid || 'your-guid') + '}'}.zip</code>
          </p>
        </div>

        {/* ── Description ── */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description <span className="text-gray-600 text-xs font-normal">(optional)</span>
          </label>
          <textarea
            placeholder="Brief description of what this control does..."
            value={metadata.description || ''}
            onChange={e => update('description', e.target.value)}
            rows={3}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm
                       text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500
                       resize-none"
          />
        </div>

        {/* ── Icon upload ── */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Control Icon <span className="text-gray-600 text-xs font-normal">(optional)</span>
          </label>
          <p className="text-xs text-gray-600 mb-2">
            Shown next to the control name in TIA Portal "My Controls". Recommended: 16×16 or 32×32 px .ico file.
          </p>

          <div className="flex items-start gap-4">

            {/* Preview box */}
            <div
              className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center
                          cursor-pointer transition-colors shrink-0
                          ${iconDragOver
                            ? 'border-blue-500 bg-blue-950/30'
                            : metadata.iconData
                              ? 'border-gray-600 bg-gray-800'
                              : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                          }`}
              onClick={() => iconInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIconDragOver(true) }}
              onDragLeave={() => setIconDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setIconDragOver(false)
                handleIconFile(e.dataTransfer.files[0])
              }}
              title="Click or drop to upload icon"
            >
              <img
                src={iconSrc}
                alt="Control icon"
                className="w-10 h-10 object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            {/* Upload controls */}
            <div className="flex flex-col gap-2 flex-1">
              <button
                onClick={() => iconInputRef.current?.click()}
                className="text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600
                           hover:border-blue-500 rounded text-sm text-gray-300 transition-colors"
              >
                {metadata.iconData
                  ? `✓ ${metadata.iconName} — click to replace`
                  : '⬆ Upload icon (.ico, .png, .jpg)'}
              </button>

              {metadata.iconData && (
                <button
                  onClick={clearIcon}
                  className="text-xs text-gray-600 hover:text-red-400 transition-colors text-left"
                >
                  ✕ Remove — use default icon
                </button>
              )}

              <p className="text-xs text-gray-600">
                Or drop a file onto the preview box.
              </p>
            </div>

            <input
              ref={iconInputRef}
              type="file"
              accept=".ico,.png,.jpg,.jpeg,.gif"
              className="hidden"
              onChange={e => handleIconFile(e.target.files[0])}
            />
          </div>
        </div>

      </div>

      {/* ── Navigation ── */}
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
