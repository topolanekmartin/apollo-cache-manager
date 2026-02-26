export interface DraftEntity {
  data: Record<string, unknown>
  typeName: string
}

export interface Scenario {
  id: string
  name: string
  description?: string
  entities: Array<{ entityKey: string; data: Record<string, unknown>; typeName: string }>
  createdAt: number
  sourceHost?: string
  schemaSource?: string
}
