import { type FC, useRef } from 'react'
import type { Scenario } from '../types/draft'

interface ScenarioActionsProps {
  scenario: Scenario
  onApply: (scenario: Scenario) => void
  onDelete: (id: string) => void
  onExport: (id: string) => void
  onImport: (file: File) => void
}

export const ScenarioActions: FC<ScenarioActionsProps> = ({
  scenario,
  onApply,
  onDelete,
  onExport,
  onImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none px-3 py-2 border-b border-panel-border">
        <span className="text-sm font-medium text-panel-text">Actions</span>
      </div>

      <div className="flex-1 p-2 space-y-2">
        <button
          onClick={() => onApply(scenario)}
          className="w-full px-2 py-1.5 text-sm rounded bg-panel-accent text-panel-bg font-medium hover:bg-panel-accent-hover transition-colors"
        >
          Apply scenario
        </button>

        <button
          onClick={() => onExport(scenario.id)}
          className="w-full px-2 py-1.5 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text hover:bg-panel-accent/20 transition-colors"
        >
          Export
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-2 py-1.5 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text hover:bg-panel-accent/20 transition-colors"
        >
          Import
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onImport(file)
            e.target.value = ''
          }}
          className="hidden"
        />

        <div className="border-t border-panel-border pt-2">
          <button
            onClick={() => onDelete(scenario.id)}
            className="w-full px-2 py-1.5 text-sm rounded bg-panel-error/20 text-panel-error hover:bg-panel-error/30 transition-colors"
          >
            Delete scenario
          </button>
        </div>
      </div>
    </div>
  )
}
