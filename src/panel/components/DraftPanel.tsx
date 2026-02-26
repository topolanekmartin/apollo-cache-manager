import { type FC, useState } from 'react'
import type { UseDraftReturn } from '../hooks/useDraft'
import { ConfirmDialog } from './ConfirmDialog'

interface DraftPanelProps {
  draft: UseDraftReturn
  selectedEntityKey: string | null
  onSelectEntity: (entityKey: string) => void
  onApply: () => void
  onSaveAsScenario: () => void
}

export const DraftPanel: FC<DraftPanelProps> = ({
  draft,
  selectedEntityKey,
  onSelectEntity,
  onApply,
  onSaveAsScenario,
}) => {
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false)
  const entityKeys = Object.keys(draft.draftEntities)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none px-3 py-2 border-b border-panel-border">
        <span className="text-sm font-medium text-panel-text">Draft</span>
        <span className="text-sm text-panel-text-muted ml-2">
          ({entityKeys.length})
        </span>
      </div>

      {/* Entity list */}
      <div className="flex-1 overflow-y-auto p-1 space-y-px">
        {entityKeys.length === 0 && (
          <div className="text-sm text-panel-text-muted text-center py-4">
            Edit an entity to add it to the draft
          </div>
        )}

        {entityKeys.map((key) => (
          <div
            key={key}
            className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors ${
              selectedEntityKey === key
                ? 'bg-panel-accent/20 text-panel-accent'
                : 'text-panel-text hover:bg-panel-surface'
            }`}
          >
            <button
              onClick={() => onSelectEntity(key)}
              className="flex-1 text-left truncate"
            >
              {key}
            </button>
            <button
              onClick={() => draft.removeDraftEntity(key)}
              className="shrink-0 text-panel-error hover:text-panel-error/80 transition-colors px-1"
              title="Remove from draft"
            >
              {'\u2715'}
            </button>
          </div>
        ))}
      </div>

      {/* Footer buttons */}
      <div className="flex-none p-2 border-t border-panel-border space-y-1">
        <button
          onClick={onApply}
          disabled={entityKeys.length === 0}
          className="w-full px-2 py-1 text-sm rounded bg-panel-accent text-panel-bg font-medium hover:bg-panel-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Apply draft
        </button>
        <button
          onClick={() => setShowConfirmDiscard(true)}
          disabled={entityKeys.length === 0}
          className="w-full px-2 py-1 text-sm rounded bg-panel-error/20 text-panel-error hover:bg-panel-error/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Discard all
        </button>
        <button
          onClick={onSaveAsScenario}
          disabled={entityKeys.length === 0}
          className="w-full px-2 py-1 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text hover:bg-panel-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Save as scenario
        </button>
      </div>

      {showConfirmDiscard && (
        <ConfirmDialog
          title="Discard draft?"
          message="This will remove all draft entities."
          confirmLabel="Discard"
          cancelLabel="Cancel"
          onConfirm={() => {
            draft.discardAll()
            setShowConfirmDiscard(false)
          }}
          onCancel={() => setShowConfirmDiscard(false)}
        />
      )}
    </div>
  )
}
