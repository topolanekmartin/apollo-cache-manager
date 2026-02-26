import { type FC, useState, useCallback, useMemo } from 'react'
import type { ParsedSchema } from '../types/schema'
import type { UseDraftReturn } from '../hooks/useDraft'
import type { UseScenariosReturn } from '../hooks/useScenarios'
import { CacheDataProvider } from '../contexts/CacheDataContext'
import { EntityList } from './EntityList'
import { EntityDetail } from './EntityDetail'
import { DraftPanel } from './DraftPanel'
import { SaveScenarioModal } from './SaveScenarioModal'
import { Toast } from './Toast'

interface CacheTabProps {
  cacheData: Record<string, unknown> | null
  loading: boolean
  onRefresh: () => Promise<void>
  onWriteCacheData: (cacheId: string, data: Record<string, unknown>, typeName: string) => Promise<boolean>
  onEvict: (cacheId: string) => Promise<boolean>
  onResetCache: () => Promise<boolean>
  schema: ParsedSchema | null
  draft: UseDraftReturn
  scenarios: UseScenariosReturn
  selectedEntityKey: string | null
  onSelectEntity: (key: string | null) => void
}

export const CacheTab: FC<CacheTabProps> = ({
  cacheData,
  loading,
  onRefresh,
  onWriteCacheData,
  onEvict,
  onResetCache: _onResetCache,
  schema,
  draft,
  scenarios,
  selectedEntityKey,
  onSelectEntity,
}) => {
  const [viewMode, setViewMode] = useState<'form' | 'json'>('form')
  const [showSaveScenarioModal, setShowSaveScenarioModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Suppress unused variable warnings - these are available for future use
  void _onResetCache

  const draftEntityKeys = useMemo(() => new Set(Object.keys(draft.draftEntities)), [draft.draftEntities])

  const handleSelectEntity = useCallback((key: string) => {
    onSelectEntity(key)
  }, [onSelectEntity])

  const handleRequestDisableEditMode = useCallback(() => {
    draft.disableEditMode()
  }, [draft])

  const handleApplyDraft = useCallback(async () => {
    await draft.applyDraft(async (entityKey, data, typeName) => {
      return onWriteCacheData(entityKey, data, typeName)
    })
    await onRefresh()
    setToast('Draft applied')
  }, [draft, onWriteCacheData, onRefresh])

  const handleEvict = useCallback(async (entityKey: string) => {
    const success = await onEvict(entityKey)
    if (success) {
      draft.removeDraftEntity(entityKey)
      await onRefresh()
      onSelectEntity(null)
      setToast('Entity evicted')
    }
  }, [onEvict, draft, onRefresh, onSelectEntity])

  const handleSaveAsScenario = useCallback(
    async (name: string, description: string | undefined) => {
      const entities = draft.getDraftAsScenarioEntities()
      await scenarios.addScenario(name, description, entities)
      setToast('Scenario saved')
    },
    [draft, scenarios],
  )

  const showRightPanel = draft.editMode

  return (
    <CacheDataProvider value={cacheData}>
      <div className="flex h-full">
        {/* Left panel: Entity list */}
        <div className="w-[240px] border-r border-panel-border flex-shrink-0">
          <EntityList
            cacheData={cacheData}
            selectedEntityKey={selectedEntityKey}
            onSelectEntity={handleSelectEntity}
            onRefresh={onRefresh}
            loading={loading}
            draftEntityKeys={draftEntityKeys}
          />
        </div>

        {/* Main panel: Entity detail */}
        <div className="flex-1 min-w-0">
          {selectedEntityKey ? (
            <EntityDetail
              entityKey={selectedEntityKey}
              cacheData={cacheData}
              schema={schema}
              draft={draft}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onRequestDisableEditMode={handleRequestDisableEditMode}
              onSelectEntity={handleSelectEntity}
              onEvict={handleEvict}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-panel-text-muted">
              Select an entity from the list
            </div>
          )}
        </div>

        {/* Right panel: Draft panel (conditional) */}
        {showRightPanel && (
          <div className="w-[240px] border-l border-panel-border flex-shrink-0">
            <DraftPanel
              draft={draft}
              selectedEntityKey={selectedEntityKey}
              onSelectEntity={handleSelectEntity}
              onApply={handleApplyDraft}
              onSaveAsScenario={() => setShowSaveScenarioModal(true)}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showSaveScenarioModal && (
        <SaveScenarioModal
          onSave={handleSaveAsScenario}
          onClose={() => setShowSaveScenarioModal(false)}
        />
      )}

      {toast && (
        <Toast message={toast} onDone={() => setToast(null)} />
      )}
    </CacheDataProvider>
  )
}
