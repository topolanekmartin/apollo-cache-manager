import type { FC } from 'react'

interface ConnectionStatusProps {
  detected: boolean
  clientCount: number
  checking: boolean
  onRetry: () => void
}

export const ConnectionStatus: FC<ConnectionStatusProps> = ({
  detected,
  clientCount,
  checking,
  onRetry,
}) => {
  if (checking) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-panel-surface text-panel-text-muted text-sm">
        <span className="inline-block w-2 h-2 rounded-full bg-panel-warning animate-pulse" />
        Detecting Apollo Client...
      </div>
    )
  }

  if (!detected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-panel-surface text-sm">
        <span className="inline-block w-2 h-2 rounded-full bg-panel-error" />
        <span className="text-panel-error">Apollo Client not found</span>
        <button
          onClick={onRetry}
          className="ml-2 px-2 py-0.5 rounded bg-panel-border text-panel-text-muted hover:text-panel-text hover:bg-panel-accent/20 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-panel-surface text-sm">
      <span className="inline-block w-2 h-2 rounded-full bg-panel-success" />
      <span className="text-panel-success">
        Connected{clientCount > 1 ? ` (${clientCount} clients)` : ''}
      </span>
    </div>
  )
}
