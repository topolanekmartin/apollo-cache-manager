import { useState, useEffect, useCallback, useRef } from 'react'
import type { Scenario } from '../types/draft'

const STORAGE_KEY = 'apollo-cache-manager-scenarios'

function loadFromStorage(): Promise<Scenario[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      resolve((result[STORAGE_KEY] as Scenario[]) ?? [])
    })
  })
}

function saveToStorage(scenarios: Scenario[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: scenarios }, resolve)
  })
}

export interface UseScenariosReturn {
  scenarios: Scenario[]
  loading: boolean
  addScenario: (name: string, description: string | undefined, entities: Scenario['entities']) => Promise<Scenario>
  deleteScenario: (id: string) => Promise<void>
  exportScenario: (id: string) => void
  importScenarios: (file: File) => Promise<void>
}

export function useScenarios(): UseScenariosReturn {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const scenariosRef = useRef(scenarios)
  scenariosRef.current = scenarios

  useEffect(() => {
    loadFromStorage().then((data) => {
      setScenarios(data)
      setLoading(false)
    })
  }, [])

  const addScenario = useCallback(async (name: string, description: string | undefined, entities: Scenario['entities']) => {
    const scenario: Scenario = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      description,
      entities,
      createdAt: Date.now(),
    }
    const updated = [...scenariosRef.current, scenario]
    await saveToStorage(updated)
    setScenarios(updated)
    return scenario
  }, [])

  const deleteScenario = useCallback(async (id: string) => {
    const updated = scenariosRef.current.filter((s) => s.id !== id)
    await saveToStorage(updated)
    setScenarios(updated)
  }, [])

  const exportScenario = useCallback((id: string) => {
    const scenario = scenariosRef.current.find((s) => s.id === id)
    if (!scenario) return
    const json = JSON.stringify(scenario, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scenario-${scenario.name.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const importScenarios = useCallback(async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string)
          let toAdd: Scenario[] = []
          if (Array.isArray(parsed)) {
            toAdd = parsed
          } else if (parsed && typeof parsed === 'object' && parsed.id) {
            toAdd = [parsed as Scenario]
          }
          if (toAdd.length === 0) {
            reject(new Error('No valid scenarios found in file'))
            return
          }
          const updated = [...scenariosRef.current, ...toAdd]
          await saveToStorage(updated)
          setScenarios(updated)
          resolve()
        } catch {
          reject(new Error('Invalid JSON file'))
        }
      }
      reader.readAsText(file)
    })
  }, [])

  return { scenarios, loading, addScenario, deleteScenario, exportScenario, importScenarios }
}
