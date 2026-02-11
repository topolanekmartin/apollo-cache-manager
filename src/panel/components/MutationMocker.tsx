import { type FC, useRef, useCallback } from 'react'
import type { MutationMockDef } from '../../shared/messageTypes'
import type { InterceptedEntry } from '../hooks/useMutationMocks'
import type { ParsedSchema } from '../types/schema'

interface MutationMockerProps {
  mocks: MutationMockDef[]
  interceptedLog: InterceptedEntry[]
  linkInstalled: boolean
  onAdd: () => void
  onEdit: (mock: MutationMockDef) => void
  onDelete: (id: string) => void
  onToggle: (id: string) => void
  onImport: (mocks: MutationMockDef[]) => void
  onClearLog: () => void
  schema: ParsedSchema | null
}

export const MutationMocker: FC<MutationMockerProps> = ({
  mocks,
  interceptedLog,
  linkInstalled,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
  onImport,
  onClearLog,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = useCallback(() => {
    const json = JSON.stringify(mocks, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'apollo-mutation-mocks.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [mocks])

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string) as MutationMockDef[]
          if (!Array.isArray(imported)) return
          onImport(imported)
        } catch {
          // ignore parse error
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [onImport],
  )

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex-none flex items-center gap-2 p-2 border-b border-panel-border">
        <button
          onClick={onAdd}
          className="px-3 py-1 text-sm rounded bg-panel-accent text-panel-bg font-medium hover:bg-panel-accent-hover transition-colors"
        >
          + Add Mock
        </button>
        <button
          onClick={handleExport}
          disabled={mocks.length === 0}
          className="px-2 py-1 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text hover:bg-panel-accent/20 disabled:opacity-50 transition-colors"
        >
          Export
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
        {linkInstalled && (
          <span className="ml-auto text-sm text-panel-success">Mock link active</span>
        )}
      </div>

      {/* Mock list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {mocks.length === 0 && (
          <div className="text-sm text-panel-text-muted text-center py-4">
            No mutation mocks defined
          </div>
        )}

        {mocks.map((mock) => (
          <div
            key={mock.id}
            className="rounded border border-panel-border bg-panel-surface p-2 space-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggle(mock.id)}
                  className={`w-8 h-4 rounded-full relative transition-colors ${
                    mock.active ? 'bg-panel-accent' : 'bg-panel-border'
                  }`}
                  title={mock.active ? 'Disable mock' : 'Enable mock'}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                      mock.active ? 'left-4' : 'left-0.5'
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-panel-text">
                  {mock.operationName}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(mock)}
                  className="px-1.5 py-0.5 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(mock.id)}
                  className="px-1.5 py-0.5 text-sm rounded text-panel-error hover:bg-panel-error/10 transition-colors"
                >
                  Del
                </button>
              </div>
            </div>
            <div className="text-sm text-panel-text-muted">
              {mock.delay > 0 && `${mock.delay}ms delay • `}
              {mock.returnTypeName && `${mock.returnTypeName} • `}
              {JSON.stringify(mock.response).slice(0, 80)}
              {JSON.stringify(mock.response).length > 80 && '...'}
            </div>
          </div>
        ))}
      </div>

      {/* Intercepted log */}
      <div className="flex-none border-t border-panel-border">
        <div className="flex items-center justify-between px-2 py-1 bg-panel-surface/50">
          <span className="text-sm text-panel-text-muted font-medium">
            Intercepted ({interceptedLog.length})
          </span>
          {interceptedLog.length > 0 && (
            <button
              onClick={onClearLog}
              className="text-sm text-panel-text-muted hover:text-panel-text transition-colors"
            >
              clear
            </button>
          )}
        </div>
        <div className="max-h-32 overflow-y-auto">
          {interceptedLog.length === 0 ? (
            <div className="text-sm text-panel-text-muted text-center py-2">
              No intercepted mutations yet
            </div>
          ) : (
            interceptedLog.map((entry, i) => (
              <div
                key={`${entry.timestamp}-${i}`}
                className="flex items-center gap-2 px-2 py-0.5 text-sm"
              >
                <span className="text-panel-text-muted text-xs">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-panel-accent">{entry.operationName}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
