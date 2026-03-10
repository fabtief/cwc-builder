import { createContext, useContext, useState } from 'react'

const STORAGE_KEY = 'cwc-builder-project'

const defaultProject = {
  libraries: [],
  metadata: { name: '', guid: '', description: '' },
  properties: [],
  events: [],
  methods: [],
  codeJs: '',
  indexHtml: '',
  themeCss: '',
}

const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...defaultProject, ...JSON.parse(saved) } : defaultProject
  } catch {
    return defaultProject
  }
}

const saveToStorage = (project) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
  } catch {
    // storage full or unavailable
  }
}

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const [project, setProject] = useState(loadFromStorage)

  const updateProject = (partial) => {
    setProject(prev => {
      const updated = { ...prev, ...partial }
      saveToStorage(updated)
      return updated
    })
  }

  const resetProject = () => {
    localStorage.removeItem(STORAGE_KEY)
    setProject(defaultProject)
  }

  return (
    <ProjectContext.Provider value={{ project, updateProject, resetProject }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  return useContext(ProjectContext)
}
