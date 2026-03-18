import { useState } from 'react'
import {
  ProjectContext,
  defaultProject,
  loadFromStorage,
  saveToStorage,
  clearStorage,
} from './projectStore'

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
    clearStorage()
    setProject(defaultProject)
  }

  return (
    <ProjectContext.Provider value={{ project, updateProject, resetProject }}>
      {children}
    </ProjectContext.Provider>
  )
}