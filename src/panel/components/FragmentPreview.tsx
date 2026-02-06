import { type FC, useState } from 'react'

interface FragmentPreviewProps {
  fragmentString: string
  data: Record<string, unknown>
}

export const FragmentPreview: FC<FragmentPreviewProps> = ({
  fragmentString,
  data,
}) => {
  const [tab, setTab] = useState<'fragment' | 'data'>('fragment')

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-panel-border">
        <button
          onClick={() => setTab('fragment')}
          className={`px-3 py-1 text-sm transition-colors ${
            tab === 'fragment'
              ? 'text-panel-accent border-b border-panel-accent'
              : 'text-panel-text-muted hover:text-panel-text'
          }`}
        >
          Fragment
        </button>
        <button
          onClick={() => setTab('data')}
          className={`px-3 py-1 text-sm transition-colors ${
            tab === 'data'
              ? 'text-panel-accent border-b border-panel-accent'
              : 'text-panel-text-muted hover:text-panel-text'
          }`}
        >
          Data JSON
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <pre className="text-sm font-mono text-panel-text whitespace-pre-wrap">
          {tab === 'fragment' ? fragmentString : JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  )
}
