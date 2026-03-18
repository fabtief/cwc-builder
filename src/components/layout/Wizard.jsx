import { useRef, useState } from 'react'
import { useProject } from '../../store/projectStore'
import { ProjectProvider } from '../../store/ProjectProvider'
import Step1_Libraries from '../wizard/Step1_Libraries'
import Step2_Metadata from '../wizard/Step2_Metadata'
import Step3_Interface from '../wizard/Step3_Interface'
import Step4_Editor from '../wizard/Step4_Editor'
import { importZip } from '../../lib/zipImporter'

const STEPS = [
  { id: 1, label: 'Libraries' },
  { id: 2, label: 'Metadata' },
  { id: 3, label: 'Interface' },
  { id: 4, label: 'Editor & Preview' },
]
const STEP_COMPONENTS = [Step1_Libraries, Step2_Metadata, Step3_Interface, Step4_Editor]

const STEP_KEY = 'cwc-builder-step'

// ── Inner component — needs access to ProjectProvider context ──
function WizardInner() {
  const { resetProject, updateProject } = useProject()
  const [currentStep, setCurrentStep] = useState(
    () => parseInt(localStorage.getItem(STEP_KEY) || '0')
  )
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const importInputRef = useRef(null)

  const goTo = (index) => {
    localStorage.setItem(STEP_KEY, index)
    setCurrentStep(index)
  }

  const handleReset = () => {
    if (confirm('Reset project? All data will be lost.')) {
      resetProject()
      goTo(0)
    }
  }

  const handleImportClick = () => {
    setImportError(null)
    importInputRef.current?.click()
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be re-imported
    e.target.value = ''

    setImporting(true)
    setImportError(null)
    try {
      const project = await importZip(file)
      updateProject(project)
      goTo(3) // jump straight to Editor
    } catch (err) {
      setImportError(err.message || 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  const StepComponent = STEP_COMPONENTS[currentStep]

  return (
    <div className="flex flex-col h-screen">

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-blue-400">CWC Builder</h1>
          <p className="text-xs text-gray-500">Custom Web Control Generator for TIA Portal</p>
        </div>
        <div className="flex items-center gap-2">

          {/* Import ZIP */}
          <input
            ref={importInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="px-3 py-1.5 bg-gray-800 hover:bg-blue-900/50 border border-gray-700
                       hover:border-blue-700 rounded text-xs text-gray-400 hover:text-blue-400
                       transition-colors disabled:opacity-50"
          >
            {importing ? '⏳ Importing...' : '⬆ Import ZIP'}
          </button>

          {/* New Project */}
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-gray-800 hover:bg-red-900/50 border border-gray-700
                       hover:border-red-700 rounded text-xs text-gray-500 hover:text-red-400
                       transition-colors"
          >
            ↺ New Project
          </button>
        </div>
      </header>

      {/* Import error banner */}
      {importError && (
        <div className="bg-red-950/60 border-b border-red-800 px-6 py-2 flex items-center justify-between">
          <p className="text-xs text-red-300">⛔ Import failed: {importError}</p>
          <button onClick={() => setImportError(null)}
            className="text-xs text-red-500 hover:text-red-300 transition-colors ml-4">✕</button>
        </div>
      )}

      {/* Step Navigation */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3">
        <ol className="flex gap-2">
          {STEPS.map((step, index) => (
            <li key={step.id} className="flex items-center gap-2">
              <button
                onClick={() => goTo(index)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors
                  ${currentStep === index
                    ? 'bg-blue-600 text-white'
                    : index < currentStep
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                disabled={index > currentStep}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs
                  ${currentStep === index ? 'bg-blue-400 text-blue-900' : 'bg-gray-600 text-gray-300'}`}>
                  {index < currentStep ? '✓' : step.id}
                </span>
                {step.label}
              </button>
              {index < STEPS.length - 1 && (
                <span className="text-gray-700 text-xs">›</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step content */}
      <main className="flex-1 overflow-auto p-6">
        <StepComponent
          onNext={() => goTo(currentStep + 1)}
          onBack={() => goTo(currentStep - 1)}
        />
      </main>

    </div>
  )
}

export default function Wizard() {
  return (
    <ProjectProvider>
      <WizardInner />
    </ProjectProvider>
  )
}