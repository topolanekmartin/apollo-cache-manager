import { type FC, useState, useRef, useEffect, useCallback } from 'react'
import type { SchemaSource } from '../hooks/useSchemaIntrospection'

interface SchemaSourceSelectorProps {
  source: SchemaSource
  loading: boolean
  error: string | null
  onAutoIntrospect: () => void
  onIntrospect: (endpoint: string) => void
  onLoadFromJson: (json: unknown, fileName?: string) => void
  onLoadFromSdl: (sdl: string, fileName?: string) => void
}

type DropdownOption = 'auto' | 'url' | 'file'

function getSourceLabel(source: SchemaSource, loading: boolean, error: string | null): string {
  if (loading) return 'Loading...'
  if (error) return 'Error'
  if (!source) return 'No schema'
  switch (source.type) {
    case 'auto':
      return 'Auto'
    case 'url':
      return `URL: ${source.endpoint.length > 24 ? source.endpoint.slice(0, 24) + '...' : source.endpoint}`
    case 'file':
      return `File: ${source.fileName}`
  }
}

export const SchemaSourceSelector: FC<SchemaSourceSelectorProps> = ({
  source,
  loading,
  error,
  onAutoIntrospect,
  onIntrospect,
  onLoadFromJson,
  onLoadFromSdl,
}) => {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<DropdownOption | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setExpanded(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleAutoClick = useCallback(() => {
    onAutoIntrospect()
    setOpen(false)
    setExpanded(null)
  }, [onAutoIntrospect])

  const handleUrlSubmit = useCallback(() => {
    if (urlInput.trim()) {
      onIntrospect(urlInput.trim())
      setOpen(false)
      setExpanded(null)
      setUrlInput('')
    }
  }, [urlInput, onIntrospect])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const fileName = file.name
      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result as string
        if (fileName.endsWith('.json')) {
          try {
            const json = JSON.parse(text)
            onLoadFromJson(json, fileName)
          } catch {
            // ignore parse errors — hook will handle
            onLoadFromJson(text, fileName)
          }
        } else {
          onLoadFromSdl(text, fileName)
        }
        setOpen(false)
        setExpanded(null)
      }
      reader.readAsText(file)
      // Reset input so same file can be re-selected
      e.target.value = ''
    },
    [onLoadFromJson, onLoadFromSdl],
  )

  const label = getSourceLabel(source, loading, error)

  return (
    <div className="relative ml-auto" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2 py-1 text-sm rounded transition-colors cursor-pointer ${
          error
            ? 'text-panel-error hover:bg-panel-error/10'
            : 'text-panel-text-muted hover:bg-panel-accent/10 hover:text-panel-text'
        }`}
        title={error ?? (source?.type === 'url' ? source.endpoint : undefined)}
      >
        {loading && <span className="w-2 h-2 rounded-full bg-panel-warning animate-pulse" />}
        Schema: {label}
        <span className="text-xs">{open ? '\u25B2' : '\u25BC'}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-panel-bg border border-panel-border rounded shadow-lg z-50">
          {/* Auto option */}
          <button
            onClick={handleAutoClick}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-panel-accent/10 transition-colors flex items-center gap-2 ${
              source?.type === 'auto' ? 'text-panel-accent' : 'text-panel-text'
            }`}
          >
            {source?.type === 'auto' && <span className="w-1.5 h-1.5 rounded-full bg-panel-accent" />}
            Auto-detect
          </button>

          {/* URL option */}
          <div className="border-t border-panel-border">
            <button
              onClick={() => setExpanded(expanded === 'url' ? null : 'url')}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-panel-accent/10 transition-colors flex items-center gap-2 ${
                source?.type === 'url' ? 'text-panel-accent' : 'text-panel-text'
              }`}
            >
              {source?.type === 'url' && <span className="w-1.5 h-1.5 rounded-full bg-panel-accent" />}
              From URL
              <span className="ml-auto text-xs text-panel-text-muted">{expanded === 'url' ? '\u25B2' : '\u25BC'}</span>
            </button>
            {expanded === 'url' && (
              <div className="px-3 pb-2 flex gap-1">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                  placeholder="https://..."
                  className="flex-1 px-2 py-1 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent"
                  autoFocus
                />
                <button
                  onClick={handleUrlSubmit}
                  disabled={!urlInput.trim()}
                  className="px-2 py-1 text-sm rounded bg-panel-accent text-white hover:bg-panel-accent-hover disabled:opacity-50 transition-colors"
                >
                  Load
                </button>
              </div>
            )}
          </div>

          {/* File option */}
          <div className="border-t border-panel-border">
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-panel-accent/10 transition-colors flex items-center gap-2 ${
                source?.type === 'file' ? 'text-panel-accent' : 'text-panel-text'
              }`}
            >
              {source?.type === 'file' && <span className="w-1.5 h-1.5 rounded-full bg-panel-accent" />}
              From File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.graphql,.gql,.sdl"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  )
}
