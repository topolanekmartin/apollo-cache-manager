import { type FC, useState, useRef } from 'react'

interface SchemaLoaderProps {
  loading: boolean
  error: string | null
  hasSchema: boolean
  onIntrospect: (endpoint: string, headers?: Record<string, string>) => void
  onLoadJson: (json: unknown) => void
  onClear: () => void
}

export const SchemaLoader: FC<SchemaLoaderProps> = ({
  loading,
  error,
  hasSchema,
  onIntrospect,
  onLoadJson,
  onClear,
}) => {
  const [endpoint, setEndpoint] = useState('')
  const [headersText, setHeadersText] = useState('')
  const [showHeaders, setShowHeaders] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleIntrospect = () => {
    if (!endpoint.trim()) return
    let headers: Record<string, string> | undefined
    if (headersText.trim()) {
      try {
        headers = JSON.parse(headersText)
      } catch {
        return
      }
    }
    onIntrospect(endpoint.trim(), headers)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string)
        onLoadJson(json)
      } catch {
        // ignore parse error
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  if (hasSchema) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-panel-success">Schema loaded</span>
        <button
          onClick={onClear}
          className="px-2 py-0.5 text-sm rounded bg-panel-border text-panel-text-muted hover:text-panel-text hover:bg-panel-error/20 transition-colors"
        >
          Clear
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleIntrospect()}
          placeholder="GraphQL endpoint URL"
          className="flex-1 px-2 py-1 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent"
        />
        <button
          onClick={handleIntrospect}
          disabled={loading || !endpoint.trim()}
          className="px-3 py-1 text-sm rounded bg-panel-accent text-panel-bg font-medium hover:bg-panel-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Loading...' : 'Introspect'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowHeaders(!showHeaders)}
          className="text-sm text-panel-text-muted hover:text-panel-text transition-colors"
        >
          {showHeaders ? '- Hide headers' : '+ Custom headers'}
        </button>
        <span className="text-panel-border">|</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-sm text-panel-text-muted hover:text-panel-text transition-colors"
        >
          Upload JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {showHeaders && (
        <textarea
          value={headersText}
          onChange={(e) => setHeadersText(e.target.value)}
          placeholder='{"Authorization": "Bearer ..."}'
          rows={3}
          className="w-full px-2 py-1 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text placeholder:text-panel-text-muted focus:outline-none focus:border-panel-accent font-mono resize-y"
        />
      )}

      {error && (
        <div className="px-2 py-1 text-sm rounded bg-panel-error/10 text-panel-error border border-panel-error/20">
          {error}
        </div>
      )}
    </div>
  )
}
