import { type FC, useState, useEffect, useCallback, useRef } from 'react'

interface Preset {
  id: string
  name: string
  entries: PresetEntry[]
  createdAt: string
}

interface PresetEntry {
  typeName: string
  cacheId: string
  fragmentString: string
  data: Record<string, unknown>
}

interface PresetsProps {
  onApply: (entries: PresetEntry[]) => Promise<void>
  currentEntry?: PresetEntry | null
}

const STORAGE_KEY = 'apollo-cache-manager-presets'

function loadPresets(): Promise<Preset[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      resolve((result[STORAGE_KEY] as Preset[]) ?? [])
    })
  })
}

function savePresets(presets: Preset[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: presets }, resolve)
  })
}

export const Presets: FC<PresetsProps> = ({ onApply, currentEntry }) => {
  const [presets, setPresets] = useState<Preset[]>([])
  const [newName, setNewName] = useState('')
  const [applying, setApplying] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadPresets().then(setPresets)
  }, [])

  const handleSave = useCallback(async () => {
    if (!newName.trim() || !currentEntry) return

    const preset: Preset = {
      id: Date.now().toString(36),
      name: newName.trim(),
      entries: [currentEntry],
      createdAt: new Date().toISOString(),
    }

    const updated = [...presets, preset]
    await savePresets(updated)
    setPresets(updated)
    setNewName('')
  }, [newName, currentEntry, presets])

  const handleDelete = useCallback(
    async (id: string) => {
      const updated = presets.filter((p) => p.id !== id)
      await savePresets(updated)
      setPresets(updated)
    },
    [presets],
  )

  const handleApply = useCallback(
    async (preset: Preset) => {
      setApplying(preset.id)
      try {
        await onApply(preset.entries)
      } finally {
        setApplying(null)
      }
    },
    [onApply],
  )

  const handleExport = useCallback(() => {
    const json = JSON.stringify(presets, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'apollo-cache-manager-presets.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [presets])

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string) as Preset[]
          if (!Array.isArray(imported)) return
          const merged = [...presets, ...imported]
          await savePresets(merged)
          setPresets(merged)
        } catch {
          // ignore parse error
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [presets],
  )

  const handleAddEntry = useCallback(
    async (presetId: string) => {
      if (!currentEntry) return
      const updated = presets.map((p) =>
        p.id === presetId ? { ...p, entries: [...p.entries, currentEntry] } : p,
      )
      await savePresets(updated)
      setPresets(updated)
    },
    [presets, currentEntry],
  )

  return (
    <div className="flex flex-col h-full">
      {/* Save current */}
      {currentEntry && (
        <div className="flex-none p-2 border-b border-panel-border space-y-2">
          <div className="text-sm text-panel-text-muted">
            Save current: {currentEntry.typeName} ({currentEntry.cacheId})
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Preset name"
              className="flex-1 px-2 py-1 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent"
            />
            <button
              onClick={handleSave}
              disabled={!newName.trim()}
              className="px-3 py-1 text-sm rounded bg-panel-accent text-panel-bg font-medium hover:bg-panel-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Import/Export */}
      <div className="flex-none flex gap-2 p-2 border-b border-panel-border">
        <button
          onClick={handleExport}
          disabled={presets.length === 0}
          className="px-2 py-1 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text hover:bg-panel-accent/20 disabled:opacity-50 transition-colors"
        >
          Export All
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text hover:bg-panel-accent/20 transition-colors"
        >
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      {/* Preset list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {presets.length === 0 && (
          <div className="text-sm text-panel-text-muted text-center py-4">
            No presets saved yet
          </div>
        )}

        {presets.map((preset) => (
          <div
            key={preset.id}
            className="rounded border border-panel-border bg-panel-surface p-2 space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-panel-text">{preset.name}</span>
              <div className="flex gap-1">
                {currentEntry && (
                  <button
                    onClick={() => handleAddEntry(preset.id)}
                    className="px-1.5 py-0.5 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text transition-colors"
                    title="Add current entry to preset"
                  >
                    +
                  </button>
                )}
                <button
                  onClick={() => handleApply(preset)}
                  disabled={applying === preset.id}
                  className="px-1.5 py-0.5 text-sm rounded bg-panel-accent/20 text-panel-accent hover:bg-panel-accent/30 disabled:opacity-50 transition-colors"
                >
                  {applying === preset.id ? '...' : 'Apply'}
                </button>
                <button
                  onClick={() => handleDelete(preset.id)}
                  className="px-1.5 py-0.5 text-sm rounded text-panel-error hover:bg-panel-error/10 transition-colors"
                >
                  Del
                </button>
              </div>
            </div>

            <div className="text-sm text-panel-text-muted">
              {preset.entries.length} {preset.entries.length === 1 ? 'entry' : 'entries'}
              {' \u2022 '}
              {preset.entries.map((e) => `${e.typeName}(${e.cacheId})`).join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
