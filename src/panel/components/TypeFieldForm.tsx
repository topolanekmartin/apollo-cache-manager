import type { FC } from 'react'
import type { FieldDef, ParsedSchema } from '../types/schema'
import { getTypeDisplayName, isNonNull } from '../types/schema'
import { TypeFieldInput } from './TypeFieldInput'

interface TypeFieldFormProps {
  fields: FieldDef[]
  data: Record<string, unknown>
  onChange: (fieldName: string, value: unknown) => void
  schema: ParsedSchema
  visited: Set<string>
  depth: number
  maxDepth: number
}

export const TypeFieldForm: FC<TypeFieldFormProps> = ({
  fields,
  data,
  onChange,
  schema,
  visited,
  depth,
  maxDepth,
}) => {
  return (
    <div className="space-y-2">
      {fields.map((field) => {
        if (field.name === '__typename') return null

        const required = isNonNull(field.type)

        return (
          <div key={field.name} className="space-y-0.5">
            <label className="flex items-center gap-1 text-sm">
              <span className="text-panel-text font-medium">
                {field.name}
              </span>
              {required && <span className="text-panel-error">*</span>}
              <span className="text-panel-text-muted text-sm">
                {getTypeDisplayName(field.type)}
              </span>
              {field.isDeprecated && (
                <span className="text-panel-warning text-sm">(deprecated)</span>
              )}
            </label>

            <TypeFieldInput
              typeRef={field.type}
              value={data[field.name]}
              onChange={(value) => onChange(field.name, value)}
              schema={schema}
              visited={visited}
              depth={depth}
              maxDepth={maxDepth}
              required={required}
            />
          </div>
        )
      })}
    </div>
  )
}
