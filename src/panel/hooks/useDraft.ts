import { useState, useCallback, useMemo } from 'react'
import type { DraftEntity } from '../types/draft'

export interface UseDraftReturn {
  draftEntities: Record<string, DraftEntity>
  editMode: boolean
  hasDraft: boolean
  enableEditMode: () => void
  disableEditMode: () => void
  forceDisableEditMode: () => void
  ensureDraftEntity: (entityKey: string, data: Record<string, unknown>, typeName: string) => void
  updateDraftEntity: (entityKey: string, data: Record<string, unknown>) => void
  removeDraftEntity: (entityKey: string) => void
  applyDraft: (writeFn: (entityKey: string, data: Record<string, unknown>, typeName: string) => Promise<boolean>) => Promise<void>
  discardAll: () => void
  loadFromScenario: (entities: Array<{ entityKey: string; data: Record<string, unknown>; typeName: string }>) => void
  getDraftAsScenarioEntities: () => Array<{ entityKey: string; data: Record<string, unknown>; typeName: string }>
}

export function useDraft(): UseDraftReturn {
  const [draftEntities, setDraftEntities] = useState<Record<string, DraftEntity>>({})
  const [editMode, setEditMode] = useState(false)

  const hasDraft = useMemo(() => Object.keys(draftEntities).length > 0, [draftEntities])

  const enableEditMode = useCallback(() => {
    setEditMode(true)
  }, [])

  const disableEditMode = useCallback(() => {
    setEditMode(false)
  }, [])

  const forceDisableEditMode = useCallback(() => {
    setDraftEntities({})
    setEditMode(false)
  }, [])

  const ensureDraftEntity = useCallback((entityKey: string, data: Record<string, unknown>, typeName: string) => {
    setDraftEntities((prev) => {
      if (prev[entityKey]) return prev
      return { ...prev, [entityKey]: { data: structuredClone(data), typeName } }
    })
  }, [])

  const updateDraftEntity = useCallback((entityKey: string, data: Record<string, unknown>) => {
    setDraftEntities((prev) => {
      if (!prev[entityKey]) return prev
      return { ...prev, [entityKey]: { ...prev[entityKey], data } }
    })
  }, [])

  const removeDraftEntity = useCallback((entityKey: string) => {
    setDraftEntities((prev) => {
      const next = { ...prev }
      delete next[entityKey]
      if (Object.keys(next).length === 0) {
        setEditMode(false)
      }
      return next
    })
  }, [])

  const applyDraft = useCallback(
    async (writeFn: (entityKey: string, data: Record<string, unknown>, typeName: string) => Promise<boolean>) => {
      for (const [entityKey, entity] of Object.entries(draftEntities)) {
        await writeFn(entityKey, entity.data, entity.typeName)
      }
      setEditMode(false)
    },
    [draftEntities],
  )

  const discardAll = useCallback(() => {
    setDraftEntities({})
    setEditMode(false)
  }, [])

  const loadFromScenario = useCallback((entities: Array<{ entityKey: string; data: Record<string, unknown>; typeName: string }>) => {
    const next: Record<string, DraftEntity> = {}
    for (const e of entities) {
      next[e.entityKey] = { data: structuredClone(e.data), typeName: e.typeName }
    }
    setDraftEntities(next)
    setEditMode(true)
  }, [])

  const getDraftAsScenarioEntities = useCallback(() => {
    return Object.entries(draftEntities).map(([entityKey, entity]) => ({
      entityKey,
      data: structuredClone(entity.data),
      typeName: entity.typeName,
    }))
  }, [draftEntities])

  return {
    draftEntities,
    editMode,
    hasDraft,
    enableEditMode,
    disableEditMode,
    forceDisableEditMode,
    ensureDraftEntity,
    updateDraftEntity,
    removeDraftEntity,
    applyDraft,
    discardAll,
    loadFromScenario,
    getDraftAsScenarioEntities,
  }
}
