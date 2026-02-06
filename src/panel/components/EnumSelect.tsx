import type { FC } from 'react'
import type { EnumValue } from '../types/schema'

interface EnumSelectProps {
  values: EnumValue[]
  value: unknown
  onChange: (value: string) => void
  required?: boolean
}

export const EnumSelect: FC<EnumSelectProps> = ({
  values,
  value,
  onChange,
  required,
}) => {
  return (
    <select
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full px-2 py-0.5 text-sm rounded bg-panel-input-bg border border-panel-border text-panel-text focus:outline-none focus:border-panel-accent"
    >
      {!required && <option value="">-- none --</option>}
      {values.map((v) => (
        <option
          key={v.name}
          value={v.name}
          disabled={v.isDeprecated}
        >
          {v.name}
          {v.isDeprecated ? ' (deprecated)' : ''}
        </option>
      ))}
    </select>
  )
}
