import { type FC, useState, useCallback, useEffect } from 'react'
import { ConnectionStatus } from './components/ConnectionStatus'
import { SchemaSourceSelector } from './components/SchemaSourceSelector'
import { CacheTab } from './components/CacheTab'
import { ScenariosTab } from './components/ScenariosTab'
import { useApolloConnection } from './hooks/useApolloConnection'
import { useSchemaIntrospection } from './hooks/useSchemaIntrospection'
import { useCacheOperations } from './hooks/useCacheOperations'
import { useDraft } from './hooks/useDraft'
import { useScenarios } from './hooks/useScenarios'
import type { Scenario } from './types/draft'

type Tab = 'cache' | 'scenarios'

export const App: FC = () => {
  const connection = useApolloConnection()
  const schemaState = useSchemaIntrospection()
  const cacheOps = useCacheOperations()
  const draft = useDraft()
  const scenarios = useScenarios()

  const [activeTab, setActiveTab] = useState<Tab>('cache')
  const [selectedEntityKey, setSelectedEntityKey] = useState<string | null>(null)
  const [schemaAttempted, setSchemaAttempted] = useState(false)

  // Auto-load cache on mount when Apollo is detected
  useEffect(() => {
    if (connection.detected) {
      cacheOps.readCache()
    }
  }, [connection.detected]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-introspect schema when Apollo is detected
  useEffect(() => {
    if (!schemaAttempted && connection.detected && !schemaState.schema && !schemaState.loading) {
      setSchemaAttempted(true)
      schemaState.autoIntrospect()
    }
  }, [schemaAttempted, connection.detected, schemaState.schema, schemaState.loading, schemaState.autoIntrospect])

  // Cross-tab: Apply scenario -> load into draft, switch to Cache tab
  const handleApplyScenario = useCallback((scenario: Scenario) => {
    draft.loadFromScenario(scenario.entities)
    setActiveTab('cache')
    if (scenario.entities.length > 0) {
      setSelectedEntityKey(scenario.entities[0].entityKey)
    }
  }, [draft])

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

        <SchemaSourceSelector
          source={schemaState.source}
          loading={schemaState.loading}
          error={schemaState.error}
          onAutoIntrospect={schemaState.autoIntrospect}
          onIntrospect={schemaState.introspect}
          onLoadFromJson={schemaState.loadFromJson}
          onLoadFromSdl={schemaState.loadFromSdl}
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
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tabs */}
          <div className="flex-none flex border-b border-panel-border">
            {(
              [
                ['cache', 'Cache'],
                ['scenarios', 'Scenarios'],
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
              <CacheTab
                cacheData={cacheOps.cacheData}
                loading={cacheOps.loading}
                onRefresh={cacheOps.readCache}
                onWriteCacheData={cacheOps.writeCacheData}
                onEvict={cacheOps.evictEntry}
                onResetCache={cacheOps.resetCache}
                schema={schemaState.schema ?? null}
                draft={draft}
                scenarios={scenarios}
                selectedEntityKey={selectedEntityKey}
                onSelectEntity={setSelectedEntityKey}
              />
            )}

            {activeTab === 'scenarios' && (
              <ScenariosTab
                scenarios={scenarios}
                onApplyScenario={handleApplyScenario}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
