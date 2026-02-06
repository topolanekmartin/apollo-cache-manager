import { type FC, useState, useCallback, useMemo, useEffect } from 'react'
import { ConnectionStatus } from './components/ConnectionStatus'
import { SchemaLoader } from './components/SchemaLoader'
import { SchemaExplorer } from './components/SchemaExplorer'
import { FragmentComposer } from './components/FragmentComposer'
import { CacheViewer } from './components/CacheViewer'
import { Presets } from './components/Presets'
import { useApolloConnection } from './hooks/useApolloConnection'
import { useSchemaIntrospection } from './hooks/useSchemaIntrospection'
import { useCacheOperations } from './hooks/useCacheOperations'

type Tab = 'cache' | 'mock' | 'presets'

export const App: FC = () => {
  const connection = useApolloConnection()
  const schemaState = useSchemaIntrospection()
  const cacheOps = useCacheOperations()

  const [activeTab, setActiveTab] = useState<Tab>('cache')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [lastWrittenEntry, setLastWrittenEntry] = useState<{
    typeName: string
    cacheId: string
    fragmentString: string
    data: Record<string, unknown>
  } | null>(null)
  const [mockTarget, setMockTarget] = useState<{ typename: string; id: string } | null>(null)
  const [schemaAttempted, setSchemaAttempted] = useState(false)

  // Auto-load cache on mount when Apollo is detected
  useEffect(() => {
    if (connection.detected) {
      cacheOps.readCache()
    }
  }, [connection.detected]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-introspect schema on first Mock tab visit
  useEffect(() => {
    if (activeTab === 'mock' && !schemaAttempted && connection.detected && !schemaState.schema && !schemaState.loading) {
      setSchemaAttempted(true)
      schemaState.autoIntrospect()
    }
  }, [activeTab, schemaAttempted, connection.detected, schemaState.schema, schemaState.loading, schemaState.autoIntrospect])

  const handleWrite = useCallback(
    async (fragmentString: string, data: Record<string, unknown>, typeName: string, cacheId: string) => {
      const success = await cacheOps.writeFragment(fragmentString, data, typeName, cacheId)
      if (success) {
        setLastWrittenEntry({ typeName, cacheId, fragmentString, data })
      }
      return success
    },
    [cacheOps],
  )

  const handleApplyPreset = useCallback(
    async (entries: Array<{ typeName: string; cacheId: string; fragmentString: string; data: Record<string, unknown> }>) => {
      for (const entry of entries) {
        await cacheOps.writeFragment(entry.fragmentString, entry.data, entry.typeName, entry.cacheId)
      }
    },
    [cacheOps],
  )

  const currentPresetEntry = useMemo(() => lastWrittenEntry, [lastWrittenEntry])

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex-none flex items-center gap-3 px-3 py-2 border-b border-panel-border bg-panel-surface">
        <span className="text-sm font-bold text-panel-accent">ACM</span>
        <ConnectionStatus
          detected={connection.detected}
          clientCount={connection.clientCount}
          checking={connection.checking}
          onRetry={connection.retry}
        />
      </div>

      {/* Main content */}
      {!connection.detected ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2 max-w-xs">
            <div className="text-panel-text-muted text-base">No Apollo Client detected</div>
            <div className="text-panel-text-muted text-sm">
              Make sure the page uses Apollo Client with{' '}
              <code className="text-panel-accent bg-panel-surface px-1 py-0.5 rounded">
                connectToDevTools: true
              </code>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Sidebar - Schema Explorer (only when Mock tab active + schema loaded) */}
          {activeTab === 'mock' && schemaState.schema && (
            <div className="w-[220px] border-r border-panel-border flex flex-col">
              <div className="flex-1 overflow-hidden p-2">
                <SchemaExplorer
                  schema={schemaState.schema}
                  onSelectType={setSelectedType}
                  selectedType={selectedType}
                />
              </div>
            </div>
          )}

          {/* Main panel */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Tabs */}
            <div className="flex-none flex border-b border-panel-border">
              {(
                [
                  ['cache', 'Cache'],
                  ['mock', 'Mock'],
                  ['presets', 'Presets'],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab)
                    if (tab === 'cache') cacheOps.readCache()
                  }}
                  className={`px-4 py-1.5 text-sm transition-colors ${
                    activeTab === tab
                      ? 'text-panel-accent border-b-2 border-panel-accent'
                      : 'text-panel-text-muted hover:text-panel-text'
                  }`}
                >
                  {label}
                </button>
              ))}

              {cacheOps.error && (
                <div className="flex items-center ml-auto mr-2 text-sm text-panel-error">
                  {cacheOps.error}
                  <button
                    onClick={cacheOps.clearError}
                    className="ml-1 text-panel-error hover:text-panel-error/80"
                  >
                    x
                  </button>
                </div>
              )}
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0">
              {activeTab === 'cache' && (
                <CacheViewer
                  cacheData={cacheOps.cacheData}
                  loading={cacheOps.loading}
                  onRefresh={cacheOps.readCache}
                  onEvict={cacheOps.evictEntry}
                  onWriteCacheData={cacheOps.writeCacheData}
                  onResetCache={cacheOps.resetCache}
                />
              )}

              {activeTab === 'mock' && (
                schemaState.schema ? (
                  <div className="flex flex-col h-full">
                    {/* Schema status bar */}
                    <div className="flex-none flex items-center gap-2 px-3 py-1 border-b border-panel-border bg-panel-surface/50">
                      <span className="text-sm text-panel-success">Schema loaded</span>
                      <button
                        onClick={schemaState.clearSchema}
                        className="text-sm text-panel-text-muted hover:text-panel-text transition-colors"
                      >
                        clear
                      </button>
                    </div>
                    <div className="flex-1 min-h-0">
                      <FragmentComposer
                        schema={schemaState.schema}
                        selectedType={selectedType}
                        onWrite={handleWrite}
                        initialCacheId={mockTarget?.typename === selectedType ? mockTarget?.id : undefined}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="space-y-3 max-w-sm w-full px-4">
                      {schemaState.loading ? (
                        <div className="text-center">
                          <div className="text-panel-text-muted text-base">Loading schema...</div>
                          <div className="text-panel-text-muted text-sm mt-1">
                            Auto-introspecting via Apollo Client
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-center space-y-1">
                            <div className="text-panel-text-muted text-base">
                              {schemaState.error ? 'Auto-introspection failed' : 'Schema required for mocking'}
                            </div>
                            {schemaState.error && (
                              <div className="text-sm text-panel-error">{schemaState.error}</div>
                            )}
                          </div>
                          <div className="flex justify-center">
                            <button
                              onClick={() => {
                                setSchemaAttempted(false)
                              }}
                              className="px-3 py-1 text-sm rounded bg-panel-accent text-panel-bg font-medium hover:bg-panel-accent-hover transition-colors"
                            >
                              Retry auto-introspect
                            </button>
                          </div>
                          <div className="border-t border-panel-border pt-3">
                            <div className="text-sm text-panel-text-muted text-center mb-2">
                              Or load schema manually:
                            </div>
                            <SchemaLoader
                              loading={schemaState.loading}
                              error={null}
                              hasSchema={false}
                              onIntrospect={schemaState.introspect}
                              onLoadJson={schemaState.loadFromJson}
                              onClear={schemaState.clearSchema}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              )}

              {activeTab === 'presets' && (
                <Presets
                  onApply={handleApplyPreset}
                  currentEntry={currentPresetEntry}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
