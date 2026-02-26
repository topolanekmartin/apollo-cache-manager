import { type FC, useState, useEffect } from 'react'

interface SaveScenarioModalProps {
  onSave: (name: string, description: string | undefined) => void
  onClose: () => void
}

export const SaveScenarioModal: FC<SaveScenarioModalProps> = ({ onSave, onClose }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = () => {
    if (!name.trim()) return
    onSave(name.trim(), description.trim() || undefined)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-panel-bg border border-panel-border rounded-lg shadow-2xl p-4 space-y-3"
        style={{ width: '90%', maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-medium text-panel-text">Save as Scenario</div>

        <div className="space-y-2">
          <div>
            <label className="text-sm text-panel-text-muted block mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Scenario name"
              className="w-full px-2 py-1 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm text-panel-text-muted block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              className="w-full px-2 py-1 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent resize-y"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-3 py-1 text-sm rounded bg-panel-accent text-panel-bg font-medium hover:bg-panel-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
