import { useState, useCallback } from 'react'
import { MSG } from '../../shared/messageTypes'
import type { SchemaResultMessage } from '../../shared/messageTypes'
import type { IntrospectionQuery } from 'graphql'
import { buildSchema, introspectionFromSchema } from 'graphql'
import { sendAndWait } from '../utils/messaging'
import { parseIntrospectionSchema } from '../utils/schemaParser'
import type { ParsedSchema } from '../types/schema'

interface SchemaState {
  schema: ParsedSchema | null
  loading: boolean
  error: string | null
}

export function useSchemaIntrospection() {
  const [state, setState] = useState<SchemaState>({
    schema: null,
    loading: false,
    error: null,
  })

  const autoIntrospect = useCallback(async () => {
    setState({ schema: null, loading: true, error: null })
    try {
      const result = await sendAndWait<SchemaResultMessage>(
        { type: MSG.AUTO_INTROSPECT },
        MSG.SCHEMA_RESULT,
        30000,
      )

      if (!result.payload.success) {
        setState({ schema: null, loading: false, error: result.payload.error ?? 'Auto-introspection failed' })
        return
      }

      const parsed = parseIntrospectionSchema(result.payload.data as IntrospectionQuery)
      setState({ schema: parsed, loading: false, error: null })
    } catch (e) {
      setState({
        schema: null,
        loading: false,
        error: e instanceof Error ? e.message : 'Auto-introspection failed',
      })
    }
  }, [])

  const introspect = useCallback(
    async (endpoint: string, headers?: Record<string, string>) => {
      setState({ schema: null, loading: true, error: null })
      try {
        const result = await sendAndWait<SchemaResultMessage>(
          {
            type: MSG.INTROSPECT_SCHEMA,
            payload: { endpoint, headers },
          },
          MSG.SCHEMA_RESULT,
          30000,
        )

        if (!result.payload.success) {
          setState({ schema: null, loading: false, error: result.payload.error ?? 'Unknown error' })
          return
        }

        const parsed = parseIntrospectionSchema(result.payload.data as IntrospectionQuery)
        setState({ schema: parsed, loading: false, error: null })
      } catch (e) {
        setState({
          schema: null,
          loading: false,
          error: e instanceof Error ? e.message : 'Introspection failed',
        })
      }
    },
    [],
  )

  const loadFromJson = useCallback((json: unknown) => {
    setState({ schema: null, loading: true, error: null })
    try {
      // Support both raw IntrospectionQuery and { data: IntrospectionQuery }
      const introspectionData = (
        json && typeof json === 'object' && 'data' in json
          ? (json as { data: IntrospectionQuery }).data
          : json
      ) as IntrospectionQuery

      const parsed = parseIntrospectionSchema(introspectionData)
      setState({ schema: parsed, loading: false, error: null })
    } catch (e) {
      setState({
        schema: null,
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to parse schema JSON',
      })
    }
  }, [])

  const loadFromSdl = useCallback((sdl: string) => {
    setState({ schema: null, loading: true, error: null })
    try {
      const graphqlSchema = buildSchema(sdl)
      const introspectionData = introspectionFromSchema(graphqlSchema)
      const parsed = parseIntrospectionSchema(introspectionData)
      setState({ schema: parsed, loading: false, error: null })
    } catch (e) {
      setState({
        schema: null,
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to parse SDL schema',
      })
    }
  }, [])

  const clearSchema = useCallback(() => {
    setState({ schema: null, loading: false, error: null })
  }, [])

  return { ...state, autoIntrospect, introspect, loadFromJson, loadFromSdl, clearSchema }
}
