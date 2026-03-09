import { useState } from 'react'
import { useProject } from '../../store/projectStore'

const PROPERTY_TYPES = ['number', 'string', 'boolean', 'array']

const emptyProperty = () => ({ id: crypto.randomUUID(), name: '', type: 'number', defaultValue: '' })
const emptyEvent = () => ({ id: crypto.randomUUID(), name: '', parameters: '' })
const emptyMethod = () => ({ id: crypto.randomUUID(), name: '', parameters: '' })

function SectionHeader({ title, description }) {
  return (
    <div className="mb-3">
      <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  )
}

function AddButton({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="mt-2 w-full border border-dashed border-gray-700 hover:border-blue-500
                 text-gray-500 hover:text-blue-400 rounded py-2 text-sm transition-colors"
    >
      + {label}
    </button>
  )
}

function RemoveButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-gray-600 hover:text-red-400 disabled:opacity-30
                 disabled:cursor-not-allowed text-sm px-2 transition-colors"
    >
      ✕
    </button>
  )
}

export default function Step3_Interface({ onNext, onBack }) {
  const { project, updateProject } = useProject()

  const [properties, setProperties] = useState(
    project.properties.length > 0 ? project.properties : [emptyProperty()]
  )
  const [events, setEvents] = useState(
    project.events.length > 0 ? project.events : []
  )
  const [methods, setMethods] = useState(
    project.methods.length > 0 ? project.methods : []
  )
  const [errors, setErrors] = useState({})

  // Properties
  const updateProperty = (id, field, value) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
    setErrors(prev => ({ ...prev, [`prop_${id}`]: null }))
  }
  const addProperty = () => setProperties(prev => [...prev, emptyProperty()])
  const removeProperty = (id) => {
    if (properties.length === 1) return
    setProperties(prev => prev.filter(p => p.id !== id))
  }

  // Events
  const updateEvent = (id, field, value) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
    setErrors(prev => ({ ...prev, [`evt_${id}`]: null }))
  }
  const addEvent = () => setEvents(prev => [...prev, emptyEvent()])
  const removeEvent = (id) => setEvents(prev => prev.filter(e => e.id !== id))

  // Methods
  const updateMethod = (id, field, value) => {
    setMethods(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m))
    setErrors(prev => ({ ...prev, [`mth_${id}`]: null }))
  }
  const addMethod = () => setMethods(prev => [...prev, emptyMethod()])
  const removeMethod = (id) => setMethods(prev => prev.filter(m => m.id !== id))

  const validate = () => {
    const e = {}
    properties.forEach(p => {
      if (!p.name.trim()) e[`prop_${p.id}`] = 'Name required'
    })
    events.forEach(ev => {
      if (!ev.name.trim()) e[`evt_${ev.id}`] = 'Name required'
    })
    methods.forEach(m => {
      if (!m.name.trim()) e[`mth_${m.id}`] = 'Name required'
    })
    return e
  }

  const handleNext = () => {
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }
    updateProject({ properties, events, methods })
    onNext()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Step 3 — Interface</h2>
      <p className="text-gray-400 mb-6">
        Define the properties, events and methods of your control.
        These will be available in TIA Portal under the control's Interface tab.
      </p>

      {/* Properties */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 mb-4">
        <SectionHeader
          title="Properties"
          description="Data values that TIA Portal can read from or write to your control."
        />
        <div className="flex flex-col gap-2">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 px-1">
            <span className="col-span-5 text-xs text-gray-600 uppercase tracking-wide">Name</span>
            <span className="col-span-3 text-xs text-gray-600 uppercase tracking-wide">Type</span>
            <span className="col-span-3 text-xs text-gray-600 uppercase tracking-wide">Default Value</span>
            <span className="col-span-1"></span>
          </div>

          {properties.map(prop => (
            <div key={prop.id}>
              <div className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  placeholder="e.g. Value"
                  value={prop.name}
                  onChange={e => updateProperty(prop.id, 'name', e.target.value)}
                  className={`col-span-5 bg-gray-800 border rounded px-3 py-1.5 text-sm
                              text-gray-100 placeholder-gray-500 focus:outline-none transition-colors
                              ${errors[`prop_${prop.id}`] ? 'border-red-500' : 'border-gray-600 focus:border-blue-500'}`}
                />
                <select
                  value={prop.type}
                  onChange={e => updateProperty(prop.id, 'type', e.target.value)}
                  className="col-span-3 bg-gray-800 border border-gray-600 rounded px-3 py-1.5
                             text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                >
                  {PROPERTY_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="optional"
                  value={prop.defaultValue}
                  onChange={e => updateProperty(prop.id, 'defaultValue', e.target.value)}
                  className="col-span-3 bg-gray-800 border border-gray-600 rounded px-3 py-1.5
                             text-sm text-gray-100 placeholder-gray-500 focus:outline-none
                             focus:border-blue-500"
                />
                <div className="col-span-1 flex justify-center">
                  <RemoveButton
                    onClick={() => removeProperty(prop.id)}
                    disabled={properties.length === 1}
                  />
                </div>
              </div>
              {errors[`prop_${prop.id}`] && (
                <p className="text-xs text-red-400 mt-0.5 ml-1">{errors[`prop_${prop.id}`]}</p>
              )}
            </div>
          ))}
        </div>
        <AddButton onClick={addProperty} label="Add property" />
      </div>

      {/* Events */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 mb-4">
        <SectionHeader
          title="Events"
          description="Signals fired from your control to TIA Portal (e.g. OnClick, OnValueChanged)."
        />
        <div className="flex flex-col gap-2">
          {events.length > 0 && (
            <div className="grid grid-cols-12 gap-2 px-1">
              <span className="col-span-5 text-xs text-gray-600 uppercase tracking-wide">Name</span>
              <span className="col-span-6 text-xs text-gray-600 uppercase tracking-wide">
                Parameters <span className="normal-case">(optional, comma-separated)</span>
              </span>
              <span className="col-span-1"></span>
            </div>
          )}
          {events.map(evt => (
            <div key={evt.id}>
              <div className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  placeholder="e.g. OnClick"
                  value={evt.name}
                  onChange={e => updateEvent(evt.id, 'name', e.target.value)}
                  className={`col-span-5 bg-gray-800 border rounded px-3 py-1.5 text-sm
                              text-gray-100 placeholder-gray-500 focus:outline-none transition-colors
                              ${errors[`evt_${evt.id}`] ? 'border-red-500' : 'border-gray-600 focus:border-blue-500'}`}
                />
                <input
                  type="text"
                  placeholder="e.g. value, label"
                  value={evt.parameters}
                  onChange={e => updateEvent(evt.id, 'parameters', e.target.value)}
                  className="col-span-6 bg-gray-800 border border-gray-600 rounded px-3 py-1.5
                             text-sm text-gray-100 placeholder-gray-500 focus:outline-none
                             focus:border-blue-500"
                />
                <div className="col-span-1 flex justify-center">
                  <RemoveButton onClick={() => removeEvent(evt.id)} />
                </div>
              </div>
              {errors[`evt_${evt.id}`] && (
                <p className="text-xs text-red-400 mt-0.5 ml-1">{errors[`evt_${evt.id}`]}</p>
              )}
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-gray-600 italic">No events defined yet.</p>
          )}
        </div>
        <AddButton onClick={addEvent} label="Add event" />
      </div>

      {/* Methods */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 mb-4">
        <SectionHeader
          title="Methods"
          description="Functions that TIA Portal can call on your control (e.g. Reset, Refresh)."
        />
        <div className="flex flex-col gap-2">
          {methods.length > 0 && (
            <div className="grid grid-cols-12 gap-2 px-1">
              <span className="col-span-5 text-xs text-gray-600 uppercase tracking-wide">Name</span>
              <span className="col-span-6 text-xs text-gray-600 uppercase tracking-wide">
                Parameters <span className="normal-case">(optional, comma-separated)</span>
              </span>
              <span className="col-span-1"></span>
            </div>
          )}
          {methods.map(mth => (
            <div key={mth.id}>
              <div className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  placeholder="e.g. Reset"
                  value={mth.name}
                  onChange={e => updateMethod(mth.id, 'name', e.target.value)}
                  className={`col-span-5 bg-gray-800 border rounded px-3 py-1.5 text-sm
                              text-gray-100 placeholder-gray-500 focus:outline-none transition-colors
                              ${errors[`mth_${mth.id}`] ? 'border-red-500' : 'border-gray-600 focus:border-blue-500'}`}
                />
                <input
                  type="text"
                  placeholder="e.g. targetValue"
                  value={mth.parameters}
                  onChange={e => updateMethod(mth.id, 'parameters', e.target.value)}
                  className="col-span-6 bg-gray-800 border border-gray-600 rounded px-3 py-1.5
                             text-sm text-gray-100 placeholder-gray-500 focus:outline-none
                             focus:border-blue-500"
                />
                <div className="col-span-1 flex justify-center">
                  <RemoveButton onClick={() => removeMethod(mth.id)} />
                </div>
              </div>
              {errors[`mth_${mth.id}`] && (
                <p className="text-xs text-red-400 mt-0.5 ml-1">{errors[`mth_${mth.id}`]}</p>
              )}
            </div>
          ))}
          {methods.length === 0 && (
            <p className="text-sm text-gray-600 italic">No methods defined yet.</p>
          )}
        </div>
        <AddButton onClick={addMethod} label="Add method" />
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