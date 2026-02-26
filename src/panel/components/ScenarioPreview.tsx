import type { FC } from 'react'
import type { Scenario } from '../types/draft'

interface ScenarioPreviewProps {
  scenario: Scenario
}

export const ScenarioPreview: FC<ScenarioPreviewProps> = ({ scenario }) => {
  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-panel-text">{scenario.name}</h2>
        {scenario.description && (
          <p className="text-sm text-panel-text-muted mt-1">{scenario.description}</p>
        )}
        <div className="text-sm text-panel-text-muted mt-1">
          Created {new Date(scenario.createdAt).toLocaleString()}
        </div>
      </div>

      <div>
        <div className="text-sm text-panel-text mb-2">
          Will modify ({scenario.entities.length} {scenario.entities.length === 1 ? 'entity' : 'entities'}):
        </div>
        <ul className="space-y-1">
          {scenario.entities.map((entity, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="text-panel-text-muted">{'\u2022'}</span>
              <span className="text-panel-accent">{entity.entityKey}</span>
              <span className="text-panel-text-muted">({entity.typeName})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
