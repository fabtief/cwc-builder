import { createContext, useContext, useState } from 'react'

const STORAGE_KEY = 'cwc-builder-project'

export const defaultProject = {
  libraries: [],
  metadata: {
    name:        '',
    guid:        '',
    description: '',
    iconData:    null,
    iconName:    'icon.ico',
  },
  properties: [],
  events:     [],
  methods:    [],
  codeJs:     '',
  indexHtml:  '',
  themeCss:   '',
}

export const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...defaultProject, ...JSON.parse(saved) } : defaultProject
  } catch {
    return defaultProject
  }
}

export const saveToStorage = (project) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
  } catch {
    // storage full or unavailable
  }
}

export const clearStorage = () => {
  localStorage.removeItem(STORAGE_KEY)
}

export const ProjectContext = createContext(null)

export function useProject() {
  return useContext(ProjectContext)
}