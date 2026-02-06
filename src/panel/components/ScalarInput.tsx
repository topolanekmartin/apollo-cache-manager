import type { FC } from 'react'

interface ScalarInputProps {
  typeName: string
  value: unknown
  onChange: (value: unknown) => void
  required?: boolean
}

export const ScalarInput: FC<ScalarInputProps> = ({
  typeName,
  value,
  onChange,
  required,
}) => {
  const baseClass =
    'w-full px-2 py-0.5 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text focus:outline-none focus:border-panel-accent'

  switch (typeName) {
    case 'Boolean':
      return (
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded border-panel-border bg-panel-input-bg accent-panel-accent"
          />
          <span className="text-panel-text-muted">{value ? 'true' : 'false'}</span>
        </label>
      )

    case 'Int':
    case 'Long':
    case 'BigInt':
      return (
        <input
          type="number"
          step="1"
          value={String(value ?? 0)}
          onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
          required={required}
          className={baseClass}
        />
      )

    case 'Float':
    case 'Decimal':
      return (
        <input
          type="number"
          step="any"
          value={String(value ?? 0)}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          required={required}
          className={baseClass}
        />
      )

    case 'Date':
      return (
        <input
          type="date"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={baseClass}
        />
      )

    case 'DateTime':
      return (
        <input
          type="datetime-local"
          value={String(value ?? '').replace('Z', '').slice(0, 16)}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
          required={required}
          className={baseClass}
        />
      )

    case 'JSON':
    case 'JSONObject':
      return (
        <textarea
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value))
            } catch {
              onChange(e.target.value)
            }
          }}
          rows={3}
          required={required}
          className={`${baseClass} font-mono resize-y`}
        />
      )

    default:
      return (
        <input
          type="text"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={typeName}
          className={baseClass}
        />
      )
  }
}
