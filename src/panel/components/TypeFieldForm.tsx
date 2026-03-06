import type { FC } from 'react'
import type { FieldDef, ParsedSchema } from '../types/schema'
import { getTypeDisplayName, isNonNull } from '../types/schema'
import { TypeFieldInput } from './TypeFieldInput'
import { stripFieldArguments } from '../utils/stripFieldArguments'

interface TypeFieldFormProps {
  fields: FieldDef[]
  data: Record<string, unknown>
  onChange: (fieldName: string, value: unknown) => void
  schema: ParsedSchema
  visited: Set<string>
  depth: number
  maxDepth: number
  modifiedFields?: Set<string>
}

export const TypeFieldForm: FC<TypeFieldFormProps> = ({
  fields,
  data,
  onChange,
  schema,
  visited,
  depth,
  maxDepth,
  modifiedFields,
}) => {
  return (
    <div className="space-y-3">
      {fields.map((field) => {
        if (field.name === '__typename') return null

        const required = isNonNull(field.type)
        const strippedName = stripFieldArguments(field.name)
        const args = strippedName !== field.name ? field.name.slice(strippedName.length) : null

        return (
          <div key={field.name} className="space-y-1">
            <label className="flex items-center gap-1 text-sm">
              {modifiedFields?.has(field.name) && (
                <span className="w-1.5 h-1.5 rounded-full bg-panel-warning flex-shrink-0" />
              )}
              <span className="text-panel-field-name font-medium" title={args ? field.name : undefined}>
                {strippedName}
              </span>
              {args && (
                <span className="text-panel-text-muted text-xs font-mono truncate max-w-[200px]" title={args}>
                  {args}
                </span>
              )}
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
