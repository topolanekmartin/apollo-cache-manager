import { type FC, useState, useCallback, useMemo, useRef } from 'react'
import type { Scenario } from '../types/draft'
import type { UseScenariosReturn } from '../hooks/useScenarios'
import { ScenarioList } from './ScenarioList'
import { ScenarioPreview } from './ScenarioPreview'
import { ScenarioActions } from './ScenarioActions'

interface ScenariosTabProps {
  scenarios: UseScenariosReturn
  onApplyScenario: (scenario: Scenario) => void
}

export const ScenariosTab: FC<ScenariosTabProps> = ({ scenarios, onApplyScenario }) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedScenario = useMemo(
    () => scenarios.scenarios.find((s) => s.id === selectedScenarioId) ?? null,
    [scenarios.scenarios, selectedScenarioId],
  )

  const handleDelete = useCallback(
    (id: string) => {
      scenarios.deleteScenario(id)
      if (selectedScenarioId === id) {
        setSelectedScenarioId(null)
      }
    },
    [scenarios, selectedScenarioId],
  )

  const handleImport = useCallback(
    async (file: File) => {
      await scenarios.importScenarios(file)
    },
    [scenarios],
  )

  return (
    <div className="flex h-full">
      {/* Left panel: Scenario list */}
      <div className="w-[240px] border-r border-panel-border flex-shrink-0">
        <ScenarioList
          scenarios={scenarios.scenarios}
          selectedId={selectedScenarioId}
          onSelect={setSelectedScenarioId}
        />
      </div>

      {/* Main panel: Scenario preview */}
      <div className="flex-1 min-w-0">
        {selectedScenario ? (
          <ScenarioPreview scenario={selectedScenario} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="text-sm text-panel-text-muted">
              {scenarios.scenarios.length === 0
                ? 'Save a draft as a scenario from the Cache tab'
                : 'Select a scenario to preview'}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text hover:bg-panel-accent/20 transition-colors"
            >
              Import scenarios
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImport(file)
                e.target.value = ''
              }}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Right panel: Actions */}
      {selectedScenario && (
        <div className="w-[240px] border-l border-panel-border flex-shrink-0">
          <ScenarioActions
            scenario={selectedScenario}
            onApply={onApplyScenario}
            onDelete={handleDelete}
            onExport={scenarios.exportScenario}
            onImport={handleImport}
          />
        </div>
      )}
    </div>
  )
}
