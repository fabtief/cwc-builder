import { useState } from 'react'
import { ProjectProvider, useProject } from '../../store/projectStore'
import Step1_Libraries from '../wizard/Step1_Libraries'
import Step2_Metadata from '../wizard/Step2_Metadata'
import Step3_Interface from '../wizard/Step3_Interface'
import Step4_Editor from '../wizard/Step4_Editor'

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
  const { resetProject } = useProject()
  const [currentStep, setCurrentStep] = useState(
    () => parseInt(localStorage.getItem(STEP_KEY) || '0')
  )

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

  const StepComponent = STEP_COMPONENTS[currentStep]

  return (
    <div className="flex flex-col h-screen">

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-blue-400">CWC Builder</h1>
          <p className="text-xs text-gray-500">Custom Web Control Generator for TIA Portal</p>
        </div>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 bg-gray-800 hover:bg-red-900/50 border border-gray-700
                     hover:border-red-700 rounded text-xs text-gray-500 hover:text-red-400
                     transition-colors"
        >
          ↺ New Project
        </button>
      </header>

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
                <span className="text-gray-700">›</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step Content */}
      <main className="flex-1 overflow-auto p-6">
        <StepComponent
          onNext={() => goTo(currentStep + 1)}
          onBack={() => goTo(currentStep - 1)}
          isFirst={currentStep === 0}
          isLast={currentStep === STEPS.length - 1}
        />
      </main>

      <footer className="bg-gray-900 border-t border-gray-800 px-6 py-2 text-center">
        <span className="text-xs text-gray-600">
          Visit my github profile: <a href="https://github.com/fabtief" 
          className="hover:text-gray-400 transition-colors">fabtief</a>
        </span>
      </footer>

    </div>
  )
}

// ── Outer component — provides context ──
export default function Wizard() {
  return (
    <ProjectProvider>
      <WizardInner />
    </ProjectProvider>
  )
}