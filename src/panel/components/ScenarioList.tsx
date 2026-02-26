import { type FC, useMemo } from 'react'
import type { Scenario } from '../types/draft'

interface ScenarioListProps {
  scenarios: Scenario[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export const ScenarioList: FC<ScenarioListProps> = ({ scenarios, selectedId, onSelect }) => {
  const sorted = useMemo(
    () => [...scenarios].sort((a, b) => b.createdAt - a.createdAt),
    [scenarios],
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none px-3 py-2 border-b border-panel-border">
        <span className="text-sm font-medium text-panel-text">Scenarios</span>
        <span className="text-sm text-panel-text-muted ml-2">({scenarios.length})</span>
      </div>

      <div className="flex-1 overflow-y-auto p-1 space-y-px">
        {sorted.length === 0 && (
          <div className="text-sm text-panel-text-muted text-center py-4">
            No scenarios saved yet
          </div>
        )}

        {sorted.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => onSelect(scenario.id)}
            className={`w-full text-left px-2 py-1.5 rounded transition-colors ${
              selectedId === scenario.id
                ? 'bg-panel-accent/20 text-panel-accent'
                : 'text-panel-text hover:bg-panel-surface'
            }`}
          >
            <div className="text-sm font-medium truncate">{scenario.name}</div>
            <div className="text-sm text-panel-text-muted">
              {scenario.entities.length} {scenario.entities.length === 1 ? 'entity' : 'entities'}
              {' \u2022 '}
              {new Date(scenario.createdAt).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
